import { db } from '../db/prisma';
import { getPool } from '../db/pool';

/**
 * Service for organization-aware data queries
 * Ensures data segregation between organizations
 */

export interface OrganizationContext {
  organizationId: number | null;
  canAccessAllOrganizations: boolean;
}

/**
 * Get leaderboard data filtered by organization
 */
export async function getOrganizationLeaderboard(
  context: OrganizationContext,
  filters: {
    startDate?: string;
    endDate?: string;
    limit?: number;
  } = {}
) {
  const { startDate, endDate, limit = 10 } = filters;
  const pool = getPool();

  let query = `
    SELECT 
      u.id,
      u.username,
      u.usermail,
      u.extension,
      u.organization_id,
      o.name as organization_name,
      COUNT(c.id) as total_calls,
      SUM(CASE WHEN c.disposition = 'ANSWERED' THEN 1 ELSE 0 END) as answered_calls,
      SUM(c.call_duration) as total_call_time,
      AVG(c.call_duration) as avg_call_duration,
      ROUND(
        (SUM(CASE WHEN c.disposition = 'ANSWERED' THEN 1 ELSE 0 END) * 100.0 / COUNT(c.id)), 
        2
      ) as answer_rate
    FROM users u
    LEFT JOIN calls c ON u.usermail = c.useremail
    LEFT JOIN organizations o ON u.organization_id = o.id
    WHERE u.role = 'agent' AND u.status = 'active'
  `;

  const params: any[] = [];

  // Organization filtering
  if (!context.canAccessAllOrganizations && context.organizationId) {
    query += ' AND u.organization_id = ?';
    params.push(context.organizationId);
  }

  // Date filtering
  if (startDate) {
    query += ' AND c.start_time >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND c.start_time <= ?';
    params.push(endDate);
  }

  query += `
    GROUP BY u.id, u.username, u.usermail, u.extension, u.organization_id, o.name
    HAVING total_calls > 0
    ORDER BY total_calls DESC, answer_rate DESC
    LIMIT ?
  `;

  params.push(limit);

  const [rows]: any = await pool.query(query, params);

  return rows.map((row: any) => ({
    id: row.id,
    username: row.username,
    email: row.usermail,
    extension: row.extension,
    organization_id: row.organization_id,
    organization_name: row.organization_name,
    total_calls: Number(row.total_calls),
    answered_calls: Number(row.answered_calls),
    total_call_time: Number(row.total_call_time),
    avg_call_duration: Number(row.avg_call_duration) || 0,
    answer_rate: Number(row.answer_rate) || 0,
  }));
}

/**
 * Get campaign statistics filtered by organization
 */
export async function getOrganizationCampaignStats(
  context: OrganizationContext,
  filters: {
    startDate?: string;
    endDate?: string;
    campaignId?: number;
  } = {}
) {
  const { startDate, endDate, campaignId } = filters;
  const pool = getPool();

  let query = `
    SELECT 
      c.campaign_name,
      c.organization_id,
      o.name as organization_name,
      COUNT(c.id) as total_calls,
      SUM(CASE WHEN c.disposition = 'ANSWERED' THEN 1 ELSE 0 END) as answered_calls,
      SUM(CASE WHEN c.disposition = 'BUSY' THEN 1 ELSE 0 END) as busy_calls,
      SUM(CASE WHEN c.disposition = 'NO_ANSWER' THEN 1 ELSE 0 END) as no_answer_calls,
      SUM(c.call_duration) as total_call_time,
      AVG(c.call_duration) as avg_call_duration
    FROM calls c
    LEFT JOIN organizations o ON c.organization_id = o.id
    WHERE 1=1
  `;

  const params: any[] = [];

  // Organization filtering
  if (!context.canAccessAllOrganizations && context.organizationId) {
    query += ' AND c.organization_id = ?';
    params.push(context.organizationId);
  }

  // Campaign filtering
  if (campaignId) {
    query += ' AND c.campaign_name = (SELECT campaign_name FROM campaigns WHERE id = ?)';
    params.push(campaignId);
  }

  // Date filtering
  if (startDate) {
    query += ' AND c.start_time >= ?';
    params.push(startDate);
  }

  if (endDate) {
    query += ' AND c.start_time <= ?';
    params.push(endDate);
  }

  query += `
    GROUP BY c.campaign_name, c.organization_id, o.name
    ORDER BY total_calls DESC
  `;

  const [rows]: any = await pool.query(query, params);

  return rows.map((row: any) => ({
    campaign_name: row.campaign_name,
    organization_id: row.organization_id,
    organization_name: row.organization_name,
    total_calls: Number(row.total_calls),
    answered_calls: Number(row.answered_calls),
    busy_calls: Number(row.busy_calls),
    no_answer_calls: Number(row.no_answer_calls),
    total_call_time: Number(row.total_call_time),
    avg_call_duration: Number(row.avg_call_duration) || 0,
    answer_rate: Number(row.total_calls) > 0 ? 
      Number((Number(row.answered_calls) * 100 / Number(row.total_calls)).toFixed(2)) : 0,
  }));
}

