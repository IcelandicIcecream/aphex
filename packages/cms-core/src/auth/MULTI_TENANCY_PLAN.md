# Multi-Tenancy Implementation Plan

**Goal**: Transform Aphex CMS from single-tenant to multi-tenant, enabling agencies to manage multiple client organizations with complete data isolation.

---

## Overview

### Key Principles
- ✅ **Separate Organizations** - Each client gets their own isolated workspace
- ✅ **Super Admin Pattern** - First/designated users can create organizations
- ✅ **Many-to-Many** - Users can belong to multiple organizations with different roles
- ✅ **Active Organization** - Users work in one organization at a time (switchable)
- ✅ **Role-Based Access** - Owner > Admin > Editor > Viewer per organization
- ✅ **Complete Isolation** - Documents/assets are scoped by organization
- ✅ **Don't Touch Better Auth** - All extensions go in CMS tables

### Architecture
```
Better Auth (App Layer)          CMS Core (Package Layer)
├── user (authentication)        ├── cms_organizations
├── session                      ├── cms_organization_members
└── apikey                       ├── cms_invitations
                                 ├── cms_user_sessions
                                 ├── cms_documents (+ organizationId)
                                 └── cms_assets (+ organizationId)
```

---

## Phase 1: Database Schema

### New Tables

#### 1. Organizations
```typescript
cms_organizations {
  id: uuid PRIMARY KEY;
  name: varchar(200) NOT NULL;           // "Client A", "Agency Internal"
  slug: varchar(100) UNIQUE NOT NULL;    // "client-a", "agency-internal"
  metadata: jsonb;                        // { logo, theme, website, settings }
  createdBy: text NOT NULL;               // User ID (super admin who created it)
  createdAt: timestamp;
  updatedAt: timestamp;
}
```

**Purpose**: Store organization (client/project) data with branding/settings.

#### 2. Organization Members (Many-to-Many)
```typescript
cms_organization_members {
  id: uuid PRIMARY KEY;
  organizationId: uuid NOT NULL → cms_organizations(id) CASCADE;
  userId: text NOT NULL;                  // References Better Auth user
  role: enum('owner', 'admin', 'editor', 'viewer') NOT NULL;
  preferences: jsonb;                     // Org-specific user preferences
  invitedBy: text;                        // User ID who invited this member
  createdAt: timestamp;
  updatedAt: timestamp;

  UNIQUE(organizationId, userId);         // One role per user per org
}
```

**Purpose**: Junction table linking users to organizations with roles.

#### 3. Invitations
```typescript
cms_invitations {
  id: uuid PRIMARY KEY;
  organizationId: uuid NOT NULL → cms_organizations(id) CASCADE;
  email: varchar(255) NOT NULL;
  role: enum('owner', 'admin', 'editor', 'viewer') NOT NULL;
  token: text UNIQUE NOT NULL;            // Crypto-random token (32 bytes)
  invitedBy: text NOT NULL;               // User ID of inviter
  expiresAt: timestamp NOT NULL;          // Default: now() + 7 days
  acceptedAt: timestamp;                  // Null until accepted
  createdAt: timestamp;

  UNIQUE(organizationId, email);          // Can't invite same email twice
}
```

**Purpose**: Pending invitations with secure tokens.

#### 4. User Sessions (Active Organization Tracking)
```typescript
cms_user_sessions {
  userId: text PRIMARY KEY;               // References Better Auth user
  activeOrganizationId: uuid → cms_organizations(id);
  updatedAt: timestamp;
}
```

**Purpose**: Track which organization user is currently working in.

### Modified Tables

#### 5. Documents (Add Organization Scoping)
```typescript
cms_documents {
  // ... existing fields
  organizationId: uuid NOT NULL → cms_organizations(id) CASCADE;  // NEW
}
```

#### 6. Assets (Add Organization Scoping)
```typescript
cms_assets {
  // ... existing fields
  organizationId: uuid NOT NULL → cms_organizations(id) CASCADE;  // NEW
}
```

### Keep Existing Tables

