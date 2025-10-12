# Multi-Tenancy Implementation Steps

This document outlines the step-by-step implementation plan for adding multi-tenancy to the CMS. Follow these phases in order.

---

## Phase 1: Database Schema & Types

### 1.1 Update Auth Schema (App Layer)
**File:** `apps/studio/src/lib/server/db/auth-schema.ts`

- [ ] Add `isSuperAdmin` boolean field to `user` table
- [ ] Add `activeOrganizationId` text field to `session` table
- [ ] Update `apikey` table to require `organizationId` (text field, not null)
- [ ] Make `userId` optional on `apikey` table (for tracking creator)

### 1.2 Create Organization Schema (CMS Core)
**File:** `packages/postgresql-adapter/src/schema.ts`

- [ ] Create `organizations` table
  - id (uuid, primary key)
  - name (varchar 200)
  - slug (varchar 100, unique)
  - metadata (jsonb)
  - createdBy (text)
  - createdAt, updatedAt (timestamps)

- [ ] Create `organizationMembers` table
  - id (uuid, primary key)
  - organizationId (uuid, foreign key → organizations)
  - userId (text, references Better Auth user)
  - role (enum: owner, admin, editor, viewer)
  - preferences (jsonb)
  - invitedBy (text, nullable)
  - createdAt, updatedAt (timestamps)
  - Unique constraint on (organizationId, userId)

- [ ] Create `invitations` table
  - id (uuid, primary key)
  - organizationId (uuid, foreign key → organizations)
  - email (varchar 255)
  - role (enum: owner, admin, editor, viewer)
  - token (text, unique)
  - invitedBy (text)
  - expiresAt (timestamp)
  - acceptedAt (timestamp, nullable)
  - createdAt (timestamp)
  - Unique constraint on (organizationId, email)

- [ ] Update `documents` table: add `organizationId` (uuid, not null, foreign key)
- [ ] Update `assets` table: add `organizationId` (uuid, not null, foreign key)
- [ ] Update schema exports in `packages/postgresql-adapter/src/schema.ts`

### 1.3 Create Organization Types
**File:** `packages/cms-core/src/types/organization.ts`

- [ ] Create `Organization` interface
- [ ] Create `OrganizationMember` interface
- [ ] Create `OrganizationMembership` interface
- [ ] Create `Invitation` interface
- [ ] Create `CreateInvitationData` interface
- [ ] Create `CreateOrganizationData` interface
- [ ] Create `UpdateOrganizationData` interface
- [ ] Create `AddMemberData` interface

### 1.4 Update Auth Types
**File:** `packages/cms-core/src/types/user.ts`

- [ ] Update `UserProfile` interface
  - Add `isSuperAdmin: boolean`
  - Keep `preferences` optional

- [ ] Update `CMSUser` interface
  - Add `isSuperAdmin: boolean`
  - Add `activeOrganization?: { id, name, role }`
  - Add `organizations?: OrganizationMembership[]`

**File:** `packages/cms-core/src/types/auth.ts`

- [ ] Update `SessionAuth` interface
  - Add `activeOrganizationId?: string` to session object

- [ ] Update `ApiKeyAuth` interface
  - Make `organizationId: string` required (remove optional)
  - Remove `userId` or make optional
  - Add `createdBy?: string`

### 1.5 Export Types
**File:** `packages/cms-core/src/types/index.ts`

- [ ] Export all organization types
- [ ] Verify auth and user types are exported

---

## Phase 2: Database Adapters

### 2.1 Create Organization Adapter Interface
**File:** `packages/cms-core/src/db/interfaces/organization.ts`

- [ ] Define `OrganizationAdapter` interface with methods:
  - Organization CRUD (create, find, update, delete)
  - Membership management (add, remove, updateRole)
  - User queries (findUserOrganizations, findUserMembership)
  - Member queries (findOrganizationMembers)
  - Invitation management (create, find, accept, delete, cleanup)

