#!/usr/bin/env node

import * as p from '@clack/prompts';
import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'fs';
import { join, resolve } from 'path';
import pc from 'picocolors';
import { downloadTemplate } from 'giget';

interface Options {
	projectName: string;
	targetDir: string;
}

const TEMPLATE_REPO = process.env.APHEX_TEMPLATE || 'github:IcelandicIcecream/aphex-base';

async function main() {
	console.clear();

	p.intro(pc.bgCyan(pc.black(' create-aphex ')));

	const options: Options = {
		projectName: '',
		targetDir: ''
	};

	const projectName = await p.text({
		message: 'What is your project name?',
		placeholder: 'my-aphex-project',
		validate: (value) => {
			if (!value) return 'Project name is required';
			if (!/^[a-z0-9-]+$/.test(value)) {
				return 'Project name can only contain lowercase letters, numbers, and hyphens';
			}
		}
	});

	if (p.isCancel(projectName)) {
		p.cancel('Operation cancelled');
		process.exit(0);
	}

	options.projectName = projectName as string;
	options.targetDir = resolve(process.cwd(), options.projectName);

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

	const spinner = p.spinner();
	spinner.start(`Fetching template from ${TEMPLATE_REPO}...`);

	try {
		await downloadTemplate(TEMPLATE_REPO, {
			dir: options.targetDir,
			force: true
		});

		const packageJsonPath = join(options.targetDir, 'package.json');
		if (existsSync(packageJsonPath)) {
			const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
			packageJson.name = options.projectName;
			delete packageJson.private;
			writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, '\t') + '\n');
		}

		const envPath = join(options.targetDir, '.env');
		const envExamplePath = join(options.targetDir, '.env.example');
		if (!existsSync(envPath) && existsSync(envExamplePath)) {
			copyFileSync(envExamplePath, envPath);
		}

		spinner.stop('Project created successfully!');

		const nextSteps = [
			`cd ${options.projectName}`,
			'pnpm install',
			'pnpm db:start',
			'pnpm db:push',
			'pnpm dev'
		];

		p.note(nextSteps.join('\n'), 'Next steps');

		p.outro(
			pc.green('Your Aphex CMS project is ready! Check out the README.md for more information.')
		);
	} catch (error) {
		spinner.stop('Failed to create project');
		p.log.error(pc.red((error as Error).message));
		process.exit(1);
	}
}

main().catch((error) => {
	console.error('Error:', error);
	process.exit(1);
});
