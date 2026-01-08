# CSV Attachment Example

## Overview

The analytics email system now includes a CSV attachment with detailed user call counts. This provides managers with comprehensive data for further analysis and reporting.

## CSV File Structure

### Example CSV Content

```csv
User Email,Username,Total Calls,Answered Calls,Missed Calls,Busy Calls,Voicemail Calls,Total Duration (seconds),Average Call Duration (seconds),Unique Destinations,Campaigns Worked On,Answer Rate (%),Connect Rate (%)
"john.doe@company.com","John Doe",145,89,34,12,10,8734,60,67,5,61.4,77.9
"jane.smith@company.com","Jane Smith",132,78,41,8,5,7212,55,54,4,59.1,68.9
"mike.wilson@company.com","Mike Wilson",98,45,38,10,5,5421,55,42,3,45.9,61.2
```

### Column Descriptions

| Column | Type | Description |
|--------|------|-------------|
| User Email | String | Email address of the user |
| Username | String | Display name (may be "N/A" if not set) |
| Total Calls | Number | Total calls made during the period |
| Answered Calls | Number | Calls that were successfully answered |
| Missed Calls | Number | Calls that were not answered |
| Busy Calls | Number | Calls that received busy signal |
| Voicemail Calls | Number | Calls that went to voicemail |
| Total Duration (seconds) | Number | Combined duration of all calls |
| Average Call Duration (seconds) | Number | Average duration per call |
| Unique Destinations | Number | Count of unique phone numbers called |
| Campaigns Worked On | Number | Number of different campaigns participated in |
| Answer Rate (%) | Number | (Answered Calls / Total Calls) × 100 |
| Connect Rate (%) | Number | (Answered + Busy + Voicemail / Total Calls) × 100 |

## Usage Examples

### API Call with CSV Attachment

```bash
# Send daily report with CSV attachment
curl -X POST "http://localhost:4000/api/analytics/email/send?period=daily"
```

### Programmatic Usage

```typescript
import { sendAnalyticsEmailToManagers } from './services/analyticsEmailScheduler';

// Send analytics for custom date range with CSV attachment
const startDate = new Date('2024-01-01');
const endDate = new Date('2024-01-31');

await sendAnalyticsEmailToManagers(startDate, endDate);
```

### CSV Generation Only

```typescript
import { generateUserCallCountsCSV } from './services/analyticsEmailScheduler';

// Generate CSV file for analysis
const csvPath = await generateUserCallCountsCSV(startDate, endDate);
console.log(`CSV generated at: ${csvPath}`);
```

## Email Preview

When managers receive the analytics email, they will see:

1. **HTML Report**: Visual analytics dashboard with charts and metrics
2. **CSV Attachment**: `user-call-counts-2024-01-01-to-2024-01-31.csv`

The email footer will mention:
> 📎 Attachment: Detailed user call counts CSV file is attached for your reference.

## Data Analysis Examples

### Finding Top Performers

Using the CSV data, managers can:

1. **Sort by Total Calls** to identify most active agents
2. **Sort by Answer Rate** to find agents with best call quality
3. **Sort by Average Duration** to analyze call handling efficiency

### Performance Metrics

Calculate additional metrics:
- **Calls per Day**: Total Calls ÷ Number of Working Days
- **Efficiency Score**: Answer Rate × Average Call Duration
- **Campaign Diversity**: Campaigns Worked On ÷ Total Calls

### Integration with Excel/Google Sheets

The CSV can be directly imported into spreadsheet applications for:
- Pivot tables and charts
- Advanced filtering and sorting
- Custom dashboard creation
- Historical trend analysis

## File Management

### Automatic Cleanup

- CSV files are automatically deleted after email sending
- Temporary files are stored in `temp/` directory
- Files are named with timestamps for uniqueness

### Manual CSV Generation

For testing or manual analysis:

```bash
# Run CSV generation test
npx ts-node src/test/csvGenerationTest.ts
```

## Troubleshooting

### CSV Not Generated

1. Check database connection
2. Verify there are calls in the specified date range
3. Ensure users have valid email addresses
4. Check server logs for error messages

### Empty CSV

1. No calls found in the specified period
2. All calls have null useremail values
3. Date range is too narrow

### CSV Attachment Missing

1. Check email configuration
2. Verify file permissions for temp directory
3. Review error logs for CSV generation failures

## Performance Considerations

- Large datasets (>10,000 calls) may take longer to process
- CSV generation is optimized with database indexing
- Files are cleaned up automatically to prevent disk space issues
- Email sending continues even if CSV generation fails
