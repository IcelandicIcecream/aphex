import { j as json } from './index-BcOZ6EV9.js';
import { a as authService } from './service-D_kWyptI.js';
import './utils-FiC4zhrQ.js';
import './instance-BV3tjq30.js';
import './index2-CZgae6HB.js';
import 'drizzle-orm/postgres-js';
import 'postgres';
import './shared-server-BmU87nph.js';
import 'drizzle-orm';
import './logger-C1WBmfZZ.js';
import './storage-CxrQC-cN.js';
import 'fs/promises';
import 'path';
import 'sharp';
import './date-utils-xyIWAIQq.js';
import './_commonjsHelpers-C1uiShF5.js';
import './content-hash-AOe_NOqf.js';
import 'drizzle-orm/pg-core';
import './index8-DrQ5zxy0.js';
import 'events';
import 'url';
import 'util';
import 'fs';
import 'http';
import 'https';
import 'zlib';
import 'stream';
import 'net';
import 'dns';
import 'os';
import 'crypto';
import 'tls';
import 'child_process';
import 'node:crypto';
import './button-1bYQaKO-.js';
import './index5-DltsKoco.js';
import './context-CAhUmS6w.js';
import './utils2-CVx6kO_W.js';
import './badge-DEuvdmY7.js';
import './sheet-content-CfdNXqIw.js';
import './create-id-BLMzD-FL.js';
import './index3-BFl01i1Z.js';
import './states.svelte-CxCkWsnb.js';
import './events-C5y5VZ_W.js';
import './exports-Ci9YzwMm.js';
import './client-BGGljB7r.js';
import './html-FW6Ia4bL.js';
import './string-BWrpxotr.js';
import '@better-auth/api-key';
import '@better-auth/drizzle-adapter';
import './auth-errors-BOr7Rsjn.js';

const GET = async ({ locals }) => {
  if (!locals.auth || locals.auth.type !== "session") {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const { databaseAdapter } = locals.aphexCMS;
    const apiKeys = await authService.listApiKeys(databaseAdapter, locals.auth.user.id);
    return json({ success: true, data: apiKeys });
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return json({ error: "Failed to fetch API keys" }, { status: 500 });
  }
};
const POST = async ({ request, locals }) => {
  if (!locals.auth || locals.auth.type !== "session") {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const auth = locals.auth;
  try {
    const { databaseAdapter } = locals.aphexCMS;
    const memberships = await databaseAdapter.findUserOrganizations(auth.user.id);
    const currentMembership = memberships.find((m) => m.organization.id === auth.organizationId);
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
    const { name, permissions, expiresInDays } = await request.json();
    if (!name || !permissions || !Array.isArray(permissions)) {
      return json({ error: "Invalid input" }, { status: 400 });
    }
    const apiKey = await authService.createApiKey(auth.user.id, auth.organizationId, {
      name,
      permissions,
      expiresInDays
    });
    return json({ success: true, data: { apiKey } });
  } catch (error) {
    console.error("Error creating API key:", error);
    return json({ error: "Failed to create API key" }, { status: 500 });
  }
};

export { GET, POST };
//# sourceMappingURL=_server.ts-DLEarWQ5.js.map
