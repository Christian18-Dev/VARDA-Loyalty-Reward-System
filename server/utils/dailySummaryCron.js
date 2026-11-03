import cron from 'node-cron';
import { getMealSummaryData, buildSummaryExcelWorkbook, formatManilaDateTime } from './summaryReportService.js';
import { sendDailyMealSummaryEmail } from './emailService.js';

/**
 * Generates the daily meal summary Excel buffer and sends it via email.
 * Can be called by the 11:00 PM cron job or manually triggered via API.
 */
export const executeDailySummaryEmail = async ({ startDate, endDate, limaBatch, customRecipients } = {}) => {
  const summaryData = await getMealSummaryData({ startDate, endDate, limaBatch });
  const workbook = buildSummaryExcelWorkbook(summaryData);
  const excelBuffer = await workbook.xlsx.writeBuffer();

  // Derive a clean filename date in PH time
  const cleanLabel = (startDate || summaryData.dateRangeLabel.replace(' (Today)', ''))
    .replace(/[^a-zA-Z0-9-_]/g, '_');
  const filename = `Daily_Meal_Summary_Report_${cleanLabel}.xlsx`;

  const emailResult = await sendDailyMealSummaryEmail({
    recipients: customRecipients,
    summaryData,
    excelBuffer,
    filename
  });

  return {
    success: true,
    filename,
    dateRangeLabel: summaryData.dateRangeLabel,
    metrics: summaryData.metrics,
    ...emailResult
  };
};

let cronTask = null;

/**
 * Helper to execute with automatic retries in case of transient network/SMTP hiccups at 11:00 PM.
 */
const executeWithRetry = async (maxAttempts = 3, delayMs = 15000) => {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await executeDailySummaryEmail();
    } catch (err) {
      lastError = err;
      console.error(
        `⚠️ [Cron 11:00 PM PH] Attempt ${attempt}/${maxAttempts} failed:`,
        err.message || err
      );
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastError;
};

/**
 * Initializes the automated 11:00 PM (Asia/Manila) daily summary email cron job.
 */
export const initDailySummaryCron = () => {
  if (cronTask) {
    return cronTask;
  }

  // Schedule for 11:00 PM every day in Philippine Time (Asia/Manila, UTC+8)
  cronTask = cron.schedule(
    '0 23 * * *',
    async () => {
      console.log('⏰ [Cron 11:00 PM PH] Starting automated Daily Meal Summary Report email...');
      try {
        const result = await executeWithRetry(3, 15000);
        console.log(
          `✅ [Cron 11:00 PM PH] Daily Meal Summary Report sent to ${result.recipients} (${result.filename})`
        );
      } catch (error) {
        console.error('❌ [Cron 11:00 PM PH] All attempts failed to send Daily Meal Summary Report:', error);
      }
    },
    {
      name: 'daily-meal-summary-email',
      timezone: 'Asia/Manila',
      noOverlap: true
    }
  );

  const nextRun = cronTask.getNextRun ? cronTask.getNextRun() : null;
  if (nextRun) {
    console.log(
      `📅 Scheduled Daily Meal Summary Email at 11:00 PM (Asia/Manila) | Next run: ${formatManilaDateTime(nextRun)} PH (${nextRun.toISOString()})`
    );
  } else {
    console.log('📅 Scheduled Daily Meal Summary Email cron job at 11:00 PM (Asia/Manila)');
  }

  return cronTask;
};
