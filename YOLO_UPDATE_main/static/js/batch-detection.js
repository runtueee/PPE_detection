/**
 * 批量检测管理器
 * 负责处理多图片批量上传、检测、结果展示和管理
 */

class BatchDetectionManager {
  constructor() {
    this.batchResults = [];
    this.currentFiles = [];
    this.currentPage = 1;
    this.itemsPerPage = 12;
    this.filters = {
      safety: "all",
      detection: "all",
    };
    this.sortOption = "filename";
    this.sortOrder = "desc";
    this.processingStats = {
      total: 0,
      processed: 0,
      successful: 0,
      failed: 0,
    };

    this.initializeElements();
    this.bindEvents();
    this.setupDragAndDrop();
  }

  /**
   * 初始化DOM元素
   */
  initializeElements() {
    // 上传相关元素
    this.batchFileInput = document.getElementById("batch-file-input");
    this.batchUploadArea = document.getElementById("batch-upload-area");
    this.batchProgress = document.getElementById("batch-progress");
    this.batchProgressText = document.getElementById("batch-progress-text");
    this.batchProgressPercentage = document.getElementById(
      "batch-progress-percentage",
    );
    this.batchProgressFill = document.getElementById("batch-progress-fill");
    this.batchProgressDetails = document.getElementById(
      "batch-progress-details",
    );

    // 文件列表元素
    this.batchFileList = document.getElementById("batch-file-list");
    this.fileListContent = document.getElementById("file-list-content");
    this.clearFilesBtn = document.getElementById("clear-files-btn");
    this.startBatchBtn = document.getElementById("start-batch-btn");

    // 结果相关元素
    this.batchResultsSection = document.getElementById("batch-results-section");
    this.batchGallery = document.getElementById("batch-gallery");
    this.totalProcessed = document.getElementById("total-processed");
    this.successfulDetections = document.getElementById(
      "successful-detections",
    );
    this.safetyWarnings = document.getElementById("safety-warnings");
    this.avgSafetyScore = document.getElementById("avg-safety-score");

    // 控制元素
    this.safetyFilter = document.getElementById("safety-filter");
    this.detectionFilter = document.getElementById("detection-filter");
    this.sortOptionSelect = document.getElementById("sort-option");
    this.sortOrderBtn = document.getElementById("sort-order-btn");

    // 操作按钮
    this.downloadAllBtn = document.getElementById("download-all-btn");
    this.exportReportBtn = document.getElementById("export-report-btn");
    this.clearResultsBtn = document.getElementById("clear-results-btn");

    // 分页元素
    this.batchPagination = document.getElementById("batch-pagination");
    this.prevPageBtn = document.getElementById("prev-page-btn");
    this.nextPageBtn = document.getElementById("next-page-btn");
    this.paginationInfo = document.getElementById("pagination-info");

    // 模态框元素
    this.batchDetailModal = document.getElementById("batch-detail-modal");
    this.modalOverlay = document.getElementById("modal-overlay");
    this.modalCloseBtn = document.getElementById("modal-close-btn");
    this.modalTitle = document.getElementById("modal-title");
    this.modalBody = document.getElementById("modal-body");
  }

  /**
   * 绑定事件监听器
   */
  bindEvents() {
    // 文件选择
    if (this.batchFileInput) {
      this.batchFileInput.addEventListener("change", (e) =>
        this.handleFileSelect(e),
      );
    }

    // 文件列表操作
    if (this.clearFilesBtn) {
      this.clearFilesBtn.addEventListener("click", () => this.clearFileList());
    }
    if (this.startBatchBtn) {
      this.startBatchBtn.addEventListener("click", () =>
        this.startBatchDetection(),
      );
    }

    // 过滤和排序
    if (this.safetyFilter) {
      this.safetyFilter.addEventListener("change", (e) =>
        this.updateFilter("safety", e.target.value),
      );
    }
    if (this.detectionFilter) {
      this.detectionFilter.addEventListener("change", (e) =>
        this.updateFilter("detection", e.target.value),
      );
    }
    if (this.sortOptionSelect) {
      this.sortOptionSelect.addEventListener("change", (e) =>
        this.updateSort(e.target.value),
      );
    }
    if (this.sortOrderBtn) {
      this.sortOrderBtn.addEventListener("click", () => this.toggleSortOrder());
    }

    // 批量操作
    if (this.downloadAllBtn) {
      this.downloadAllBtn.addEventListener("click", () =>
        this.downloadAllResults(),
      );
    }
    if (this.exportReportBtn) {
      this.exportReportBtn.addEventListener("click", () =>
        this.exportDetectionReport(),
      );
    }
    if (this.clearResultsBtn) {
      this.clearResultsBtn.addEventListener("click", () =>
        this.clearAllResults(),
      );
    }

    // 分页
    if (this.prevPageBtn) {
      this.prevPageBtn.addEventListener("click", () => this.previousPage());
    }
    if (this.nextPageBtn) {
      this.nextPageBtn.addEventListener("click", () => this.nextPage());
    }

    // 模态框
    if (this.modalOverlay) {
      this.modalOverlay.addEventListener("click", () => this.closeModal());
    }
    if (this.modalCloseBtn) {
      this.modalCloseBtn.addEventListener("click", () => this.closeModal());
    }
  }

