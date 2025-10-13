#!/usr/bin/env python3
"""YOLO安全检测系统启动脚本."""

import importlib.util
import os
import subprocess
import sys


def check_python_version():
    """检查Python版本."""
    print(f"✓ Python版本: {sys.version}")
    return True


def check_dependencies():
    """检查依赖包."""
    dependencies = ["flask", "ultralytics", "cv2", "PIL"]
    missing = []

    for dep in dependencies:
        if dep == "cv2":
            spec = importlib.util.find_spec("cv2")
        elif dep == "PIL":
            spec = importlib.util.find_spec("PIL")
        else:
            spec = importlib.util.find_spec(dep)

        if spec is None:
            missing.append(dep)
        else:
            print(f"✓ {dep} 已安装")

    if missing:
        print(f"\n缺少依赖包: {', '.join(missing)}")
        print("正在安装...")
        for dep in missing:
            if dep == "cv2":
                subprocess.run([sys.executable, "-m", "pip", "install", "opencv-python"])
            elif dep == "PIL":
                subprocess.run([sys.executable, "-m", "pip", "install", "pillow"])
            else:
                subprocess.run([sys.executable, "-m", "pip", "install", dep])

    return True


def check_model_file():
    """检查模型文件."""
    if os.path.exists("best.pt"):
        print("✓ 模型文件 best.pt 已找到")
        return True
    else:
        print("警告: 未找到模型文件 best.pt")
        print("请确保模型文件在当前目录中")
        return False


def main():
    """主函数."""
    print("=" * 50)
    print("YOLO安全检测系统启动中...")
    print("=" * 50)
    print()

    # 检查Python版本
    if not check_python_version():
        input("按回车键退出...")
        return

    print()

    # 检查依赖
    print("检查依赖包...")
    check_dependencies()
    print()

    # 检查模型文件
    check_model_file()
    print()

    print("启动YOLO安全检测系统...")
    print("系统将在 http://localhost:5000 启动")
    print("按 Ctrl+C 停止服务")
    print()

    # 启动Flask应用
    try:
        subprocess.run([sys.executable, "app.py"])
    except KeyboardInterrupt:
        print("\n服务已停止")
    except Exception as e:
        print(f"启动失败: {e}")

    input("按回车键退出...")


if __name__ == "__main__":
    main()
