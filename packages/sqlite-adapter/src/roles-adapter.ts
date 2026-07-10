// SQLite roles adapter — per-organization role CRUD.
import { drizzle } from 'drizzle-orm/libsql';
import { eq, and } from 'drizzle-orm';
import type { RolesAdapter } from '@aphexcms/cms-core/server';
import { buildBuiltinRoleRows, type Capability, type NewRole, type Role } from '@aphexcms/cms-core';
import type { CMSSchema } from './schema';

export class SQLiteRolesAdapter implements RolesAdapter {
	private db: ReturnType<typeof drizzle>;
	private tables: CMSSchema;

	constructor(db: ReturnType<typeof drizzle>, tables: CMSSchema) {
		this.db = db;
		this.tables = tables;
	}

	async listRoles(organizationId: string): Promise<Role[]> {
		const rows = await this.db
			.select()
			.from(this.tables.roles)
			.where(eq(this.tables.roles.organizationId, organizationId));
		return rows.map(toRole);
	}

	async findRoleByName(organizationId: string, name: string): Promise<Role | null> {
		const rows = await this.db
			.select()
			.from(this.tables.roles)
			.where(
				and(eq(this.tables.roles.organizationId, organizationId), eq(this.tables.roles.name, name))
			)
			.limit(1);
		return rows[0] ? toRole(rows[0]) : null;
	}

	async createRole(data: NewRole): Promise<Role> {
		const rows = await this.db
			.insert(this.tables.roles)
			.values({
				organizationId: data.organizationId,
				name: data.name,
				description: data.description ?? null,
				capabilities: data.capabilities as string[],
				isBuiltIn: data.isBuiltIn ? 'true' : 'false'
			})
			.returning();
		return toRole(rows[0]!);
	}

	async updateRole(
		organizationId: string,
		name: string,
		data: { description?: string | null; capabilities?: Capability[] }
	): Promise<Role | null> {
		const patch: Record<string, unknown> = { updatedAt: new Date() };
		if (data.description !== undefined) patch.description = data.description;
		if (data.capabilities !== undefined) patch.capabilities = data.capabilities as string[];

		const rows = await this.db
			.update(this.tables.roles)
			.set(patch)
			.where(
				and(eq(this.tables.roles.organizationId, organizationId), eq(this.tables.roles.name, name))
			)
			.returning();

		return rows[0] ? toRole(rows[0]) : null;
	}

	async deleteRole(organizationId: string, name: string): Promise<boolean> {
		const rows = await this.db
			.delete(this.tables.roles)
			.where(
				and(eq(this.tables.roles.organizationId, organizationId), eq(this.tables.roles.name, name))
			)
			.returning({ id: this.tables.roles.id });
		return rows.length > 0;
	}

	async seedBuiltinRoles(organizationId: string): Promise<void> {
		const rows = buildBuiltinRoleRows(organizationId).map((r) => ({
			organizationId: r.organizationId,
			name: r.name,
			description: r.description ?? null,
			capabilities: r.capabilities as string[],
			isBuiltIn: 'true'
		}));
		// onConflictDoNothing makes this idempotent — safe to call repeatedly.
		await this.db
			.insert(this.tables.roles)
			.values(rows)
			.onConflictDoNothing({
				target: [this.tables.roles.organizationId, this.tables.roles.name]
			});
	}
}

function toRole(row: {
	id: string;
	organizationId: string;
	name: string;
	description: string | null;
	capabilities: string[];
	isBuiltIn: string;
	createdAt: Date;
	updatedAt: Date;
}): Role {
	return {
		id: row.id,
		organizationId: row.organizationId,
		name: row.name,
		description: row.description,
		capabilities: (row.capabilities ?? []) as Capability[],
		isBuiltIn: row.isBuiltIn === 'true',
		createdAt: row.createdAt,
		updatedAt: row.updatedAt
	};
}
