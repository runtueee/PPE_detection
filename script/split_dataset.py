# 保存为 split_dataset.py
"""Python split_dataset.py --src "D:/innovaton_competetion/ultralytics-main/css-data" --dst
"D:/innovaton_competetion/ultralytics-main/css-data-split" --ratio 0.7 0.2 0.1 --seed 42 --by_scene False.
"""

from __future__ import annotations

import argparse
import os
import random
import shutil
import sys
from collections import defaultdict
from math import floor
from pathlib import Path

try:
    import yaml
except Exception:
    yaml = None

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"}


def collect_from_split_dirs(src_root: Path):
    """If src has train/val/test subfolders with images/ and labels/, collect pairs from them."""
    pairs = []
    found_any = False
    for subset in ("train", "valid", "val", "test"):
        subset_dir = src_root / subset
        if subset_dir.exists() and subset_dir.is_dir():
            found_any = True
            imgs_dir = subset_dir / "images"
            labels_dir = subset_dir / "labels"
            if imgs_dir.exists():
                for p in imgs_dir.iterdir():
                    if p.is_file() and p.suffix.lower() in IMAGE_EXTS:
                        lbl = labels_dir / (p.stem + ".txt")
                        pairs.append((p, lbl if lbl.exists() else None))
    return pairs, found_any


def collect_flat_layout(src_root: Path):
    imgs = []
    labels_dir = src_root / "labels"
    images_dir = src_root / "images"
    if images_dir.exists():
        for p in images_dir.iterdir():
            if p.is_file() and p.suffix.lower() in IMAGE_EXTS:
                lbl = labels_dir / (p.stem + ".txt")
                imgs.append((p, lbl if lbl.exists() else None))
    return imgs


def find_images_and_labels(src_root: Path):
    # First try train/val/test style
    pairs, found = collect_from_split_dirs(src_root)
    if found and pairs:
        return pairs
    # fallback to flat images/labels
    pairs = collect_flat_layout(src_root)
    if pairs:
        return pairs
    # final fallback: walk and find any 'images' folder underneath
    pairs = []
    for root, dirs, files in os.walk(src_root):
        rootp = Path(root)
        if rootp.name.lower() in ("images", "imgs", "img", "picture", "pictures"):
            for f in files:
                fp = rootp / f
                if fp.suffix.lower() in IMAGE_EXTS and fp.is_file():
                    lbl_dir = rootp.parent / "labels"
                    lbl = lbl_dir / (fp.stem + ".txt")
                    if not lbl.exists():
                        lbl = rootp / (fp.stem + ".txt")
                        if not lbl.exists():
                            lbl = src_root / "labels" / (fp.stem + ".txt")
                            if not lbl.exists():
                                lbl = None
                    pairs.append((fp, lbl))
    return pairs


# The rest of the functions: scene grouping, split, copy, yaml write (reuse earlier logic)
def simple_scene_from_filename(path: Path):
    name = path.stem
    for sep in ("_", "-"):
        if sep in name:
            return name.split(sep)[0]
    return name[:6]


def ensure_dir(p: Path):
    p.mkdir(parents=True, exist_ok=True)


def copy_pairs(pairs, dst_images_dir: Path, dst_labels_dir: Path):
    copied = 0
    skipped_no_label = 0
    for img, lbl in pairs:
        dst_img = dst_images_dir / img.name
        dst_lbl = dst_labels_dir / (img.stem + ".txt")
        try:
            shutil.copy2(str(img), str(dst_img))
            if lbl and lbl.exists():
                shutil.copy2(str(lbl), str(dst_lbl))
            else:
                open(dst_lbl, "w", encoding="utf-8").close()
                skipped_no_label += 1
            copied += 1
        except Exception as e:
            print(f"Warning: failed to copy {img} or its label: {e}")
    return copied, skipped_no_label


