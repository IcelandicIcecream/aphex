export interface EmailAddress {
	email: string;
	name?: string;
}

export interface SendEmailOptions {
	from: string;
	to: string | string[];
	subject: string;
	html?: string;
	text?: string;
	cc?: string | string[];
	bcc?: string | string[];
	replyTo?: string;
	tags?: Array<{ name: string; value: string }>;
	attachments?: Array<{
		filename: string;
		content: Buffer | string;
	}>;
}

export interface SendEmailResult {
	id: string;
	error?: string;
}

export interface EmailAdapter {
	readonly name: string;

	/** The sender used when a template doesn't name one, such as `My App <hi@example.com>`. */
	readonly defaultFrom?: string;

	send(options: SendEmailOptions): Promise<SendEmailResult>;

	sendBatch?(emails: SendEmailOptions[]): Promise<SendEmailResult[]>;
}

export interface EmailProvider {
	name: string;
	createAdapter(config: EmailConfig): EmailAdapter;
}

export interface EmailConfig {
	apiKey?: string;
	options?: {
		[key: string]: any;
	};
}
