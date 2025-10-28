// PostgreSQL user profile adapter implementation
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import type { UserProfileAdapter, NewUserProfileData, UserProfile } from '@aphexcms/cms-core/server';
import type { CMSSchema } from './schema.js';

/**
 * PostgreSQL user profile adapter implementation
 * Handles all user profile-related database operations
 */
export class PostgreSQLUserProfileAdapter implements UserProfileAdapter {
	private db: ReturnType<typeof drizzle>;
	private tables: CMSSchema;

	constructor(db: ReturnType<typeof drizzle>, tables: CMSSchema) {
		this.db = db;
		this.tables = tables;
	}

	/**
	 * Create a new user profile
	 */
	async createUserProfile(data: NewUserProfileData): Promise<UserProfile> {
		console.log(`[PostgreSQLAdapter]: Creating user profile for userId: ${data.userId}`);
		const result = await this.db.insert(this.tables.userProfiles).values(data).returning();

		const userProfile = result[0]!;

		return {
			...userProfile,
			preferences: userProfile.preferences ?? undefined
		};
	}

	/**
	 * Find a user profile by their ID
	 */
	async findUserProfileById(userId: string): Promise<UserProfile | null> {
		const result = await this.db
			.select()
			.from(this.tables.userProfiles)
			.where(eq(this.tables.userProfiles.userId, userId))
			.limit(1);

		const userProfile = result[0] || null;

		if (!userProfile) {
			return null;
		}

		return {
			...userProfile,
			preferences: userProfile.preferences ?? undefined
		};
	}

	/**
	 * Delete a user profile by their ID
	 */
	async deleteUserProfile(userId: string): Promise<boolean> {
		const result = await this.db
			.delete(this.tables.userProfiles)
			.where(eq(this.tables.userProfiles.userId, userId))
			.returning({ id: this.tables.userProfiles.userId });

		return result.length > 0;
	}
}
