import { j as json } from './index-CpeNL06-.js';
import { a as authService } from './service-CEhtyGUm.js';
import './utils-gGoUUMc2.js';
import './instance-CdYwVbs3.js';
import './index3-D3XGwzxA.js';
import 'drizzle-orm/postgres-js';
import 'postgres';
import './shared-server-DaWdgxVh.js';
import '@aphexcms/postgresql-adapter';
import '@aphexcms/postgresql-adapter/schema';
import 'drizzle-orm/pg-core';
import './instance2-stPrjck3.js';
import 'better-auth';
import 'better-auth/plugins';
import 'better-auth/adapters/drizzle';
import 'better-auth/api';
import '@aphexcms/resend-adapter';
import 'drizzle-orm';
import './storage-_ubboXxO.js';
import 'fs/promises';
import 'path';
import 'sharp';

const GET = async ({ locals }) => {
  if (!locals.auth || locals.auth.type !== "session") {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { databaseAdapter } = locals.aphexCMS;
    const apiKeys = await authService.listApiKeys(databaseAdapter, locals.auth.user.id);
    return json({ apiKeys });
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return json({ error: "Failed to fetch API keys" }, { status: 500 });
  }
};
const POST = async ({ request, locals }) => {
  if (!locals.auth || locals.auth.type !== "session") {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { databaseAdapter } = locals.aphexCMS;
    if (locals.auth && locals.auth.organizationId) {
      const memberships = await databaseAdapter.findUserOrganizations(locals.auth.user.id);
      const currentMembership = memberships.find(
        (m) => m.organization.id === locals?.auth?.organizationId
      );
      const orgRole = currentMembership?.member.role;
      if (orgRole !== "owner" && orgRole !== "admin" && orgRole !== "editor") {
        return json(
          {
            error: "Forbidden",
            message: "Only organization owners, admins, and editors can create API keys"
          },
          { status: 403 }
        );
      }
    }
    const { name, permissions, expiresInDays } = await request.json();
    if (!name || !permissions || !Array.isArray(permissions)) {
      return json({ error: "Invalid input" }, { status: 400 });
    }
    const apiKey = await authService.createApiKey(locals.auth.user.id, locals.auth.organizationId, {
      name,
      permissions,
      expiresInDays
    });
    return json({ apiKey });
  } catch (error) {
    console.error("Error creating API key:", error);
    return json({ error: "Failed to create API key" }, { status: 500 });
  }
};

export { GET, POST };
//# sourceMappingURL=_server.ts-CZxkt7Ax.js.map
