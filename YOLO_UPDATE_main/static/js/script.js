// 全局变量
let stream = null;
let isDetecting = false;
let detectionInterval = null;
let currentTab = "realtime";
let frameCount = 0;
let lastDetectionTime = 0;
let lastErrorTime = 0; // 上次错误时间，用于限制错误通知频率
let performanceMode = "normal"; // 'normal', 'smart', 'high_quality'
let detectionHistory = []; // 检测历史记录
let safetyScore = 100; // 安全评分

// 工地现场监控全局变量
let siteStream = null;
let isSiteDetecting = false;
let siteDetectionInterval = null;
let sitePerformanceMode = "normal";
let siteDetectionHistory = [];
let siteSafetyScore = 100;
let siteFrameCount = 0;
let siteLastDetectionTime = 0;
let rtspConnected = false;
let rtspFrameInterval = null; // RTSP帧刷新定时器

// DOM元素
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const startBtn = document.getElementById("start-btn");
const stopBtn = document.getElementById("stop-btn");
const resultImage = document.getElementById("result-image");
const resultPlaceholder = document.getElementById("result-placeholder");
const detectionStats = document.getElementById("detection-stats");
const cameraStatus = document.getElementById("camera-status");
const fileInput = document.getElementById("file-input");
const uploadResultImage = document.getElementById("upload-result-image");
const uploadPlaceholder = document.getElementById("upload-placeholder");
const uploadDetectionStats = document.getElementById("upload-detection-stats");
const batchFileInput = document.getElementById("batch-file-input");
const batchGallery = document.getElementById("batch-gallery");
const batchInfo = document.getElementById("batch-info");
const loading = document.getElementById("loading");
const notification = document.getElementById("notification");
const statsGrid = document.getElementById("stats-grid");
const safetyScoreElement = document.getElementById("safety-score");
const safetyAnalysisElement = document.getElementById("safety-analysis");

// 工地现场监控DOM元素
const siteVideo = document.getElementById("site-video");
const siteCanvas = document.getElementById("site-canvas");
const siteStartBtn = document.getElementById("site-start-btn");
const siteStopBtn = document.getElementById("site-stop-btn");
const siteResultImage = document.getElementById("site-result-image");
const siteResultPlaceholder = document.getElementById(
  "site-result-placeholder",
);
const siteDetectionStats = document.getElementById("site-detection-stats");
const siteCameraStatus = document.getElementById("site-camera-status");
const siteConnectionStatus = document.getElementById("site-connection-status");
const siteStatsGrid = document.getElementById("site-stats-grid");
const siteSafetyScoreElement = document.getElementById("site-safety-score");
const siteSafetyAnalysisElement = document.getElementById(
  "site-safety-analysis",
);
const rtspUrlInput = document.getElementById("rtsp-url");
const rtspUsernameInput = document.getElementById("rtsp-username");
const rtspPasswordInput = document.getElementById("rtsp-password");
const connectRtspBtn = document.getElementById("connect-rtsp-btn");
const disconnectRtspBtn = document.getElementById("disconnect-rtsp-btn");

// 初始化应用
document.addEventListener("DOMContentLoaded", function () {
  initializeTabs();
  initializeCamera();
  initializeFileUploads();
  initializeDragAndDrop();
  initializePerformanceMode();
  initializeSiteMonitoring(); // 初始化工地现场监控

  // 初始化图片检测管理器
  if (typeof ImageDetectionManager !== "undefined") {
    window.imageDetectionManager = new ImageDetectionManager();
  }

  showNotification("系统已就绪，请选择检测模式", "success");
});

// 标签页切换
function initializeTabs() {
  const tabBtns = document.querySelectorAll(".tab-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabName = btn.dataset.tab;
      switchTab(tabName);
    });
  });
}

function switchTab(tabName) {
  // 更新按钮状态
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.remove("active");
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add("active");

  // 更新内容显示
  document.querySelectorAll(".tab-content").forEach((content) => {
    content.classList.remove("active");
  });
  document.getElementById(`${tabName}-tab`).classList.add("active");

  // 停止实时检测（如果切换到其他标签页）
  if (currentTab === "realtime" && tabName !== "realtime" && isDetecting) {
    stopDetection();
  }

  // 停止工地现场监控检测（如果切换到其他标签页）
  if (
    currentTab === "site-monitoring" &&
    tabName !== "site-monitoring" &&
    isSiteDetecting
  ) {
    stopSiteDetection();
  }

  currentTab = tabName;
}

// 摄像头初始化
async function initializeCamera() {
  try {
    // 检查浏览器支持
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("浏览器不支持摄像头访问");
    }

    // 请求摄像头权限
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        // 移除 facingMode 设置，使其在桌面浏览器中正常工作
      },
    });

    // 设置视频流
    video.srcObject = stream;
    video.play();

    // 更新状态
    cameraStatus.innerHTML =
      '<i class="fas fa-check-circle"></i><span>摄像头已就绪</span>';
    cameraStatus.style.color = "#10b981";

    // 设置按钮状态
    startBtn.disabled = false;

    // 视频加载完成后隐藏覆盖层
    video.addEventListener("loadeddata", () => {
      document.querySelector(".video-overlay").style.display = "none";
    });
  } catch (error) {
    console.error("摄像头初始化失败:", error);
    cameraStatus.innerHTML =
      '<i class="fas fa-exclamation-triangle"></i><span>摄像头访问失败</span>';
    cameraStatus.style.color = "#ef4444";
    showNotification("摄像头访问失败: " + error.message, "error");
  }
}

// 开始实时检测
function startDetection() {
  if (!stream) {
    showNotification("摄像头未就绪", "error");
    return;
  }

  isDetecting = true;
  startBtn.disabled = true;
  stopBtn.disabled = false;

  // 设置canvas尺寸
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  // 开始检测循环 - 提高频率减少延迟
  detectionInterval = setInterval(processFrame, 50); // 20 FPS for better responsiveness
  showNotification("实时检测已开始", "success");
}

// 停止实时检测
function stopDetection() {
  isDetecting = false;
  startBtn.disabled = false;
  stopBtn.disabled = true;

  if (detectionInterval) {
    clearInterval(detectionInterval);
    detectionInterval = null;
  }

  // 清除结果
  resultImage.style.display = "none";
  resultPlaceholder.style.display = "flex";
  detectionStats.innerHTML = '<div class="stat-item">等待检测...</div>';

  // 清除左侧统计网格和安全评分
  if (statsGrid) {
    statsGrid.innerHTML = '<div class="stat-item">暂无检测数据</div>';
  }
  if (safetyScoreElement) {
    const scoreNumber = safetyScoreElement.querySelector(".score-number");
    const scoreStatus = safetyScoreElement.querySelector(".score-status");
    const scoreDisplay = safetyScoreElement.querySelector(".score-display");
    if (scoreNumber) scoreNumber.textContent = "--";
    if (scoreStatus) scoreStatus.textContent = "等待检测...";
    if (scoreDisplay) {
      scoreDisplay.className = "score-display";
    }
  }
  if (safetyAnalysisElement) {
    safetyAnalysisElement.innerHTML = "";
  }

  showNotification("实时检测已停止", "warning");
}

