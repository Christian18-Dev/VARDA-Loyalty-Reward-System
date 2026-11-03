import cron from 'node-cron';
import Voucher from '../models/Voucher.js';
import User from '../models/User.js';
import AvailHistory from '../models/AvailHistory.js';

/**
 * Pure UTC math to get current Philippine Time date and window boundaries.
 * Works identically on any server OS timezone (UTC on Render or UTC+8 locally).
 */
export const getTodayBreakfastVoucherWindow = (referenceDate = new Date()) => {
  const now = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  const phShifted = new Date(now.getTime() + 8 * 3600000);

  // Active 5:00 AM - 5:00 AM PH meal day
  const windowDayPH = new Date(
    Date.UTC(
      phShifted.getUTCFullYear(),
      phShifted.getUTCMonth(),
      phShifted.getUTCDate() - (phShifted.getUTCHours() < 5 ? 1 : 0)
    )
  );

  const year = windowDayPH.getUTCFullYear();
  const month = windowDayPH.getUTCMonth(); // 0-indexed
  const day = windowDayPH.getUTCDate();

  const mealDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  // 5:00 AM PH = previous day 21:00 UTC
  const windowStartUTC = new Date(Date.UTC(year, month, day - 1, 21, 0, 0, 0));
  // Next day 5:00 AM PH = same day 21:00 UTC
  const windowEndUTC = new Date(Date.UTC(year, month, day, 21, 0, 0, 0));
  // 10:00 AM PH (Breakfast ends) = same day 02:00 UTC
  const breakfastCutoffUTC = new Date(Date.UTC(year, month, day, 2, 0, 0, 0));
  // 11:00 PM PH (23:00 PH — Voucher expires) = same day 15:00 UTC
  const voucherExpiryUTC = new Date(Date.UTC(year, month, day, 15, 0, 0, 0));

  return {
    now,
    mealDate,
    windowStartUTC,
    windowEndUTC,
    breakfastCutoffUTC,
    voucherExpiryUTC,
    isAfterBreakfastCutoff: now >= breakfastCutoffUTC,
    isBeforeVoucherExpiry: now < voucherExpiryUTC,
    isClaimWindowOpen: now >= breakfastCutoffUTC && now < voucherExpiryUTC
  };
};

/**
 * Synchronizes today's Unclaimed Breakfast Vouchers:
 * 1. Marks any past-due 'unclaimed' vouchers as 'expired' if now >= expiresAt.
 * 2. If current PH time is >= 10:00 AM (after breakfast window closes), generates
 *    vouchers for all eligible LIMA students (role='student', batch in B29/B31/B32/B33)
 *    who did NOT avail breakfast today.
 */
