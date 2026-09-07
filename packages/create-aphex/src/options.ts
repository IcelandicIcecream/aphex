import { readFileSync } from 'node:fs';

const packageVersion = JSON.parse(
	readFileSync(new URL('../package.json', import.meta.url), 'utf8')
) as { version: string };
const templateTag = `create-aphex-v${packageVersion.version}`;

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

export interface CliOptions {
	projectName?: string;
	template?: TemplateName;
	help: boolean;
}

export function parseArgs(args: string[]): CliOptions {
	const options: CliOptions = { help: false };

	for (let index = 0; index < args.length; index += 1) {
		const argument = args[index];

		if (argument === '--help' || argument === '-h') {
			options.help = true;
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
