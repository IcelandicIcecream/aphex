import { betterAuth } from 'better-auth';
import { apiKey } from 'better-auth/plugins';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { createAuthMiddleware } from 'better-auth/api';
import { createResendAdapter } from '@aphexcms/resend-adapter';

const BETTER_AUTH_SECRET = "your-secret-key-here-change-in-production";
const BETTER_AUTH_URL = "http://localhost:5173";
const RESEND_API_KEY = "re_your_api_key_here";
const email = createResendAdapter({
  apiKey: RESEND_API_KEY
});
const emailConfig = {
  from: "Support @ Aphex CMS <support@newsletter.getaphex.com>",
  passwordReset: {
    subject: "Reset your password",
    getHtml: (userName, resetUrl) => `
			<h1>Password Reset</h1>
			<p>Hi ${userName},</p>
			<p>You requested to reset your password. Click the link below to reset it:</p>
			<p><a href="${resetUrl}">Reset Password</a></p>
			<p>If you didn't request this, you can safely ignore this email.</p>
			<p>This link will expire in 1 hour.</p>
		`,
    getText: (resetUrl) => `Reset your password by clicking this link: ${resetUrl}`
  },
  emailVerification: {
    subject: "Verify your email address",
    getHtml: (userName, verifyUrl) => `
			<h1>Email Verification</h1>
			<p>Hi ${userName},</p>
			<p>Welcome to Aphex CMS! Please verify your email address by clicking the link below:</p>
			<p><a href="${verifyUrl}">Verify Email</a></p>
			<p>If you didn't create this account, you can safely ignore this email.</p>
		`,
    getText: (verifyUrl) => `Verify your email by clicking this link: ${verifyUrl}`
  }
};
let latestPasswordResetUrl = null;
function createAuthInstance(db, drizzleDb, emailAdapter) {
  const userSyncHooks = createAuthMiddleware(async (ctx) => {
    if (ctx.path === "/sign-up/email" && ctx.context.user) {
      try {
        await db.createUserProfile({
          userId: ctx.context.user.id,
          role: "editor"
          // Default role
        });
        console.log(`[Better Auth Hook]: Created user profile for ${ctx.context.user.id}`);
      } catch (error) {
        console.error("[Better Auth Hook]: Error creating user profile:", error);
      }
    }
    if (ctx.path === "/user/delete-user" && ctx.context.user) {
      console.log(`[Auth Hook]: Deletion condition met for user: ${ctx.context.user.id}`);
      try {
        await db.deleteUserProfile(ctx.context.user.id);
        console.log(`[Auth Hook]: Successfully deleted user profile for ${ctx.context.user.id}`);
      } catch (error) {
        console.error("[Auth Hook]: Error deleting user profile:", error);
      }
    }
  });
  return betterAuth({
    baseURL: BETTER_AUTH_URL,
    secret: BETTER_AUTH_SECRET,
    // Better Auth's internal adapter needs the raw Drizzle client.
    database: drizzleAdapter(drizzleDb, {
      provider: "pg"
    }),
    emailAndPassword: {
      enabled: true,
      sendResetPassword: async ({ user, url, token }) => {
        const baseUrl = BETTER_AUTH_URL;
        const resetUrl = `${baseUrl}/reset-password/${token}`;
        console.log("\n========================================");
        console.log("🔐 PASSWORD RESET REQUEST");
        console.log("========================================");
        console.log("User:", user.email);
        console.log("Better Auth URL:", url);
        console.log("Constructed Reset URL:", resetUrl);
        console.log("Token:", token);
        console.log("========================================\n");
        latestPasswordResetUrl = resetUrl;
        if (emailAdapter) {
          try {
            const result = await emailAdapter.send({
              from: emailConfig.from,
              to: user.email,
              subject: emailConfig.passwordReset.subject,
              html: emailConfig.passwordReset.getHtml(user.name || user.email, resetUrl),
              text: emailConfig.passwordReset.getText(resetUrl)
            });
            if (result.error) {
              console.error("Failed to send password reset email:", result.error);
            } else {
              console.log("Password reset email sent successfully:", result.id);
            }
          } catch (error) {
            console.error("Error sending password reset email:", error);
          }
        } else {
          console.warn("Email adapter not configured. Password reset email not sent.");
        }
      }
    },
    emailVerification: {
      enabled: false,
      verifyEmailPath: "/verify-email",
      // Path for email verification
      sendVerificationEmail: async ({ user, url, token }) => {
        console.log("\n========================================");
        console.log("📧 EMAIL VERIFICATION REQUEST");
        console.log("========================================");
        console.log("User:", user.email);
        console.log("Verification URL:", url);
        console.log("Token:", token);
        console.log("========================================\n");
        if (emailAdapter) {
          try {
            const result = await emailAdapter.send({
              from: emailConfig.from,
              to: user.email,
              subject: emailConfig.emailVerification.subject,
              html: emailConfig.emailVerification.getHtml(user.name || user.email, url),
              text: emailConfig.emailVerification.getText(url)
            });
            if (result.error) {
              console.error("Failed to send verification email:", result.error);
            } else {
              console.log("Verification email sent successfully:", result.id);
            }
          } catch (error) {
            console.error("Error sending verification email:", error);
          }
        } else {
          console.warn("Email adapter not configured. Verification email not sent.");
        }
      }
    },
    plugins: [
      apiKey({
        apiKeyHeaders: ["x-api-key"],
        rateLimit: {
          enabled: true,
          timeWindow: 1e3 * 60 * 60 * 24,
          maxRequests: 1e4
        },
        enableMetadata: true
      })
    ],
    hooks: {
      after: userSyncHooks
    }
  });
}

export { createAuthInstance as c, email as e, latestPasswordResetUrl as l };
//# sourceMappingURL=instance2-stPrjck3.js.map
