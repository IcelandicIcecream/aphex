// services/plugin-settings-service.ts
//
// Resolves and persists a plugin's per-organization settings — the "config plane"
// (see references/plugin-settings-and-secrets-scope.md). A plugin declares its
// settings shape via an `aphex/settings` part; this service merges the declared
// defaults with the stored per-(org, plugin) values and writes edits back, scoped
// to the org.
//
// Secrets (`type: 'secret'` fields) are handled specially:
//   - stored AES-256-GCM-encrypted (never plaintext),
//   - decrypted only for server injection (`get`), never for the client (`getMasked`),
//   - write-only: a blank/masked submission means "leave unchanged".
// When no encryption key is configured, secret writes are refused and secret reads
// return nothing — fail safe, never store or reveal a plaintext secret.

import type { DatabaseAdapter } from '../db/index';
import type { PartResolver } from '../plugins/resolver';
import type { SettingsPart } from '../plugins/types';
import type { SettingsField } from '../types/schemas';
import { encryptSecret, decryptSecret, isEncryptedSecret } from '../security/secret-crypto';
import { settingsListItems } from '../schema-utils/settings';
import { cmsLogger } from '../utils/logger';

/** Placeholder shown to the client for a secret that has a stored value. */
export const SECRET_MASK = '••••••';

/**
 * The persistence this service needs — the settings slice of `DatabaseAdapter`, which
 * satisfies it structurally. Declaring the narrow dependency rather than the whole
 * adapter keeps the service honest about its reach (config values only, never content)
 * and lets it be constructed against a stub.
 */
export type PluginSettingsStore = Pick<DatabaseAdapter, 'getPluginSettings' | 'setPluginSettings'>;

/** Likewise the resolver slice: this service only ever looks up settings declarations. */
export type SettingsDeclarationSource = Pick<PartResolver, 'settingsDeclaration'>;

/** A declared settings section plus whether the plugin registered one at all. */
export interface ResolvedSettings {
	/** The plugin's settings declaration, or `null` if it declared none. */
	declaration: SettingsPart | null;
	/** Declared defaults merged with the org's stored values (secrets masked). */
	values: Record<string, unknown>;
	/** Whether an encryption key is configured — the UI flags secret fields read-only if not. */
	secretsEnabled: boolean;
}

const isSecret = (f: SettingsField): boolean => f.type === 'secret';

/**
 * Static default for a field — its `initialValue` when that's a plain value (not a
 * function/thunk). Secrets never carry a default.
 */
function fieldDefault(field: SettingsField): unknown {
	if (isSecret(field)) return undefined;
	const initial = (field as { initialValue?: unknown }).initialValue;
	return typeof initial === 'function' ? undefined : initial;
}

/** Build the defaults object from a declaration's fields (skips undefined). */
function defaultsFor(fields: SettingsField[]): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const field of fields) {
		const value = fieldDefault(field);
		if (value !== undefined) out[field.name] = value;
	}
	return out;
}

/** Raised when a submitted value doesn't match its declared field type. */
export class PluginSettingsValidationError extends Error {
	constructor(readonly issues: string[]) {
		super(`Invalid plugin settings: ${issues.join('; ')}`);
		this.name = 'PluginSettingsValidationError';
	}
}

/**
 * Check one submitted value against its declared field type, returning an error
 * message or `null`.
 *
 * The declaration is the contract, so the host enforces it here rather than leaving
 * every plugin to re-guard values it already described. Without this a `string` field
 * would happily store an object, and the plugin would find out at request time, deep
 * in its own code, with no useful trace back to the save that caused it.
 *
 * `null` is always allowed — it's how the panel represents "cleared".
 */
function checkValue(field: SettingsField, value: unknown): string | null {
	if (value === null) return null;
	switch (field.type) {
		case 'string': {
			if (typeof value !== 'string') return `"${field.name}" must be a string`;
			// A select-style string field may only hold one of its declared options.
			const items = settingsListItems(field);
			if (items.length > 0 && !items.some((item) => item.value === value)) {
				return `"${field.name}" must be one of: ${items.map((i) => i.value).join(', ')}`;
			}
			return null;
		}
		case 'text':
			if (typeof value !== 'string') return `"${field.name}" must be a string`;
			return null;
		case 'number':
			// Reject NaN/Infinity too — they survive JSON as null and corrupt round-trips.
			if (typeof value !== 'number' || !Number.isFinite(value)) {
				return `"${field.name}" must be a finite number`;
			}
			if (field.min !== undefined && value < field.min) {
				return `"${field.name}" must be >= ${field.min}`;
			}
			if (field.max !== undefined && value > field.max) {
				return `"${field.name}" must be <= ${field.max}`;
			}
			return null;
		case 'boolean':
			if (typeof value !== 'boolean') return `"${field.name}" must be a boolean`;
			return null;
		case 'secret':
			// Secrets are write-only strings; blank/mask is handled before this point.
			if (typeof value !== 'string') return `"${field.name}" must be a string`;
			return null;
	}
}

export class PluginSettingsService {
	constructor(
		/** Narrowed to the two methods this service uses — the full adapter satisfies it. */
		private db: PluginSettingsStore,
		/** Likewise: settings resolution is the only part of the resolver needed here. */
		private resolver: SettingsDeclarationSource,
		/** Key for encrypting `secret` fields; when absent, secrets are disabled (fail safe). */
		private encryptionKey: string | null = null
	) {}

