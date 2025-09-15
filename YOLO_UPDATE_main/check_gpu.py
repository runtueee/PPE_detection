#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GPU检测脚本 - 检查系统GPU状态和YOLO模型设备使用情况
"""

import sys
import os

def check_gpu_status():
    """检查GPU状态"""
    print("=" * 60)
    print("GPU状态检测")
    print("=" * 60)
    
    # 检查PyTorch
    try:
        import torch
        print(f"✓ PyTorch版本: {torch.__version__}")
        
        # 检查CUDA可用性
        if torch.cuda.is_available():
            print(f"✓ CUDA可用: 是")
            if torch.version.cuda:
                print(f"✓ CUDA版本: {torch.version.cuda}")
            print(f"✓ GPU数量: {torch.cuda.device_count()}")
            
            for i in range(torch.cuda.device_count()):
                gpu_name = torch.cuda.get_device_name(i)
                gpu_memory = torch.cuda.get_device_properties(i).total_memory / 1024**3
                print(f"  GPU {i}: {gpu_name} ({gpu_memory:.1f} GB)")
                
            # 检查当前GPU
            current_device = torch.cuda.current_device()
            print(f"✓ 当前GPU: {current_device}")
            
        else:
            print("✗ CUDA可用: 否")
            print("  可能原因:")
            print("  1. 未安装CUDA")
            print("  2. PyTorch未编译CUDA支持")
            print("  3. GPU驱动程序问题")
            
    except ImportError:
        print("✗ PyTorch未安装")
        return False
    
    print()
    
    # 检查Ultralytics
    try:
        import ultralytics as ul
        from ultralytics import YOLO
        # 部分版本没有 YOLO.__version__，应读取包版本
        ul_version = getattr(ul, "__version__", "unknown")
        print(f"✓ Ultralytics版本: {ul_version}")
        
        # 检查模型文件
        if os.path.exists("best.pt"):
            print("✓ 模型文件: best.pt 已找到")
            
            # 尝试加载模型
            try:
                model = YOLO("best.pt")
                print("✓ 模型加载成功")
                
                # 检查模型设备
                if hasattr(model, 'model'):
                    device = next(model.model.parameters()).device
                    print(f"✓ 模型当前设备: {device}")
                    
                    # 尝试移动到GPU
                    if torch.cuda.is_available():
                        try:
                            model.to("cuda:0")
                            device = next(model.model.parameters()).device
                            print(f"✓ 模型已移动到GPU: {device}")
                        except Exception as e:
                            print(f"✗ 模型移动到GPU失败: {e}")
                else:
                    print("? 无法确定模型设备")
                    
            except Exception as e:
                print(f"✗ 模型加载失败: {e}")
        else:
            print("✗ 模型文件: best.pt 未找到")
            
    except ImportError:
        print("✗ Ultralytics未安装")
        return False
    
    print()
    
    # 检查其他依赖
    try:
        import cv2
        print(f"✓ OpenCV版本: {cv2.__version__}")
    except ImportError:
        print("✗ OpenCV未安装")
    
    try:
        import PIL
        print(f"✓ Pillow版本: {PIL.__version__}")
    except ImportError:
        print("✗ Pillow未安装")
    
    try:
        import flask
        print(f"✓ Flask版本: {flask.__version__}")
    except ImportError:
        print("✗ Flask未安装")
    
    print()
    print("=" * 60)
    
    # 性能建议
    if torch.cuda.is_available():
        print("🎯 性能建议:")
        print("  - 系统已检测到GPU，YOLO推理将自动使用GPU加速")
        print("  - 推理速度将显著提升（通常比CPU快5-20倍）")
        print("  - 确保模型文件 best.pt 存在且可访问")
    else:
        print("⚠️  性能建议:")
        print("  - 系统未检测到GPU，将使用CPU进行推理")
        print("  - 推理速度较慢，建议配置GPU环境")
        print("  - 可以考虑使用云GPU服务或配置本地CUDA环境")
    
    return True

def main():
    """主函数"""
    try:
        check_gpu_status()
    except Exception as e:
        print(f"检测过程中出现错误: {e}")
    
    input("\n按回车键退出...")

if __name__ == "__main__":
    main()
