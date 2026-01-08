# Analytics Email Service Documentation

## Overview

The Analytics Email Service automatically sends comprehensive analytics reports to managers via email. This service provides insights into user activity, call performance, campaign effectiveness, and system engagement metrics.

## Features

### 📊 Analytics Data Included

1. **User Overview**
   - Total registered users
   - Active users (with sessions)
   - New user registrations
   - Overall engagement score

2. **Call Analytics**
   - Total calls made
   - Average call duration
   - Top performers by call count
   - Call distribution by user

3. **Campaign Analytics**
   - Total campaigns created
   - Active campaigns
   - Campaigns by user

4. **Feature Usage**
   - Manual Dialer usage
   - Campaign Management activity
   - Call Notes activity
   - QA Reviews activity
   - Document Management usage
   - Growth rates for each feature

5. **Engagement Metrics**
   - Average session duration
   - Sessions per user
   - Engagement score calculation

6. **📎 CSV Attachment**
   - Detailed user call counts with comprehensive metrics
   - Individual user performance data
   - Call disposition breakdown (answered, missed, busy, voicemail)
   - Answer rates and connect rates
   - Unique destinations and campaigns worked on
   - Total and average call durations

## Email Configuration

The system uses the existing email configuration in your environment:

```env
# Email Configuration
MAIL_MAILER=smtp
MAIL_HOST=smtppro.zoho.in
MAIL_PORT=465
MAIL_USERNAME=support@hariteq.com
MAIL_PASSWORD=Supp0rt@202$
MAIL_ENCRYPTION=ssl
MAIL_FROM_ADDRESS=support@hariteq.com
MAIL_FROM_NAME=Automated Dialer
```

## Manager Detection

The system automatically identifies managers by checking the `role` field in the `users` table:

- `manager`
- `admin` 
- `superadmin`

Only users with these roles and valid email addresses will receive analytics reports.

## API Endpoints

### Send Analytics Email Immediately

```http
POST /api/analytics/email/send
```

**Query Parameters:**
- `startDate` (optional): ISO date string (e.g., "2024-01-01T00:00:00.000Z")
- `endDate` (optional): ISO date string (e.g., "2024-01-02T00:00:00.000Z")
- `period` (optional): "daily", "weekly", or "monthly"

**Examples:**
```bash
# Send for custom date range
curl -X POST "http://localhost:4000/api/analytics/email/send?startDate=2024-01-01T00:00:00.000Z&endDate=2024-01-02T00:00:00.000Z"

# Send daily report
curl -X POST "http://localhost:4000/api/analytics/email/send?period=daily"

# Send weekly report
curl -X POST "http://localhost:4000/api/analytics/email/send?period=weekly"

# Send monthly report
curl -X POST "http://localhost:4000/api/analytics/email/send?period=monthly"
```

### Predefined Period Reports

```http
POST /api/analytics/email/daily    # Last 24 hours
POST /api/analytics/email/weekly   # Last 7 days
POST /api/analytics/email/monthly  # Last 30 days
```

### Scheduled Job

```http
POST /api/analytics/email/schedule # Runs weekly report
```

### Test Email Configuration

```http
GET /api/analytics/email/test
```

## Automatic Scheduling

The system includes a cron-based scheduler that automatically sends emails:

### Default Schedule

- **Daily**: Every day at 9:00 AM (Asia/Kolkata timezone)
- **Weekly**: Every Monday at 9:00 AM
- **Monthly**: 1st of every month at 9:00 AM

### Scheduler Control

The scheduler is controlled by environment variables:

```env
# Enable scheduler in production
NODE_ENV=production

# Or explicitly enable
ENABLE_ANALYTICS_SCHEDULER=true
```

### Scheduler Management

```typescript
import { analyticsEmailScheduler } from './services/cronScheduler';

// Start scheduler
analyticsEmailScheduler.start();

// Stop scheduler
analyticsEmailScheduler.stop();

// Get status
const status = analyticsEmailScheduler.getStatus();

// Run job immediately
await analyticsEmailScheduler.runJob('daily');
await analyticsEmailScheduler.runJob('weekly');
await analyticsEmailScheduler.runJob('monthly');

// Update schedule
analyticsEmailScheduler.updateSchedule('daily', '0 8 * * *'); // 8 AM instead of 9 AM
```

