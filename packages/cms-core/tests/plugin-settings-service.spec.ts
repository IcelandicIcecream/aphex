// PluginSettingsService.save — the config plane's write path.
//
// A plugin declares its settings shape; the host owns storage, encryption and — as of
// these tests — validation. The contract is that the declaration is authoritative:
// whatever a plugin says a field is, that's what gets stored, so plugin server code can
// trust the values it's injected instead of re-guarding every read. Before this, `save`
// whitelisted field *names* but not *values*, so a `string` field would cheerfully
// store an object and the plugin found out at request time, far from the cause.
//
// Also covered: a rejected patch must not partially apply, and secrets must never come
// back out in plaintext.
import { describe, it, expect, beforeEach } from 'vitest';
import {
	PluginSettingsService,
	PluginSettingsValidationError,
	SECRET_MASK,
	type PluginSettingsStore,
	type SettingsDeclarationSource
} from '../src/lib/services/plugin-settings-service';
import type { SettingsPart } from '../src/lib/plugins/types';

const KEY = 'a'.repeat(64);

const declaration: SettingsPart = {
	implements: 'aphex/settings',
	pluginId: '@test/plugin',
	title: 'Test',
	fields: [
		{ name: 'host', type: 'string', title: 'Host' },
		{ name: 'mode', type: 'string', title: 'Mode', list: ['live', 'sandbox'] },
		{ name: 'notes', type: 'text', title: 'Notes' },
		{ name: 'retries', type: 'number', title: 'Retries', min: 0, max: 10 },
		{ name: 'enabled', type: 'boolean', title: 'Enabled' },
		{ name: 'token', type: 'secret', title: 'Token' }
	]
};

/** In-memory stand-in for the settings slice of the database adapter. */
function createStore(): PluginSettingsStore & { rows: Map<string, Record<string, unknown>> } {
	const rows = new Map<string, Record<string, unknown>>();
	return {
		rows,
		async getPluginSettings(organizationId: string, pluginId: string) {
			return rows.get(`${organizationId}:${pluginId}`) ?? null;
		},
		async setPluginSettings(
			organizationId: string,
			pluginId: string,
			values: Record<string, unknown>
		) {
			rows.set(`${organizationId}:${pluginId}`, values);
		}
	};
}

const resolver: SettingsDeclarationSource = {
	settingsDeclaration: (pluginId: string) =>
		pluginId === declaration.pluginId ? declaration : undefined
};

let store: ReturnType<typeof createStore>;
let service: PluginSettingsService;

beforeEach(() => {
	store = createStore();
	service = new PluginSettingsService(store, resolver, KEY);
});

const save = (patch: Record<string, unknown>) => service.save('org1', '@test/plugin', patch);
const stored = () => store.rows.get('org1:@test/plugin');

describe('PluginSettingsService.save — validation', () => {
	it('accepts values matching the declaration', async () => {
		await save({ host: 'api.example.com', retries: 3, enabled: true, notes: 'hi' });
		expect(stored()).toMatchObject({
			host: 'api.example.com',
			retries: 3,
			enabled: true,
			notes: 'hi'
		});
	});

	it.each([
		['string given an object', { host: { nested: true } }],
		['string given a number', { host: 42 }],
		['text given an array', { notes: ['a'] }],
		['number given a numeric string', { retries: '3' }],
		['boolean given a string', { enabled: 'true' }],
		['secret given an object', { token: { a: 1 } }]
	])('rejects %s', async (_label, patch) => {
		await expect(save(patch)).rejects.toBeInstanceOf(PluginSettingsValidationError);
	});

	it('rejects NaN and Infinity — they JSON-serialize to null and corrupt round-trips', async () => {
		await expect(save({ retries: NaN })).rejects.toBeInstanceOf(PluginSettingsValidationError);
		await expect(save({ retries: Infinity })).rejects.toBeInstanceOf(PluginSettingsValidationError);
	});

	it('enforces a number field min/max', async () => {
		await expect(save({ retries: -1 })).rejects.toThrow(/>= 0/);
		await expect(save({ retries: 11 })).rejects.toThrow(/<= 10/);
		await save({ retries: 10 });
		expect(stored()?.retries).toBe(10);
	});

	it('restricts a select-style string field to its declared options', async () => {
		await save({ mode: 'sandbox' });
		expect(stored()?.mode).toBe('sandbox');
		await expect(save({ mode: 'production' })).rejects.toThrow(/must be one of: live, sandbox/);
	});

	it('allows null — the panel uses it to clear a field', async () => {
		await save({ retries: null });
		expect(stored()?.retries).toBeNull();
	});

	it('reports every issue at once, not just the first', async () => {
		const error = await save({ host: 1, enabled: 'yes' }).catch((e) => e);
		expect(error).toBeInstanceOf(PluginSettingsValidationError);
		expect(error.issues).toHaveLength(2);
	});

	it('drops undeclared keys rather than storing them', async () => {
		await save({ host: 'a.example.com', sneaky: 'value' });
		expect(stored()).not.toHaveProperty('sneaky');
	});

	it('applies nothing when any value is invalid', async () => {
		await save({ host: 'original.example.com' });
		// `host` is valid here and would have been written by a per-key loop.
		await expect(save({ host: 'new.example.com', retries: 'nope' })).rejects.toThrow();
		expect(stored()?.host).toBe('original.example.com');
	});
});

describe('PluginSettingsService.save — secrets', () => {
	it('encrypts a secret and never returns its plaintext', async () => {
		const masked = await save({ token: 'super-secret' });
		expect(masked.token).toBe(SECRET_MASK);
		expect(JSON.stringify(stored())).not.toContain('super-secret');
		// Server-side injection still gets the real value back.
		expect(await service.get('org1', '@test/plugin')).toMatchObject({ token: 'super-secret' });
	});

	it('treats a blank or still-masked submission as "leave unchanged"', async () => {
		await save({ token: 'keep-me' });
		const envelope = stored()?.token;

		await save({ token: SECRET_MASK });
		expect(stored()?.token).toBe(envelope);
		await save({ token: '' });
		expect(stored()?.token).toBe(envelope);
		expect(await service.get('org1', '@test/plugin')).toMatchObject({ token: 'keep-me' });
	});

	it('refuses to store a secret when no encryption key is configured', async () => {
		const keyless = new PluginSettingsService(createStore(), resolver, null);
		await expect(keyless.save('org1', '@test/plugin', { token: 'x' })).rejects.toThrow(
			/no secretEncryptionKey/
		);
	});
});
