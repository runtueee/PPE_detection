#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
模拟前端实际请求的测试脚本
"""

import requests
import base64
import json
import time
import cv2
import numpy as np
import io
from PIL import Image

def create_real_test_image():
    """创建一个真实的测试图像，模拟前端canvas数据"""
    # 创建一个简单的测试图像
    img = np.zeros((480, 640, 3), dtype=np.uint8)
    img[:] = (128, 128, 128)  # 灰色背景
    
    # 添加一些简单的图形
    cv2.rectangle(img, (100, 100), (200, 200), (255, 0, 0), 2)
    cv2.circle(img, (400, 300), 50, (0, 255, 0), 2)
    
    # 转换为PIL图像
    pil_img = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
    
    # 转换为JPEG格式的base64
    buffer = io.BytesIO()
    pil_img.save(buffer, format='JPEG', quality=80)
    img_bytes = buffer.getvalue()
    
    # 添加data URL前缀，模拟前端格式
    base64_data = base64.b64encode(img_bytes).decode('utf-8')
    data_url = f"data:image/jpeg;base64,{base64_data}"
    
    return data_url

def test_real_endpoint(endpoint, data):
    """测试真实的端点请求"""
    try:
        print(f"测试端点: {endpoint}")
        print(f"图像数据长度: {len(data['image'])} 字符")
        
        response = requests.post(
            f'http://localhost:5000{endpoint}',
            json=data,
            headers={'Content-Type': 'application/json'},
            timeout=30
        )
        
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ 请求成功")
            print(f"检测结果: {result.get('detections', {})}")
            return True
        else:
            print(f"❌ 请求失败: {response.text}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ 无法连接到服务器")
        return False
    except requests.exceptions.Timeout:
        print("❌ 请求超时")
        return False
    except Exception as e:
        print(f"❌ 未知错误: {e}")
        return False

def main():
    """主测试函数"""
    print("开始测试真实的前端请求...")
    
    # 创建真实的测试图像
    test_image = create_real_test_image()
    
    # 测试智能模式
    print("\n" + "="*50)
    print("测试智能模式端点")
    print("="*50)
    
    smart_data = {
        'image': test_image,
        'frame_count': 1
    }
    
    smart_success = test_real_endpoint('/smart_video_feed', smart_data)
    
    # 测试高质量模式
    print("\n" + "="*50)
    print("测试高质量模式端点")
    print("="*50)
    
    quality_data = {
        'image': test_image
    }
    
    quality_success = test_real_endpoint('/detect_small_objects', quality_data)
    
    # 测试普通模式
    print("\n" + "="*50)
    print("测试普通模式端点")
    print("="*50)
    
    normal_data = {
        'image': test_image
    }
    
    normal_success = test_real_endpoint('/video_feed', normal_data)
    
    # 总结结果
    print("\n" + "="*50)
    print("测试结果总结")
    print("="*50)
    print(f"智能模式: {'✅ 成功' if smart_success else '❌ 失败'}")
    print(f"高质量模式: {'✅ 成功' if quality_success else '❌ 失败'}")
    print(f"普通模式: {'✅ 成功' if normal_success else '❌ 失败'}")
    
    if smart_success and quality_success and normal_success:
        print("\n✅ 所有端点都正常工作！")
        print("如果前端仍然报错，问题可能在于：")
        print("1. 前端错误处理逻辑")
        print("2. 浏览器兼容性问题")
        print("3. 网络连接问题")
    else:
        print("\n❌ 部分端点存在问题")
        print("建议检查后端日志以获取更多信息")

if __name__ == '__main__':
    main()
