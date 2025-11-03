import base64
import io
import os
import sys
import uuid
from datetime import datetime

import cv2
import numpy as np
from flask import Flask, jsonify, render_template, request, send_from_directory
from PIL import Image, ImageDraw, ImageFont

from ultralytics import YOLO

# 设置控制台编码为UTF-8，解决Windows终端乱码问题
if sys.platform.startswith("win"):
    import codecs

    sys.stdout = codecs.getwriter("utf-8")(sys.stdout.detach())
    sys.stderr = codecs.getwriter("utf-8")(sys.stderr.detach())

# RTSP相关导入
import threading
import time

# 初始化Flask应用
app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16MB max file size

# 全局变量
model = None  # 通用模式使用的模型
smart_model = None  # 智能模式使用的轻量化模型
small_target_model = None  # 高质量模式使用的小目标检测模型
class_names = [
    "Hardhat",
    "Mask",
    "NO-Hardhat",
    "NO-Mask",
    "NO-Safety Vest",
    "Person",
    "Safety Cone",
    "Safety Vest",
    "machinery",
    "vehicle",
]
class_colors = {
    "Person": "#FF5733",
    "Hardhat": "#33FF57",
    "NO-Hardhat": "#FF3333",
    "Mask": "#3357FF",
    "NO-Mask": "#FF33A8",
    "Safety Vest": "#F0FF33",
    "NO-Safety Vest": "#FF8333",
    "Safety Cone": "#33FFF0",
    "machinery": "#B533FF",
    "vehicle": "#FF33F0",
}

# RTSP相关全局变量
rtsp_cap = None
rtsp_connected = False
rtsp_current_frame = None
rtsp_frame_lock = threading.Lock()


def hex_to_rgb(hex_color):
    """将十六进制颜色转换为RGB元组."""
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i : i + 2], 16) for i in (0, 2, 4))


def load_model():
    """加载通用模式YOLO模型."""
    global model
    try:
        # 检测可用的设备
        import torch

        if torch.cuda.is_available():
            device = "cuda:0"  # 使用第一个GPU
            print(f"检测到GPU: {torch.cuda.get_device_name(0)}")
            print(f"GPU内存: {torch.cuda.get_device_properties(0).total_memory / 1024**3:.1f} GB")
        else:
            device = "cpu"
            print("未检测到GPU，使用CPU")

        # 加载通用模型到指定设备
        model = YOLO("models/best_yolov8s.pt")
        model.to(device)
        print(f"通用模型加载成功! 使用设备: {device}")
        return True
    except Exception as e:
        print(f"通用模型加载失败: {e}")
        return False


def load_smart_model():
    """加载智能模式的轻量化YOLO模型."""
    global smart_model
    try:
        # 检测可用的设备
        import torch

        if torch.cuda.is_available():
            device = "cuda:0"  # 使用第一个GPU
        else:
            device = "cpu"

        # 加载轻量化模型到指定设备
        smart_model = YOLO("models/best_yolov8n.pt")
        smart_model.to(device)
        print(f"轻量化模型加载成功! 使用设备: {device}")
        return True
    except Exception as e:
        print(f"轻量化模型加载失败: {e}")
        return False


def load_small_target_model():
    """加载高质量模式的小目标检测YOLO模型."""
    global small_target_model
    try:
        # 检测可用的设备
        import torch

        if torch.cuda.is_available():
            device = "cuda:0"  # 使用第一个GPU
        else:
            device = "cpu"

        # 加载小目标检测模型到指定设备
        small_target_model = YOLO("models/best_yolov8s_tile_cp30.pt")
        small_target_model.to(device)
        print(f"小目标检测模型加载成功! 使用设备: {device}")
        return True
    except Exception as e:
        print(f"小目标检测模型加载失败: {e}")
        return False