## Email Template

The system sends beautifully formatted HTML emails with:

- 📊 Visual metrics cards
- 📈 Tables with performance data
- 🎨 Color-coded indicators (green for positive, red for negative)
- 📱 Responsive design for mobile devices
- 📅 Clear date ranges and timestamps
- 📎 CSV attachment with detailed user call data

### CSV Attachment Format

The attached CSV file contains the following columns:

| Column | Description |
|--------|-------------|
| User Email | Email address of the user |
| Username | Display name of the user |
| Total Calls | Total number of calls made |
| Answered Calls | Calls that were answered |
| Missed Calls | Calls that were not answered |
| Busy Calls | Calls that received busy signal |
| Voicemail Calls | Calls that went to voicemail |
| Total Duration (seconds) | Combined duration of all calls |
| Average Call Duration (seconds) | Average duration per call |
| Unique Destinations | Number of unique phone numbers called |
| Campaigns Worked On | Number of different campaigns |
| Answer Rate (%) | Percentage of answered calls |
| Connect Rate (%) | Percentage of connected calls (answered + busy + voicemail) |

The CSV is sorted by total calls in descending order, making it easy to identify top performers.

## Testing

### Manual Test

Run the test script to verify email functionality:

```bash
# From the backend directory
npx ts-node src/test/analyticsEmailTest.ts
```

### API Test

Test via API endpoints:

```bash
# Test email configuration
curl -X GET "http://localhost:4000/api/analytics/email/test"

# Send immediate test report
curl -X POST "http://localhost:4000/api/analytics/email/send?period=daily"
```

## Troubleshooting

### Common Issues

1. **No managers found**
   - Check that users have `role` set to 'manager', 'admin', or 'superadmin'
   - Verify users have valid email addresses in `usermail` field

2. **Email not sending**
   - Verify email configuration in environment variables
   - Check SMTP server connectivity
   - Review server logs for error messages

3. **Scheduler not running**
   - Set `NODE_ENV=production` or `ENABLE_ANALYTICS_SCHEDULER=true`
   - Check server startup logs for scheduler messages

4. **Empty analytics data**
   - Verify database connection
   - Check that there's data in calls, campaigns, and users tables
   - Ensure date ranges contain actual activity

### Logging

The system provides detailed logging:

```
Analytics email scheduler started successfully
Daily emails: 9:00 AM every day
Weekly emails: 9:00 AM every Monday
Monthly emails: 9:00 AM on 1st of month

Running daily analytics email job...
Generating analytics report...
Analytics email sent successfully to manager1@example.com (John Doe)
Analytics email sent successfully to manager2@example.com (Jane Smith)
Daily analytics email sent successfully
```

## Performance Considerations

- Analytics queries are optimized with proper database indexes
- Email sending is done in parallel for multiple managers
- Large datasets are paginated to prevent memory issues
- Failed email sends are logged but don't stop other emails

## Security

- All endpoints require authentication and appropriate roles
- Email addresses are validated before sending
- No sensitive data is included in email reports
- Rate limiting prevents email abuse

## Customization

### Adding New Metrics

To add new analytics metrics, modify the `generateAnalyticsReport` function in `analyticsEmailScheduler.ts`:

```typescript
// Add new metric to the report
const newMetric = await db.some_table.aggregate({...});

report.newMetric = {
  total: newMetric._count,
  average: newMetric._avg.value
};
```

### Customizing Email Template

Modify the `generateEmailHTML` function to change the email appearance:

```typescript
function generateEmailHTML(report: AnalyticsReport): string {
  // Customize the HTML template here
  return `...`;
}
```

### Changing Schedule Patterns

Update the cron expressions in `cronScheduler.ts`:

```typescript
// Every 6 hours instead of daily
const dailyTask = cron.schedule('0 */6 * * *', async () => {...});
```

## Support

For issues or questions about the analytics email service:

1. Check server logs for error messages
2. Verify email configuration and database connectivity
3. Test with the provided test scripts
4. Review this documentation for common solutions
