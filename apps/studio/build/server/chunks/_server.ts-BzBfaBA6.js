import { j as json } from './index-BcOZ6EV9.js';
import './utils-FiC4zhrQ.js';

const GET = async ({ locals }) => {
  try {
    const { databaseAdapter } = locals.aphexCMS;
    const auth = locals.auth;
    if (!auth || auth.type !== "session") {
      return json(
        { success: false, error: "Unauthorized", message: "Session authentication required" },
        { status: 401 }
      );
    }
    const settings = await databaseAdapter.getInstanceSettings();
    return json({ success: true, data: settings });
  } catch (error) {
    console.error("Failed to fetch instance settings:", error);
    return json(
      {
        success: false,
        error: "Failed to fetch instance settings",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
};
const PATCH = async ({ request, locals }) => {
  try {
    const { databaseAdapter } = locals.aphexCMS;
    const auth = locals.auth;
    if (!auth || auth.type !== "session") {
      return json(
        { success: false, error: "Unauthorized", message: "Session authentication required" },
        { status: 401 }
      );
    }
    if (auth.user.role !== "super_admin") {
      return json(
        {
          success: false,
          error: "Forbidden",
          message: "Only super admins can update instance settings"
        },
        { status: 403 }
      );
    }
    const body = await request.json();
    const updated = await databaseAdapter.updateInstanceSettings(body);
    return json({ success: true, data: updated });
  } catch (error) {
    console.error("Failed to update instance settings:", error);
    return json(
      {
        success: false,
        error: "Failed to update instance settings",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
};

export { GET, PATCH };
//# sourceMappingURL=_server.ts-BzBfaBA6.js.map
