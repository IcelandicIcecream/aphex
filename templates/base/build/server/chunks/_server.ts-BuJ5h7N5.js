import { j as json } from './index-CpeNL06-.js';
import './storage-_ubboXxO.js';
import 'sharp';
import './utils-gGoUUMc2.js';
import 'fs/promises';
import 'path';

const POST = async ({ request, locals }) => {
  try {
    const { databaseAdapter } = locals.aphexCMS;
    const auth = locals.auth;
    if (!auth || auth.type !== "session") {
      return json({
        success: false,
        error: "Unauthorized",
        message: "Session authentication required"
      }, { status: 401 });
    }
    if (auth.organizationRole !== "owner" && auth.organizationRole !== "admin") {
      return json({
        success: false,
        error: "Forbidden",
        message: "Only owners and admins can invite members"
      }, { status: 403 });
    }
    const body = await request.json();
    if (!body.email || !body.role) {
      return json({
        success: false,
        error: "Missing required fields",
        message: "email and role are required"
      }, { status: 400 });
    }
    const validRoles = ["admin", "editor", "viewer"];
    if (!validRoles.includes(body.role)) {
      return json({
        success: false,
        error: "Invalid role",
        message: "Role must be one of: admin, editor, viewer"
      }, { status: 400 });
    }
    const existingInvitations = await databaseAdapter.findOrganizationInvitations(auth.organizationId);
    const pendingInvitation = existingInvitations.find((inv) => inv.email.toLowerCase() === body.email.toLowerCase() && inv.acceptedAt === null);
    if (pendingInvitation) {
      return json({
        success: false,
        error: "Already invited",
        message: "This email has already been invited to the organization"
      }, { status: 400 });
    }
    const token = crypto.randomUUID();
    const invitation = await databaseAdapter.createInvitation({
      organizationId: auth.organizationId,
      email: body.email.toLowerCase(),
      role: body.role,
      invitedBy: auth.user.id,
      token,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1e3)
      // 7 days
    });
    return json({
      success: true,
      data: invitation,
      message: "Invitation sent successfully. User will automatically join when they sign up."
    }, { status: 201 });
  } catch (error) {
    console.error("Failed to create invitation:", error);
    return json({
      success: false,
      error: "Failed to create invitation",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
};
const DELETE = async ({ request, locals }) => {
  try {
    const { databaseAdapter } = locals.aphexCMS;
    const auth = locals.auth;
    if (!auth || auth.type !== "session") {
      return json({
        success: false,
        error: "Unauthorized",
        message: "Session authentication required"
      }, { status: 401 });
    }
    if (auth.organizationRole !== "owner" && auth.organizationRole !== "admin") {
      return json({
        success: false,
        error: "Forbidden",
        message: "Only owners and admins can cancel invitations"
      }, { status: 403 });
    }
    const body = await request.json();
    if (!body.invitationId) {
      return json({
        success: false,
        error: "Missing required field",
        message: "invitationId is required"
      }, { status: 400 });
    }
    const deleted = await databaseAdapter.deleteInvitation(body.invitationId);
    if (!deleted) {
      return json({
        success: false,
        error: "Invitation not found"
      }, { status: 404 });
    }
    return json({
      success: true,
      message: "Invitation canceled successfully"
    });
  } catch (error) {
    console.error("Failed to cancel invitation:", error);
    return json({
      success: false,
      error: "Failed to cancel invitation",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
};

export { DELETE, POST };
//# sourceMappingURL=_server.ts-BuJ5h7N5.js.map