def draw_detections(image, results):
    """在图像上绘制检测结果."""
    try:
        # 确保图像是PIL格式
        if isinstance(image, np.ndarray):
            # 如果是numpy数组，转换为PIL图像
            if len(image.shape) == 3 and image.shape[2] == 3:
                # BGR转RGB
                image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                pil_image = Image.fromarray(image_rgb)
            else:
                pil_image = Image.fromarray(image)
        else:
            pil_image = image.copy()

        # 创建绘图对象
        draw = ImageDraw.Draw(pil_image)

        # 尝试加载字体，如果失败则使用默认字体
        try:
            font = ImageFont.truetype("arial.ttf", 20)
        except:
            try:
                # 尝试其他常见字体
                font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 20)
            except:
                font = ImageFont.load_default()

        detection_count = 0

        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    # 获取边界框坐标
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)

                    # 获取类别和置信度
                    cls = int(box.cls[0].cpu().numpy())
                    conf = float(box.conf[0].cpu().numpy())

                    if cls < len(class_names):
                        class_name = class_names[cls]
                        color = class_colors.get(class_name, "#FFFFFF")
                        rgb_color = hex_to_rgb(color)

                        # 绘制边界框 - 使用更粗的线条
                        draw.rectangle([x1, y1, x2, y2], outline=rgb_color, width=4)

                        # 绘制标签背景
                        label = f"{class_name} {conf:.2f}"

                        # 计算文本尺寸
                        try:
                            bbox = draw.textbbox((0, 0), label, font=font)
                            text_width = bbox[2] - bbox[0]
                            text_height = bbox[3] - bbox[1]
                        except:
                            # 如果textbbox不可用，使用textsize
                            text_width, text_height = draw.textsize(label, font=font)

                        # 确保标签不会超出图像边界
                        bg_y1 = max(0, y1 - text_height - 8)
                        bg_y2 = bg_y1 + text_height + 6
                        bg_x2 = min(pil_image.width, x1 + text_width + 12)

                        # 标签背景
                        draw.rectangle([x1, bg_y1, bg_x2, bg_y2], fill=rgb_color, outline=rgb_color)

                        # 标签文字
                        text_y = bg_y1 + 3
                        draw.text((x1 + 6, text_y), label, fill=(255, 255, 255), font=font)

                        detection_count += 1

        print(f"绘制了 {detection_count} 个检测框")
        return pil_image

    except Exception as e:
        print(f"绘制检测框时出错: {e}")
        # 如果绘制失败，返回原图像
        if isinstance(image, np.ndarray):
            if len(image.shape) == 3 and image.shape[2] == 3:
                image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                return Image.fromarray(image_rgb)
            else:
                return Image.fromarray(image)
        return image


def generate_safety_analysis(detections):
    """生成安全分析报告."""
    if not detections:
        return {
            "safety_score": 100,
            "safety_violations": [],
            "recommendations": ["图像中未检测到任何目标，安全状况良好"],
        }

    # 定义安全违规类别
    safety_violations = []
    recommendations = []

    # 检查安全违规
    if "NO-Hardhat" in detections:
        safety_violations.append(f"检测到 {detections['NO-Hardhat']} 人未佩戴安全帽")
        recommendations.append("要求所有人员必须佩戴安全帽")

    if "NO-Mask" in detections:
        safety_violations.append(f"检测到 {detections['NO-Mask']} 人未佩戴口罩")
        recommendations.append("要求所有人员必须佩戴口罩")

    if "NO-Safety Vest" in detections:
        safety_violations.append(f"检测到 {detections['NO-Safety Vest']} 人未穿安全背心")
        recommendations.append("要求所有人员必须穿安全背心")

    # 计算安全评分
    total_violations = len(safety_violations)
    total_people = (
        detections.get("Person", 0)
        + detections.get("NO-Hardhat", 0)
        + detections.get("NO-Mask", 0)
        + detections.get("NO-Safety Vest", 0)
    )

    if total_people == 0:
        safety_score = 100
    else:
        # 基础分数100，每个违规扣20分
        safety_score = max(0, 100 - (total_violations * 20))

    # 添加正面建议
    if "Hardhat" in detections:
        recommendations.append(f"检测到 {detections['Hardhat']} 人正确佩戴安全帽，继续保持")

    if "Mask" in detections:
        recommendations.append(f"检测到 {detections['Mask']} 人正确佩戴口罩，继续保持")

    if "Safety Vest" in detections:
        recommendations.append(f"检测到 {detections['Safety Vest']} 人正确穿安全背心，继续保持")

    if not recommendations:
        recommendations.append("请定期检查安全设备的使用情况")

    return {"safety_score": safety_score, "safety_violations": safety_violations, "recommendations": recommendations}


