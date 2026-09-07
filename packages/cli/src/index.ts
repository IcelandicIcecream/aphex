#!/usr/bin/env node

import * as p from '@clack/prompts';
import { spawn } from 'child_process';
import pc from 'picocolors';

const [, , command, ...commandArgs] = process.argv;

async function main() {
	if (!command || command === 'help' || command === '--help' || command === '-h') {
		showHelp();
		process.exit(0);
	}

	switch (command) {
		case 'create':
			await runCreate(commandArgs);
			break;
		default:
			console.error(pc.red(`Unknown command: ${command}`));
			console.log('');
			showHelp();
			process.exit(1);
	}
}

function showHelp() {
	console.log(pc.bold('aphx') + ' - Aphex CMS CLI');
	console.log('');
	console.log(pc.dim('Usage:'));
	console.log('  aphx <command> [options]');
	console.log('');
	console.log(pc.dim('Commands:'));
	console.log('  ' + pc.cyan('create') + '    Scaffold a new Aphex CMS project');
	console.log('  ' + pc.cyan('help') + '      Show this help message');
	console.log('');
	console.log(pc.dim('Examples:'));
	console.log('  aphx create my-site');
	console.log('  aphx create my-site --template website');
}

async function runCreate(args: string[]) {
	p.intro(pc.bgCyan(pc.black(' aphx create ')));

	return new Promise<void>((resolve, reject) => {
		// Spawn npx to run the scaffolding package
		const child = spawn('npx', ['create-aphex', ...args], {
			stdio: 'inherit',
			shell: true
		});

		child.on('close', (code) => {
			if (code !== 0) {
				reject(new Error(`Scaffolding failed with exit code ${code}`));
			} else {
				resolve();
			}
		});

		child.on('error', (err) => {
			reject(err);
		});
	});
}

main().catch((error) => {
	console.error(pc.red('Error:'), error.message);
	process.exit(1);
});
