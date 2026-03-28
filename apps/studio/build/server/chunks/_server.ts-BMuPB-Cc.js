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

const POST = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.email) {
      return json(
        {
          success: false,
          error: "Missing required field",
          message: "email is required"
        },
        { status: 400 }
      );
    }
    await auth.api.requestPasswordReset({
      body: {
        email: body.email,
        redirectTo: body.redirectTo
      }
    });
    return json({
      success: true,
      message: "If an account exists with that email, a password reset link has been sent"
    });
  } catch (error) {
    console.error("Failed to request password reset:", error);
    return json(
      {
        success: false,
        error: "Failed to request password reset",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
};

export { POST };
//# sourceMappingURL=_server.ts-BMuPB-Cc.js.map
