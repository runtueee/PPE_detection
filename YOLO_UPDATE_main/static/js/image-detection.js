/**
 * 图片检测模块
 * 专门处理图片上传、检测和结果显示功能
 */

class ImageDetectionManager {
  constructor() {
    this.initializeElements();
    this.bindEvents();
    this.uploadHistory = [];
    this.maxHistorySize = 10;
    this.allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
  }

  /**
   * 初始化DOM元素引用
   */
  initializeElements() {
    // 上传相关元素
    this.fileInput = document.getElementById("file-input");
    this.uploadArea = document.getElementById("upload-area");
    this.uploadProgress = document.getElementById("upload-progress");
    this.progressFill = document.getElementById("progress-fill");
    this.progressText = document.getElementById("progress-text");
    this.processingBadge = document.getElementById("processing-badge");

    // 图片显示元素
    this.originalImage = document.getElementById("original-image");
    this.originalPlaceholder = document.getElementById("original-placeholder");
    this.resultImage = document.getElementById("upload-result-image");
    this.resultPlaceholder = document.getElementById("upload-placeholder");

    // 结果显示元素
    this.detectionStats = document.getElementById("upload-detection-stats");
    this.safetyAnalysis = document.getElementById("upload-safety-analysis");

    // 操作按钮
    this.downloadBtn = document.getElementById("download-result-btn");
    this.fullscreenBtn = document.getElementById("fullscreen-btn");
    this.clearHistoryBtn = document.getElementById("clear-history-btn");

    // 历史记录
    this.historySection = document.getElementById("upload-history-section");
    this.historyList = document.getElementById("upload-history-list");
  }

  /**
   * 绑定事件监听器
   */
  bindEvents() {
    // 文件选择事件
    this.fileInput.addEventListener("change", (e) => this.handleFileSelect(e));

    // 拖拽事件
    this.setupDragAndDrop();

    // 按钮事件
    if (this.downloadBtn) {
      this.downloadBtn.addEventListener("click", () => this.downloadResult());
    }
    if (this.fullscreenBtn) {
      this.fullscreenBtn.addEventListener("click", () => this.openFullscreen());
    }
    if (this.clearHistoryBtn) {
      this.clearHistoryBtn.addEventListener("click", () => this.clearHistory());
    }

    // 图片加载事件
    if (this.resultImage) {
      this.resultImage.addEventListener("load", () => this.onImageLoad());
      this.resultImage.addEventListener("error", () => this.onImageError());
    }
  }

