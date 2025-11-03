# 🛡️ PPE建筑安全检测系统

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://python.org)
[![YOLO](https://img.shields.io/badge/YOLO-v8-red.svg)](https://ultralytics.com)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> 基于YOLOv8的实时PPE（个人防护装备）检测系统，专为建筑工地安全监控设计

## ✨ 项目特色

- 🎯 **10类安全目标检测** - 安全帽、口罩、安全背心等PPE装备识别
- ⚡ **实时视频监控** - 支持摄像头实时检测和违规预警
- 🖥️ **Web界面** - 现代化响应式界面，支持图片和视频检测
- 📊 **智能分析** - 自动生成安全评分和违规统计报告
- 🔧 **模型优化** - 针对小目标和建筑场景优化的检测算法

## 🎯 检测目标

| 安全装备                      | 违规行为                             | 现场设备                    |
| ----------------------------- | ------------------------------------ | --------------------------- |
| 👷‍♂️ **安全帽** (Hardhat)       | ❌ **未戴安全帽** (NO-Hardhat)       | 🚧 **安全锥** (Safety Cone) |
| 😷 **口罩** (Mask)            | ❌ **未戴口罩** (NO-Mask)            | 🔧 **机械设备** (machinery) |
| 🦺 **安全背心** (Safety Vest) | ❌ **未穿安全背心** (NO-Safety Vest) | 🚛 **车辆** (vehicle)       |
| 👤 **人员** (Person)          |                                      |                             |

## 🚀 快速开始

### 环境要求

- Python 3.8+
- CUDA支持（可选，推荐GPU加速）

### 安装与运行

```bash
# 1. 克隆项目
git clone <https://github.com/runtueee/PPE_detection.git>
cd ultralytics-main

# 2. 安装依赖
pip install ultralytics flask opencv-python pillow

# 3. 启动Web应用
cd YOLO_UPDATE_new
python app.py

# 4. 访问系统
# 浏览器打开: http://localhost:5000
```

### 前端部署说明

详细的Web应用部署和使用说明，请查看 [YOLO_UPDATE_new](YOLO_UPDATE_new/) 文件夹中的README文档。

该文件夹包含了完整的前端应用代码，包括：

- Flask Web应用
- 现代化用户界面
- 实时检测功能
- 批量处理系统

## 📂 项目结构

```
📁 项目根目录/
├── 🐍 script/                    # 训练和评估脚本
│   ├── evaluate_models.py        # 模型评估脚本
│   ├── split_dataset.py          # 数据集分割脚本
│   └── generate_sliced_dataset.py # 数据增强脚本
├── 📊 css-data/                  # 原始数据集
│   ├── train/                    # 训练数据 (2605张图片)
│   ├── valid/                    # 验证数据 (114张图片)
│   ├── test/                     # 测试数据 (82张图片)
│   └── safeHat.yaml             # 数据配置文件
├── 🖥️ YOLO_UPDATE_new/          # Web应用前端
│   ├── app.py                    # Flask主应用
│   ├── templates/                # HTML模板
│   ├── static/                   # 静态资源
│   └── models/                   # 训练好的模型文件
└── 📈 runs/                      # 训练结果和模型权重
```

## 🔧 模型训练

### 训练自定义模型

```bash
# 使用脚本训练模型
python script/split_dataset.py           # 分割数据集
python script/generate_sliced_dataset.py # 数据增强

# 训练YOLO模型
yolo train data=css-data/safeHat.yaml model=yolov8s.pt epochs=100 imgsz=640

# 评估模型性能
python script/evaluate_models.py --models best.pt --data css-data/safeHat.yaml
```

### 模型性能优化

- **小目标检测优化**: 使用tile训练策略提高远距离检测能力
- **数据增强**: 通过切片技术增加训练样本多样性
- **多模型对比**: 支持批量评估不同模型配置的性能

## 🎯 应用场景

- **建筑工地**: 实时监控工人安全装备佩戴情况
- **工业制造**: 生产线安全合规检查
- **教育培训**: 安全知识教育和技能培训
- **公共场所**: 疫情防控和安全监控

## 📊 数据集信息

- **总图片数**: 2801张建筑工地场景图片
- **标注类别**: 10类PPE和安全目标
- **数据来源**: Roboflow Construction Site Safety数据集
- **数据增强**: 支持切片和分割技术优化训练效果

## 🤝 贡献指南

欢迎提交Issue和Pull Request来改进项目！

## 📄 许可证

本项目基于MIT许可证开源，详见 [LICENSE](LICENSE) 文件。

---

<div align="center">

**🛡️ PPE智能检测系统 | 让建筑安全更智能**

[![GitHub stars](https://img.shields.io/github/stars/your-username/your-repo.svg?style=social&label=Star)](https://github.com/runtueee/PPE_detection.git)
[![GitHub forks](https://img.shields.io/github/forks/your-username/your-repo.svg?style=social&label=Fork)](https://github.com/runtueee/PPE_detection.git/fork)

</div>
