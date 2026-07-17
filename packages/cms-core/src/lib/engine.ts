import type { CMSConfig } from './types/config';
import type { SchemaType } from './types/schemas';
import type { DatabaseAdapter } from './db/interfaces/index';
import { createPartResolver } from './plugins/resolver';
import { validateSchemaReferences } from './schema-utils/validator';
import { ALL_CAPABILITIES } from './types/capabilities';
import { cmsLogger } from './utils/logger';

export class CMSEngine {
	private db: DatabaseAdapter;
	public config: CMSConfig;

	constructor(config: CMSConfig, dbAdapter: DatabaseAdapter) {
		this.config = config;
		this.db = dbAdapter;
	}

	// Update config dynamically (for schema hot-reloading)
	updateConfig(newConfig: CMSConfig): void {
		this.config = newConfig;
		cmsLogger.info('[CMS]', 'Config updated:', {
			schemaTypes: newConfig.schemaTypes.length,
			documents: newConfig.schemaTypes.filter((t) => t.type === 'document').length,
			objects: newConfig.schemaTypes.filter((t) => t.type === 'object').length
		});
	}

	// Initialize CMS - register schema types in database
	async initialize(): Promise<void> {
		cmsLogger.info('[CMS]', 'Initializing...');

		// Validate schemas before syncing to database
		validateSchemaReferences(this.config.schemaTypes);

		// Get existing schemas from database
		const existingSchemas = await this.db.listSchemas();
		const existingNames = new Set(existingSchemas.map((s) => s.name));
		const currentNames = new Set(this.config.schemaTypes.map((s) => s.name));

		// Delete schemas that are no longer in config
		for (const existingName of existingNames) {
			if (!currentNames.has(existingName)) {
				await this.db.deleteSchemaType(existingName);
			}
		}

		// Register all schema types (updates if exists, creates if new)
		for (const schemaType of this.config.schemaTypes) {
			await this.db.registerSchemaType(schemaType);
		}

		await this.reconcileBuiltinRoles();

		cmsLogger.info('[CMS]', 'Initialized successfully');
	}

	/**
	 * Every capability this install recognises: core's built-ins plus whatever the
	 * registered plugins declare.
	 *
	 * `ALL_CAPABILITIES` is core-only and static, so on its own it would leave an
	 * owner unable to hold a capability its own plugins declared — owner would end up
	 * with strictly fewer permissions than admin, who can be granted plugin
	 * capabilities through the roles UI.
	 */
	ownerCapabilities(): string[] {
		const resolver = createPartResolver(this.config.plugins ?? []);
		const declared = resolver.capabilityCatalog().map((def) => def.id);
		return Array.from(new Set<string>([...ALL_CAPABILITIES, ...declared]));
	}

	/**
	 * Re-seed built-in roles for every existing organization.
	 *
	 * Org creation seeds roles once, which means an org created before a
	 * capability existed never learns about it — that is why an owner could be
	 * missing `plugin.settings.manage` after upgrading core. Re-seeding on boot
	 * closes that gap: it inserts any missing built-in row and reconciles `owner`
	 * back to the full capability set, which now includes plugin-declared
	 * capabilities. Editable roles (admin/editor/viewer) are left as the operator
	 * configured them.
	 *
	 * Because this runs on every boot, installing or removing a plugin is enough to
	 * bring owners in line with the capabilities that plugin declares.
	 *
	 * Idempotent and cheap — orgs are few and this is four rows each — so it runs
	 * unconditionally rather than behind a schema-version check.
	 */
	private async reconcileBuiltinRoles(): Promise<void> {
		const organizations = await this.db.findAllOrganizations();
		const ownerCaps = this.ownerCapabilities();
		for (const org of organizations) {
			await this.db.seedBuiltinRoles(org.id, ownerCaps);
		}
		if (organizations.length > 0) {
			cmsLogger.info(
				'[CMS]',
				`Reconciled built-in roles for ${organizations.length} org(s) (owner: ${ownerCaps.length} capabilities)`
			);
		}
	}

	// Schema Type utility methods
	async getSchemaType(name: string): Promise<SchemaType | null> {
		return this.db.getSchemaType(name);
	}

	async listSchemas(): Promise<SchemaType[]> {
		return this.db.listSchemas();
	}

	getSchemaTypeByName(name: string): SchemaType | null {
		return this.config.schemaTypes.find((s) => s.name === name) || null;
	}

	async listDocumentTypes(): Promise<Array<{ name: string; title: string; description?: string }>> {
		return this.db.listDocumentTypes();
	}

	async listObjectTypes(): Promise<Array<{ name: string; title: string; description?: string }>> {
		return this.db.listObjectTypes();
	}
}

// Global CMS instance
let cmsInstance: CMSEngine | null = null;

export function createCMS(config: CMSConfig, dbAdapter: DatabaseAdapter): CMSEngine {
	if (!cmsInstance) {
		cmsInstance = new CMSEngine(config, dbAdapter);
	} else {
		// Refresh the singleton's config on subsequent calls so schema HMR
		// doesn't get frozen by the first (possibly broken) config snapshot.
		cmsInstance.updateConfig(config);
	}
	return cmsInstance;
}

export function getCMS(): CMSEngine {
	if (!cmsInstance) {
		throw new Error('CMS not initialized. Call createCMS() first.');
	}
	return cmsInstance;
}
