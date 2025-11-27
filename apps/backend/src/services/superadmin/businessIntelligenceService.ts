import { db } from '../../db/prisma';

export interface BusinessMetrics {
  mrr: number;
  revenuePerUser: number;
  growthRate: number;
  newUsers: number;
  churnRate: number;
  activeUsers: number;
  totalCalls: number;
  totalCampaigns: number;
  avgSessionDuration: number;
}

export interface UserGrowthMetrics {
  date: Date;
  newUsers: number;
  totalUsers: number;
  activeUsers: number;
  churnedUsers: number;
  churnRate: number;
}

export interface FeatureAdoption {
  featureName: string;
  totalUsers: number;
  activeUsers: number;
  adoptionRate: number;
  avgUsagePerUser: number;
}

export interface ConversionFunnelMetrics {
  stage: string;
  userCount: number;
  conversionRate: number;
  dropoffRate: number;
}

/**
 * Calculate user growth metrics (new users, churn rate, active users)
 */
export async function calculateUserGrowthMetrics(
  startDate: Date,
  endDate: Date,
  granularity: 'day' | 'week' | 'month' = 'day'
): Promise<UserGrowthMetrics[]> {
  try {
    // Get all users created within the date range
    const users = await db.users.findMany({
      select: {
        id: true,
        created_at: true,
        status: true,
      },
    });

    // Get agent sessions to determine active users
    const sessions = await db.agent_sessions.findMany({
      where: {
        login_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        user_id: true,
        login_at: true,
      },
    });

    // Group data by time period
    const timeGroups = new Map<string, any>();
    
    // Initialize time periods
    const current = new Date(startDate);
    while (current <= endDate) {
      const key = formatDateKey(current, granularity);
      timeGroups.set(key, {
        date: new Date(current),
        newUsers: 0,
        activeUserIds: new Set<number>(),
        totalUsers: 0,
      });
      
      // Increment based on granularity
      if (granularity === 'day') {
        current.setDate(current.getDate() + 1);
      } else if (granularity === 'week') {
        current.setDate(current.getDate() + 7);
      } else {
        current.setMonth(current.getMonth() + 1);
      }
    }

    // Count new users per period
    for (const user of users) {
      if (user.created_at && user.created_at >= startDate && user.created_at <= endDate) {
        const key = formatDateKey(user.created_at, granularity);
        const group = timeGroups.get(key);
        if (group) {
          group.newUsers++;
        }
      }
    }

    // Count active users per period
    for (const session of sessions) {
      const key = formatDateKey(session.login_at, granularity);
      const group = timeGroups.get(key);
      if (group) {
        group.activeUserIds.add(session.user_id);
      }
    }

    // Calculate cumulative totals and churn
    const results: UserGrowthMetrics[] = [];
    let cumulativeUsers = users.filter(u => u.created_at && u.created_at < startDate).length;
    
    for (const [key, group] of Array.from(timeGroups.entries()).sort()) {
      cumulativeUsers += group.newUsers;
      const activeUsers = group.activeUserIds.size;
      
      // Calculate churn (users who were active before but not in this period)
      const inactiveUsers = cumulativeUsers - activeUsers;
      const churnRate = cumulativeUsers > 0 ? (inactiveUsers / cumulativeUsers) * 100 : 0;
      
      results.push({
        date: group.date,
        newUsers: group.newUsers,
        totalUsers: cumulativeUsers,
        activeUsers,
        churnedUsers: inactiveUsers,
        churnRate: Math.round(churnRate * 100) / 100,
      });
    }

    return results;
  } catch (error) {
    console.error('Error calculating user growth metrics:', error);
    throw error;
  }
}

/**
 * Calculate platform usage metrics (total calls, campaigns, session duration)
 */