#### 7. User Profiles (Keep for Global Preferences)
```typescript
cms_user_profiles {
  userId: text PRIMARY KEY;
  preferences: jsonb;  // Global preferences (theme, language)
  createdAt: timestamp;
  updatedAt: timestamp;
}
```

**Note**: This stores global user preferences. Organization-specific preferences go in `cms_organization_members`.

---

## Phase 2: Core Types & Interfaces

### New Types

**Location**: `packages/cms-core/src/types/`

```typescript
// types/organization.ts
export interface Organization {
  id: string;
  name: string;
  slug: string;
  metadata?: {
    logo?: string;
    theme?: { primaryColor: string; fontFamily: string; logoUrl: string };
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
  organization: Organization;  // Full org data
  member: OrganizationMember;  // Membership record
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
```

### Updated Types

```typescript
// types/user.ts (UPDATED)
export interface CMSUser extends AuthUser {
  // Super admin flag
  isSuperAdmin: boolean;

  // Current active organization (what they're working in now)
  activeOrganization?: {
    id: string;
    name: string;
    role: 'owner' | 'admin' | 'editor' | 'viewer';
  };

  // All organizations user belongs to (for switcher)
  organizations?: OrganizationMembership[];

  // Global preferences
  preferences?: Record<string, any>;
}

// types/auth.ts (UPDATED)
export interface SessionAuth {
  type: 'session';
  user: CMSUser;  // Now includes org context
  session: {
    id: string;
    expiresAt: Date;
  };
}

export interface ApiKeyAuth {
  type: 'api_key';
  keyId: string;
  name: string;
  permissions: ('read' | 'write')[];
  organizationId: string;  // NEW: All API keys are org-scoped
  createdBy?: string;
  lastUsedAt?: Date;
}
```

### New Adapter Interface

```typescript
// db/interfaces/organization.ts
export interface OrganizationAdapter {
  // Organization CRUD
  createOrganization(data: CreateOrganizationData): Promise<Organization>;
  findOrganizationById(id: string): Promise<Organization | null>;
  findOrganizationBySlug(slug: string): Promise<Organization | null>;
  updateOrganization(id: string, data: UpdateOrganizationData): Promise<Organization>;
  deleteOrganization(id: string): Promise<boolean>;

  // Member management
  addMember(data: AddMemberData): Promise<OrganizationMember>;
  removeMember(organizationId: string, userId: string): Promise<boolean>;
  updateMemberRole(organizationId: string, userId: string, role: string): Promise<OrganizationMember>;
  findUserMembership(userId: string, organizationId: string): Promise<OrganizationMember | null>;
  findUserOrganizations(userId: string): Promise<OrganizationMembership[]>;
  findOrganizationMembers(organizationId: string): Promise<OrganizationMember[]>;

  // Invitation management
  createInvitation(data: CreateInvitationData): Promise<Invitation>;
  findInvitationByToken(token: string): Promise<Invitation | null>;
  findOrganizationInvitations(organizationId: string): Promise<Invitation[]>;
  acceptInvitation(token: string, userId: string): Promise<OrganizationMember>;
  deleteInvitation(id: string): Promise<boolean>;
  cleanupExpiredInvitations(): Promise<number>;

  // User session management
  updateUserSession(userId: string, organizationId: string): Promise<void>;
  findUserSession(userId: string): Promise<{ activeOrganizationId: string } | null>;
}
```

### Updated Adapter Interfaces

```typescript
// DocumentAdapter - Add organizationId parameter
interface DocumentAdapter {
  list(organizationId: string, filters?: DocumentFilters): Promise<Document[]>;
  create(organizationId: string, data: CreateDocumentData): Promise<Document>;
  update(organizationId: string, id: string, data: UpdateDocumentData): Promise<Document>;
  delete(organizationId: string, id: string): Promise<boolean>;
  // ... all methods need organizationId
}

// AssetAdapter - Add organizationId parameter
interface AssetAdapter {
  list(organizationId: string, filters?: AssetFilters): Promise<Asset[]>;
  create(organizationId: string, data: CreateAssetData): Promise<Asset>;
  delete(organizationId: string, id: string): Promise<boolean>;
  // ... all methods need organizationId
}
```

---

## Phase 3: Auth Service Updates

### Super Admin Detection

