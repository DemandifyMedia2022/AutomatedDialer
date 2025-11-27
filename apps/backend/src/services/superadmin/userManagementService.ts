import { db } from '../../db/prisma';
import { getPool } from '../../db/pool';
import bcrypt from 'bcryptjs';

/**
 * User management service for superadmin dashboard
 * Provides CRUD operations, search, filtering, and role management
 */

export interface UserFilters {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  role: 'agent' | 'manager' | 'qa' | 'superadmin';
  extension?: string | null;
  status?: 'active' | 'inactive' | 'suspended';
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  role?: 'agent' | 'manager' | 'qa' | 'superadmin';
  extension?: string | null;
  status?: 'active' | 'inactive' | 'suspended';
  password?: string;
}

/**
 * Get paginated list of users with optional filters
 */
export async function getUsers(filters: UserFilters = {}) {
  const {
    search = '',
    role,
    status,
    page = 1,
    limit = 20,
  } = filters;

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {};

  if (search) {
    where.OR = [
      { username: { contains: search } },
      { usermail: { contains: search } },
      { unique_user_id: { contains: search } },
    ];
  }

  if (role) {
    where.role = role;
  }

  if (status) {
    where.status = status;
  }

  // Get total count for pagination
  const total = await db.users.count({ where });

  // Get users with pagination
  const users = await db.users.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      username: true,
      usermail: true,
      unique_user_id: true,
      role: true,
      status: true,
      extension: true,
      created_at: true,
      updated_at: true,
      // Get last login from agent_sessions
      agent_sessions: {
        where: { is_active: false },
        orderBy: { logout_at: 'desc' },
        take: 1,
        select: { logout_at: true },
      },
    },
  });

  // Transform data to include last_login
  const transformedUsers = users.map(user => ({
    id: Number(user.id),
    username: user.username,
    email: user.usermail,
    unique_user_id: user.unique_user_id,
    role: user.role,
    status: user.status,
    extension: user.extension,
    created_at: user.created_at,
    updated_at: user.updated_at,
    last_login: user.agent_sessions[0]?.logout_at || null,
  }));

  return {
    users: transformedUsers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get user by ID with detailed information
 */
export async function getUserById(userId: number) {
  const user = await db.users.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      usermail: true,
      unique_user_id: true,
      role: true,
      status: true,
      extension: true,
      created_at: true,
      updated_at: true,
      // Get session statistics
      agent_sessions: {
        select: {
          id: true,
          login_at: true,
          logout_at: true,
          is_active: true,
        },
        orderBy: { login_at: 'desc' },
        take: 10,
      },
      // Get call statistics
      _count: {
        select: {
          notes: true,
          documents: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  // Get call count using raw query for performance
  const pool = getPool();
  const [callRows]: any = await pool.query(
    'SELECT COUNT(*) as call_count FROM calls WHERE useremail = ?',
    [user.usermail]
  );
  const callCount = Number(callRows[0]?.call_count || 0);

  // Get campaign count
  const [campaignRows]: any = await pool.query(
    'SELECT COUNT(DISTINCT campaign_name) as campaign_count FROM calls WHERE useremail = ?',
    [user.usermail]
  );
  const campaignCount = Number(campaignRows[0]?.campaign_count || 0);

  return {
    id: Number(user.id),
    username: user.username,
    email: user.usermail,
    unique_user_id: user.unique_user_id,
    role: user.role,
    status: user.status,
    extension: user.extension,
    created_at: user.created_at,
    updated_at: user.updated_at,
    last_login: user.agent_sessions[0]?.logout_at || null,
    statistics: {
      total_calls: callCount,
      total_campaigns: campaignCount,
      total_notes: user._count.notes,
      total_documents: user._count.documents,
      total_sessions: user.agent_sessions.length,
    },
    recent_sessions: user.agent_sessions.slice(0, 5).map(session => ({
      id: Number(session.id),
      login_at: session.login_at,
      logout_at: session.logout_at,
      is_active: session.is_active,
    })),
  };
}

/**
 * Create a new user
 */
export async function createUser(data: CreateUserData) {
  const { username, email, password, role, extension, status = 'active' } = data;

  // Check if user already exists
  const existing = await db.users.findFirst({
    where: { usermail: email },
  });

  if (existing) {
    throw new Error('User with this email already exists');
  }

  // If creating an agent, validate extension
  if (role === 'agent' && extension) {
    const pool = getPool();
    const [extRows]: any = await pool.query(
      'SELECT extension_id FROM extensions WHERE extension_id = ? LIMIT 1',
      [extension]
    );

    if (!extRows || extRows.length === 0) {
      throw new Error('Extension not found');
    }

    // Check extension capacity (max 10 users per extension)
    const assignedCount = await db.users.count({
      where: { extension },
    });

    if (assignedCount >= 10) {
      throw new Error('Extension capacity reached (max 10 users)');
    }
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Generate unique user ID
  const uniqueUserId = await generateUniqueUserId(username, email);

  // Create user
  const user = await db.users.create({
    data: {
      username,
      usermail: email,
      password: hashedPassword,
      role,
      status,
      unique_user_id: uniqueUserId,
      extension: extension || null,
    },
    select: {
      id: true,
      username: true,
      usermail: true,
      unique_user_id: true,
      role: true,
      status: true,
      extension: true,
      created_at: true,
      updated_at: true,
    },
  });

  return {
    id: Number(user.id),
    username: user.username,
    email: user.usermail,
    unique_user_id: user.unique_user_id,
    role: user.role,
    status: user.status,
    extension: user.extension,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

/**
 * Update user information
 */
export async function updateUser(userId: number, data: UpdateUserData) {
  // Check if user exists
  const existingUser = await db.users.findUnique({
    where: { id: userId },
    select: { id: true, role: true, usermail: true },
  });

  if (!existingUser) {
    throw new Error('User not found');
  }

  const updateData: any = {};

  if (data.username !== undefined) {
    updateData.username = data.username;
  }

  if (data.email !== undefined) {
    // Check if email is already taken by another user
    const emailTaken = await db.users.findFirst({
      where: {
        usermail: data.email,
        NOT: { id: userId },
      },
    });

    if (emailTaken) {
      throw new Error('Email already in use by another user');
    }

    updateData.usermail = data.email;
  }

  if (data.role !== undefined) {
    // Prevent changing role of last superadmin
    if (existingUser.role === 'superadmin' && data.role !== 'superadmin') {
      const superadminCount = await db.users.count({
        where: { role: 'superadmin' },
      });

      if (superadminCount <= 1) {
        throw new Error('Cannot change role of the last superadmin');
      }
    }

    updateData.role = data.role;
  }

  if (data.status !== undefined) {
    updateData.status = data.status;
  }

  if (data.extension !== undefined) {
    if (data.extension === null || data.extension === '') {
      updateData.extension = null;
    } else {
      // Validate extension exists
      const pool = getPool();
      const [extRows]: any = await pool.query(
        'SELECT extension_id FROM extensions WHERE extension_id = ? LIMIT 1',
        [data.extension]
      );

      if (!extRows || extRows.length === 0) {
        throw new Error('Extension not found');
      }

      // Check extension capacity (excluding current user)
      const assignedCount = await db.users.count({
        where: {
          extension: data.extension,
          NOT: { id: userId },
        },
      });

      if (assignedCount >= 10) {
        throw new Error('Extension capacity reached (max 10 users)');
      }

      updateData.extension = data.extension;
    }
  }

  if (data.password !== undefined) {
    updateData.password = await bcrypt.hash(data.password, 10);
  }

  // Update user
  const updatedUser = await db.users.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      username: true,
      usermail: true,
      unique_user_id: true,
      role: true,
      status: true,
      extension: true,
      created_at: true,
      updated_at: true,
    },
  });

  return {
    id: updatedUser.id,
    username: updatedUser.username,
    email: updatedUser.usermail,
    unique_user_id: updatedUser.unique_user_id,
    role: updatedUser.role,
    status: updatedUser.status,
    extension: updatedUser.extension,
    created_at: updatedUser.created_at,
    updated_at: updatedUser.updated_at,
  };
}

/**
 * Delete a user
 */
export async function deleteUser(userId: number) {
  // Check if user exists
  const user = await db.users.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Prevent deleting last superadmin
  if (user.role === 'superadmin') {
    const superadminCount = await db.users.count({
      where: { role: 'superadmin' },
    });

    if (superadminCount <= 1) {
      throw new Error('Cannot delete the last superadmin');
    }
  }

  // Delete user (cascade will handle related records)
  await db.users.delete({
    where: { id: userId },
  });

  return { success: true };
}

/**
 * Update user status (active, inactive, suspended)
 */
export async function updateUserStatus(
  userId: number,
  status: 'active' | 'inactive' | 'suspended'
) {
  const user = await db.users.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Prevent suspending last superadmin
  if (user.role === 'superadmin' && status !== 'active') {
    const activeSuperadminCount = await db.users.count({
      where: {
        role: 'superadmin',
        status: 'active',
      },
    });

    if (activeSuperadminCount <= 1) {
      throw new Error('Cannot suspend the last active superadmin');
    }
  }

  const updatedUser = await db.users.update({
    where: { id: userId },
    data: { status },
    select: {
      id: true,
      username: true,
      usermail: true,
      unique_user_id: true,
      role: true,
      status: true,
      extension: true,
      created_at: true,
      updated_at: true,
    },
  });

  return {
    id: updatedUser.id,
    username: updatedUser.username,
    email: updatedUser.usermail,
    unique_user_id: updatedUser.unique_user_id,
    role: updatedUser.role,
    status: updatedUser.status,
    extension: updatedUser.extension,
    created_at: updatedUser.created_at,
    updated_at: updatedUser.updated_at,
  };
}

/**
 * Assign role to user
 */
export async function assignRole(
  userId: number,
  role: 'agent' | 'manager' | 'qa' | 'superadmin'
) {
  const user = await db.users.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Prevent changing role of last superadmin
  if (user.role === 'superadmin' && role !== 'superadmin') {
    const superadminCount = await db.users.count({
      where: { role: 'superadmin' },
    });

    if (superadminCount <= 1) {
      throw new Error('Cannot change role of the last superadmin');
    }
  }

  const updatedUser = await db.users.update({
    where: { id: userId },
    data: { role },
    select: {
      id: true,
      username: true,
      usermail: true,
      unique_user_id: true,
      role: true,
      status: true,
      extension: true,
      created_at: true,
      updated_at: true,
    },
  });

  return {
    id: updatedUser.id,
    username: updatedUser.username,
    email: updatedUser.usermail,
    unique_user_id: updatedUser.unique_user_id,
    role: updatedUser.role,
    status: updatedUser.status,
    extension: updatedUser.extension,
    created_at: updatedUser.created_at,
    updated_at: updatedUser.updated_at,
  };
}

/**
 * Generate unique user ID based on username and email
 */
async function generateUniqueUserId(username: string, email: string): Promise<string> {
  // Build initials from username (fallback to first two chars of email local part)
  const initFromName = (name: string) =>
    name
      .split(/\s+/)
      .filter(Boolean)
      .map(w => w[0] || '')
      .join('');

  const rawInitials = initFromName(username || '') || email.split('@')[0] || '';
  const lettersOnly = rawInitials.replace(/[^A-Za-z]/g, '');
  const initials = (lettersOnly || 'XX').slice(0, 2).toUpperCase();

  // Compute next serial using lexicographic max of zero-padded suffix
  const prefix = `DM-${initials}-`;
  const last = await db.users.findFirst({
    where: { unique_user_id: { startsWith: prefix } },
    select: { unique_user_id: true },
    orderBy: { unique_user_id: 'desc' },
  });

  const lastNum = last?.unique_user_id?.match(/^(?:DM-[A-Z]{1,2}-)(\d{4})$/)?.[1];
  let next = lastNum ? parseInt(lastNum, 10) + 1 : 1;
  let uniqueId = '';

  // Increment until we find a free ID (handles race conditions and gaps)
  for (let attempts = 0; attempts < 1000; attempts++) {
    const candidate = `${prefix}${String(next).padStart(4, '0')}`;
    const exists = await db.users.findFirst({
      where: { unique_user_id: candidate },
      select: { id: true },
    });

    if (!exists) {
      uniqueId = candidate;
      break;
    }
    next += 1;
  }

  // Fallback if all attempts exhausted
  if (!uniqueId) {
    uniqueId = `${prefix}${String(Date.now()).slice(-4)}`;
  }

  return uniqueId;
}
