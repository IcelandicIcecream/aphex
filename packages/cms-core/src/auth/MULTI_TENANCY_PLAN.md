# Multi-Tenancy Implementation Plan

## Current Architecture Overview

### Auth Flow
1. **Better Auth (App Layer)** - Handles authentication (login, sessions, API keys)
   - Tables: `user`, `session`, `account`, `verification`, `apikey`
   - Located in: `apps/studio/src/lib/server/db/auth-schema.ts`

2. **CMS Core (Package)** - Defines interfaces and types
   - Interfaces: `AuthProvider`, `DatabaseAdapter`, `CMSUser`, `UserProfile`
   - Located in: `packages/cms-core/src/`

3. **Sync Mechanism** - Hooks that sync Better Auth users with CMS
   - Creates `userProfiles` on signup
   - Deletes `userProfiles` on user deletion
   - Located in: `apps/studio/src/lib/server/auth/better-auth/instance.ts`

### Current User Model
```typescript
// Better Auth manages authentication
user: {
  id, email, name, image
}

// CMS manages authorization & preferences
userProfile: {
  userId, role, preferences
}

// Combined at runtime
CMSUser: {
  id, email, name, image, role, preferences
}
```

---

## Multi-Tenancy Design

### 1. Conceptual Model (Developer-Focused)

#### Target Use Cases
1. **Single Organization Deployment** - Developer deploys CMS for a client
2. **Agency Multi-Site** - Agency manages content for multiple client websites
3. **Team Collaboration** - Multiple users working within same organization

#### Super Admin Pattern
```
First User (Super Admin) → Creates Organizations → Invites Team Members
```

**Key Principles:**
- First user to sign up becomes **super admin** (verified via env variable or DB check)
- Super admin is the only one who can create organizations initially
- Organization owners can invite new members
- No self-service org creation (prevents sprawl)

#### Organizations (Tenants)
- An **organization** represents a client or project workspace
- Users belong to one or more organizations with specific roles
- Content (documents, assets) is isolated per organization
- Schemas are shared across organizations (global)
- API keys are organization-scoped

#### User-Organization Relationship
- **Many-to-Many**: A user can be in multiple organizations with different roles
- **Role per Organization**: A user is "owner" in Org A, "viewer" in Org B
- **Active Organization**: Users work in one organization at a time (switchable in UI)

---

### 2. Database Schema Changes

#### New Tables (PostgreSQL Adapter)

**Super Admin Tracking** (App-level table)
```typescript
// apps/studio/src/lib/server/db/auth-schema.ts
export const user = pgTable('user', {
  // ... existing fields
  isSuperAdmin: boolean('is_super_admin').default(false).notNull(),
});
```

