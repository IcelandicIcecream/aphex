import type { SchemaAdapter, SchemaType } from '@aphexcms/cms-core/server';
import type { drizzle } from 'drizzle-orm/libsql';
import { eq } from 'drizzle-orm';
import type { CMSSchema } from './schema';

export class SQLiteSchemaAdapter implements SchemaAdapter {
	private db: ReturnType<typeof drizzle>;
	private tables: CMSSchema;

	constructor(db: ReturnType<typeof drizzle>, tables: CMSSchema) {
		this.db = db;
		this.tables = tables;
	}

	async registerSchemaType(schemaType: SchemaType): Promise<void> {
		// A single atomic upsert, not a check-then-insert-or-update: CMSEngine.initialize()
		// runs on every boot, and serverless platforms can boot several instances
		// concurrently (e.g. two requests racing a cold start) — a SELECT-then-branch
		// has a window where two instances both see "not found" and both INSERT,
		// and the second hits the unique constraint on `name` and 500s.
		await this.db
			.insert(this.tables.schemaTypes)
			.values({
				name: schemaType.name,
				title: schemaType.title,
				type: schemaType.type,
				description: schemaType.description,
				fields: schemaType.fields as any
			})
			.onConflictDoUpdate({
				target: this.tables.schemaTypes.name,
				set: {
					title: schemaType.title,
					type: schemaType.type,
					description: schemaType.description,
					fields: schemaType.fields as any,
					updatedAt: new Date()
				}
			});
	}

	async getSchemaType(name: string): Promise<SchemaType | null> {
		const [schemaType] = await this.db
			.select()
			.from(this.tables.schemaTypes)
			.where(eq(this.tables.schemaTypes.name, name))
			.limit(1);

		if (!schemaType) {
			return null;
		}

		const result = {
			...schemaType,
			description: schemaType.description ?? undefined,
			fields: schemaType.fields as any
		};
		return result;
	}

	async listSchemas(): Promise<SchemaType[]> {
		const schemaTypes = await this.db.select().from(this.tables.schemaTypes);
		return schemaTypes.map((st) => ({
			...st,
			description: st.description ?? undefined,
			fields: st.fields as any
		}));
	}

	async listDocumentTypes(): Promise<Array<{ name: string; title: string; description?: string }>> {
		const documentTypes = await this.db
			.select({
				name: this.tables.schemaTypes.name,
				title: this.tables.schemaTypes.title,
				description: this.tables.schemaTypes.description
			})
			.from(this.tables.schemaTypes)
			.where(eq(this.tables.schemaTypes.type, 'document'))
			.orderBy(this.tables.schemaTypes.title);

		return documentTypes.map((d) => ({
			name: d.name,
			title: d.title,
			description: d.description || undefined
		}));
	}

	async listObjectTypes(): Promise<Array<{ name: string; title: string; description?: string }>> {
		const objectTypes = await this.db
			.select({
				name: this.tables.schemaTypes.name,
				title: this.tables.schemaTypes.title,
				description: this.tables.schemaTypes.description
			})
			.from(this.tables.schemaTypes)
			.where(eq(this.tables.schemaTypes.type, 'object'))
			.orderBy(this.tables.schemaTypes.title);

		return objectTypes.map((o) => ({
			name: o.name,
			title: o.title,
			description: o.description || undefined
		}));
	}

	async deleteSchemaType(name: string): Promise<void> {
		await this.db.delete(this.tables.schemaTypes).where(eq(this.tables.schemaTypes.name, name));
	}
}
