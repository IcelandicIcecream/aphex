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
		help: false
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