**Organizations Table** (`cms-core` schema)
```typescript
// packages/postgresql-adapter/src/schema.ts
export const organizations = pgTable('cms_organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(), // e.g., "acme-corp"
  metadata: jsonb('metadata').$type<{
    logo?: string;
    website?: string;
    settings?: Record<string, any>;
  }>(),
  createdBy: text('created_by').notNull(), // User ID of creator (super admin)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**Organization Members Table** (Replaces `userProfiles`)
```typescript
// packages/postgresql-adapter/src/schema.ts
export const organizationMembers = pgTable('cms_organization_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull(), // References Better Auth user
  role: text('role', { enum: ['owner', 'admin', 'editor', 'viewer'] })
    .notNull(),
  preferences: jsonb('preferences').$type<{
    theme?: 'light' | 'dark';
    language?: string;
    [key: string]: any;
  }>(),
  invitedBy: text('invited_by'), // User ID of inviter
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Composite unique constraint: one membership per user per org
  uniqueUserOrg: unique().on(table.organizationId, table.userId)
}));
```

**Invitations Table** (Pending invites)
```typescript
// packages/postgresql-adapter/src/schema.ts
export const invitations = pgTable('cms_invitations', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  role: text('role', { enum: ['owner', 'admin', 'editor', 'viewer'] })
    .notNull(),
  token: text('token').notNull().unique(), // Secure random token for invite link
  invitedBy: text('invited_by').notNull(), // User ID of inviter
  expiresAt: timestamp('expires_at').notNull(), // Invite expiry (e.g., 7 days)
  acceptedAt: timestamp('accepted_at'), // Null until accepted
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // One pending invite per email per organization
  uniqueEmailOrg: unique().on(table.organizationId, table.email)
}));
```

**User Sessions Enhancement** (Track active organization)
```typescript
// apps/studio/src/lib/server/db/auth-schema.ts
export const session = pgTable('session', {
  // ... existing fields
  activeOrganizationId: text('active_organization_id'), // Current working org (text to avoid FK issues)
});
```

#### Modified Tables

**Documents** - Add organization scoping
```typescript
export const documents = pgTable('cms_documents', {
  // ... existing fields
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
});
```

**Assets** - Add organization scoping
```typescript
export const assets = pgTable('cms_assets', {
  // ... existing fields
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
});
```

**API Keys** - Organization-scoped only
```typescript
// apps/studio/src/lib/server/db/auth-schema.ts
export const apikey = pgTable('apikey', {
  // ... existing fields
  organizationId: text('organization_id').notNull(), // REQUIRED: all API keys must be org-scoped
  // Remove userId or make optional - keys belong to organizations now
  userId: text('user_id'), // Optional: track who created the key
});
```

**Schemas** - Remain global (shared across all organizations)
```typescript
// No changes needed - schemaTypes table stays as-is
// All organizations share the same schema definitions
```

---

### 3. Type System Updates

#### Core Types (`packages/cms-core/src/types/`)

**Organization Types**
```typescript
// types/organization.ts
export interface Organization {
  id: string;
  name: string;
  slug: string;
  metadata?: {
    logo?: string;
    website?: string;
    settings?: Record<string, any>;
  };
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  preferences?: Record<string, any>;
  invitedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationMembership {
  organization: Organization;
  member: OrganizationMember;
}

export interface Invitation {
  id: string;
  organizationId: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  token: string;
  invitedBy: string;
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
}

export interface CreateInvitationData {
  organizationId: string;
  email: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  invitedBy: string;
  expiresInDays?: number; // Default: 7
}
```

**Updated User Types**
```typescript
// types/user.ts
export interface UserProfile {
  userId: string;
  isSuperAdmin: boolean; // Global super admin flag
  preferences?: Record<string, any>; // Global preferences
}

export interface CMSUser extends AuthUser {
  isSuperAdmin: boolean; // Can create organizations and manage everything

  // Current organization context
  activeOrganization?: {
    id: string;
    name: string;
    role: 'owner' | 'admin' | 'editor' | 'viewer';
  };

  // All organization memberships (for switcher UI)
  organizations?: OrganizationMembership[];

  // Global preferences (shared across all orgs)
  preferences?: Record<string, any>;
}
```

**Updated Auth Types**
```typescript
// types/auth.ts
export interface SessionAuth {
  type: 'session';
  user: CMSUser;
  session: {
    id: string;
    expiresAt: Date;
    activeOrganizationId?: string; // Current working org
  };
}

export interface ApiKeyAuth {
  type: 'api_key';
  keyId: string;
  name: string;
  permissions: ('read' | 'write')[];
  organizationId: string; // REQUIRED: all API keys are org-scoped
  createdBy?: string; // Who created this key
  environment?: string;
  lastUsedAt?: Date;
}
```

---

### 4. Database Adapter Updates

#### New Adapters

**Organization Adapter Interface**
```typescript
// packages/cms-core/src/db/interfaces/organization.ts
export interface OrganizationAdapter {
  // Organization CRUD
  createOrganization(data: CreateOrganizationData): Promise<Organization>;
  findOrganizationById(id: string): Promise<Organization | null>;
  findOrganizationBySlug(slug: string): Promise<Organization | null>;
  updateOrganization(id: string, data: UpdateOrganizationData): Promise<Organization>;
  deleteOrganization(id: string): Promise<boolean>;

  // Membership management
  addMember(data: AddMemberData): Promise<OrganizationMember>;
  removeMember(organizationId: string, userId: string): Promise<boolean>;
  updateMemberRole(organizationId: string, userId: string, role: string): Promise<OrganizationMember>;

  // User's organizations
  findUserOrganizations(userId: string): Promise<OrganizationMembership[]>;
  findUserMembership(userId: string, organizationId: string): Promise<OrganizationMember | null>;

  // Organization members
  findOrganizationMembers(organizationId: string): Promise<OrganizationMember[]>;