// 处理视频帧
async function processFrame() {
  if (!isDetecting) return;

  frameCount++;
  const currentTime = Date.now();

  try {
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // 将canvas转换为base64
    const imageData = canvas.toDataURL("image/jpeg", 0.8);

    let endpoint = "/video_feed";
    let requestData = { image: imageData };

    // 根据性能模式选择不同的处理策略
    let shouldProcess = true;

    switch (performanceMode) {
      case "smart":
        // 智能模式：每2帧处理一次，或者距离上次检测超过300ms
        if (frameCount % 2 === 0 || currentTime - lastDetectionTime > 300) {
          endpoint = "/smart_video_feed";
          requestData = {
            image: imageData,
            frame_count: frameCount,
          };
          console.log(
            "🧠 智能模式：处理帧",
            frameCount,
            "时间间隔:",
            currentTime - lastDetectionTime,
          );
        } else {
          shouldProcess = false; // 跳过这一帧
          console.log("🧠 智能模式：跳过帧", frameCount);
        }
        break;
      case "high_quality":
        // 高质量模式：使用小目标检测
        endpoint = "/detect_small_objects";
        console.log("🎯 小目标模型：处理帧", frameCount);
        break;
      default:
        // 普通模式：每帧都处理
        endpoint = "/video_feed";
        console.log("🚀 通用模型：处理帧", frameCount);
        break;
    }

    // 如果不需要处理，直接返回
    if (!shouldProcess) {
      return;
    }

    // 发送到服务器进行检测
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      throw new Error("检测请求失败");
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error);
    }

    // 处理智能模式的跳帧情况
    if (performanceMode === "smart" && result.processed === false) {
      console.log("🧠 智能模式：跳过当前帧处理");
      return; // 跳过显示更新，直接进入下一帧
    }

    // 更新最后检测时间
    lastDetectionTime = currentTime;

    // 立即显示检测结果，减少延迟
    if (result.image) {
      resultImage.src = `data:image/jpeg;base64,${result.image}`;
      resultImage.style.display = "block";
      resultPlaceholder.style.display = "none";
    }

    // 更新检测统计信息
    if (result.detections) {
      // 更新右侧简单检测统计
      updateRealtimeStats(result.detections, detectionStats);
      // 更新左侧统计网格
      updateStatsGrid(result.detections);
      // 更新安全评分
      updateSafetyScore(result.detections);
    }
  } catch (error) {
    console.error(`❌ ${getModeName(performanceMode)}帧处理错误:`, error);
    console.error("错误详情:", {
      mode: performanceMode,
      endpoint: endpoint,
      frameCount: frameCount,
      error: error.message,
    });

    // 显示错误通知，但限制频率
    if (Date.now() - lastErrorTime > 5000) {
      // 5秒内只显示一次错误
      let errorMessage = `${getModeName(performanceMode)}检测错误`;
      if (error.message) {
        errorMessage += ": " + error.message;
      }
      showNotification(errorMessage, "error");
      lastErrorTime = Date.now();
    }
  }
}

// 文件上传初始化
function initializeFileUploads() {
  // 单张图片上传
  fileInput.addEventListener("change", handleSingleImageUpload);

  // 批量图片上传
  batchFileInput.addEventListener("change", handleBatchImageUpload);

  // 按钮事件
  startBtn.addEventListener("click", startDetection);
  stopBtn.addEventListener("click", stopDetection);
}

// 处理单张图片上传 - 使用新的图片检测管理器
async function handleSingleImageUpload(event) {
  if (window.imageDetectionManager) {
    // 使用新的图片检测管理器处理
    window.imageDetectionManager.handleFileSelect(event);
  } else {
    // 降级到原始处理方式
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showNotification("请选择图片文件", "error");
      return;
    }

    showLoading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("上传失败");
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      // 显示检测结果
      displayDetectionResult(
        result.image,
        result.detections,
        result.analysis,
        uploadResultImage,
        uploadPlaceholder,
        uploadDetectionStats,
      );

      // 更新左侧统计网格和安全评分
      if (result.detections) {
        updateStatsGrid(result.detections);
        updateSafetyScore(result.detections);
      }

      showNotification("图片检测完成", "success");
    } catch (error) {
      console.error("图片上传错误:", error);
      showNotification("图片检测失败: " + error.message, "error");
    } finally {
      showLoading(false);
    }
  }
}

// 批量检测功能现在由 BatchDetectionManager 类处理
// 这里保留兼容性函数，实际功能已迁移到 batch-detection.js

// 处理批量图片上传 - 兼容性函数
async function handleBatchImageUpload(event) {
  // 如果新的批量检测管理器存在，使用新的处理方式
  if (window.batchDetectionManager) {
    return window.batchDetectionManager.handleFileSelect(event);
  }

  // 降级处理：使用原有逻辑
  console.warn("批量检测管理器未加载，使用降级处理");
  const files = Array.from(event.target.files);
  if (files.length === 0) return;

  // 过滤图片文件
  const imageFiles = files.filter((file) => file.type.startsWith("image/"));
  if (imageFiles.length === 0) {
    showNotification("请选择图片文件", "error");
    return;
  }

  showNotification(
    `选择了 ${imageFiles.length} 个文件，请使用新的批量检测界面`,
    "info",
  );
}

// 显示批量检测结果 - 兼容性函数
function displayBatchResults(results, totalProcessed) {
  console.warn("使用旧的批量结果显示函数，建议使用新的批量检测管理器");

  if (batchInfo) {
    batchInfo.textContent = `共处理 ${totalProcessed} 张图片`;
  }

  if (batchGallery) {
    batchGallery.innerHTML =
      '<div class="upgrade-notice"><p>请使用新的批量检测界面获得更好的体验</p></div>';
  }
}