export const syncTodayBreakfastVouchers = async () => {
  const {
    now,
    mealDate,
    windowStartUTC,
    windowEndUTC,
    voucherExpiryUTC,
    isAfterBreakfastCutoff
  } = getTodayBreakfastVoucherWindow();

  // 1. Expire any unclaimed vouchers whose expiresAt has passed
  await Voucher.updateMany(
    {
      status: 'unclaimed',
      expiresAt: { $lte: now }
    },
    {
      $set: { status: 'expired' }
    }
  );

  // 2. Only generate today's breakfast vouchers once the 5:00 AM - 10:00 AM breakfast window has ended
  if (!isAfterBreakfastCutoff) {
    return { mealDate, generatedCount: 0, isAfterBreakfastCutoff: false };
  }

  // Fetch all eligible LIMA students
  const eligibleStudents = await User.find({
    university: 'lima',
    role: 'student',
    limaBatch: { $in: ['B29', 'B31', 'B32', 'B33'] }
  })
    .select('idNumber accountID firstName lastName limaBatch')
    .lean();

  if (eligibleStudents.length === 0) {
    return { mealDate, generatedCount: 0, isAfterBreakfastCutoff: true };
  }

  // Fetch all breakfast availments for today's window
  const breakfastAvailments = await AvailHistory.find({
    mealType: 'breakfast',
    $or: [
      { registrationDate: { $gte: windowStartUTC, $lt: windowEndUTC } },
      { availedAt: { $gte: windowStartUTC, $lt: windowEndUTC } }
    ]
  })
    .select('idNumber')
    .lean();

  const availedBreakfastIds = new Set(breakfastAvailments.map(a => a.idNumber));

  // If a student later received a manual breakfast availment, remove their unclaimed voucher
  if (availedBreakfastIds.size > 0) {
    await Voucher.deleteMany({
      mealDate,
      voucherType: 'unclaimed_breakfast',
      status: 'unclaimed',
      idNumber: { $in: Array.from(availedBreakfastIds) }
    });
  }

  const missedBreakfastStudents = eligibleStudents.filter(
    s => !availedBreakfastIds.has(s.idNumber)
  );

  if (missedBreakfastStudents.length === 0) {
    return { mealDate, generatedCount: 0, isAfterBreakfastCutoff: true };
  }

  const initialStatus = now >= voucherExpiryUTC ? 'expired' : 'unclaimed';
  const compactDate = mealDate.replace(/-/g, '').slice(2); // e.g. 261031

  const bulkOps = missedBreakfastStudents.map(s => {
    const cleanCodeSuffix = String(s.accountID || s.idNumber).replace(/[^a-zA-Z0-9]/g, '');
    const voucherCode = `BF-${compactDate}-${cleanCodeSuffix}`;
    const studentName = `${s.lastName || ''}, ${s.firstName || ''}`.trim() || s.idNumber;

    return {
      updateOne: {
        filter: {
          idNumber: s.idNumber,
          mealDate,
          voucherType: 'unclaimed_breakfast'
        },
        update: {
          $setOnInsert: {
            voucherCode,
            idNumber: s.idNumber,
            accountID: s.accountID || null,
            limaBatch: s.limaBatch || null,
            firstName: s.firstName || '',
            lastName: s.lastName || '',
            studentName,
            mealDate,
            voucherType: 'unclaimed_breakfast',
            title: 'Breakfast',
            description: 'Valid for 1 breakfast compensation claim until 11:00 PM PH time today',
            status: initialStatus,
            issuedAt: now,
            expiresAt: voucherExpiryUTC,
            claimedAt: null
          }
        },
        upsert: true
      }
    };
  });

  const bulkResult = await Voucher.bulkWrite(bulkOps, { ordered: false });

  return {
    mealDate,
    generatedCount: bulkResult.upsertedCount || 0,
    isAfterBreakfastCutoff: true
  };
};

let voucherIssueCron = null;
let voucherExpireCron = null;

/**
 * Schedules automated cron jobs for Unclaimed Breakfast Vouchers:
 * - 10:00 AM PH (Asia/Manila): Issue vouchers to students who missed breakfast.
 * - 11:00 PM PH (Asia/Manila): Expire all remaining unclaimed vouchers for the day.
 */
export const initBreakfastVoucherCron = () => {
  if (!voucherIssueCron) {
    voucherIssueCron = cron.schedule(
      '0 10 * * *',
      async () => {
        console.log('🎟️ [Cron 10:00 AM PH] Generating Unclaimed Breakfast Vouchers...');
        try {
          const res = await syncTodayBreakfastVouchers();
          console.log(`✅ [Cron 10:00 AM PH] Generated ${res.generatedCount} breakfast vouchers for ${res.mealDate}`);
        } catch (err) {
          console.error('❌ [Cron 10:00 AM PH] Error generating breakfast vouchers:', err);
        }
      },
      {
        name: 'breakfast-voucher-issue',
        timezone: 'Asia/Manila',
        noOverlap: true
      }
    );
  }

  if (!voucherExpireCron) {
    voucherExpireCron = cron.schedule(
      '0 23 * * *',
      async () => {
        console.log('⏰ [Cron 11:00 PM PH] Expiring unclaimed breakfast vouchers...');
        try {
          const res = await syncTodayBreakfastVouchers();
          console.log(`✅ [Cron 11:00 PM PH] Breakfast voucher expiration check complete for ${res.mealDate}`);
        } catch (err) {
          console.error('❌ [Cron 11:00 PM PH] Error expiring breakfast vouchers:', err);
        }
      },
      {
        name: 'breakfast-voucher-expire',
        timezone: 'Asia/Manila',
        noOverlap: true
      }
    );
  }

  console.log('🎟️ Scheduled Breakfast Voucher cron jobs at 10:00 AM & 11:00 PM (Asia/Manila)');
};