  // Invitation management
  createInvitation(data: CreateInvitationData): Promise<Invitation>;
  findInvitationByToken(token: string): Promise<Invitation | null>;
  findOrganizationInvitations(organizationId: string): Promise<Invitation[]>;
  acceptInvitation(token: string, userId: string): Promise<OrganizationMember>;
  deleteInvitation(id: string): Promise<boolean>;
  cleanupExpiredInvitations(): Promise<number>; // Returns count of deleted invites
}
```

**PostgreSQL Implementation**
```typescript
// packages/postgresql-adapter/src/organization-adapter.ts
export class PostgreSQLOrganizationAdapter implements OrganizationAdapter {
  // Implementation here
}
```

#### Modified Adapters

**Document Adapter** - Add organization filtering
```typescript
// All queries must filter by organizationId
async findDocuments(
  organizationId: string,
  filters?: DocumentFilters
): Promise<Document[]>

async createDocument(
  organizationId: string,
  data: CreateDocumentData
): Promise<Document>

// Similarly for update, delete, etc.
```

**Asset Adapter** - Add organization filtering
```typescript
async findAssets(
  organizationId: string,
  filters?: AssetFilters
): Promise<Asset[]>

async createAsset(
  organizationId: string,
  data: CreateAssetData
): Promise<Asset>
```

**User Adapter** - Add super admin support
```typescript
async setSuperAdmin(userId: string, isSuperAdmin: boolean): Promise<UserProfile>;
async findSuperAdmins(): Promise<UserProfile[]>;
```

---

### 5. Auth Provider Updates

#### Updated AuthProvider Interface
```typescript
// packages/cms-core/src/auth/provider.ts
export interface AuthProvider {
  // Session auth - now returns organization context
  getSession(request: Request, db: DatabaseAdapter): Promise<SessionAuth | null>;
  requireSession(request: Request, db: DatabaseAdapter): Promise<SessionAuth>;

  // Organization context
  switchOrganization(
    request: Request,
    db: DatabaseAdapter,
    organizationId: string
  ): Promise<SessionAuth>;

  // API key auth - org-scoped only
  validateApiKey(request: Request, db: DatabaseAdapter): Promise<ApiKeyAuth | null>;
  requireApiKey(
    request: Request,
    db: DatabaseAdapter,
    permission?: 'read' | 'write'
  ): Promise<ApiKeyAuth>;
}
```

#### Auth Service Updates
```typescript
// apps/studio/src/lib/server/auth/service.ts
export const authService = {
  async getSession(request, db) {
    // 1. Get base session from Better Auth
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return null;

    // 2. Check if user is super admin
    const isSuperAdmin = await db.isSuperAdmin(session.user.id);

    // 3. Get active organization from session
    const activeOrgId = session.session.activeOrganizationId;

    // 4. If activeOrgId exists, get membership
    let activeOrganization;
    if (activeOrgId) {
      const membership = await db.findUserMembership(session.user.id, activeOrgId);
      if (membership) {
        activeOrganization = {
          id: membership.organization.id,
          name: membership.organization.name,
          role: membership.member.role
        };
      }
    }

    // 5. Get all user organizations (for switcher)
    const organizations = await db.findUserOrganizations(session.user.id);

    // 6. Build CMSUser
    const cmsUser: CMSUser = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
      isSuperAdmin,
      activeOrganization,
      organizations,
      preferences: {} // global preferences
    };

    return {
      type: 'session',
      user: cmsUser,
      session: {
        id: session.session.id,
        expiresAt: session.session.expiresAt,
        activeOrganizationId: activeOrgId
      }
    };
  },

  async switchOrganization(request, db, organizationId) {
    // 1. Get current session
    const currentSession = await this.getSession(request, db);
    if (!currentSession) throw new Error('No active session');

    // 2. Super admins can switch to any org
    if (currentSession.user.isSuperAdmin) {
      const org = await db.findOrganizationById(organizationId);
      if (!org) throw new Error('Organization not found');
    } else {
      // 3. Regular users must be members
      const membership = await db.findUserMembership(
        currentSession.user.id,
        organizationId
      );
      if (!membership) {
        throw new Error('Not a member of this organization');
      }
    }

    // 4. Update session with new active organization
    await updateSessionOrganization(currentSession.session.id, organizationId);

    // 5. Return updated session
    return this.getSession(request, db);
  },