def process_image(image_data, conf_threshold=0.25, iou_threshold=0.45):
    """处理图像进行目标检测."""
    try:
        # 将base64图像数据转换为numpy数组
        if isinstance(image_data, str):
            # 移除data:image/jpeg;base64,前缀
            if "," in image_data:
                image_data = image_data.split(",")[1]
            image_bytes = base64.b64decode(image_data)
        else:
            image_bytes = image_data

        # 转换为numpy数组
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            print("图像解码失败")
            return None, "图像解码失败"

        # 检查模型是否已加载
        if model is None:
            print("模型未加载")
            return None, "模型未加载"

        # 进行推理，优化参数以提高小目标检测能力
        # 检测当前模型使用的设备
        device = next(model.parameters()).device if hasattr(model, "parameters") else "cpu"
        print(f"推理使用设备: {device}")

        results = model(
            image,
            conf=conf_threshold,  # 降低置信度阈值以检测更多目标
            iou=iou_threshold,  # IOU阈值
            agnostic_nms=True,  # 类别无关的NMS
            max_det=50,  # 最大检测数量
            verbose=False,  # 减少输出
            device=device,  # 指定设备
        )

        # 绘制检测结果
        result_image = draw_detections(image, results)

        # 确保result_image是PIL图像
        if result_image is None:
            print("绘制检测结果失败，使用原图像")
            if isinstance(image, np.ndarray):
                if len(image.shape) == 3 and image.shape[2] == 3:
                    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                    result_image = Image.fromarray(image_rgb)
                else:
                    result_image = Image.fromarray(image)
            else:
                result_image = image

        # 转换为base64
        try:
            buffered = io.BytesIO()
            result_image.save(buffered, format="JPEG", quality=85)
            buffered.seek(0)
            img_bytes = buffered.getvalue()
            img_str = base64.b64encode(img_bytes).decode("utf-8")
            print(f"图像转换为base64成功，长度: {len(img_str)}")
        except Exception as e:
            print(f"图像转换为base64失败: {e}")
            return None, f"图像转换失败: {e}"

        # 统计检测结果
        detection_stats = {}
        total_detections = 0
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    cls = int(box.cls[0].cpu().numpy())
                    if cls < len(class_names):
                        class_name = class_names[cls]
                        detection_stats[class_name] = detection_stats.get(class_name, 0) + 1
                        total_detections += 1

        print(f"检测完成，发现 {total_detections} 个目标，类别: {list(detection_stats.keys())}")
        return img_str, detection_stats

    except Exception as e:
        print(f"图像处理错误: {e}")
        return None, str(e)


def process_image_smart(image_data, conf_threshold=0.25, iou_threshold=0.45):
    """使用轻量化模型处理图像进行智能模式检测."""
    try:
        # 将base64图像数据转换为numpy数组
        if isinstance(image_data, str):
            # 移除data:image/jpeg;base64,前缀
            if "," in image_data:
                image_data = image_data.split(",")[1]
            image_bytes = base64.b64decode(image_data)
        else:
            image_bytes = image_data

        # 转换为numpy数组
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            print("图像解码失败")
            return None, "图像解码失败"

        # 检查智能模式模型是否已加载
        if smart_model is None:
            print("轻量化模型未加载")
            return None, "轻量化模型未加载"

        # 进行推理，使用轻量化模型进行快速检测
        # 检测当前模型使用的设备
        device = next(smart_model.parameters()).device if hasattr(smart_model, "parameters") else "cpu"
        print(f"智能模式推理使用设备: {device}")

        results = smart_model(
            image,
            conf=conf_threshold,  # 置信度阈值
            iou=iou_threshold,  # IOU阈值
            agnostic_nms=True,  # 类别无关的NMS
            max_det=30,  # 轻量化模式降低最大检测数量以提升速度
            verbose=False,  # 减少输出
            device=device,  # 指定设备
        )

        # 绘制检测结果
        result_image = draw_detections(image, results)

        # 确保result_image是PIL图像
        if result_image is None:
            print("绘制检测结果失败，使用原图像")
            if isinstance(image, np.ndarray):
                if len(image.shape) == 3 and image.shape[2] == 3:
                    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                    result_image = Image.fromarray(image_rgb)
                else:
                    result_image = Image.fromarray(image)
            else:
                result_image = image

        # 转换为base64
        try:
            buffered = io.BytesIO()
            result_image.save(buffered, format="JPEG", quality=80)  # 轻量化模式降低图片质量以提升速度
            buffered.seek(0)
            img_bytes = buffered.getvalue()
            img_str = base64.b64encode(img_bytes).decode("utf-8")
            print(f"智能模式图像转换为base64成功，长度: {len(img_str)}")
        except Exception as e:
            print(f"图像转换为base64失败: {e}")
            return None, f"图像转换失败: {e}"

        # 统计检测结果
        detection_stats = {}
        total_detections = 0
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    cls = int(box.cls[0].cpu().numpy())
                    if cls < len(class_names):
                        class_name = class_names[cls]
                        detection_stats[class_name] = detection_stats.get(class_name, 0) + 1
                        total_detections += 1

        print(f"智能模式检测完成，发现 {total_detections} 个目标，类别: {list(detection_stats.keys())}")
        return img_str, detection_stats

    except Exception as e:
        print(f"智能模式图像处理错误: {e}")
        return None, str(e)