  /**
   * 设置拖拽上传功能
   */
  setupDragAndDrop() {
    if (!this.uploadArea) return;

    // 阻止默认行为
    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      this.uploadArea.addEventListener(eventName, this.preventDefaults, false);
      document.body.addEventListener(eventName, this.preventDefaults, false);
    });

    // 高亮显示
    ["dragenter", "dragover"].forEach((eventName) => {
      this.uploadArea.addEventListener(
        eventName,
        () => this.highlight(),
        false,
      );
    });

    ["dragleave", "drop"].forEach((eventName) => {
      this.uploadArea.addEventListener(
        eventName,
        () => this.unhighlight(),
        false,
      );
    });

    // 处理文件拖拽
    this.uploadArea.addEventListener("drop", (e) => this.handleDrop(e), false);
  }

  /**
   * 阻止默认拖拽行为
   */
  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  /**
   * 高亮上传区域
   */
  highlight() {
    this.uploadArea.classList.add("dragover");
  }

  /**
   * 取消高亮
   */
  unhighlight() {
    this.uploadArea.classList.remove("dragover");
  }

  /**
   * 处理文件拖拽
   */
  handleDrop(e) {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  /**
   * 处理文件选择
   */
  handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
      this.handleFile(file);
    }
  }

  /**
   * 验证文件
   */
  validateFile(file) {
    const errors = [];

    // 检查文件类型
    if (!this.allowedTypes.includes(file.type)) {
      errors.push("只支持 JPG、PNG、JPEG 格式的图片文件");
    }

    // 检查文件大小
    if (file.size > this.maxFileSize) {
      errors.push(`文件大小不能超过 ${this.maxFileSize / 1024 / 1024}MB`);
    }

    return errors;
  }

  /**
   * 处理文件
   */
  async handleFile(file) {
    console.log("=== 开始处理文件 ===");
    console.log("文件名:", file.name);
    console.log("文件大小:", file.size);
    console.log("文件类型:", file.type);

    // 验证文件
    const validationErrors = this.validateFile(file);
    if (validationErrors.length > 0) {
      this.showError(validationErrors.join("；"));
      return;
    }

    try {
      // 显示原始图片
      await this.displayOriginalImage(file);

      // 开始上传和检测
      await this.uploadAndDetect(file);
    } catch (error) {
      console.error("文件处理错误:", error);
      this.showError("文件处理失败: " + error.message);
    }
  }

  /**
   * 显示原始图片
   */
  displayOriginalImage(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (this.originalImage && this.originalPlaceholder) {
          this.originalImage.src = e.target.result;
          this.originalImage.style.display = "block";
          this.originalPlaceholder.style.display = "none";
        }
        resolve();
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * 上传并检测图片
   */
  async uploadAndDetect(file) {
    this.showProgress(true);
    this.updateProgress(0, "准备上传...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      this.updateProgress(20, "上传中...");

      const response = await fetch("/upload", {
        method: "POST",
        body: formData,
      });

      this.updateProgress(60, "分析中...");

      if (!response.ok) {
        throw new Error(`上传失败 (${response.status})`);
      }

      const result = await response.json();

      this.updateProgress(80, "处理结果...");

      if (result.error) {
        throw new Error(result.error);
      }

      console.log("=== 检测结果 ===");
      console.log("检测结果:", result);

      // 显示结果
      this.displayDetectionResult(result, file);

      // 添加到历史记录
      this.addToHistory(file, result);

      this.updateProgress(100, "完成!");

      setTimeout(() => {
        this.showProgress(false);
        this.showNotification("图片检测完成", "success");
      }, 500);
    } catch (error) {
      console.error("上传检测错误:", error);
      this.showProgress(false);
      this.showError("检测失败: " + error.message);
    }
  }

  /**
   * 显示检测结果
   */
  displayDetectionResult(result, originalFile) {
    console.log("=== 显示检测结果 ===");

    // 显示检测图片
    this.displayResultImage(result.image);

    // 显示统计信息
    this.displayDetectionStats(result.detections);

    // 显示安全分析
    this.displaySafetyAnalysis(result.analysis);

    // 显示操作按钮
    this.showActionButtons();

    // 保存结果数据以供下载
    this.currentResult = {
      image: result.image,
      detections: result.detections,
      analysis: result.analysis,
      originalFileName: originalFile.name,
    };
  }

  /**
   * 显示结果图片
   */
  displayResultImage(imageData) {
    if (!imageData || !this.resultImage || !this.resultPlaceholder) {
      console.error("缺少必要的图片数据或元素");
      return;
    }

    // 检查图像数据格式
    let imageSrc;
    if (imageData.startsWith("data:")) {
      imageSrc = imageData;
    } else {
      imageSrc = `data:image/jpeg;base64,${imageData}`;
    }

    console.log("设置检测结果图片...");
    this.resultImage.src = imageSrc;
    this.resultImage.style.display = "block";
    this.resultPlaceholder.style.display = "none";
  }

  /**
   * 显示检测统计
   */
  displayDetectionStats(detections) {
    if (!this.detectionStats) return;

    // 清空占位符
    const placeholder = this.detectionStats.querySelector(".stats-placeholder");
    if (placeholder) {
      placeholder.remove();
    }

    if (!detections || Object.keys(detections).length === 0) {
      this.detectionStats.innerHTML = `
                <div class="no-detections">
                    <i class="fas fa-info-circle"></i>
                    <p>未检测到任何目标</p>
                </div>
            `;
      return;
    }

    let html = '<div class="detection-stats-content">';
    html += '<h5><i class="fas fa-chart-bar"></i> 检测统计</h5>';
    html += '<div class="stats-list">';

    Object.entries(detections).forEach(([className, count]) => {
      const displayName = this.getClassDisplayName(className);
      const iconClass = this.getClassIcon(className);

      html += `
                <div class="stat-item-detailed">
                    <div class="stat-icon">
                        <i class="${iconClass}"></i>
                    </div>
                    <div class="stat-info">
                        <span class="stat-name">${displayName}</span>
                        <span class="stat-count">${count}</span>
                    </div>
                </div>
            `;
    });

    html += "</div></div>";
    this.detectionStats.innerHTML = html;
  }

  /**
   * 显示安全分析
   */
  displaySafetyAnalysis(analysis) {
    if (!this.safetyAnalysis) return;

    // 清空占位符
    const placeholder = this.safetyAnalysis.querySelector(
      ".safety-placeholder",
    );
    if (placeholder) {
      placeholder.remove();
    }

    if (!analysis) {
      this.safetyAnalysis.innerHTML = `
                <div class="no-analysis">
                    <i class="fas fa-shield-alt"></i>
                    <p>无安全分析数据</p>
                </div>
            `;
      return;
    }

    const scoreClass = this.getSafetyScoreClass(analysis.safety_score);
    const scoreIcon = this.getSafetyScoreIcon(analysis.safety_score);

    let html = '<div class="safety-analysis-content">';

    // 安全评分
    html += `
            <div class="safety-score-section">
                <h5><i class="fas fa-shield-alt"></i> 安全评分</h5>
                <div class="score-display ${scoreClass}">
                    <div class="score-circle">
                        <i class="${scoreIcon}"></i>
                        <span class="score-number">${analysis.safety_score}</span>
                    </div>
                    <span class="score-status">${this.getSafetyScoreStatus(analysis.safety_score)}</span>
                </div>
            </div>
        `;

    // 安全违规
    if (analysis.safety_violations && analysis.safety_violations.length > 0) {
      html += '<div class="violations-section">';
      html += '<h6><i class="fas fa-exclamation-triangle"></i> 安全违规</h6>';
      html += '<div class="violations-list">';
      analysis.safety_violations.forEach((violation) => {
        html += `
                    <div class="violation-item">
                        <i class="fas fa-times-circle"></i>
                        <span>${violation}</span>
                    </div>
                `;
      });
      html += "</div></div>";
    } else {
      html += `
                <div class="no-violations">
                    <i class="fas fa-check-circle"></i>
                    <span>未发现安全违规</span>
                </div>
            `;
    }

    // 安全建议
    if (analysis.recommendations && analysis.recommendations.length > 0) {
      html += '<div class="recommendations-section">';
      html += '<h6><i class="fas fa-lightbulb"></i> 安全建议</h6>';
      html += '<div class="recommendations-list">';
      analysis.recommendations.forEach((recommendation) => {
        html += `
                    <div class="recommendation-item">
                        <i class="fas fa-check"></i>
                        <span>${recommendation}</span>
                    </div>
                `;
      });
      html += "</div></div>";
    }

    html += "</div>";
    this.safetyAnalysis.innerHTML = html;
  }

  /**
   * 显示操作按钮
   */
  showActionButtons() {
    if (this.downloadBtn) {
      this.downloadBtn.style.display = "inline-flex";
    }
    if (this.fullscreenBtn) {
      this.fullscreenBtn.style.display = "inline-flex";
    }
  }

  /**
   * 图片加载成功
   */
  onImageLoad() {
    console.log("✓ 检测结果图片加载成功");
    if (this.processingBadge) {
      this.processingBadge.style.display = "none";
    }
  }

  /**
   * 图片加载失败
   */
  onImageError() {
    console.error("✗ 检测结果图片加载失败");
    if (this.resultPlaceholder) {
      this.resultPlaceholder.style.display = "flex";
      this.resultPlaceholder.innerHTML = `
                <i class="fas fa-exclamation-triangle"></i>
                <p>图片显示失败</p>
            `;
    }
    if (this.resultImage) {
      this.resultImage.style.display = "none";
    }
  }

  /**
   * 添加到历史记录
   */
  addToHistory(file, result) {
    const historyItem = {
      id: Date.now(),
      fileName: file.name,
      timestamp: new Date(),
      detections: result.detections,
      analysis: result.analysis,
      resultImage: result.image,
    };

    this.uploadHistory.unshift(historyItem);

    // 限制历史记录数量
    if (this.uploadHistory.length > this.maxHistorySize) {
      this.uploadHistory.pop();
    }

    this.updateHistoryDisplay();
  }

  /**
   * 更新历史记录显示
   */
  updateHistoryDisplay() {
    if (!this.historyList || !this.historySection) return;

    if (this.uploadHistory.length === 0) {
      this.historySection.style.display = "none";
      return;
    }

    this.historySection.style.display = "block";
    this.historyList.innerHTML = "";

    this.uploadHistory.forEach((item) => {
      const historyElement = this.createHistoryItem(item);
      this.historyList.appendChild(historyElement);
    });
  }

  /**
   * 创建历史记录项
   */
  createHistoryItem(item) {
    const element = document.createElement("div");
    element.className = "history-item";
    element.onclick = () => this.loadHistoryItem(item);

    const imageSrc = item.resultImage.startsWith("data:")
      ? item.resultImage
      : `data:image/jpeg;base64,${item.resultImage}`;

    const timeStr = item.timestamp.toLocaleTimeString();
    const totalDetections = Object.values(item.detections || {}).reduce(
      (sum, count) => sum + count,
      0,
    );

    element.innerHTML = `
            <img src="${imageSrc}" alt="${item.fileName}">
            <div class="item-name">${item.fileName}</div>
            <div class="item-time">${timeStr}</div>
            <div class="item-stats">${totalDetections} 个目标</div>
        `;

    return element;
  }

  /**
   * 加载历史记录项
   */
  loadHistoryItem(item) {
    this.displayDetectionResult(
      {
        image: item.resultImage,
        detections: item.detections,
        analysis: item.analysis,
      },
      { name: item.fileName },
    );

    this.showNotification("已加载历史检测记录", "info");
  }

  /**
   * 清空历史记录
   */
  clearHistory() {
    this.uploadHistory = [];
    this.updateHistoryDisplay();
    this.showNotification("历史记录已清空", "info");
  }

  /**
   * 下载结果
   */
  downloadResult() {
    if (!this.currentResult) {
      this.showError("没有可下载的结果");
      return;
    }

    try {
      // 创建下载链接
      const link = document.createElement("a");
      link.href = this.currentResult.image.startsWith("data:")
        ? this.currentResult.image
        : `data:image/jpeg;base64,${this.currentResult.image}`;

      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:-]/g, "");
      link.download = `detection_result_${timestamp}.jpg`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.showNotification("结果图片已下载", "success");
    } catch (error) {
      console.error("下载失败:", error);
      this.showError("下载失败");
    }
  }

  /**
   * 全屏查看
   */
  openFullscreen() {
    if (!this.resultImage || !this.resultImage.src) {
      this.showError("没有可查看的图片");
      return;
    }

    // 创建全屏覆盖层
    const overlay = document.createElement("div");
    overlay.className = "fullscreen-overlay";
    overlay.innerHTML = `
            <div class="fullscreen-content">
                <img src="${this.resultImage.src}" alt="检测结果全屏查看">
                <button class="fullscreen-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

    overlay.querySelector(".fullscreen-close").onclick = () => {
      document.body.removeChild(overlay);
    };

    overlay.onclick = (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    };

    document.body.appendChild(overlay);
  }

  /**
   * 显示/隐藏进度条
   */
  showProgress(show) {
    if (this.uploadProgress) {
      this.uploadProgress.style.display = show ? "flex" : "none";
    }
    if (this.processingBadge) {
      this.processingBadge.style.display = show ? "flex" : "none";
    }
  }

  /**
   * 更新进度条
   */
  updateProgress(percent, text) {
    if (this.progressFill) {
      this.progressFill.style.width = `${percent}%`;
    }
    if (this.progressText) {
      this.progressText.textContent = text;
    }
  }

  /**
   * 显示错误信息
   */
  showError(message) {
    if (window.showNotification) {
      window.showNotification(message, "error");
    } else {
      alert(message);
    }
  }

  /**
   * 显示通知
   */
  showNotification(message, type = "info") {
    if (window.showNotification) {
      window.showNotification(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  /**
   * 获取类别显示名称
   */
  getClassDisplayName(className) {
    const classNames = {
      Person: "人员",
      Hardhat: "安全帽",
      "NO-Hardhat": "无安全帽",
      Mask: "口罩",
      "NO-Mask": "无口罩",
      "Safety Vest": "安全背心",
      "NO-Safety Vest": "无安全背心",
      "Safety Cone": "安全锥",
      machinery: "机械",
      vehicle: "车辆",
    };
    return classNames[className] || className;
  }

  /**
   * 获取类别图标
   */
  getClassIcon(className) {
    const icons = {
      Person: "fas fa-user",
      Hardhat: "fas fa-hard-hat",
      "NO-Hardhat": "fas fa-user-times",
      Mask: "fas fa-head-side-mask",
      "NO-Mask": "fas fa-user-times",
      "Safety Vest": "fas fa-vest",
      "NO-Safety Vest": "fas fa-user-times",
      "Safety Cone": "fas fa-traffic-cone",
      machinery: "fas fa-cogs",
      vehicle: "fas fa-truck",
    };
    return icons[className] || "fas fa-eye";
  }

  /**
   * 获取安全评分样式类
   */
  getSafetyScoreClass(score) {
    if (score >= 80) return "good";
    if (score >= 60) return "warning";
    return "danger";
  }

  /**
   * 获取安全评分图标
   */
  getSafetyScoreIcon(score) {
    if (score >= 80) return "fas fa-check-circle";
    if (score >= 60) return "fas fa-exclamation-triangle";
    return "fas fa-times-circle";
  }

  /**
   * 获取安全评分状态文本
   */
  getSafetyScoreStatus(score) {
    if (score >= 80) return "安全状况良好";
    if (score >= 60) return "需要关注安全状况";
    return "安全状况较差，需要立即处理";
  }

  /**
   * 重置界面
   */
  reset() {
    // 重置图片显示
    if (this.originalImage) {
      this.originalImage.style.display = "none";
      this.originalImage.src = "";
    }
    if (this.originalPlaceholder) {
      this.originalPlaceholder.style.display = "flex";
    }
    if (this.resultImage) {
      this.resultImage.style.display = "none";
      this.resultImage.src = "";
    }
    if (this.resultPlaceholder) {
      this.resultPlaceholder.style.display = "flex";
      this.resultPlaceholder.innerHTML = `
                <i class="fas fa-search"></i>
                <p>检测结果将在这里显示</p>
            `;
    }

    // 重置统计和分析
    if (this.detectionStats) {
      this.detectionStats.innerHTML = `
                <div class="stats-placeholder">
                    <i class="fas fa-chart-line"></i>
                    <p>上传图片后显示检测统计</p>
                </div>
            `;
    }
    if (this.safetyAnalysis) {
      this.safetyAnalysis.innerHTML = `
                <div class="safety-placeholder">
                    <i class="fas fa-shield-alt"></i>
                    <p>上传图片后显示安全评估</p>
                </div>
            `;
    }

    // 隐藏操作按钮
    if (this.downloadBtn) {
      this.downloadBtn.style.display = "none";
    }
    if (this.fullscreenBtn) {
      this.fullscreenBtn.style.display = "none";
    }

    // 重置文件输入
    if (this.fileInput) {
      this.fileInput.value = "";
    }

    // 清除当前结果
    this.currentResult = null;
  }
}

// 导出给全局使用
window.ImageDetectionManager = ImageDetectionManager;
