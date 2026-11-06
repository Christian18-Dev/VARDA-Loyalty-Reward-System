import ExcelJS from 'exceljs';
import AvailHistory from '../models/AvailHistory.js';
import User from '../models/User.js';
import Voucher from '../models/Voucher.js';
import { getTodayBreakfastVoucherWindow } from './breakfastVoucherService.js';

/**
 * Format a Date to Philippine Time string
 */
export const formatManilaDateTime = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

export const formatManilaDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  });
};

/**
 * Compute UTC boundaries for a Philippine Time 5:00 AM – 5:00 AM window.
 */
export const getWindowBoundaries = (startDate, endDate) => {
  let startUTC;
  let endUTC;
  let label = '';

  if (startDate || endDate) {
    if (startDate) {
      // e.g. "2026-10-30" → PH 5:00 AM → UTC 2026-10-29T21:00:00Z
      const [year, month, day] = startDate.split('-').map(Number);
      const windowStartPH = new Date(Date.UTC(year, month - 1, day, 5 - 8, 0, 0, 0)); // 5AM PH = -3AM UTC
      // 5AM PH = UTC - 8h = previous day at 21:00 UTC
      startUTC = new Date(Date.UTC(year, month - 1, day - 1, 21, 0, 0, 0));
    }
    if (endDate) {
      // End window is next day's 5AM PH = that day at 21:00 UTC
      const [year, month, day] = endDate.split('-').map(Number);
      endUTC = new Date(Date.UTC(year, month - 1, day, 21, 0, 0, 0));
    } else if (startDate) {
      // If only startDate, end is the next day's 5AM PH
      const [year, month, day] = startDate.split('-').map(Number);
      endUTC = new Date(Date.UTC(year, month - 1, day, 21, 0, 0, 0));
    }

    if (startDate && endDate) {
      label = `${startDate} to ${endDate}`;
    } else if (startDate) {
      label = `${startDate}`;
    } else {
      label = `Until ${endDate}`;
    }
  } else {
    // Default: current 5AM-5AM window in PH time (pure UTC math — works on any server timezone)
    const now = new Date();
    const phShifted = new Date(now.getTime() + (8 * 3600000));

    // If current PH hour is before 5:00 AM, the active 5AM-5AM meal window started yesterday in PH
    const windowDayPH = new Date(Date.UTC(
      phShifted.getUTCFullYear(),
      phShifted.getUTCMonth(),
      phShifted.getUTCDate() - (phShifted.getUTCHours() < 5 ? 1 : 0)
    ));

    const year = windowDayPH.getUTCFullYear();
    const month = windowDayPH.getUTCMonth(); // 0-indexed
    const day = windowDayPH.getUTCDate();

    // 5:00 AM PH on (year, month, day) = previous day 21:00:00 UTC
    startUTC = new Date(Date.UTC(year, month, day - 1, 21, 0, 0, 0));
    endUTC = new Date(Date.UTC(year, month, day, 21, 0, 0, 0));

    const phDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    label = `${phDate} (Today)`;
  }

  return { startUTC, endUTC, label };
};

/**
 * Fetch and aggregate meal summary data.
 *
 * DATA MODEL REALITY:
 *  - AvailHistory = one document per student per meal per day they availed.
 *  - There is no separate "registered but not availed" collection.
 *  - "Registered" = total active LIMA students (they are all eligible).
 *  - "Availed" = distinct students who appear in AvailHistory for that meal/date.
 *  - "Unavailed" = students NOT in AvailHistory for that meal on that date.
 */
