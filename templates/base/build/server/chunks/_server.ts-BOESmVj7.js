import { j as json } from './index-CpeNL06-.js';
import { authProvider } from './index4-DKPpYvdn.js';
import './utils-gGoUUMc2.js';
import './service-CEhtyGUm.js';
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

const PATCH = async ({ request, locals }) => {
  try {
    const auth = locals.auth;
    if (!auth || auth.type !== "session") {
      return json(
        {
          success: false,
          error: "Unauthorized",
          message: "Session authentication required"
        },
        { status: 401 }
      );
    }
    const body = await request.json();
    if (body.name === void 0) {
      return json(
        {
          success: false,
          error: "Missing required field",
          message: "name is required"
        },
        { status: 400 }
      );
    }
    await authProvider.changeUserName(auth.user.id, body.name);
    return json({
      success: true,
      message: "User updated successfully"
    });
  } catch (error) {
    console.error("Failed to update user:", error);
    return json(
      {
        success: false,
        error: "Failed to update user",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
};

export { PATCH };
//# sourceMappingURL=_server.ts-BOESmVj7.js.map