// 显示检测结果
function displayDetectionResult(
  imageData,
  detections,
  analysis,
  imageElement,
  placeholderElement,
  statsElement,
) {
  // 显示图片 - 确保图像数据格式正确
  if (imageData) {
    // 检查图像数据是否已经包含data URL前缀
    let imageSrc;
    if (imageData.startsWith("data:")) {
      imageSrc = imageData;
    } else {
      imageSrc = `data:image/jpeg;base64,${imageData}`;
    }

    imageElement.src = imageSrc;
    imageElement.style.display = "block";
    placeholderElement.style.display = "none";

    // 添加错误处理
    imageElement.onerror = function () {
      console.error("图像加载失败，图像数据长度:", imageData.length);
      console.error("图像数据前缀:", imageData.substring(0, 50));
      placeholderElement.style.display = "flex";
      placeholderElement.innerHTML =
        '<i class="fas fa-exclamation-triangle"></i><p>图像显示失败</p>';
      imageElement.style.display = "none";
    };

    imageElement.onload = function () {
      console.log("图像加载成功");
    };
  } else {
    console.error("没有接收到图像数据");
    placeholderElement.style.display = "flex";
    placeholderElement.innerHTML =
      '<i class="fas fa-exclamation-triangle"></i><p>没有图像数据</p>';
    imageElement.style.display = "none";
  }

  // 显示统计信息
  statsElement.innerHTML = "";

  // 显示检测统计
  if (detections && Object.keys(detections).length > 0) {
    const statsContainer = document.createElement("div");
    statsContainer.className = "detection-stats-container";

    // 检测统计
    const detectionStats = document.createElement("div");
    detectionStats.className = "detection-stats-section";
    detectionStats.innerHTML = "<h4>检测统计</h4>";

    Object.entries(detections).forEach(([class_name, count]) => {
      const statItem = document.createElement("div");
      statItem.className = "stat-item";
      statItem.innerHTML = `
                <span class="stat-count">${count}</span>
                <span>${class_name}</span>
            `;
      detectionStats.appendChild(statItem);
    });

    statsContainer.appendChild(detectionStats);

    // 安全分析
    if (analysis) {
      const safetyAnalysis = document.createElement("div");
      safetyAnalysis.className = "safety-analysis-section";

      // 安全评分
      const safetyScore = document.createElement("div");
      safetyScore.className = "safety-score";
      const scoreClass =
        analysis.safety_score >= 80
          ? "good"
          : analysis.safety_score >= 60
            ? "warning"
            : "danger";
      safetyScore.innerHTML = `
                <h4>安全评分</h4>
                <div class="score-display ${scoreClass}">
                    <span class="score-number">${analysis.safety_score}</span>
                    <span class="score-label">/ 100</span>
                </div>
            `;

      // 违规信息
      const violations = document.createElement("div");
      violations.className = "violations-section";
      violations.innerHTML = "<h4>安全违规</h4>";

      if (analysis.safety_violations.length > 0) {
        analysis.safety_violations.forEach((violation) => {
          const violationItem = document.createElement("div");
          violationItem.className = "violation-item danger";
          violationItem.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${violation}`;
          violations.appendChild(violationItem);
        });
      } else {
        const noViolation = document.createElement("div");
        noViolation.className = "violation-item good";
        noViolation.innerHTML =
          '<i class="fas fa-check-circle"></i> 无安全违规';
        violations.appendChild(noViolation);
      }

      // 建议
      const recommendations = document.createElement("div");
      recommendations.className = "recommendations-section";
      recommendations.innerHTML = "<h4>安全建议</h4>";

      analysis.recommendations.forEach((recommendation) => {
        const recItem = document.createElement("div");
        recItem.className = "recommendation-item";
        recItem.innerHTML = `<i class="fas fa-lightbulb"></i> ${recommendation}`;
        recommendations.appendChild(recItem);
      });

      safetyAnalysis.appendChild(safetyScore);
      safetyAnalysis.appendChild(violations);
      safetyAnalysis.appendChild(recommendations);
      statsContainer.appendChild(safetyAnalysis);
    }

    statsElement.appendChild(statsContainer);
  } else {
    statsElement.innerHTML = '<div class="stat-item">未检测到目标</div>';
  }
}

// 更新检测统计信息
function updateDetectionStats(detections, analysis, statsElement) {
  // 显示统计信息
  statsElement.innerHTML = "";

  // 显示检测统计
  if (detections && Object.keys(detections).length > 0) {
    const statsContainer = document.createElement("div");
    statsContainer.className = "detection-stats-container";

    // 检测统计
    const detectionStats = document.createElement("div");
    detectionStats.className = "detection-stats-section";
    detectionStats.innerHTML = "<h4>检测统计</h4>";

    Object.entries(detections).forEach(([class_name, count]) => {
      const statItem = document.createElement("div");
      statItem.className = "stat-item";
      statItem.innerHTML = `
                <span class="stat-count">${count}</span>
                <span>${class_name}</span>
            `;
      detectionStats.appendChild(statItem);
    });

    statsContainer.appendChild(detectionStats);

    // 安全分析
    if (analysis) {
      const safetyAnalysis = document.createElement("div");
      safetyAnalysis.className = "safety-analysis-section";

      // 安全评分
      const safetyScore = document.createElement("div");
      safetyScore.className = "safety-score";
      const scoreClass =
        analysis.safety_score >= 80
          ? "good"
          : analysis.safety_score >= 60
            ? "warning"
            : "danger";
      safetyScore.innerHTML = `
                <h4>安全评分</h4>
                <div class="score-display ${scoreClass}">
                    <span class="score-number">${analysis.safety_score}</span>
                    <span class="score-label">/ 100</span>
                </div>
            `;

      // 违规信息
      const violations = document.createElement("div");
      violations.className = "violations-section";
      violations.innerHTML = "<h4>安全违规</h4>";

      if (analysis.safety_violations.length > 0) {
        analysis.safety_violations.forEach((violation) => {
          const violationItem = document.createElement("div");
          violationItem.className = "violation-item danger";
          violationItem.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${violation}`;
          violations.appendChild(violationItem);
        });
      } else {
        const noViolation = document.createElement("div");
        noViolation.className = "violation-item good";
        noViolation.innerHTML =
          '<i class="fas fa-check-circle"></i> 无安全违规';
        violations.appendChild(noViolation);
      }

      // 建议
      const recommendations = document.createElement("div");
      recommendations.className = "recommendations-section";
      recommendations.innerHTML = "<h4>安全建议</h4>";

      analysis.recommendations.forEach((recommendation) => {
        const recItem = document.createElement("div");
        recItem.className = "recommendation-item";
        recItem.innerHTML = `<i class="fas fa-lightbulb"></i> ${recommendation}`;
        recommendations.appendChild(recItem);
      });

      safetyAnalysis.appendChild(safetyScore);
      safetyAnalysis.appendChild(violations);
      safetyAnalysis.appendChild(recommendations);
      statsContainer.appendChild(safetyAnalysis);
    }

    statsElement.appendChild(statsContainer);
  } else {
    statsElement.innerHTML = '<div class="stat-item">未检测到目标</div>';
  }
}

// 拖拽上传功能
function initializeDragAndDrop() {
  const uploadArea = document.getElementById("upload-area");
  const batchUploadArea = document.getElementById("batch-upload-area");

  // 批量上传拖拽 - 新的批量检测管理器会自动处理
  // 这里保留兼容性代码
  if (batchUploadArea && !window.batchDetectionManager) {
    setupDragAndDrop(batchUploadArea, (files) => {
      if (files.length > 0) {
        batchFileInput.files = files;
        handleBatchImageUpload({ target: { files: files } });
      }
    });
  }
}

