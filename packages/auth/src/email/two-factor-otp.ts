import type { AuthCodeEmailTemplate } from '../types.js';

/**
 * The built-in second-factor code email.
 *
 * Deliberately plain HTML with inline styles and no dependencies: this package
 * can't render an app's Svelte components, and a 2FA code needs to arrive
 * whether or not anyone has got around to branding it. Apps that care supply
 * `email.twoFactorOtp` and this is never used.
 *
 * No link and no button — a code you type back into a page you already have
 * open can't be phished by a lookalike URL, and putting one here would train
 * people to click their way through a security step.
 */
export const defaultTwoFactorOtpEmail: AuthCodeEmailTemplate = {
	subject: 'Your sign-in code',
	render: async (userName: string, code: string) => {
		const text = [
			`Hi ${userName},`,
			'',
			`Your sign-in code is: ${code}`,
			'',
			'It expires in a few minutes.',
			"If you didn't try to sign in, someone may have your password. Change it as soon as you can."
		].join('\n');

		const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#374151;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <h1 style="margin:0 0 16px;font-size:24px;color:#1f2937;">Your sign-in code</h1>
      <p style="margin:0 0 16px;font-size:16px;">Hi ${escapeHtml(userName)},</p>
      <p style="margin:0 0 24px;font-size:16px;">Enter this code to finish signing in:</p>
      <p style="margin:0 0 24px;padding:16px;background:#f3f4f6;border-radius:8px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:8px;color:#1f2937;">${escapeHtml(code)}</p>
      <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">This code expires in a few minutes.</p>
      <p style="margin:0;font-size:14px;color:#6b7280;">If you didn't try to sign in, someone may have your password. Change it as soon as you can.</p>
    </div>
  </body>
</html>`;

		return { html, text };
	}
};

/** The name is interpolated into HTML, and a user controls it. */
function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}