### 2.2 Implement PostgreSQL Organization Adapter
**File:** `packages/postgresql-adapter/src/organization-adapter.ts`

- [ ] Create `PostgreSQLOrganizationAdapter` class
- [ ] Implement organization CRUD methods
- [ ] Implement membership management methods
- [ ] Implement invitation methods
- [ ] Add proper error handling and logging

### 2.3 Update Database Adapter Interface
**File:** `packages/cms-core/src/db/interfaces/index.ts`

- [ ] Extend `DatabaseAdapter` to include `OrganizationAdapter`
- [ ] Export `OrganizationAdapter` interface

### 2.4 Update PostgreSQL Adapter
**File:** `packages/postgresql-adapter/src/index.ts`

- [ ] Add organization adapter to main adapter class
- [ ] Ensure all organization methods are available

### 2.5 Update Document Adapter
**File:** `packages/postgresql-adapter/src/document-adapter.ts`

- [ ] Add `organizationId` parameter to all query methods
- [ ] Update all queries to filter by `organizationId`
- [ ] Update `createDocument` to require `organizationId`

### 2.6 Update Asset Adapter
**File:** `packages/postgresql-adapter/src/asset-adapter.ts`

- [ ] Add `organizationId` parameter to all query methods
- [ ] Update all queries to filter by `organizationId`
- [ ] Update `createAsset` to require `organizationId`

### 2.7 Update User Adapter
**File:** `packages/postgresql-adapter/src/user-adapter.ts`

- [ ] Add `setSuperAdmin(userId, isSuperAdmin)` method
- [ ] Add `findSuperAdmins()` method
- [ ] Add `countUsers()` method (for first user detection)

---

## Phase 3: Auth Service & Hooks

### 3.1 Update Auth Provider Interface
**File:** `packages/cms-core/src/auth/provider.ts`

- [ ] Add `switchOrganization` method to `AuthProvider` interface

### 3.2 Update Auth Service
**File:** `apps/studio/src/lib/server/auth/service.ts`

- [ ] Update `getSession` to:
  - Check if user is super admin
  - Load active organization from session
  - Load all user organizations
  - Build enhanced `CMSUser` object

- [ ] Implement `switchOrganization` method
  - Verify membership or super admin status
  - Update session with new active org
  - Return updated session

- [ ] Update `validateApiKey` to:
  - Require `organizationId` in metadata
  - Return error if missing

- [ ] Update `createApiKey` to require `organizationId` parameter

### 3.3 Update Auth Provider Export
**File:** `apps/studio/src/lib/server/auth/index.ts`

- [ ] Update `authProvider` object to include `switchOrganization`

### 3.4 Update Better Auth Hooks
**File:** `apps/studio/src/lib/server/auth/better-auth/instance.ts`

- [ ] Update signup hook:
  - Check if first user (make super admin)
  - Do NOT auto-create personal org

- [ ] Update deletion hook:
  - Remove user from all organizations
  - Handle owner succession (promote admin or delete org)

### 3.5 Update Auth Hooks
**File:** `packages/cms-core/src/auth/auth-hooks.ts`

- [ ] Update admin route protection:
  - Redirect to org selector if no active org (unless super admin)

- [ ] Update API route protection:
  - Require organization context for content routes
  - Allow super admins to access org management without active org
  - Attach `organizationId` to `event.locals`

---

## Phase 4: API Endpoints

### 4.1 Organization Management Routes

**File:** `apps/studio/src/routes/api/organizations/+server.ts`
- [ ] `GET` - List user's organizations
- [ ] `POST` - Create organization (super admin only)

**File:** `apps/studio/src/routes/api/organizations/[id]/+server.ts`
- [ ] `GET` - Get organization details
- [ ] `PATCH` - Update organization (owner only)
- [ ] `DELETE` - Delete organization (owner only)

### 4.2 Organization Members Routes

**File:** `apps/studio/src/routes/api/organizations/[id]/members/+server.ts`
- [ ] `GET` - List organization members

