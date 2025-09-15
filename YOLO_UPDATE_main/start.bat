@echo off
chcp 65001 >nul
echo ========================================
echo YOLO安全检测系统启动中...
echo ========================================
echo.

REM 检查Python是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到Python，请先安装Python 3.8+
    pause
    exit /b 1
)

REM 检查依赖是否安装
echo 检查依赖包...
pip show flask >nul 2>&1
if errorlevel 1 (
    echo 安装Flask...
    pip install flask
)

pip show ultralytics >nul 2>&1
if errorlevel 1 (
    echo 安装Ultralytics...
    pip install ultralytics
)

pip show opencv-python >nul 2>&1
if errorlevel 1 (
    echo 安装OpenCV...
    pip install opencv-python
)

pip show pillow >nul 2>&1
if errorlevel 1 (
    echo 安装Pillow...
    pip install pillow
)

echo.
echo 所有依赖检查完成！
echo.

REM 检查模型文件
if not exist "best.pt" (
    echo 警告: 未找到模型文件 best.pt
    echo 请确保模型文件在当前目录中
    echo.
)

echo 启动YOLO安全检测系统...
echo 系统将在 http://localhost:5000 启动
echo 按 Ctrl+C 停止服务
echo.

REM 启动Flask应用
python app.py

pause
