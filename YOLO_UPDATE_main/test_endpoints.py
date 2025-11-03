#!/usr/bin/env python3
"""测试智能模式和高质量模式端点的脚本."""

import base64
import json

import requests


def create_test_image():
    """创建一个简单的测试图像（base64编码）."""
    # 使用一个1x1像素的JPEG图像作为测试
    # 这是一个有效的JPEG图像的最小表示
    test_jpeg = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xff\xc0\x00\x11\x08\x00\x01\x00\x01\x01\x01\x11\x00\x02\x11\x01\x03\x11\x01\xff\xc4\x00\x14\x00\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x08\xff\xc4\x00\x14\x10\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xda\x00\x0c\x03\x01\x00\x02\x11\x03\x11\x00\x3f\x00\xaa\xff\xd9"
    return base64.b64encode(test_jpeg).decode("utf-8")


def test_endpoint_basic(endpoint):
    """测试端点的基本连接性."""
    try:
        print(f"测试端点基本连接: {endpoint}")

        # 发送一个无效的请求来测试端点是否存在
        response = requests.post(
            f"http://localhost:5000{endpoint}",
            json={"invalid": "data"},
            headers={"Content-Type": "application/json"},
            timeout=10,
        )

        print(f"响应状态码: {response.status_code}")

        # 如果返回400错误，说明端点存在但请求数据无效
        if response.status_code == 400:
            print("✅ 端点存在且响应正常")
            return True
        elif response.status_code == 200:
            print("✅ 端点存在且处理成功")
            return True
        else:
            print(f"❌ 端点响应异常: {response.status_code}")
            return False

    except requests.exceptions.ConnectionError:
        print("❌ 无法连接到服务器，请确保Flask应用正在运行")
        return False
    except requests.exceptions.Timeout:
        print("❌ 请求超时")
        return False
    except Exception as e:
        print(f"❌ 未知错误: {e}")
        return False


def test_health_check():
    """测试健康检查端点."""
    try:
        print("测试健康检查端点: /health")

        response = requests.get("http://localhost:5000/health", timeout=10)

        print(f"响应状态码: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            print(f"健康检查结果: {json.dumps(result, indent=2)}")
            return True
        else:
            print(f"健康检查失败: {response.text}")
            return False

    except Exception as e:
        print(f"健康检查错误: {e}")
        return False


def main():
    """主测试函数."""
    print("开始测试智能模式和高质量模式端点...")

    # 首先测试健康检查
    print("\n" + "=" * 50)
    print("健康检查")
    print("=" * 50)

    health_success = test_health_check()

    if not health_success:
        print("\n❌ 健康检查失败，请确保Flask应用正在运行")
        return

    # 测试智能模式端点
    print("\n" + "=" * 50)
    print("测试智能模式端点 (/smart_video_feed)")
    print("=" * 50)

    smart_success = test_endpoint_basic("/smart_video_feed")

    # 测试高质量模式端点
    print("\n" + "=" * 50)
    print("测试高质量模式端点 (/detect_small_objects)")
    print("=" * 50)

    quality_success = test_endpoint_basic("/detect_small_objects")

    # 测试普通模式端点作为对比
    print("\n" + "=" * 50)
    print("测试普通模式端点 (/video_feed)")
    print("=" * 50)

    normal_success = test_endpoint_basic("/video_feed")

    # 总结测试结果
    print("\n" + "=" * 50)
    print("测试结果总结")
    print("=" * 50)
    print(f"健康检查: {'✅ 成功' if health_success else '❌ 失败'}")
    print(f"智能模式端点: {'✅ 成功' if smart_success else '❌ 失败'}")
    print(f"高质量模式端点: {'✅ 成功' if quality_success else '❌ 失败'}")
    print(f"普通模式端点: {'✅ 成功' if normal_success else '❌ 失败'}")

    if smart_success and quality_success and normal_success:
        print("\n✅ 所有端点都正常工作！")
        print("如果前端仍然报错，可能是以下原因：")
        print("1. 图像数据格式问题")
        print("2. 模型处理特定图像时出错")
        print("3. 前端错误处理逻辑问题")
    else:
        print("\n❌ 部分端点存在问题")
        print("建议:")
        print("1. 检查Flask应用是否正在运行")
        print("2. 检查模型文件 'best.pt' 是否存在")
        print("3. 检查控制台错误日志")
        print("4. 确保所有依赖包已正确安装")


if __name__ == "__main__":
    main()
