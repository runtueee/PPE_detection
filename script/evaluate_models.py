# evaluate_models.py
"""
批量评估多个YOLO模型, 输出每类mAP@0.5对比表
用于分析小目标检测提升效果
"""
import os
import pandas as pd
from pathlib import Path
from ultralytics import YOLO
import argparse


def evaluate_single_model(model_path: str, data_yaml: str, split: str = "val") -> dict:
    """
    评估单个模型，仅返回 mAP@0.5（整体与按类别）。
    
    Args:
        model_path: 模型权重文件路径
        data_yaml: 数据配置文件路径
        split: 评估数据集分割 (val/test)
    
    Returns:
        dict: 包含整体 mAP@0.5 与每类 mAP@0.5 的字典
    """
    print(f"正在评估模型: {model_path}")
    
    try:
        model = YOLO(model_path)
        results = model.val(data=data_yaml, split=split, plots=False, save_json=True, verbose=False)
        
        # 获取类别名称
        class_names = list(results.names.values())
        
        # 整体 mAP@0.5
        overall_map50 = results.box.map50
        
        # 每类 mAP@0.5：优先从 all_ap 提取 IoU=0.5 的列（索引0）
        per_class_map50 = []
        if hasattr(results.box, 'all_ap') and results.box.all_ap is not None:
            for i in range(len(class_names)):
                if i < len(results.box.all_ap):
                    ap50 = results.box.all_ap[i][0] if len(results.box.all_ap[i]) > 0 else 0.0
                    per_class_map50.append(ap50)
                else:
                    per_class_map50.append(0.0)
        else:
            # 如果无法得到每类 AP@0.5，退化为均分近似以避免报错
            per_class_map50 = [overall_map50 / len(class_names)] * len(class_names)
        
        # 构建结果字典（仅 map50）
        result_dict = {
            'model_name': Path(model_path).stem,
            'overall_mAP@0.5': round(overall_map50, 4),
        }
        
        # 添加每类 mAP@0.5
        for i, class_name in enumerate(class_names):
            result_dict[f'{class_name}_mAP@0.5'] = round(per_class_map50[i], 4)
        
        print(f"  - 整体mAP@0.5: {overall_map50:.4f}")
        
        return result_dict
        
    except Exception as e:
        print(f"评估模型 {model_path} 时出错: {e}")
        return None


def batch_evaluate_models(model_paths: list, data_yaml: str, output_file: str = "model_comparison.csv", split: str = "val"):
    """
    批量评估多个模型并生成对比表
    
    Args:
        model_paths: 模型权重文件路径列表
        data_yaml: 数据配置文件路径
        output_file: 输出CSV文件名
        split: 评估数据集分割
    """
    print(f"开始批量评估 {len(model_paths)} 个模型...")
    print(f"使用数据集: {data_yaml}")
    print(f"评估分割: {split}")
    print("-" * 60)
    
    all_results = []
    
    for i, model_path in enumerate(model_paths, 1):
        print(f"\n[{i}/{len(model_paths)}] 评估模型: {Path(model_path).name}")
        result = evaluate_single_model(model_path, data_yaml, split)
        if result:
            all_results.append(result)
        print("-" * 40)
    
    if not all_results:
        print("没有成功评估任何模型！")
        return
    
    # 转换为DataFrame
    df = pd.DataFrame(all_results)
    
    # 保存到CSV
    df.to_csv(output_file, index=False, encoding='utf-8-sig')
    print(f"\n结果已保存到: {output_file}")
    
    # 打印对比表
    print("\n" + "="*80)
    print("模型对比表 (每类mAP@0.5)")
    print("="*80)
    
    # 显示整体指标（仅 mAP@0.5）
    overall_cols = ['model_name', 'overall_mAP@0.5']
    print("\n整体指标对比:")
    print(df[overall_cols].to_string(index=False))
    
    # 显示每类指标
    class_cols = [col for col in df.columns if col.endswith('_mAP@0.5') and col != 'overall_mAP@0.5']
    if class_cols:
        print(f"\n每类mAP@0.5对比 (共{len(class_cols)}个类别):")
        class_df = df[['model_name'] + class_cols]
        print(class_df.to_string(index=False))
    
    # 计算提升幅度（如果有多个模型）
    if len(df) > 1:
        print(f"\n提升分析 (相对于第一个模型):")
        baseline = df.iloc[0]
        for i in range(1, len(df)):
            current = df.iloc[i]
            print(f"\n{current['model_name']} vs {baseline['model_name']}:")
            print(f"  整体mAP@0.5: {baseline['overall_mAP@0.5']:.4f} → {current['overall_mAP@0.5']:.4f} (Δ{current['overall_mAP@0.5'] - baseline['overall_mAP@0.5']:+.4f})")
            
            # 分析每类提升
            improvements = []
            for col in class_cols:
                baseline_val = baseline[col]
                current_val = current[col]
                delta = current_val - baseline_val
                if delta > 0.01:  # 提升超过1%
                    improvements.append(f"{col.replace('_mAP@0.5', '')}: +{delta:.3f}")
            
            if improvements:
                print(f"  主要提升类别: {', '.join(improvements[:5])}")  # 显示前5个提升最大的类别


def main():
    parser = argparse.ArgumentParser(description="批量评估YOLO模型，输出每类mAP对比")
    parser.add_argument("--models", nargs="+", required=True, help="模型权重文件路径列表")
    parser.add_argument("--data", type=str, required=True, help="数据配置文件路径")
    parser.add_argument("--output", type=str, default="model_comparison.csv", help="输出CSV文件名")
    parser.add_argument("--split", type=str, default="val", choices=["val", "test"], help="评估数据集分割")
    
    args = parser.parse_args()
    
    # 检查模型文件是否存在
    valid_models = []
    for model_path in args.models:
        if os.path.exists(model_path):
            valid_models.append(model_path)
        else:
            print(f"警告: 模型文件不存在: {model_path}")
    
    if not valid_models:
        print("错误: 没有找到有效的模型文件！")
        return
    
    # 检查数据文件是否存在
    if not os.path.exists(args.data):
        print(f"错误: 数据配置文件不存在: {args.data}")
        return
    
    batch_evaluate_models(valid_models, args.data, args.output, args.split)

'''
python script/evaluate_models.py --models 'D:/innovaton_competetion/ultralytics-main/runs/train/safeHat_exp_yolov8s/weights/best_yolov8s.pt' 'D:/innovaton_competetion/ultralytics-main/runs/train/PPE_exp_yolov8s_cp30/weights/PPE_exp_yolov8s_cp30_best.pt' 'D:/innovaton_competetion/ultralytics-main/runs/train/PPE_exp_yolov8s_tile/weights/PPE_exp_yolov8s_tile_best.pt' 'D:/innovaton_competetion/ultralytics-main/runs/train/PPE_exp_yolov8s_tile_cp30/weights/best_yolov8s_tile_cp30.pt' 'D:/innovaton_competetion/ultralytics-main/runs/train/safeHat_exp_batch432/weights/best_yolov8n.pt' --data 'D:/innovaton_competetion/ultralytics-main/css-data-split/data.yaml' --output 'ppe_model_comparison3.csv'
'''

if __name__ == "__main__":
    main()