export async function calculatePlatformUsageMetrics(
  startDate: Date,
  endDate: Date
): Promise<{
  totalCalls: number;
  totalCampaigns: number;
  avgSessionDuration: number;
  totalCallDuration: number;
  avgCallDuration: number;
  callsByDisposition: Record<string, number>;
}> {
  try {
    // Get total calls in the period
    const calls = await db.calls.findMany({
      where: {
        start_time: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        call_duration: true,
        disposition: true,
      },
    });

    const totalCalls = calls.length;
    const totalCallDuration = calls.reduce((sum, call) => sum + (call.call_duration || 0), 0);
    const avgCallDuration = totalCalls > 0 ? totalCallDuration / totalCalls : 0;

    // Group calls by disposition
    const callsByDisposition: Record<string, number> = {};
    for (const call of calls) {
      const disposition = call.disposition || 'unknown';
      callsByDisposition[disposition] = (callsByDisposition[disposition] || 0) + 1;
    }

    // Get total campaigns
    const campaigns = await db.campaigns.findMany({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
      },
    });

    const totalCampaigns = campaigns.length;

    // Calculate average session duration
    const sessions = await db.agent_sessions.findMany({
      where: {
        login_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        login_at: true,
        logout_at: true,
      },
    });

    let totalSessionDuration = 0;
    let sessionCount = 0;

    for (const session of sessions) {
      if (session.logout_at) {
        const duration = session.logout_at.getTime() - session.login_at.getTime();
        totalSessionDuration += duration;
        sessionCount++;
      }
    }

    const avgSessionDuration = sessionCount > 0 
      ? Math.round(totalSessionDuration / sessionCount / 1000) // Convert to seconds
      : 0;

    return {
      totalCalls,
      totalCampaigns,
      avgSessionDuration,
      totalCallDuration,
      avgCallDuration: Math.round(avgCallDuration),
      callsByDisposition,
    };
  } catch (error) {
    console.error('Error calculating platform usage metrics:', error);
    throw error;
  }
}

/**
 * Calculate feature adoption rates
 */
export async function calculateFeatureAdoption(
  startDate: Date,
  endDate: Date
): Promise<FeatureAdoption[]> {
  try {
    // Get total users
    const totalUsers = await db.users.count({
      where: {
        created_at: {
          lte: endDate,
        },
      },
    });

    const features: FeatureAdoption[] = [];

    // Feature 1: Manual Dialer (users who made calls)
    const usersWithCalls = await db.calls.groupBy({
      by: ['useremail'],
      where: {
        start_time: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        id: true,
      },
    });

    const manualDialerUsers = usersWithCalls.length;
    const totalManualDialerCalls = usersWithCalls.reduce((sum, u) => sum + u._count.id, 0);
    const avgManualDialerUsage = manualDialerUsers > 0 
      ? totalManualDialerCalls / manualDialerUsers 
      : 0;

    features.push({
      featureName: 'Manual Dialer',
      totalUsers,
      activeUsers: manualDialerUsers,
      adoptionRate: totalUsers > 0 ? (manualDialerUsers / totalUsers) * 100 : 0,
      avgUsagePerUser: Math.round(avgManualDialerUsage * 100) / 100,
    });

    // Feature 2: Campaign Management (users who created campaigns)
    const usersWithCampaigns = await db.campaigns.groupBy({
      by: ['assigned_to'],
      where: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
        assigned_to: {
          not: null,
        },
      },
      _count: {
        id: true,
      },
    });

    const campaignUsers = usersWithCampaigns.length;
    const totalCampaigns = usersWithCampaigns.reduce((sum, u) => sum + u._count.id, 0);
    const avgCampaignUsage = campaignUsers > 0 ? totalCampaigns / campaignUsers : 0;

    features.push({
      featureName: 'Campaign Management',
      totalUsers,
      activeUsers: campaignUsers,
      adoptionRate: totalUsers > 0 ? (campaignUsers / totalUsers) * 100 : 0,
      avgUsagePerUser: Math.round(avgCampaignUsage * 100) / 100,
    });

    // Feature 3: Call Notes (users who created notes)
    const usersWithNotes = await db.notes.groupBy({
      by: ['user_id'],
      where: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        id: true,
      },
    });

    const notesUsers = usersWithNotes.length;
    const totalNotes = usersWithNotes.reduce((sum, u) => sum + u._count.id, 0);
    const avgNotesUsage = notesUsers > 0 ? totalNotes / notesUsers : 0;

    features.push({
      featureName: 'Call Notes',
      totalUsers,
      activeUsers: notesUsers,
      adoptionRate: totalUsers > 0 ? (notesUsers / totalUsers) * 100 : 0,
      avgUsagePerUser: Math.round(avgNotesUsage * 100) / 100,
    });

    // Feature 4: QA Reviews (users who performed QA reviews)
    const usersWithQAReviews = await db.qa_call_reviews.groupBy({
      by: ['reviewer_user_id'],
      where: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        id: true,
      },
    });

    const qaUsers = usersWithQAReviews.length;
    const totalQAReviews = usersWithQAReviews.reduce((sum, u) => sum + u._count.id, 0);
    const avgQAUsage = qaUsers > 0 ? totalQAReviews / qaUsers : 0;

    features.push({
      featureName: 'QA Reviews',
      totalUsers,
      activeUsers: qaUsers,
      adoptionRate: totalUsers > 0 ? (qaUsers / totalUsers) * 100 : 0,
      avgUsagePerUser: Math.round(avgQAUsage * 100) / 100,
    });

    // Feature 5: Document Management (users who created or shared documents)
    const usersWithDocuments = await db.documents.groupBy({
      by: ['created_by'],
      where: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        id: true,
      },
    });

    const documentUsers = usersWithDocuments.length;
    const totalDocuments = usersWithDocuments.reduce((sum, u) => sum + u._count.id, 0);
    const avgDocumentUsage = documentUsers > 0 ? totalDocuments / documentUsers : 0;

    features.push({
      featureName: 'Document Management',
      totalUsers,
      activeUsers: documentUsers,
      adoptionRate: totalUsers > 0 ? (documentUsers / totalUsers) * 100 : 0,
      avgUsagePerUser: Math.round(avgDocumentUsage * 100) / 100,
    });

    return features;
  } catch (error) {
    console.error('Error calculating feature adoption:', error);
    throw error;
  }
}

