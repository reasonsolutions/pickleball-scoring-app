/**
 * Cloudinary Usage Monitoring & Analytics
 * 
 * Tracks image uploads, compression metrics, and credit usage
 * to help optimize Cloudinary spending
 */

class CloudinaryMonitor {
  constructor() {
    this.uploads = [];
    this.compressionStats = {
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      totalUploads: 0,
      byType: {}
    };
    this.storageKey = 'cloudinary_monitoring_data';
    this.loadFromStorage();
  }

  /**
   * Record an image upload with compression metrics
   */
  recordUpload(uploadData) {
    const {
      publicId,
      uploadType,
      originalSize,
      compressedSize,
      compressionRatio,
      timestamp = new Date()
    } = uploadData;

    const record = {
      publicId,
      uploadType,
      originalSize,
      compressedSize,
      compressionRatio,
      timestamp,
      creditsSaved: this.calculateCreditsSaved(originalSize, compressedSize)
    };

    this.uploads.push(record);

    // Update statistics
    this.compressionStats.totalOriginalSize += originalSize;
    this.compressionStats.totalCompressedSize += compressedSize;
    this.compressionStats.totalUploads += 1;

    if (!this.compressionStats.byType[uploadType]) {
      this.compressionStats.byType[uploadType] = {
        count: 0,
        originalSize: 0,
        compressedSize: 0,
        totalCompressionRatio: 0
      };
    }

    this.compressionStats.byType[uploadType].count += 1;
    this.compressionStats.byType[uploadType].originalSize += originalSize;
    this.compressionStats.byType[uploadType].compressedSize += compressedSize;
    this.compressionStats.byType[uploadType].totalCompressionRatio += compressionRatio;

    this.saveToStorage();
    this.logUploadMetrics(record);

    return record;
  }

  /**
   * Calculate estimated credits saved by compression
   * Based on Cloudinary's credit system:
   * - 1 credit = 1 GB of storage or bandwidth
   */
  calculateCreditsSaved(originalSize, compressedSize) {
    const sizeDifference = originalSize - compressedSize;
    // Rough estimate: 1 credit per GB
    // This is simplified; actual credits depend on plan
    return (sizeDifference / (1024 * 1024 * 1024)).toFixed(6);
  }

  /**
   * Get compression statistics
   */
  getCompressionStats() {
    const totalSaved = this.compressionStats.totalOriginalSize - this.compressionStats.totalCompressedSize;
    const avgCompressionRatio = this.compressionStats.totalUploads > 0
      ? ((totalSaved / this.compressionStats.totalOriginalSize) * 100).toFixed(1)
      : 0;

    return {
      totalUploads: this.compressionStats.totalUploads,
      totalOriginalSize: this.compressionStats.totalOriginalSize,
      totalCompressedSize: this.compressionStats.totalCompressedSize,
      totalSaved,
      averageCompressionRatio: avgCompressionRatio,
      byType: this.compressionStats.byType,
      estimatedCreditsSaved: this.calculateCreditsSaved(
        this.compressionStats.totalOriginalSize,
        this.compressionStats.totalCompressedSize
      )
    };
  }

  /**
   * Get statistics for a specific upload type
   */
  getTypeStats(uploadType) {
    return this.compressionStats.byType[uploadType] || null;
  }

  /**
   * Get recent uploads
   */
  getRecentUploads(limit = 10) {
    return this.uploads.slice(-limit).reverse();
  }

  /**
   * Get uploads by type
   */
  getUploadsByType(uploadType) {
    return this.uploads.filter(u => u.uploadType === uploadType);
  }

  /**
   * Get uploads within date range
   */
  getUploadsByDateRange(startDate, endDate) {
    return this.uploads.filter(u => {
      const uploadDate = new Date(u.timestamp);
      return uploadDate >= startDate && uploadDate <= endDate;
    });
  }

  /**
   * Calculate daily statistics
   */
  getDailyStats() {
    const dailyStats = {};

    this.uploads.forEach(upload => {
      const date = new Date(upload.timestamp).toISOString().split('T')[0];
      if (!dailyStats[date]) {
        dailyStats[date] = {
          count: 0,
          originalSize: 0,
          compressedSize: 0,
          creditsSaved: 0
        };
      }
      dailyStats[date].count += 1;
      dailyStats[date].originalSize += upload.originalSize;
      dailyStats[date].compressedSize += upload.compressedSize;
      dailyStats[date].creditsSaved += parseFloat(upload.creditsSaved);
    });

    return dailyStats;
  }