def process_image_small_target(image_data, conf_threshold=0.15, iou_threshold=0.3):
    """使用小目标检测模型处理图像进行高质量模式检测."""
    try:
        # 将base64图像数据转换为numpy数组
        if isinstance(image_data, str):
            # 移除data:image/jpeg;base64,前缀
            if "," in image_data:
                image_data = image_data.split(",")[1]
            image_bytes = base64.b64decode(image_data)
        else:
            image_bytes = image_data

        # 转换为numpy数组
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            print("图像解码失败")
            return None, "图像解码失败"

        # 检查小目标检测模型是否已加载
        if small_target_model is None:
            print("小目标检测模型未加载")
            return None, "小目标检测模型未加载"

        # 进行推理，使用小目标检测模型进行高精度检测
        # 检测当前模型使用的设备
        device = next(small_target_model.parameters()).device if hasattr(small_target_model, "parameters") else "cpu"
        print(f"小目标检测模式推理使用设备: {device}")

        results = small_target_model(
            image,
            conf=conf_threshold,  # 更低的置信度阈值以检测小目标
            iou=iou_threshold,  # 更低的IOU阈值以防止小目标被过滤
            agnostic_nms=True,  # 类别无关的NMS
            max_det=100,  # 更高的最大检测数量以捕获更多小目标
            verbose=False,  # 减少输出
            device=device,  # 指定设备
        )

        # 绘制检测结果
        result_image = draw_detections(image, results)

        # 确保result_image是PIL图像
        if result_image is None:
            print("绘制检测结果失败，使用原图像")
            if isinstance(image, np.ndarray):
                if len(image.shape) == 3 and image.shape[2] == 3:
                    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
                    result_image = Image.fromarray(image_rgb)
                else:
                    result_image = Image.fromarray(image)
            else:
                result_image = image

        # 转换为base64
        try:
            buffered = io.BytesIO()
            result_image.save(buffered, format="JPEG", quality=95)  # 高质量模式使用更高图片质量
            buffered.seek(0)
            img_bytes = buffered.getvalue()
            img_str = base64.b64encode(img_bytes).decode("utf-8")
            print(f"小目标检测模式图像转换为base64成功，长度: {len(img_str)}")
        except Exception as e:
            print(f"图像转换为base64失败: {e}")
            return None, f"图像转换失败: {e}"

        # 统计检测结果
        detection_stats = {}
        total_detections = 0
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    cls = int(box.cls[0].cpu().numpy())
                    if cls < len(class_names):
                        class_name = class_names[cls]
                        detection_stats[class_name] = detection_stats.get(class_name, 0) + 1
                        total_detections += 1

        print(f"小目标检测模式检测完成，发现 {total_detections} 个目标，类别: {list(detection_stats.keys())}")
        return img_str, detection_stats

    except Exception as e:
        print(f"小目标检测模式图像处理错误: {e}")
        return None, str(e)


@app.route("/")
def index():
    """主页面."""
    return render_template("index.html")


@app.route("/start_camera", methods=["GET"])
def start_camera():
    """启动摄像头功能."""
    try:
        return jsonify(
            {"status": "success", "message": "Camera started successfully", "timestamp": datetime.now().isoformat()}
        )
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


# 测试路由
@app.route("/test/rtsp", methods=["GET"])
def test_rtsp():
    """测试RTSP功能."""
    try:
        import cv2

        print("✅ OpenCV导入成功")
        print(f"OpenCV版本: {cv2.__version__}")

        # 测试创建VideoCapture对象
        test_cap = cv2.VideoCapture()
        print("✅ VideoCapture对象创建成功")
        test_cap.release()

        return jsonify({"opencv_version": cv2.__version__, "opencv_working": True, "message": "RTSP功能测试通过"})
    except Exception as e:
        print(f"❌ RTSP功能测试失败: {e}")
        return jsonify({"opencv_working": False, "error": str(e)}), 500