  /**
   * 设置拖拽上传
   */
  setupDragAndDrop() {
    if (!this.batchUploadArea) return;

    const events = ["dragenter", "dragover", "dragleave", "drop"];
    events.forEach((eventName) => {
      this.batchUploadArea.addEventListener(
        eventName,
        this.preventDefaults,
        false,
      );
    });

    ["dragenter", "dragover"].forEach((eventName) => {
      this.batchUploadArea.addEventListener(
        eventName,
        () => {
          this.batchUploadArea.classList.add("dragover");
        },
        false,
      );
    });

    ["dragleave", "drop"].forEach((eventName) => {
      this.batchUploadArea.addEventListener(
        eventName,
        () => {
          this.batchUploadArea.classList.remove("dragover");
        },
        false,
      );
    });

    this.batchUploadArea.addEventListener(
      "drop",
      (e) => {
        const files = Array.from(e.dataTransfer.files);
        this.processSelectedFiles(files);
      },
      false,
    );
  }

  /**
   * 阻止默认事件
   */
  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  /**
   * 处理文件选择
   */
  handleFileSelect(event) {
    const files = Array.from(event.target.files);
    this.processSelectedFiles(files);
  }

  /**
   * 处理选中的文件
   */
  processSelectedFiles(files) {
    console.log("=== 处理选中文件 ===");
    console.log("文件数量:", files.length);

    // 过滤图片文件
    const imageFiles = files.filter((file) => {
      const isImage = file.type.startsWith("image/");
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB限制

      if (!isImage) {
        console.warn("跳过非图片文件:", file.name);
      }
      if (!isValidSize) {
        console.warn(
          "跳过过大文件:",
          file.name,
          this.formatFileSize(file.size),
        );
      }

      return isImage && isValidSize;
    });

    if (imageFiles.length === 0) {
      this.showNotification(
        "请选择有效的图片文件（JPG、PNG、JPEG，最大10MB）",
        "error",
      );
      return;
    }

    // 添加到当前文件列表
    this.currentFiles = [...this.currentFiles, ...imageFiles];
    this.displayFileList();
    this.showNotification(
      `已添加 ${imageFiles.length} 个文件到队列`,
      "success",
    );

    // 重置文件输入
    if (this.batchFileInput) {
      this.batchFileInput.value = "";
    }
  }

  /**
   * 显示文件列表
   */
  displayFileList() {
    if (!this.fileListContent || this.currentFiles.length === 0) {
      if (this.batchFileList) {
        this.batchFileList.style.display = "none";
      }
      return;
    }

    this.batchFileList.style.display = "block";
    this.fileListContent.innerHTML = "";

    this.currentFiles.forEach((file, index) => {
      const fileItem = this.createFileItem(file, index);
      this.fileListContent.appendChild(fileItem);
    });

    // 更新按钮状态
    if (this.startBatchBtn) {
      this.startBatchBtn.disabled = false;
    }
  }

  /**
   * 创建文件项元素
   */
  createFileItem(file, index) {
    const fileItem = document.createElement("div");
    fileItem.className = "file-item";
    fileItem.dataset.index = index;

    fileItem.innerHTML = `
            <div class="file-info">
                <div class="file-icon">
                    <i class="fas fa-image"></i>
                </div>
                <div class="file-details">
                    <div class="file-name">${this.truncateFileName(file.name, 30)}</div>
                    <div class="file-size">${this.formatFileSize(file.size)}</div>
                </div>
            </div>
            <div class="file-status pending">待处理</div>
        `;

    return fileItem;
  }

