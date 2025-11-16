import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { b as private_env } from './shared-server-DaWdgxVh.js';
import { createPostgreSQLProvider } from '@aphexcms/postgresql-adapter';
import { userSessions, userProfiles, schemaTypes, schemaTypeEnum, organizations, organizationRoleEnum, organizationMembers, invitations, documents, documentStatusEnum, assets } from '@aphexcms/postgresql-adapter/schema';
import { pgTable, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

const cmsSchema = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  assets,
  documentStatusEnum,
  documents,
  invitations,
  organizationMembers,
  organizationRoleEnum,
  organizations,
  schemaTypeEnum,
  schemaTypes,
  userProfiles,
  userSessions
}, Symbol.toStringTag, { value: "Module" }));
const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
});
const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => /* @__PURE__ */ new Date()).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" })
});
const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
});
const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => /* @__PURE__ */ new Date()).notNull()
});
const apikey = pgTable("apikey", {
  id: text("id").primaryKey(),
  name: text("name"),
  start: text("start"),
  prefix: text("prefix"),
  key: text("key").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  refillInterval: integer("refill_interval"),
  refillAmount: integer("refill_amount"),
  lastRefillAt: timestamp("last_refill_at"),
  enabled: boolean("enabled").default(true),
  rateLimitEnabled: boolean("rate_limit_enabled").default(true),
  rateLimitTimeWindow: integer("rate_limit_time_window").default(864e5),
  rateLimitMax: integer("rate_limit_max").default(1e4),
  requestCount: integer("request_count").default(0),
  remaining: integer("remaining"),
  lastRequest: timestamp("last_request"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  permissions: text("permissions"),
  metadata: text("metadata")
});
const authSchema = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  account,
  apikey,
  session,
  user,
  verification
}, Symbol.toStringTag, { value: "Module" }));
const schema = {
  ...cmsSchema,
  ...authSchema
};
if (!private_env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
const client = postgres(private_env.DATABASE_URL, { max: 10 });
const drizzleDb = drizzle(client, { schema });
const provider = createPostgreSQLProvider({ client });
const adapter = provider.createAdapter();
const db = adapter;

export { drizzleDb as a, apikey as b, db as d, user as u };
//# sourceMappingURL=index3-D3XGwzxA.js.map
