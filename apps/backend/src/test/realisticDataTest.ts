import { generateUserCallCountsCSV } from '../services/analyticsEmailScheduler';

/**
 * Test script to generate realistic CSV data for specific users
 * This creates sample data that matches real-world scenarios
 */

async function generateRealisticTestData() {
  console.log('🧪 Generating realistic test data...');
  
  try {
    // Generate CSV for today
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
    
    console.log(`📊 Generating CSV for today: ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    const csvFilePath = await generateUserCallCountsCSV(startDate, endDate);
    
    console.log(`✅ CSV generated successfully at: ${csvFilePath}`);
    
    // Read and display the CSV content
    const fs = await import('fs');
    if (fs.existsSync(csvFilePath)) {
      const content = fs.readFileSync(csvFilePath, 'utf8');
      const lines = content.split('\n');
      
      console.log('\n📄 Complete CSV Content:');
      console.log(content);
      
      console.log('\n📊 Summary:');
      console.log(`- Total lines: ${lines.length}`);
      console.log(`- Data rows: ${lines.length - 1}`); // Subtract header
      
      // Parse and show user call counts
      const dataRows = lines.slice(1).filter(line => line.trim());
      console.log('\n👥 User Call Counts:');
      dataRows.forEach((line, index) => {
        const columns = line.split(',');
        if (columns.length >= 3) {
          const userEmail = columns[0].replace(/"/g, '');
          const username = columns[1].replace(/"/g, '');
          const totalCalls = parseInt(columns[2]);
          console.log(`${index + 1}. ${username} (${userEmail}): ${totalCalls} calls`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error generating realistic test data:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  generateRealisticTestData()
    .then(() => {
      console.log('\n🎉 Realistic test data generation completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test failed:', error);
      process.exit(1);
    });
}

export { generateRealisticTestData };
