#!/usr/bin/env node

import * as p from '@clack/prompts';
import { existsSync, mkdirSync, cpSync, readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import pc from 'picocolors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Options {
	projectName: string;
	template: string;
	targetDir: string;
}

const templates = ['base'] as const;
type Template = (typeof templates)[number];

async function main() {
	console.clear();

	p.intro(pc.bgCyan(pc.black(' create-aphex ')));

	const options: Options = {
		projectName: '',
		template: 'base',
		targetDir: ''
	};

	// Get project name
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

	// Check if directory already exists
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

	// Select template
	const template = await p.select({
		message: 'Which template would you like to use?',
		options: [
			{
				value: 'base',
				label: 'Base',
				hint: 'Full-featured Aphex CMS with authentication and organizations'
			}
		]
	});

	if (p.isCancel(template)) {
		p.cancel('Operation cancelled');
		process.exit(0);
	}

	options.template = template as Template;

	// Start scaffolding
	const spinner = p.spinner();
	spinner.start('Creating your Aphex project...');

	try {
		// Find the templates directory
		// When running from npx, we need to look in the right place
		const templatesDir = findTemplatesDir();

		if (!templatesDir) {
			throw new Error('Could not find templates directory');
		}

		const templatePath = join(templatesDir, options.template);

		if (!existsSync(templatePath)) {
			throw new Error(`Template "${options.template}" not found`);
		}

		// Create target directory
		mkdirSync(options.targetDir, { recursive: true });

		// Copy template files
		cpSync(templatePath, options.targetDir, { recursive: true });

		// Update package.json with project name
		const packageJsonPath = join(options.targetDir, 'package.json');
		if (existsSync(packageJsonPath)) {
			const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
			packageJson.name = options.projectName;
			writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, '\t') + '\n');
		}

		// Create .env file if it doesn't exist
		const envPath = join(options.targetDir, '.env');
		if (!existsSync(envPath)) {
			const envExample = `# Database
DATABASE_URL=postgresql://user:password@localhost:5432/aphex

# Better Auth
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:5173

# Email (Resend)
RESEND_API_KEY=your-resend-api-key

# Storage (S3)
S3_BUCKET_NAME=your-bucket-name
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
S3_ENDPOINT=https://s3.amazonaws.com

# Admin user (for first setup)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=changeme
`;
			writeFileSync(envPath, envExample);
		}

		spinner.stop('Project created successfully!');

		// Show next steps
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

function findTemplatesDir(): string | null {
	// Try different possible locations for the templates directory
	const possiblePaths = [
		// When installed via npm/npx (templates are bundled in package)
		resolve(__dirname, '../templates'),
		// When running from built dist in package
		resolve(__dirname, '../../templates'),
		// When running from source in monorepo
		resolve(__dirname, '../../../templates')
	];

	for (const path of possiblePaths) {
		if (existsSync(path)) {
			return path;
		}
	}

	return null;
}

main().catch((error) => {
	console.error('Error:', error);
	process.exit(1);
});