/**
 * Calculate conversion funnel metrics
 */
export async function calculateConversionFunnel(
  startDate: Date,
  endDate: Date
): Promise<ConversionFunnelMetrics[]> {
  try {
    // Stage 1: User Registration
    const registeredUsers = await db.users.count({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Stage 2: First Login (users with at least one session)
    const usersWithSessions = await db.agent_sessions.groupBy({
      by: ['user_id'],
      where: {
        login_at: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const firstLoginUsers = usersWithSessions.length;

    // Stage 3: First Call (users who made at least one call)
    const usersWithCalls = await db.calls.findMany({
      where: {
        start_time: {
          gte: startDate,
          lte: endDate,
        },
        useremail: {
          not: null,
        },
      },
      select: {
        useremail: true,
      },
      distinct: ['useremail'],
    });

    const firstCallUsers = usersWithCalls.length;

    // Stage 4: Campaign Creation (users who created at least one campaign)
    const usersWithCampaigns = await db.campaigns.findMany({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
        assigned_to: {
          not: null,
        },
      },
      select: {
        assigned_to: true,
      },
      distinct: ['assigned_to'],
    });

    const campaignCreationUsers = usersWithCampaigns.length;

    // Stage 5: Active User (users with multiple sessions and calls)
    const activeUsers = await db.agent_sessions.groupBy({
      by: ['user_id'],
      where: {
        login_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      having: {
        user_id: {
          _count: {
            gte: 3, // At least 3 sessions
          },
        },
      },
    });

    const activeUserCount = activeUsers.length;

    // Build funnel
    const funnel: ConversionFunnelMetrics[] = [
      {
        stage: 'User Registration',
        userCount: registeredUsers,
        conversionRate: 100,
        dropoffRate: 0,
      },
      {
        stage: 'First Login',
        userCount: firstLoginUsers,
        conversionRate: registeredUsers > 0 ? (firstLoginUsers / registeredUsers) * 100 : 0,
        dropoffRate: registeredUsers > 0 ? ((registeredUsers - firstLoginUsers) / registeredUsers) * 100 : 0,
      },
      {
        stage: 'First Call',
        userCount: firstCallUsers,
        conversionRate: firstLoginUsers > 0 ? (firstCallUsers / firstLoginUsers) * 100 : 0,
        dropoffRate: firstLoginUsers > 0 ? ((firstLoginUsers - firstCallUsers) / firstLoginUsers) * 100 : 0,
      },
      {
        stage: 'Campaign Creation',
        userCount: campaignCreationUsers,
        conversionRate: firstCallUsers > 0 ? (campaignCreationUsers / firstCallUsers) * 100 : 0,
        dropoffRate: firstCallUsers > 0 ? ((firstCallUsers - campaignCreationUsers) / firstCallUsers) * 100 : 0,
      },
      {
        stage: 'Active User',
        userCount: activeUserCount,
        conversionRate: campaignCreationUsers > 0 ? (activeUserCount / campaignCreationUsers) * 100 : 0,
        dropoffRate: campaignCreationUsers > 0 ? ((campaignCreationUsers - activeUserCount) / campaignCreationUsers) * 100 : 0,
      },
    ];

    // Round percentages
    funnel.forEach(stage => {
      stage.conversionRate = Math.round(stage.conversionRate * 100) / 100;
      stage.dropoffRate = Math.round(stage.dropoffRate * 100) / 100;
    });

    return funnel;
  } catch (error) {
    console.error('Error calculating conversion funnel:', error);
    throw error;
  }
}

/**
 * Calculate comprehensive business metrics
 */
export async function calculateBusinessMetrics(
  startDate: Date,
  endDate: Date
): Promise<BusinessMetrics> {
  try {
    // Get user counts
    const totalUsers = await db.users.count({
      where: {
        created_at: {
          lte: endDate,
        },
      },
    });

    const newUsers = await db.users.count({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Get active users (users with sessions in the period)
    const activeSessions = await db.agent_sessions.groupBy({
      by: ['user_id'],
      where: {
        login_at: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const activeUsers = activeSessions.length;

    // Calculate churn rate (simplified: inactive users / total users)
    const inactiveUsers = totalUsers - activeUsers;
    const churnRate = totalUsers > 0 ? (inactiveUsers / totalUsers) * 100 : 0;

    // Get platform usage metrics
    const usageMetrics = await calculatePlatformUsageMetrics(startDate, endDate);

    // Calculate growth rate (new users vs previous period)
    const periodDuration = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodDuration);
    
    const previousPeriodUsers = await db.users.count({
      where: {
        created_at: {
          gte: previousStartDate,
          lt: startDate,
        },
      },
    });

    const growthRate = previousPeriodUsers > 0 
      ? ((newUsers - previousPeriodUsers) / previousPeriodUsers) * 100 
      : 0;

    // Placeholder values for revenue metrics (would need billing data)
    const mrr = 0; // Monthly Recurring Revenue - requires billing integration
    const revenuePerUser = 0; // Revenue per user - requires billing integration

    return {
      mrr,
      revenuePerUser,
      growthRate: Math.round(growthRate * 100) / 100,
      newUsers,
      churnRate: Math.round(churnRate * 100) / 100,
      activeUsers,
      totalCalls: usageMetrics.totalCalls,
      totalCampaigns: usageMetrics.totalCampaigns,
      avgSessionDuration: usageMetrics.avgSessionDuration,
    };
  } catch (error) {
    console.error('Error calculating business metrics:', error);
    throw error;
  }
}

/**
 * Helper function to format date key based on granularity
 */
function formatDateKey(date: Date, granularity: 'day' | 'week' | 'month'): string {
  const d = new Date(date);
  
  if (granularity === 'day') {
    return d.toISOString().split('T')[0];
  } else if (granularity === 'week') {
    // Get the Monday of the week
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  } else {
    // Month
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}
