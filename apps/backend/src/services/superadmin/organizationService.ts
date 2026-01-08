import { db } from '../../db/prisma';

/**
 * Organization management service for superadmin dashboard
 * Provides CRUD operations, search, and filtering for organizations
 */

export interface OrganizationFilters {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface CreateOrganizationData {
  name: string;
  status?: 'active' | 'inactive' | 'suspended';
  is_demo?: boolean;
  valid_until?: string | null;
  max_users?: number;
  max_agents?: number;
  max_managers?: number;
  max_qa?: number;
  contact_email?: string | null;
  billing_info?: string | null;
}

export interface UpdateOrganizationData {
  name?: string;
  status?: 'active' | 'inactive' | 'suspended';
  is_demo?: boolean;
  valid_until?: string | null;
  max_users?: number;
  max_agents?: number;
  max_managers?: number;
  max_qa?: number;
  contact_email?: string | null;
  billing_info?: string | null;
}

/**
 * Get paginated list of organizations with optional filters
 */
export async function getOrganizations(filters: OrganizationFilters = {}) {
  const {
    search = '',
    status,
    page = 1,
    limit = 20,
  } = filters;

  const skip = (page - 1) * limit;

  // Build where clause
  const where: any = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { contact_email: { contains: search } },
    ];
  }

  if (status) {
    where.status = status;
  }

  // Get total count for pagination
  const total = await db.organizations.count({ where });

  // Get organizations with pagination
  const organizations = await db.organizations.findMany({
    where,
    skip,
    take: limit,
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      name: true,
      status: true,
      is_demo: true,
      valid_until: true,
      max_users: true,
      max_agents: true,
      max_managers: true,
      max_qa: true,
      contact_email: true,
      created_at: true,
      updated_at: true,
      _count: {
        select: {
          users: true,
          campaigns: true,
          documents: true,
          notes: true,
        },
      },
    },
  });

  // Transform data to include user count and other stats
  const transformedOrganizations = organizations.map(org => ({
    id: org.id,
    name: org.name,
    status: org.status,
    is_demo: org.is_demo,
    valid_until: org.valid_until,
    max_users: org.max_users,
    max_agents: org.max_agents,
    max_managers: org.max_managers,
    max_qa: org.max_qa,
    contact_email: org.contact_email,
    created_at: org.created_at,
    updated_at: org.updated_at,
    user_count: org._count.users,
    campaign_count: org._count.campaigns,
    document_count: org._count.documents,
    note_count: org._count.notes,
  }));

  return {
    organizations: transformedOrganizations,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get organization by ID with detailed information
 */
export async function getOrganizationById(organizationId: number) {
  const organization = await db.organizations.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      status: true,
      is_demo: true,
      valid_until: true,
      max_users: true,
      max_agents: true,
      max_managers: true,
      max_qa: true,
      contact_email: true,
      billing_info: true,
      created_at: true,
      updated_at: true,
      users: {
        select: {
          id: true,
          username: true,
          usermail: true,
          role: true,
          status: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
        take: 10,
      },
      _count: {
        select: {
          users: true,
          campaigns: true,
          documents: true,
          notes: true,
        },
      },
    },
  });

  if (!organization) {
    return null;
  }

  return {
    id: organization.id,
    name: organization.name,
    status: organization.status,
    is_demo: organization.is_demo,
    valid_until: organization.valid_until,
    max_users: organization.max_users,
    max_agents: organization.max_agents,
    max_managers: organization.max_managers,
    max_qa: organization.max_qa,
    contact_email: organization.contact_email,
    billing_info: organization.billing_info,
    created_at: organization.created_at,
    updated_at: organization.updated_at,
    statistics: {
      total_users: organization._count.users,
      total_campaigns: organization._count.campaigns,
      total_documents: organization._count.documents,
      total_notes: organization._count.notes,
    },
    recent_users: organization.users.map(user => ({
      id: user.id,
      username: user.username,
      email: user.usermail,
      role: user.role,
      status: user.status,
      created_at: user.created_at,
    })),
  };
}

