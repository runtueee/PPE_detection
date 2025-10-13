#!/usr/bin/env python3

"""环境配置测试脚本 用于验证项目环境是否正确配置."""

import os
import sys


def test_python_version():
    """测试Python版本."""
    print("=== Python版本检查 ===")
    version = sys.version_info
    print(f"Python版本: {version.major}.{version.minor}.{version.micro}")

    if version.major < 3 or (version.major == 3 and version.minor < 8):
        print("❌ Python版本过低，需要Python 3.8+")
        return False
    else:
        print("✅ Python版本符合要求")
        return True


def test_dependencies():
    """测试依赖包."""
    print("\n=== 依赖包检查 ===")
    required_packages = ["flask", "ultralytics", "opencv-python", "pillow", "numpy"]

    missing_packages = []

    for package in required_packages:
        try:
            if package == "opencv-python":
                import cv2

                print(f"✅ {package} - 已安装")
            elif package == "pillow":
                import PIL

                print(f"✅ {package} - 已安装")
            else:
                __import__(package)
                print(f"✅ {package} - 已安装")
        except ImportError:
            print(f"❌ {package} - 未安装")
            missing_packages.append(package)

    if missing_packages:
        print(f"\n缺少的包: {', '.join(missing_packages)}")
        print("请运行: pip install -r requirements.txt")
        return False
    else:
        print("✅ 所有依赖包已安装")
        return True


def test_model_files():
    """测试模型文件."""
    print("\n=== 模型文件检查 ===")

    required_files = ["best.pt", "data.yaml"]
    missing_files = []

    for file in required_files:
        if os.path.exists(file):
            size = os.path.getsize(file)
            print(f"✅ {file} - 存在 ({size:,} bytes)")
        else:
            print(f"❌ {file} - 不存在")
            missing_files.append(file)

    if missing_files:
        print(f"\n缺少的文件: {', '.join(missing_files)}")
        return False
    else:
        print("✅ 所有模型文件存在")
        return True


def test_yolo_model():
    """测试YOLO模型加载."""
    print("\n=== YOLO模型测试 ===")

    try:
        from ultralytics import YOLO

        print("✅ Ultralytics导入成功")

        # 尝试加载模型
        print("正在加载模型...")
        model = YOLO("best.pt")
        print("✅ 模型加载成功")

        # 测试简单推理
        print("正在测试推理...")
        import numpy as np

        test_image = np.zeros((640, 640, 3), dtype=np.uint8)
        model(test_image)
        print("✅ 模型推理测试成功")

        return True

    except Exception as e:
        print(f"❌ 模型测试失败: {e}")
        return False


def test_flask_app():
    """测试Flask应用."""
    print("\n=== Flask应用测试 ===")

    try:
        from flask import Flask

        print("✅ Flask导入成功")

        # 创建测试应用
        app = Flask(__name__)

        @app.route("/test")
        def test():
            return "OK"

        print("✅ Flask应用创建成功")
        return True

    except Exception as e:
        print(f"❌ Flask测试失败: {e}")
        return False


def main():
    """主函数."""
    print("施工现场安全监控系统 - 环境配置测试")
    print("=" * 50)

    tests = [test_python_version, test_dependencies, test_model_files, test_yolo_model, test_flask_app]

    passed = 0
    total = len(tests)

    for test in tests:
        if test():
            passed += 1

    print("\n" + "=" * 50)
    print(f"测试结果: {passed}/{total} 通过")

    if passed == total:
        print("🎉 所有测试通过！环境配置正确，可以启动应用。")
        print("\n启动命令:")
        print("  Windows: start.bat")
        print("  Linux/Mac: ./start.sh")
        print("  手动启动: python app.py")
        return True
    else:
        print("❌ 部分测试失败，请检查环境配置。")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
