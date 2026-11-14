/** Anything interpolated here may be user-controlled, such as a name or organization. */
function escapeHtml(value: string): string {
	return value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

export interface LinkEmailContent {
	subject: string;
	/** Optional opening line, such as `Hi Sam,`. */
	greeting?: string;
	intro: string;
	action: string;
	url: string;
	note: string;
}

/** A plain, dependency-free email carrying one link. Apps that care supply their own. */
export function renderLinkEmail({
	subject,
	greeting,
	intro,
	action,
	url,
	note
}: LinkEmailContent): {
	html: string;
	text: string;
} {
	const opening = greeting
		? `<p style="margin:0 0 16px;font-size:16px;">${escapeHtml(greeting)}</p>`
		: '';
	return {
		text: [...(greeting ? [greeting, ''] : []), intro, '', url, '', note].join('\n'),
		html: `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#374151;">
    <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <h1 style="margin:0 0 16px;font-size:24px;color:#1f2937;">${escapeHtml(subject)}</h1>
      ${opening}
      <p style="margin:0 0 24px;font-size:16px;">${escapeHtml(intro)}</p>
      <p style="margin:0 0 24px;"><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 20px;background:#1f2937;border-radius:8px;color:#ffffff;text-decoration:none;font-size:16px;">${escapeHtml(action)}</a></p>
      <p style="margin:0;font-size:14px;color:#6b7280;">${escapeHtml(note)}</p>
    </div>
  </body>
</html>`
	};
}
