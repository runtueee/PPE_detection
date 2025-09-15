# 🛡️ YOLO施工安全智能检测系统

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-2.3.3-green.svg)](https://flask.palletsprojects.com)
[![YOLO](https://img.shields.io/badge/YOLO-v8.0.196-red.svg)](https://ultralytics.com)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> 🎯 **基于YOLOv8深度学习的实时安全装备检测系统**，专为工业安全监控设计，支持安全帽、口罩、安全背心等10种安全目标的智能识别与违规检测。

## ✨ 项目亮点

- 🚀 **多模式检测策略** - 标准/智能/高质量三种模式，适应不同场景需求
- ⚡ **智能性能优化** - 智能帧采样技术，减少66%计算量
- 🎥 **实时视频监控** - 支持摄像头实时检测，10 FPS流畅体验
- 📊 **智能安全分析** - 自动生成安全评分和违规统计报告
- 🖥️ **现代化界面** - 响应式设计，支持多设备访问
- 🔧 **模块化架构** - 易于维护和功能扩展

## 🚀 快速开始

### 一键启动（推荐）

```bash
# Windows用户
start.bat

# Linux/Mac用户
chmod +x start.sh && ./start.sh
```

### 手动启动

```bash
# 1. 克隆项目
git clone https://github.com/Guo-Yixin/YOLO_UPDATE.git
cd YOLO_UPDATE

# 2. 安装依赖
pip install -r requirements.txt

# 3. 启动系统
python app.py

# 4. 访问系统
# 浏览器打开: http://localhost:5000
```

### 使用启动脚本（推荐）

```bash
# 使用智能启动脚本，自动检查环境和依赖
python run.py
```

## 🎯 核心功能

### 🔄 检测模式对比

| 模式 | 特点 | 适用场景 | 性能表现 | CPU使用率 |
|------|------|----------|----------|-----------|
| **标准模式** | 逐帧检测，实时性最高 | 近距离、密集场景 | 10 FPS | 80-90% |
| **智能模式** | 智能采样，平衡性能 | 一般监控场景 | 3-4 FPS | 30-40% |
| **高质量模式** | 小目标优化检测 | 远距离、小目标 | 10 FPS | 85-95% |

### 🎥 主要功能模块

- **实时视频监控** - 摄像头实时安全检测，支持多种检测模式
- **图片智能检测** - 单张/批量图片处理，支持拖拽上传
- **工地现场监控** - 专业工地安全监控模式，实时安全评分
- **安全分析报告** - 智能安全评分和违规统计，生成详细报告
- **批量处理系统** - 支持多张图片批量检测，提高工作效率

### 🎯 检测目标（10类安全目标）

| 安全装备 | 违规行为 | 现场设备 |
|----------|----------|----------|
| 👷‍♂️ **安全帽** (Hardhat) | ❌ **未戴安全帽** (NO-Hardhat) | 🚧 **安全锥** (Safety Cone) |
| 😷 **口罩** (Mask) | ❌ **未戴口罩** (NO-Mask) | 🔧 **机械设备** (machinery) |
| 🦺 **安全背心** (Safety Vest) | ❌ **未穿安全背心** (NO-Safety Vest) | 🚛 **车辆** (vehicle) |
| 👤 **人员** (Person) | | |

## 💻 系统要求

### 最低配置
- **操作系统**: Windows 10+ / Linux / macOS
- **Python**: 3.8+
- **内存**: 8GB RAM
- **存储**: 2GB 可用空间
- **GPU**: 可选（CPU模式）

### 推荐配置
- **操作系统**: Windows 11 / Ubuntu 20.04+
- **Python**: 3.9+
- **内存**: 16GB RAM
- **存储**: SSD 10GB+
- **GPU**: RTX 3060+ (CUDA支持)

## 📂 项目结构

```
📁 YOLO_UPDATE/
├── 🐍 app.py                    # Flask主应用
├── 🚀 run.py                    # 智能启动脚本
├── 🤖 best.pt                   # 主YOLO模型
├── 📦 requirements.txt          # Python依赖
├── 🚀 start.bat/.sh            # 启动脚本
├── 📁 models/                  # 多版本模型文件
│   ├── best_yolov8n.pt         # 轻量级模型
│   ├── best_yolov8s.pt         # 标准模型
│   └── best_yolov8s_tile_cp30.pt # 小目标优化模型
├── 📁 templates/               # HTML模板
│   └── index.html              # 主页面
├── 📁 static/                  # 静态资源
│   ├── 🎨 css/                 # 样式文件
│   │   └── style.css           # 主样式
│   ├── ⚡ js/                  # JavaScript逻辑
│   │   ├── script.js           # 主逻辑
│   │   ├── image-detection.js  # 图片检测
│   │   └── batch-detection.js  # 批量检测
│   └── 📤 uploads/             # 上传文件存储
├── 📁 test/                    # 测试数据集
│   ├── 🖼️ images/ (283张)      # 测试图片
│   └── 🏷️ labels/ (281个)      # 标签文件
└── 📚 文档/                    # 项目文档
    ├── PROJECT_SUMMARY.md      # 项目总结
    ├── PERFORMANCE_ANALYSIS.md # 性能分析
    ├── FINAL_SUMMARY.md        # 最终总结
    └── VERIFICATION_GUIDE.md   # 验证指南
```

## 🔌 API接口文档

### 核心接口

| 功能 | 方法 | 端点 | 说明 | 参数 |
|------|------|------|------|------|
| 健康检查 | GET | `/health` | 系统状态检查 | - |
| 实时检测 | POST | `/video_feed` | 标准模式视频检测 | `{image: base64}` |
| 智能检测 | POST | `/smart_video_feed` | 智能模式视频检测 | `{image: base64}` |
| 高质量检测 | POST | `/detect_small_objects` | 小目标优化检测 | `{image: base64}` |
| 单图上传 | POST | `/upload` | 单张图片检测 | `FormData` |
| 批量上传 | POST | `/batch_upload` | 多张图片批量检测 | `FormData[]` |

### 请求示例

```javascript
// 实时检测
fetch('/video_feed', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({image: base64ImageData})
})
.then(response => response.json())
.then(data => console.log(data));

// 图片上传
const formData = new FormData();
formData.append('file', imageFile);
fetch('/upload', {
  method: 'POST', 
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

### 响应格式

```json
{
  "success": true,
  "detections": [
    {
      "class": "Hardhat",
      "confidence": 0.95,
      "bbox": [100, 100, 200, 200],
      "color": "#33FF57"
    }
  ],
  "safety_score": 85,
  "violations": ["NO-Hardhat"],
  "processing_time": 0.15
}
```

## 🎨 界面设计

### 布局结构
```
📱 固定头部导航 + 标签页切换
├─ 🎥 实时检测 │ 📷 图片检测 │ 🏗️ 工地监控 │ 📊 批量处理
├─ 🔄 检测模式选择 (标准/智能/高质量)
├─ 📺 左侧视频显示 │ 📊 右侧结果统计
├─ 📈 安全评分面板 │ ⚠️ 违规分析
└─ 📋 检测类别说明面板
```

### 设计特色
- 🎯 **固定导航** - 头部标签页始终可见，操作便捷
- 📱 **响应式设计** - 完美适配桌面/平板/手机设备
- 🎨 **现代化UI** - 无边框圆角设计，视觉体验佳
- 🖱️ **拖拽上传** - 直观的文件上传体验
- ⚡ **实时反馈** - 即时操作状态提示和进度显示
- 🌈 **颜色编码** - 不同安全装备使用不同颜色标识

## 🔐 安全与兼容性

### 安全特性
- 📁 **文件类型验证** - 仅允许图片格式上传
- 💾 **大小限制** - 单文件最大16MB
- 🎥 **摄像头权限管理** - 安全的摄像头访问控制
- 🛡️ **错误安全处理** - 完善的异常处理机制
- 🔒 **输入验证** - 严格的输入数据验证

### 浏览器支持
| 浏览器 | 版本要求 | 支持状态 |
|--------|----------|----------|
| Chrome | 80+ | ✅ 完全支持 |
| Firefox | 75+ | ✅ 完全支持 |
| Safari | 13+ | ✅ 完全支持 |
| Edge | 80+ | ✅ 完全支持 |

## 🎯 应用场景

### 行业应用矩阵

| 🏗️ 建筑工地 | 🏭 工业制造 | 📚 教育培训 | 🏥 公共安全 |
|-------------|-------------|-------------|-------------|
| 安全帽检测 | 生产线安全检查 | 安全知识教育 | 口罩佩戴检测 |
| 安全背心监控 | 工厂合规检查 | 实训演示 | 公共场所监控 |
| 现场设备管理 | 危险区域监控 | 技能培训 | 疫情防控 |
| 高空作业监控 | 设备操作规范 | 安全考试 | 人员密度控制 |

### 具体应用案例
- **建筑工地**: 实时监控工人安全装备佩戴情况
- **工厂车间**: 生产线安全合规检查
- **学校培训**: 安全知识教育和技能培训
- **公共场所**: 疫情防控和安全监控

## 🚨 使用指南

### ⚡ 首次运行检查清单
- ✅ 确保网络连接（下载YOLO依赖）
- ✅ 允许浏览器摄像头权限
- ✅ 等待模型加载完成（约30-60秒）
- ✅ 检查系统资源（建议4GB+可用内存）

### 🔧 常见问题解决

| 问题 | 可能原因 | 解决方案 |
|------|----------|----------|
| 🚫 模型加载失败 | 模型文件缺失 | 确保 `best.pt` 在项目根目录 |
| 📹 摄像头无法访问 | 权限设置问题 | 检查浏览器权限设置 |
| 📦 依赖安装失败 | 网络或版本问题 | `pip install -r requirements.txt --upgrade` |
| 🌐 端口被占用 | 其他服务占用 | 修改 `app.py` 端口或停止占用进程 |
| 💾 内存不足 | 系统资源不够 | 关闭其他程序，确保4GB+可用内存 |
| 🐌 检测速度慢 | 硬件性能限制 | 使用智能模式或升级硬件 |

### ⚡ 性能优化建议

#### 硬件优化
- 🖥️ **GPU加速**: 安装CUDA + cuDNN，使用GPU推理
- 💾 **内存优化**: 确保4GB+可用内存
- 🚀 **SSD存储**: 使用SSD提高模型加载速度

#### 软件优化
- 🎛️ **模式选择**: 根据场景选择合适检测模式
- 🔧 **参数调优**: 根据实际需求调整置信度阈值
- 📊 **资源监控**: 定期监控系统资源使用情况

## 📊 性能测试结果

### 检测性能指标
- **处理速度**: 10 FPS（标准模式）/ 3-4 FPS（智能模式）
- **多人检测**: 支持同时检测2-3人
- **小目标检测**: 优化参数提高远距离检测能力
- **检测准确率**: 基于训练数据的良好表现

### 资源使用优化
| 模式 | CPU使用率 | 内存使用 | 处理频率 | 适用场景 |
|------|-----------|----------|----------|----------|
| 标准模式 | 80-90% | 2-3GB | 10 FPS | 近距离、密集场景 |
| 智能模式 | 30-40% | 1-2GB | 3-4 FPS | 一般监控场景 |
| 高质量模式 | 85-95% | 2-3GB | 10 FPS | 远距离、小目标 |

## 🤝 贡献指南

### 开发流程

| 步骤 | 操作 | 说明 |
|------|------|------|
| 🍴 **Fork** | 复制项目到个人仓库 | 创建项目副本 |
| 🌿 **Branch** | `git checkout -b feature-name` | 创建功能分支 |
| 💻 **Code** | 编写代码并测试 | 遵循代码规范 |
| 📝 **Commit** | `git commit -m "description"` | 提交代码更改 |
| 🚀 **PR** | 创建Pull Request | 提交合并请求 |

### 代码规范
- 使用Python PEP 8编码规范
- 添加必要的注释和文档字符串
- 确保代码通过所有测试
- 更新相关文档

### 测试要求
- 新功能必须包含单元测试
- 确保所有现有测试通过
- 进行性能测试和兼容性测试

## 📞 支持与许可

### 项目信息
| 项目 | 信息 |
|------|------|
| 🏷️ **版本** | v2.0.0 |
| 📅 **更新** | 2025年1月 |
| 👥 **团队** | AI安全检测团队 |
| 📄 **许可证** | MIT License |

### 技术支持
- 📖 **文档**: 查看项目文档获取详细说明
- 🐛 **问题反馈**: 提交Issue报告问题
- 💬 **社区讨论**: 参与社区讨论和交流
- 📧 **联系**: 通过GitHub联系维护者

### 许可证说明
本项目采用MIT许可证，允许：
- ✅ 商业使用
- ✅ 修改和分发
- ✅ 私人使用
- ✅ 专利使用

详见 [LICENSE](LICENSE) 文件。

## 🎉 致谢

感谢以下开源项目的支持：
- [Ultralytics YOLO](https://github.com/ultralytics/ultralytics) - 核心检测模型
- [Flask](https://flask.palletsprojects.com/) - Web框架
- [OpenCV](https://opencv.org/) - 图像处理
- [PIL](https://pillow.readthedocs.io/) - 图像操作

---

<div align="center">

### ⭐ 如果这个项目对您有帮助，请给它一个星标！

**🚀 YOLO智能安全检测系统 | 让安全监控更智能**

[![GitHub stars](https://img.shields.io/github/stars/Guo-Yixin/YOLO_UPDATE.svg?style=social&label=Star)](https://github.com/Guo-Yixin/YOLO_UPDATE)
[![GitHub forks](https://img.shields.io/github/forks/Guo-Yixin/YOLO_UPDATE.svg?style=social&label=Fork)](https://github.com/Guo-Yixin/YOLO_UPDATE/fork)

</div>