/**
 * Create a new organization
 */
export async function createOrganization(data: CreateOrganizationData) {
  const {
    name,
    status = 'active',
    is_demo = false,
    valid_until,
    max_users = 10,
    max_agents = 10,
    max_managers = 2,
    max_qa = 2,
    contact_email,
    billing_info
  } = data;

  // Check if organization name already exists
  const existing = await db.organizations.findFirst({
    where: { name },
  });

  if (existing) {
    throw new Error('Organization with this name already exists');
  }

  // Create organization
  const organization = await db.organizations.create({
    data: {
      name,
      status,
      is_demo,
      valid_until: valid_until ? new Date(valid_until) : null,
      max_users,
      max_agents,
      max_managers,
      max_qa,
      contact_email,
      billing_info,
    },
    select: {
      id: true,
      name: true,
      status: true,
      is_demo: true,
      valid_until: true,
      max_users: true,
      max_agents: true,
      max_managers: true,
      max_qa: true,
      contact_email: true,
      billing_info: true,
      created_at: true,
      updated_at: true,
    },
  });

  return organization;
}

/**
 * Update organization information
 */
export async function updateOrganization(organizationId: number, data: UpdateOrganizationData) {
  // Check if organization exists
  const existingOrg = await db.organizations.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true },
  });

  if (!existingOrg) {
    throw new Error('Organization not found');
  }

  const updateData: any = {};

  if (data.name !== undefined) {
    // Check if name is already taken by another organization
    const nameTaken = await db.organizations.findFirst({
      where: {
        name: data.name,
        NOT: { id: organizationId },
      },
    });

    if (nameTaken) {
      throw new Error('Organization name already exists');
    }

    updateData.name = data.name;
  }

  if (data.status !== undefined) {
    updateData.status = data.status;
  }

  if (data.is_demo !== undefined) {
    updateData.is_demo = data.is_demo;
  }

  if (data.valid_until !== undefined) {
    updateData.valid_until = data.valid_until ? new Date(data.valid_until) : null;
  }

  if (data.max_users !== undefined) {
    updateData.max_users = data.max_users;
  }
  if (data.max_agents !== undefined) {
    updateData.max_agents = data.max_agents;
  }
  if (data.max_managers !== undefined) {
    updateData.max_managers = data.max_managers;
  }
  if (data.max_qa !== undefined) {
    updateData.max_qa = data.max_qa;
  }

  if (data.contact_email !== undefined) {
    updateData.contact_email = data.contact_email;
  }

  if (data.billing_info !== undefined) {
    updateData.billing_info = data.billing_info;
  }

  // Update organization
  const updatedOrganization = await db.organizations.update({
    where: { id: organizationId },
    data: updateData,
    select: {
      id: true,
      name: true,
      status: true,
      is_demo: true,
      valid_until: true,
      max_users: true,
      max_agents: true,
      max_managers: true,
      max_qa: true,
      contact_email: true,
      billing_info: true,
      created_at: true,
      updated_at: true,
    },
  });

  return updatedOrganization;
}

/**
 * Delete an organization
 */
export async function deleteOrganization(organizationId: number) {
  // Check if organization exists
  const organization = await db.organizations.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          users: true,
        },
      },
    },
  });

  if (!organization) {
    throw new Error('Organization not found');
  }

  // Prevent deleting organization with users
  if (organization._count.users > 0) {
    throw new Error('Cannot delete organization that has users. Please reassign or delete users first.');
  }

  // Delete organization (cascade will handle related records)
  await db.organizations.delete({
    where: { id: organizationId },
  });

  return { success: true };
}

/**
 * Get all organizations for dropdown/selection purposes
 */
export async function getAllOrganizations() {
  const organizations = await db.organizations.findMany({
    where: { status: 'active' },
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: 'asc' },
  });

  return organizations;
}