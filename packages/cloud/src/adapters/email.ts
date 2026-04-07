import type { EmailAdapter, SendEmailOptions, SendEmailResult } from '@aphexcms/cms-core/server';
import type { CloudCredentials } from '../client.js';

/**
 * Cloud-managed email adapter.
 *
 * Sends emails via the Aphex Cloud email relay, which handles deliverability,
 * DKIM signing, and bounce tracking per project.
 */
export class CloudEmailAdapter implements EmailAdapter {
	readonly name = 'aphex-cloud';
	private apiEndpoint: string;
	private apiKey: string;
	private defaultFrom: string;

	constructor(credentials: CloudCredentials['email']) {
		this.apiEndpoint = credentials.apiEndpoint;
		this.apiKey = credentials.apiKey;
		this.defaultFrom = credentials.from;
	}

	async send(options: SendEmailOptions): Promise<SendEmailResult> {
		const response = await fetch(`${this.apiEndpoint}/send`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				from: options.from || this.defaultFrom,
				to: options.to,
				subject: options.subject,
				html: options.html,
				text: options.text,
				cc: options.cc,
				bcc: options.bcc,
				replyTo: options.replyTo,
				tags: options.tags
			})
		});

		if (!response.ok) {
			const body = await response.text().catch(() => '');
			return { id: '', error: `Cloud email send failed (${response.status}): ${body}` };
		}

		const result = (await response.json()) as { id: string };
		return { id: result.id };
	}

	async sendBatch(emails: SendEmailOptions[]): Promise<SendEmailResult[]> {
		const response = await fetch(`${this.apiEndpoint}/send/batch`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${this.apiKey}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				emails: emails.map((e) => ({
					from: e.from || this.defaultFrom,
					to: e.to,
					subject: e.subject,
					html: e.html,
					text: e.text,
					cc: e.cc,
					bcc: e.bcc,
					replyTo: e.replyTo,
					tags: e.tags
				}))
			})
		});

		if (!response.ok) {
			const body = await response.text().catch(() => '');
			return emails.map(() => ({
				id: '',
				error: `Cloud email batch send failed (${response.status}): ${body}`
			}));
		}

		return (await response.json()) as SendEmailResult[];
	}
}

/**
 * Create an EmailAdapter from cloud-provisioned credentials.
 */
export function createCloudEmailAdapter(
	credentials: CloudCredentials['email']
): EmailAdapter {
	return new CloudEmailAdapter(credentials);
}
