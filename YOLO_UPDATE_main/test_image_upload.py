#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
图片检测功能测试脚本
用于验证图片上传检测功能是否正常工作
"""

import requests
import os
import base64
from PIL import Image
import io

def test_image_upload():
    """测试图片上传检测功能"""
    
    # 服务器地址
    server_url = "http://localhost:5000"
    
    # 检查服务器健康状态
    print("1. 检查服务器状态...")
    try:
        response = requests.get(f"{server_url}/health")
        health_data = response.json()
        print(f"   服务器状态: {health_data['status']}")
        print(f"   模型已加载: {health_data['model_loaded']}")
        
        if not health_data['model_loaded']:
            print("   错误: 模型未加载，无法继续测试")
            return False
            
    except Exception as e:
        print(f"   错误: 无法连接到服务器 - {e}")
        return False
    
    # 查找测试图片
    print("\n2. 查找测试图片...")
    test_images_dir = "test/images"
    if not os.path.exists(test_images_dir):
        print(f"   错误: 测试图片目录不存在: {test_images_dir}")
        return False
    
    test_images = [f for f in os.listdir(test_images_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    if not test_images:
        print(f"   错误: 在 {test_images_dir} 中未找到测试图片")
        return False
    
    test_image = test_images[0]
    test_image_path = os.path.join(test_images_dir, test_image)
    print(f"   使用测试图片: {test_image}")
    
    # 测试图片上传检测
    print("\n3. 测试图片上传检测...")
    try:
        with open(test_image_path, 'rb') as f:
            files = {'file': (test_image, f, 'image/jpeg')}
            response = requests.post(f"{server_url}/upload", files=files)
        
        if response.status_code != 200:
            print(f"   错误: HTTP状态码 {response.status_code}")
            print(f"   响应: {response.text}")
            return False
        
        result = response.json()
        
        if 'error' in result:
            print(f"   错误: {result['error']}")
            return False
        
        # 检查返回的数据
        print("   ✓ 请求成功")
        
        if 'image' in result and result['image']:
            image_data = result['image']
            print(f"   ✓ 返回图像数据，长度: {len(image_data)}")
            
            # 验证base64图像数据
            try:
                image_bytes = base64.b64decode(image_data)
                img = Image.open(io.BytesIO(image_bytes))
                print(f"   ✓ 图像数据有效，尺寸: {img.size}")
                
                # 保存结果图像用于检查
                result_path = "test_result_image.jpg"
                img.save(result_path)
                print(f"   ✓ 检测结果图像已保存到: {result_path}")
                
            except Exception as e:
                print(f"   ✗ 图像数据无效: {e}")
                return False
        else:
            print("   ✗ 未返回图像数据")
            return False
        
        if 'detections' in result and result['detections']:
            detections = result['detections']
            total_objects = sum(detections.values())
            print(f"   ✓ 检测到 {total_objects} 个目标:")
            for class_name, count in detections.items():
                print(f"      - {class_name}: {count}")
        else:
            print("   ⚠ 未检测到任何目标")
        
        if 'analysis' in result and result['analysis']:
            analysis = result['analysis']
            print(f"   ✓ 安全评分: {analysis['safety_score']}/100")
            if analysis['safety_violations']:
                print("   ⚠ 安全违规:")
                for violation in analysis['safety_violations']:
                    print(f"      - {violation}")
        
        return True
        
    except Exception as e:
        print(f"   错误: 测试失败 - {e}")
        return False

def test_debug_endpoint():
    """测试调试端点"""
    
    print("\n4. 测试调试端点...")
    server_url = "http://localhost:5000"
    test_images_dir = "test/images"
    
    if not os.path.exists(test_images_dir):
        print(f"   跳过: 测试图片目录不存在")
        return True
    
    test_images = [f for f in os.listdir(test_images_dir) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
    if not test_images:
        print(f"   跳过: 未找到测试图片")
        return True
    
    test_image = test_images[0]
    test_image_path = os.path.join(test_images_dir, test_image)
    
    try:
        with open(test_image_path, 'rb') as f:
            files = {'file': (test_image, f, 'image/jpeg')}
            response = requests.post(f"{server_url}/test_upload", files=files)
        
        if response.status_code != 200:
            print(f"   错误: HTTP状态码 {response.status_code}")
            return False
        
        result = response.json()
        
        if 'debug' in result:
            debug = result['debug']
            print(f"   ✓ 调试信息:")
            print(f"      - 图像数据长度: {debug.get('image_length', 'N/A')}")
            print(f"      - 检测目标数量: {debug.get('detections_count', 'N/A')}")
            print(f"      - 检测类别: {debug.get('detection_keys', 'N/A')}")
        
        return True
        
    except Exception as e:
        print(f"   错误: 调试测试失败 - {e}")
        return False

if __name__ == "__main__":
    print("=== 图片检测功能测试 ===")
    
    success = test_image_upload()
    if success:
        test_debug_endpoint()
        print("\n=== 测试完成 ===")
        print("如果测试成功但前端仍有问题，请:")
        print("1. 打开浏览器访问 http://localhost:5000")
        print("2. 或者打开 test_image_detection.html 进行调试")
        print("3. 检查浏览器控制台是否有错误信息")
    else:
        print("\n=== 测试失败 ===")
        print("请检查服务器是否正常运行，模型是否正确加载")
