import { db } from '../../db/prisma';

/**
 * Role management service for superadmin dashboard
 * Provides role and permission management functionality
 */

export type RoleType = 'agent' | 'manager' | 'qa' | 'superadmin';

export type PermissionAction = 'create' | 'read' | 'update' | 'delete';

export interface Permission {
  resource: string;
  actions: PermissionAction[];
  description?: string;
}

export interface RolePermissions {
  role: RoleType;
  displayName: string;
  description: string;
  permissions: Permission[];
  userCount: number;
}

/**
 * Define permissions for each role
 * This is a code-based permission system where permissions are defined here
 * and can be modified through the API
 */
const ROLE_PERMISSIONS: Record<RoleType, Omit<RolePermissions, 'userCount'>> = {
  agent: {
    role: 'agent',
    displayName: 'Agent',
    description: 'Standard agent with access to dialing and call management',
    permissions: [
      {
        resource: 'calls',
        actions: ['create', 'read', 'update'],
        description: 'Make calls, view call history, and update call details',
      },
      {
        resource: 'notes',
        actions: ['create', 'read', 'update', 'delete'],
        description: 'Manage personal notes',
      },
      {
        resource: 'documents',
        actions: ['read'],
        description: 'View shared documents and guides',
      },
      {
        resource: 'campaigns',
        actions: ['read'],
        description: 'View assigned campaigns',
      },
      {
        resource: 'profile',
        actions: ['read', 'update'],
        description: 'View and update own profile',
      },
    ],
  },
  manager: {
    role: 'manager',
    displayName: 'Manager',
    description: 'Team manager with access to team analytics and campaign management',
    permissions: [
      {
        resource: 'calls',
        actions: ['create', 'read', 'update'],
        description: 'Make calls, view all team calls, and update call details',
      },
      {
        resource: 'notes',
        actions: ['create', 'read', 'update', 'delete'],
        description: 'Manage all notes',
      },
      {
        resource: 'documents',
        actions: ['create', 'read', 'update', 'delete'],
        description: 'Manage documents and guides',
      },
      {
        resource: 'campaigns',
        actions: ['create', 'read', 'update', 'delete'],
        description: 'Manage campaigns',
      },
      {
        resource: 'analytics',
        actions: ['read'],
        description: 'View team analytics and reports',
      },
      {
        resource: 'agents',
        actions: ['read'],
        description: 'View agent performance',
      },
      {
        resource: 'profile',
        actions: ['read', 'update'],
        description: 'View and update own profile',
      },
    ],
  },
  qa: {
    role: 'qa',
    displayName: 'QA Specialist',
    description: 'Quality assurance specialist with access to call reviews and quality metrics',
    permissions: [
      {
        resource: 'calls',
        actions: ['read'],
        description: 'View all calls for quality review',
      },
      {
        resource: 'qa_reviews',
        actions: ['create', 'read', 'update', 'delete'],
        description: 'Manage call quality reviews',
      },
      {
        resource: 'transcripts',
        actions: ['read'],
        description: 'View call transcripts',
      },
      {
        resource: 'notes',
        actions: ['read'],
        description: 'View call notes',
      },
      {
        resource: 'documents',
        actions: ['read'],
        description: 'View documents and guides',
      },
      {
        resource: 'analytics',
        actions: ['read'],
        description: 'View quality analytics',
      },
      {
        resource: 'profile',
        actions: ['read', 'update'],
        description: 'View and update own profile',
      },
    ],
  },
  superadmin: {
    role: 'superadmin',
    displayName: 'Super Administrator',
    description: 'Full system access with administrative privileges',
    permissions: [
      {
        resource: 'users',
        actions: ['create', 'read', 'update', 'delete'],
        description: 'Manage all users',
      },
      {
        resource: 'roles',
        actions: ['read', 'update'],
        description: 'Manage roles and permissions',
      },
      {
        resource: 'calls',
        actions: ['create', 'read', 'update', 'delete'],
        description: 'Full access to all calls',
      },
      {
        resource: 'campaigns',
        actions: ['create', 'read', 'update', 'delete'],
        description: 'Full access to campaigns',
      },
      {
        resource: 'documents',
        actions: ['create', 'read', 'update', 'delete'],
        description: 'Full access to documents',
      },
      {
        resource: 'notes',
        actions: ['create', 'read', 'update', 'delete'],
        description: 'Full access to notes',
      },
      {
        resource: 'qa_reviews',
        actions: ['create', 'read', 'update', 'delete'],
        description: 'Full access to QA reviews',
      },
      {
        resource: 'analytics',
        actions: ['read'],
        description: 'View all analytics and reports',
      },
      {
        resource: 'system',
        actions: ['read', 'update'],
        description: 'System monitoring and configuration',
      },
      {
        resource: 'audit_logs',
        actions: ['read'],
        description: 'View audit logs',
      },
      {
        resource: 'api_metrics',
        actions: ['read'],
        description: 'View API performance metrics',
      },
      {
        resource: 'feature_flags',
        actions: ['create', 'read', 'update', 'delete'],
        description: 'Manage feature flags',
      },
    ],
  },
};