**File:** `apps/studio/src/routes/api/organizations/[id]/members/[userId]/+server.ts`
- [ ] `PATCH` - Update member role (owner/admin only)
- [ ] `DELETE` - Remove member (owner/admin only)

### 4.3 Invitation Routes

**File:** `apps/studio/src/routes/api/organizations/[id]/invitations/+server.ts`
- [ ] `GET` - List pending invitations (owner/admin only)
- [ ] `POST` - Create invitation (owner/admin only)

**File:** `apps/studio/src/routes/api/organizations/[id]/invitations/[invitationId]/+server.ts`
- [ ] `DELETE` - Cancel invitation (owner/admin only)

**File:** `apps/studio/src/routes/api/invitations/[token]/+server.ts`
- [ ] `GET` - Get invitation details (public, verify token)

**File:** `apps/studio/src/routes/api/invitations/[token]/accept/+server.ts`
- [ ] `POST` - Accept invitation (requires auth)

### 4.4 Auth Routes

**File:** `apps/studio/src/routes/api/auth/switch-organization/+server.ts`
- [ ] `POST` - Switch active organization

**File:** `apps/studio/src/routes/api/auth/signup-with-invitation/+server.ts`
- [ ] `POST` - Sign up with invitation token

### 4.5 Super Admin Routes

**File:** `apps/studio/src/routes/api/admin/users/+server.ts`
- [ ] `GET` - List all users (super admin only)

**File:** `apps/studio/src/routes/api/admin/users/[id]/super-admin/+server.ts`
- [ ] `POST` - Promote/demote super admin

**File:** `apps/studio/src/routes/api/admin/organizations/+server.ts`
- [ ] `GET` - List all organizations (super admin only)

### 4.6 Update Existing API Routes

**Update document routes** to use `event.locals.organizationId`
- [ ] `apps/studio/src/routes/api/documents/+server.ts`
- [ ] `apps/studio/src/routes/api/documents/[id]/+server.ts`

**Update asset routes** to use `event.locals.organizationId`
- [ ] `apps/studio/src/routes/api/assets/+server.ts`
- [ ] `apps/studio/src/routes/api/assets/[id]/+server.ts`

---

## Phase 5: Frontend Components

### 5.1 Organization Switcher

**File:** `apps/studio/src/lib/components/OrganizationSwitcher.svelte`
- [ ] Create organization switcher component
- [ ] Show super admin badge if applicable
- [ ] Show "Create Organization" link for super admin
- [ ] Implement organization switching
- [ ] Handle loading states

### 5.2 Organization Management UI

**File:** `apps/studio/src/routes/(admin)/admin/organizations/+page.svelte`
- [ ] List user's organizations
- [ ] Show create button (super admin only)

**File:** `apps/studio/src/routes/(admin)/admin/organizations/new/+page.svelte`
- [ ] Create organization form (super admin only)
- [ ] Validate slug uniqueness

**File:** `apps/studio/src/routes/(admin)/admin/organizations/[id]/+page.svelte`
- [ ] Organization details page
- [ ] Edit organization (owner only)
- [ ] View members list
- [ ] Invite member button

**File:** `apps/studio/src/routes/(admin)/admin/organizations/[id]/settings/+page.svelte`
- [ ] Organization settings (owner only)
- [ ] Update name, slug, metadata
- [ ] Delete organization

### 5.3 Member Management UI

**File:** `apps/studio/src/lib/components/InviteMemberDialog.svelte`
- [ ] Invite member form
- [ ] Email input
- [ ] Role selector
- [ ] Generate and display invite link

**File:** `apps/studio/src/lib/components/MembersList.svelte`
- [ ] Display organization members
- [ ] Show role badges
- [ ] Update role (owner/admin)
- [ ] Remove member (owner/admin)

### 5.4 Invitation Flow

**File:** `apps/studio/src/routes/(auth)/invite/[token]/+page.svelte`
- [ ] Load invitation details
- [ ] Show organization info
- [ ] Accept invitation (if logged in)
- [ ] Redirect to signup (if not logged in)

