import { Router } from 'express';
import {
  sendAnalyticsEmail,
  sendDailyEmail,
  sendWeeklyEmail,
  sendMonthlyEmail,
  runScheduledEmail,
  testEmailConfiguration,
  testCSVGeneration
} from '../controllers/analyticsEmailController';

const router = Router();

/**
 * Analytics Email Routes
 * Base path: /api/analytics/email
 */

// POST /api/analytics/email/send
// Send analytics email immediately with optional date range or period
// Query params: startDate, endDate, period (daily/weekly/monthly)
router.post('/send', sendAnalyticsEmail);

// POST /api/analytics/email/daily
// Send daily analytics email (last 24 hours)
router.post('/daily', sendDailyEmail);

// POST /api/analytics/email/weekly
// Send weekly analytics email (last 7 days)
router.post('/weekly', sendWeeklyEmail);

// POST /api/analytics/email/monthly
// Send monthly analytics email (last 30 days)
router.post('/monthly', sendMonthlyEmail);

// POST /api/analytics/email/schedule
// Run scheduled analytics email job (typically called by cron)
router.post('/schedule', runScheduledEmail);

// GET /api/analytics/email/test
// Test email configuration
router.get('/test', testEmailConfiguration);

// GET /api/analytics/email/test-csv
// Test CSV generation only
router.get('/test-csv', testCSVGeneration);

export default router;
