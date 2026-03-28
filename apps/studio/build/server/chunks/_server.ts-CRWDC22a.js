import { j as json } from './index-BcOZ6EV9.js';
import { b as auth } from './instance-BV3tjq30.js';
import './index2-CZgae6HB.js';
import './logger-C1WBmfZZ.js';
import './storage-CxrQC-cN.js';
import 'sharp';
import './date-utils-xyIWAIQq.js';
import './button-1bYQaKO-.js';
import './badge-DEuvdmY7.js';
import './sheet-content-CfdNXqIw.js';
import './client-BGGljB7r.js';
import './exports-Ci9YzwMm.js';
import './states.svelte-CxCkWsnb.js';
import './index3-BFl01i1Z.js';
import './utils-FiC4zhrQ.js';
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
import 'path';
import 'crypto';
import 'tls';
import 'child_process';
import './_commonjsHelpers-C1uiShF5.js';
import 'node:crypto';
import './shared-server-BmU87nph.js';
import './index5-DltsKoco.js';
import './context-CAhUmS6w.js';
import './html-FW6Ia4bL.js';
import './string-BWrpxotr.js';
import '@better-auth/api-key';
import '@better-auth/drizzle-adapter';
import 'drizzle-orm/postgres-js';
import 'postgres';
import 'drizzle-orm';
import './content-hash-AOe_NOqf.js';
import 'drizzle-orm/pg-core';
import 'fs/promises';
import './utils2-CVx6kO_W.js';
import './create-id-BLMzD-FL.js';
import './events-C5y5VZ_W.js';

const DELETE = async ({ params, request, locals }) => {
  if (!locals.auth || locals.auth.type !== "session") {
    return json({ error: "Unauthorized" }, { status: 401 });
  }
  const session = locals.auth;
  try {
    const { databaseAdapter } = locals.aphexCMS;
    const memberships = await databaseAdapter.findUserOrganizations(session.user.id);
    const currentMembership = memberships.find((m) => m.organization.id === session.organizationId);
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
//# sourceMappingURL=_server.ts-CRWDC22a.js.map
