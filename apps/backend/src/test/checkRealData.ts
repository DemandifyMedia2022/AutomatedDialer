import { db } from '../db/prisma';

/**
 * Check what real call data exists in the database
 */
async function checkRealCallData() {
  try {
    console.log('🔍 Checking real call data in database...');
    
    // Check total calls
    const totalCalls = await db.calls.count();
    console.log('📊 Total calls in database:', totalCalls);
    
    // Check calls with user emails
    const callsWithEmails = await db.calls.count({
      where: { useremail: { not: null } }
    });
    console.log('📊 Calls with user emails:', callsWithEmails);
    
    // Get recent calls
    const recentCalls = await db.calls.findMany({
      where: { useremail: { not: null } },
      select: {
        useremail: true,
        username: true,
        start_time: true,
        call_duration: true,
        disposition: true
      },
      orderBy: { start_time: 'desc' },
      take: 10
    });
    
    console.log('\n📅 Recent calls:');
    recentCalls.forEach((call, index) => {
      console.log(`${index + 1}. ${call.useremail} - ${call.start_time} - ${call.call_duration}s - ${call.disposition}`);
    });
    
    // Get calls by user for today
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const todayCalls = await db.calls.findMany({
      where: {
        useremail: { not: null },
        start_time: { gte: todayStart }
      },
      select: {
        useremail: true,
        username: true
      }
    });
    
    console.log('\n📞 Today\'s calls by user:');
    const callsByUser = todayCalls.reduce((acc, call) => {
      const email = call.useremail!;
      acc[email] = (acc[email] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(callsByUser).forEach(([email, count]) => {
      console.log(`- ${email}: ${count} calls`);
    });
    
    // Check date range of calls
    const dateRange = await db.calls.aggregate({
      where: { useremail: { not: null } },
      _min: { start_time: true },
      _max: { start_time: true }
    });
    
    console.log('\n📅 Call date range:');
    console.log(`- Earliest: ${dateRange._min?.start_time}`);
    console.log(`- Latest: ${dateRange._max?.start_time}`);
    
  } catch (error) {
    console.error('Error checking real data:', error);
  } finally {
    await db.$disconnect();
  }
}

// Run the check
if (require.main === module) {
  checkRealCallData();
}

export { checkRealCallData };
