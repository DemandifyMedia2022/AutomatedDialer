# Daily Calls CSV Feature

## Overview

The analytics email system now generates CSV files containing **only today's calls** instead of calls from the entire date range. This provides managers with a focused, daily view of call activity.

## 🎯 Key Features

### **Daily Call Focus**
- **Only Today's Calls**: CSV shows calls made from 12:00 AM to 11:59 PM today
- **Real-time Data**: Uses actual call records from your database
- **User-Specific**: Each user gets their own row with individual call metrics

### **Smart Fallback**
- **Primary**: Today's calls (12:00 AM - 11:59 PM)
- **Fallback**: If no calls today, uses last 7 days of data
- **Sample Data**: If no calls at all, generates realistic sample data

## 📊 CSV Structure

### **Filename Format**
```
daily-calls-YYYY-MM-DD.csv
```
Example: `daily-calls-2026-01-08.csv`

### **CSV Content**
```csv
User Name,Username,Total Calls,Answered Calls,Missed Calls,Busy Calls,Voicemail Calls,Total Duration (seconds),Average Call Duration (seconds),Unique Destinations,Campaigns Worked On,Answer Rate (%),Connect Rate (%)
"Rutuja Pawar","Rutuja Pawar",3,1,2,0,0,72,24,2,2,33,33
```

### **Column Descriptions**

| Column | Description |
|--------|-------------|
| User Name | Name of the user who made calls |
| Username | Display username (same as User Name) |
| Total Calls | Total number of calls made today |
| Answered Calls | Calls that were successfully answered |
| Missed Calls | Calls that were not answered |
| Busy Calls | Calls that received busy signal |
| Voicemail Calls | Calls that went to voicemail |
| Total Duration (seconds) | Combined duration of all calls today |
| Average Call Duration (seconds) | Average duration per call today |
| Unique Destinations | Number of different phone numbers called |
| Campaigns Worked On | Number of different campaigns used |
| Answer Rate (%) | Percentage of answered calls today |
| Connect Rate (%) | Percentage of connected calls today |

## 🔧 Technical Implementation

### **Date Range Logic**
```typescript
// Always use today's date range
const today = new Date();
const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
```

### **Database Query**
```typescript
// Get calls for today only
const calls = await db.calls.findMany({
  where: {
    start_time: {
      gte: todayStart,
      lt: todayEnd
    },
    username: {
      not: null
    }
  }
});
```

### **Fallback Strategy**
1. **Today's Calls**: Primary data source
2. **Last 7 Days**: If no calls today
3. **Sample Data**: If no calls at all (for testing)

## 📧 Email Integration

### **Attachment Name**
```
daily-calls-2026-01-08.csv
```

### **Email Content**
- **HTML Report**: Visual analytics overview
- **CSV Attachment**: Detailed daily call breakdown
- **Footer**: Indicates daily calls attachment

## 📈 Example Output

### **Real Data Example**
```csv
User Name,Username,Total Calls,Answered Calls,Missed Calls,Busy Calls,Voicemail Calls,Total Duration (seconds),Average Call Duration (seconds),Unique Destinations,Campaigns Worked On,Answer Rate (%),Connect Rate (%)
"Rutuja Pawar","Rutuja Pawar",3,1,2,0,0,72,24,2,2,33,33
"Prem Jadhav","Prem Jadhav",5,2,3,0,0,156,31,3,1,40,40
```

### **Performance Insights**
- **Rutuja Pawar**: 3 calls today (33% answer rate)
- **Prem Jadhav**: 5 calls today (40% answer rate)
- **Total Daily Activity**: 8 calls across 2 users

## 🚀 Usage Examples

### **API Endpoints**
```bash
# Test daily CSV generation
curl -X GET "http://localhost:4000/api/analytics/email/test-csv"

# Send daily analytics email with daily calls CSV
curl -X POST "http://localhost:4000/api/analytics/email/send?period=daily"

# Send weekly report (still uses daily calls logic for CSV)
curl -X POST "http://localhost:4000/api/analytics/email/send?period=weekly"
```

### **Test Scripts**
```bash
# Test CSV generation only
npx ts-node src/test/csvGenerationTest.ts

# Test full email with CSV
npx ts-node src/test/analyticsEmailTest.ts
```

## 📊 Benefits

### **Focused Reporting**
- **Daily Focus**: Managers see only today's activity
- **Actionable Insights**: Easy to identify daily performance
- **Trend Tracking**: Compare daily performance over time

### **Data Accuracy**
- **Real Records**: Uses actual call data from database
- **User-Specific**: Individual metrics per user
- **Time-Bound**: Strict daily boundaries (12:00 AM - 11:59 PM)

### **Operational Efficiency**
- **Quick Review**: Smaller datasets for faster analysis
- **Daily Monitoring**: Track daily call patterns
- **Performance Management**: Daily performance metrics

## 🔍 Troubleshooting

### **No Calls Today**
- **Expected**: If no calls made today, CSV will be empty
- **Fallback**: System uses last 7 days of data
- **Sample Data**: Generates realistic data for testing

### **Empty CSV**
- **Check Database**: Verify calls exist with usernames
- **Check Date**: Ensure system date is correct
- **Check Timezone**: Verify calls fall within today's date range

### **Incorrect Data**
- **Usernames**: Ensure calls have populated username field
- **Date Range**: Verify call timestamps are correct
- **Database**: Check database connection and query execution

## 📅 Scheduling

### **Daily Reports**
- **Best Time**: End of business day (5:00 PM - 6:00 PM)
- **Frequency**: Once per day
- **Purpose**: Daily performance review

### **Automated Scheduling**
```typescript
// Daily email at 6:00 PM
const dailyTask = cron.schedule('0 18 * * *', async () => {
  await sendDailyAnalyticsEmail();
});
```

## 🎯 Use Cases

### **Management Review**
- **Daily Performance**: Track team performance daily
- **Activity Monitoring**: Monitor daily call volumes
- **Trend Analysis**: Compare daily performance over time

### **Team Management**
- **Individual Performance**: Track each agent's daily calls
- **Coaching**: Identify agents needing support
- **Recognition**: Acknowledge top performers

### **Business Intelligence**
- **Call Patterns**: Analyze daily calling patterns
- **Resource Planning**: Plan staffing based on daily volume
- **Quality Metrics**: Track daily answer rates and call quality

## 🔄 Future Enhancements

### **Additional Metrics**
- **Call Quality Scores**: Add quality ratings
- **Revenue Tracking**: Include revenue per call
- **Customer Satisfaction**: Add satisfaction metrics

### **Advanced Features**
- **Hourly Breakdown**: Calls by hour of day
- **Peak Time Analysis**: Identify busiest periods
- **Performance Trends**: Week-over-week comparisons

### **Integration Options**
- **CRM Integration**: Connect with customer data
- **Dashboard Integration**: Display in management dashboards
- **Alert System**: Notify on unusual activity

The daily calls CSV feature provides focused, actionable insights for daily performance management while maintaining the comprehensive analytics reporting capabilities.
