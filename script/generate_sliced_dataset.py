import argparse
from pathlib import Path
from typing import Optional

import yaml
from PIL import Image


def load_yaml(yaml_path: Path) -> dict:
    with open(yaml_path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def save_yaml(obj: dict, yaml_path: Path) -> None:
    yaml_path.parent.mkdir(parents=True, exist_ok=True)
    with open(yaml_path, "w", encoding="utf-8") as f:
        yaml.safe_dump(obj, f, allow_unicode=True, sort_keys=False)


def yolo_line_to_box(line: str, image_w: int, image_h: int) -> tuple[int, float, float, float, float]:
    parts = line.strip().split()
    if len(parts) != 5:
        raise ValueError(f"Invalid YOLO label line: {line}")
    cls = int(parts[0])
    x, y, w, h = map(float, parts[1:])
    abs_w = w * image_w
    abs_h = h * image_h
    abs_x = x * image_w
    abs_y = y * image_h
    x1 = abs_x - abs_w / 2.0
    y1 = abs_y - abs_h / 2.0
    x2 = abs_x + abs_w / 2.0
    y2 = abs_y + abs_h / 2.0
    return cls, x1, y1, x2, y2


def box_to_yolo_line(cls: int, x1: float, y1: float, x2: float, y2: float, tile_w: int, tile_h: int) -> str:
    bw = max(0.0, x2 - x1)
    bh = max(0.0, y2 - y1)
    cx = x1 + bw / 2.0
    cy = y1 + bh / 2.0
    nx = cx / tile_w
    ny = cy / tile_h
    nw = bw / tile_w
    nh = bh / tile_h
    return f"{cls} {nx:.6f} {ny:.6f} {nw:.6f} {nh:.6f}"


def intersect_box(
    b1: tuple[float, float, float, float], b2: tuple[float, float, float, float]
) -> tuple[float, float, float, float]:
    x1 = max(b1[0], b2[0])
    y1 = max(b1[1], b2[1])
    x2 = min(b1[2], b2[2])
    y2 = min(b1[3], b2[3])
    if x2 <= x1 or y2 <= y1:
        return 0.0, 0.0, 0.0, 0.0
    return x1, y1, x2, y2


def slice_grid(image_w: int, image_h: int, tile: int, overlap: float) -> list[tuple[int, int, int, int]]:
    stride = int(tile * (1.0 - overlap))
    stride = max(1, stride)
    boxes = []
    # ensure coverage to image boundary
    xs = list(range(0, max(image_w - tile, 0) + 1, stride))
    ys = list(range(0, max(image_h - tile, 0) + 1, stride))
    if not xs or xs[-1] != image_w - tile:
        xs.append(max(0, image_w - tile))
    if not ys or ys[-1] != image_h - tile:
        ys.append(max(0, image_h - tile))
    for y in ys:
        for x in xs:
            boxes.append((x, y, x + tile, y + tile))
    return boxes


def process_split(
    split_name: str,
    images_dir: Path,
    labels_dir: Path,
    out_images_dir: Path,
    out_labels_dir: Path,
    tile: int,
    overlap: float,
    min_area_ratio: float,
) -> tuple[int, int]:
    out_images_dir.mkdir(parents=True, exist_ok=True)
    out_labels_dir.mkdir(parents=True, exist_ok=True)

    img_paths = []
    for ext in (".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff"):
        img_paths.extend(sorted(images_dir.rglob(f"*{ext}")))

    num_in = 0
    num_out = 0

    for img_p in img_paths:
        rel = img_p.relative_to(images_dir)
        label_p = (labels_dir / rel).with_suffix(".txt")
        if not label_p.exists():
            # still slice image but will produce empty labels
            labels = []
        else:
            with open(label_p, encoding="utf-8") as f:
                labels = [ln.strip() for ln in f.readlines() if ln.strip()]

        try:
            img = Image.open(img_p).convert("RGB")
        except Exception:
            continue

        W, H = img.size
        tiles = slice_grid(W, H, tile, overlap)

        parsed = []
        for ln in labels:
            try:
                cls, x1, y1, x2, y2 = yolo_line_to_box(ln, W, H)
                parsed.append((cls, x1, y1, x2, y2))
            except Exception:
                continue

        base_stem = rel.as_posix().replace("/", "_").rsplit(".", 1)[0]

        for idx, (x1t, y1t, x2t, y2t) in enumerate(tiles):
            crop = img.crop((x1t, y1t, x2t, y2t))
            tile_w = x2t - x1t
            tile_h = y2t - y1t

            out_img_name = f"{base_stem}_tile{idx:03d}.jpg"
            out_lbl_name = f"{base_stem}_tile{idx:03d}.txt"
            out_img_path = out_images_dir / out_img_name
            out_lbl_path = out_labels_dir / out_lbl_name

            # remap labels
            out_lines: list[str] = []
            tile_box = (x1t, y1t, x2t, y2t)
            for cls, bx1, by1, bx2, by2 in parsed:
                inter = intersect_box((bx1, by1, bx2, by2), tile_box)
                if inter == (0.0, 0.0, 0.0, 0.0):
                    continue
                inter_w = inter[2] - inter[0]
                inter_h = inter[3] - inter[1]
                inter_area = max(0.0, inter_w) * max(0.0, inter_h)
                orig_area = max(0.0, bx2 - bx1) * max(0.0, by2 - by1)
                if orig_area <= 0:
                    continue
                if inter_area / orig_area < min_area_ratio:
                    continue
                # shift to tile coords
                nx1 = inter[0] - x1t
                ny1 = inter[1] - y1t
                nx2 = inter[2] - x1t
                ny2 = inter[3] - y1t
                out_lines.append(box_to_yolo_line(cls, nx1, ny1, nx2, ny2, tile_w, tile_h))

            # save image and label (save empty label file as well)
            crop.save(out_img_path, quality=95)
            with open(out_lbl_path, "w", encoding="utf-8") as f:
                if out_lines:
                    f.write("\n".join(out_lines) + "\n")

            num_out += 1

        num_in += 1

    return num_in, num_out


def build_output_yaml(src_cfg: dict, out_root: Path) -> dict:
    # Keep names/nc; point to new split dirs
    data = {}
    data["path"] = str(out_root)
    for split in ("train", "val", "test"):
        images = out_root / split / "images"
        if images.exists():
            data[split] = str(images)
    # pass through nc/names if present
    if "nc" in src_cfg:
        data["nc"] = src_cfg["nc"]
    if "names" in src_cfg:
        data["names"] = src_cfg["names"]
    return data


def main():
    parser = argparse.ArgumentParser(description="Slice dataset and remap YOLO labels for training.")
    parser.add_argument("--src-yaml", type=str, required=True, help="Source YOLO data.yaml path")
    parser.add_argument("--dst-dir", type=str, required=True, help="Output directory for sliced dataset")
    parser.add_argument("--tile", type=int, default=640, help="Tile size (square)")
    parser.add_argument("--overlap", type=float, default=0.2, help="Overlap ratio between tiles [0,1)")
    parser.add_argument(
        "--min-area", type=float, default=0.1, help="Minimum retained area ratio of object inside a tile"
    )
    args = parser.parse_args()

    src_yaml = Path(args.src_yaml)
    dst_root = Path(args.dst_dir)

    cfg = load_yaml(src_yaml)

    # Resolve split directories
    def resolve_dir(key: str) -> Optional[Path]:
        v = cfg.get(key, None)
        if v is None:
            return None
        p = Path(v)
        if not p.is_absolute() and "path" in cfg:
            p = Path(cfg["path"]) / v
        return p

    train_dir = resolve_dir("train")
    val_dir = resolve_dir("val")
    test_dir = resolve_dir("test")

    # Expect standard structure: split/images and split/labels
    splits = []
    if train_dir is not None:
        splits.append(("train", Path(train_dir)))
    if val_dir is not None:
        splits.append(("val", Path(val_dir)))
    if test_dir is not None:
        splits.append(("test", Path(test_dir)))

    if not splits:
        raise ValueError("No valid split directories found in data.yaml (train/val/test).")

    # Prepare output tree
    for split, _ in splits:
        (dst_root / split / "images").mkdir(parents=True, exist_ok=True)
        (dst_root / split / "labels").mkdir(parents=True, exist_ok=True)

    # Process each split
    for split, img_dir in splits:
        # Infer labels dir peer to images
        split_root = img_dir.parent
        labels_dir = split_root / "labels"
        out_images_dir = dst_root / split / "images"
        out_labels_dir = dst_root / split / "labels"
        ni, no = process_split(
            split,
            img_dir,
            labels_dir,
            out_images_dir,
            out_labels_dir,
            tile=args.tile,
            overlap=args.overlap,
            min_area_ratio=args.min_area,
        )
        print(f"[{split}] images_in={ni} tiles_out={no}")

    # Write output yaml
    out_yaml = build_output_yaml(cfg, dst_root)
    save_yaml(out_yaml, dst_root / "data.yaml")
    print(f"Wrote sliced dataset yaml: {dst_root / 'data.yaml'}")


"""
python generate_sliced_dataset.py --src-yaml "D:/innovaton_competetion/ultralytics-main/css-data-split/data.yaml" --dst-dir "D:/innovaton_competetion/ultralytics-main/css-data-sliced" --tile 640 --overlap 0.20 --min-area 0.10
"""

if __name__ == "__main__":
    main()
