#!/usr/bin/env node

/**
 * Aphex CMS CLI
 * Uses cac for command parsing + clack for interactive prompts
 */

import { intro, outro, spinner, text, cancel, isCancel } from '@clack/prompts';
import { cac } from 'cac';
import pc from 'picocolors';
import { generateTypesFromConfig } from './generate-types';

const cli = cac('aphex');

// Version from package.json
const version = '0.1.10';

// ASCII Art Banner
function printBanner() {
    console.log(pc.cyan(`${pc.bold('⚡ Aphex CMS')}\n${pc.dim('A modern headless CMS')}`));
}

/**
 * aphex generate:types [schema-path] [output-path]
 * Generate TypeScript types from schema
 */
cli
	.command('generate:types [schema-path] [output-path]', 'Generate TypeScript types from schema')
	.action(async (schemaPath?: string, outputPath?: string) => {
		intro(pc.cyan('⚡ Aphex CMS - Type Generator'));

		try {
			// If paths not provided, prompt for them
			if (!schemaPath) {
				const result = await text({
					message: 'Schema file path:',
					placeholder: './src/lib/schemaTypes/index.ts',
					defaultValue: './src/lib/schemaTypes/index.ts'
				});

				if (isCancel(result)) {
					cancel('Operation cancelled.');
					process.exit(0);
				}

				schemaPath = result as string;
			}

			if (!outputPath) {
				const result = await text({
					message: 'Output file path:',
					placeholder: './src/lib/generated-types.ts',
					defaultValue: './src/lib/generated-types.ts'
				});

				if (isCancel(result)) {
					cancel('Operation cancelled.');
					process.exit(0);
				}

				outputPath = result as string;
			}

			const s = spinner();
			s.start('Generating types...');

			await generateTypesFromConfig(schemaPath, outputPath);

			s.stop(pc.green('✅ Types generated successfully!'));
			outro(pc.dim(`Output: ${pc.cyan(outputPath)}`));
		} catch (error) {
			cancel(pc.red('Failed to generate types'));
			console.error(error);
			process.exit(1);
		}
	});

/**
 * aphex help
 */
cli.help();

/**
 * aphex --version
 */
cli.version(version);

/**
 * Default command - show banner and help
 */
cli.on('command:*', () => {
	printBanner();
	console.log(pc.red(`Unknown command: ${cli.args.join(' ')}\n`));
	console.log(`Run ${pc.cyan('aphex --help')} to see available commands.`);
	process.exit(1);
});

// Parse CLI args
cli.parse();

// If no command provided, show banner and help
if (!process.argv.slice(2).length) {
	printBanner();
	cli.outputHelp();
}
