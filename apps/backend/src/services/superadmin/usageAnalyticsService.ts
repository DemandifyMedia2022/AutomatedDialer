import { db } from '../../db/prisma';

/**
 * Feature usage statistics interface
 */
export interface FeatureUsageStats {
  featureName: string;
  dailyActiveUsers: number;
  totalInteractions: number;
  avgInteractionsPerUser: number;
  growthRate: number; // Percentage change from previous period
}

/**
 * User engagement metrics interface
 */
export interface UserEngagementMetrics {
  avgSessionDuration: number; // in seconds
  sessionsPerUser: number;
  avgCallsPerSession: number;
  avgNotesPerUser: number;
  avgDocumentsPerUser: number;
  featureInteractionFrequency: Record<string, number>; // Feature name -> interactions per user
}

/**
 * User journey step interface
 */
export interface UserJourneyStep {
  step: string;
  userCount: number;
  avgTimeToNextStep: number; // in seconds
  completionRate: number; // percentage
}

/**
 * Cohort analysis interface
 */
export interface CohortAnalysis {
  cohortDate: Date;
  cohortSize: number;
  retentionRates: {
    week1: number;
    week2: number;
    week4: number;
    week8: number;
  };
  avgLifetimeValue: number;
  churnRate: number;
}

/**
 * Calculate feature usage statistics
 * Shows daily active users and interaction counts for each major feature
 */