  async validateApiKey(request, db) {
    const apiKeyHeader = request.headers.get('x-api-key');
    if (!apiKeyHeader) return null;

    const result = await auth.api.verifyApiKey({ body: { key: apiKeyHeader } });
    if (!result.valid || !result.key) return null;

    // Get organization from API key metadata
    const metadata = result.key.metadata || {};
    const organizationId = metadata.organizationId;

    if (!organizationId) {
      console.error('API key missing organizationId in metadata');
      return null;
    }

    const permissions = metadata.permissions || ['read'];

    return {
      type: 'api_key',
      keyId: result.key.id,
      name: result.key.name || 'Unnamed Key',
      permissions,
      organizationId,
      createdBy: metadata.createdBy,
      lastUsedAt: result.key.lastRequest || undefined
    };
  }
};
```

---

### 6. Sync Strategy

#### On First User Signup (Super Admin)
```typescript
// apps/studio/src/lib/server/auth/better-auth/instance.ts
if (ctx.path === '/sign-up/email' && ctx.context.user) {
  // Check if this is the first user
  const userCount = await db.countUsers();

  if (userCount === 1) {
    // First user becomes super admin
    await db.setSuperAdmin(ctx.context.user.id, true);
    console.log(`[Auth Hook]: First user ${ctx.context.user.id} promoted to super admin`);
  }
}
```

#### On Invitation Accept
```typescript
// When user accepts invite (already has account)
async function acceptInvitation(token: string, userId: string) {
  const invitation = await db.findInvitationByToken(token);

  if (!invitation) throw new Error('Invalid invitation token');
  if (invitation.expiresAt < new Date()) throw new Error('Invitation expired');
  if (invitation.acceptedAt) throw new Error('Invitation already accepted');

  // Add user to organization
  const member = await db.addMember({
    organizationId: invitation.organizationId,
    userId: userId,
    role: invitation.role,
    invitedBy: invitation.invitedBy
  });

  // Mark invitation as accepted
  await db.acceptInvitation(token, userId);

  return member;
}