  /**
   * 清空文件列表
   */
  clearFileList() {
    this.currentFiles = [];
    if (this.batchFileList) {
      this.batchFileList.style.display = "none";
    }
    if (this.startBatchBtn) {
      this.startBatchBtn.disabled = true;
    }
    this.showNotification("已清空文件列表", "info");
  }

  /**
   * 开始批量检测
   */
  async startBatchDetection() {
    if (this.currentFiles.length === 0) {
      this.showNotification("请先选择文件", "error");
      return;
    }

    console.log("=== 开始批量检测 ===");
    console.log("待处理文件数:", this.currentFiles.length);

    this.processingStats = {
      total: this.currentFiles.length,
      processed: 0,
      successful: 0,
      failed: 0,
    };

    // 显示进度
    this.showProgress(true);
    this.updateProgress(0, "准备开始批量检测...");

    // 禁用控制按钮
    this.setControlsEnabled(false);

    try {
      // 逐个处理文件
      for (let i = 0; i < this.currentFiles.length; i++) {
        const file = this.currentFiles[i];

        // 更新进度
        const progress = Math.round((i / this.currentFiles.length) * 100);
        this.updateProgress(
          progress,
          `正在处理: ${file.name} (${i + 1}/${this.currentFiles.length})`,
        );
        this.updateProgressDetails(
          `已处理: ${this.processingStats.processed}, 成功: ${this.processingStats.successful}, 失败: ${this.processingStats.failed}`,
        );

        // 更新文件状态
        this.updateFileStatus(i, "processing", "处理中");

        try {
          const result = await this.processSingleFile(file, i);
          this.processingStats.successful++;
          this.updateFileStatus(i, "completed", "已完成");

          // 添加到结果列表
          this.batchResults.push({
            file: file,
            result: result,
            timestamp: new Date(),
            index: i,
          });
        } catch (error) {
          console.error(`文件 ${file.name} 处理失败:`, error);
          this.processingStats.failed++;
          this.updateFileStatus(i, "error", "处理失败");
        }

        this.processingStats.processed++;
      }

      // 完成处理
      this.updateProgress(100, "批量检测完成！");
      this.updateProgressDetails(
        `总计: ${this.processingStats.total}, 成功: ${this.processingStats.successful}, 失败: ${this.processingStats.failed}`,
      );

      // 显示结果
      this.displayBatchResults();
      this.showNotification(
        `批量检测完成！成功处理 ${this.processingStats.successful} 个文件`,
        "success",
      );

      // 延迟隐藏进度
      setTimeout(() => {
        this.showProgress(false);
        this.clearFileList(); // 清空文件列表
      }, 2000);
    } catch (error) {
      console.error("批量检测失败:", error);
      this.showNotification("批量检测失败: " + error.message, "error");
      this.showProgress(false);
    } finally {
      this.setControlsEnabled(true);
    }
  }

