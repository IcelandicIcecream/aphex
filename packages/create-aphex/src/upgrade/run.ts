import * as p from '@clack/prompts';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import pc from 'picocolors';
import { detectApp } from '../init/detect.js';
import { withReleaseTag } from '../dist-tags.js';
import type { InitOptions } from '../options.js';
import { buildUpgradePlan, emptiedDirs, type KeptUnit, type UpgradePlan } from './plan.js';

const GUIDE = 'https://docs.getaphex.com/upgrading-to-embedded-admin';

function describe(plan: UpgradePlan): string {
	const label = {
		delete: pc.red('delete'),
		create: pc.green('create'),
		update: pc.yellow('update'),
		keep: pc.dim('keep  '),
		manual: pc.red('by hand')
	};
	// A route folder goes whole, so it's one line, not one per file.
	const lines: string[] = [];
	const folders = new Set<string>();
	for (const change of plan.changes) {
		if (change.action === 'delete' && change.dir) {
			if (folders.has(change.dir)) continue;
			folders.add(change.dir);
			const count = plan.changes.filter(
				(other) => other.action === 'delete' && other.dir === change.dir
			).length;
			lines.push(
				`${label.delete}  ${change.dir}/ ${pc.dim(`(${count} file${count === 1 ? '' : 's'}, ${change.reason})`)}`
			);
			continue;
		}
		const detail = change.action === 'delete' ? pc.dim(` (${change.reason})`) : '';
		lines.push(`${label[change.action]}  ${change.path}${detail}`);
	}
	return lines.join('\n');
}

const SHOWN_LINES = 6;

function describeKept({ unit, edited }: KeptUnit): string {
	// A unit's folders, and those of its single files the app has.
	const staying = unit.paths.filter(
		(path) => !/\.\w+$/.test(path) || edited.some((file) => file.path === path)
	);
	const lines: string[] = [];
	for (const file of edited) {
		if (file.added) {
			lines.push(`${pc.cyan(file.path)}: a file you added`);
		} else if (file.ownLines.length === 0) {
			lines.push(`${pc.cyan(file.path)}: you removed lines from Aphex's version`);
		} else {
			const count = file.ownLines.length;
			lines.push(`${pc.cyan(file.path)}: ${count} line${count === 1 ? '' : 's'} of your own`);
			for (const line of file.ownLines.slice(0, SHOWN_LINES))
				lines.push(pc.green(`  + ${line.trim()}`));
			if (count > SHOWN_LINES) lines.push(pc.dim(`  … and ${count - SHOWN_LINES} more`));
		}
	}
	lines.push(
		'',
		`So ${staying.join(', ')} ${staying.length === 1 ? 'stays' : 'stay'} as ${staying.length === 1 ? 'it is' : 'they are'}.`,
		unit.keptMeans ??
			`Core serves ${unit.servedAt} now. Your route wins over core's while it exists.`
	);
	return lines.join('\n');
}

function addCommand(manager: string, packages: string[]): string[] {
	return [manager, manager === 'npm' ? 'install' : 'add', ...packages];
}

/** Moves an app made from an older Aphex template to the embedded admin, where core serves those routes. */
export async function runUpgrade(cwd: string, options: InitOptions): Promise<void> {
	p.intro(
		pc.bgCyan(pc.black(' create-aphex ')) + pc.dim('  upgrading this app to the embedded admin')
	);

	const app = detectApp(cwd);
	if (app.kitMajor !== undefined && app.kitMajor >= 3) {
		p.log.error(
			`This app uses SvelteKit ${app.kitVersion}. The embedded admin supports SvelteKit 2 for now.`
		);
		p.outro(pc.red('Nothing was changed.'));
		process.exit(1);
	}

	// Folders with edits are kept. Show what the edits are, and when there's someone to
	// ask, offer to replace them anyway: an old page with one added line is common.
	const first = buildUpgradePlan(app);
	const replace = new Set<string>();
	for (const kept of first.kept) {
		p.note(describeKept(kept), `Kept: ${kept.unit.label}`);
		if (options.yes || options.dryRun) continue;
		const answer = await p.confirm({
			message: `Replace ${kept.unit.label} with core's anyway? Your changes above are lost.`,
			initialValue: false
		});
		if (p.isCancel(answer)) {
			p.cancel('Nothing was changed.');
			process.exit(0);
		}
		if (answer) replace.add(kept.unit.label);
	}
	const plan = replace.size > 0 ? buildUpgradePlan(app, { replace }) : first;
	const install = await withReleaseTag(plan.packages);
	// A patch pinned to the installed version makes the install fail once it moves, and
	// the fix it carries may not be in the new version, so that's the person's call.
	const installNow = options.install && plan.patches.length === 0;

	if (plan.changes.length === 0 && plan.kept.length === 0) {
		p.log.success('This app is already on the embedded admin.');
	} else if (plan.changes.length > 0) {
		p.note(describe(plan), 'Changes');
	}
	if (install.length > 0) {
		p.note(
			addCommand(app.packageManager, install).join(' '),
			installNow ? 'Then install' : 'Install these yourself'
		);
	}

	if (plan.patches.length > 0) {
		p.note(
			[
				...plan.patches.map(({ dependency, file }) => `${pc.cyan(dependency)}  ${pc.dim(file)}`),
				'',
				'Each patch is pinned to the version you have, so installing the new',
				'version fails until you remove its entry. Check whether the new version',
				'already has your fix. If not, port the patch to it, or ask for it upstream.',
				'The upgrade won’t install anything until then.'
			].join('\n'),
			'Patched Aphex packages'
		);
	}

	if (options.dryRun) {
		p.outro('Dry run: nothing was changed.');
		return;
	}
	if (plan.changes.length === 0 && install.length === 0) {
		p.outro('Nothing to do.');
		return;
	}
	if (!options.yes) {
		const go = await p.confirm({ message: 'Make these changes?', initialValue: true });
		if (p.isCancel(go) || !go) {
			p.cancel('Nothing was changed.');
			process.exit(0);
		}
	}

	const removed: string[] = [];
	for (const change of plan.changes) {
		const full = join(cwd, change.path);
		if (change.action === 'delete') {
			rmSync(full);
			removed.push(change.path);
		} else if (change.action === 'create' || change.action === 'update') {
			mkdirSync(dirname(full), { recursive: true });
			writeFileSync(full, change.content);
		}
	}
	for (const dir of emptiedDirs(cwd, removed)) {
		if (readdirSync(join(cwd, dir)).length === 0) rmdirSync(join(cwd, dir));
	}
	p.log.success('Files written.');

	if (installNow && install.length > 0) {
		const [bin, ...args] = addCommand(app.packageManager, install);
		const result = spawnSync(bin, args, {
			cwd,
			stdio: 'inherit',
			shell: process.platform === 'win32'
		});
		if (result.status !== 0) p.log.error('Installing failed. Run the command above yourself.');
	}

	for (const change of plan.changes) {
		if (change.action === 'manual') p.note(change.instructions, `By hand: ${change.path}`);
	}
	if (plan.staleLinks.length > 0) {
		p.note(
			plan.staleLinks
				.map(({ path, link }) => `${pc.cyan(path)} links to ${link}, which is under /admin now`)
				.join('\n'),
			'Links to update'
		);
	}
	p.outro(pc.green(`Upgraded. What changed and why: ${GUIDE}`));
}