export async function calculateFeatureUsageStats(
  startDate: Date,
  endDate: Date
): Promise<FeatureUsageStats[]> {
  try {
    const features: FeatureUsageStats[] = [];

    // Calculate previous period for growth rate comparison
    const periodDuration = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodDuration);

    // Feature 1: Manual Dialer
    const currentDialerUsers = await db.calls.findMany({
      where: {
        start_time: { gte: startDate, lte: endDate },
        useremail: { not: null },
      },
      select: { useremail: true, id: true },
    });

    const previousDialerUsers = await db.calls.findMany({
      where: {
        start_time: { gte: previousStartDate, lt: startDate },
        useremail: { not: null },
      },
      select: { useremail: true },
    });

    const dialerUniqueUsers = new Set(currentDialerUsers.map(c => c.useremail)).size;
    const prevDialerUniqueUsers = new Set(previousDialerUsers.map(c => c.useremail)).size;
    const dialerGrowth = prevDialerUniqueUsers > 0
      ? ((dialerUniqueUsers - prevDialerUniqueUsers) / prevDialerUniqueUsers) * 100
      : 0;

    features.push({
      featureName: 'Manual Dialer',
      dailyActiveUsers: dialerUniqueUsers,
      totalInteractions: currentDialerUsers.length,
      avgInteractionsPerUser: dialerUniqueUsers > 0 
        ? currentDialerUsers.length / dialerUniqueUsers 
        : 0,
      growthRate: Math.round(dialerGrowth * 100) / 100,
    });

    // Feature 2: Campaign Management
    const currentCampaignUsers = await db.campaigns.findMany({
      where: {
        created_at: { gte: startDate, lte: endDate },
        assigned_to: { not: null },
      },
      select: { assigned_to: true, id: true },
    });

    const previousCampaignUsers = await db.campaigns.findMany({
      where: {
        created_at: { gte: previousStartDate, lt: startDate },
        assigned_to: { not: null },
      },
      select: { assigned_to: true },
    });

    const campaignUniqueUsers = new Set(currentCampaignUsers.map(c => c.assigned_to)).size;
    const prevCampaignUniqueUsers = new Set(previousCampaignUsers.map(c => c.assigned_to)).size;
    const campaignGrowth = prevCampaignUniqueUsers > 0
      ? ((campaignUniqueUsers - prevCampaignUniqueUsers) / prevCampaignUniqueUsers) * 100
      : 0;

    features.push({
      featureName: 'Campaign Management',
      dailyActiveUsers: campaignUniqueUsers,
      totalInteractions: currentCampaignUsers.length,
      avgInteractionsPerUser: campaignUniqueUsers > 0 
        ? currentCampaignUsers.length / campaignUniqueUsers 
        : 0,
      growthRate: Math.round(campaignGrowth * 100) / 100,
    });

    // Feature 3: Call Notes
    const currentNotesUsers = await db.notes.findMany({
      where: {
        created_at: { gte: startDate, lte: endDate },
      },
      select: { user_id: true, id: true },
    });

    const previousNotesUsers = await db.notes.findMany({
      where: {
        created_at: { gte: previousStartDate, lt: startDate },
      },
      select: { user_id: true },
    });

    const notesUniqueUsers = new Set(currentNotesUsers.map(n => n.user_id)).size;
    const prevNotesUniqueUsers = new Set(previousNotesUsers.map(n => n.user_id)).size;
    const notesGrowth = prevNotesUniqueUsers > 0
      ? ((notesUniqueUsers - prevNotesUniqueUsers) / prevNotesUniqueUsers) * 100
      : 0;

    features.push({
      featureName: 'Call Notes',
      dailyActiveUsers: notesUniqueUsers,
      totalInteractions: currentNotesUsers.length,
      avgInteractionsPerUser: notesUniqueUsers > 0 
        ? currentNotesUsers.length / notesUniqueUsers 
        : 0,
      growthRate: Math.round(notesGrowth * 100) / 100,
    });

    // Feature 4: QA Reviews
    const currentQAUsers = await db.qa_call_reviews.findMany({
      where: {
        created_at: { gte: startDate, lte: endDate },
      },
      select: { reviewer_user_id: true, id: true },
    });

    const previousQAUsers = await db.qa_call_reviews.findMany({
      where: {
        created_at: { gte: previousStartDate, lt: startDate },
      },
      select: { reviewer_user_id: true },
    });

    const qaUniqueUsers = new Set(currentQAUsers.map(q => q.reviewer_user_id)).size;
    const prevQAUniqueUsers = new Set(previousQAUsers.map(q => q.reviewer_user_id)).size;
    const qaGrowth = prevQAUniqueUsers > 0
      ? ((qaUniqueUsers - prevQAUniqueUsers) / prevQAUniqueUsers) * 100
      : 0;

    features.push({
      featureName: 'QA Reviews',
      dailyActiveUsers: qaUniqueUsers,
      totalInteractions: currentQAUsers.length,
      avgInteractionsPerUser: qaUniqueUsers > 0 
        ? currentQAUsers.length / qaUniqueUsers 
        : 0,
      growthRate: Math.round(qaGrowth * 100) / 100,
    });

    // Feature 5: Document Management
    const currentDocUsers = await db.documents.findMany({
      where: {
        created_at: { gte: startDate, lte: endDate },
      },
      select: { created_by: true, id: true },
    });

    const previousDocUsers = await db.documents.findMany({
      where: {
        created_at: { gte: previousStartDate, lt: startDate },
      },
      select: { created_by: true },
    });

    const docUniqueUsers = new Set(currentDocUsers.map(d => d.created_by)).size;
    const prevDocUniqueUsers = new Set(previousDocUsers.map(d => d.created_by)).size;
    const docGrowth = prevDocUniqueUsers > 0
      ? ((docUniqueUsers - prevDocUniqueUsers) / prevDocUniqueUsers) * 100
      : 0;

    features.push({
      featureName: 'Document Management',
      dailyActiveUsers: docUniqueUsers,
      totalInteractions: currentDocUsers.length,
      avgInteractionsPerUser: docUniqueUsers > 0 
        ? currentDocUsers.length / docUniqueUsers 
        : 0,
      growthRate: Math.round(docGrowth * 100) / 100,
    });

    return features;
  } catch (error) {
    console.error('Error calculating feature usage stats:', error);
    throw error;
  }
}

/**
 * Calculate user engagement metrics
 * Shows how engaged users are with the platform
 */
