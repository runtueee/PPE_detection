#在代码中导入YOLO模块
from ultralytics import YOLO

# 导入训练好的模型best.pt
model = YOLO(r'D:\innovaton_competetion\ultralytics-main\runs\train\safeHat_exp_batch4\weights\best.pt')

# 随意找一些测试数据
# 图片数据和视频数据都可以，直接将数据传入接口就可以了
# 设置 conf=0.5 时，这意味着只有模型以至少 50% 的置信度识别出的对象才会被保留并输出。
model.predict(r'D:\innovaton_competetion\ultralytics-main\css-data-split\test\images', save=True, conf=0.5)
# model.predict(r"D:\innovaton_competetion\ultralytics-main\css-data-split\test\*.mp4", save=True, conf=0.7)