import { d as drizzleDb, o as organizations, i as invitations, u as user, c as organizationMembers } from './index2-CZgae6HB.js';
import { eq } from 'drizzle-orm';
import 'drizzle-orm/postgres-js';
import 'postgres';
import './shared-server-BmU87nph.js';
import './logger-C1WBmfZZ.js';
import './utils-FiC4zhrQ.js';
import './storage-CxrQC-cN.js';
import 'fs/promises';
import 'path';
import 'sharp';
import './date-utils-xyIWAIQq.js';
import './_commonjsHelpers-C1uiShF5.js';
import './content-hash-AOe_NOqf.js';
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
  locals.aphexCMS.databaseAdapter;
  let activeOrganization = null;
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
  }
  return {
    user: {
      id: auth.user.id,
      email: auth.user.email,
      name: auth.user.name,
      role: auth.user.role,
      organizationRole: currentUserOrgRole
    },
    activeOrganization
  };
};

var _layout_server_ts = /*#__PURE__*/Object.freeze({
  __proto__: null,
  load: load
});

const index = 3;
let component_cache;
const component = async () => component_cache ??= (await import('./_layout.svelte-BBVHU-yU.js')).default;
const server_id = "src/routes/(protected)/admin/settings/+layout.server.ts";
const imports = ["_app/immutable/nodes/3.6x609MNc.js","_app/immutable/chunks/BDCi2jMF.js","_app/immutable/chunks/CK91KPpo.js","_app/immutable/chunks/CcHWWnoU.js","_app/immutable/chunks/CPc8x607.js","_app/immutable/chunks/D8MlOj3o.js","_app/immutable/chunks/DYT902qo.js","_app/immutable/chunks/dt7zgPvE.js","_app/immutable/chunks/BQvIzZR_.js","_app/immutable/chunks/Bcrdfp_K.js","_app/immutable/chunks/ngokrZaz.js"];
const stylesheets = [];
const fonts = [];

export { component, fonts, imports, index, _layout_server_ts as server, server_id, stylesheets };
//# sourceMappingURL=3-CekbUYnU.js.map