function setupDragAndDrop(element, callback) {
  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    element.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ["dragenter", "dragover"].forEach((eventName) => {
    element.addEventListener(eventName, highlight, false);
  });

  ["dragleave", "drop"].forEach((eventName) => {
    element.addEventListener(eventName, unhighlight, false);
  });

  function highlight(e) {
    element.classList.add("dragover");
  }

  function unhighlight(e) {
    element.classList.remove("dragover");
  }

  element.addEventListener("drop", handleDrop, false);

  function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    callback(files);
  }
}

// 显示/隐藏加载动画
function showLoading(show) {
  loading.style.display = show ? "flex" : "none";
}

// 显示通知
function showNotification(message, type = "info") {
  // 重构通知函数 - 确保通知元素存在，如果不存在则动态创建
  let notificationElement = document.getElementById("notification");

  if (!notificationElement) {
    console.warn("通知元素不存在，动态创建中...");

    // 动态创建通知元素
    notificationElement = document.createElement("div");
    notificationElement.id = "notification";
    notificationElement.className = "notification";
    notificationElement.style.display = "none";

    // 创建通知内容容器
    const notificationContent = document.createElement("div");
    notificationContent.className = "notification-content";

    // 创建图标元素
    const iconElement = document.createElement("i");
    iconElement.className = "notification-icon";

    // 创建消息元素
    const messageElement = document.createElement("span");
    messageElement.className = "notification-message";

    // 组装结构
    notificationContent.appendChild(iconElement);
    notificationContent.appendChild(messageElement);
    notificationElement.appendChild(notificationContent);

    // 添加到页面
    document.body.appendChild(notificationElement);
  }

  // 获取子元素
  let messageElement = notificationElement.querySelector(
    ".notification-message",
  );
  let iconElement = notificationElement.querySelector(".notification-icon");

  // 验证子元素存在
  if (!messageElement || !iconElement) {
    console.error("通知子元素缺失，重新创建通知结构");

    // 清空并重建内容
    notificationElement.innerHTML = "";

    const notificationContent = document.createElement("div");
    notificationContent.className = "notification-content";

    const newIconElement = document.createElement("i");
    newIconElement.className = "notification-icon";

    const newMessageElement = document.createElement("span");
    newMessageElement.className = "notification-message";

    notificationContent.appendChild(newIconElement);
    notificationContent.appendChild(newMessageElement);
    notificationElement.appendChild(notificationContent);

    // 重新获取元素引用
    messageElement = newMessageElement;
    iconElement = newIconElement;
  }

  // 设置消息和样式
  messageElement.textContent = message;
  notificationElement.className = `notification ${type}`;

  // 设置图标
  switch (type) {
    case "success":
      iconElement.className = "notification-icon fas fa-check-circle";
      break;
    case "error":
      iconElement.className = "notification-icon fas fa-exclamation-circle";
      break;
    case "warning":
      iconElement.className = "notification-icon fas fa-exclamation-triangle";
      break;
    default:
      iconElement.className = "notification-icon fas fa-info-circle";
  }

  // 显示通知
  notificationElement.style.display = "block";

  // 确保通知在最前层
  notificationElement.style.zIndex = "10000";

  // 3秒后自动隐藏
  setTimeout(() => {
    if (notificationElement) {
      notificationElement.style.display = "none";
    }
  }, 3000);
}

// 页面卸载时清理资源
window.addEventListener("beforeunload", () => {
  if (stream) {
    stream.getTracks().forEach((track) => track.stop());
  }
  if (detectionInterval) {
    clearInterval(detectionInterval);
  }
});

// 错误处理
window.addEventListener("error", (event) => {
  console.error("全局错误:", event.error);
  // 只在非异步错误时显示通知
  if (!event.error || !event.error.name || event.error.name !== "TypeError") {
    showNotification("发生未知错误，请刷新页面重试", "error");
  }
});

// 处理未捕获的Promise拒绝
window.addEventListener("unhandledrejection", (event) => {
  console.error("未处理的Promise拒绝:", event.reason);
  // 不显示通知，避免频繁弹窗
  event.preventDefault();
});

// 网络状态监听
window.addEventListener("online", () => {
  showNotification("网络连接已恢复", "success");
});

window.addEventListener("offline", () => {
  showNotification("网络连接已断开", "warning");
});

