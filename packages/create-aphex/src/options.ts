import { readFileSync } from 'node:fs';

const packageVersion = JSON.parse(
	readFileSync(new URL('../package.json', import.meta.url), 'utf8')
) as { version: string };
const templateTag = `create-aphex-v${packageVersion.version}`;

/**
 * The npm dist-tag this create-aphex was published under: `latest`, or for a snapshot
 * like `0.4.0-next.20261109080555` the prerelease name (`next`). Init and upgrade install
 * the `@aphexcms/*` packages from the same tag, so `create-aphex@next` sets an app up on
 * the `next` packages rather than mixing in `latest` ones.
 */
export const releaseTag = /^\d+\.\d+\.\d+-([a-z]+)/.exec(packageVersion.version)?.[1] ?? 'latest';

export const templates = {
	base: {
		label: 'Base',
		description: 'Minimal starter for building your own content model',
		source: `github:IcelandicIcecream/aphex-base#${templateTag}`
	},
	website: {
		label: 'Website',
		description: 'Page builder, blog, navigation, and SEO',
		source: `github:IcelandicIcecream/aphex-website#${templateTag}`
	}
} as const;

export type TemplateName = keyof typeof templates;

const databases = ['sqlite', 'postgres'] as const;
const storages = ['local', 's3'] as const;
const emails = ['none', 'resend'] as const;

/** Flags for adding Aphex to an existing app. */
export interface InitOptions {
	database?: (typeof databases)[number];
	storage?: (typeof storages)[number];
	email?: (typeof emails)[number];
	/** Take the defaults for anything not given, and don't ask to confirm. */
	yes: boolean;
	dryRun: boolean;
	install: boolean;
}

export interface CliOptions extends InitOptions {
	projectName?: string;
	template?: TemplateName;
	help: boolean;
}

function oneOf<T extends string>(
	flag: string,
	value: string | undefined,
	allowed: readonly T[]
): T {
	const match = allowed.find((option) => option === value);
	if (match) return match;
	throw new Error(`${flag} must be one of: ${allowed.join(', ')}`);
}

export function parseArgs(args: string[]): CliOptions {
	const options: CliOptions = { help: false, yes: false, dryRun: false, install: true };

	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index];
		const [flag, inline] = argument.startsWith('--')
			? argument.split(/=(.*)/s, 2)
			: [argument, undefined];
		const value = () => {
			if (inline !== undefined) return inline;
			index += 1;
			return args[index];
		};

		if (argument === '--help' || argument === '-h') {
			options.help = true;
			continue;
		}
		if (argument === '--yes' || argument === '-y') {
			options.yes = true;
			continue;
		}
		if (argument === '--dry-run') {
			options.dryRun = true;
			continue;
		}
		if (argument === '--no-install') {
			options.install = false;
			continue;
		}
		if (flag === '--db') {
			options.database = oneOf('--db', value(), databases);
			continue;
		}
		if (flag === '--storage') {
			options.storage = oneOf('--storage', value(), storages);
			continue;
		}
		if (flag === '--email') {
			options.email = oneOf('--email', value(), emails);
			continue;
		}

		if (argument === '--template' || argument === '-t') {
			const value = args[index + 1];
			if (!value || value.startsWith('-')) throw new Error(`${argument} requires a template name`);
			options.template = parseTemplate(value);
			index += 1;
			continue;
		}

		if (argument.startsWith('--template=')) {
			options.template = parseTemplate(argument.slice('--template='.length));
			continue;
		}

		if (argument.startsWith('-')) throw new Error(`Unknown option: ${argument}`);
		if (options.projectName) throw new Error(`Unexpected argument: ${argument}`);
		options.projectName = argument;
	}

	return options;
}

function parseTemplate(value: string): TemplateName {
	if (value in templates) return value as TemplateName;
	throw new Error(
		`Unknown template "${value}". Available templates: ${Object.keys(templates).join(', ')}`
	);
}
