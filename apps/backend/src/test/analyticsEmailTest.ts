import { sendAnalyticsEmailToManagers } from '../services/analyticsEmailScheduler';

/**
 * Test script for analytics email functionality
 * Run this script to test if the email system is working properly
 */

async function testAnalyticsEmail() {
  console.log('🧪 Testing analytics email functionality...');
  
  try {
    // Send analytics email for the last 24 hours
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
    
    console.log(`📊 Generating analytics report for ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    await sendAnalyticsEmailToManagers(startDate, endDate);
    
    console.log('✅ Analytics email sent successfully!');
    console.log('📧 Check your manager email inbox for the analytics report');
    
  } catch (error) {
    console.error('❌ Error sending analytics email:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testAnalyticsEmail()
    .then(() => {
      console.log('🎉 Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}

export { testAnalyticsEmail };