**Don't modify Better Auth `user` table**. Use one of these approaches:

**Option 1: Environment Variable (Recommended)**
```typescript
// apps/studio/src/lib/server/auth/service.ts
const SUPER_ADMIN_EMAILS = process.env.SUPER_ADMIN_EMAILS?.split(',') || [];

async function isSuperAdmin(email: string): boolean {
  return SUPER_ADMIN_EMAILS.includes(email);
}
```

**Option 2: Separate CMS Table**
```typescript
// Create cms_super_admins table
cms_super_admins {
  userId: text PRIMARY KEY;
  createdAt: timestamp;
}
```

### Enrich authService.getSession()

**Location**: `apps/studio/src/lib/server/auth/service.ts`

```typescript
async getSession(request: Request, db: DatabaseAdapter): Promise<SessionAuth | null> {
  // 1. Get Better Auth session (authentication)
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;

  // 2. Check super admin status
  const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(session.user.email);

  // 3. Get active organization from cms_user_sessions
  const userSession = await db.findUserSession(session.user.id);
  const activeOrgId = userSession?.activeOrganizationId;

  // 4. If activeOrgId exists, get membership details
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

  // 6. Get global preferences (from cms_user_profiles)
  const userProfile = await db.findUserProfileById(session.user.id);

  // 7. Build enriched CMSUser
  const cmsUser: CMSUser = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    image: session.user.image,
    isSuperAdmin,
    activeOrganization,
    organizations,
    preferences: userProfile?.preferences || {}
  };

  return {
    type: 'session',
    user: cmsUser,
    session: {
      id: session.session.id,
      expiresAt: session.session.expiresAt
    }
  };
}
```

---

## Phase 4: API Endpoints

### Organization Management

```typescript
POST   /api/organizations              // Create org (super admin only)
GET    /api/organizations              // List user's organizations
GET    /api/organizations/:id          // Get org details
PATCH  /api/organizations/:id          // Update org (owner only)
DELETE /api/organizations/:id          // Delete org (owner only)
POST   /api/auth/switch-organization   // Switch active org

// Super admin only
GET    /api/admin/organizations        // List all orgs
GET    /api/admin/organizations/:id/stats  // Org stats
```

### Member Management

```typescript
GET    /api/organizations/:id/members           // List members
PATCH  /api/organizations/:id/members/:userId   // Update member role
DELETE /api/organizations/:id/members/:userId   // Remove member
```

### Invitation System

```typescript
// Create invitation (owner/admin only)
POST   /api/organizations/:id/invitations
{
  email: "user@example.com",
  role: "editor",
  expiresInDays: 7  // Optional, default 7
}
// Returns: { id, token, inviteLink: "/invite/token" }

// List pending invitations (owner/admin only)
GET    /api/organizations/:id/invitations

// Cancel invitation (owner/admin only)
DELETE /api/invitations/:id

// Smart redirect (no UI, just logic)
GET    /invite/:token
// If authenticated → auto-accept and redirect
// If not authenticated → redirect to login/signup with ?invite=token
```

### Updated Endpoints

```typescript
// All now automatically scoped by activeOrganizationId
GET    /api/documents
POST   /api/documents
GET    /api/assets
POST   /api/assets

// API keys now require organizationId
POST   /api/auth/api-keys
{
  name: "Production Key",
  permissions: ["read", "write"],
  organizationId: "org-123"  // REQUIRED
}
```

---

## Phase 5: Invitation Flow

### Complete Flow (Corrected)

```
1. Owner/Admin creates invitation
   ↓
2. Email sent to user with /invite/token link
   ↓
3. User clicks link → GET /invite/:token
   ↓
4. Route checks authentication:

   If authenticated:
     → Auto-accept invitation
     → Redirect to /admin (in new org)

   If NOT authenticated:
     → Check if user exists (by email)

     If user exists:
       → Redirect to /login?invite=token

     If user doesn't exist:
       → Redirect to /signup?invite=token
   ↓
5. After login/signup:
   → Check for ?invite= param
   → Auto-accept invitation
   → Redirect to /admin (in new org)
```

### Implementation

