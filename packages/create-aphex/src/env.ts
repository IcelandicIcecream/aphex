import { randomBytes } from 'crypto';

/**
 * Names the app accepts for the session-signing secret. `AUTH_SECRET` is the
 * current one; `BETTER_AUTH_SECRET` is still read for backwards compatibility and
 * is what older published templates ship, so a scaffold has to handle whichever
 * the fetched template happens to use — `create-aphex` downloads the template
 * from its own repo at run time, so the two versions are independent.
 */
const AUTH_SECRET_KEYS = ['AUTH_SECRET', 'BETTER_AUTH_SECRET'] as const;

/**
 * Values that mean "nobody has set this yet" — empty, or one of the placeholder
 * strings the templates ship. Anything else is left alone: a real value sitting
 * in an example file is not ours to overwrite.
 */
function isUnsetSecret(value: string): boolean {
	const trimmed = value.trim().replace(/^["']|["']$/g, '');
	if (trimmed === '') return true;
	return /change[-_ ]?(in[-_ ]?production|me)|your[-_ ]?secret|secret[-_ ]?key[-_ ]?here/i.test(
		trimmed
	);
}

/**
 * Replace unset auth-secret values in a `.env` body with a freshly generated one.
 *
 * Lives in its own module rather than `index.ts` because that file runs the CLI
 * on import — a test importing the helper from there would launch the prompt.
 */
export function withGeneratedAuthSecret(envBody: string): string {
	let result = envBody;
	for (const key of AUTH_SECRET_KEYS) {
		result = result.replace(
			new RegExp(`^(${key}=)(.*)$`, 'gm'),
			(line, prefix: string, value: string) =>
				isUnsetSecret(value) ? `${prefix}${randomBytes(32).toString('base64url')}` : line
		);
	}
	return result;
}
