import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';

const timestamp = (name: string) => integer(name, { mode: 'timestamp_ms' });
const boolean = (name: string) => integer(name, { mode: 'boolean' });

export const user = sqliteTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').default(false).notNull(),
	image: text('image'),
	// See ./pg.ts — nullable, and present whether or not the `twoFactor` option is on.
	twoFactorEnabled: boolean('two_factor_enabled').default(false),
	createdAt: timestamp('created_at')
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	updatedAt: timestamp('updated_at')
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull()
});

export const session = sqliteTable('session', {
	id: text('id').primaryKey(),
	expiresAt: timestamp('expires_at').notNull(),
	token: text('token').notNull().unique(),
	createdAt: timestamp('created_at')
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	updatedAt: timestamp('updated_at')
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' })
});

export const account = sqliteTable('account', {
	id: text('id').primaryKey(),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	accessTokenExpiresAt: timestamp('access_token_expires_at'),
	refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
	scope: text('scope'),
	password: text('password'),
	createdAt: timestamp('created_at')
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	updatedAt: timestamp('updated_at')
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull()
});

export const verification = sqliteTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at')
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.notNull(),
	updatedAt: timestamp('updated_at')
		.$defaultFn(() => /* @__PURE__ */ new Date())
		.$onUpdate(() => /* @__PURE__ */ new Date())
		.notNull()
});

/** See ./pg.ts — same table, libsql dialect. */
export const twoFactor = sqliteTable(
	'two_factor',
	{
		id: text('id').primaryKey(),
		secret: text('secret').notNull(),
		backupCodes: text('backup_codes').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		verified: boolean('verified').default(true),
		failedVerificationCount: integer('failed_verification_count').default(0),
		lockedUntil: timestamp('locked_until')
	},
	(table) => [
		index('two_factor_secret_idx').on(table.secret),
		index('two_factor_user_id_idx').on(table.userId)
	]
);

export const apikey = sqliteTable('apikey', {
	id: text('id').primaryKey(),
	configId: text('config_id').notNull().default('default'),
	name: text('name'),
	start: text('start'),
	prefix: text('prefix'),
	key: text('key').notNull(),
	referenceId: text('reference_id').notNull(),
	refillInterval: integer('refill_interval'),
	refillAmount: integer('refill_amount'),
	lastRefillAt: timestamp('last_refill_at'),
	enabled: boolean('enabled').default(true),
	rateLimitEnabled: boolean('rate_limit_enabled').default(true),
	rateLimitTimeWindow: integer('rate_limit_time_window').default(86400000),
	rateLimitMax: integer('rate_limit_max').default(10000),
	requestCount: integer('request_count').default(0),
	remaining: integer('remaining'),
	lastRequest: timestamp('last_request'),
	expiresAt: timestamp('expires_at'),
	createdAt: timestamp('created_at').notNull(),
	updatedAt: timestamp('updated_at').notNull(),
	permissions: text('permissions'),
	metadata: text('metadata')
});

/*
 * OAuth 2.1 (see ./pg.ts). Arrays and JSON are stored as JSON text, which better-auth's
 * drizzle adapter does for SQLite. For connecting Claude, ChatGPT and other MCP clients to `/mcp`
 * (`@better-auth/oauth-provider`). Present whether or not `oauth` is enabled, like
 * the two-factor table: the plugin is always registered and the option only
 * decides whether its endpoints answer. `referenceId` is the organization the user
 * picked when connecting, so a token only ever reaches that one.
 */
export const oauthClient = sqliteTable(
	'oauth_client',
	{
		id: text('id').primaryKey(),
		clientId: text('client_id').notNull().unique(),
		clientSecret: text('client_secret'),
		disabled: boolean('disabled').default(false),
		skipConsent: boolean('skip_consent'),
		enableEndSession: boolean('enable_end_session'),
		subjectType: text('subject_type'),
		scopes: text('scopes'),
		userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at'),
		updatedAt: timestamp('updated_at'),
		name: text('name'),
		uri: text('uri'),
		icon: text('icon'),
		contacts: text('contacts'),
		tos: text('tos'),
		policy: text('policy'),
		softwareId: text('software_id'),
		softwareVersion: text('software_version'),
		softwareStatement: text('software_statement'),
		redirectUris: text('redirect_uris').notNull(),
		postLogoutRedirectUris: text('post_logout_redirect_uris'),
		tokenEndpointAuthMethod: text('token_endpoint_auth_method'),
		grantTypes: text('grant_types'),
		responseTypes: text('response_types'),
		public: boolean('public'),
		type: text('type'),
		requirePKCE: boolean('require_pkce'),
		referenceId: text('reference_id'),
		metadata: text('metadata')
	},
	(table) => [index('oauth_client_user_id_idx').on(table.userId)]
);

export const oauthRefreshToken = sqliteTable(
	'oauth_refresh_token',
	{
		id: text('id').primaryKey(),
		token: text('token').notNull().unique(),
		clientId: text('client_id')
			.notNull()
			.references(() => oauthClient.clientId, { onDelete: 'cascade' }),
		sessionId: text('session_id').references(() => session.id, { onDelete: 'set null' }),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		referenceId: text('reference_id'),
		expiresAt: timestamp('expires_at').notNull(),
		createdAt: timestamp('created_at').notNull(),
		revoked: timestamp('revoked'),
		authTime: timestamp('auth_time'),
		scopes: text('scopes').notNull()
	},
	(table) => [
		index('oauth_refresh_token_client_id_idx').on(table.clientId),
		index('oauth_refresh_token_session_id_idx').on(table.sessionId),
		index('oauth_refresh_token_user_id_idx').on(table.userId)
	]
);

export const oauthAccessToken = sqliteTable(
	'oauth_access_token',
	{
		id: text('id').primaryKey(),
		token: text('token').notNull().unique(),
		clientId: text('client_id')
			.notNull()
			.references(() => oauthClient.clientId, { onDelete: 'cascade' }),
		sessionId: text('session_id').references(() => session.id, { onDelete: 'set null' }),
		userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
		referenceId: text('reference_id'),
		refreshId: text('refresh_id').references(() => oauthRefreshToken.id, { onDelete: 'cascade' }),
		expiresAt: timestamp('expires_at').notNull(),
		createdAt: timestamp('created_at').notNull(),
		scopes: text('scopes').notNull()
	},
	(table) => [
		index('oauth_access_token_client_id_idx').on(table.clientId),
		index('oauth_access_token_session_id_idx').on(table.sessionId),
		index('oauth_access_token_user_id_idx').on(table.userId),
		index('oauth_access_token_refresh_id_idx').on(table.refreshId)
	]
);

export const oauthConsent = sqliteTable(
	'oauth_consent',
	{
		id: text('id').primaryKey(),
		clientId: text('client_id')
			.notNull()
			.references(() => oauthClient.clientId, { onDelete: 'cascade' }),
		userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
		referenceId: text('reference_id'),
		scopes: text('scopes').notNull(),
		createdAt: timestamp('created_at').notNull(),
		updatedAt: timestamp('updated_at').notNull()
	},
	(table) => [
		index('oauth_consent_client_id_idx').on(table.clientId),
		index('oauth_consent_user_id_idx').on(table.userId)
	]
);