```typescript
// apps/studio/src/routes/invite/[token]/+page.server.ts
export const load: PageServerLoad = async ({ params, locals }) => {
  const { token } = params;

  // Get invitation
  const invitation = await db.findInvitationByToken(token);
  if (!invitation) throw error(404, 'Invitation not found');
  if (invitation.expiresAt < new Date()) throw error(410, 'Invitation expired');
  if (invitation.acceptedAt) throw error(410, 'Invitation already accepted');

  // Check if user is authenticated
  const auth = locals.auth;

  if (auth && auth.type === 'session') {
    // User is logged in → auto-accept
    await db.acceptInvitation(token, auth.user.id);

    // Set as active organization
    await db.updateUserSession(auth.user.id, invitation.organizationId);

    throw redirect(302, '/admin');
  } else {
    // User not logged in → redirect to login/signup
    // Check if user exists
    const userExists = await checkUserExists(invitation.email);

    if (userExists) {
      throw redirect(302, `/login?invite=${token}`);
    } else {
      throw redirect(302, `/signup?invite=${token}`);
    }
  }
};
```

```typescript
// Update login/signup to handle invite param
// apps/studio/src/routes/login/+page.server.ts (or form action)
export const actions = {
  default: async ({ request, locals, url }) => {
    // ... perform login

    // Check for invite token
    const inviteToken = url.searchParams.get('invite');
    if (inviteToken) {
      await db.acceptInvitation(inviteToken, userId);
      await db.updateUserSession(userId, invitation.organizationId);
    }

    throw redirect(302, '/admin');
  }
};
```

### Email Integration

```typescript
// Send invitation email (use Resend, SendGrid, etc.)
const invitation = await db.createInvitation({
  organizationId: org.id,
  email: 'user@example.com',
  role: 'editor',
  invitedBy: currentUser.id,
  expiresInDays: 7
});

await emailService.send({
  to: invitation.email,
  subject: `You've been invited to ${org.name}`,
  template: 'invitation',
  data: {
    orgName: org.name,
    inviterName: currentUser.name,
    role: invitation.role,
    inviteLink: `https://yourdomain.com/invite/${invitation.token}`,
    expiresAt: invitation.expiresAt
  }
});
```

---

## Phase 6: Frontend Components

### Organization Switcher

```svelte
<!-- apps/studio/src/lib/components/OrganizationSwitcher.svelte -->
<script lang="ts">
  import { page } from '$app/stores';

  let user = $derived($page.data.auth?.user);
  let activeOrg = $derived(user?.activeOrganization);
  let organizations = $derived(user?.organizations || []);
  let isSuperAdmin = $derived(user?.isSuperAdmin || false);

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
  <span class="badge">Super Admin</span>
{/if}

