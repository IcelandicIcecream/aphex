import type { CMSConfig } from './types/config.js';
import type { SchemaType } from './types/schemas.js';
import type { DatabaseAdapter } from './db/interfaces/index.js';

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
		console.log('🔄 CMS config updated:', {
			schemaTypes: newConfig.schemaTypes.length,
			documents: newConfig.schemaTypes.filter((t) => t.type === 'document').length,
			objects: newConfig.schemaTypes.filter((t) => t.type === 'object').length
		});
	}

	// Initialize CMS - register schema types in database
	async initialize(): Promise<void> {
		console.log('🚀 Initializing CMS...');

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

		console.log('✅ CMS initialized successfully');
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
	}
	return cmsInstance;
}

export function getCMS(): CMSEngine {
	if (!cmsInstance) {
		throw new Error('CMS not initialized. Call createCMS() first.');
	}
	return cmsInstance;
}
