import { createTransport, type Transporter } from 'nodemailer';
import type {
	EmailAdapter,
	SendEmailOptions,
	SendEmailResult,
	EmailConfig
} from '@aphexcms/cms-core/server';

export interface NodemailerConfig extends EmailConfig {
	host: string;
	port: number;
	secure?: boolean;
	auth?: {
		user: string;
		pass: string;
	};
}

export class NodemailerAdapter implements EmailAdapter {
	readonly name = 'nodemailer';
	private transporter: Transporter;

	constructor(config: NodemailerConfig) {
		if (!config.host) {
			throw new Error('SMTP host is required');
		}
		this.transporter = createTransport({
			host: config.host,
			port: config.port,
			secure: config.secure ?? config.port === 465,
			...(config.auth && {
				auth: {
					user: config.auth.user,
					pass: config.auth.pass
				}
			})
		});
	}

	async send(options: SendEmailOptions): Promise<SendEmailResult> {
		try {
			const info = await this.transporter.sendMail({
				from: options.from,
				to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
				subject: options.subject,
				html: options.html || '',
				...(options.text && { text: options.text }),
				...(options.cc && {
					cc: Array.isArray(options.cc) ? options.cc.join(', ') : options.cc
				}),
				...(options.bcc && {
					bcc: Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc
				}),
				...(options.replyTo && { replyTo: options.replyTo }),
				...(options.attachments && {
					attachments: options.attachments.map((a) => ({
						filename: a.filename,
						content: a.content
					}))
				})
			});

			return {
				id: info.messageId || '',
				error: undefined
			};
		} catch (error) {
			return {
				id: '',
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	async sendBatch(emails: SendEmailOptions[]): Promise<SendEmailResult[]> {
		return Promise.all(emails.map((email) => this.send(email)));
	}
}

export function createNodemailerAdapter(config: NodemailerConfig): EmailAdapter {
	return new NodemailerAdapter(config);
}

/**
 * Shorthand for creating a Mailpit adapter for local development.
 * Defaults to localhost:1025 (Mailpit's SMTP port).
 */
export function createMailpitAdapter(
	overrides?: Partial<NodemailerConfig>
): EmailAdapter {
	return new NodemailerAdapter({
		host: 'localhost',
		port: 1025,
		secure: false,
		...overrides
	});
}
