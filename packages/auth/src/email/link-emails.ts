import type { AuthEmailTemplate } from '../types.js';

/** The name is interpolated into HTML, and a user controls it. */
function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

/** A plain, dependency-free email carrying one link. Apps that care supply their own. */
function linkEmail(
	subject: string,
	intro: string,
	action: string,
	note: string
): AuthEmailTemplate {
	return {
		subject,
		render: async (userName, url) => ({
			text: [`Hi ${userName},`, '', intro, '', url, '', note].join('\n'),
			html: `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#374151;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <h1 style="margin:0 0 16px;font-size:24px;color:#1f2937;">${escapeHtml(subject)}</h1>
      <p style="margin:0 0 16px;font-size:16px;">Hi ${escapeHtml(userName)},</p>
      <p style="margin:0 0 24px;font-size:16px;">${escapeHtml(intro)}</p>
      <p style="margin:0 0 24px;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 20px;background:#1f2937;border-radius:8px;color:#ffffff;text-decoration:none;font-size:16px;">${escapeHtml(action)}</a></p>
      <p style="margin:0;font-size:14px;color:#6b7280;">${escapeHtml(note)}</p>
    </div>
  </body>
</html>`
		})
	};
}

export const defaultPasswordReset = linkEmail(
	'Reset your password',
	'Follow this link to choose a new password.',
	'Reset password',
	"If you didn't ask for this, you can ignore this email. Your password won't change."
);

export const defaultEmailVerification = linkEmail(
	'Confirm your email address',
	'Follow this link to confirm your email address.',
	'Confirm email',
	"If you didn't create an account, you can ignore this email."
);