**File:** `apps/studio/src/routes/(auth)/signup/+page.svelte`
- [ ] Update signup to handle `?invite=token` param
- [ ] Validate invitation token
- [ ] Auto-accept invite after signup

### 5.5 Organization Selector

**File:** `apps/studio/src/routes/(admin)/select-organization/+page.svelte`
- [ ] Show if user has no active org
- [ ] List user's organizations
- [ ] Allow selecting an organization
- [ ] Redirect to admin after selection

### 5.6 Utility Functions

**File:** `apps/studio/src/lib/utils/permissions.ts`
- [ ] Create `canEditContent(user)` helper
- [ ] Create `canManageMembers(user)` helper
- [ ] Create `canManageOrganization(user)` helper
- [ ] Create `canCreateOrganizations(user)` helper

### 5.7 Update Layout

**File:** `apps/studio/src/routes/(admin)/admin/+layout.svelte`
- [ ] Add `OrganizationSwitcher` to header/sidebar
- [ ] Show current organization name

---

## Phase 6: Database Migration

### 6.1 Create Migration Script

**File:** `apps/studio/migrations/add-multi-tenancy.sql`

- [ ] Add `isSuperAdmin` to `user` table
- [ ] Add `activeOrganizationId` to `session` table
- [ ] Update `apikey` table (add `organizationId`, make required)
- [ ] Create `cms_organizations` table
- [ ] Create `cms_organization_members` table
- [ ] Create `cms_invitations` table
- [ ] Add `organizationId` to `cms_documents` (nullable initially)
- [ ] Add `organizationId` to `cms_assets` (nullable initially)

### 6.2 Create Data Migration Script

**File:** `apps/studio/migrations/migrate-to-multi-tenancy.sql`

- [ ] Mark specific user as super admin (by email)
- [ ] Create default organization
- [ ] Migrate `cms_user_profiles` to `cms_organization_members`
- [ ] Assign all documents to default organization
- [ ] Assign all assets to default organization
- [ ] Assign all API keys to default organization

### 6.3 Create Cleanup Script

**File:** `apps/studio/migrations/cleanup-multi-tenancy.sql`

- [ ] Make `organizationId` NOT NULL on documents
- [ ] Make `organizationId` NOT NULL on assets
- [ ] Make `organizationId` NOT NULL on apikey
- [ ] Drop `cms_user_profiles` table

### 6.4 Run Migrations

- [ ] Backup production database
- [ ] Run schema migration (add-multi-tenancy.sql)
- [ ] Run data migration (migrate-to-multi-tenancy.sql)
- [ ] Verify data integrity
- [ ] Run cleanup migration (cleanup-multi-tenancy.sql)

---

## Phase 7: Testing

### 7.1 Unit Tests

**File:** `packages/postgresql-adapter/tests/organization-adapter.test.ts`
- [ ] Test organization CRUD operations
- [ ] Test membership management
- [ ] Test invitation system
- [ ] Test token generation and validation

**File:** `apps/studio/tests/auth/super-admin.test.ts`
- [ ] Test first user becomes super admin
- [ ] Test super admin can create organizations
- [ ] Test super admin can switch to any org

### 7.2 Integration Tests

**File:** `apps/studio/tests/api/organizations.test.ts`
- [ ] Test organization creation (super admin)
- [ ] Test organization listing
- [ ] Test organization updates (owner only)
- [ ] Test organization deletion (owner only)

**File:** `apps/studio/tests/api/members.test.ts`
- [ ] Test member invitation
- [ ] Test invitation acceptance
- [ ] Test role updates
- [ ] Test member removal

**File:** `apps/studio/tests/api/content-isolation.test.ts`
- [ ] Test documents are scoped to organization
- [ ] Test assets are scoped to organization
- [ ] Test users can't access other org's content
- [ ] Test API keys are org-scoped

### 7.3 E2E Tests

