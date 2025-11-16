import { a as drizzleDb, b as apikey, u as user } from './index3-D3XGwzxA.js';
import { organizations, invitations, organizationMembers } from '@aphexcms/postgresql-adapter/schema';
import { eq } from 'drizzle-orm';
import 'drizzle-orm/postgres-js';
import 'postgres';
import './shared-server-DaWdgxVh.js';
import '@aphexcms/postgresql-adapter';
import 'drizzle-orm/pg-core';

const organizationService = {
  /**
   * Get organization with enriched member data (includes user details)
   * This performs a join between CMS organizationMembers and auth user tables
   */
  async getOrganizationWithMembers(organizationId) {
    const org = await drizzleDb.query.organizations.findFirst({
      where: eq(organizations.id, organizationId)
    });
    if (!org) {
      return null;
    }
    const members = await drizzleDb.select({
      member: organizationMembers,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image
      },
      invitation: {
        email: invitations.email
      }
    }).from(organizationMembers).innerJoin(user, eq(organizationMembers.userId, user.id)).leftJoin(invitations, eq(organizationMembers.invitationId, invitations.id)).where(eq(organizationMembers.organizationId, organizationId));
    return {
      organization: org,
      members: members.map((m) => ({
        member: m.member,
        user: {
          id: m.user.id,
          email: m.user.email,
          name: m.user.name,
          image: m.user.image
        },
        invitedEmail: m.invitation?.email || null
      }))
    };
  }
};
const load = async ({ locals }) => {
  const auth = locals.auth;
  if (!auth || auth.type !== "session") {
    throw new Error("No session found");
  }
  const userApiKeys = await drizzleDb.query.apikey.findMany({
    where: eq(apikey.userId, auth.user.id),
    columns: {
      id: true,
      name: true,
      metadata: true,
      expiresAt: true,
      lastRequest: true,
      createdAt: true
    },
    orderBy: (apikey2, { desc }) => [desc(apikey2.createdAt)]
  });
  const apiKeysWithPermissions = userApiKeys.map((key) => {
    let metadata = key.metadata;
    if (typeof metadata === "string") {
      metadata = JSON.parse(metadata);
      if (typeof metadata === "string") {
        metadata = JSON.parse(metadata);
      }
    }
    metadata = metadata || null;
    return {
      ...key,
      permissions: metadata.permissions || [],
      organizationId: metadata.organizationId
    };
  }).filter((key) => key.organizationId === auth.organizationId);
  const databaseAdapter = locals.aphexCMS.databaseAdapter;
  let activeOrganization = null;
  let pendingInvitations = [];
  let currentUserOrgRole = null;
  if (auth.organizationId) {
    const orgData = await organizationService.getOrganizationWithMembers(auth.organizationId);
    if (orgData) {
      activeOrganization = {
        ...orgData.organization,
        members: orgData.members.map((m) => ({
          ...m.member,
          user: m.user,
          invitedEmail: m.invitedEmail
        }))
      };
      const currentMember = orgData.members.find((m) => m.user.id === auth.user.id);
      currentUserOrgRole = currentMember?.member.role || null;
    }
    const invitations2 = await databaseAdapter.findOrganizationInvitations(auth.organizationId);
    pendingInvitations = invitations2.filter((inv) => !inv.acceptedAt && inv.expiresAt > /* @__PURE__ */ new Date());
  }
  return {
    user: {
      id: auth.user.id,
      email: auth.user.email,
      name: auth.user.name,
      role: auth.user.role,
      organizationRole: currentUserOrgRole
      // Add organization role
    },
    apiKeys: apiKeysWithPermissions,
    activeOrganization,
    pendingInvitations
  };
};

var _page_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 6;
let component_cache;
const component = async () => component_cache ??= (await import('./_page.svelte-ySOEy3UJ.js')).default;
const server_id = "src/routes/(protected)/admin/settings/+page.server.ts";
const imports = ["_app/immutable/nodes/6.Bln5tfKQ.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/DWBROaph.js","_app/immutable/chunks/D4agE4Ng.js","_app/immutable/chunks/CQxSK_kJ.js","_app/immutable/chunks/CrQaW3DA.js","_app/immutable/chunks/CMwlA4jW.js","_app/immutable/chunks/Da8QwHVz.js","_app/immutable/chunks/zhm3sqsy.js","_app/immutable/chunks/CI7EuJFJ.js","_app/immutable/chunks/CC2su3ap.js","_app/immutable/chunks/CgH_2WnA.js","_app/immutable/chunks/D8BKmG1w.js","_app/immutable/chunks/DL8tdTp6.js","_app/immutable/chunks/CrOXdnIQ.js","_app/immutable/chunks/AHJMyVxs.js","_app/immutable/chunks/DJpeLsgd.js"];
const stylesheets = ["_app/immutable/assets/6.CV-KWLNP.css"];
const fonts = [];

export { component, fonts, imports, index, _page_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=6-B8jxMFnx.js.map
