import * as cron from 'node-cron';
import { scheduleAnalyticsEmails, sendDailyAnalyticsEmail, sendMonthlyAnalyticsEmail } from './analyticsEmailScheduler';

/**
 * Cron job scheduler for analytics emails
 * 
 * Schedule patterns:
 * - Daily: '0 9 * * *' - Every day at 9:00 AM
 * - Weekly: '0 9 * * 1' - Every Monday at 9:00 AM  
 * - Monthly: '0 9 1 * *' - Every 1st of month at 9:00 AM
 */

class AnalyticsEmailScheduler {
  private tasks: cron.ScheduledTask[] = [];
  private isRunning = false;

  /**
   * Start all scheduled analytics email jobs
   */
  start(): void {
    if (this.isRunning) {
      console.log('Analytics email scheduler is already running');
      return;
    }

    console.log('Starting analytics email scheduler...');

    // Daily analytics email at 5:59 PM
    const dailyTask = cron.schedule('0 59 17 * * *', async () => {
      console.log('Running daily analytics email job...');
      try {
        await sendDailyAnalyticsEmail();
        console.log('Daily analytics email sent successfully');
      } catch (error) {
        console.error('Error in daily analytics email job:', error);
      }
    }, {
      timezone: 'Asia/Kolkata' // Adjust timezone as needed
    });

    // Weekly analytics email every Monday at 9:00 AM
    const weeklyTask = cron.schedule('0 9 * * 1', async () => {
      console.log('Running weekly analytics email job...');
      try {
        await scheduleAnalyticsEmails(); // Uses 7-day period by default
        console.log('Weekly analytics email sent successfully');
      } catch (error) {
        console.error('Error in weekly analytics email job:', error);
      }
    }, {
      timezone: 'Asia/Kolkata'
    });

    // Monthly analytics email on 1st of month at 9:00 AM
    const monthlyTask = cron.schedule('0 9 1 * *', async () => {
      console.log('Running monthly analytics email job...');
      try {
        await sendMonthlyAnalyticsEmail();
        console.log('Monthly analytics email sent successfully');
      } catch (error) {
        console.error('Error in monthly analytics email job:', error);
      }
    }, {
      timezone: 'Asia/Kolkata'
    });

    // Tasks are started automatically by cron.schedule()
    this.tasks = [dailyTask, weeklyTask, monthlyTask];
    this.isRunning = true;

    console.log('Analytics email scheduler started successfully');
    console.log('Daily emails: 5:59 PM every day');
    console.log('Weekly emails: 9:00 AM every Monday');
    console.log('Monthly emails: 9:00 AM on 1st of month');
  }

  /**
   * Stop all scheduled analytics email jobs
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('Analytics email scheduler is not running');
      return;
    }

    console.log('Stopping analytics email scheduler...');

    this.tasks.forEach(task => {
      task.stop();
    });

    this.tasks = [];
    this.isRunning = false;

    console.log('Analytics email scheduler stopped');
  }

  /**
   * Get scheduler status
   */
  getStatus(): { isRunning: boolean; activeTasks: number } {
    return {
      isRunning: this.isRunning,
      activeTasks: this.tasks.length
    };
  }

  /**
   * Run a specific job immediately for testing
   */
  async runJob(type: 'daily' | 'weekly' | 'monthly'): Promise<void> {
    console.log(`Running ${type} analytics email job immediately...`);
    
    try {
      switch (type) {
        case 'daily':
          await sendDailyAnalyticsEmail();
          break;
        case 'weekly':
          await scheduleAnalyticsEmails();
          break;
        case 'monthly':
          await sendMonthlyAnalyticsEmail();
          break;
      }
      console.log(`${type} analytics email job completed successfully`);
    } catch (error) {
      console.error(`Error in ${type} analytics email job:`, error);
      throw error;
    }
  }

  /**
   * Update schedule for a specific task
   */
  updateSchedule(type: 'daily' | 'weekly' | 'monthly', cronExpression: string): void {
    if (!this.isRunning) {
      console.log('Scheduler is not running. Start the scheduler first.');
      return;
    }

    console.log(`Updating ${type} schedule to: ${cronExpression}`);
    
    // Find and update the specific task
    const taskIndex = type === 'daily' ? 0 : type === 'weekly' ? 1 : 2;
    
    if (this.tasks[taskIndex]) {
      this.tasks[taskIndex].stop();
      
      const newTask = cron.schedule(cronExpression, async () => {
        console.log(`Running ${type} analytics email job...`);
        try {
          switch (type) {
            case 'daily':
              await sendDailyAnalyticsEmail();
              break;
            case 'weekly':
              await scheduleAnalyticsEmails();
              break;
            case 'monthly':
              await sendMonthlyAnalyticsEmail();
              break;
          }
          console.log(`${type} analytics email sent successfully`);
        } catch (error) {
          console.error(`Error in ${type} analytics email job:`, error);
        }
      }, {
        timezone: 'Asia/Kolkata'
      });

      this.tasks[taskIndex] = newTask;
      console.log(`${type} schedule updated successfully`);
    } else {
      console.log(`${type} task not found`);
    }
  }
}

// Export singleton instance
export const analyticsEmailScheduler = new AnalyticsEmailScheduler();

/**
 * Initialize and start the scheduler when the application starts
 * This function should be called in your main app.ts or server.ts file
 */
export function initializeAnalyticsEmailScheduler(): void {
  // Only start scheduler in production or if explicitly enabled
  const shouldStartScheduler = process.env.NODE_ENV === 'production' || 
                            process.env.ENABLE_ANALYTICS_SCHEDULER === 'true';

  if (shouldStartScheduler) {
    analyticsEmailScheduler.start();
  } else {
    console.log('Analytics email scheduler is disabled. Set NODE_ENV=production or ENABLE_ANALYTICS_SCHEDULER=true to enable.');
  }
}

/**
 * Graceful shutdown handler
 * Call this when shutting down the application
 */
export function shutdownAnalyticsEmailScheduler(): void {
  analyticsEmailScheduler.stop();
}
