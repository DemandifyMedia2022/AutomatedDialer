import { db } from '../db/prisma';

/**
 * Check what fields are actually populated in the calls table
 */
async function checkCallFields() {
  try {
    console.log('🔍 Checking call fields in database...');
    
    // Get a sample call to see what fields are populated
    const sampleCalls = await db.calls.findMany({
      take: 5,
      select: {
        id: true,
        useremail: true,
        username: true,
        start_time: true,
        call_duration: true,
        disposition: true,
        destination: true,
        campaign_name: true,
        extension: true
      }
    });
    
    console.log('\n📞 Sample calls:');
    sampleCalls.forEach((call, index) => {
      console.log(`\n${index + 1}. Call ID: ${call.id}`);
      console.log(`   User Email: ${call.useremail}`);
      console.log(`   Username: ${call.username}`);
      console.log(`   Extension: ${call.extension}`);
      console.log(`   Start Time: ${call.start_time}`);
      console.log(`   Duration: ${call.call_duration}`);
      console.log(`   Disposition: ${call.disposition}`);
      console.log(`   Destination: ${call.destination}`);
      console.log(`   Campaign: ${call.campaign_name}`);
    });
    
    // Check if extension field is populated (maybe that's how users are identified)
    const callsWithExtension = await db.calls.count({
      where: { extension: { not: null } }
    });
    console.log(`\n📊 Calls with extension: ${callsWithExtension}`);
    
    // Get unique extensions
    const uniqueExtensions = await db.calls.groupBy({
      by: ['extension'],
      where: { extension: { not: null } },
      orderBy: { extension: 'asc' },
      take: 10,
      _count: true
    });
    
    console.log('\n📞 Unique extensions:');
    uniqueExtensions.forEach((ext, index) => {
      console.log(`${index + 1}. ${ext.extension}`);
    });
    
  } catch (error) {
    console.error('Error checking call fields:', error);
  } finally {
    await db.$disconnect();
  }
}

// Run the check
if (require.main === module) {
  checkCallFields();
}

export { checkCallFields };
