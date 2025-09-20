import { AnalyticsData } from './analyticsService';
import { Platform, Alert, Share } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export interface ExportOptions {
  format: 'csv' | 'pdf';
  timeRange: '7d' | '30d' | '90d';
  includeCharts: boolean;
}

export class ExportService {
  /**
   * Export analytics data in the specified format
   */
  async exportAnalytics(
    data: AnalyticsData, 
    options: ExportOptions
  ): Promise<void> {
    try {
      if (options.format === 'csv') {
        await this.exportToCSV(data, options);
      } else if (options.format === 'pdf') {
        await this.exportToPDF(data, options);
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert(
        'Export Failed',
        'There was an error exporting your analytics data. Please try again.',
        [{ text: 'OK' }]
      );
    }
  }

  /**
   * Export analytics data to CSV format
   */
  private async exportToCSV(data: AnalyticsData, options: ExportOptions): Promise<void> {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `sellar-analytics-${options.timeRange}-${timestamp}.csv`;
    
    // Generate CSV content
    const csvContent = this.generateCSVContent(data, options);
    
    // Save file
    const fileUri = `${FileSystem.documentDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Share the file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Export Analytics Report',
      });
    } else {
      // Fallback to system share
      await Share.share({
        url: fileUri,
        title: 'Analytics Report',
        message: `Sellar Analytics Report - ${options.timeRange}`,
      });
    }

    Alert.alert(
      'Export Successful',
      `Your analytics report has been exported as ${filename}`,
      [{ text: 'OK' }]
    );
  }

  /**
   * Export analytics data to PDF format
   */
  private async exportToPDF(data: AnalyticsData, options: ExportOptions): Promise<void> {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `sellar-analytics-${options.timeRange}-${timestamp}.pdf`;
    
    // Generate PDF content (simplified HTML that can be converted to PDF)
    const htmlContent = this.generateHTMLContent(data, options);
    
    // For now, we'll create an HTML file that can be opened in browser
    // In a full implementation, you'd use a library like react-native-pdf-lib
    const fileUri = `${FileSystem.documentDirectory}${filename.replace('.pdf', '.html')}`;
    await FileSystem.writeAsStringAsync(fileUri, htmlContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Share the HTML file
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/html',
        dialogTitle: 'Export Analytics Report',
      });
    } else {
      await Share.share({
        url: fileUri,
        title: 'Analytics Report',
        message: `Sellar Analytics Report - ${options.timeRange}`,
      });
    }

    Alert.alert(
      'Export Successful',
      `Your analytics report has been exported as ${filename.replace('.pdf', '.html')}`,
      [{ text: 'OK' }]
    );
  }

  /**
   * Generate CSV content from analytics data
   */
  private generateCSVContent(data: AnalyticsData, options: ExportOptions): string {
    const lines: string[] = [];
    
    // Header
    lines.push('Sellar Analytics Report');
    lines.push(`Time Range: ${options.timeRange}`);
    lines.push(`Generated: ${new Date().toLocaleDateString()}`);
    lines.push(''); // Empty line

    // Overview Metrics
    lines.push('OVERVIEW METRICS');
    lines.push('Metric,Value');
    lines.push(`Total Listings,${data.totalListings}`);
    lines.push(`Active Listings,${data.activeListings}`);
    lines.push(`Total Views,${data.totalViews}`);
    lines.push(`Total Messages,${data.totalMessages}`);
    lines.push(`Total Offers,${data.totalOffers}`);
    lines.push(`Total Reviews,${data.totalReviews}`);
    lines.push(`Average Rating,${data.averageRating.toFixed(2)}`);
    lines.push(`Conversion Rate,${data.conversionRate.toFixed(2)}%`);
    lines.push(`Response Rate,${data.responseRate.toFixed(2)}%`);
    lines.push(''); // Empty line

    // Time-based Metrics
    lines.push('TIME-BASED METRICS');
    lines.push('Metric,Current Period,Previous Period,Growth %');
    lines.push(`Views,${data.viewsThisWeek},${data.viewsLastWeek},${this.calculateGrowthPercentage(data.viewsThisWeek, data.viewsLastWeek)}%`);
    lines.push(`Messages,${data.messagesThisWeek},${data.messagesLastWeek},${this.calculateGrowthPercentage(data.messagesThisWeek, data.messagesLastWeek)}%`);
    lines.push(''); // Empty line

    // Top Performing Listings
    if (data.topPerformingListings.length > 0) {
      lines.push('TOP PERFORMING LISTINGS');
      lines.push('Title,Views,Messages,Offers,Conversion Rate');
      data.topPerformingListings.forEach(listing => {
        const conversionRate = listing.views > 0 ? ((listing.messages / listing.views) * 100).toFixed(2) : '0.00';
        lines.push(`"${listing.title}",${listing.views},${listing.messages},${listing.offers},${conversionRate}%`);
      });
      lines.push(''); // Empty line
    }

    // Category Performance
    if (data.categoryPerformance.length > 0) {
      lines.push('CATEGORY PERFORMANCE');
      lines.push('Category,Listings,Views,Messages,Conversion Rate');
      data.categoryPerformance.forEach(category => {
        const conversionRate = category.views > 0 ? ((category.messages / category.views) * 100).toFixed(2) : '0.00';
        lines.push(`"${category.category}",${category.listings},${category.views},${category.messages},${conversionRate}%`);
      });
      lines.push(''); // Empty line
    }

    // Daily Trends
    if (data.dailyViews.length > 0) {
      lines.push('DAILY TRENDS');
      lines.push('Date,Views,Messages');
      data.dailyViews.forEach(day => {
        const date = new Date(day.date).toLocaleDateString();
        lines.push(`${date},${day.views},${day.messages}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Generate HTML content for PDF export
   */
  private generateHTMLContent(data: AnalyticsData, options: ExportOptions): string {
    const currentDate = new Date().toLocaleDateString();
    const timeRangeLabel = options.timeRange === '7d' ? '7 Days' : options.timeRange === '30d' ? '30 Days' : '90 Days';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Sellar Analytics Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 20px;
            color: #333;
            line-height: 1.6;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #007AFF;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #007AFF;
            margin: 0;
            font-size: 28px;
        }
        .header p {
            margin: 5px 0;
            color: #666;
        }
        .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
        }
        .section h2 {
            color: #007AFF;
            border-bottom: 1px solid #E5E5E7;
            padding-bottom: 10px;
            margin-bottom: 15px;
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        .metric-card {
            background: #F2F2F7;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
        }
        .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: #007AFF;
            margin-bottom: 5px;
        }
        .metric-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        .table th, .table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #E5E5E7;
        }
        .table th {
            background: #F2F2F7;
            font-weight: 600;
            color: #007AFF;
        }
        .growth-positive {
            color: #34C759;
            font-weight: 600;
        }
        .growth-negative {
            color: #FF3B30;
            font-weight: 600;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            color: #666;
            font-size: 12px;
            border-top: 1px solid #E5E5E7;
            padding-top: 20px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Sellar Analytics Report</h1>
        <p>Time Range: ${timeRangeLabel}</p>
        <p>Generated: ${currentDate}</p>
    </div>

    <div class="section">
        <h2>Overview Metrics</h2>
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value">${data.totalListings}</div>
                <div class="metric-label">Total Listings</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.activeListings}</div>
                <div class="metric-label">Active Listings</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.totalViews.toLocaleString()}</div>
                <div class="metric-label">Total Views</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.totalMessages.toLocaleString()}</div>
                <div class="metric-label">Total Messages</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.averageRating.toFixed(1)}</div>
                <div class="metric-label">Average Rating</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${data.conversionRate.toFixed(1)}%</div>
                <div class="metric-label">Conversion Rate</div>
            </div>
        </div>
    </div>

    <div class="section">
        <h2>Performance Comparison</h2>
        <table class="table">
            <thead>
                <tr>
                    <th>Metric</th>
                    <th>Current Period</th>
                    <th>Previous Period</th>
                    <th>Growth</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>Views</td>
                    <td>${data.viewsThisWeek.toLocaleString()}</td>
                    <td>${data.viewsLastWeek.toLocaleString()}</td>
                    <td class="${data.viewsThisWeek >= data.viewsLastWeek ? 'growth-positive' : 'growth-negative'}">
                        ${this.calculateGrowthPercentage(data.viewsThisWeek, data.viewsLastWeek)}%
                    </td>
                </tr>
                <tr>
                    <td>Messages</td>
                    <td>${data.messagesThisWeek.toLocaleString()}</td>
                    <td>${data.messagesLastWeek.toLocaleString()}</td>
                    <td class="${data.messagesThisWeek >= data.messagesLastWeek ? 'growth-positive' : 'growth-negative'}">
                        ${this.calculateGrowthPercentage(data.messagesThisWeek, data.messagesLastWeek)}%
                    </td>
                </tr>
            </tbody>
        </table>
    </div>

    ${data.topPerformingListings.length > 0 ? `
    <div class="section">
        <h2>Top Performing Listings</h2>
        <table class="table">
            <thead>
                <tr>
                    <th>Title</th>
                    <th>Views</th>
                    <th>Messages</th>
                    <th>Offers</th>
                    <th>Conversion Rate</th>
                </tr>
            </thead>
            <tbody>
                ${data.topPerformingListings.map(listing => `
                <tr>
                    <td>${listing.title}</td>
                    <td>${listing.views.toLocaleString()}</td>
                    <td>${listing.messages.toLocaleString()}</td>
                    <td>${listing.offers.toLocaleString()}</td>
                    <td>${listing.views > 0 ? ((listing.messages / listing.views) * 100).toFixed(1) : '0.0'}%</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}

    ${data.categoryPerformance.length > 0 ? `
    <div class="section">
        <h2>Category Performance</h2>
        <table class="table">
            <thead>
                <tr>
                    <th>Category</th>
                    <th>Listings</th>
                    <th>Views</th>
                    <th>Messages</th>
                    <th>Conversion Rate</th>
                </tr>
            </thead>
            <tbody>
                ${data.categoryPerformance.map(category => `
                <tr>
                    <td>${category.category}</td>
                    <td>${category.listings}</td>
                    <td>${category.views.toLocaleString()}</td>
                    <td>${category.messages.toLocaleString()}</td>
                    <td>${category.views > 0 ? ((category.messages / category.views) * 100).toFixed(1) : '0.0'}%</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
    ` : ''}

    <div class="footer">
        <p>Generated by Sellar Mobile App</p>
        <p>This report contains your business analytics data for the selected time period.</p>
    </div>
</body>
</html>
    `;
  }

  /**
   * Calculate growth percentage
   */
  private calculateGrowthPercentage(current: number, previous: number): string {
    if (previous === 0) return current > 0 ? '100' : '0';
    const growth = ((current - previous) / previous) * 100;
    return growth > 0 ? `+${growth.toFixed(1)}` : growth.toFixed(1);
  }
}

export const exportService = new ExportService();