	/** Whether secret fields can be stored/read (an encryption key is configured). */
	get secretsEnabled(): boolean {
		return typeof this.encryptionKey === 'string' && this.encryptionKey.length > 0;
	}

	private secretFieldNames(declaration: SettingsPart): Set<string> {
		return new Set(declaration.fields.filter(isSecret).map((f) => f.name));
	}

	/**
	 * Effective values for injection into plugin **server** code: declared defaults
	 * overlaid with stored values, with secrets **decrypted** to plaintext. Secrets
	 * that can't be decrypted (no key, or a bad envelope) are omitted, never returned
	 * as ciphertext. This is the sensitive read — never send its result to a client.
	 */
	async get(organizationId: string, pluginId: string): Promise<Record<string, unknown>> {
		const declaration = this.resolver.settingsDeclaration(pluginId);
		const stored = (await this.db.getPluginSettings(organizationId, pluginId)) ?? {};
		const defaults = declaration ? defaultsFor(declaration.fields) : {};
		const merged: Record<string, unknown> = { ...defaults, ...stored };

		if (!declaration) return merged;
		const secrets = this.secretFieldNames(declaration);
		for (const name of secrets) {
			const value = merged[name];
			if (!isEncryptedSecret(value)) {
				// Unset or non-envelope — nothing usable to inject.
				delete merged[name];
				continue;
			}
			if (!this.secretsEnabled) {
				delete merged[name];
				continue;
			}
			try {
				merged[name] = decryptSecret(value, this.encryptionKey as string);
			} catch (error) {
				cmsLogger.error(`Failed to decrypt secret "${pluginId}.${name}":`, error);
				delete merged[name];
			}
		}
		return merged;
	}

	/**
	 * Effective values for the **client/API**: same merge, but secrets are **masked** —
	 * a stored secret becomes {@link SECRET_MASK}, an unset one an empty string. Plaintext
	 * secrets never cross this boundary.
	 */
	async getMasked(organizationId: string, pluginId: string): Promise<Record<string, unknown>> {
		const declaration = this.resolver.settingsDeclaration(pluginId);
		const stored = (await this.db.getPluginSettings(organizationId, pluginId)) ?? {};
		const defaults = declaration ? defaultsFor(declaration.fields) : {};
		const merged: Record<string, unknown> = { ...defaults, ...stored };

		if (declaration) {
			for (const name of this.secretFieldNames(declaration)) {
				merged[name] = isEncryptedSecret(merged[name]) ? SECRET_MASK : '';
			}
		}
		return merged;
	}

	/**
	 * Resolve for the admin surface: the declaration plus masked values plus whether
	 * secrets are enabled. `declaration: null` when the plugin declares no settings.
	 */
	async resolve(organizationId: string, pluginId: string): Promise<ResolvedSettings> {
		const declaration = this.resolver.settingsDeclaration(pluginId) ?? null;
		const values = await this.getMasked(organizationId, pluginId);
		return { declaration, values, secretsEnabled: this.secretsEnabled };
	}

	/**
	 * Persist a partial edit. Only declared field names are accepted, and each value is
	 * type-checked against its declaration — an invalid patch is rejected whole, never
	 * applied in part, so a failed save can't leave settings half-written. Secret fields
	 * are encrypted; a blank or still-masked secret submission means "leave unchanged"
	 * (so the client never has to echo the real value back). Returns the new **masked**
	 * values — a save response never leaks a plaintext secret.
	 *
	 * @throws {PluginSettingsValidationError} when a value doesn't match its field type.
	 */
	async save(
		organizationId: string,
		pluginId: string,
		patch: Record<string, unknown>
	): Promise<Record<string, unknown>> {
		const declaration = this.resolver.settingsDeclaration(pluginId);
		if (!declaration) {
			throw new Error(`Plugin "${pluginId}" has not declared any settings.`);
		}

		const fieldsByName = new Map(declaration.fields.map((f) => [f.name, f]));
		const secrets = this.secretFieldNames(declaration);
		const stored = (await this.db.getPluginSettings(organizationId, pluginId)) ?? {};
		const next: Record<string, unknown> = { ...stored };

		// Validate the whole patch before writing any of it.
		const issues: string[] = [];
		const pending: Array<[string, unknown]> = [];
		for (const [key, value] of Object.entries(patch)) {
			const field = fieldsByName.get(key);
			if (!field) continue; // undeclared → dropped

			if (secrets.has(key)) {
				// Write-only: blank or the untouched mask means "keep the current value".
				if (value === '' || value === SECRET_MASK || value == null) continue;
				if (!this.secretsEnabled) {
					throw new Error(
						`Cannot store secret "${pluginId}.${key}": no secretEncryptionKey configured.`
					);
				}
			}

			const issue = checkValue(field, value);
			if (issue) issues.push(issue);
			else pending.push([key, value]);
		}
		if (issues.length > 0) throw new PluginSettingsValidationError(issues);

		for (const [key, value] of pending) {
			next[key] = secrets.has(key)
				? encryptSecret(String(value), this.encryptionKey as string)
				: value;
		}

		await this.db.setPluginSettings(organizationId, pluginId, next);
		return this.getMasked(organizationId, pluginId);
	}
}
