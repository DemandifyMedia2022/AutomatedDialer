import { generateUserCallCountsCSV } from '../services/analyticsEmailScheduler';

/**
 * Test script for CSV generation functionality
 * Run this script to test if the CSV generation is working properly
 */

async function testCSVGeneration() {
  console.log('🧪 Testing CSV generation functionality...');
  
  try {
    // Generate CSV for the last 7 days
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    console.log(`📊 Generating CSV for ${startDate.toISOString()} to ${endDate.toISOString()}`);
    
    const csvFilePath = await generateUserCallCountsCSV(startDate, endDate);
    
    console.log(`✅ CSV generated successfully at: ${csvFilePath}`);
    
    // Read and display first few lines of the CSV
    const fs = await import('fs');
    if (fs.existsSync(csvFilePath)) {
      const content = fs.readFileSync(csvFilePath, 'utf8');
      const lines = content.split('\n');
      
      console.log('\n📄 CSV Preview (first 5 lines):');
      lines.slice(0, 5).forEach((line, index) => {
        console.log(`${index + 1}: ${line}`);
      });
      
      if (lines.length > 5) {
        console.log(`... and ${lines.length - 5} more lines`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error generating CSV:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testCSVGeneration()
    .then(() => {
      console.log('\n🎉 CSV generation test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 CSV generation test failed:', error);
      process.exit(1);
    });
}

export { testCSVGeneration };