/**
 * Get all roles with their permissions and user counts
 */
export async function getAllRoles(): Promise<RolePermissions[]> {
  // Get user counts for each role
  const roleCounts = await db.users.groupBy({
    by: ['role'],
    _count: {
      id: true,
    },
  });

  // Create a map of role to user count
  const countMap = new Map<string, number>();
  roleCounts.forEach((item) => {
    if (item.role) {
      countMap.set(item.role, item._count.id);
    }
  });

  // Build the response with user counts
  const roles: RolePermissions[] = Object.values(ROLE_PERMISSIONS).map((roleData) => ({
    ...roleData,
    userCount: countMap.get(roleData.role) || 0,
  }));

  return roles;
}

/**
 * Get a specific role with its permissions and user count
 */
export async function getRoleByName(roleName: RoleType): Promise<RolePermissions | null> {
  const roleData = ROLE_PERMISSIONS[roleName];
  
  if (!roleData) {
    return null;
  }

  // Get user count for this role
  const userCount = await db.users.count({
    where: { role: roleName },
  });

  return {
    ...roleData,
    userCount,
  };
}

/**
 * Get users assigned to a specific role
 */
export async function getUsersByRole(roleName: RoleType, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  // Get total count
  const total = await db.users.count({
    where: { role: roleName },
  });

  // Get users
  const users = await db.users.findMany({
    where: { role: roleName },
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
      agent_sessions: {
        where: { is_active: false },
        orderBy: { logout_at: 'desc' },
        take: 1,
        select: { logout_at: true },
      },
    },
  });

  // Transform data
  const transformedUsers = users.map((user) => ({
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
 * Update permissions for a role
 * Note: This is a simplified implementation that validates the permission structure
 * In a production system, you might want to store custom permissions in the database
 */
export async function updateRolePermissions(
  roleName: RoleType,
  permissions: Permission[]
): Promise<RolePermissions> {
  // Validate that the role exists
  if (!ROLE_PERMISSIONS[roleName]) {
    throw new Error('Invalid role name');
  }

  // Validate permission structure
  for (const permission of permissions) {
    if (!permission.resource || !Array.isArray(permission.actions)) {
      throw new Error('Invalid permission structure');
    }

    // Validate actions
    const validActions: PermissionAction[] = ['create', 'read', 'update', 'delete'];
    for (const action of permission.actions) {
      if (!validActions.includes(action)) {
        throw new Error(`Invalid action: ${action}`);
      }
    }
  }

  // In a real implementation, you would store these in a database
  // For now, we'll just validate and return the updated structure
  // This would require adding a role_permissions table to persist changes

  // Get user count
  const userCount = await db.users.count({
    where: { role: roleName },
  });

  // Return the updated role data
  // Note: In this implementation, changes are not persisted
  // You would need to add database storage for custom permissions
  return {
    role: roleName,
    displayName: ROLE_PERMISSIONS[roleName].displayName,
    description: ROLE_PERMISSIONS[roleName].description,
    permissions,
    userCount,
  };
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(
  roleName: RoleType,
  resource: string,
  action: PermissionAction
): boolean {
  const roleData = ROLE_PERMISSIONS[roleName];
  
  if (!roleData) {
    return false;
  }

  const permission = roleData.permissions.find((p) => p.resource === resource);
  
  if (!permission) {
    return false;
  }

  return permission.actions.includes(action);
}

/**
 * Get all available resources and actions
 */
export function getAvailablePermissions(): {
  resources: string[];
  actions: PermissionAction[];
} {
  const resourcesSet = new Set<string>();

  // Collect all unique resources from all roles
  Object.values(ROLE_PERMISSIONS).forEach((roleData) => {
    roleData.permissions.forEach((permission) => {
      resourcesSet.add(permission.resource);
    });
  });

  return {
    resources: Array.from(resourcesSet).sort(),
    actions: ['create', 'read', 'update', 'delete'],
  };
}
