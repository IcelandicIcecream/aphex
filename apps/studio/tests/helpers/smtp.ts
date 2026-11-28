// A mail server for tests: takes real SMTP on a free port and keeps what arrives, so
// a test sees the message a person would, not the object handed to a mock.
import net from 'node:net';

export interface ReceivedMail {
	recipients: string[];
	headers: Record<string, string>;
	/** The decoded text of each part, by content type. */
	parts: Record<string, string>;
}

function parseHeaders(head: string): Record<string, string> {
	const headers: Record<string, string> = {};
	for (const line of head.replace(/\r\n[ \t]+/g, ' ').split('\r\n')) {
		const colon = line.indexOf(':');
		if (colon > 0) headers[line.slice(0, colon).toLowerCase()] = line.slice(colon + 1).trim();
	}
	return headers;
}

function decodeBody(body: string, encoding = ''): string {
	if (/base64/i.test(encoding)) return Buffer.from(body, 'base64').toString('utf8');
	if (!/quoted-printable/i.test(encoding)) return body;
	const bytes = body
		.replace(/=\r\n/g, '')
		.replace(/=([0-9A-F]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
	return Buffer.from(bytes, 'latin1').toString('utf8');
}

function parse(raw: string): Pick<ReceivedMail, 'headers' | 'parts'> {
	const split = raw.indexOf('\r\n\r\n');
	const headers = parseHeaders(raw.slice(0, split));
	const body = raw.slice(split + 4);
	const type = headers['content-type'] ?? 'text/plain';
	const boundary = /boundary="?([^";]+)"?/i.exec(type)?.[1];
	if (!boundary) {
		const text = decodeBody(body, headers['content-transfer-encoding']);
		return { headers, parts: { [(type.split(';')[0] ?? '').trim()]: text } };
	}
	const parts: Record<string, string> = {};
	for (const piece of body.split(`--${boundary}`).slice(1, -1)) {
		Object.assign(parts, parse(piece.replace(/^\r\n/, '')).parts);
	}
	return { headers, parts };
}

/** `refuse`: how many messages to turn away first, as an overloaded server does. */
export async function startMailServer(options: { refuse?: number } = {}) {
	const received: ReceivedMail[] = [];
	let refusals = options.refuse ?? 0;
	const server = net.createServer((socket) => {
		let pending = '';
		let message: string | null = null;
		let recipients: string[] = [];
		socket.setEncoding('latin1');
		socket.on('error', () => {});
		socket.write('220 test\r\n');
		socket.on('data', (chunk: string) => {
			pending += chunk;
			for (;;) {
				if (message !== null) {
					const end = pending.indexOf('\r\n.\r\n');
					if (end === -1) return;
					received.push({
						recipients,
						...parse(pending.slice(0, end).replace(/\r\n\.\./g, '\r\n.'))
					});
					pending = pending.slice(end + 5);
					message = null;
					recipients = [];
					socket.write('250 ok\r\n');
					continue;
				}
				const newline = pending.indexOf('\r\n');
				if (newline === -1) return;
				const line = pending.slice(0, newline);
				pending = pending.slice(newline + 2);
				const to = /^RCPT TO:<([^>]+)>/i.exec(line)?.[1];
				if (to) recipients.push(to);
				if (/^DATA/i.test(line)) {
					if (refusals > 0) {
						refusals--;
						socket.write('451 try later\r\n');
						continue;
					}
					message = '';
					// So the first line of an empty message still ends the way `end` looks for.
					socket.write('354 go\r\n');
				} else if (/^QUIT/i.test(line)) socket.end('221 bye\r\n');
				else socket.write('250 ok\r\n');
			}
		});
	});
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	const address = server.address();
	if (!address || typeof address === 'string') throw new Error('No port');
	return {
		port: address.port,
		received,
		close: () => new Promise<void>((resolve) => server.close(() => resolve()))
	};
}
