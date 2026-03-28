import { j as json } from './index-BcOZ6EV9.js';
import { c as cmsLogger } from './logger-C1WBmfZZ.js';
import './utils-FiC4zhrQ.js';

const GET$1 = async ({ locals }) => {
  try {
    const { databaseAdapter } = locals.aphexCMS;
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
    const userProfile = await databaseAdapter.findUserProfileById(auth.user.id);
    return json({
      success: true,
      data: userProfile?.preferences || {}
    });
  } catch (error) {
    cmsLogger.error("Failed to get user preferences:", error);
    return json(
      {
        success: false,
        error: "Failed to get user preferences",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
};
const PATCH$1 = async ({ request, locals }) => {
  try {
    const { databaseAdapter } = locals.aphexCMS;
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
    if (typeof body !== "object" || body === null) {
      return json(
        {
          success: false,
          error: "Invalid request body",
          message: "Expected an object with preference values"
        },
        { status: 400 }
      );
    }
    if (body.includeChildOrganizations !== void 0 && typeof body.includeChildOrganizations !== "boolean") {
      return json(
        {
          success: false,
          error: "Invalid preference value",
          message: "includeChildOrganizations must be a boolean"
        },
        { status: 400 }
      );
    }
    await databaseAdapter.updateUserPreferences(auth.user.id, body);
    const userProfile = await databaseAdapter.findUserProfileById(auth.user.id);
    return json({
      success: true,
      data: userProfile?.preferences || {}
    });
  } catch (error) {
    cmsLogger.error("Failed to update user preferences:", error);
    return json(
      {
        success: false,
        error: "Failed to update user preferences",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
};
const userPreferences = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  GET: GET$1,
  PATCH: PATCH$1
}, Symbol.toStringTag, { value: "Module" }));
const { GET, PATCH } = userPreferences;

export { GET, PATCH };
//# sourceMappingURL=_server.ts-CQPj2udz.js.map