// When new user signs up via invitation link
async function signupWithInvitation(email: string, password: string, token: string) {
  // 1. Verify invitation
  const invitation = await db.findInvitationByToken(token);
  if (!invitation || invitation.email !== email) {
    throw new Error('Invalid invitation');
  }

  // 2. Create user account
  const user = await auth.api.signUpEmail({ email, password });

  // 3. Add to organization
  await acceptInvitation(token, user.id);

  return user;
}
```

#### On User Deletion
```typescript
if (ctx.path === '/user/delete-user' && ctx.context.user) {
  // Remove from all organizations
  const memberships = await db.findUserOrganizations(ctx.context.user.id);

  for (const membership of memberships) {
    await db.removeMember(membership.organization.id, ctx.context.user.id);

    // If user was the last owner, handle organization cleanup
    const members = await db.findOrganizationMembers(membership.organization.id);
    const owners = members.filter(m => m.role === 'owner');

    if (owners.length === 0) {
      // Promote first admin to owner, or delete org if no admins
      const admins = members.filter(m => m.role === 'admin');
      if (admins.length > 0) {
        await db.updateMemberRole(
          membership.organization.id,
          admins[0].userId,
          'owner'
        );
      } else {
        // No owners or admins left - delete organization
        await db.deleteOrganization(membership.organization.id);
      }
    }
  }
}
```

---

### 7. Auth Hooks Update

#### Organization-Scoped Access Control
```typescript
// packages/cms-core/src/auth/auth-hooks.ts
export async function handleAuthHook(event, config, authProvider, db) {
  const path = event.url.pathname;

  // 1. Admin UI routes - require session authentication
  if (path.startsWith('/admin')) {
    try {
      const session = await authProvider.requireSession(event.request, db);
      event.locals.auth = session;

      // If no active organization and not super admin, redirect to org selector
      if (!session.user.activeOrganization && !session.user.isSuperAdmin) {
        throw redirect(302, '/select-organization');
      }
    } catch {
      throw redirect(302, config.auth?.loginUrl || '/login');
    }
  }

  // 2. API routes - accept session OR API key
  if (path.startsWith('/api/')) {
    // Skip auth routes
    if (path.startsWith('/api/auth')) {
      return null;
    }

    // Try session first
    let auth: Auth | null = await authProvider.getSession(event.request, db);

    // If no session, try API key
    if (!auth) {
      auth = await authProvider.validateApiKey(event.request, db);
    }

    // Protected routes require auth
    const protectedApiRoutes = ['/api/documents', '/api/assets', '/api/organizations'];
    const isProtectedRoute = protectedApiRoutes.some((route) => path.startsWith(route));

    if (isProtectedRoute && !auth) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check write permission for mutations
    if (auth && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(event.request.method)) {
      if (auth.type === 'api_key' && !auth.permissions.includes('write')) {
        return new Response(JSON.stringify({ error: 'Forbidden: Write permission required' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Attach auth and organization context
    if (auth) {
      event.locals.auth = auth;

      // Set organization context
      if (auth.type === 'session') {
        // Super admins without active org can access org management endpoints only
        if (auth.user.isSuperAdmin && !auth.user.activeOrganization) {
          if (!path.startsWith('/api/organizations')) {
            return new Response(
              JSON.stringify({ error: 'Select an organization first' }),
              { status: 400 }
            );
          }
        } else if (auth.user.activeOrganization) {
          event.locals.organizationId = auth.user.activeOrganization.id;
        }
      } else if (auth.type === 'api_key') {
        event.locals.organizationId = auth.organizationId;
      }
    }
  }

  return null;
}
```

---

### 8. API Changes

#### New Endpoints

**Organization Management** (Super Admin + Owners)
- `POST /api/organizations` - Create organization (super admin only)
- `GET /api/organizations` - List user's organizations
- `GET /api/organizations/:id` - Get organization details
- `PATCH /api/organizations/:id` - Update organization (owners only)
- `DELETE /api/organizations/:id` - Delete organization (owners only)

**Organization Members** (Owners + Admins)
- `GET /api/organizations/:id/members` - List members
- `POST /api/organizations/:id/invitations` - Create invitation
- `GET /api/organizations/:id/invitations` - List pending invitations
- `DELETE /api/organizations/:id/invitations/:invitationId` - Cancel invitation
- `PATCH /api/organizations/:id/members/:userId` - Update member role
- `DELETE /api/organizations/:id/members/:userId` - Remove member

**Invitation Flow** (Public)
- `GET /api/invitations/:token` - Get invitation details (verify token)
- `POST /api/invitations/:token/accept` - Accept invitation (requires auth)
- `POST /api/auth/signup-with-invitation` - Sign up via invitation

**Organization Switching**
- `POST /api/auth/switch-organization` - Switch active organization

**Super Admin Endpoints**
- `GET /api/admin/users` - List all users (super admin only)
- `POST /api/admin/users/:id/super-admin` - Promote/demote super admin
- `GET /api/admin/organizations` - List all organizations (super admin only)

#### Modified Endpoints

**Documents & Assets** - All now require organization context
- Automatically filtered by `event.locals.organizationId`
- Can't access documents from other organizations
- Super admin can switch org to access any content

**API Keys**
- `POST /api/auth/api-keys` - Now REQUIRES `organizationId` parameter
- `GET /api/auth/api-keys` - List keys for active organization
- All keys are organization-scoped

---

### 9. Frontend Integration

#### Organization Switcher Component
```svelte
<!-- apps/studio/src/lib/components/OrganizationSwitcher.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import type { CMSUser } from '@aphex/cms-core/server';

  let currentUser = $derived($page.data.auth?.user as CMSUser | undefined);
  let activeOrg = $derived(currentUser?.activeOrganization);
  let organizations = $derived(currentUser?.organizations || []);
  let isSuperAdmin = $derived(currentUser?.isSuperAdmin || false);

  async function switchOrganization(orgId: string) {
    await fetch('/api/auth/switch-organization', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId: orgId })
    });
    window.location.reload();
  }
</script>

{#if isSuperAdmin}
  <div class="super-admin-badge">Super Admin</div>
{/if}

<select value={activeOrg?.id} onchange={(e) => switchOrganization(e.currentTarget.value)}>
  {#if !activeOrg}
    <option value="">Select Organization</option>
  {/if}
  {#each organizations as org}
    <option value={org.organization.id}>
      {org.organization.name} ({org.member.role})
    </option>
  {/each}
</select>

{#if isSuperAdmin}
  <a href="/admin/organizations/new">+ Create Organization</a>
{/if}
```

#### Permission Checks
```typescript
// Utility functions for role-based access
function canEditContent(user: CMSUser): boolean {
  if (user.isSuperAdmin) return true;
  return ['owner', 'admin', 'editor'].includes(
    user.activeOrganization?.role || ''
  );
}

function canManageMembers(user: CMSUser): boolean {
  if (user.isSuperAdmin) return true;
  return ['owner', 'admin'].includes(
    user.activeOrganization?.role || ''
  );
}

function canManageOrganization(user: CMSUser): boolean {
  if (user.isSuperAdmin) return true;
  return user.activeOrganization?.role === 'owner';
}

function canCreateOrganizations(user: CMSUser): boolean {
  return user.isSuperAdmin;
}
```

#### Invitation Flow UI
```svelte
<!-- Invite member component -->
<script lang="ts">
  let email = $state('');
  let role = $state<'owner' | 'admin' | 'editor' | 'viewer'>('editor');
  let inviteLink = $state<string | null>(null);

  async function inviteMember() {
    const response = await fetch(`/api/organizations/${orgId}/invitations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role })
    });

    const invitation = await response.json();
    inviteLink = `${window.location.origin}/invite/${invitation.token}`;
  }
</script>

<form onsubmit={inviteMember}>
  <input type="email" bind:value={email} placeholder="Email" />
  <select bind:value={role}>
    <option value="owner">Owner</option>
    <option value="admin">Admin</option>
    <option value="editor">Editor</option>
    <option value="viewer">Viewer</option>
  </select>
  <button type="submit">Send Invitation</button>
</form>

{#if inviteLink}
  <div>Share this link: <code>{inviteLink}</code></div>
{/if}
```

```svelte
<!-- Accept invitation page: /invite/[token]/+page.svelte -->
<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  let token = $derived($page.params.token);
  let invitation = $state(null);
  let isAuthenticated = $derived($page.data.auth?.user);

  async function loadInvitation() {
    const response = await fetch(`/api/invitations/${token}`);
    invitation = await response.json();
  }

  async function acceptInvite() {
    if (!isAuthenticated) {
      // Redirect to signup with token
      goto(`/signup?invite=${token}`);
      return;
    }

    await fetch(`/api/invitations/${token}/accept`, { method: 'POST' });
    goto('/admin');
  }
</script>

{#if invitation}
  <h1>You've been invited to {invitation.organization.name}</h1>
  <p>Role: {invitation.role}</p>
  <button onclick={acceptInvite}>Accept Invitation</button>
{/if}
```

---

### 10. Migration Strategy

#### Phase 1: Schema Migration
1. Add `isSuperAdmin` to `user` table
2. Create new tables: `cms_organizations`, `cms_organization_members`, `cms_invitations`
3. Add `organizationId` to `cms_documents`, `cms_assets`, `apikey`
4. Add `activeOrganizationId` to `session` table

#### Phase 2: Data Migration
```sql
-- Mark first user as super admin (or specific user by email)
UPDATE user
SET is_super_admin = true
WHERE email = 'admin@example.com'; -- Replace with actual admin email

-- Create default organization for existing data
INSERT INTO cms_organizations (id, name, slug, created_by)
VALUES (
  gen_random_uuid(),
  'Default Organization',
  'default',
  (SELECT id FROM user WHERE is_super_admin = true LIMIT 1)
);

-- Migrate existing user profiles to organization members
INSERT INTO cms_organization_members (organization_id, user_id, role, preferences)
SELECT
  (SELECT id FROM cms_organizations WHERE slug = 'default'),
  user_id,
  role,
  preferences
FROM cms_user_profiles;

-- Assign all documents to default org
UPDATE cms_documents
SET organization_id = (SELECT id FROM cms_organizations WHERE slug = 'default')
WHERE organization_id IS NULL;

-- Assign all assets to default org
UPDATE cms_assets
SET organization_id = (SELECT id FROM cms_organizations WHERE slug = 'default')
WHERE organization_id IS NULL;

-- Assign all API keys to default org
UPDATE apikey
SET organization_id = (SELECT id FROM cms_organizations WHERE slug = 'default')
WHERE organization_id IS NULL;
```

#### Phase 3: Code Updates
1. Update database adapters (add OrganizationAdapter)
2. Update auth service (add super admin + org context)
3. Update auth hooks (add org filtering)
4. Add organization management UI
5. Add organization switcher
6. Add invitation system

#### Phase 4: Cleanup
1. Drop `cms_user_profiles` table
2. Make `organizationId` NOT NULL on documents/assets
3. Remove old migration code
4. Update documentation

---

### 11. GraphQL Schema Updates

If using GraphQL plugin, update schema:

```graphql
type Organization {
  id: ID!
  name: String!
  slug: String!
  metadata: JSON
  members: [OrganizationMember!]!
  invitations: [Invitation!]!
  createdBy: String!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type OrganizationMember {
  id: ID!
  user: User!
  organization: Organization!
  role: Role!
  preferences: JSON
  invitedBy: String
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Invitation {
  id: ID!
  organization: Organization!
  email: String!
  role: Role!
  token: String! # Only visible to admins
  invitedBy: String!
  expiresAt: DateTime!
  acceptedAt: DateTime
  createdAt: DateTime!
}

enum Role {
  OWNER
  ADMIN
  EDITOR
  VIEWER
}

extend type User {
  isSuperAdmin: Boolean!
  activeOrganization: Organization
  organizations: [Organization!]!
}

extend type Query {
  # Organization queries
  myOrganizations: [Organization!]!
  organization(id: ID!): Organization
  organizationMembers(organizationId: ID!): [OrganizationMember!]!

  # Invitation queries
  organizationInvitations(organizationId: ID!): [Invitation!]!
  invitation(token: String!): Invitation # Verify invite token

  # Super admin queries
  allOrganizations: [Organization!]! # Super admin only
  allUsers: [User!]! # Super admin only
}

extend type Mutation {
  # Organization management (super admin only for create)
  createOrganization(input: CreateOrganizationInput!): Organization! # Super admin only
  updateOrganization(id: ID!, input: UpdateOrganizationInput!): Organization! # Owner only
  deleteOrganization(id: ID!): Boolean! # Owner only

  # Member management (owner + admin)
  createInvitation(input: CreateInvitationInput!): Invitation!
  cancelInvitation(id: ID!): Boolean!
  updateMemberRole(organizationId: ID!, userId: ID!, role: Role!): OrganizationMember!
  removeOrganizationMember(organizationId: ID!, userId: ID!): Boolean!

  # Invitation flow
  acceptInvitation(token: String!): OrganizationMember!

  # Organization switching
  switchOrganization(organizationId: ID!): User!

  # Super admin operations
  setSuperAdmin(userId: ID!, isSuperAdmin: Boolean!): User!
}
```

---

## Benefits of This Approach

### 1. **Developer-First Design**
- Super admin controls organization creation (no sprawl)
- Perfect for agency/client model
- No self-service signup chaos

### 2. **Clean Separation of Concerns**
- Better Auth: Authentication only (who you are)
- CMS: Authorization, tenancy, and business logic
- Sync mechanism keeps them in harmony

### 3. **Flexible User-Organization Model**
- Users can belong to multiple organizations
- Different roles in different organizations
- Easy organization switching without re-authentication
- Super admin has god-mode access

### 4. **Content Isolation**
- All content automatically scoped to organizations
- No risk of cross-organization data leaks
- API keys are org-scoped for security
- Schemas remain global (shared infrastructure)

### 5. **Professional Invitation System**
- Secure token-based invites
- Email verification built-in
- Expiring invitations
- Track who invited whom

### 6. **Migration-Friendly**
- Existing single-tenant data migrates to default organization
- Gradual rollout possible
- Backwards compatible during transition

---

## Answered Design Questions

✅ **Organization Creation**
- Only super admin can create organizations
- First user automatically becomes super admin
- Prevents organization sprawl

✅ **Invitation System**
- Token-based email invitations
- Dedicated `cms_invitations` table
- 7-day expiry (configurable)
- Track inviter and acceptance

✅ **Content Isolation**
- Hard isolation - no cross-org content access
- Within organization, content is shared
- Schemas are global (infrastructure level)

✅ **API Key Scoping**
- Organization-scoped only (REQUIRED)
- No user-scoped keys
- Ensures proper content isolation

✅ **Role Hierarchy**
- Owner > Admin > Editor > Viewer
- Owners can manage organization settings
- Admins can invite members
- Editors can modify content
- Viewers can only read

---

## Next Steps

1. ✅ **Design validated** - Ready to implement
2. **Phase 1** - Create schema migration script
3. **Phase 2** - Implement database adapters
4. **Phase 3** - Update auth service and hooks
5. **Phase 4** - Build UI components
6. **Phase 5** - Test migration with staging data
7. **Phase 6** - Document for developers

---

## References

- Current auth implementation: `apps/studio/src/lib/server/auth/`
- Database adapters: `packages/postgresql-adapter/src/`
- Core types: `packages/cms-core/src/types/`
- Auth hooks: `packages/cms-core/src/auth/auth-hooks.ts`
- Schema definitions: `packages/postgresql-adapter/src/schema.ts`
