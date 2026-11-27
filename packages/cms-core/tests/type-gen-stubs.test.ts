/**
 * Type generation bundles a schema with its icons and Svelte components stubbed
 * (they can't load in Node and never affect types). The stubs are components,
 * so a schema can use them as values, and its source is never rewritten: a
 * call like `icon: picture(drawing)` stays a call.
 */
import path from 'path';
import { describe, expect, it } from 'vitest';
import { compileAndImportModule, generateTypes } from '../src/lib/type-gen';
import type { SchemaType } from '../src/lib/types/schemas';

const fixture = path.resolve(__dirname, 'fixtures/type-gen-stubs/schema.ts');

describe('type generation with icons and components', () => {
	it('loads a schema whose icons are components or calls that wrap one', async () => {
		const mod = await compileAndImportModule(fixture, '.temp-type-gen-stubs.mjs');
		const [post] = mod.schemaTypes as SchemaType[] & { icon?: unknown }[];
		expect(typeof (post as { icon?: unknown }).icon).toBe('function');
		const layout = (post as { fields: { list: { icon?: unknown }[] }[] }).fields[0];
		expect(typeof layout.list[0].icon).toBe('function');
		expect(layout.list[1].icon).toBeUndefined();
		expect(generateTypes(mod.schemaTypes as SchemaType[])).toContain("layout?: 'grid' | 'list'");
	});
});