export async function calculateUserEngagementMetrics(
  startDate: Date,
  endDate: Date
): Promise<UserEngagementMetrics> {
  try {
    // Calculate average session duration
    const sessions = await db.agent_sessions.findMany({
      where: {
        login_at: { gte: startDate, lte: endDate },
        logout_at: { not: null },
      },
      select: {
        user_id: true,
        login_at: true,
        logout_at: true,
      },
    });

    let totalSessionDuration = 0;
    const userSessionCounts = new Map<number, number>();

    for (const session of sessions) {
      if (session.logout_at) {
        const duration = session.logout_at.getTime() - session.login_at.getTime();
        totalSessionDuration += duration;
        userSessionCounts.set(
          session.user_id,
          (userSessionCounts.get(session.user_id) || 0) + 1
        );
      }
    }

    const avgSessionDuration = sessions.length > 0
      ? Math.round(totalSessionDuration / sessions.length / 1000) // Convert to seconds
      : 0;

    const uniqueUsers = userSessionCounts.size;
    const sessionsPerUser = uniqueUsers > 0
      ? sessions.length / uniqueUsers
      : 0;

    // Calculate calls per session
    const calls = await db.calls.findMany({
      where: {
        start_time: { gte: startDate, lte: endDate },
      },
      select: { id: true },
    });

    const avgCallsPerSession = sessions.length > 0
      ? calls.length / sessions.length
      : 0;

    // Calculate notes per user
    const notes = await db.notes.findMany({
      where: {
        created_at: { gte: startDate, lte: endDate },
      },
      select: { user_id: true },
    });

    const notesUserCount = new Set(notes.map(n => n.user_id)).size;
    const avgNotesPerUser = notesUserCount > 0
      ? notes.length / notesUserCount
      : 0;

    // Calculate documents per user
    const documents = await db.documents.findMany({
      where: {
        created_at: { gte: startDate, lte: endDate },
      },
      select: { created_by: true },
    });

    const docUserCount = new Set(documents.map(d => d.created_by)).size;
    const avgDocumentsPerUser = docUserCount > 0
      ? documents.length / docUserCount
      : 0;

    // Calculate feature interaction frequency
    const featureStats = await calculateFeatureUsageStats(startDate, endDate);
    const featureInteractionFrequency: Record<string, number> = {};
    
    for (const feature of featureStats) {
      featureInteractionFrequency[feature.featureName] = 
        Math.round(feature.avgInteractionsPerUser * 100) / 100;
    }

    return {
      avgSessionDuration,
      sessionsPerUser: Math.round(sessionsPerUser * 100) / 100,
      avgCallsPerSession: Math.round(avgCallsPerSession * 100) / 100,
      avgNotesPerUser: Math.round(avgNotesPerUser * 100) / 100,
      avgDocumentsPerUser: Math.round(avgDocumentsPerUser * 100) / 100,
      featureInteractionFrequency,
    };
  } catch (error) {
    console.error('Error calculating user engagement metrics:', error);
    throw error;
  }
}

/**
 * Calculate user journey analytics
 * Shows common navigation paths and feature adoption sequences
 */
