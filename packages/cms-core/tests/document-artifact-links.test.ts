import { describe, expect, it } from 'vitest';
import { linkBareDocumentUrls } from '../src/lib/ai/document-artifact-links';

describe('linkBareDocumentUrls', () => {
	it('turns a bare document route into a labeled Markdown artifact link', () => {
		expect(
			linkBareDocumentUrls(
				'Find it here: /admin?docType=blog_post&docId=93e9db30-4242-4276-b77f-8328af7d6887'
			)
		).toBe(
			'Find it here: [Blog Post](/admin?docType=blog_post&docId=93e9db30-4242-4276-b77f-8328af7d6887)'
		);
	});

	it('does not wrap a Markdown document link a second time', () => {
		const markdown =
			'[Agumon incident](/admin?docType=post&docId=93e9db30-4242-4276-b77f-8328af7d6887)';
		expect(linkBareDocumentUrls(markdown)).toBe(markdown);
	});

	it('does not turn arbitrary URLs into document artifacts', () => {
		const markdown = 'See https://example.com/admin?docType=post&docId=not-local';
		expect(linkBareDocumentUrls(markdown)).toBe(markdown);
	});
});
