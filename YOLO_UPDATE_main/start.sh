#!/bin/bash

echo "========================================"
echo "YOLO安全检测系统启动中..."
echo "========================================"
echo

# 检查Python是否安装
if ! command -v python3 &> /dev/null; then
  echo "错误: 未找到Python3，请先安装Python 3.8+"
  exit 1
fi

# 检查依赖是否安装
echo "检查依赖包..."
if ! python3 -c "import flask" &> /dev/null; then
  echo "安装Flask..."
  pip3 install flask
fi

if ! python3 -c "import ultralytics" &> /dev/null; then
  echo "安装Ultralytics..."
  pip3 install ultralytics
fi

if ! python3 -c "import cv2" &> /dev/null; then
  echo "安装OpenCV..."
  pip3 install opencv-python
fi

if ! python3 -c "import PIL" &> /dev/null; then
  echo "安装Pillow..."
  pip3 install pillow
fi

echo
echo "所有依赖检查完成！"
echo

# 检查模型文件
if [ ! -f "best.pt" ]; then
  echo "警告: 未找到模型文件 best.pt"
  echo "请确保模型文件在当前目录中"
  echo
fi

echo "启动YOLO安全检测系统..."
echo "系统将在 http://localhost:5000 启动"
echo "按 Ctrl+C 停止服务"
echo

# 启动Flask应用
python3 app.py