export async function calculateUserJourneyAnalytics(
  startDate: Date,
  endDate: Date
): Promise<UserJourneyStep[]> {
  try {
    // Get users who registered in the period
    const newUsers = await db.users.findMany({
      where: {
        created_at: { gte: startDate, lte: endDate },
      },
      select: {
        id: true,
        created_at: true,
      },
    });

    const userIds = newUsers.map(u => u.id);
    const journey: UserJourneyStep[] = [];

    // Step 1: Registration (baseline)
    journey.push({
      step: 'Registration',
      userCount: newUsers.length,
      avgTimeToNextStep: 0,
      completionRate: 100,
    });

    if (newUsers.length === 0) {
      return journey;
    }

    // Step 2: First Login
    const firstLogins = await db.agent_sessions.findMany({
      where: {
        user_id: { in: userIds },
      },
      select: {
        user_id: true,
        login_at: true,
      },
      orderBy: {
        login_at: 'asc',
      },
    });

    const userFirstLogin = new Map<number, Date>();
    for (const login of firstLogins) {
      if (!userFirstLogin.has(login.user_id)) {
        userFirstLogin.set(login.user_id, login.login_at);
      }
    }

    let totalTimeToFirstLogin = 0;
    for (const user of newUsers) {
      const firstLogin = userFirstLogin.get(user.id);
      if (firstLogin && user.created_at) {
        totalTimeToFirstLogin += firstLogin.getTime() - user.created_at.getTime();
      }
    }

    const firstLoginCount = userFirstLogin.size;
    const avgTimeToFirstLogin = firstLoginCount > 0
      ? Math.round(totalTimeToFirstLogin / firstLoginCount / 1000)
      : 0;

    journey.push({
      step: 'First Login',
      userCount: firstLoginCount,
      avgTimeToNextStep: avgTimeToFirstLogin,
      completionRate: (firstLoginCount / newUsers.length) * 100,
    });

    // Step 3: First Call
    // Get user emails for matching
    const usersWithEmails = await db.users.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        usermail: true,
        created_at: true,
      },
    });

    const userEmails = usersWithEmails
      .map(u => u.usermail)
      .filter((email): email is string => email !== null);

    const firstCalls = await db.calls.findMany({
      where: {
        useremail: {
          in: userEmails,
        },
      },
      select: {
        useremail: true,
        start_time: true,
      },
      orderBy: {
        start_time: 'asc',
      },
    });

    const emailToUserId = new Map<string, { id: number; created_at: Date | null }>();
    for (const user of usersWithEmails) {
      if (user.usermail) {
        emailToUserId.set(user.usermail, { id: user.id, created_at: user.created_at });
      }
    }

    const userFirstCall = new Map<number, Date>();
    for (const call of firstCalls) {
      if (call.useremail) {
        const userData = emailToUserId.get(call.useremail);
        if (userData && !userFirstCall.has(userData.id)) {
          userFirstCall.set(userData.id, call.start_time);
        }
      }
    }

    let totalTimeToFirstCall = 0;
    for (const [userId, callTime] of userFirstCall.entries()) {
      const loginTime = userFirstLogin.get(userId);
      if (loginTime) {
        totalTimeToFirstCall += callTime.getTime() - loginTime.getTime();
      }
    }

    const firstCallCount = userFirstCall.size;
    const avgTimeToFirstCall = firstCallCount > 0
      ? Math.round(totalTimeToFirstCall / firstCallCount / 1000)
      : 0;

    journey.push({
      step: 'First Call',
      userCount: firstCallCount,
      avgTimeToNextStep: avgTimeToFirstCall,
      completionRate: firstLoginCount > 0 
        ? (firstCallCount / firstLoginCount) * 100 
        : 0,
    });

    // Step 4: Campaign Creation
    const firstCampaigns = await db.campaigns.findMany({
      where: {
        assigned_to: {
          in: usersWithEmails.map(u => u.usermail).filter(Boolean) as string[],
        },
      },
      select: {
        assigned_to: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'asc',
      },
    });

    const userFirstCampaign = new Map<number, Date>();
    for (const campaign of firstCampaigns) {
      if (campaign.assigned_to && campaign.created_at) {
        const userData = emailToUserId.get(campaign.assigned_to);
        if (userData && !userFirstCampaign.has(userData.id)) {
          userFirstCampaign.set(userData.id, campaign.created_at);
        }
      }
    }

    let totalTimeToFirstCampaign = 0;
    for (const [userId, campaignTime] of userFirstCampaign.entries()) {
      const callTime = userFirstCall.get(userId);
      if (callTime) {
        totalTimeToFirstCampaign += campaignTime.getTime() - callTime.getTime();
      }
    }

    const firstCampaignCount = userFirstCampaign.size;
    const avgTimeToFirstCampaign = firstCampaignCount > 0
      ? Math.round(totalTimeToFirstCampaign / firstCampaignCount / 1000)
      : 0;

    journey.push({
      step: 'Campaign Creation',
      userCount: firstCampaignCount,
      avgTimeToNextStep: avgTimeToFirstCampaign,
      completionRate: firstCallCount > 0 
        ? (firstCampaignCount / firstCallCount) * 100 
        : 0,
    });

    // Step 5: Active User (multiple sessions)
    const activeUserSessions = await db.agent_sessions.groupBy({
      by: ['user_id'],
      where: {
        user_id: { in: userIds },
      },
      _count: {
        id: true,
      },
      having: {
        user_id: {
          _count: {
            gte: 3,
          },
        },
      },
    });

    const activeUserCount = activeUserSessions.length;

    journey.push({
      step: 'Active User (3+ sessions)',
      userCount: activeUserCount,
      avgTimeToNextStep: 0,
      completionRate: firstCampaignCount > 0 
        ? (activeUserCount / firstCampaignCount) * 100 
        : 0,
    });

    // Round completion rates
    journey.forEach(step => {
      step.completionRate = Math.round(step.completionRate * 100) / 100;
    });

    return journey;
  } catch (error) {
    console.error('Error calculating user journey analytics:', error);
    throw error;
  }
}

