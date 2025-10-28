# @aphex/resend-adapter

Resend email adapter for Aphex CMS.

## Installation

```bash
pnpm add @aphexcms/resend-adapter resend
```

## Usage

### Basic Setup

```typescript
// src/lib/server/email/index.ts
import { createResendAdapter } from '@aphexcms/resend-adapter';
import { RESEND_API_KEY } from '$env/static/private';

export const emailAdapter = createResendAdapter({
	apiKey: RESEND_API_KEY
});
```

### Environment Variables

Add to your `.env` file:

```bash
RESEND_API_KEY=re_your_api_key_here
```

### Sending Emails

```typescript
import { emailAdapter } from '$lib/server/email';

// Send a single email
const result = await emailAdapter.send({
	from: 'Acme <onboarding@resend.dev>',
	to: 'user@example.com',
	subject: 'Hello World',
	html: '<p>Hello from Aphex CMS!</p>'
});

if (result.error) {
	console.error('Failed to send email:', result.error);
} else {
	console.log('Email sent successfully:', result.id);
}
```

### Batch Sending

```typescript
const results = await emailAdapter.sendBatch([
	{
		from: 'Acme <onboarding@resend.dev>',
		to: 'user1@example.com',
		subject: 'Welcome',
		html: '<p>Welcome user 1!</p>'
	},
	{
		from: 'Acme <onboarding@resend.dev>',
		to: 'user2@example.com',
		subject: 'Welcome',
		html: '<p>Welcome user 2!</p>'
	}
]);
```

### Advanced Options

```typescript
await emailAdapter.send({
	from: 'Acme <onboarding@resend.dev>',
	to: ['user1@example.com', 'user2@example.com'],
	cc: 'manager@example.com',
	bcc: 'archive@example.com',
	replyTo: 'support@example.com',
	subject: 'Newsletter',
	html: '<h1>Monthly Update</h1>',
	text: 'Monthly Update',
	tags: [
		{ name: 'category', value: 'newsletter' },
		{ name: 'month', value: 'january' }
	],
	attachments: [
		{
			filename: 'invoice.pdf',
			content: pdfBuffer
		}
	]
});
```

## API Reference

### `createResendAdapter(config)`

Creates a new Resend email adapter instance.

**Config:**

- `apiKey` (required): Your Resend API key

**Returns:** `EmailAdapter`

### `EmailAdapter.send(options)`

Sends a single email.

**Options:**

- `from` (required): Sender email address
- `to` (required): Recipient email(s)
- `subject` (required): Email subject
- `html`: HTML content
- `text`: Plain text content
- `cc`: CC recipients
- `bcc`: BCC recipients
- `replyTo`: Reply-to address
- `tags`: Array of tags for tracking
- `attachments`: Array of file attachments

**Returns:** `Promise<SendEmailResult>`

### `EmailAdapter.sendBatch(emails)`

Sends multiple emails in a batch.

**Parameters:**

- `emails`: Array of `SendEmailOptions`

**Returns:** `Promise<SendEmailResult[]>`

## Learn More

- [Resend Documentation](https://resend.com/docs)
- [Aphex CMS Documentation](../../README.md)