<select value={activeOrg?.id} onchange={(e) => switchOrganization(e.currentTarget.value)}>
  {#if !activeOrg}
    <option value="">Select Organization</option>
  {/if}
  {#each organizations as { organization, member }}
    <option value={organization.id}>
      {organization.name} ({member.role})
    </option>
  {/each}
</select>

{#if isSuperAdmin}
  <a href="/admin/organizations/new">+ Create Organization</a>
{/if}
```

### Key UI Updates

- **Header/Sidebar**: Show active organization and switcher
- **Organization Settings**: Only visible to owners/admins
- **Invite Members Form**: Only visible to owners/admins
- **Pending Invitations List**: Show in members page
- **Login/Signup Pages**: Handle `?invite=` parameter
- **No Accept Invite Page**: `/invite/:token` is just a smart redirect

---

## Phase 7: Public Content & Landing Pages

### Organization-Based Routing

Each organization can have landing pages with custom branding:

**Option A: Subdomain**
```
https://client-a.yourdomain.com/product-launch
https://client-b.yourdomain.com/services
```

**Option B: Path**
```
https://yourdomain.com/client-a/product-launch
https://yourdomain.com/client-b/services
```

### Implementation

```typescript
// Landing pages are just documents scoped by organizationId
await db.createDocument(clientAOrgId, {
  schemaType: 'landingPage',
  data: {
    title: 'Product Launch',
    slug: 'product-launch',
    hero: { ... },
    sections: [ ... ],
    status: 'published'
  }
});

// Route resolves org from subdomain/path
const org = await db.findOrganizationBySlug(subdomain);
const pages = await db.findDocuments(org.id, {
  schemaType: 'landingPage',
  filters: { 'data.slug': pageSlug, 'data.status': 'published' }
});

// Apply org theme from metadata
const theme = org.metadata?.theme || defaultTheme;
```

---

## Phase 8: Migration Strategy

### Step 1: Add Schema
```sql
-- Add new tables
CREATE TABLE cms_organizations (...);
CREATE TABLE cms_organization_members (...);
CREATE TABLE cms_invitations (...);
CREATE TABLE cms_user_sessions (...);

-- Add organizationId to existing tables
ALTER TABLE cms_documents ADD COLUMN organization_id UUID;
ALTER TABLE cms_assets ADD COLUMN organization_id UUID;
```

### Step 2: Migrate Data
```sql
-- Create default organization
INSERT INTO cms_organizations (id, name, slug, created_by)
VALUES (
  gen_random_uuid(),
  'Default Organization',
  'default',
  (SELECT id FROM user WHERE email = 'admin@example.com')
);

-- Migrate user profiles to organization members
INSERT INTO cms_organization_members (organization_id, user_id, role)
SELECT
  (SELECT id FROM cms_organizations WHERE slug = 'default'),
  user_id,
  'editor'  -- Default role
FROM cms_user_profiles;

-- Assign all documents to default org
UPDATE cms_documents
SET organization_id = (SELECT id FROM cms_organizations WHERE slug = 'default');

-- Assign all assets to default org
UPDATE cms_assets
SET organization_id = (SELECT id FROM cms_organizations WHERE slug = 'default');
```

### Step 3: Deploy Code
- Update adapters
- Update auth service
- Update UI

### Step 4: Make organizationId NOT NULL
```sql
ALTER TABLE cms_documents ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE cms_assets ALTER COLUMN organization_id SET NOT NULL;
```

---

## Key Architecture Decisions

### ✅ What We're Doing

1. **Don't Modify Better Auth Tables**
   - Store super admin list in env var or separate table
   - Store active org in `cms_user_sessions` (not `session` table)

2. **Keep User Profiles Table**
   - For global user preferences (theme, language)
   - Organization-specific preferences go in `cms_organization_members`

3. **Many-to-Many User-Organization**
   - Users can belong to multiple organizations
   - Different role in each organization
   - One active organization at a time

4. **Smart Invite Flow**
   - No separate "accept invite" page
   - `/invite/:token` auto-redirects to login/signup
   - Auto-accept after authentication

5. **Organization Scoping**
   - All documents/assets require `organizationId`
   - API keys are organization-scoped
   - Complete data isolation

### ❌ What We're NOT Doing

1. **Not modifying Better Auth schema** - All extensions in CMS tables
2. **Not adding fine-grained permissions yet** - Start with role-based access
3. **Not implementing datasets yet** - Can add later (dev/staging/prod)
4. **Not using Better Auth hooks for sync** - Using lazy sync in authService

---

## Summary Checklist

- [ ] Phase 1: Create database schema (4 new tables, 2 modified)
- [ ] Phase 2: Define types and interfaces
- [ ] Phase 3: Implement OrganizationAdapter (PostgreSQL)
- [ ] Phase 4: Update DocumentAdapter and AssetAdapter signatures
- [ ] Phase 5: Update authService.getSession() to enrich with org data
- [ ] Phase 6: Create organization management endpoints
- [ ] Phase 7: Implement invitation system (create, accept, email)
- [ ] Phase 8: Build organization switcher UI
- [ ] Phase 9: Update login/signup to handle invite params
- [ ] Phase 10: Add organization settings pages
- [ ] Phase 11: Test multi-tenancy isolation
- [ ] Phase 12: Run migration on existing data
- [ ] Phase 13: (Optional) Add landing page routing
- [ ] Phase 14: (Optional) Set up email service for invitations

---

**Estimated Time**: 2-3 weeks for core multi-tenancy (Phases 1-12)

**Next Steps**: Start with Phase 1 (Database Schema) - create the migration file.
