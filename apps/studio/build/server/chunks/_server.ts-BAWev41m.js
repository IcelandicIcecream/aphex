import { c as cmsLogger } from './logger-C1WBmfZZ.js';
import { j as json } from './index-BcOZ6EV9.js';
import './storage-CxrQC-cN.js';
import 'sharp';
import './date-utils-xyIWAIQq.js';
import { e as emailConfig, a as email } from './index8-DrQ5zxy0.js';
import './utils-FiC4zhrQ.js';
import 'fs/promises';
import 'path';
import './_commonjsHelpers-C1uiShF5.js';
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
import './shared-server-BmU87nph.js';
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

const POST$1 = async ({ request, locals }) => {
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
    if (auth.organizationRole !== "owner" && auth.organizationRole !== "admin") {
      return json(
        {
          success: false,
          error: "Forbidden",
          message: "Only owners and admins can invite members"
        },
        { status: 403 }
      );
    }
    const body = await request.json();
    if (!body.email || !body.role) {
      return json(
        {
          success: false,
          error: "Missing required fields",
          message: "email and role are required"
        },
        { status: 400 }
      );
    }
    const validRoles = ["admin", "editor", "viewer"];
    if (!validRoles.includes(body.role)) {
      return json(
        {
          success: false,
          error: "Invalid role",
          message: "Role must be one of: admin, editor, viewer"
        },
        { status: 400 }
      );
    }
    const existingInvitations = await databaseAdapter.findOrganizationInvitations(
      auth.organizationId
    );
    const pendingInvitation = existingInvitations.find(
      (inv) => inv.email.toLowerCase() === body.email.toLowerCase() && inv.acceptedAt === null
    );
    if (pendingInvitation) {
      return json(
        {
          success: false,
          error: "Already invited",
          message: "This email has already been invited to the organization"
        },
        { status: 400 }
      );
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
    return json(
      {
        success: true,
        data: invitation,
        message: "Invitation created successfully."
      },
      { status: 201 }
    );
  } catch (error) {
    cmsLogger.error("Failed to create invitation:", error);
    return json(
      {
        success: false,
        error: "Failed to create invitation",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
};
const DELETE = async ({ request, locals }) => {
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
    if (auth.organizationRole !== "owner" && auth.organizationRole !== "admin") {
      return json(
        {
          success: false,
          error: "Forbidden",
          message: "Only owners and admins can cancel invitations"
        },
        { status: 403 }
      );
    }
    const body = await request.json();
    if (!body.invitationId) {
      return json(
        {
          success: false,
          error: "Missing required field",
          message: "invitationId is required"
        },
        { status: 400 }
      );
    }
    const deleted = await databaseAdapter.deleteInvitation(body.invitationId);
    if (!deleted) {
      return json(
        {
          success: false,
          error: "Invitation not found"
        },
        { status: 404 }
      );
    }
    return json({
      success: true,
      message: "Invitation canceled successfully"
    });
  } catch (error) {
    cmsLogger.error("Failed to cancel invitation:", error);
    return json(
      {
        success: false,
        error: "Failed to cancel invitation",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
};
const POST = async (event) => {
  const clonedRequest = event.request.clone();
  const response = await POST$1(event);
  if (response.status === 201) {
    try {
      const body = await clonedRequest.json();
      const result = await response.clone().json();
      const invitation = result.data;
      if (invitation?.token) {
        const { databaseAdapter } = event.locals.aphexCMS;
        const auth = event.locals.auth;
        const org = auth && auth.type !== "partial_session" ? await databaseAdapter.findOrganizationById(auth.organizationId) : null;
        const orgName = org?.name || "an organization";
        const inviteUrl = `${event.url.origin}/invite/${invitation.token}`;
        (async () => {
          try {
            const { html, text } = await emailConfig.invitation.render(
              orgName,
              body.role,
              inviteUrl
            );
            await email.send({
              from: emailConfig.from,
              to: body.email.toLowerCase(),
              subject: emailConfig.invitation.getSubject(orgName),
              html,
              text
            });
            console.log(`[Invitations]: Invitation email sent to ${body.email}`);
          } catch (err) {
            console.error(
              `[Invitations]: Failed to send invitation email to ${body.email}:`,
              err
            );
          }
        })();
      }
    } catch (emailError) {
      console.error("[Invitations]: Failed to send invitation email:", emailError);
    }
  }
  return response;
};

export { DELETE, POST };
//# sourceMappingURL=_server.ts-BAWev41m.js.map
