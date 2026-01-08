import { Request, Response } from 'express';
import {
  sendAnalyticsEmailToManagers,
  sendDailyAnalyticsEmail,
  sendMonthlyAnalyticsEmail,
  scheduleAnalyticsEmails,
  generateUserCallCountsCSV
} from '../services/analyticsEmailScheduler';
import { cleanupTempFile } from '../services/analyticsEmailScheduler';

/**
 * POST /api/analytics/email/send
 * Send analytics email to managers immediately
 * Query parameters:
 * - startDate: optional (ISO date string)
 * - endDate: optional (ISO date string)
 * - period: optional ('daily', 'weekly', 'monthly')
 */
export async function sendAnalyticsEmail(req: Request, res: Response) {
  try {
    const { startDate, endDate, period } = req.query;

    let start: Date | undefined;
    let end: Date | undefined;

    if (period) {
      const now = new Date();
      switch (period) {
        case 'daily':
          start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          end = now;
          break;
        case 'weekly':
          start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          end = now;
          break;
        case 'monthly':
          start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          end = now;
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid period. Use daily, weekly, or monthly'
          });
      }
    } else if (startDate && endDate) {
      start = new Date(startDate as string);
      end = new Date(endDate as string);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format. Use ISO date strings'
        });
      }
    }

    await sendAnalyticsEmailToManagers(start, end);

    res.json({
      success: true,
      message: 'Analytics email sent successfully to all managers',
      period: {
        startDate: start || 'Last 30 days',
        endDate: end || 'Now'
      }
    });

  } catch (error: any) {
    console.error('Error sending analytics email:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send analytics email'
    });
  }
}

/**
 * POST /api/analytics/email/daily
 * Send daily analytics email (last 24 hours)
 */
export async function sendDailyEmail(req: Request, res: Response) {
  try {
    await sendDailyAnalyticsEmail();
    
    res.json({
      success: true,
      message: 'Daily analytics email sent successfully'
    });
  } catch (error: any) {
    console.error('Error sending daily analytics email:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send daily analytics email'
    });
  }
}

/**
 * POST /api/analytics/email/weekly
 * Send weekly analytics email (last 7 days)
 */
export async function sendWeeklyEmail(req: Request, res: Response) {
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    await sendAnalyticsEmailToManagers(startDate, endDate);
    
    res.json({
      success: true,
      message: 'Weekly analytics email sent successfully'
    });
  } catch (error: any) {
    console.error('Error sending weekly analytics email:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send weekly analytics email'
    });
  }
}

/**
 * POST /api/analytics/email/monthly
 * Send monthly analytics email (last 30 days)
 */
export async function sendMonthlyEmail(req: Request, res: Response) {
  try {
    await sendMonthlyAnalyticsEmail();
    
    res.json({
      success: true,
      message: 'Monthly analytics email sent successfully'
    });
  } catch (error: any) {
    console.error('Error sending monthly analytics email:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send monthly analytics email'
    });
  }
}

/**
 * POST /api/analytics/email/schedule
 * Run the scheduled analytics email job
 * This is typically called by a cron job or scheduler
 */
export async function runScheduledEmail(req: Request, res: Response) {
  try {
    await scheduleAnalyticsEmails();
    
    res.json({
      success: true,
      message: 'Scheduled analytics email job completed successfully'
    });
  } catch (error: any) {
    console.error('Error running scheduled analytics email job:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to run scheduled analytics email job'
    });
  }
}

/**
 * GET /api/analytics/email/test-csv
 * Test CSV generation only (returns file info)
 */
export async function testCSVGeneration(req: Request, res: Response) {
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const csvFilePath = await generateUserCallCountsCSV(startDate, endDate);
    
    // Read the CSV file to return its content
    const fs = await import('fs');
    const csvContent = fs.readFileSync(csvFilePath, 'utf8');
    
    // Clean up the file
    cleanupTempFile(csvFilePath);
    
    res.json({
      success: true,
      message: 'CSV generation test successful',
      data: {
        filePath: csvFilePath,
        content: csvContent,
        lines: csvContent.split('\n').length,
        size: csvContent.length
      }
    });
  } catch (error: any) {
    console.error('Error testing CSV generation:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to test CSV generation'
    });
  }
}

/**
 * GET /api/analytics/email/test
 * Test endpoint to verify email configuration
 * Sends a test email to the requesting user if they are a manager
 */
export async function testEmailConfiguration(req: Request, res: Response) {
  try {
    // This would require authentication middleware to get the user
    // For now, we'll just test the email configuration
    const { sendMail } = await import('../services/mailer');
    
    await sendMail({
      to: 'test@example.com', // This should be replaced with actual manager email
      subject: '🧪 Test Email - Analytics System',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>✅ Email Configuration Test</h2>
          <p>This is a test email to verify that the analytics email system is working correctly.</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
          <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}</p>
          <p>If you receive this email, the configuration is working properly!</p>
        </div>
      `
    });

    res.json({
      success: true,
      message: 'Test email sent successfully'
    });

  } catch (error: any) {
    console.error('Error testing email configuration:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to send test email'
    });
  }
}