export const getMealSummaryData = async ({ startDate, endDate, limaBatch } = {}) => {
  const { startUTC, endUTC, label } = getWindowBoundaries(startDate, endDate);

  // 1. Fetch all active LIMA students
  const studentQuery = { university: 'lima' };
  if (limaBatch && ['B29', 'B31', 'B32', 'B33'].includes(limaBatch)) {
    studentQuery.limaBatch = limaBatch;
  }
  const allLimaStudents = await User.find(studentQuery)
    .select('idNumber accountID firstName lastName limaBatch university role')
    .lean();

  // Use all LIMA users (students + guests) as the registered population
  const studentMap = new Map(allLimaStudents.map(s => [s.idNumber, s]));

  // 2. Fetch AvailHistory for the date window
  const histQuery = {
    $or: [
      { registrationDate: { $gte: startUTC, $lt: endUTC } },
      { availedAt: { $gte: startUTC, $lt: endUTC } }
    ]
  };

  // Apply limaBatch filter on avail history if needed
  if (limaBatch && ['B29', 'B31', 'B32', 'B33'].includes(limaBatch)) {
    const batchStudentIds = allLimaStudents.map(s => s.idNumber);
    histQuery.idNumber = { $in: batchStudentIds };
  }

  const availHistories = await AvailHistory.find(histQuery)
    .sort({ availedAt: -1 })
    .lean();

  // 3. Build availed sets by meal (unique per student per meal)
  const availedByMeal = {
    breakfast: new Set(),
    lunch: new Set(),
    dinner: new Set()
  };
  const availedEntriesByMeal = { breakfast: [], lunch: [], dinner: [] };

  availHistories.forEach(h => {
    if (availedByMeal[h.mealType] !== undefined) {
      availedByMeal[h.mealType].add(h.idNumber);
      availedEntriesByMeal[h.mealType].push(h);
    }
  });

  const totalRegistered = allLimaStudents.length;

  // 4. Build metrics
  const calcRate = (availed, total) =>
    total > 0 ? Number(((availed / total) * 100).toFixed(1)) : 0;

  const metrics = {
    totalRegisteredStudents: totalRegistered,
    breakfast: {
      registered: totalRegistered,
      availed: availedByMeal.breakfast.size,
      unavailed: totalRegistered - availedByMeal.breakfast.size,
      rate: calcRate(availedByMeal.breakfast.size, totalRegistered)
    },
    lunch: {
      registered: totalRegistered,
      availed: availedByMeal.lunch.size,
      unavailed: totalRegistered - availedByMeal.lunch.size,
      rate: calcRate(availedByMeal.lunch.size, totalRegistered)
    },
    dinner: {
      registered: totalRegistered,
      availed: availedByMeal.dinner.size,
      unavailed: totalRegistered - availedByMeal.dinner.size,
      rate: calcRate(availedByMeal.dinner.size, totalRegistered)
    }
  };
  const totalAvailed = availedByMeal.breakfast.size + availedByMeal.lunch.size + availedByMeal.dinner.size;
  const totalPossible = totalRegistered * 3;
  metrics.total = {
    registered: totalPossible,
    availed: totalAvailed,
    unavailed: totalPossible - totalAvailed,
    rate: calcRate(totalAvailed, totalPossible)
  };

  // 5. Batch breakdown
  const BATCHES = ['B29', 'B31', 'B32', 'B33'];
  const batchBreakdown = BATCHES.map(batch => {
    const batchStudents = allLimaStudents.filter(s => s.limaBatch === batch);
    const batchIdSet = new Set(batchStudents.map(s => s.idNumber));

    const bfAvailed = availedEntriesByMeal.breakfast.filter(h => batchIdSet.has(h.idNumber)).length;
    const lAvailed = availedEntriesByMeal.lunch.filter(h => batchIdSet.has(h.idNumber)).length;
    const dAvailed = availedEntriesByMeal.dinner.filter(h => batchIdSet.has(h.idNumber)).length;
    const batchTotal = batchStudents.length;
    const totalMealsAvailed = bfAvailed + lAvailed + dAvailed;
    const totalMealsPossible = batchTotal * 3;

    return {
      batch,
      registeredStudents: batchTotal,
      breakfast: { availed: bfAvailed, rate: calcRate(bfAvailed, batchTotal) },
      lunch: { availed: lAvailed, rate: calcRate(lAvailed, batchTotal) },
      dinner: { availed: dAvailed, rate: calcRate(dAvailed, batchTotal) },
      totalMeals: { possible: totalMealsPossible, availed: totalMealsAvailed },
      overallRate: calcRate(totalMealsAvailed, totalMealsPossible)
    };
  });

  // 6. Availed list: all history entries with enriched student info
  const availedList = availHistories.map(h => {
    const s = studentMap.get(h.idNumber);
    return {
      accountID: h.accountID || s?.accountID || '-',
      limaBatch: h.limaBatch || s?.limaBatch || '-',
      idNumber: h.idNumber,
      studentName: `${h.lastName || s?.lastName || ''}, ${h.firstName || s?.firstName || ''}`.trim() || 'Unknown',
      mealType: h.mealType ? h.mealType.charAt(0).toUpperCase() + h.mealType.slice(1) : '-',
      availedAt: h.availedAt,
      processedBy: h.availedBy?.name || 'Cashier'
    };
  });

  // 7. Unavailed list: students who did NOT avail each meal
  const unavailedList = [];

  // Only include actual students with an assigned LIMA batch in the unavailed list
  const eligibleForUnavailed = allLimaStudents.filter(
    s => s.role === 'student' && ['B29', 'B31', 'B32', 'B33'].includes(s.limaBatch)
  );

  eligibleForUnavailed.forEach(s => {
    const studentName = `${s.lastName || ''}, ${s.firstName || ''}`.trim() || 'Unknown';
    const accountID = s.accountID || '-';
    const batch = s.limaBatch;

    if (!availedByMeal.breakfast.has(s.idNumber)) {
      unavailedList.push({
        accountID,
        limaBatch: batch,
        idNumber: s.idNumber,
        studentName,
        missedMeal: 'Breakfast',
        status: 'Unavailed'
      });
    }
    if (!availedByMeal.lunch.has(s.idNumber)) {
      unavailedList.push({
        accountID,
        limaBatch: batch,
        idNumber: s.idNumber,
        studentName,
        missedMeal: 'Lunch',
        status: 'Unavailed'
      });
    }
    if (!availedByMeal.dinner.has(s.idNumber)) {
      unavailedList.push({
        accountID,
        limaBatch: batch,
        idNumber: s.idNumber,
        studentName,
        missedMeal: 'Dinner',
        status: 'Unavailed'
      });
    }
  });

  // 8. Fetch Breakfast Vouchers for the period
  const voucherQuery = {
    voucherType: 'unclaimed_breakfast'
  };

  if (startDate && endDate) {
    voucherQuery.mealDate = { $gte: startDate, $lte: endDate };
  } else if (startDate) {
    voucherQuery.mealDate = startDate;
  } else {
    // Default active mealDate
    const windowInfo = getTodayBreakfastVoucherWindow();
    voucherQuery.mealDate = windowInfo.mealDate;
  }

  if (limaBatch && ['B29', 'B31', 'B32', 'B33'].includes(limaBatch)) {
    voucherQuery.limaBatch = limaBatch;
  }

  const vouchers = await Voucher.find(voucherQuery)
    .sort({ mealDate: -1, claimedAt: -1, studentName: 1 })
    .lean();

  const voucherCounts = {
    total: vouchers.length,
    claimed: vouchers.filter(v => v.status === 'claimed').length,
    unclaimed: vouchers.filter(v => v.status === 'unclaimed').length,
    expired: vouchers.filter(v => v.status === 'expired').length
  };
  voucherCounts.totalUnclaimed = voucherCounts.unclaimed + voucherCounts.expired;
  voucherCounts.rate = voucherCounts.total > 0
    ? Number(((voucherCounts.claimed / voucherCounts.total) * 100).toFixed(1))
    : 0;

  metrics.vouchers = voucherCounts;

  const voucherBatchBreakdown = BATCHES.map(batch => {
    const bVouchers = vouchers.filter(v => v.limaBatch === batch);
    const bTotal = bVouchers.length;
    const bClaimed = bVouchers.filter(v => v.status === 'claimed').length;
    const bUnclaimed = bVouchers.filter(v => v.status === 'unclaimed').length;
    const bExpired = bVouchers.filter(v => v.status === 'expired').length;
    const bTotalUnclaimed = bUnclaimed + bExpired;
    return {
      batch,
      total: bTotal,
      claimed: bClaimed,
      unclaimed: bUnclaimed,
      expired: bExpired,
      totalUnclaimed: bTotalUnclaimed,
      rate: bTotal > 0 ? Number(((bClaimed / bTotal) * 100).toFixed(1)) : 0
    };
  });

  const claimedVouchersList = vouchers
    .filter(v => v.status === 'claimed')
    .map(v => {
      const s = studentMap.get(v.idNumber);
      return {
        accountID: v.accountID || s?.accountID || '-',
        limaBatch: v.limaBatch || s?.limaBatch || '-',
        idNumber: v.idNumber,
        studentName: v.studentName || `${s?.lastName || ''}, ${s?.firstName || ''}`.trim() || 'Unknown',
        voucherCode: v.voucherCode,
        mealType: 'Breakfast',
        mealDate: v.mealDate,
        claimedAt: v.claimedAt,
        status: 'Claimed'
      };
    });

  const unclaimedVouchersList = vouchers
    .filter(v => v.status !== 'claimed')
    .map(v => {
      const s = studentMap.get(v.idNumber);
      return {
        accountID: v.accountID || s?.accountID || '-',
        limaBatch: v.limaBatch || s?.limaBatch || '-',
        idNumber: v.idNumber,
        studentName: v.studentName || `${s?.lastName || ''}, ${s?.firstName || ''}`.trim() || 'Unknown',
        voucherCode: v.voucherCode,
        mealType: 'Breakfast',
        mealDate: v.mealDate,
        expiresAt: v.expiresAt,
        status: v.status === 'expired' ? 'Expired (11:00 PM)' : 'Unclaimed'
      };
    });

  return {
    dateRangeLabel: label,
    generatedAt: new Date(),
    metrics,
    batchBreakdown,
    voucherBatchBreakdown,
    claimedVouchersList,
    unclaimedVouchersList,
    vouchersList: vouchers,
    availedList,
    unavailedList
  };
};