  /**
   * 处理单个文件
   */
  async processSingleFile(file, index) {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`上传失败 (${response.status})`);
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error);
    }

    return result;
  }

  /**
   * 显示批量结果
   */
  displayBatchResults() {
    if (!this.batchResultsSection) return;

    this.batchResultsSection.style.display = "block";

    // 更新统计信息
    this.updateSummaryStats();

    // 显示结果网格
    this.renderResultsGrid();
  }

  /**
   * 更新统计信息
   */
  updateSummaryStats() {
    const stats = this.calculateStats();

    if (this.totalProcessed) {
      this.totalProcessed.textContent = stats.totalProcessed;
    }
    if (this.successfulDetections) {
      this.successfulDetections.textContent = stats.successfulDetections;
    }
    if (this.safetyWarnings) {
      this.safetyWarnings.textContent = stats.safetyWarnings;
    }
    if (this.avgSafetyScore) {
      this.avgSafetyScore.textContent = stats.avgSafetyScore;
    }
  }

  /**
   * 计算统计数据
   */
  calculateStats() {
    const totalProcessed = this.batchResults.length;
    let successfulDetections = 0;
    let safetyWarnings = 0;
    let totalSafetyScore = 0;

    this.batchResults.forEach((item) => {
      const result = item.result;

      // 检测成功数
      if (result.detections && Object.keys(result.detections).length > 0) {
        successfulDetections++;
      }

      // 安全警告数
      if (result.analysis && result.analysis.safety_score < 80) {
        safetyWarnings++;
      }

      // 累计安全分数
      if (result.analysis && result.analysis.safety_score) {
        totalSafetyScore += result.analysis.safety_score;
      }
    });

    return {
      totalProcessed,
      successfulDetections,
      safetyWarnings,
      avgSafetyScore:
        totalProcessed > 0 ? Math.round(totalSafetyScore / totalProcessed) : 0,
    };
  }

  /**
   * 渲染结果网格
   */
  renderResultsGrid() {
    if (!this.batchGallery) return;

    // 应用过滤和排序
    const filteredResults = this.getFilteredResults();
    const sortedResults = this.getSortedResults(filteredResults);

    // 分页
    const paginatedResults = this.getPaginatedResults(sortedResults);

    // 清空现有内容
    this.batchGallery.innerHTML = "";

    if (paginatedResults.length === 0) {
      this.batchGallery.innerHTML = `
                <div class="empty-results">
                    <i class="fas fa-search"></i>
                    <p>没有符合条件的结果</p>
                </div>
            `;
      return;
    }

    // 渲染结果项
    paginatedResults.forEach((item) => {
      const resultItem = this.createResultItem(item);
      this.batchGallery.appendChild(resultItem);
    });

    // 更新分页控制
    this.updatePaginationControls(sortedResults.length);
  }

  /**
   * 创建结果项元素
   */
  createResultItem(item) {
    const { file, result, timestamp, index } = item;

    const resultItem = document.createElement("div");
    resultItem.className = "batch-item";
    resultItem.dataset.index = index;

    // 安全等级
    const safetyClass = this.getSafetyClass(result.analysis?.safety_score || 0);
    const safetyBadge = this.getSafetyBadge(result.analysis?.safety_score || 0);

    // 检测统计
    const detectionCount = result.detections
      ? Object.values(result.detections).reduce((a, b) => a + b, 0)
      : 0;
    const detectionTypes = result.detections
      ? Object.keys(result.detections).length
      : 0;

    // 检测标签
    const detectionTags = result.detections
      ? Object.entries(result.detections)
          .map(
            ([name, count]) =>
              `<span class="batch-detection-tag">${name}: ${count}</span>`,
          )
          .join("")
      : "";

    resultItem.innerHTML = `
            <div class="batch-item-image">
                <img src="data:image/jpeg;base64,${result.image}" alt="${file.name}">
                <div class="batch-item-overlay">
                    <div class="batch-item-badge ${safetyClass}">${safetyBadge}</div>
                </div>
            </div>
            <div class="batch-item-content">
                <div class="batch-item-header">
                    <h4 class="batch-item-title">${this.truncateFileName(file.name, 25)}</h4>
                    <div class="batch-item-actions">
                        <button class="batch-item-btn" onclick="batchDetectionManager.downloadResult(${index})" title="下载结果">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="batch-item-btn" onclick="batchDetectionManager.viewDetails(${index})" title="查看详情">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
                <div class="batch-item-stats">
                    <div class="batch-stat">
                        <div class="batch-stat-number">${detectionCount}</div>
                        <div class="batch-stat-label">检测目标</div>
                    </div>
                    <div class="batch-stat">
                        <div class="batch-stat-number">${detectionTypes}</div>
                        <div class="batch-stat-label">目标类型</div>
                    </div>
                </div>
                ${
                  detectionTags
                    ? `
                    <div class="batch-item-detections">
                        <div class="batch-detection-tags">
                            ${detectionTags}
                        </div>
                    </div>
                `
                    : ""
                }
                <div class="batch-item-safety">
                    <div class="batch-safety-score ${safetyClass}">
                        ${result.analysis?.safety_score || 0}分
                    </div>
                    <div class="batch-safety-status">
                        ${this.getSafetyStatus(result.analysis?.safety_score || 0)}
                    </div>
                </div>
            </div>
        `;

    // 点击查看详情
    resultItem.addEventListener("click", (e) => {
      if (!e.target.closest(".batch-item-actions")) {
        this.viewDetails(index);
      }
    });

    return resultItem;
  }

  /**
   * 获取过滤后的结果
   */
  getFilteredResults() {
    return this.batchResults.filter((item) => {
      const result = item.result;

      // 安全等级过滤
      if (this.filters.safety !== "all") {
        const safetyScore = result.analysis?.safety_score || 0;
        switch (this.filters.safety) {
          case "safe":
            if (safetyScore < 80) return false;
            break;
          case "warning":
            if (safetyScore < 60 || safetyScore >= 80) return false;
            break;
          case "danger":
            if (safetyScore >= 60) return false;
            break;
        }
      }

      // 检测结果过滤
      if (this.filters.detection !== "all") {
        const hasDetections =
          result.detections && Object.keys(result.detections).length > 0;
        switch (this.filters.detection) {
          case "has-objects":
            if (!hasDetections) return false;
            break;
          case "no-objects":
            if (hasDetections) return false;
            break;
        }
      }

      return true;
    });
  }

  /**
   * 获取排序后的结果
   */
  getSortedResults(results) {
    return [...results].sort((a, b) => {
      let compareValue = 0;

      switch (this.sortOption) {
        case "filename":
          compareValue = a.file.name.localeCompare(b.file.name);
          break;
        case "safety-score":
          compareValue =
            (a.result.analysis?.safety_score || 0) -
            (b.result.analysis?.safety_score || 0);
          break;
        case "detection-count":
          const countA = a.result.detections
            ? Object.values(a.result.detections).reduce(
                (sum, count) => sum + count,
                0,
              )
            : 0;
          const countB = b.result.detections
            ? Object.values(b.result.detections).reduce(
                (sum, count) => sum + count,
                0,
              )
            : 0;
          compareValue = countA - countB;
          break;
        case "upload-time":
          compareValue = a.timestamp.getTime() - b.timestamp.getTime();
          break;
      }

      return this.sortOrder === "desc" ? -compareValue : compareValue;
    });
  }

  /**
   * 获取分页结果
   */
  getPaginatedResults(results) {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return results.slice(startIndex, endIndex);
  }

  /**
   * 更新分页控制
   */
  updatePaginationControls(totalResults) {
    if (!this.batchPagination) return;

    const totalPages = Math.ceil(totalResults / this.itemsPerPage);

    if (totalPages <= 1) {
      this.batchPagination.style.display = "none";
      return;
    }

    this.batchPagination.style.display = "flex";

    // 更新按钮状态
    if (this.prevPageBtn) {
      this.prevPageBtn.disabled = this.currentPage <= 1;
    }
    if (this.nextPageBtn) {
      this.nextPageBtn.disabled = this.currentPage >= totalPages;
    }

    // 更新分页信息
    if (this.paginationInfo) {
      this.paginationInfo.textContent = `第 ${this.currentPage} 页，共 ${totalPages} 页`;
    }
  }

  /**
   * 更新过滤器
   */
  updateFilter(type, value) {
    this.filters[type] = value;
    this.currentPage = 1; // 重置到第一页
    this.renderResultsGrid();
  }

  /**
   * 更新排序
   */
  updateSort(option) {
    this.sortOption = option;
    this.currentPage = 1; // 重置到第一页
    this.renderResultsGrid();
  }

  /**
   * 切换排序顺序
   */
  toggleSortOrder() {
    this.sortOrder = this.sortOrder === "desc" ? "asc" : "desc";

    // 更新按钮图标
    if (this.sortOrderBtn) {
      const icon = this.sortOrderBtn.querySelector("i");
      if (icon) {
        icon.className =
          this.sortOrder === "desc"
            ? "fas fa-sort-amount-down"
            : "fas fa-sort-amount-up";
      }
      this.sortOrderBtn.dataset.order = this.sortOrder;
    }

    this.renderResultsGrid();
  }

  /**
   * 上一页
   */
  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.renderResultsGrid();
    }
  }

  /**
   * 下一页
   */
  nextPage() {
    const filteredResults = this.getFilteredResults();
    const totalPages = Math.ceil(filteredResults.length / this.itemsPerPage);

    if (this.currentPage < totalPages) {
      this.currentPage++;
      this.renderResultsGrid();
    }
  }

  /**
   * 查看详情
   */
  viewDetails(index) {
    const item = this.batchResults.find((item) => item.index === index);
    if (!item) return;

    const { file, result } = item;

    if (this.modalTitle) {
      this.modalTitle.textContent = `检测详情 - ${file.name}`;
    }

    if (this.modalBody) {
      this.modalBody.innerHTML = this.generateDetailContent(item);
    }

    if (this.batchDetailModal) {
      this.batchDetailModal.style.display = "flex";
    }
  }

  /**
   * 生成详情内容
   */
  generateDetailContent(item) {
    const { file, result, timestamp } = item;

    // 检测统计
    const detectionStats = result.detections
      ? Object.entries(result.detections)
          .map(
            ([name, count]) =>
              `<div class="stat-item"><span class="stat-count">${count}</span><span>${name}</span></div>`,
          )
          .join("")
      : '<div class="stat-item">未检测到目标</div>';

    // 安全分析
    const safetyAnalysis = result.analysis
      ? `
            <div class="safety-score ${this.getSafetyClass(result.analysis.safety_score)}">
                <div class="score-display">
                    <span class="score-number">${result.analysis.safety_score}</span>
                    <span class="score-label">/ 100</span>
                </div>
                <div class="score-status">${this.getSafetyStatus(result.analysis.safety_score)}</div>
            </div>
            ${
              result.analysis.safety_violations.length > 0
                ? `
                <div class="safety-violations">
                    <h5>安全违规项:</h5>
                    <ul>
                        ${result.analysis.safety_violations.map((violation) => `<li>⚠️ ${violation}</li>`).join("")}
                    </ul>
                </div>
            `
                : '<div class="no-violations">✅ 无安全违规</div>'
            }
        `
      : "<div>无安全分析数据</div>";

    return `
            <div class="detail-content">
                <div class="detail-image">
                    <img src="data:image/jpeg;base64,${result.image}" alt="${file.name}" style="max-width: 100%; border-radius: 8px;">
                </div>
                
                <div class="detail-info">
                    <div class="info-section">
                        <h5><i class="fas fa-file"></i> 文件信息</h5>
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="info-label">文件名:</span>
                                <span class="info-value">${file.name}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">文件大小:</span>
                                <span class="info-value">${this.formatFileSize(file.size)}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">处理时间:</span>
                                <span class="info-value">${timestamp.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="info-section">
                        <h5><i class="fas fa-search"></i> 检测结果</h5>
                        <div class="detection-stats">
                            ${detectionStats}
                        </div>
                    </div>
                    
                    <div class="info-section">
                        <h5><i class="fas fa-shield-alt"></i> 安全评估</h5>
                        ${safetyAnalysis}
                    </div>
                </div>
                
                <div class="detail-actions">
                    <button class="btn btn-primary" onclick="batchDetectionManager.downloadResult(${item.index})">
                        <i class="fas fa-download"></i>
                        下载结果图片
                    </button>
                    <button class="btn btn-secondary" onclick="batchDetectionManager.closeModal()">
                        <i class="fas fa-times"></i>
                        关闭
                    </button>
                </div>
            </div>
        `;
  }

  /**
   * 关闭模态框
   */
  closeModal() {
    if (this.batchDetailModal) {
      this.batchDetailModal.style.display = "none";
    }
  }

  /**
   * 下载单个结果
   */
  downloadResult(index) {
    const item = this.batchResults.find((item) => item.index === index);
    if (!item) return;

    const { file, result } = item;

    // 创建下载链接
    const link = document.createElement("a");
    link.href = `data:image/jpeg;base64,${result.image}`;
    link.download = `检测结果_${file.name.replace(/\.[^/.]+$/, "")}.jpg`;
    link.click();
  }

  /**
   * 下载所有结果
   */
  async downloadAllResults() {
    if (this.batchResults.length === 0) {
      this.showNotification("没有可下载的结果", "error");
      return;
    }

    // 创建ZIP文件（简化版，实际可能需要使用JSZip库）
    this.showNotification("正在准备下载...", "info");

    try {
      // 这里可以实现批量下载逻辑
      // 由于浏览器限制，可能需要逐个下载或使用服务器端打包
      for (let i = 0; i < this.batchResults.length; i++) {
        const item = this.batchResults[i];
        setTimeout(() => {
          this.downloadResult(item.index);
        }, i * 200); // 延迟下载避免浏览器阻止
      }

      this.showNotification("开始批量下载", "success");
    } catch (error) {
      console.error("批量下载失败:", error);
      this.showNotification("批量下载失败", "error");
    }
  }

  /**
   * 导出检测报告
   */
  exportDetectionReport() {
    if (this.batchResults.length === 0) {
      this.showNotification("没有可导出的数据", "error");
      return;
    }

    const stats = this.calculateStats();
    const timestamp = new Date().toLocaleString();

    // 生成报告内容
    const reportData = {
      title: "批量检测报告",
      timestamp: timestamp,
      summary: stats,
      details: this.batchResults.map((item) => ({
        filename: item.file.name,
        fileSize: this.formatFileSize(item.file.size),
        processTime: item.timestamp.toLocaleString(),
        detections: item.result.detections || {},
        safetyScore: item.result.analysis?.safety_score || 0,
        safetyViolations: item.result.analysis?.safety_violations || [],
      })),
    };

    // 创建下载链接
    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `批量检测报告_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
    link.click();

    this.showNotification("检测报告已导出", "success");
  }

  /**
   * 清空所有结果
   */
  clearAllResults() {
    if (this.batchResults.length === 0) return;

    if (confirm("确定要清空所有检测结果吗？此操作不可撤销。")) {
      this.batchResults = [];
      this.currentPage = 1;

      if (this.batchResultsSection) {
        this.batchResultsSection.style.display = "none";
      }

      this.showNotification("已清空所有结果", "info");
    }
  }

  // ========== 工具方法 ==========

  /**
   * 显示进度
   */
  showProgress(show) {
    if (this.batchProgress) {
      this.batchProgress.style.display = show ? "flex" : "none";
    }
  }

  /**
   * 更新进度
   */
  updateProgress(percentage, text) {
    if (this.batchProgressFill) {
      this.batchProgressFill.style.width = `${percentage}%`;
    }
    if (this.batchProgressPercentage) {
      this.batchProgressPercentage.textContent = `${percentage}%`;
    }
    if (this.batchProgressText) {
      this.batchProgressText.textContent = text;
    }
  }

  /**
   * 更新进度详情
   */
  updateProgressDetails(details) {
    if (this.batchProgressDetails) {
      this.batchProgressDetails.textContent = details;
    }
  }

  /**
   * 更新文件状态
   */
  updateFileStatus(index, status, text) {
    const fileItem = this.fileListContent?.querySelector(
      `[data-index="${index}"]`,
    );
    if (!fileItem) return;

    const statusElement = fileItem.querySelector(".file-status");
    if (statusElement) {
      statusElement.className = `file-status ${status}`;
      statusElement.textContent = text;
    }
  }

  /**
   * 设置控制按钮状态
   */
  setControlsEnabled(enabled) {
    const controls = [
      this.startBatchBtn,
      this.clearFilesBtn,
      this.batchFileInput,
    ];

    controls.forEach((control) => {
      if (control) {
        control.disabled = !enabled;
      }
    });
  }

  /**
   * 获取安全等级类名
   */
  getSafetyClass(score) {
    if (score >= 80) return "safe";
    if (score >= 60) return "warning";
    return "danger";
  }

  /**
   * 获取安全徽章文本
   */
  getSafetyBadge(score) {
    if (score >= 80) return "安全";
    if (score >= 60) return "警告";
    return "危险";
  }

  /**
   * 获取安全状态文本
   */
  getSafetyStatus(score) {
    if (score >= 80) return "安全状态";
    if (score >= 60) return "需要注意";
    return "存在风险";
  }

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  /**
   * 截断文件名
   */
  truncateFileName(filename, maxLength) {
    if (filename.length <= maxLength) return filename;

    const extension = filename.split(".").pop();
    const nameWithoutExt = filename.slice(0, -(extension.length + 1));
    const truncatedName =
      nameWithoutExt.slice(0, maxLength - extension.length - 4) + "...";

    return `${truncatedName}.${extension}`;
  }

  /**
   * 显示通知
   */
  showNotification(message, type = "info") {
    // 使用全局通知函数
    if (typeof showNotification === "function") {
      showNotification(message, type);
    } else {
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }
}

// 全局实例
let batchDetectionManager;

// 页面加载完成后初始化
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("batch-tab")) {
    batchDetectionManager = new BatchDetectionManager();
    console.log("批量检测管理器已初始化");
  }
});
