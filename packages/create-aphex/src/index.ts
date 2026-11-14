#!/usr/bin/env node

import * as p from '@clack/prompts';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import pc from 'picocolors';
import { downloadTemplate } from 'giget';
import { parseArgs, releaseTag, templates, type TemplateName } from './options.js';
import { withGeneratedAuthSecret } from './env.js';
import { isSvelteKitApp, readPackageJson } from './init/detect.js';
import { runInit } from './init/run.js';
import { runUpgrade } from './upgrade/run.js';

/** Shown as the prompt's placeholder and used when the answer is left empty. */
const DEFAULT_PROJECT_NAME = 'my-aphex-project';

interface Options {
	projectName: string;
	targetDir: string;
	template: TemplateName;
}

async function main() {
	const cliOptions = parseArgs(process.argv.slice(2));
	if (cliOptions.help) {
		printHelp();
		return;
	}

	// Run inside a SvelteKit app with no project name, and this adds Aphex to that app
	// instead of creating a new one beside it.
	// An app that already has Aphex is upgraded to the embedded admin instead.
	if (!cliOptions.projectName && !cliOptions.template && isSvelteKitApp(process.cwd())) {
		const pkg = readPackageJson(process.cwd());
		const hasAphex = Boolean(
			pkg?.dependencies?.['@aphexcms/cms-core'] ?? pkg?.devDependencies?.['@aphexcms/cms-core']
		);
		if (!hasAphex) {
			await runInit(process.cwd(), cliOptions);
			return;
		}
		if (cliOptions.database || cliOptions.storage || cliOptions.email) {
			throw new Error(
				'This app already uses Aphex, so this upgrades it. --db, --storage and --email are only for adding Aphex.'
			);
		}
		await runUpgrade(process.cwd(), cliOptions);
		return;
	}
	if (cliOptions.database || cliOptions.storage || cliOptions.email || cliOptions.dryRun) {
		throw new Error(
			'--db, --storage, --email and --dry-run are for adding Aphex to an existing app. Run them inside a SvelteKit app, without a project name.'
		);
	}
	// Templates are tagged per stable release only, so a snapshot has none to fetch.
	if (releaseTag !== 'latest' && !process.env.APHEX_TEMPLATE) {
		throw new Error(
			`create-aphex@${releaseTag} adds Aphex to an existing app or upgrades one, but can't start a new project. For that, run \`pnpm create aphex@latest\`.`
		);
	}

	console.clear();

	p.intro(pc.bgCyan(pc.black(' create-aphex ')));

	const options: Options = {
		projectName: '',
		targetDir: '',
		template: cliOptions.template ?? 'base'
	};

	const projectName =
		cliOptions.projectName ??
		(await p.text({
			message: 'What is your project name?',
			placeholder: DEFAULT_PROJECT_NAME,
			// `placeholder` only greys out a hint; `defaultValue` is what an empty
			// submit actually resolves to. Both, or pressing enter on the suggestion
			// the prompt just showed you is an error.
			defaultValue: DEFAULT_PROJECT_NAME,
			// And `defaultValue` alone isn't enough: clack validates on enter and only
			// substitutes the default afterwards, so a validator that rejects "" fires
			// first and the default is never reached. Let empty through here — the
			// substituted value is checked below, along with the `--` argument path.
			validate: (value) => (value ? validateProjectName(value) : undefined)
		}));

	if (p.isCancel(projectName)) {
		p.cancel('Operation cancelled');
		process.exit(0);
	}

	options.projectName = projectName as string;
	options.targetDir = resolve(process.cwd(), options.projectName);

	const projectNameError = validateProjectName(options.projectName);
	if (projectNameError) throw new Error(projectNameError);

	if (!cliOptions.template && !process.env.APHEX_TEMPLATE) {
		const template = await p.select({
			message: 'Which template would you like?',
			options: Object.entries(templates).map(([value, template]) => ({
				value: value as TemplateName,
				label: template.label,
				hint: template.description
			}))
		});

		if (p.isCancel(template)) {
			p.cancel('Operation cancelled');
			process.exit(0);
		}

		options.template = template;
	}

	if (existsSync(options.targetDir)) {
		const shouldOverwrite = await p.confirm({
			message: `Directory ${pc.cyan(options.projectName)} already exists. Overwrite?`,
			initialValue: false
		});

		if (p.isCancel(shouldOverwrite) || !shouldOverwrite) {
			p.cancel('Operation cancelled');
			process.exit(0);
		}
	}

	const selectedTemplate = templates[options.template];
	const templateSource = process.env.APHEX_TEMPLATE || selectedTemplate.source;
	const spinner = p.spinner();
	spinner.start(`Fetching ${selectedTemplate.label} template...`);

	try {
		await downloadTemplate(templateSource, {
			dir: options.targetDir,
			force: true
		});

		const packageJsonPath = join(options.targetDir, 'package.json');
		if (existsSync(packageJsonPath)) {
			const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
			packageJson.name = options.projectName;
			// `private: true` stays. A scaffolded project is an application, not a
			// package to publish, and dropping the flag turns a stray `npm publish`
			// in the project root from a refusal into an upload. Nothing about local
			// development needs it gone.
			packageJson.private = true;
			writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, '\t') + '\n');
		}

		const envPath = join(options.targetDir, '.env');
		const envExamplePath = join(options.targetDir, '.env.example');
		if (!existsSync(envPath) && existsSync(envExamplePath)) {
			// Copy `.env.example`, then fill in the auth secret. The example ships it
			// unusable on purpose — empty in current templates, a
			// `your-secret-key-here-change-in-production` placeholder in older ones —
			// so a straight copy leaves the very first `pnpm dev` after scaffolding
			// failing on a missing secret, which is the worst possible moment for it.
			// Generating here is safe: the value is per-project, never leaves the
			// machine, and `.env` is gitignored.
			writeFileSync(envPath, withGeneratedAuthSecret(readFileSync(envExamplePath, 'utf-8')));
		}

		spinner.stop('Project created successfully!');

		const nextSteps = [
			`cd ${options.projectName}`,
			'pnpm install',
			'pnpm dev',
			'',
			pc.dim('Then open http://localhost:5173/admin — the first account you'),
			pc.dim('create becomes the super admin.')
		];

		p.note(nextSteps.join('\n'), 'Next steps');

		// The one thing that silently breaks a fresh project. `.env` pins AUTH_URL to
		// port 5173, but Vite moves to 5174 when 5173 is taken — and Better Auth
		// declines any request whose origin doesn't match, as a bare 404 from
		// /api/auth/* with nothing in the log. The symptom is "sign-up does nothing",
		// which is unguessable if you haven't been told. Cheap to say here; expensive
		// to discover.
		p.log.warn(
			`${pc.bold('If Vite starts on a port other than 5173')} (because it was taken), update\n` +
				`${pc.cyan('AUTH_URL')} and ${pc.cyan('AUTH_TRUSTED_ORIGINS')} in ${pc.cyan('.env')} to match, or sign-in\n` +
				`fails with a bare 404. Same when you deploy: set them to your real URL.`
		);

		p.outro(
			pc.green('Your Aphex CMS project is ready! Check out the README.md for more information.')
		);
	} catch (error) {
		spinner.stop('Failed to create project');
		p.log.error(pc.red((error as Error).message));
		process.exit(1);
	}
}

function validateProjectName(value: string | undefined): string | undefined {
	if (!value) return 'Project name is required';
	if (!/^[a-z0-9-]+$/.test(value)) {
		return 'Project name can only contain lowercase letters, numbers, and hyphens';
	}
}

function printHelp() {
	console.log(`create-aphex

Usage:
  create-aphex [project-name] [options]   Create a new app
  create-aphex [options]                  Inside a SvelteKit app: add Aphex to it,
                                          or upgrade an app that has it

New app:
  -t, --template <name>  Template to use: base or website

Existing app:
  --db <sqlite|postgres>     Database (default sqlite)
  --storage <local|s3>       Where uploads go (default local)
  --email <none|resend>      Email adapter (default none)
  -y, --yes                  Use the defaults for anything not given, and don't ask
  --dry-run                  Show the changes without making them
  --no-install               Write the files but don't install packages
  (--yes, --dry-run and --no-install also work when upgrading)

  -h, --help                 Show this help message

Examples:
  pnpm create aphex my-site
  pnpm create aphex my-site --template website
  pnpm create aphex                       (inside your SvelteKit app)
  pnpm create aphex --db postgres --storage s3 --dry-run`);
}

main().catch((error) => {
	console.error('Error:', error);
	process.exit(1);
});