**File:** `apps/studio/tests/e2e/multi-tenancy.spec.ts`
- [ ] Test complete signup → org creation → invite flow
- [ ] Test organization switching
- [ ] Test content isolation
- [ ] Test super admin privileges

---

## Phase 8: Documentation

### 8.1 Developer Documentation

**File:** `docs/MULTI_TENANCY.md`
- [ ] Document conceptual model
- [ ] Document database schema
- [ ] Document API endpoints
- [ ] Document permission model
- [ ] Provide code examples

### 8.2 API Documentation

**File:** `docs/API_REFERENCE.md`
- [ ] Update with new organization endpoints
- [ ] Update with invitation endpoints
- [ ] Document authentication changes
- [ ] Document API key changes

### 8.3 User Guide

**File:** `docs/USER_GUIDE.md`
- [ ] How to create an organization
- [ ] How to invite team members
- [ ] How to switch organizations
- [ ] How to manage permissions
- [ ] How to create API keys

### 8.4 Migration Guide

**File:** `docs/MIGRATION_GUIDE.md`
- [ ] Pre-migration checklist
- [ ] Step-by-step migration instructions
- [ ] Rollback procedures
- [ ] Common issues and solutions

---

## Phase 9: Deployment

### 9.1 Staging Deployment
- [ ] Deploy to staging environment
- [ ] Run database migrations
- [ ] Verify super admin functionality
- [ ] Test organization creation
- [ ] Test invitation flow
- [ ] Test content isolation
- [ ] Performance testing

### 9.2 Production Preparation
- [ ] Create rollback plan
- [ ] Prepare monitoring/alerting
- [ ] Schedule maintenance window
- [ ] Notify users of changes
- [ ] Prepare support documentation

### 9.3 Production Deployment
- [ ] Backup production database
- [ ] Run database migrations
- [ ] Deploy application code
- [ ] Verify super admin setup
- [ ] Monitor for errors
- [ ] Test critical flows

### 9.4 Post-Deployment
- [ ] Monitor application logs
- [ ] Monitor database performance
- [ ] Verify no data corruption
- [ ] Collect user feedback
- [ ] Address any issues

---

## Phase 10: Optional Enhancements (Future)

### 10.1 Email Notifications
- [ ] Send email when invited to organization
- [ ] Send email when role is updated
- [ ] Send email when removed from organization
- [ ] Invitation reminder emails

### 10.2 Audit Logging
- [ ] Log organization creation
- [ ] Log member additions/removals
- [ ] Log role changes
- [ ] Log organization deletions

### 10.3 Billing Integration (if needed)
- [ ] Associate plans with organizations
- [ ] Track usage per organization
- [ ] Implement billing workflows

### 10.4 Advanced Permissions
- [ ] Custom roles beyond owner/admin/editor/viewer
- [ ] Granular permissions per resource type
- [ ] Team-based permissions

### 10.5 GraphQL Schema
- [ ] Implement organization queries
- [ ] Implement organization mutations
- [ ] Implement invitation mutations
- [ ] Add organization context to all queries

---

## Progress Tracking

**Current Phase:** Not Started

**Completion:**
- [ ] Phase 1: Database Schema & Types (0/5)
- [ ] Phase 2: Database Adapters (0/7)
- [ ] Phase 3: Auth Service & Hooks (0/5)
- [ ] Phase 4: API Endpoints (0/6)
- [ ] Phase 5: Frontend Components (0/7)
- [ ] Phase 6: Database Migration (0/4)
- [ ] Phase 7: Testing (0/3)
- [ ] Phase 8: Documentation (0/4)
- [ ] Phase 9: Deployment (0/4)

**Estimated Time:** 3-4 weeks for core implementation (Phases 1-6)

---

## Notes

- Always test changes in development before staging
- Keep the `MULTI_TENANCY_PLAN.md` as reference for design decisions
- Update this checklist as you complete tasks
- Add any discovered tasks as they come up
- Document any deviations from the plan