/**
 * Calculate cohort analysis
 * Shows user retention rates segmented by registration date
 */
export async function calculateCohortAnalysis(
  startDate: Date,
  endDate: Date
): Promise<CohortAnalysis[]> {
  try {
    const cohorts: CohortAnalysis[] = [];

    // Group users by registration month
    const users = await db.users.findMany({
      where: {
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        created_at: true,
      },
    });

    // Group by month
    const cohortMap = new Map<string, { date: Date; userIds: number[] }>();
    
    for (const user of users) {
      if (user.created_at) {
        const monthKey = `${user.created_at.getFullYear()}-${String(user.created_at.getMonth() + 1).padStart(2, '0')}`;
        
        if (!cohortMap.has(monthKey)) {
          const cohortDate = new Date(user.created_at.getFullYear(), user.created_at.getMonth(), 1);
          cohortMap.set(monthKey, { date: cohortDate, userIds: [] });
        }
        
        cohortMap.get(monthKey)!.userIds.push(user.id);
      }
    }

    // Calculate retention for each cohort
    for (const [monthKey, cohort] of cohortMap.entries()) {
      const cohortSize = cohort.userIds.length;
      
      // Calculate retention rates for different time periods
      const week1End = new Date(cohort.date.getTime() + 7 * 24 * 60 * 60 * 1000);
      const week2End = new Date(cohort.date.getTime() + 14 * 24 * 60 * 60 * 1000);
      const week4End = new Date(cohort.date.getTime() + 28 * 24 * 60 * 60 * 1000);
      const week8End = new Date(cohort.date.getTime() + 56 * 24 * 60 * 60 * 1000);

      // Get active users for each period
      const week1Active = await db.agent_sessions.groupBy({
        by: ['user_id'],
        where: {
          user_id: { in: cohort.userIds },
          login_at: {
            gte: cohort.date,
            lte: week1End,
          },
        },
      });

      const week2Active = await db.agent_sessions.groupBy({
        by: ['user_id'],
        where: {
          user_id: { in: cohort.userIds },
          login_at: {
            gte: week1End,
            lte: week2End,
          },
        },
      });

      const week4Active = await db.agent_sessions.groupBy({
        by: ['user_id'],
        where: {
          user_id: { in: cohort.userIds },
          login_at: {
            gte: week2End,
            lte: week4End,
          },
        },
      });

      const week8Active = await db.agent_sessions.groupBy({
        by: ['user_id'],
        where: {
          user_id: { in: cohort.userIds },
          login_at: {
            gte: week4End,
            lte: week8End,
          },
        },
      });

      // Calculate retention rates
      const week1Retention = cohortSize > 0 ? (week1Active.length / cohortSize) * 100 : 0;
      const week2Retention = cohortSize > 0 ? (week2Active.length / cohortSize) * 100 : 0;
      const week4Retention = cohortSize > 0 ? (week4Active.length / cohortSize) * 100 : 0;
      const week8Retention = cohortSize > 0 ? (week8Active.length / cohortSize) * 100 : 0;

      // Calculate churn rate (users who never came back after week 1)
      const churnedUsers = cohortSize - week1Active.length;
      const churnRate = cohortSize > 0 ? (churnedUsers / cohortSize) * 100 : 0;

      cohorts.push({
        cohortDate: cohort.date,
        cohortSize,
        retentionRates: {
          week1: Math.round(week1Retention * 100) / 100,
          week2: Math.round(week2Retention * 100) / 100,
          week4: Math.round(week4Retention * 100) / 100,
          week8: Math.round(week8Retention * 100) / 100,
        },
        avgLifetimeValue: 0, // Placeholder - would need billing data
        churnRate: Math.round(churnRate * 100) / 100,
      });
    }

    // Sort by cohort date
    cohorts.sort((a, b) => a.cohortDate.getTime() - b.cohortDate.getTime());

    return cohorts;
  } catch (error) {
    console.error('Error calculating cohort analysis:', error);
    throw error;
  }
}