// 测试摄像头端点
async function testCameraEndpoint() {
  try {
    showNotification("正在测试摄像头端点...", "info");

    const response = await fetch("/start_camera", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    showNotification(`摄像头端点测试成功: ${result.message}`, "success");
    console.log("摄像头端点响应:", result);
  } catch (error) {
    console.error("摄像头端点测试失败:", error);
    showNotification("摄像头端点测试失败: " + error.message, "error");
  }
}

// 性能模式切换 - 重构版本
function initializePerformanceMode() {
  console.log("🔧 初始化性能模式切换系统");

  // 获取所有模式选项
  const modeOptions = document.querySelectorAll(".mode-option");
  const modeInputs = document.querySelectorAll(
    'input[name="performance-mode"]',
  );

  console.log(
    `找到 ${modeOptions.length} 个模式选项，${modeInputs.length} 个输入框`,
  );

  // 为每个输入框添加事件监听
  modeInputs.forEach((input, index) => {
    console.log(`设置监听器 ${index + 1}: ${input.value}`);

    input.addEventListener("change", (e) => {
      const newMode = e.target.value;
      console.log(`🔄 模式切换: ${performanceMode} -> ${newMode}`);

      performanceMode = newMode;

      // 立即更新视觉状态
      updateModeVisualState(newMode);

      // 显示切换通知
      const modeName = getModeName(newMode);

      // 如果正在检测，自动停止检测并清空画面
      if (isDetecting) {
        console.log(`🔄 检测中模式变更: 停止当前检测并切换到 ${newMode}`);
        stopDetection(); // 自动停止检测并清空画面
        showNotification(`已切换到${modeName}，请重新点击开始检测`, "info");
      } else {
        showNotification(`✅ 已切换到${modeName}`, "success");
      }
    });

    // 为label添加点击事件（确保点击整个区域都能切换）
    const label = input.closest(".mode-option");
    if (label) {
      label.addEventListener("click", (e) => {
        // 防止重复触发
        if (e.target === input) return;

        input.checked = true;
        input.dispatchEvent(new Event("change"));
      });
    }
  });

  // 初始化视觉状态
  console.log(`🎨 初始化视觉状态: ${performanceMode}`);
  updateModeVisualState(performanceMode);

  // 验证初始化
  const checkedInput = document.querySelector(
    'input[name="performance-mode"]:checked',
  );
  if (checkedInput) {
    console.log(`✅ 初始化完成，当前选中: ${checkedInput.value}`);
  } else {
    console.warn("⚠️ 没有找到选中的模式，设置默认模式");
    const defaultInput = document.querySelector(
      'input[name="performance-mode"][value="normal"]',
    );
    if (defaultInput) {
      defaultInput.checked = true;
      updateModeVisualState("normal");
    }
  }
}

// 更新模式选择的视觉状态 - 重构版本
function updateModeVisualState(selectedMode) {
  console.log(`🎨 更新视觉状态: ${selectedMode}`);

  const modeOptions = document.querySelectorAll(".mode-option");
  let updatedCount = 0;

  modeOptions.forEach((option, index) => {
    const input = option.querySelector('input[name="performance-mode"]');
    if (input) {
      if (input.value === selectedMode) {
        option.classList.add("selected");
        input.checked = true;
        console.log(`✅ 选中模式 ${index + 1}: ${input.value}`);
        updatedCount++;
      } else {
        option.classList.remove("selected");
        input.checked = false;
      }
    }
  });

  console.log(`🎨 视觉状态更新完成，更新了 ${updatedCount} 个选项`);

  // 更新模式指示器（如果存在）
  const modeIndicator = document.querySelector(".current-mode-indicator");
  if (modeIndicator) {
    modeIndicator.textContent = getModeName(selectedMode);
  }
}

function getModeName(mode) {
  switch (mode) {
    case "normal":
      return "通用模型";
    case "smart":
      return "轻量化模型";
    case "high_quality":
      return "小目标模型";
    default:
      return "通用模型";
  }
}

// 更新实时检测统计（右侧简单显示）
function updateRealtimeStats(detections, statsElement) {
  if (!statsElement) return;

  // 清空现有统计
  statsElement.innerHTML = "";

  // 添加统计项
  Object.entries(detections).forEach(([className, count]) => {
    const statItem = document.createElement("div");
    statItem.className = "stat-item";
    statItem.innerHTML = `
            <span class="stat-count">${count}</span>
            <span>${getClassName(className)}</span>
        `;
    statsElement.appendChild(statItem);
  });

  // 如果没有检测结果，显示默认信息
  if (Object.keys(detections).length === 0) {
    const noDataItem = document.createElement("div");
    noDataItem.className = "stat-item";
    noDataItem.innerHTML = "<span>未检测到目标</span>";
    statsElement.appendChild(noDataItem);
  }
}

// 更新左侧统计网格
function updateStatsGrid(detections) {
  if (!statsGrid) return;

  // 清空现有统计
  statsGrid.innerHTML = "";

  // 添加统计项
  Object.entries(detections).forEach(([className, count]) => {
    const statItem = document.createElement("div");
    statItem.className = "stat-item";
    statItem.innerHTML = `
            <span class="stat-label">${getClassName(className)}</span>
            <span class="stat-count">${count}</span>
        `;
    statsGrid.appendChild(statItem);
  });

  // 如果没有检测结果，显示默认信息
  if (Object.keys(detections).length === 0) {
    const noDataItem = document.createElement("div");
    noDataItem.className = "stat-item";
    noDataItem.innerHTML = "<span>暂无检测数据</span>";
    statsGrid.appendChild(noDataItem);
  }
}

// 更新安全评分
function updateSafetyScore(detections) {
  if (!safetyScoreElement || !safetyAnalysisElement) return;

  // 计算安全评分
  let score = 100;
  const violations = [];
  const recommendations = [];

  // 检查安全违规
  if (detections["NO-Hardhat"]) {
    score -= 20;
    violations.push(`发现${detections["NO-Hardhat"]}人未佩戴安全帽`);
  }
  if (detections["NO-Mask"]) {
    score -= 15;
    violations.push(`发现${detections["NO-Mask"]}人未佩戴口罩`);
  }
  if (detections["NO-Safety Vest"]) {
    score -= 10;
    violations.push(`发现${detections["NO-Safety Vest"]}人未穿安全背心`);
  }

  // 确保评分在0-100之间
  score = Math.max(0, Math.min(100, score));

  // 更新评分显示
  const scoreDisplay = safetyScoreElement.querySelector(".score-display");
  const scoreNumber = safetyScoreElement.querySelector(".score-number");
  const scoreStatus = safetyScoreElement.querySelector(".score-status");

  if (scoreNumber) scoreNumber.textContent = score;

  // 根据评分设置样式
  if (scoreDisplay) {
    scoreDisplay.className = "score-display";
    if (score >= 80) {
      scoreDisplay.classList.add("good");
      if (scoreStatus) scoreStatus.textContent = "安全状况良好";
    } else if (score >= 60) {
      scoreDisplay.classList.add("warning");
      if (scoreStatus) scoreStatus.textContent = "需要关注安全状况";
    } else {
      scoreDisplay.classList.add("danger");
      if (scoreStatus) scoreStatus.textContent = "安全状况较差，需要立即处理";
    }
  }

  // 更新安全分析
  updateSafetyAnalysis(violations, recommendations, score);
}

// 更新安全分析
function updateSafetyAnalysis(violations, recommendations, score) {
  if (!safetyAnalysisElement) return;

  let analysisHTML = "";

  if (violations.length > 0) {
    analysisHTML += '<div class="violations-section">';
    analysisHTML += "<h4>安全违规</h4>";
    violations.forEach((violation) => {
      analysisHTML += `<div class="violation-item danger">${violation}</div>`;
    });
    analysisHTML += "</div>";
  } else {
    analysisHTML += '<div class="violations-section">';
    analysisHTML += "<h4>安全状况</h4>";
    analysisHTML += '<div class="violation-item good">未发现安全违规</div>';
    analysisHTML += "</div>";
  }

  // 添加建议
  if (score < 80) {
    analysisHTML += '<div class="recommendations-section">';
    analysisHTML += "<h4>安全建议</h4>";
    if (score < 60) {
      analysisHTML +=
        '<div class="recommendation-item">立即停止作业，确保所有人员佩戴安全装备</div>';
    } else {
      analysisHTML +=
        '<div class="recommendation-item">加强安全监督，确保安全装备正确佩戴</div>';
    }
    analysisHTML += "</div>";
  }

  safetyAnalysisElement.innerHTML = analysisHTML;
}

// 获取类别名称
function getClassName(className) {
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

// 获取类别颜色
function getClassColor(className) {
  const classColors = {
    Person: "#4CAF50", // 绿色 - 人员
    Hardhat: "#2196F3", // 蓝色 - 安全帽
    "NO-Hardhat": "#F44336", // 红色 - 无安全帽
    Mask: "#00BCD4", // 青色 - 口罩
    "NO-Mask": "#FF5722", // 橙红色 - 无口罩
    "Safety Vest": "#FF9800", // 橙色 - 安全背心
    "NO-Safety Vest": "#E91E63", // 粉红色 - 无安全背心
    "Safety Cone": "#FFEB3B", // 黄色 - 安全锥
    machinery: "#9C27B0", // 紫色 - 机械
    vehicle: "#607D8B", // 蓝灰色 - 车辆
  };
  return classColors[className] || "#757575"; // 默认灰色
}

// =================================== 工地现场监控功能 ===================================

// 工地现场监控初始化
function initializeSiteMonitoring() {
  console.log("🏗️ 初始化工地现场监控系统...");

  // 绑定事件监听器
  if (connectRtspBtn) {
    connectRtspBtn.addEventListener("click", connectToRTSP);
  }

  if (disconnectRtspBtn) {
    disconnectRtspBtn.addEventListener("click", disconnectRTSP);
  }

  if (siteStartBtn) {
    siteStartBtn.addEventListener("click", startSiteDetection);
  }

  if (siteStopBtn) {
    siteStopBtn.addEventListener("click", stopSiteDetection);
  }

  // 初始化工地现场监控的模式切换
  initializeSitePerformanceMode();

  // 初始化流畅度优化设置
  initializeSiteFluiditySettings();

  console.log("✅ 工地现场监控系统初始化完成");
}

// 工地现场监控流畅度优化设置
function initializeSiteFluiditySettings() {
  // 工地现场监控流畅度配置 - 默认设置为流畅模式
  window.siteFluidityConfig = {
    frameRate: 20, // 默认20fps（流畅模式）
    detectionInterval: 4000, // 默认4秒检测一次（流畅模式）
    imageQuality: 0.6, // 默认图片质量0.6（流畅模式）
  };

  console.log("🎯 工地现场监控流畅度设置初始化完成 - 默认流畅模式");
}

// 设置工地现场监控流畅度级别
function setSiteFluidityLevel(level) {
  const config = window.siteFluidityConfig;

  switch (level) {
    case "smooth":
      // 流畅模式：优先流畅度
      config.frameRate = 20;
      config.detectionInterval = 4000;
      config.imageQuality = 0.6;
      console.log("🚀 工地现场监控已切换到流畅模式");
      break;
    case "balanced":
      // 平衡模式：平衡性能和质量
      config.frameRate = 15;
      config.detectionInterval = 3000;
      config.imageQuality = 0.7;
      console.log("⚖️ 工地现场监控已切换到平衡模式");
      break;
    case "quality":
      // 质量模式：优先检测质量
      config.frameRate = 12;
      config.detectionInterval = 2000;
      config.imageQuality = 0.8;
      console.log("🎯 工地现场监控已切换到质量模式");
      break;
    case "frame_by_frame":
      // 逐帧模式：智能逐帧处理
      config.frameRate = 25;
      config.detectionInterval = 1500;
      config.imageQuality = 0.75;
      config.frameByFrameMode = true;
      console.log("🎬 工地现场监控已切换到逐帧模式");
      break;
  }

  // 重置逐帧模式标志（除非是逐帧模式）
  if (level !== "frame_by_frame") {
    config.frameByFrameMode = false;
  }

  // 如果正在连接RTSP，重新应用设置
  if (rtspConnected && rtspFrameInterval) {
    clearInterval(rtspFrameInterval);
    rtspFrameInterval = setInterval(
      () => {
        if (rtspConnected) {
          siteVideo.src = "/rtsp/frame?" + Date.now();
        }
      },
      Math.round(1000 / config.frameRate),
    );
    console.log(`🔄 RTSP帧率已调整为 ${config.frameRate}fps`);
  }

  // 如果正在检测，重新应用检测间隔
  if (isSiteDetecting && siteDetectionInterval) {
    clearInterval(siteDetectionInterval);
    siteDetectionInterval = setInterval(
      performSiteDetection,
      config.detectionInterval,
    );
    console.log(`🔄 检测间隔已调整为 ${config.detectionInterval}ms`);
  }

  // 更新按钮状态
  document.querySelectorAll(".fluidity-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  // 设置当前选中的按钮为活动状态
  const activeBtn = document.querySelector(
    `[onclick="setSiteFluidityLevel('${level}')"]`,
  );
  if (activeBtn) {
    activeBtn.classList.add("active");
  }

  const modeNames = {
    smooth: "流畅",
    balanced: "平衡",
    quality: "质量",
    frame_by_frame: "逐帧",
  };

  showNotification(
    `工地现场监控流畅度已调整为：${modeNames[level] || "未知"}模式`,
    "success",
  );
}

// 工地现场监控模式切换初始化
function initializeSitePerformanceMode() {
  const siteModeInputs = document.querySelectorAll(
    'input[name="site-performance-mode"]',
  );
  siteModeInputs.forEach((input, index) => {
    console.log(`设置工地现场监控监听器 ${index + 1}: ${input.value}`);

    input.addEventListener("change", (e) => {
      const newMode = e.target.value;
      console.log(
        `🏗️ 工地现场监控模式切换: ${sitePerformanceMode} -> ${newMode}`,
      );

      sitePerformanceMode = newMode;

      // 立即更新视觉状态
      updateSiteModeVisualState(newMode);

      // 显示切换通知
      const modeName = getModeName(newMode);

      // 如果正在检测，自动停止检测并清空画面
      if (isSiteDetecting) {
        console.log(
          `🔄 工地现场检测中模式变更: 停止当前检测并切换到 ${newMode}`,
        );
        stopSiteDetection(); // 自动停止检测并清空画面
        showNotification(
          `工地现场监控已切换到${modeName}，请重新点击开始检测`,
          "info",
        );
      } else {
        showNotification(`✅ 工地现场监控已切换到${modeName}`, "success");
      }
    });

    // 为label添加点击事件（确保点击整个区域都能切换）
    const label = input.closest(".mode-option");
    if (label) {
      label.addEventListener("click", (e) => {
        // 防止重复触发
        if (e.target === input) return;

        input.checked = true;
        input.dispatchEvent(new Event("change"));
      });
    }
  });

  // 初始化工地现场监控的模式指示器
  updateSiteModeVisualState(sitePerformanceMode);
}

// 连接RTSP视频流
async function connectToRTSP() {
  try {
    console.log("🔗 尝试连接RTSP视频流...");

    const rtspUrl = rtspUrlInput.value.trim();
    const username = rtspUsernameInput.value.trim();
    const password = rtspPasswordInput.value.trim();

    if (!rtspUrl) {
      throw new Error("请输入RTSP地址");
    }

    // 更新连接状态为连接中
    updateSiteConnectionStatus("connecting", "连接中...");

    if (siteCameraStatus) {
      siteCameraStatus.style.display = "block"; // 显示状态文字
      siteCameraStatus.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i><span>连接RTSP视频流中...</span>';
    }

    // 构建完整的RTSP URL
    let fullRtspUrl = rtspUrl;
    if (username && password && !rtspUrl.includes("@")) {
      // 如果URL中没有认证信息，则添加
      const urlParts = rtspUrl.split("://");
      if (urlParts.length === 2) {
        fullRtspUrl = `${urlParts[0]}://${username}:${password}@${urlParts[1]}`;
      }
    }

    console.log(
      `🔗 RTSP URL: ${fullRtspUrl.replace(password || "password", "***")}`,
    );

    // 通过后端连接RTSP流
    const response = await fetch("/rtsp/connect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: fullRtspUrl,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "连接失败");
    }

    // 连接成功，设置视频源为RTSP流
    if (siteVideo) {
      siteVideo.src = "/rtsp/frame";
      siteVideo.onload = () => {
        // 定期刷新图像以模拟视频流
        if (rtspFrameInterval) {
          clearInterval(rtspFrameInterval);
        }
        rtspFrameInterval = setInterval(
          () => {
            if (rtspConnected) {
              siteVideo.src = "/rtsp/frame?" + Date.now();
            }
          },
          Math.round(1000 / window.siteFluidityConfig.frameRate),
        ); // 使用动态帧率配置
      };
    }

    rtspConnected = true;

    // 连接成功
    updateSiteConnectionStatus("connected", "已连接");

    // 连接成功后隐藏状态文字，避免影响用户观看体验
    if (siteCameraStatus) {
      siteCameraStatus.style.display = "none";
    }

    if (connectRtspBtn) {
      connectRtspBtn.disabled = true;
    }
    if (disconnectRtspBtn) {
      disconnectRtspBtn.disabled = false;
    }
    if (siteStartBtn) {
      siteStartBtn.disabled = false;
    }

    showNotification("RTSP视频流连接成功", "success");
    console.log("✅ RTSP视频流连接成功");
  } catch (error) {
    console.error("❌ RTSP连接失败:", error);

    updateSiteConnectionStatus("disconnected", "连接失败");

    if (siteCameraStatus) {
      siteCameraStatus.style.display = "block"; // 显示状态文字
      siteCameraStatus.innerHTML =
        '<i class="fas fa-exclamation-triangle"></i><span>RTSP连接失败</span>';
    }

    if (connectRtspBtn) {
      connectRtspBtn.disabled = false;
    }
    if (disconnectRtspBtn) {
      disconnectRtspBtn.disabled = true;
    }
    if (siteStartBtn) {
      siteStartBtn.disabled = true;
    }

    showNotification(`RTSP连接失败: ${error.message}`, "error");
  }
}

// 断开RTSP连接
async function disconnectRTSP() {
  console.log("🔌 断开RTSP连接");

  // 停止检测（如果正在检测）
  if (isSiteDetecting) {
    stopSiteDetection();
  }

  // 停止帧刷新定时器
  if (rtspFrameInterval) {
    clearInterval(rtspFrameInterval);
    rtspFrameInterval = null;
  }

  // 通过后端断开RTSP连接
  try {
    await fetch("/rtsp/disconnect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("断开RTSP连接时出错:", error);
  }

  // 停止视频流
  if (siteStream) {
    siteStream.getTracks().forEach((track) => track.stop());
    siteStream = null;
  }

  if (siteVideo) {
    siteVideo.srcObject = null;
    siteVideo.src = "";
  }

  rtspConnected = false;

  // 重置UI状态
  updateSiteConnectionStatus("disconnected", "未连接");

  if (siteCameraStatus) {
    siteCameraStatus.style.display = "block"; // 显示状态文字
    siteCameraStatus.innerHTML =
      '<i class="fas fa-video"></i><span>等待连接RTSP视频流...</span>';
  }

  if (connectRtspBtn) {
    connectRtspBtn.disabled = false;
  }
  if (disconnectRtspBtn) {
    disconnectRtspBtn.disabled = true;
  }
  if (siteStartBtn) {
    siteStartBtn.disabled = true;
  }

  showNotification("RTSP连接已断开", "info");
}

// 开始工地现场检测
async function startSiteDetection() {
  if (isSiteDetecting) return;

  if (!rtspConnected) {
    showNotification("请先连接RTSP视频流", "error");
    return;
  }

  try {
    console.log(`🏗️ 开始工地现场检测，模式: ${sitePerformanceMode}`);

    isSiteDetecting = true;
    siteFrameCount = 0;
    siteLastDetectionTime = Date.now();

    // 更新UI状态
    if (siteStartBtn) {
      siteStartBtn.disabled = true;
      siteStartBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> 检测中...';
    }

    if (siteStopBtn) {
      siteStopBtn.disabled = false;
    }

    // 清空之前的结果
    if (siteResultImage) {
      siteResultImage.style.display = "none";
    }
    if (siteResultPlaceholder) {
      siteResultPlaceholder.style.display = "block";
    }

    // 开始定时检测 - 使用动态检测间隔配置
    siteDetectionInterval = setInterval(
      performSiteDetection,
      window.siteFluidityConfig.detectionInterval,
    );

    showNotification("工地现场检测已开始", "success");
    console.log("✅ 工地现场检测启动成功");
  } catch (error) {
    console.error("❌ 工地现场检测启动失败:", error);
    showNotification(`工地现场检测启动失败: ${error.message}`, "error");

    // 重置状态
    isSiteDetecting = false;
    if (siteStartBtn) {
      siteStartBtn.disabled = false;
      siteStartBtn.innerHTML = '<i class="fas fa-play"></i> 开始现场检测';
    }
    if (siteStopBtn) {
      siteStopBtn.disabled = true;
    }
  }
}

// 停止工地现场检测
function stopSiteDetection() {
  if (!isSiteDetecting) return;

  console.log("🛑 停止工地现场检测");

  isSiteDetecting = false;

  // 清除检测间隔
  if (siteDetectionInterval) {
    clearInterval(siteDetectionInterval);
    siteDetectionInterval = null;
  }

  // 重置UI状态
  if (siteStartBtn) {
    siteStartBtn.disabled = false;
    siteStartBtn.innerHTML = '<i class="fas fa-play"></i> 开始现场检测';
  }

  if (siteStopBtn) {
    siteStopBtn.disabled = true;
    siteStopBtn.innerHTML = '<i class="fas fa-stop"></i> 停止现场检测';
  }

  showNotification("工地现场检测已停止", "info");
  console.log("✅ 工地现场检测已停止");
}

// 执行工地现场检测（逐帧优化版本）
async function performSiteDetection() {
  if (!isSiteDetecting || !rtspConnected) {
    console.log(
      `🔍 跳过检测 - isSiteDetecting: ${isSiteDetecting}, rtspConnected: ${rtspConnected}`,
    );
    return;
  }

  // 检查是否有检测正在进行中，避免积压
  if (window.siteDetectionInProgress) {
    console.log("⏭️ 跳过检测，上次检测仍在进行中");
    return;
  }

  window.siteDetectionInProgress = true;

  try {
    siteFrameCount++;
    const startTime = performance.now();

    console.log(
      `🔍 发送检测请求 - 模式: ${sitePerformanceMode}, 帧ID: ${siteFrameCount}`,
    );

    // 逐帧优化：添加帧ID用于跳帧逻辑
    const response = await fetch("/rtsp/detect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mode: sitePerformanceMode,
        frame_id: siteFrameCount,
      }),
    });

    if (!response.ok) {
      throw new Error(`服务器响应错误: ${response.status}`);
    }

    const result = await response.json();
    const processingTime = performance.now() - startTime;

    if (result.image) {
      // 更新检测结果
      if (siteResultImage) {
        siteResultImage.src = `data:image/jpeg;base64,${result.image}`;
        siteResultImage.style.display = "block";
        if (siteResultPlaceholder) {
          siteResultPlaceholder.style.display = "none";
        }
      }

      // 更新统计信息
      if (result.detections) {
        updateSiteStats(result.detections);
      }

      // 更新安全评分和分析
      if (result.analysis) {
        updateSiteSafetyScore(result.analysis.safety_score, result.analysis);
      }

      siteLastDetectionTime = Date.now();

      // 逐帧优化：动态调整检测间隔
      if (processingTime > 2000) {
        // 如果处理时间超过2秒
        console.log(`⚡ 检测耗时 ${processingTime.toFixed(0)}ms，动态调整间隔`);
        // 临时增加检测间隔，避免积压
        if (siteDetectionInterval) {
          clearInterval(siteDetectionInterval);
          const adjustedInterval = Math.max(
            window.siteFluidityConfig.detectionInterval,
            processingTime * 1.5,
          );
          siteDetectionInterval = setInterval(
            performSiteDetection,
            adjustedInterval,
          );
        }
      }
    } else {
      console.warn("⚠️ 工地现场检测失败:", result.error || "未知错误");
    }
  } catch (error) {
    console.error("❌ 工地现场检测错误:", error);

    // 限制错误通知频率
    const now = Date.now();
    if (now - siteLastDetectionTime > 10000) {
      showNotification(`工地现场检测错误: ${error.message}`, "error");
      siteLastDetectionTime = now;
    }
  } finally {
    // 确保标志位被重置
    window.siteDetectionInProgress = false;
  }
}

// 更新工地现场连接状态
function updateSiteConnectionStatus(status, text) {
  if (!siteConnectionStatus) return;

  // 清除之前的状态类
  siteConnectionStatus.classList.remove(
    "connected",
    "connecting",
    "disconnected",
  );

  // 添加新的状态类
  siteConnectionStatus.classList.add(status);

  // 更新文本
  const textElement =
    siteConnectionStatus.querySelector("span") || siteConnectionStatus;
  if (textElement !== siteConnectionStatus) {
    textElement.textContent = text;
  } else {
    siteConnectionStatus.innerHTML = `<i class="fas fa-circle"></i> ${text}`;
  }
}

// 更新工地现场监控模式视觉状态
function updateSiteModeVisualState(selectedMode) {
  const siteModeOptions = document.querySelectorAll(
    "#site-monitoring-tab .mode-option",
  );

  let updatedCount = 0;

  siteModeOptions.forEach((option, index) => {
    const input = option.querySelector('input[name="site-performance-mode"]');
    if (input) {
      if (input.value === selectedMode) {
        option.classList.add("selected");
        input.checked = true;
        console.log(`✅ 工地现场监控选中模式 ${index + 1}: ${input.value}`);
        updatedCount++;
      } else {
        option.classList.remove("selected");
        input.checked = false;
      }
    }
  });

  console.log(`🎨 工地现场监控视觉状态更新完成，更新了 ${updatedCount} 个选项`);

  // 更新模式指示器（如果存在）
  const siteModeIndicator = document.querySelector(
    "#site-monitoring-tab .current-mode-indicator",
  );
  if (siteModeIndicator) {
    siteModeIndicator.textContent = getModeName(selectedMode);
  }
}

// 更新工地现场统计信息
function updateSiteStats(stats) {
  if (!siteStatsGrid || !stats) return;

  let statsHTML = "";
  for (const [className, count] of Object.entries(stats)) {
    if (count > 0) {
      const displayName = getClassName(className);
      const color = getClassColor(className);

      statsHTML += `
                <div class="stat-item">
                    <div class="stat-icon" style="background: ${color}">
                        <span class="stat-count">${count}</span>
                    </div>
                    <div class="stat-info">
                        <div class="stat-name">${displayName}</div>
                        <div class="stat-description">检测到 ${count} 个</div>
                    </div>
                </div>
            `;
    }
  }

  if (statsHTML === "") {
    statsHTML =
      '<div class="no-detections"><i class="fas fa-eye-slash"></i><p>未检测到目标</p></div>';
  }

  siteStatsGrid.innerHTML = statsHTML;

  // 更新检测统计显示
  if (siteDetectionStats) {
    const totalDetections = Object.values(stats).reduce(
      (sum, count) => sum + count,
      0,
    );
    siteDetectionStats.innerHTML = `检测到 ${totalDetections} 个目标 | 帧数: ${siteFrameCount}`;
  }
}

// 更新工地现场安全评分
function updateSiteSafetyScore(score, analysis) {
  if (!siteSafetyScoreElement || score === undefined) return;

  siteSafetyScore = score;

  // 更新评分显示
  const scoreNumber = siteSafetyScoreElement.querySelector(".score-number");
  const scoreStatus = siteSafetyScoreElement.querySelector(".score-status");

  if (scoreNumber) {
    scoreNumber.textContent = Math.round(score);
  }

  if (scoreStatus) {
    let status = "安全";
    let statusClass = "safe";

    if (score < 60) {
      status = "危险";
      statusClass = "danger";
    } else if (score < 80) {
      status = "警告";
      statusClass = "warning";
    }

    scoreStatus.textContent = status;
    scoreStatus.className = `score-status ${statusClass}`;
  }

  // 更新安全分析
  if (siteSafetyAnalysisElement && analysis) {
    let analysisHTML = '<div class="analysis-content">';

    // 添加违规项目
    if (analysis.violations && analysis.violations.length > 0) {
      analysisHTML += '<div class="violations-section">';
      analysisHTML += "<h4>安全隐患</h4>";
      analysisHTML += '<div class="violations-list">';
      analysis.violations.forEach((violation) => {
        analysisHTML += `<div class="violation-item">${violation}</div>`;
      });
      analysisHTML += "</div>";
      analysisHTML += "</div>";
    } else {
      analysisHTML += '<div class="violations-section">';
      analysisHTML += "<h4>安全状况</h4>";
      analysisHTML += '<div class="violation-item good">未发现安全违规</div>';
      analysisHTML += "</div>";
    }

    // 添加建议
    if (score < 80) {
      analysisHTML += '<div class="recommendations-section">';
      analysisHTML += "<h4>安全建议</h4>";
      if (score < 60) {
        analysisHTML +=
          '<div class="recommendation-item">立即停止作业，确保所有人员佩戴安全装备</div>';
      } else {
        analysisHTML +=
          '<div class="recommendation-item">加强安全监督，确保安全装备正确佩戴</div>';
      }
      analysisHTML += "</div>";
    }

    analysisHTML += "</div>";
    siteSafetyAnalysisElement.innerHTML = analysisHTML;
  }
}

// 暴露工地现场监控函数到全局作用域
window.startSiteDetection = startSiteDetection;
window.stopSiteDetection = stopSiteDetection;
window.connectToRTSP = connectToRTSP;
window.disconnectRTSP = disconnectRTSP;