/**
 * Build a 3-sheet Excel workbook for the summary report.
 */
export const buildSummaryExcelWorkbook = (summaryData) => {
  const {
    dateRangeLabel,
    generatedAt,
    metrics,
    batchBreakdown,
    voucherBatchBreakdown,
    claimedVouchersList,
    unclaimedVouchersList,
    availedList,
    unavailedList
  } = summaryData;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'VGConcierge';
  workbook.created = generatedAt;

  const borderThin = {
    top: { style: 'thin', color: { argb: 'D1D5DB' } },
    left: { style: 'thin', color: { argb: 'D1D5DB' } },
    bottom: { style: 'thin', color: { argb: 'D1D5DB' } },
    right: { style: 'thin', color: { argb: 'D1D5DB' } }
  };

  const borderMediumBottom = {
    top: { style: 'thin', color: { argb: '9CA3AF' } },
    left: { style: 'thin', color: { argb: '9CA3AF' } },
    bottom: { style: 'medium', color: { argb: '4B5563' } },
    right: { style: 'thin', color: { argb: '9CA3AF' } }
  };

  // ==========================================
  // SHEET 1: MEAL SUMMARY & COUNTS
  // ==========================================
  const summarySheet = workbook.addWorksheet('Meal Summary');

  summarySheet.columns = [
    { width: 24 }, // A
    { width: 18 }, // B
    { width: 18 }, // C
    { width: 18 }, // D
    { width: 20 }, // E
    { width: 20 }  // F
  ];

  // Title
  summarySheet.mergeCells('A1:E1');
  const titleCell = summarySheet.getCell('A1');
  titleCell.value = 'VGCONCIERGE — MEAL AVAILMENT SUMMARY REPORT';
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '312E81' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  summarySheet.getRow(1).height = 36;

  // Sub-header
  summarySheet.mergeCells('A2:E2');
  const subCell = summarySheet.getCell('A2');
  subCell.value = `Period: ${dateRangeLabel}   |   Generated: ${formatManilaDateTime(generatedAt)}   |   Total LIMA Students: ${metrics.totalRegisteredStudents}`;
  subCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: '374151' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'EEF2FF' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };
  summarySheet.getRow(2).height = 24;

  summarySheet.addRow([]); // Spacer

  // Section 1 label
  summarySheet.mergeCells('A4:E4');
  const sec1Cell = summarySheet.getCell('A4');
  sec1Cell.value = '1. MEAL BREAKDOWN & AVAILMENT RATE';
  sec1Cell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: '1E1B4B' } };
  summarySheet.getRow(4).height = 22;

  // Table headers
  const tableHeaderRow = summarySheet.addRow(['Meal Type', 'Total Students', 'Availed', 'Unavailed', 'Availment Rate (%)']);
  tableHeaderRow.height = 26;
  tableHeaderRow.eachCell(cell => {
    cell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4338CA' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = borderThin;
  });

  const mealRows = [
    ['Breakfast', metrics.breakfast.registered, metrics.breakfast.availed, metrics.breakfast.unavailed, `${metrics.breakfast.rate}%`],
    ['Lunch', metrics.lunch.registered, metrics.lunch.availed, metrics.lunch.unavailed, `${metrics.lunch.rate}%`],
    ['Dinner', metrics.dinner.registered, metrics.dinner.availed, metrics.dinner.unavailed, `${metrics.dinner.rate}%`]
  ];

  mealRows.forEach((rowData, idx) => {
    const row = summarySheet.addRow(rowData);
    row.height = 22;
    const isEven = idx % 2 === 0;
    row.eachCell((cell, colNum) => {
      cell.border = borderThin;
      cell.alignment = { vertical: 'middle', horizontal: colNum === 1 ? 'left' : 'center' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'F9FAFB' : 'FFFFFF' } };
      cell.font = { name: 'Calibri', size: 11, color: { argb: '111827' } };
    });
  });

  const totalRow = summarySheet.addRow([
    `TOTAL`,
    metrics.total.registered,
    metrics.total.availed,
    metrics.total.unavailed,
    `${metrics.total.rate}%`
  ]);
  totalRow.height = 25;
  totalRow.eachCell((cell, colNum) => {
    cell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: '1E1B4B' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E0E7FF' } };
    cell.alignment = { vertical: 'middle', horizontal: colNum === 1 ? 'left' : 'center' };
    cell.border = borderMediumBottom;
  });

  summarySheet.addRow([]); // Spacer

  // Section 2: Batch breakdown
  const sec2RowIdx = summarySheet.rowCount + 1;
  summarySheet.mergeCells(`A${sec2RowIdx}:E${sec2RowIdx}`);
  const sec2Cell = summarySheet.getCell(`A${sec2RowIdx}`);
  sec2Cell.value = '2. LIMA BATCH BREAKDOWN';
  sec2Cell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: '1E1B4B' } };
  summarySheet.getRow(sec2RowIdx).height = 22;

  const batchHeaderRow = summarySheet.addRow([
    'Batch',
    'Students',
    'Breakfast Availed',
    'Lunch Availed',
    'Dinner Availed',
    'Overall Rate (%)'
  ]);

  // Extend to 6 columns for batch
  summarySheet.getColumn(6).width = 20;

  batchHeaderRow.height = 26;
  batchHeaderRow.eachCell(cell => {
    cell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '374151' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = borderThin;
  });

  if (batchBreakdown.length > 0) {
    batchBreakdown.forEach((b, idx) => {
      const row = summarySheet.addRow([
        b.batch,
        b.registeredStudents,
        `${b.breakfast.availed} (${b.breakfast.rate}%)`,
        `${b.lunch.availed} (${b.lunch.rate}%)`,
        `${b.dinner.availed} (${b.dinner.rate}%)`,
        `${b.overallRate}%`
      ]);
      row.height = 22;
      const isEven = idx % 2 === 0;
      row.eachCell((cell, colNum) => {
        cell.border = borderThin;
        cell.alignment = { vertical: 'middle', horizontal: colNum === 1 ? 'left' : 'center' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'F9FAFB' : 'FFFFFF' } };
        cell.font = { name: 'Calibri', size: 11, color: { argb: '111827' } };
      });
    });
  }

  summarySheet.addRow([]); // Spacer

  // Section 3: Breakfast Vouchers Summary
  const sec3RowIdx = summarySheet.rowCount + 1;
  summarySheet.mergeCells(`A${sec3RowIdx}:E${sec3RowIdx}`);
  const sec3Cell = summarySheet.getCell(`A${sec3RowIdx}`);
  sec3Cell.value = '3. BREAKFAST VOUCHERS SUMMARY (DORM 2 COMPENSATORY)';
  sec3Cell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: '1E1B4B' } };
  summarySheet.getRow(sec3RowIdx).height = 22;

  const voucherHeaderRow = summarySheet.addRow([
    'Voucher Category',
    'Total Issued',
    'Claimed (Dorm 2)',
    'Unclaimed / Expired',
    'Claim Rate (%)'
  ]);
  voucherHeaderRow.height = 26;
  voucherHeaderRow.eachCell(cell => {
    cell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'B45309' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = borderThin;
  });

  const vMetrics = metrics.vouchers || { total: 0, claimed: 0, unclaimed: 0, expired: 0, totalUnclaimed: 0, rate: 0 };
  const vRow = summarySheet.addRow([
    'Unclaimed Breakfast Vouchers',
    vMetrics.total,
    vMetrics.claimed,
    vMetrics.totalUnclaimed,
    `${vMetrics.rate}%`
  ]);
  vRow.height = 24;
  vRow.eachCell((cell, colNum) => {
    cell.border = borderMediumBottom;
    cell.alignment = { vertical: 'middle', horizontal: colNum === 1 ? 'left' : 'center' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FEF3C7' } };
    cell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: '78350F' } };
  });

  // Batch breakdown for vouchers if available
  if (voucherBatchBreakdown && voucherBatchBreakdown.length > 0) {
    summarySheet.addRow([]); // Spacer
    const sec3bRowIdx = summarySheet.rowCount + 1;
    summarySheet.mergeCells(`A${sec3bRowIdx}:E${sec3bRowIdx}`);
    const sec3bCell = summarySheet.getCell(`A${sec3bRowIdx}`);
    sec3bCell.value = 'BREAKFAST VOUCHERS BY BATCH';
    sec3bCell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: '4B5563' } };
    summarySheet.getRow(sec3bRowIdx).height = 20;

    const vBatchHeaderRow = summarySheet.addRow([
      'Batch',
      'Vouchers Issued',
      'Claimed',
      'Unclaimed / Expired',
      'Claim Rate (%)'
    ]);
    vBatchHeaderRow.height = 24;
    vBatchHeaderRow.eachCell(cell => {
      cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '6B7280' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = borderThin;
    });

    voucherBatchBreakdown.forEach((vb, idx) => {
      const vbRow = summarySheet.addRow([
        vb.batch,
        vb.total,
        vb.claimed,
        vb.totalUnclaimed,
        `${vb.rate}%`
      ]);
      vbRow.height = 20;
      const isEven = idx % 2 === 0;
      vbRow.eachCell((cell, colNum) => {
        cell.border = borderThin;
        cell.alignment = { vertical: 'middle', horizontal: colNum === 1 ? 'left' : 'center' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'F9FAFB' : 'FFFFFF' } };
        cell.font = { name: 'Calibri', size: 10, color: { argb: '111827' } };
      });
    });
  }

  // ==========================================
  // SHEET 2: AVAILED STUDENTS
  // ==========================================
  const availedSheet = workbook.addWorksheet('Availed List');

  availedSheet.columns = [
    { header: 'Account ID', key: 'accountID', width: 14 },
    { header: 'Batch', key: 'limaBatch', width: 12 },
    { header: 'Student ID Number', key: 'idNumber', width: 20 },
    { header: 'Student Name', key: 'studentName', width: 30 },
    { header: 'Meal Type', key: 'mealType', width: 14 },
    { header: 'Availed Date & Time (PH)', key: 'availedAt', width: 26 },
    { header: 'Processed By', key: 'processedBy', width: 28 }
  ];

  const availedHeaderRow = availedSheet.getRow(1);
  availedHeaderRow.height = 28;
  availedHeaderRow.eachCell(cell => {
    cell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '065F46' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = borderThin;
  });

  if (availedList.length > 0) {
    availedList.forEach((item, idx) => {
      const row = availedSheet.addRow({
        accountID: item.accountID,
        limaBatch: item.limaBatch,
        idNumber: item.idNumber,
        studentName: item.studentName,
        mealType: item.mealType,
        availedAt: formatManilaDateTime(item.availedAt),
        processedBy: item.processedBy
      });
      row.height = 20;
      const isEven = idx % 2 === 0;
      row.eachCell((cell, colNum) => {
        cell.border = borderThin;
        cell.font = { name: 'Calibri', size: 10, color: { argb: '111827' } };
        cell.alignment = { vertical: 'middle', horizontal: [1, 2, 5].includes(colNum) ? 'center' : 'left' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'F0FDF4' : 'FFFFFF' } };
      });
    });
  } else {
    const emptyRow = availedSheet.addRow({ idNumber: 'No availed meal records found for this period' });
    emptyRow.height = 22;
    emptyRow.getCell(1).font = { name: 'Calibri', italic: true, color: { argb: '6B7280' } };
  }

  // ==========================================
  // SHEET 3: UNAVAILED STUDENTS
  // ==========================================
  const unavailedSheet = workbook.addWorksheet('Unavailed List');

  unavailedSheet.columns = [
    { header: 'Account ID', key: 'accountID', width: 14 },
    { header: 'Batch', key: 'limaBatch', width: 12 },
    { header: 'Student ID Number', key: 'idNumber', width: 20 },
    { header: 'Student Name', key: 'studentName', width: 30 },
    { header: 'Missed Meal', key: 'missedMeal', width: 16 },
    { header: 'Status', key: 'status', width: 14 }
  ];

  const unavailedHeaderRow = unavailedSheet.getRow(1);
  unavailedHeaderRow.height = 28;
  unavailedHeaderRow.eachCell(cell => {
    cell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '991B1B' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = borderThin;
  });

  if (unavailedList.length > 0) {
    unavailedList.forEach((item, idx) => {
      const row = unavailedSheet.addRow({
        accountID: item.accountID,
        limaBatch: item.limaBatch,
        idNumber: item.idNumber,
        studentName: item.studentName,
        missedMeal: item.missedMeal,
        status: item.status
      });
      row.height = 20;
      const isEven = idx % 2 === 0;
      row.eachCell((cell, colNum) => {
        cell.border = borderThin;
        cell.font = { name: 'Calibri', size: 10, color: { argb: '111827' } };
        cell.alignment = { vertical: 'middle', horizontal: [1, 2, 5, 6].includes(colNum) ? 'center' : 'left' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FEF2F2' : 'FFFFFF' } };
      });
    });
  } else {
    const emptyRow = unavailedSheet.addRow({ idNumber: 'All registered students availed all meals! (0 unavailed)' });
    emptyRow.height = 22;
    emptyRow.getCell(1).font = { name: 'Calibri', italic: true, color: { argb: '6B7280' } };
  }

  // ==========================================
  // SHEET 4: CLAIMED VOUCHERS
  // ==========================================
  const claimedVouchersSheet = workbook.addWorksheet('Claimed Vouchers');

  claimedVouchersSheet.columns = [
    { header: 'Account ID', key: 'accountID', width: 14 },
    { header: 'Batch', key: 'limaBatch', width: 12 },
    { header: 'Student ID Number', key: 'idNumber', width: 20 },
    { header: 'Student Name', key: 'studentName', width: 30 },
    { header: 'Voucher Code', key: 'voucherCode', width: 16 },
    { header: 'Meal Type', key: 'mealType', width: 14 },
    { header: 'Meal Date', key: 'mealDate', width: 14 },
    { header: 'Claimed Date & Time (PH)', key: 'claimedAt', width: 26 },
    { header: 'Status', key: 'status', width: 14 }
  ];

  const claimedVoucherHeaderRow = claimedVouchersSheet.getRow(1);
  claimedVoucherHeaderRow.height = 28;
  claimedVoucherHeaderRow.eachCell(cell => {
    cell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '047857' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = borderThin;
  });

  if (claimedVouchersList && claimedVouchersList.length > 0) {
    claimedVouchersList.forEach((item, idx) => {
      const row = claimedVouchersSheet.addRow({
        accountID: item.accountID,
        limaBatch: item.limaBatch,
        idNumber: item.idNumber,
        studentName: item.studentName,
        voucherCode: item.voucherCode,
        mealType: item.mealType,
        mealDate: item.mealDate,
        claimedAt: formatManilaDateTime(item.claimedAt),
        status: item.status
      });
      row.height = 20;
      const isEven = idx % 2 === 0;
      row.eachCell((cell, colNum) => {
        cell.border = borderThin;
        cell.font = { name: 'Calibri', size: 10, color: { argb: '111827' } };
        cell.alignment = { vertical: 'middle', horizontal: [1, 2, 5, 6, 7, 9].includes(colNum) ? 'center' : 'left' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'F0FDF4' : 'FFFFFF' } };
      });
    });
  } else {
    const emptyRow = claimedVouchersSheet.addRow({ idNumber: 'No claimed breakfast vouchers for this period (0 claimed)' });
    emptyRow.height = 22;
    emptyRow.getCell(1).font = { name: 'Calibri', italic: true, color: { argb: '6B7280' } };
  }

  // ==========================================
  // SHEET 5: UNCLAIMED VOUCHERS
  // ==========================================
  const unclaimedVouchersSheet = workbook.addWorksheet('Unclaimed Vouchers');

  unclaimedVouchersSheet.columns = [
    { header: 'Account ID', key: 'accountID', width: 14 },
    { header: 'Batch', key: 'limaBatch', width: 12 },
    { header: 'Student ID Number', key: 'idNumber', width: 20 },
    { header: 'Student Name', key: 'studentName', width: 30 },
    { header: 'Voucher Code', key: 'voucherCode', width: 16 },
    { header: 'Meal Type', key: 'mealType', width: 14 },
    { header: 'Meal Date', key: 'mealDate', width: 14 },
    { header: 'Expiry Time (PH)', key: 'expiresAt', width: 26 },
    { header: 'Status', key: 'status', width: 20 }
  ];

  const unclaimedVoucherHeaderRow = unclaimedVouchersSheet.getRow(1);
  unclaimedVoucherHeaderRow.height = 28;
  unclaimedVoucherHeaderRow.eachCell(cell => {
    cell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: 'FFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'B45309' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = borderThin;
  });

  if (unclaimedVouchersList && unclaimedVouchersList.length > 0) {
    unclaimedVouchersList.forEach((item, idx) => {
      const row = unclaimedVouchersSheet.addRow({
        accountID: item.accountID,
        limaBatch: item.limaBatch,
        idNumber: item.idNumber,
        studentName: item.studentName,
        voucherCode: item.voucherCode,
        mealType: item.mealType,
        mealDate: item.mealDate,
        expiresAt: formatManilaDateTime(item.expiresAt),
        status: item.status
      });
      row.height = 20;
      const isEven = idx % 2 === 0;
      row.eachCell((cell, colNum) => {
        cell.border = borderThin;
        cell.font = { name: 'Calibri', size: 10, color: { argb: '111827' } };
        cell.alignment = { vertical: 'middle', horizontal: [1, 2, 5, 6, 7, 9].includes(colNum) ? 'center' : 'left' };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isEven ? 'FFFBEB' : 'FFFFFF' } };
      });
    });
  } else {
    const emptyRow = unclaimedVouchersSheet.addRow({ idNumber: 'No unclaimed vouchers found (all claimed or none issued)' });
    emptyRow.height = 22;
    emptyRow.getCell(1).font = { name: 'Calibri', italic: true, color: { argb: '6B7280' } };
  }

  return workbook;
};
