import { j as json } from './index-CpeNL06-.js';
import { a as auth } from './instance-CdYwVbs3.js';
import './index3-D3XGwzxA.js';
import './storage-_ubboXxO.js';
import 'sharp';
import './utils-gGoUUMc2.js';
import './instance2-stPrjck3.js';
import 'better-auth';
import 'better-auth/plugins';
import 'better-auth/adapters/drizzle';
import 'better-auth/api';
import '@aphexcms/resend-adapter';
import 'drizzle-orm/postgres-js';
import 'postgres';
import './shared-server-DaWdgxVh.js';
import '@aphexcms/postgresql-adapter';
import '@aphexcms/postgresql-adapter/schema';
import 'drizzle-orm/pg-core';
import 'fs/promises';
import 'path';

const DELETE = async ({ params, request, locals }) => {
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
            message: "Only organization owners, admins, and editors can delete API keys"
          },
          { status: 403 }
        );
      }
    }
    const { id } = params;
    if (!id) {
      return json({ error: "ID not found in params" }, { status: 400 });
    }
    const data = await auth.api.deleteApiKey({
      body: {
        keyId: id
        // required
      },
      headers: request.headers
    });
    if (data.success) {
      return json({ success: true });
    }
    return json({ error: "Failed to delete API key" }, { status: 500 });
  } catch (error) {
    console.error("Error deleting API key:", error);
    return json({ error: "Failed to delete API key" }, { status: 500 });
  }
};

export { DELETE };
//# sourceMappingURL=_server.ts-BHVxoVVi.js.map