@app.route("/detect_small_objects", methods=["POST"])
def detect_small_objects():
    """专门用于小目标检测的端点."""
    try:
        data = request.get_json()
        if not data or "image" not in data:
            return jsonify({"error": "没有接收到图像数据"}), 400

        image_data = data["image"]

        # 使用小目标检测模型进行检测
        result_image, detection_stats = process_image_small_target(image_data)

        if result_image is None:
            return jsonify({"error": detection_stats}), 400

        # 生成安全分析
        analysis = generate_safety_analysis(detection_stats)

        return jsonify(
            {
                "image": result_image,
                "detections": detection_stats,
                "analysis": analysis,
                "detection_mode": "small_target",
            }
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/smart_video_feed", methods=["POST"])
def smart_video_feed():
    """智能视频流检测 - 根据场景变化决定是否处理."""
    try:
        data = request.get_json()
        if not data or "image" not in data:
            return jsonify({"error": "没有接收到图像数据"}), 400

        image_data = data["image"]
        frame_count = data.get("frame_count", 0)

        # 智能采样：每2帧处理一次，或者检测到运动时处理
        should_process = frame_count % 2 == 0

        if should_process:
            result_image, detection_stats = process_image_smart(image_data)

            if result_image is None:
                return jsonify({"error": detection_stats}), 400

            # 生成安全分析
            analysis = generate_safety_analysis(detection_stats)

            return jsonify(
                {"image": result_image, "detections": detection_stats, "analysis": analysis, "processed": True}
            )
        else:
            # 跳过处理，返回空结果
            return jsonify({"processed": False, "message": "Frame skipped for performance"})

    except Exception as e:
        print(f"智能视频流检测错误: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/video_feed", methods=["POST"])
def video_feed():
    """处理实时视频流检测."""
    try:
        data = request.get_json()
        if not data or "image" not in data:
            return jsonify({"error": "没有接收到图像数据"}), 400

        image_data = data["image"]
        result_image, detection_stats = process_image(image_data)

        if result_image is None:
            return jsonify({"error": detection_stats}), 400

        # 生成安全分析
        analysis = generate_safety_analysis(detection_stats)

        return jsonify({"image": result_image, "detections": detection_stats, "analysis": analysis})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/upload", methods=["POST"])
def upload_image():
    """处理单张图片上传检测."""
    try:
        if "file" not in request.files:
            return jsonify({"error": "没有文件上传"}), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "没有选择文件"}), 400

        # 读取文件
        file_bytes = file.read()

        # 处理图像
        result_image, detection_stats = process_image(file_bytes)

        if result_image is None:
            return jsonify({"error": detection_stats}), 400

        # 生成安全分析
        analysis = generate_safety_analysis(detection_stats)

        # 保存结果图像
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"result_{timestamp}_{uuid.uuid4().hex[:8]}.jpg"
        result_path = os.path.join(app.static_folder, "uploads", filename)

        # 将base64结果保存为文件
        result_bytes = base64.b64decode(result_image)
        with open(result_path, "wb") as f:
            f.write(result_bytes)

        return jsonify(
            {"image": result_image, "detections": detection_stats, "analysis": analysis, "filename": filename}
        )

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/batch_upload", methods=["POST"])
def batch_upload():
    """处理批量图片上传检测."""
    try:
        if "files[]" not in request.files:
            return jsonify({"error": "没有文件上传"}), 400

        files = request.files.getlist("files[]")
        if not files or files[0].filename == "":
            return jsonify({"error": "没有选择文件"}), 400

        results = []

        for file in files:
            if file.filename:
                # 读取文件
                file_bytes = file.read()

                # 处理图像
                result_image, detection_stats = process_image(file_bytes)

                if result_image is not None:
                    # 生成安全分析
                    analysis = generate_safety_analysis(detection_stats)

                    # 保存结果图像
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    filename = f"batch_{timestamp}_{uuid.uuid4().hex[:8]}.jpg"
                    result_path = os.path.join(app.static_folder, "uploads", filename)

                    # 将base64结果保存为文件
                    result_bytes = base64.b64decode(result_image)
                    with open(result_path, "wb") as f:
                        f.write(result_bytes)

                    results.append(
                        {
                            "original_name": file.filename,
                            "result_image": result_image,
                            "detections": detection_stats,
                            "analysis": analysis,
                            "filename": filename,
                        }
                    )

        return jsonify({"results": results, "total_processed": len(results)})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/uploads/<filename>")
def uploaded_file(filename):
    """提供上传文件的访问."""
    return send_from_directory(os.path.join(app.static_folder, "uploads"), filename)


@app.route("/health")
def health_check():
    """健康检查端点."""
    return jsonify(
        {
            "status": "healthy",
            "model_loaded": model is not None,
            "smart_model_loaded": smart_model is not None,
            "timestamp": datetime.now().isoformat(),
        }
    )


