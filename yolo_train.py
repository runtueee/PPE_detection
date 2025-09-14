# yolo_train.py

import torch

from ultralytics import YOLO

# DATA_YAML = r"D:\innovaton_competetion\ultralytics-main\css-data\safeHat.yaml"
DATA_YAML = r"D:\innovaton_competetion\ultralytics-main\css-data-split\data.yaml"  # 换成划分之后的了
# MODEL_WEIGHTS = r"D:\innovaton_competetion\ultralytics-main\yolov8n.pt"  # 请改成你本地 yolov8n.pt 的绝对路径
MODEL_WEIGHTS = r"D:\innovaton_competetion\ultralytics-main\yolov8s.pt"  # 用v8s来做消融对比实验
# MODEL_WEIGHTS = r"D:\innovaton_competetion\ultralytics-main\runs\train\safeHat_exp_batch43\weights\last.pt"  # 请改成你本地 yolov8n.pt 的绝对路径


# EPOCHS = 100
EPOCHS = 150
BATCH = 4
IMGSZ = 640
SAVE = True
SAVE_PERIOD = 10
PROJECT = "runs/train"
WORKERS = 8

# -------------------- 实验开关与超参 --------------------
# 训练级 copy-paste 增强开关与强度（0.0 关闭，推荐 0.2~0.4）
ENABLE_COPY_PASTE = True
COPY_PASTE_P = 0.3

# 训练级 tiling（基于切片后的 YOLO 数据集 YAML）
# 开启后将使用 DATA_YAML_TILED 训练，请先按说明生成切片数据集
ENABLE_TILING_TRAIN = True
DATA_YAML_TILED = r"D:\innovaton_competetion\ultralytics-main\css-data-sliced\data.yaml"  # 生成后修改为实际路径

# 固定随机种子，保证可重复
SEED = 42


def build_experiment_name(base_name: str) -> str:
    """构建实验名称，根据是否启用切片训练和copy-paste增强自动添加后缀。 :param base_name: 实验基础名称 :return: 带后缀的实验名称."""
    suffixes = []  # 用于存储所有需要添加的后缀
    if ENABLE_TILING_TRAIN:
        # 如果启用切片训练，添加"tile"后缀
        suffixes.append("tile")
    if ENABLE_COPY_PASTE and COPY_PASTE_P > 0:
        # 如果启用copy-paste增强且概率大于0，添加"cpXX"后缀，XX为概率百分比
        suffixes.append(f"cp{int(COPY_PASTE_P * 100):02d}")
    # 如果有后缀，则用下划线拼接，否则只返回基础名称
    return f"{base_name}_" + "_".join(suffixes) if suffixes else base_name


BASE_NAME = "PPE_exp_yolov8s"  # 实验基础名称
NAME = build_experiment_name(BASE_NAME)  # 最终实验名称，包含后缀


def main():
    device = 0 if torch.cuda.is_available() else "cpu"
    print(f"Using device: {device}")

    model = YOLO(MODEL_WEIGHTS)  # 使用本地权重文件

    # 根据是否启用训练级切片，切换数据集 YAML
    data_yaml_to_use = DATA_YAML_TILED if ENABLE_TILING_TRAIN else DATA_YAML

    model.train(
        data=data_yaml_to_use,
        epochs=EPOCHS,
        batch=BATCH,
        imgsz=IMGSZ,
        device=device,
        workers=WORKERS,
        save=SAVE,
        save_period=SAVE_PERIOD,
        project=PROJECT,
        name=NAME,
        plots=True,
        seed=SEED,
        copy_paste=(COPY_PASTE_P if ENABLE_COPY_PASTE else 0.0),
    )


if __name__ == "__main__":
    main()
