import { j as json } from './index-BcOZ6EV9.js';
import './utils-FiC4zhrQ.js';

const POST = async ({ params, locals }) => {
  try {
    const { databaseAdapter } = locals.aphexCMS;
    const auth = locals.auth;
    if (!auth || auth.type === "api_key") {
      return json(
        { success: false, error: "Unauthorized", message: "Session authentication required" },
        { status: 401 }
      );
    }
    const invitationId = params.id;
    const allInvitations = await databaseAdapter.findInvitationsByEmail(auth.user.email);
    const invitation = allInvitations.find((inv) => inv.id === invitationId);
    if (!invitation) {
      return json({ success: false, error: "Invitation not found" }, { status: 404 });
    }
    if (invitation.acceptedAt !== null) {
      return json({ success: false, error: "Invitation already accepted" }, { status: 400 });
    }
    await databaseAdapter.deleteInvitation(invitationId);
    return json({
      success: true,
      message: "Invitation declined"
    });
  } catch (error) {
    console.error("Failed to reject invitation:", error);
    return json(
      {
        success: false,
        error: "Failed to reject invitation",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
};

export { POST };
//# sourceMappingURL=_server.ts-00k6QwqU.js.map