@app.route("/test_upload", methods=["POST"])
def test_upload():
    """测试图片上传端点，用于调试."""
    try:
        if "file" not in request.files:
            return jsonify({"error": "没有文件上传"}), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({"error": "没有选择文件"}), 400

        # 读取文件
        file_bytes = file.read()

        # 处理图像
        result_image, detection_stats = process_image(file_bytes)

        if result_image is None:
            return jsonify({"error": f"图像处理失败: {detection_stats}"}), 400

        # 生成安全分析
        analysis = generate_safety_analysis(detection_stats)

        # 调试信息
        debug_info = {
            "image_length": len(result_image) if result_image else 0,
            "image_prefix": result_image[:50] if result_image else "",
            "detections_count": len(detection_stats) if detection_stats else 0,
            "detection_keys": list(detection_stats.keys()) if detection_stats else [],
        }

        return jsonify(
            {"image": result_image, "detections": detection_stats, "analysis": analysis, "debug": debug_info}
        )

    except Exception as e:
        print(f"测试上传错误: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    # 确保上传目录存在
    upload_dir = os.path.join(app.static_folder, "uploads")
    os.makedirs(upload_dir, exist_ok=True)

    # 加载模型
    print("正在加载通用模型...")
    model_loaded = load_model()
    print(f"通用模型加载结果: {model_loaded}")
    print(f"全局model变量状态: {model is not None}")

    print("正在加载轻量化模型...")
    smart_model_loaded = load_smart_model()
    print(f"轻量化模型加载结果: {smart_model_loaded}")
    print(f"全局smart_model变量状态: {smart_model is not None}")

    print("正在加载小目标检测模型...")
    small_target_model_loaded = load_small_target_model()
    print(f"小目标检测模型加载结果: {small_target_model_loaded}")
    print(f"全局small_target_model变量状态: {small_target_model is not None}")

    # =================================== RTSP相关功能 ===================================

    def rtsp_frame_reader():
        """RTSP帧读取线程函数（逐帧优化版本）."""
        global rtsp_cap, rtsp_connected, rtsp_current_frame, rtsp_frame_lock

        frame_count = 0
        error_count = 0
        max_errors = 10
        last_frame_time = time.time()
        frame_skip_threshold = 0.033  # 30fps最大间隔，避免积压

        print("🎥 开始RTSP逐帧读取线程")

        while rtsp_connected and rtsp_cap is not None:
            try:
                current_time = time.time()

                # 尝试读取视频帧
                ret, frame = rtsp_cap.read()

                if ret and frame is not None:
                    frame_count += 1
                    error_count = 0  # 重置错误计数

                    # 逐帧处理优化：检查帧间隔，避免处理过快的帧
                    time_since_last = current_time - last_frame_time

                    if time_since_last >= frame_skip_threshold:
                        # 只有间隔足够时才更新帧，避免无意义的高频更新
                        with rtsp_frame_lock:
                            rtsp_current_frame = frame.copy()
                        last_frame_time = current_time

                        # 每100帧打印一次状态
                        if frame_count % 100 == 0:
                            print(f"✅ 已读取 {frame_count} 帧 (逐帧优化)")
                    else:
                        # 跳过此帧，避免积压
                        continue

                else:
                    error_count += 1
                    print(f"⚠️ RTSP帧读取失败 (错误次数: {error_count}/{max_errors})")

                    if error_count >= max_errors:
                        print("❌ 连续读取失败次数过多，断开连接")
                        rtsp_connected = False
                        break

                    time.sleep(0.1)

            except Exception as e:
                error_count += 1
                print(f"💥 RTSP帧读取错误: {e} (错误次数: {error_count}/{max_errors})")

                if error_count >= max_errors:
                    print("❌ 错误次数过多，断开连接")
                    rtsp_connected = False
                    break

                time.sleep(0.1)  # 减少错误时的等待时间

        print("🔚 RTSP逐帧读取线程结束")

    @app.route("/rtsp/connect", methods=["POST"])
    def connect_rtsp():
        """连接RTSP视频流."""
        global rtsp_cap, rtsp_connected, rtsp_current_frame

        try:
            print("📡 收到RTSP连接请求")

            # 解析请求数据
            data = request.get_json()
            if not data:
                print("❌ 请求数据为空")
                return jsonify({"error": "请求数据格式错误"}), 400

            rtsp_url = data.get("url")

            if not rtsp_url:
                print("❌ RTSP地址为空")
                return jsonify({"error": "请提供RTSP地址"}), 400

            print(f"🔗 尝试连接RTSP流: {rtsp_url}")

            # 断开之前的连接
            if rtsp_cap is not None:
                print("🔄 断开之前的连接")
                rtsp_connected = False
                rtsp_cap.release()
                rtsp_cap = None
                time.sleep(0.5)  # 等待释放完成

            # 连接新的RTSP流
            print("🔌 创建新的VideoCapture对象")

            # 创建VideoCapture对象，使用FFmpeg后端以获得更好的RTSP支持
            rtsp_cap = cv2.VideoCapture(rtsp_url, cv2.CAP_FFMPEG)

            if not rtsp_cap.isOpened():
                print("❌ VideoCapture无法打开RTSP流")
                rtsp_cap = None
                return jsonify({"error": "VideoCapture无法打开RTSP流，请检查URL格式和网络连接"}), 400

            # 设置相关参数 - 专注于视频，禁用音频
            print("⚙️ 配置VideoCapture参数（仅视频流）")
            rtsp_cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # 最小缓冲，减少延迟
            rtsp_cap.set(cv2.CAP_PROP_FPS, 25)  # 设置合理的帧率

            # 尝试设置编码格式为MJPEG，通常更稳定
            rtsp_cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc("M", "J", "P", "G"))

            # 测试读取一帧
            print("📷 测试读取第一帧...")
            ret, frame = rtsp_cap.read()
            if not ret or frame is None:
                print("❌ 无法读取RTSP流数据")
                rtsp_cap.release()
                rtsp_cap = None
                return jsonify({"error": "无法从RTSP流读取数据，请检查地址和网络连接"}), 400

            print(f"✅ 成功读取帧，尺寸: {frame.shape}")

            # 设置全局状态
            rtsp_connected = True
            rtsp_current_frame = frame.copy()

            # 启动帧读取线程
            print("🔄 启动帧读取线程")
            thread = threading.Thread(target=rtsp_frame_reader, daemon=True)
            thread.start()

            print("🎉 RTSP连接成功")
            return jsonify({"success": True, "message": "连接成功", "frame_shape": frame.shape})

        except Exception as e:
            print(f"💥 RTSP连接错误: {e}")
            import traceback

            traceback.print_exc()

            # 清理资源
            if rtsp_cap is not None:
                rtsp_cap.release()
                rtsp_cap = None
            rtsp_connected = False
            rtsp_current_frame = None

            return jsonify({"error": f"连接失败: {str(e)}"}), 500

    @app.route("/rtsp/disconnect", methods=["POST"])
    def disconnect_rtsp():
        """断开RTSP连接."""
        global rtsp_cap, rtsp_connected, rtsp_current_frame

        try:
            rtsp_connected = False

            if rtsp_cap is not None:
                rtsp_cap.release()
                rtsp_cap = None

            rtsp_current_frame = None

            print("RTSP连接已断开")
            return jsonify({"success": True, "message": "连接已断开"})

        except Exception as e:
            print(f"RTSP断开错误: {e}")
            return jsonify({"error": f"断开失败: {str(e)}"}), 500

    @app.route("/rtsp/frame")
    def get_rtsp_frame():
        """获取当前RTSP帧."""
        global rtsp_current_frame, rtsp_frame_lock

        try:
            if rtsp_current_frame is None:
                # 返回一个占位图像
                placeholder = np.zeros((480, 640, 3), dtype=np.uint8)
                cv2.putText(placeholder, "No RTSP Stream", (200, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
                _, buffer = cv2.imencode(".jpg", placeholder)
                return buffer.tobytes(), 200, {"Content-Type": "image/jpeg"}

            with rtsp_frame_lock:
                frame_copy = rtsp_current_frame.copy()

            # 将帧编码为JPEG
            _, buffer = cv2.imencode(".jpg", frame_copy, [cv2.IMWRITE_JPEG_QUALITY, 80])

            return buffer.tobytes(), 200, {"Content-Type": "image/jpeg"}

        except Exception as e:
            print(f"获取RTSP帧错误: {e}")
            # 返回错误占位图像
            placeholder = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(placeholder, "Stream Error", (220, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            _, buffer = cv2.imencode(".jpg", placeholder)
            return buffer.tobytes(), 200, {"Content-Type": "image/jpeg"}

    @app.route("/rtsp/detect", methods=["POST"])
    def detect_rtsp():
        """对RTSP流当前帧进行逐帧检测（优化版）."""
        global rtsp_current_frame, rtsp_frame_lock

        try:
            print("📡 收到RTSP检测请求")

            if rtsp_current_frame is None:
                print("❌ 无RTSP流数据")
                return jsonify({"error": "无RTSP流数据"}), 400

            data = request.get_json()
            if not data:
                print("❌ 请求数据为空")
                return jsonify({"error": "请求数据格式错误"}), 400

            mode = data.get("mode", "normal")
            frame_id = data.get("frame_id", 0)  # 帧ID，用于跳帧逻辑

            print(f"🔍 检测模式: {mode}, 帧ID: {frame_id}")

            # 逐帧优化：快速复制当前帧，减少锁定时间
            with rtsp_frame_lock:
                if rtsp_current_frame is None:
                    return jsonify({"error": "帧数据不可用"}), 400
                frame_copy = rtsp_current_frame.copy()

            # 根据模式选择模型
            current_model = None
            confidence_threshold = 0.5  # 默认置信度

            if mode == "smart":
                current_model = smart_model
                confidence_threshold = 0.4  # 智能模式稍微降低阈值
            elif mode == "high_quality":
                current_model = small_target_model
                confidence_threshold = 0.6  # 高质量模式提高阈值
            else:
                current_model = model
                confidence_threshold = 0.5

            if current_model is None:
                return jsonify({"error": f"{mode}模式模型未加载"}), 500

            # 逐帧检测优化：使用更小的图像尺寸进行预处理（如果需要）
            detection_frame = frame_copy
            if mode == "smart":
                # 智能模式下可以适当缩小图像以提高速度
                height, width = frame_copy.shape[:2]
                if width > 1280:  # 只有在图像过大时才缩放
                    scale_factor = 1280 / width
                    new_width = int(width * scale_factor)
                    new_height = int(height * scale_factor)
                    detection_frame = cv2.resize(frame_copy, (new_width, new_height))

            # 执行检测
            results = current_model(detection_frame)

            # 处理检测结果（逐帧优化版本）
            detected_frame = frame_copy.copy()  # 始终在原始尺寸上绘制
            detections = {}

            # 计算缩放比例（如果进行了缩放）
            scale_x = (
                frame_copy.shape[1] / detection_frame.shape[1]
                if detection_frame.shape[1] != frame_copy.shape[1]
                else 1.0
            )
            scale_y = (
                frame_copy.shape[0] / detection_frame.shape[0]
                if detection_frame.shape[0] != frame_copy.shape[0]
                else 1.0
            )

            for result in results:
                boxes = result.boxes
                if boxes is not None:
                    for box in boxes:
                        # 获取检测信息
                        xyxy = box.xyxy[0].cpu().numpy()
                        conf = box.conf[0].cpu().numpy()
                        cls = int(box.cls[0].cpu().numpy())

                        if conf > confidence_threshold:  # 使用动态置信度阈值
                            # 获取类别名称和颜色
                            class_name = class_names[cls] if cls < len(class_names) else f"Class {cls}"
                            color_hex = class_colors.get(class_name, "#FFFFFF")
                            color_rgb = hex_to_rgb(color_hex)

                            # 统计检测数量
                            detections[class_name] = detections.get(class_name, 0) + 1

                            # 调整坐标（如果进行了缩放）
                            x1, y1, x2, y2 = xyxy
                            x1, x2 = int(x1 * scale_x), int(x2 * scale_x)
                            y1, y2 = int(y1 * scale_y), int(y2 * scale_y)

                            # 绘制边界框（逐帧优化：使用更简单的绘制）
                            cv2.rectangle(detected_frame, (x1, y1), (x2, y2), color_rgb, 2)

                            # 绘制标签（简化版本）
                            label = f"{class_name}: {conf:.2f}"
                            label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)[0]
                            cv2.rectangle(
                                detected_frame, (x1, y1 - label_size[1] - 8), (x1 + label_size[0], y1), color_rgb, -1
                            )
                            cv2.putText(
                                detected_frame, label, (x1, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1
                            )

            # 计算安全评分
            analysis = generate_safety_analysis(detections)

            # 将检测结果编码为base64（逐帧优化：使用更高的压缩比）
            encode_param = [cv2.IMWRITE_JPEG_QUALITY, 75]  # 稍微降低质量以提高速度
            _, buffer = cv2.imencode(".jpg", detected_frame, encode_param)
            img_base64 = base64.b64encode(buffer).decode("utf-8")

            return jsonify({"image": img_base64, "detections": detections, "analysis": analysis})

        except Exception as e:
            print(f"RTSP检测错误: {e}")
            import traceback

            traceback.print_exc()
            return jsonify({"error": f"检测失败: {str(e)}"}), 500

    if model_loaded and smart_model_loaded and small_target_model_loaded:
        print("三个模型加载成功，启动Flask应用...")
        app.run(debug=True, host="0.0.0.0", port=5000)
    else:
        print("模型加载失败，应用无法启动")
        print(f"通用模型: {model_loaded}, 轻量化模型: {smart_model_loaded}, 小目标模型: {small_target_model_loaded}")
