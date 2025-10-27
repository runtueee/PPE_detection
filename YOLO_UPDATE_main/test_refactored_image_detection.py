#!/usr/bin/env python3
"""重构后的图片检测功能测试脚本 用于验证新的图片检测界面和功能是否正常工作."""

import json
import os
from datetime import datetime

import requests


def test_server_health():
    """测试服务器健康状态."""
    print("=" * 50)
    print("测试服务器健康状态")
    print("=" * 50)

    try:
        response = requests.get("http://localhost:5000/health", timeout=10)
        if response.status_code == 200:
            health_data = response.json()
            print(f"✓ 服务器状态: {health_data['status']}")
            print(f"✓ 模型已加载: {health_data['model_loaded']}")
            print(f"✓ 时间戳: {health_data['timestamp']}")
            return health_data["model_loaded"]
        else:
            print(f"✗ 服务器响应异常: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ 服务器连接失败: {e}")
        return False


def test_image_upload():
    """测试图片上传功能."""
    print("\n" + "=" * 50)
    print("测试图片上传检测功能")
    print("=" * 50)

    # 查找测试图片
    test_image_dir = "test/images"
    if not os.path.exists(test_image_dir):
        print(f"✗ 测试图片目录不存在: {test_image_dir}")
        return False

    test_images = [f for f in os.listdir(test_image_dir) if f.lower().endswith((".jpg", ".jpeg", ".png"))]

    if not test_images:
        print(f"✗ 在 {test_image_dir} 中未找到测试图片")
        return False

    test_image = test_images[0]
    test_image_path = os.path.join(test_image_dir, test_image)
    print(f"使用测试图片: {test_image}")

    try:
        # 上传图片进行检测
        with open(test_image_path, "rb") as f:
            files = {"file": (test_image, f, "image/jpeg")}
            response = requests.post("http://localhost:5000/upload", files=files, timeout=30)

        if response.status_code != 200:
            print(f"✗ 上传失败，HTTP状态码: {response.status_code}")
            print(f"响应内容: {response.text}")
            return False

        result = response.json()

        if "error" in result:
            print(f"✗ 检测失败: {result['error']}")
            return False

        # 验证响应数据完整性
        print("✓ 图片上传成功")

        # 检查返回的图像数据
        if result.get("image"):
            print(f"✓ 返回图像数据，长度: {len(result['image'])}")

            # 验证base64数据有效性
            import base64

            try:
                image_bytes = base64.b64decode(result["image"])
                print(f"✓ base64数据有效，解码后长度: {len(image_bytes)}")
            except Exception as e:
                print(f"✗ base64数据无效: {e}")
                return False
        else:
            print("✗ 未返回图像数据")
            return False

        # 检查检测结果
        if "detections" in result:
            detections = result["detections"]
            if detections:
                total_objects = sum(detections.values())
                print(f"✓ 检测到 {total_objects} 个目标:")
                for class_name, count in detections.items():
                    print(f"  - {class_name}: {count}")
            else:
                print("⚠ 未检测到任何目标")
        else:
            print("✗ 未返回检测结果")

        # 检查安全分析
        if result.get("analysis"):
            analysis = result["analysis"]
            print(f"✓ 安全评分: {analysis['safety_score']}/100")
            if analysis["safety_violations"]:
                print("⚠ 安全违规:")
                for violation in analysis["safety_violations"]:
                    print(f"  - {violation}")
            else:
                print("✓ 无安全违规")
        else:
            print("⚠ 未返回安全分析")

        return True

    except Exception as e:
        print(f"✗ 测试失败: {e}")
        return False


def test_ui_access():
    """测试UI界面访问."""
    print("\n" + "=" * 50)
    print("测试UI界面访问")
    print("=" * 50)

    try:
        response = requests.get("http://localhost:5000/", timeout=10)
        if response.status_code == 200:
            print("✓ 主页面可正常访问")

            # 检查是否包含重构后的HTML结构
            html_content = response.text

            required_elements = [
                "image-detection-container",
                "upload-section",
                "detection-results-section",
                "image-comparison",
                "original-image",
                "upload-result-image",
                "image-detection.js",
            ]

            missing_elements = []
            for element in required_elements:
                if element not in html_content:
                    missing_elements.append(element)

            if not missing_elements:
                print("✓ 重构后的HTML结构完整")
                return True
            else:
                print(f"✗ 缺少HTML元素: {missing_elements}")
                return False
        else:
            print(f"✗ 主页面访问失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ UI访问测试失败: {e}")
        return False


def test_static_resources():
    """测试静态资源."""
    print("\n" + "=" * 50)
    print("测试静态资源")
    print("=" * 50)

    resources = ["/static/js/image-detection.js", "/static/js/script.js", "/static/css/style.css"]

    all_ok = True
    for resource in resources:
        try:
            response = requests.get(f"http://localhost:5000{resource}", timeout=10)
            if response.status_code == 200:
                print(f"✓ {resource} 可正常访问")
            else:
                print(f"✗ {resource} 访问失败: {response.status_code}")
                all_ok = False
        except Exception as e:
            print(f"✗ {resource} 访问异常: {e}")
            all_ok = False

    return all_ok


def generate_test_report(results):
    """生成测试报告."""
    print("\n" + "=" * 50)
    print("测试报告")
    print("=" * 50)

    total_tests = len(results)
    passed_tests = sum(1 for result in results.values() if result)

    print(f"总测试数: {total_tests}")
    print(f"通过测试: {passed_tests}")
    print(f"失败测试: {total_tests - passed_tests}")
    print(f"通过率: {(passed_tests / total_tests * 100):.1f}%")

    print("\n详细结果:")
    for test_name, result in results.items():
        status = "✓ 通过" if result else "✗ 失败"
        print(f"  {test_name}: {status}")

    if passed_tests == total_tests:
        print("\n🎉 所有测试通过！重构后的图片检测功能正常工作。")
        print("\n使用说明:")
        print("1. 访问 http://localhost:5000")
        print("2. 点击 '图片检测' 标签页")
        print("3. 上传图片或拖拽图片到上传区域")
        print("4. 查看检测结果、统计信息和安全评估")
        print("5. 使用全屏查看、下载结果等功能")
    else:
        print("\n⚠️ 部分测试失败，请检查相关功能。")

    # 保存测试报告
    report = {
        "timestamp": datetime.now().isoformat(),
        "total_tests": total_tests,
        "passed_tests": passed_tests,
        "success_rate": passed_tests / total_tests * 100,
        "results": results,
    }

    with open("test_report.json", "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print("\n测试报告已保存到: test_report.json")


def main():
    """主测试函数."""
    print("重构后的图片检测功能测试")
    print("测试时间:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))

    # 执行测试
    test_results = {}

    test_results["服务器健康状态"] = test_server_health()
    test_results["UI界面访问"] = test_ui_access()
    test_results["静态资源"] = test_static_resources()

    # 只有在服务器正常时才测试图片上传
    if test_results["服务器健康状态"]:
        test_results["图片上传检测"] = test_image_upload()
    else:
        print("\n⚠️ 跳过图片上传测试（服务器未就绪）")
        test_results["图片上传检测"] = False

    # 生成测试报告
    generate_test_report(test_results)


if __name__ == "__main__":
    main()