def stratified_split(pairs, ratios, seed=42, by_scene=False, scene_func=simple_scene_from_filename):
    random.seed(seed)
    if by_scene:
        # group by scene
        groups = defaultdict(list)
        for img, lbl in pairs:
            groups[scene_func(img)].append((img, lbl))
        groups_list = list(groups.values())
        random.shuffle(groups_list)
        total = sum(len(g) for g in groups_list)
        t_cut = floor(total * ratios[0])
        v_cut = floor(total * (ratios[0] + ratios[1]))
        train, val, test = [], [], []
        acc = 0
        for g in groups_list:
            if acc < t_cut:
                train.extend(g)
            elif acc < v_cut:
                val.extend(g)
            else:
                test.extend(g)
            acc += len(g)
        if len(train) and len(val) and len(test):
            return train, val, test
        # else fallback to file-level split
    # simple shuffle split
    items = pairs[:]
    random.shuffle(items)
    n = len(items)
    i1 = int(n * ratios[0])
    i2 = i1 + int(n * ratios[1])
    train = items[:i1]
    val = items[i1:i2]
    test = items[i2:]
    # ensure non-empty
    if not train or not val or not test:
        # rebalance by simple slicing with floor
        i1 = max(1, i1)
        i2 = max(i1 + 1, i2)
        train = items[:i1]
        val = items[i1:i2]
        test = items[i2:]
    return train, val, test


def create_output_dirs(dst_root: Path):
    for subset in ("train", "val", "test"):
        ensure_dir(dst_root / subset / "images")
        ensure_dir(dst_root / subset / "labels")


def write_data_yaml(dst_root: Path, nc: int, names, train_rel, val_rel, test_rel):
    data = {"path": str(dst_root), "train": train_rel, "val": val_rel, "test": test_rel, "nc": nc, "names": names}
    yaml_path = dst_root / "data_yaml.yaml"
    if yaml:
        with open(yaml_path, "w", encoding="utf-8") as f:
            yaml.safe_dump(data, f, sort_keys=False, allow_unicode=True)
        print(f"Wrote data yaml to: {yaml_path}")
    else:
        print("PyYAML not installed. Here is the YAML content:")
        import json

        print(json.dumps(data, ensure_ascii=False, indent=2))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--src", required=True)
    parser.add_argument("--dst", required=True)
    parser.add_argument("--ratio", nargs=3, type=float, default=(0.7, 0.2, 0.1))
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--by_scene", action="store_true")
    parser.add_argument("--names", type=str, default=None)
    args = parser.parse_args()

    src_root = Path(args.src)
    dst_root = Path(args.dst)
    ratios = tuple(args.ratio)
    if abs(sum(ratios) - 1.0) > 1e-6:
        s = sum(ratios)
        ratios = tuple(r / s for r in ratios)

    pairs = find_images_and_labels(src_root)
    if not pairs:
        print("No images found after probing src. Please check the path and folder names (images/ labels/). Exiting.")
        sys.exit(1)

    print(f"Found {len(pairs)} image files.")

    # derive names list
    names_list = None
    if args.names:
        if os.path.exists(args.names):
            with open(args.names, encoding="utf-8") as f:
                names_list = [ln.strip() for ln in f if ln.strip()]
        else:
            names_list = [n.strip() for n in args.names.split(",") if n.strip()]
    if names_list is None:
        names_list = ["class" + str(i) for i in range(10)]

    train_list, val_list, test_list = stratified_split(pairs, ratios, seed=args.seed, by_scene=args.by_scene)

    print(f"Split counts -> train: {len(train_list)}, val: {len(val_list)}, test: {len(test_list)}")

    create_output_dirs(dst_root)

    ct, st = copy_pairs(train_list, dst_root / "train" / "images", dst_root / "train" / "labels")
    cv, sv = copy_pairs(val_list, dst_root / "val" / "images", dst_root / "val" / "labels")
    cte, ste = copy_pairs(test_list, dst_root / "test" / "images", dst_root / "test" / "labels")

    print(f"Copied train {ct} (no-label {st}), val {cv} (no-label {sv}), test {cte} (no-label {ste})")

    write_data_yaml(
        dst_root,
        nc=len(names_list),
        names=names_list,
        train_rel="train/images",
        val_rel="val/images",
        test_rel="test/images",
    )


if __name__ == "__main__":
    main()
