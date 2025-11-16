import { j as json } from './index-CpeNL06-.js';
import { l as latestPasswordResetUrl } from './instance2-stPrjck3.js';
import './utils-gGoUUMc2.js';
import 'better-auth';
import 'better-auth/plugins';
import 'better-auth/adapters/drizzle';
import 'better-auth/api';
import '@aphexcms/resend-adapter';

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
    const { auth } = await import('./index4-DKPpYvdn.js');
    await auth.api.forgetPassword({
      body: {
        email: body.email,
        redirectTo: body.redirectTo
      }
    });
    const response = {
      success: true,
      message: "If an account exists with that email, a password reset link has been sent"
    };
    if (process.env.NODE_ENV === "development" && latestPasswordResetUrl) {
      response.resetUrl = latestPasswordResetUrl;
    }
    return json(response);
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
//# sourceMappingURL=_server.ts-BC2Ad0Tq.js.map