  /**
   * Log upload metrics to console
   */
  logUploadMetrics(record) {
    console.group('📸 Cloudinary Upload Recorded');
    console.log(`Type: ${record.uploadType}`);
    console.log(`Original Size: ${this.formatBytes(record.originalSize)}`);
    console.log(`Compressed Size: ${this.formatBytes(record.compressedSize)}`);
    console.log(`Compression Ratio: ${record.compressionRatio.toFixed(1)}%`);
    console.log(`Credits Saved: ~${record.creditsSaved}`);
    console.groupEnd();
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Save monitoring data to localStorage
   */
  saveToStorage() {
    try {
      const data = {
        uploads: this.uploads,
        compressionStats: this.compressionStats,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save monitoring data to localStorage:', error);
    }
  }

  /**
   * Load monitoring data from localStorage
   */
  loadFromStorage() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        this.uploads = parsed.uploads || [];
        this.compressionStats = parsed.compressionStats || this.compressionStats;
      }
    } catch (error) {
      console.warn('Failed to load monitoring data from localStorage:', error);
    }
  }

  /**
   * Clear all monitoring data
   */
  clearData() {
    this.uploads = [];
    this.compressionStats = {
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      totalUploads: 0,
      byType: {}
    };
    localStorage.removeItem(this.storageKey);
  }

  /**
   * Export monitoring data as JSON
   */
  exportData() {
    return {
      exports: {
        timestamp: new Date().toISOString(),
        stats: this.getCompressionStats(),
        dailyStats: this.getDailyStats(),
        recentUploads: this.getRecentUploads(50)
      }
    };
  }

  /**
   * Generate a monitoring report
   */
  generateReport() {
    const stats = this.getCompressionStats();
    const dailyStats = this.getDailyStats();

    return `
╔════════════════════════════════════════════════════════════════╗
║           CLOUDINARY OPTIMIZATION REPORT                       ║
╚════════════════════════════════════════════════════════════════╝

📊 OVERALL STATISTICS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Uploads:              ${stats.totalUploads}
Total Original Size:        ${this.formatBytes(stats.totalOriginalSize)}
Total Compressed Size:      ${this.formatBytes(stats.totalCompressedSize)}
Total Size Saved:           ${this.formatBytes(stats.totalSaved)}
Average Compression Ratio:  ${stats.averageCompressionRatio}%
Estimated Credits Saved:    ~${stats.estimatedCreditsSaved}

📈 BY UPLOAD TYPE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${Object.entries(stats.byType)
  .map(([type, data]) => {
    const avgRatio = data.count > 0 ? (data.totalCompressionRatio / data.count).toFixed(1) : 0;
    return `${type.padEnd(15)} | Count: ${data.count.toString().padEnd(3)} | Avg Compression: ${avgRatio}%`;
  })
  .join('\n')}

📅 DAILY BREAKDOWN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${Object.entries(dailyStats)
  .slice(-7) // Last 7 days
  .map(([date, data]) => {
    const saved = this.formatBytes(data.originalSize - data.compressedSize);
    return `${date} | Uploads: ${data.count} | Saved: ${saved}`;
  })
  .join('\n')}

💡 RECOMMENDATIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${this.generateRecommendations(stats)}

═══════════════════════════════════════════════════════════════════
Generated: ${new Date().toISOString()}
    `;
  }

  /**
   * Generate recommendations based on current stats
   */
  generateRecommendations(stats) {
    const recommendations = [];

    if (stats.averageCompressionRatio < 50) {
      recommendations.push('✓ Excellent compression ratio! Keep it up.');
    } else if (stats.averageCompressionRatio < 70) {
      recommendations.push('⚠ Consider increasing compression quality settings.');
    } else {
      recommendations.push('⚠ Compression ratio is lower than expected. Review settings.');
    }

    const typeStats = stats.byType;
    Object.entries(typeStats).forEach(([type, data]) => {
      if (data.count > 100) {
        recommendations.push(`✓ ${type} uploads are well-optimized (${data.count} uploads).`);
      }
    });

    if (stats.totalUploads < 10) {
      recommendations.push('ℹ Collect more data for better insights (10+ uploads recommended).');
    }

    return recommendations.length > 0
      ? recommendations.map(r => `${r}`).join('\n')
      : 'No specific recommendations at this time.';
  }
}

// Create singleton instance
const cloudinaryMonitor = new CloudinaryMonitor();

export default cloudinaryMonitor;
export { CloudinaryMonitor };
