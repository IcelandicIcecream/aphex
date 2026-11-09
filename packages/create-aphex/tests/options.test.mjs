import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { parseArgs, templates } from '../dist/options.js';

test('offers the base and website templates', () => {
	const { version } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
	assert.deepEqual(Object.keys(templates), ['base', 'website']);
	assert.equal(
		templates.base.source,
		`github:IcelandicIcecream/aphex-base#create-aphex-v${version}`
	);
	assert.equal(
		templates.website.source,
		`github:IcelandicIcecream/aphex-website#create-aphex-v${version}`
	);
});

test('parses a positional project name and template flag', () => {
	assert.deepEqual(parseArgs(['my-site', '--template', 'website']), {
		projectName: 'my-site',
		template: 'website',
		help: false,
		yes: false,
		dryRun: false,
		install: true
	});
});

test('parses short and equals template flags', () => {
	assert.equal(parseArgs(['-t', 'base']).template, 'base');
	assert.equal(parseArgs(['--template=website']).template, 'website');
});

test('rejects unknown templates and options', () => {
	assert.throws(() => parseArgs(['--template', 'blog']), /Unknown template "blog"/);
	assert.throws(() => parseArgs(['--unknown']), /Unknown option: --unknown/);
});

test('rejects extra positional arguments', () => {
	assert.throws(() => parseArgs(['one', 'two']), /Unexpected argument: two/);
});

test('parses the flags for adding Aphex to an existing app', () => {
	const options = parseArgs([
		'--db',
		'postgres',
		'--storage=s3',
		'--email',
		'resend',
		'-y',
		'--dry-run',
		'--no-install'
	]);
	assert.equal(options.database, 'postgres');
	assert.equal(options.storage, 's3');
	assert.equal(options.email, 'resend');
	assert.equal(options.yes, true);
	assert.equal(options.dryRun, true);
	assert.equal(options.install, false);
	assert.equal(options.projectName, undefined);
});

test('rejects values those flags don’t take', () => {
	assert.throws(() => parseArgs(['--db', 'mysql']), /--db must be one of: sqlite, postgres/);
	assert.throws(() => parseArgs(['--storage']), /--storage must be one of/);
});
