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

const POST = async ({ request }) => {
  try {
    const body = await request.json();
    if (!body.token || !body.newPassword) {
      return json(
        {
          success: false,
          error: "Missing required fields",
          message: "token and newPassword are required"
        },
        { status: 400 }
      );
    }
    await authProvider.resetPassword(body.token, body.newPassword);
    return json({
      success: true,
      message: "Password reset successfully"
    });
  } catch (error) {
    console.error("Failed to reset password:", error);
    return json(
      {
        success: false,
        error: "Failed to reset password",
        message: error instanceof Error ? error.message : "Invalid or expired token"
      },
      { status: 500 }
    );
  }
};

export { POST };
//# sourceMappingURL=_server.ts-C140B2sL.js.map
