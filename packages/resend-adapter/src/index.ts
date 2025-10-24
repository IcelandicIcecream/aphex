import { Resend } from 'resend';
import type {
	EmailAdapter,
	SendEmailOptions,
	SendEmailResult,
	EmailConfig
} from '@aphex/cms-core/email';

export interface ResendConfig extends EmailConfig {
	apiKey: string;
}

export class ResendAdapter implements EmailAdapter {
	readonly name = 'resend';
	private resend: Resend;

	constructor(config: ResendConfig) {
		if (!config.apiKey) {
			throw new Error('Resend API key is required');
		}
		this.resend = new Resend(config.apiKey);
	}

	async send(options: SendEmailOptions): Promise<SendEmailResult> {
		try {
			const { data, error } = await this.resend.emails.send({
				from: options.from,
				to: Array.isArray(options.to) ? options.to : [options.to],
				subject: options.subject,
				html: options.html,
				text: options.text,
				cc: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined,
				bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : undefined,
				reply_to: options.replyTo,
				tags: options.tags,
				attachments: options.attachments
			});

			if (error) {
				return {
					id: '',
					error: error.message
				};
			}

			return {
				id: data?.id || '',
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
		try {
			const { data, error } = await this.resend.batch.send(
				emails.map((email) => ({
					from: email.from,
					to: Array.isArray(email.to) ? email.to : [email.to],
					subject: email.subject,
					html: email.html,
					text: email.text,
					cc: email.cc ? (Array.isArray(email.cc) ? email.cc : [email.cc]) : undefined,
					bcc: email.bcc ? (Array.isArray(email.bcc) ? email.bcc : [email.bcc]) : undefined,
					reply_to: email.replyTo,
					tags: email.tags,
					attachments: email.attachments
				}))
			);

			if (error) {
				return emails.map(() => ({
					id: '',
					error: error.message
				}));
			}

			return (
				data?.data?.map((result) => ({
					id: result.id || '',
					error: undefined
				})) || []
			);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			return emails.map(() => ({
				id: '',
				error: errorMessage
			}));
		}
	}
}

export function createResendAdapter(config: ResendConfig): EmailAdapter {
	return new ResendAdapter(config);
}
