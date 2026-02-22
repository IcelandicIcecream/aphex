import { type CreateEmailOptions, Resend } from 'resend';
import type {
	EmailAdapter,
	SendEmailOptions,
	SendEmailResult,
	EmailConfig
} from '@aphexcms/cms-core/server';

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
			const emailOptions: CreateEmailOptions = {
				from: options.from,
				to: Array.isArray(options.to) ? options.to : [options.to],
				subject: options.subject,
				html: options.html || '',
				...(options.text && { text: options.text }),
				...(options.cc && { cc: Array.isArray(options.cc) ? options.cc : [options.cc] }),
				...(options.bcc && { bcc: Array.isArray(options.bcc) ? options.bcc : [options.bcc] }),
				...(options.replyTo && { replyTo: options.replyTo }),
				...(options.tags && { tags: options.tags }),
				...(options.attachments && { attachments: options.attachments })
			};

			const { data, error } = await this.resend.emails.send(emailOptions);

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
				emails.map((email) => {
					const batchEmail: CreateEmailOptions = {
						from: email.from,
						to: Array.isArray(email.to) ? email.to : [email.to],
						subject: email.subject,
						html: email.html || '',
						...(email.text && { text: email.text }),
						...(email.cc && { cc: Array.isArray(email.cc) ? email.cc : [email.cc] }),
						...(email.bcc && { bcc: Array.isArray(email.bcc) ? email.bcc : [email.bcc] }),
						...(email.replyTo && { replyTo: email.replyTo }),
						...(email.tags && { tags: email.tags }),
						...(email.attachments && { attachments: email.attachments })
					};
					return batchEmail;
				})
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