/**
 * Get agent sessions filtered by organization
 */
export async function getOrganizationAgentSessions(
  context: OrganizationContext,
  filters: {
    startDate?: string;
    endDate?: string;
    userId?: number;
    isActive?: boolean;
  } = {}
) {
  const { startDate, endDate, userId, isActive } = filters;

  const whereClause: any = {};

  // Organization filtering
  if (!context.canAccessAllOrganizations && context.organizationId) {
    whereClause.organization_id = context.organizationId;
  }

  // User filtering
  if (userId) {
    whereClause.user_id = userId;
  }

  // Active session filtering
  if (isActive !== undefined) {
    whereClause.is_active = isActive;
  }

  // Date filtering
  if (startDate || endDate) {
    whereClause.login_at = {};
    if (startDate) {
      whereClause.login_at.gte = new Date(startDate);
    }
    if (endDate) {
      whereClause.login_at.lte = new Date(endDate);
    }
  }

  const sessions = await db.agent_sessions.findMany({
    where: whereClause,
    include: {
      users: {
        select: {
          id: true,
          username: true,
          usermail: true,
          extension: true,
          organization_id: true,
        },
      },
      organizations: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { login_at: 'desc' },
  });

  return sessions.map(session => ({
    id: Number(session.id),
    user_id: session.user_id,
    username: session.users?.username,
    email: session.users?.usermail,
    extension: session.users?.extension,
    organization_id: session.organization_id,
    organization_name: session.organizations?.name,
    login_at: session.login_at,
    logout_at: session.logout_at,
    last_activity_at: session.last_activity_at,
    is_active: session.is_active,
    ended_by: session.ended_by,
    end_reason: session.end_reason,
  }));
}

/**
 * Get calls filtered by organization
 */
export async function getOrganizationCalls(
  context: OrganizationContext,
  filters: {
    startDate?: string;
    endDate?: string;
    userId?: number;
    campaignName?: string;
    disposition?: string;
    page?: number;
    limit?: number;
  } = {}
) {
  const {
    startDate,
    endDate,
    userId,
    campaignName,
    disposition,
    page = 1,
    limit = 20,
  } = filters;

  const skip = (page - 1) * limit;
  const whereClause: any = {};

  // Organization filtering
  if (!context.canAccessAllOrganizations && context.organizationId) {
    whereClause.organization_id = context.organizationId;
  }

  // User filtering (by email since calls table uses useremail)
  if (userId) {
    const user = await db.users.findUnique({
      where: { id: userId },
      select: { usermail: true },
    });
    if (user) {
      whereClause.useremail = user.usermail;
    }
  }

  // Campaign filtering
  if (campaignName) {
    whereClause.campaign_name = campaignName;
  }

  // Disposition filtering
  if (disposition) {
    whereClause.disposition = disposition;
  }

  // Date filtering
  if (startDate || endDate) {
    whereClause.start_time = {};
    if (startDate) {
      whereClause.start_time.gte = new Date(startDate);
    }
    if (endDate) {
      whereClause.start_time.lte = new Date(endDate);
    }
  }

  // Get total count for pagination
  const total = await db.calls.count({ where: whereClause });

  // Get calls with pagination
  const calls = await db.calls.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: { start_time: 'desc' },
    select: {
      id: true,
      call_id: true,
      campaign_name: true,
      useremail: true,
      username: true,
      unique_id: true,
      start_time: true,
      answer_time: true,
      end_time: true,
      call_duration: true,
      source: true,
      destination: true,
      disposition: true,
      recording_url: true,
      prospect_name: true,
      prospect_email: true,
      prospect_company: true,
      organization_id: true,
    },
  });

  return {
    calls: calls.map(call => ({
      id: Number(call.id),
      call_id: call.call_id,
      campaign_name: call.campaign_name,
      useremail: call.useremail,
      username: call.username,
      unique_id: call.unique_id,
      start_time: call.start_time,
      answer_time: call.answer_time,
      end_time: call.end_time,
      call_duration: call.call_duration,
      source: call.source,
      destination: call.destination,
      disposition: call.disposition,
      recording_url: call.recording_url,
      prospect_name: call.prospect_name,
      prospect_email: call.prospect_email,
      prospect_company: call.prospect_company,
      organization_id: call.organization_id,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}