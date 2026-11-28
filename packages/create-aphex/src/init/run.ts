import * as p from '@clack/prompts';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import pc from 'picocolors';
import type { InitOptions } from '../options.js';
import { detectApp, findBlockers, type PackageManager } from './detect.js';
import { buildPlan, type Plan } from './plan.js';
import type { Database, Email, InitChoices, Storage } from './templates.js';

function cancelled(): never {
	p.cancel('Nothing was changed.');
	process.exit(0);
}

async function choose<T extends string>(
	given: T | undefined,
	useDefault: boolean,
	fallback: T,
	message: string,
	options: Array<{ value: T; label: string; hint?: string }>
): Promise<T> {
	if (given) return given;
	if (useDefault) return fallback;
	// clack's option type is conditional on the value type, which a generic T can't
	// satisfy, so the prompt runs on plain strings and the answer is matched back.
	const answer = await p.select({
		message,
		initialValue: fallback as string,
		options: options.map((option) => ({
			value: option.value as string,
			label: option.label,
			hint: option.hint
		}))
	});
	if (p.isCancel(answer)) cancelled();
	const picked = options.find((option) => option.value === answer);
	return picked ? picked.value : fallback;
}

function addCommand(manager: PackageManager, packages: string[], dev: boolean): string[] {
	const verb = manager === 'npm' ? 'install' : 'add';
	return [manager, verb, ...(dev ? ['-D'] : []), ...packages];
}

function execCommand(manager: PackageManager, args: string[]): string[] {
	if (manager === 'npm') return ['npx', ...args];
	if (manager === 'bun') return ['bunx', ...args];
	return [manager, 'exec', ...args];
}

function run(cwd: string, command: string[]): boolean {
	const [bin, ...args] = command;
	const result = spawnSync(bin, args, {
		cwd,
		stdio: 'inherit',
		shell: process.platform === 'win32'
	});
	return result.status === 0;
}

function describePlan(plan: Plan): string {
	const label = {
		create: pc.green('create'),
		update: pc.yellow('update'),
		keep: pc.dim('keep  '),
		manual: pc.red('by hand')
	};
	return plan.changes
		.map((change) => {
			const detail = change.action === 'keep' ? pc.dim(` (${change.reason})`) : '';
			return `${label[change.action]}  ${change.path}${detail}`;
		})
		.join('\n');
}

export async function runInit(cwd: string, options: InitOptions): Promise<void> {
	p.intro(pc.bgCyan(pc.black(' create-aphex ')) + pc.dim('  adding Aphex to this app'));

	const app = detectApp(cwd);
	const blockers = findBlockers(app);
	if (blockers.length > 0) {
		for (const blocker of blockers) p.log.error(blocker);
		p.outro(pc.red('Nothing was changed.'));
		process.exit(1);
	}

	const choices: InitChoices = {
		database: await choose<Database>(options.database, options.yes, 'sqlite', 'Which database?', [
			{ value: 'sqlite', label: 'SQLite', hint: 'a file in .aphex/, nothing to set up' },
			{ value: 'postgres', label: 'Postgres', hint: 'needs a running server' }
		]),
		storage: await choose<Storage>(
			options.storage,
			options.yes,
			'local',
			'Where should uploads go?',
			[
				{ value: 'local', label: 'Local disk', hint: './storage, fine with a persistent disk' },
				{
					value: 's3',
					label: 'S3-compatible bucket',
					hint: 'R2, S3, MinIO. Needed on Vercel and similar'
				}
			]
		),
		email: await choose<Email>(options.email, options.yes, 'none', 'Send email?', [
			{ value: 'none', label: 'Not yet', hint: 'invitations give you a link to share' },
			{ value: 'resend', label: 'Resend', hint: 'invitations, password resets, two-factor codes' }
		])
	};

	const plan = buildPlan(app, choices, randomBytes(32).toString('base64url'));
	p.note(describePlan(plan), 'Changes');

	const installLines = [
		plan.dependencies.length > 0 &&
			addCommand(app.packageManager, plan.dependencies, false).join(' '),
		plan.devDependencies.length > 0 &&
			addCommand(app.packageManager, plan.devDependencies, true).join(' ')
	].filter((line): line is string => Boolean(line));
	if (installLines.length > 0) {
		p.note(
			installLines.join('\n'),
			options.install ? 'Then install' : 'Install these yourself (--no-install)'
		);
	}

	if (options.dryRun) {
		p.outro('Dry run: nothing was changed.');
		return;
	}

	if (!options.yes) {
		const go = await p.confirm({ message: 'Make these changes?', initialValue: true });
		if (p.isCancel(go) || !go) cancelled();
	}

	for (const change of plan.changes) {
		if (change.action !== 'create' && change.action !== 'update') continue;
		const full = join(cwd, change.path);
		mkdirSync(dirname(full), { recursive: true });
		writeFileSync(full, change.content);
	}
	p.log.success('Files written.');

	let installed = !options.install;
	if (options.install && installLines.length > 0) {
		installed =
			(plan.dependencies.length === 0 ||
				run(cwd, addCommand(app.packageManager, plan.dependencies, false))) &&
			(plan.devDependencies.length === 0 ||
				run(cwd, addCommand(app.packageManager, plan.devDependencies, true)));
		if (!installed) p.log.error('Installing failed. Run the commands above yourself.');
	} else if (options.install) {
		installed = true;
	}

	const nextSteps: string[] = [];
	if (choices.database === 'postgres') {
		const generate = execCommand(app.packageManager, ['drizzle-kit', 'generate']);
		if (options.install && installed && run(cwd, generate)) {
			p.log.success('Generated the Postgres migrations in drizzle/. Commit them.');
		} else {
			nextSteps.push(`${generate.join(' ')}   ${pc.dim('# then commit drizzle/')}`);
		}
		nextSteps.push(`Set DATABASE_URL in .env to your Postgres database.`);
	}
	if (choices.storage === 's3') nextSteps.push('Fill in the S3_ values in .env.');
	if (choices.email === 'resend') nextSteps.push('Fill in RESEND_API_KEY and EMAIL_FROM in .env.');
	nextSteps.push(
		`${app.packageManager === 'npm' ? 'npm run' : app.packageManager} dev`,
		'',
		pc.dim('Then open http://localhost:5173/admin. The first account you'),
		pc.dim('create owns the instance.')
	);

	const manual = plan.changes.filter((change) => change.action === 'manual');
	for (const change of manual) {
		if (change.action !== 'manual') continue;
		p.note(change.instructions, `Add to ${change.path} by hand`);
	}

	p.note(nextSteps.join('\n'), 'Next steps');
	p.log.warn(
		`${pc.bold('AUTH_URL')} in .env is http://localhost:5173. If Vite starts on another port, or once\n` +
			'you deploy, set it to the real address, or sign-in fails with a bare 404.'
	);
	p.outro(
		manual.length > 0
			? pc.yellow(
					`Almost there: ${manual.length} file${manual.length === 1 ? '' : 's'} need a line or two from you (above).`
				)
			: pc.green('Aphex is in. Going to production: https://docs.getaphex.com/add-to-existing-app')
	);
}
