import { getWindowBoundaries, formatManilaDateTime } from '../utils/summaryReportService.js';
import { initDailySummaryCron } from '../utils/dailySummaryCron.js';

console.log('=== 1. CRON SCHEDULE VERIFICATION ===');
const task = initDailySummaryCron();
const nextRun = task.getNextRun();
console.log('Cron Status:', task.getStatus());
console.log('Next Run (UTC ISO):', nextRun?.toISOString());
console.log('Next Run (Manila): ', formatManilaDateTime(nextRun));
task.stop();

console.log('\n=== 2. WINDOW BOUNDARY VERIFICATION ===');
const bounds = getWindowBoundaries();
console.log('Label:            ', bounds.label);
console.log('Start UTC:        ', bounds.startUTC.toISOString(), '->', formatManilaDateTime(bounds.startUTC), 'PH');
console.log('End UTC:          ', bounds.endUTC.toISOString(), '->', formatManilaDateTime(bounds.endUTC), 'PH');

