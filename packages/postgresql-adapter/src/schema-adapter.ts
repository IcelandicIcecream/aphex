import type { SchemaAdapter, SchemaType } from '@aphexcms/cms-core/server';
import type { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import type { CMSSchema } from './schema';

export class PostgreSQLSchemaAdapter implements SchemaAdapter {
	private db: ReturnType<typeof drizzle>;
	private tables: CMSSchema;

	constructor(db: ReturnType<typeof drizzle>, tables: CMSSchema) {
		this.db = db;
		this.tables = tables;
	}

	async registerSchemaType(schemaType: SchemaType): Promise<void> {
		const existing = await this.db
			.select()
			.from(this.tables.schemaTypes)
			.where(eq(this.tables.schemaTypes.name, schemaType.name))
			.limit(1);

		if (existing.length === 0) {
			await this.db.insert(this.tables.schemaTypes).values({
				name: schemaType.name,
				title: schemaType.title,
				type: schemaType.type,
				description: schemaType.description,
				fields: schemaType.fields as any
			});
			console.log(
				`📝 Registered ${schemaType.type}: ${schemaType.name} with ${schemaType.fields?.length || 0} fields`
			);
		} else {
			await this.db
				.update(this.tables.schemaTypes)
				.set({
					title: schemaType.title,
					description: schemaType.description,
					fields: schemaType.fields as any,
					updatedAt: new Date()
				})
				.where(eq(this.tables.schemaTypes.name, schemaType.name));
			console.log(
				`🔄 Updated ${schemaType.type}: ${schemaType.name} with ${schemaType.fields?.length || 0} fields`
			);
			console.log(
				`   Fields:`,
				schemaType.fields?.map((f: any) => ({ name: f.name, type: f.type, private: f.private }))
			);
		}
	}

	async getSchemaType(name: string): Promise<SchemaType | null> {
		console.log(`[PostgreSQL] getSchemaType called for: ${name}`);
		const [schemaType] = await this.db
			.select()
			.from(this.tables.schemaTypes)
			.where(eq(this.tables.schemaTypes.name, name))
			.limit(1);

		if (!schemaType) {
			console.log(`[PostgreSQL] Schema ${name} NOT FOUND in database`);
			return null;
		}

		const result = {
			...schemaType,
			description: schemaType.description ?? undefined,
			fields: schemaType.fields as any
		};
		console.log(`[PostgreSQL] Schema ${name} found:`, {
			fieldCount: result.fields?.length,
			fields: result.fields?.map((f: any) => ({ name: f.name, type: f.type, private: f.private }))
		});
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
		console.log(`🗑️  Deleted schema type: ${name}`);
	}
}
