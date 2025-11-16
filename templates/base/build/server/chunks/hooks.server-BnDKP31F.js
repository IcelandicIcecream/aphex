import { m as merge_tracing } from './index-D9rsbaQA.js';
import { l as get_request_store, w as with_request_store } from './exports-Honk4keX.js';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { r as redirect } from './index-CpeNL06-.js';
import { A as AuthError } from './service-CEhtyGUm.js';
import { c as createStorageAdapter } from './storage-_ubboXxO.js';
import sharp from 'sharp';
import { P as PermissionChecker } from './permissions-CiX-uXr2.js';
import { c as cmsConfig } from './aphex.config-m9M2q4ce.js';
import { a as auth } from './instance-CdYwVbs3.js';
import './index3-D3XGwzxA.js';
import './events-DlbR6UiW.js';
import './context-DL4CYGHS.js';
import './index2-PlYtOn9l.js';
import './index-BKwQgGLQ.js';
import './routing-lpprPii4.js';
import './shared-server-DaWdgxVh.js';
import './utils-gGoUUMc2.js';
import 'drizzle-orm';
import 'fs/promises';
import 'path';
import './index6-BnUmswa-.js';
import './list-todo-oKtgC1b1.js';
import './Icon-DHGqHCBy.js';
import './index4-DKPpYvdn.js';
import './instance2-stPrjck3.js';
import 'better-auth';
import 'better-auth/plugins';
import 'better-auth/adapters/drizzle';
import 'better-auth/api';
import '@aphexcms/resend-adapter';
import 'drizzle-orm/postgres-js';
import 'postgres';
import '@aphexcms/postgresql-adapter';
import '@aphexcms/postgresql-adapter/schema';
import 'drizzle-orm/pg-core';

let building = false;

/** @import { Handle, RequestEvent, ResolveOptions } from '@sveltejs/kit' */
/** @import { MaybePromise } from 'types' */

/**
 * A helper function for sequencing multiple `handle` calls in a middleware-like manner.
 * The behavior for the `handle` options is as follows:
 * - `transformPageChunk` is applied in reverse order and merged
 * - `preload` is applied in forward order, the first option "wins" and no `preload` options after it are called
 * - `filterSerializedResponseHeaders` behaves the same as `preload`
 *
 * ```js
 * /// file: src/hooks.server.js
 * import { sequence } from '@sveltejs/kit/hooks';
 *
 * /// type: import('@sveltejs/kit').Handle
 * async function first({ event, resolve }) {
 * 	console.log('first pre-processing');
 * 	const result = await resolve(event, {
 * 		transformPageChunk: ({ html }) => {
 * 			// transforms are applied in reverse order
 * 			console.log('first transform');
 * 			return html;
 * 		},
 * 		preload: () => {
 * 			// this one wins as it's the first defined in the chain
 * 			console.log('first preload');
 * 			return true;
 * 		}
 * 	});
 * 	console.log('first post-processing');
 * 	return result;
 * }
 *
 * /// type: import('@sveltejs/kit').Handle
 * async function second({ event, resolve }) {
 * 	console.log('second pre-processing');
 * 	const result = await resolve(event, {
 * 		transformPageChunk: ({ html }) => {
 * 			console.log('second transform');
 * 			return html;
 * 		},
 * 		preload: () => {
 * 			console.log('second preload');
 * 			return true;
 * 		},
 * 		filterSerializedResponseHeaders: () => {
 * 			// this one wins as it's the first defined in the chain
 * 			console.log('second filterSerializedResponseHeaders');
 * 			return true;
 * 		}
 * 	});
 * 	console.log('second post-processing');
 * 	return result;
 * }
 *
 * export const handle = sequence(first, second);
 * ```
 *
 * The example above would print:
 *
 * ```
 * first pre-processing
 * first preload
 * second pre-processing
 * second filterSerializedResponseHeaders
 * second transform
 * first transform
 * second post-processing
 * first post-processing
 * ```
 *
 * @param {...Handle} handlers The chain of `handle` functions
 * @returns {Handle}
 */
function sequence(...handlers) {
	const length = handlers.length;
	if (!length) return ({ event, resolve }) => resolve(event);

	return ({ event, resolve }) => {
		const { state } = get_request_store();
		return apply_handle(0, event, {});

		/**
		 * @param {number} i
		 * @param {RequestEvent} event
		 * @param {ResolveOptions | undefined} parent_options
		 * @returns {MaybePromise<Response>}
		 */
		function apply_handle(i, event, parent_options) {
			const handle = handlers[i];

			return state.tracing.record_span({
				name: `sveltekit.handle.sequenced.${handle.name ? handle.name : i}`,
				attributes: {},
				fn: async (current) => {
					const traced_event = merge_tracing(event, current);
					return await with_request_store({ event: traced_event, state }, () =>
						handle({
							event: traced_event,
							resolve: (event, options) => {
								/** @type {ResolveOptions['transformPageChunk']} */
								const transformPageChunk = async ({ html, done }) => {
									if (options?.transformPageChunk) {
										html = (await options.transformPageChunk({ html, done })) ?? '';
									}

									if (parent_options?.transformPageChunk) {
										html = (await parent_options.transformPageChunk({ html, done })) ?? '';
									}

									return html;
								};

								/** @type {ResolveOptions['filterSerializedResponseHeaders']} */
								const filterSerializedResponseHeaders =
									parent_options?.filterSerializedResponseHeaders ??
									options?.filterSerializedResponseHeaders;

								/** @type {ResolveOptions['preload']} */
								const preload = parent_options?.preload ?? options?.preload;

								return i < length - 1
									? apply_handle(i + 1, event, {
											transformPageChunk,
											filterSerializedResponseHeaders,
											preload
										})
									: resolve(event, {
											transformPageChunk,
											filterSerializedResponseHeaders,
											preload
										});
							}
						})
					);
				}
			});
		}
	};
}

async function handleAuthHook(event, config, authProvider, db) {
  const path = event.url.pathname;
  if (path.startsWith("/admin")) {
    try {
      const session = await authProvider.requireSession(event.request, db);
      event.locals.auth = session;
    } catch (error) {
      if (error instanceof AuthError) {
        const loginUrl = config.auth?.loginUrl || "/login";
        throw redirect(302, `${loginUrl}?error=${error.code}`);
      }
      throw redirect(302, config.auth?.loginUrl || "/login");
    }
  }
  if (path.startsWith("/assets/") || path.startsWith("/media/")) {
    let auth2 = await authProvider.getSession(event.request, db);
    if (!auth2) {
      auth2 = await authProvider.validateApiKey(event.request, db);
    }
    if (auth2) {
      event.locals.auth = auth2;
    }
  }
  if (path.startsWith("/api/")) {
    if (path.startsWith("/api/auth")) {
      return null;
    }
    const hasApiKey = event.request.headers.has("x-api-key");
    let auth2 = null;
    if (hasApiKey) {
      auth2 = await authProvider.validateApiKey(event.request, db);
    } else {
      auth2 = await authProvider.getSession(event.request, db);
    }
    let graphqlEndpoint;
    const hasGraphQLPlugin = config.plugins?.some((p) => {
      if (typeof p === "string")
        return p === "@aphexcms/graphql-plugin";
      if (typeof p === "object")
        return p.name === "@aphexcms/graphql-plugin";
      return false;
    });
    if (hasGraphQLPlugin) {
      graphqlEndpoint = "/api/graphql";
    }
    const protectedApiRoutes = [
      "/api/documents",
      "/api/assets",
      "/api/schemas",
      "/api/organizations",
      "/api/settings"
    ];
    if (graphqlEndpoint) {
      protectedApiRoutes.push(graphqlEndpoint);
    }
    const isProtectedRoute = protectedApiRoutes.some((route) => path.startsWith(route));
    if (isProtectedRoute && !auth2) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }
    if (auth2 && ["POST", "PUT", "PATCH", "DELETE"].includes(event.request.method)) {
      if (graphqlEndpoint && path.startsWith(graphqlEndpoint)) {
        const requestBody = await event.request.clone().text();
        const isMutation = requestBody.trim().startsWith("mutation");
        if (isMutation && auth2.type === "api_key" && !auth2.permissions.includes("write")) {
          return new Response(JSON.stringify({ error: "Forbidden: Write permission required for mutations" }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
          });
        }
      } else {
        if (auth2.type === "api_key" && !auth2.permissions.includes("write")) {
          return new Response(JSON.stringify({ error: "Forbidden: Write permission required" }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
          });
        }
      }
    }
    if (auth2) {
      event.locals.auth = auth2;
    }
  }
  if (!event.locals.auth) {
    const auth2 = await authProvider.getSession(event.request, db);
    if (auth2) {
      event.locals.auth = auth2;
    }
  }
  return null;
}
class AssetService {
  storage;
  database;
  constructor(storage, database) {
    this.storage = storage;
    this.database = database;
  }
  /**
   * Upload and store an asset
   */
  async uploadAsset(organizationId, data) {
    const assetType = data.mimeType.startsWith("image/") ? "image" : "file";
    let width;
    let height;
    let metadata = {
      // Include field metadata for privacy checking
      ...data.metadata
    };
    if (assetType === "image") {
      try {
        const imageMetadata = await sharp(data.buffer).metadata();
        width = imageMetadata.width;
        height = imageMetadata.height;
        metadata = {
          ...metadata,
          // Keep schemaType and fieldPath
          format: imageMetadata.format,
          space: imageMetadata.space,
          channels: imageMetadata.channels,
          density: imageMetadata.density,
          hasProfile: imageMetadata.hasProfile,
          hasAlpha: imageMetadata.hasAlpha
        };
        const stats = await sharp(data.buffer).stats();
        metadata.dominantColor = stats.dominant;
      } catch (error) {
        console.warn("Could not extract image metadata:", error);
      }
    }
    const storageFile = await this.storage.store({
      buffer: data.buffer,
      filename: data.originalFilename,
      mimeType: data.mimeType,
      size: data.size
    });
    try {
      const asset = await this.database.createAsset({
        assetType,
        filename: storageFile.path.split("/").pop() || data.originalFilename,
        originalFilename: data.originalFilename,
        mimeType: data.mimeType,
        size: data.size,
        url: storageFile.url || "",
        // Empty for local storage initially
        path: storageFile.path,
        storageAdapter: this.storage.name,
        organizationId,
        width,
        height,
        metadata,
        title: data.title || void 0,
        description: data.description || void 0,
        alt: data.alt || void 0,
        creditLine: data.creditLine || void 0,
        createdBy: data.createdBy
      });
      if (!storageFile.url) {
        const cdnUrl = `/media/${asset.id}/${encodeURIComponent(asset.originalFilename)}`;
        asset.url = cdnUrl;
        await this.database.updateAsset(organizationId, asset.id, { url: cdnUrl });
      }
      return asset;
    } catch (error) {
      await this.storage.delete(storageFile.path);
      throw error;
    }
  }
  /**
   * Find asset by ID
   */
  async findAssetById(organizationId, id) {
    return await this.database.findAssetById(organizationId, id);
  }
  /**
   * Find asset by ID globally (bypasses organization filter for public asset access)
   * Only available on PostgreSQL adapter with RLS bypass
   */
  async findAssetByIdGlobal(id) {
    if ("findAssetByIdGlobal" in this.database && typeof this.database.findAssetByIdGlobal === "function") {
      console.log("[AssetService] Using findAssetByIdGlobal from adapter");
      return await this.database.findAssetByIdGlobal(id);
    }
    console.warn("[AssetService] findAssetByIdGlobal not supported by this database adapter");
    console.warn("[AssetService] Database adapter type:", this.database.constructor.name);
    console.warn("[AssetService] Available methods:", Object.getOwnPropertyNames(Object.getPrototypeOf(this.database)));
    return null;
  }
  /**
   * Find multiple assets with filtering
   */
  async findAssets(organizationId, filters = {}) {
    return await this.database.findAssets(organizationId, filters);
  }
  /**
   * Delete asset (both file and database record)
   *
   * Note: If the asset was stored by a different adapter (e.g., switching from R2 to local),
   * file deletion may fail. The database record will still be removed for a clean state.
   */
  async deleteAsset(organizationId, id) {
    const asset = await this.database.findAssetById(organizationId, id);
    if (!asset) {
      return false;
    }
    if (asset.storageAdapter === this.storage.name) {
      try {
        await this.storage.delete(asset.path);
      } catch (error) {
        console.warn(`Failed to delete file from storage: ${asset.path}`, error);
      }
    } else {
      console.warn(`Asset ${id} was stored by '${asset.storageAdapter}' but current adapter is '${this.storage.name}'. File at ${asset.path} may need manual cleanup.`);
    }
    return await this.database.deleteAsset(organizationId, id);
  }
  /**
   * Update asset metadata
   */
  async updateAssetMetadata(organizationId, id, metadata) {
    return await this.database.updateAsset(organizationId, id, metadata);
  }
  /**
   * Get asset statistics
   */
  async getAssetStats(organizationId) {
    const [totalAssets, assetsByType, totalSize] = await Promise.all([
      this.database.countAssets(organizationId),
      this.database.countAssetsByType(organizationId),
      this.database.getTotalAssetsSize(organizationId)
    ]);
    return {
      totalAssets,
      totalImages: assetsByType.image || 0,
      totalFiles: assetsByType.file || 0,
      totalSize
    };
  }
  /**
   * Get health status of both storage and database
   */
  async getHealthStatus() {
    const [storageHealthy, databaseHealthy] = await Promise.all([
      this.storage.isHealthy(),
      this.database.isHealthy()
    ]);
    return {
      storage: storageHealthy,
      database: databaseHealthy
    };
  }
}
class CMSEngine {
  db;
  config;
  constructor(config, dbAdapter) {
    this.config = config;
    this.db = dbAdapter;
  }
  // Update config dynamically (for schema hot-reloading)
  updateConfig(newConfig) {
    this.config = newConfig;
    console.log("🔄 CMS config updated:", {
      schemaTypes: newConfig.schemaTypes.length,
      documents: newConfig.schemaTypes.filter((t) => t.type === "document").length,
      objects: newConfig.schemaTypes.filter((t) => t.type === "object").length
    });
  }
  // Initialize CMS - register schema types in database
  async initialize() {
    console.log("🚀 Initializing CMS...");
    const existingSchemas = await this.db.listSchemas();
    const existingNames = new Set(existingSchemas.map((s) => s.name));
    const currentNames = new Set(this.config.schemaTypes.map((s) => s.name));
    for (const existingName of existingNames) {
      if (!currentNames.has(existingName)) {
        await this.db.deleteSchemaType(existingName);
      }
    }
    for (const schemaType of this.config.schemaTypes) {
      await this.db.registerSchemaType(schemaType);
    }
    console.log("✅ CMS initialized successfully");
  }
  // Schema Type utility methods
  async getSchemaType(name) {
    return this.db.getSchemaType(name);
  }
  async listSchemas() {
    return this.db.listSchemas();
  }
  getSchemaTypeByName(name) {
    return this.config.schemaTypes.find((s) => s.name === name) || null;
  }
  async listDocumentTypes() {
    return this.db.listDocumentTypes();
  }
  async listObjectTypes() {
    return this.db.listObjectTypes();
  }
}
let cmsInstance = null;
function createCMS(config, dbAdapter) {
  if (!cmsInstance) {
    cmsInstance = new CMSEngine(config, dbAdapter);
  }
  return cmsInstance;
}
class Rule {
  _required = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _rules = [];
  _level = "error";
  _message;
  static FIELD_REF = Symbol("fieldReference");
  static valueOfField(path) {
    return {
      __fieldReference: true,
      path
    };
  }
  valueOfField(path) {
    return Rule.valueOfField(path);
  }
  required() {
    const newRule = this.clone();
    newRule._required = true;
    return newRule;
  }
  optional() {
    const newRule = this.clone();
    newRule._required = false;
    return newRule;
  }
  min(len) {
    const newRule = this.clone();
    newRule._rules.push({ type: "min", constraint: len });
    return newRule;
  }
  max(len) {
    const newRule = this.clone();
    newRule._rules.push({ type: "max", constraint: len });
    return newRule;
  }
  length(len) {
    const newRule = this.clone();
    newRule._rules.push({ type: "length", constraint: len });
    return newRule;
  }
  email() {
    const newRule = this.clone();
    newRule._rules.push({ type: "email" });
    return newRule;
  }
  uri(options) {
    const newRule = this.clone();
    newRule._rules.push({ type: "uri", constraint: options });
    return newRule;
  }
  regex(pattern, name) {
    const newRule = this.clone();
    newRule._rules.push({ type: "regex", constraint: { pattern, name } });
    return newRule;
  }
  positive() {
    const newRule = this.clone();
    newRule._rules.push({ type: "positive" });
    return newRule;
  }
  negative() {
    const newRule = this.clone();
    newRule._rules.push({ type: "negative" });
    return newRule;
  }
  integer() {
    const newRule = this.clone();
    newRule._rules.push({ type: "integer" });
    return newRule;
  }
  greaterThan(num) {
    const newRule = this.clone();
    newRule._rules.push({ type: "greaterThan", constraint: num });
    return newRule;
  }
  lessThan(num) {
    const newRule = this.clone();
    newRule._rules.push({ type: "lessThan", constraint: num });
    return newRule;
  }
  custom(fn) {
    const newRule = this.clone();
    newRule._rules.push({ type: "custom", constraint: fn });
    return newRule;
  }
  error(message) {
    const newRule = this.clone();
    newRule._level = "error";
    newRule._message = message;
    return newRule;
  }
  warning(message) {
    const newRule = this.clone();
    newRule._level = "warning";
    newRule._message = message;
    return newRule;
  }
  info(message) {
    const newRule = this.clone();
    newRule._level = "info";
    newRule._message = message;
    return newRule;
  }
  clone() {
    const newRule = new Rule();
    newRule._required = this._required;
    newRule._rules = [...this._rules];
    newRule._level = this._level;
    newRule._message = this._message;
    return newRule;
  }
  async validate(value, context = {}) {
    const markers = [];
    if (this._required && (value === void 0 || value === null || value === "")) {
      markers.push({
        level: this._level,
        message: this._message || "Required",
        path: context.path
      });
    }
    if (!this._required && (value === void 0 || value === null || value === "")) {
      return markers;
    }
    for (const rule of this._rules) {
      try {
        const result = await this.validateRule(rule, value, context);
        if (result) {
          markers.push({
            level: this._level,
            message: this._message || result,
            path: context.path
          });
        }
      } catch (error) {
        markers.push({
          level: "error",
          message: `Validation error: ${error instanceof Error ? error.message : "Unknown error"}`,
          path: context.path
        });
      }
    }
    return markers;
  }
  async validateRule(rule, value, context) {
    switch (rule.type) {
      case "min":
        if (typeof value === "string" && value.length < rule.constraint) {
          return `Must be at least ${rule.constraint} characters`;
        }
        if (typeof value === "number" && value < rule.constraint) {
          return `Must be at least ${rule.constraint}`;
        }
        break;
      case "max":
        if (typeof value === "string" && value.length > rule.constraint) {
          return `Must be at most ${rule.constraint} characters`;
        }
        if (typeof value === "number" && value > rule.constraint) {
          return `Must be at most ${rule.constraint}`;
        }
        break;
      case "email":
        if (typeof value === "string" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return "Must be a valid email address";
        }
        break;
      case "uri":
        if (typeof value === "string") {
          try {
            new URL(value);
          } catch {
            return "Must be a valid URL";
          }
        }
        break;
      case "regex":
        if (typeof value === "string" && !rule.constraint.pattern.test(value)) {
          return `Must match pattern${rule.constraint.name ? ` (${rule.constraint.name})` : ""}`;
        }
        break;
      case "positive":
        if (typeof value === "number" && value <= 0) {
          return "Must be positive";
        }
        break;
      case "negative":
        if (typeof value === "number" && value >= 0) {
          return "Must be negative";
        }
        break;
      case "integer":
        if (typeof value === "number" && !Number.isInteger(value)) {
          return "Must be an integer";
        }
        break;
      case "custom": {
        const customResult = await rule.constraint(value, context);
        if (customResult === false) {
          return "Validation failed";
        }
        if (typeof customResult === "string") {
          return customResult;
        }
        if (Array.isArray(customResult) && customResult.length > 0) {
          return customResult[0].message;
        }
        break;
      }
    }
    return null;
  }
  isRequired() {
    return this._required;
  }
}
async function validateField(field, value, context = {}) {
  if (!field.validation) {
    return { isValid: true, errors: [] };
  }
  try {
    const validationFunctions = Array.isArray(field.validation) ? field.validation : [field.validation];
    const allErrors = [];
    for (const validationFn of validationFunctions) {
      const rule = validationFn(new Rule());
      if (!(rule instanceof Rule)) {
        console.error(`Validation function for field "${field.name}" did not return a Rule object. Make sure you are chaining validation methods and returning the result.`);
        continue;
      }
      const markers = await rule.validate(value, {
        path: [field.name],
        ...context
      });
      allErrors.push(...markers.map((marker) => ({
        level: marker.level,
        message: marker.message
      })));
    }
    const isValid = allErrors.filter((e) => e.level === "error").length === 0;
    return { isValid, errors: allErrors };
  } catch (error) {
    console.error("Validation error:", error);
    return {
      isValid: false,
      errors: [{ level: "error", message: "Validation failed" }]
    };
  }
}
async function validateDocumentData(schema, data, context = {}) {
  const validationErrors = [];
  for (const field of schema.fields) {
    const value = data[field.name];
    const result = await validateField(field, value, { ...context, ...data });
    if (!result.isValid) {
      const errorMessages = result.errors.filter((e) => e.level === "error").map((e) => e.message);
      if (errorMessages.length > 0) {
        validationErrors.push({
          field: field.name,
          errors: errorMessages
        });
      }
    }
  }
  return {
    isValid: validationErrors.length === 0,
    errors: validationErrors
  };
}
function transformDocument(doc, perspective = "draft") {
  const data = perspective === "draft" ? doc.draftData : doc.publishedData;
  return {
    id: doc.id,
    ...data,
    // Include metadata fields
    _meta: {
      type: doc.type,
      status: doc.status,
      organizationId: doc.organizationId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      createdBy: doc.createdBy,
      updatedBy: doc.updatedBy,
      publishedAt: doc.publishedAt,
      publishedHash: doc.publishedHash
    }
  };
}
class CollectionAPI {
  collectionName;
  databaseAdapter;
  _schema;
  permissions;
  constructor(collectionName, databaseAdapter, _schema, permissions) {
    this.collectionName = collectionName;
    this.databaseAdapter = databaseAdapter;
    this._schema = _schema;
    this.permissions = permissions;
    this.permissions.validateCollection(collectionName);
  }
  /**
   * Get the schema for this collection
   */
  get schema() {
    return this._schema;
  }
  /**
   * Find multiple documents with advanced filtering and pagination
   *
   * @example
   * ```typescript
   * const result = await api.collections.pages.find(
   *   { organizationId: 'org_123', user },
   *   {
   *     where: {
   *       status: { equals: 'published' },
   *       'author.name': { contains: 'John' }
   *     },
   *     limit: 20,
   *     sort: '-publishedAt'
   *   }
   * );
   * ```
   */
  async find(context, options = {}) {
    await this.permissions.canRead(context, this.collectionName);
    const result = await this.databaseAdapter.findManyDocAdvanced(context.organizationId, this.collectionName, options);
    const perspective = options.perspective || "draft";
    const transformedDocs = result.docs.map((doc) => transformDocument(doc, perspective));
    return {
      ...result,
      docs: transformedDocs
    };
  }
  /**
   * Find a single document by ID
   *
   * @example
   * ```typescript
   * const page = await api.collections.pages.findByID(
   *   { organizationId: 'org_123', user },
   *   'doc_123',
   *   { depth: 1, perspective: 'published' }
   * );
   * ```
   */
  async findByID(context, id, options) {
    await this.permissions.canRead(context, this.collectionName);
    const result = await this.databaseAdapter.findByDocIdAdvanced(context.organizationId, id, options);
    if (!result) {
      return null;
    }
    const perspective = options?.perspective || "draft";
    return transformDocument(result, perspective);
  }
  /**
   * Count documents matching a where clause
   *
   * @example
   * ```typescript
   * const count = await api.collections.pages.count(
   *   { organizationId: 'org_123', user },
   *   { where: { status: { equals: 'published' } } }
   * );
   * ```
   */
  async count(context, options) {
    await this.permissions.canRead(context, this.collectionName);
    return this.databaseAdapter.countDocuments(context.organizationId, this.collectionName, options?.where);
  }
  /**
   * Create a new document
   *
   * @example
   * ```typescript
   * const page = await api.collections.pages.create(
   *   { organizationId: 'org_123', user },
   *   {
   *     title: 'New Page',
   *     slug: 'new-page',
   *     content: []
   *   }
   * );
   * ```
   */
  async create(context, data, options) {
    await this.permissions.canWrite(context, this.collectionName);
    if (options?.publish) {
      await this.permissions.canPublish(context, this.collectionName);
      const validationResult = await validateDocumentData(this._schema, data, data);
      if (!validationResult.isValid) {
        const errorMessage = validationResult.errors.map((e) => `${e.field}: ${e.errors.join(", ")}`).join("; ");
        throw new Error(`Cannot publish: validation errors - ${errorMessage}`);
      }
    }
    const document = await this.databaseAdapter.createDocument({
      organizationId: context.organizationId,
      type: this.collectionName,
      draftData: data,
      createdBy: context.user?.id
    });
    if (options?.publish) {
      const published = await this.databaseAdapter.publishDoc(context.organizationId, document.id);
      if (published) {
        return transformDocument(published, "published");
      }
    }
    return transformDocument(document, "draft");
  }
  /**
   * Update an existing document
   *
   * @example
   * ```typescript
   * const updated = await api.collections.pages.update(
   *   { organizationId: 'org_123', user },
   *   'doc_123',
   *   { title: 'Updated Title' },
   *   { publish: true }
   * );
   * ```
   */
  async update(context, id, data, options) {
    await this.permissions.canWrite(context, this.collectionName);
    const document = await this.databaseAdapter.updateDocDraft(context.organizationId, id, data, context.user?.id);
    if (!document) {
      return null;
    }
    if (options?.publish) {
      await this.permissions.canPublish(context, this.collectionName);
      const validationResult = await validateDocumentData(this._schema, document.draftData, document.draftData);
      if (!validationResult.isValid) {
        const errorMessage = validationResult.errors.map((e) => `${e.field}: ${e.errors.join(", ")}`).join("; ");
        throw new Error(`Cannot publish: validation errors - ${errorMessage}`);
      }
      const published = await this.databaseAdapter.publishDoc(context.organizationId, document.id);
      if (published) {
        return transformDocument(published, "published");
      }
    }
    return transformDocument(document, "draft");
  }
  /**
   * Delete a document
   *
   * @example
   * ```typescript
   * const deleted = await api.collections.pages.delete(
   *   { organizationId: 'org_123', user },
   *   'doc_123'
   * );
   * ```
   */
  async delete(context, id) {
    await this.permissions.canDelete(context, this.collectionName);
    return this.databaseAdapter.deleteDocById(context.organizationId, id);
  }
  /**
   * Publish a document
   *
   * @example
   * ```typescript
   * const published = await api.collections.pages.publish(
   *   { organizationId: 'org_123', user },
   *   'doc_123'
   * );
   * ```
   */
  async publish(context, id) {
    await this.permissions.canPublish(context, this.collectionName);
    const document = await this.databaseAdapter.findByDocId(context.organizationId, id);
    if (!document || !document.draftData) {
      throw new Error("Document not found or has no draft content to publish");
    }
    const validationResult = await validateDocumentData(this._schema, document.draftData, document.draftData);
    if (!validationResult.isValid) {
      const errorMessage = validationResult.errors.map((e) => `${e.field}: ${e.errors.join(", ")}`).join("; ");
      throw new Error(`Cannot publish: validation errors - ${errorMessage}`);
    }
    const publishedDocument = await this.databaseAdapter.publishDoc(context.organizationId, id);
    if (!publishedDocument) {
      return null;
    }
    return transformDocument(publishedDocument, "published");
  }
  /**
   * Unpublish a document
   *
   * @example
   * ```typescript
   * const unpublished = await api.collections.pages.unpublish(
   *   { organizationId: 'org_123', user },
   *   'doc_123'
   * );
   * ```
   */
  async unpublish(context, id) {
    await this.permissions.canPublish(context, this.collectionName);
    const document = await this.databaseAdapter.unpublishDoc(context.organizationId, id);
    if (!document) {
      return null;
    }
    return transformDocument(document, "draft");
  }
}
class LocalAPI {
  config;
  collections = {};
  userAdapter;
  systemAdapter;
  permissions;
  schemas;
  constructor(config, userAdapter, systemAdapter) {
    this.config = config;
    this.userAdapter = userAdapter;
    this.systemAdapter = systemAdapter || null;
    this.schemas = new Map(config.schemaTypes.filter((schema) => schema.type === "document").map((schema) => [schema.name, schema]));
    this.permissions = new PermissionChecker(config, this.schemas);
    this.initializeCollections();
  }
  /**
   * Initialize collection APIs for all document schema types
   */
  initializeCollections() {
    const documentSchemas = this.config.schemaTypes.filter((s) => s.type === "document");
    for (const schema of documentSchemas) {
      const collectionAPI = new Proxy(new CollectionAPI(schema.name, this.userAdapter, schema, this.permissions), {
        get: (target, prop) => {
          const method = target[prop];
          if (typeof method === "function") {
            return async (...args) => {
              const context = args[0];
              const adapter = this.getAdapter(context);
              const api = new CollectionAPI(schema.name, adapter, schema, this.permissions);
              return api[prop].apply(api, args);
            };
          }
          return method;
        }
      });
      this.collections[schema.name] = collectionAPI;
    }
  }
  /**
   * Get the appropriate database adapter based on context
   * Uses system adapter if overrideAccess is true, otherwise uses user adapter
   */
  getAdapter(context) {
    if (context.overrideAccess && this.systemAdapter) {
      return this.systemAdapter;
    }
    return this.userAdapter;
  }
  /**
   * Get list of available collection names
   */
  getCollectionNames() {
    return Array.from(this.schemas.keys());
  }
  /**
   * Check if a collection exists
   */
  hasCollection(name) {
    return this.schemas.has(name);
  }
  /**
   * Get schema for a collection
   */
  getCollectionSchema(name) {
    return this.schemas.get(name);
  }
}
let localAPIInstance = null;
function createLocalAPI(config, userAdapter, systemAdapter) {
  localAPIInstance = new LocalAPI(config, userAdapter, systemAdapter);
  return localAPIInstance;
}
let cmsInstances = null;
let lastConfigHash = null;
function getConfigHash(config) {
  const schemaNames = config.schemaTypes.map((s) => `${s.name}:${s.fields.length}:${JSON.stringify(s.fields)}`).join(",");
  return schemaNames;
}
function createDefaultStorageAdapter() {
  return createStorageAdapter("local", {
    basePath: "./storage/assets",
    // Private storage - not in static/, not served in production
    baseUrl: ""
    // No direct URL - all access through /assets/{id}/{filename}
  });
}
async function resolvePlugin(pluginConfig) {
  if (typeof pluginConfig === "object" && "install" in pluginConfig) {
    return pluginConfig;
  }
  if (typeof pluginConfig === "string") {
    try {
      const pluginModule = await import(
        /* @vite-ignore */
        pluginConfig
      );
      const plugin = pluginModule.default || pluginModule;
      if (typeof plugin === "function") {
        return plugin();
      }
      return plugin;
    } catch (error) {
      throw new Error(`Failed to load plugin "${pluginConfig}". Make sure it's installed: npm install ${pluginConfig}
Error: ${error}`);
    }
  }
  if (typeof pluginConfig === "object" && "name" in pluginConfig) {
    try {
      const pluginModule = await import(
        /* @vite-ignore */
        pluginConfig.name
      );
      const pluginFactory = pluginModule.default || pluginModule;
      if (typeof pluginFactory === "function") {
        return pluginFactory(pluginConfig.options || {});
      }
      return pluginFactory;
    } catch (error) {
      throw new Error(`Failed to load plugin "${pluginConfig.name}". Make sure it's installed: npm install ${pluginConfig.name}
Error: ${error}`);
    }
  }
  throw new Error(`Invalid plugin configuration: ${JSON.stringify(pluginConfig)}`);
}
function createCMSHook(config) {
  return async ({ event, resolve }) => {
    const currentConfigHash = getConfigHash(config);
    const configChanged = lastConfigHash !== null && currentConfigHash !== lastConfigHash;
    if (!cmsInstances) {
      console.log("🚀 Initializing CMS...");
      const databaseAdapter = config.database;
      const storageAdapter = config.storage ?? createDefaultStorageAdapter();
      const emailAdapter = config.email ?? null;
      const assetService = new AssetService(storageAdapter, databaseAdapter);
      const cmsEngine = createCMS(config, databaseAdapter);
      const localAPI = createLocalAPI(config, databaseAdapter);
      await cmsEngine.initialize();
      const pluginRoutes = /* @__PURE__ */ new Map();
      if (config.plugins && config.plugins.length > 0) {
        for (const pluginConfig of config.plugins) {
          try {
            const plugin = await resolvePlugin(pluginConfig);
            console.log(`🔌 Loading plugin: ${plugin.name}@${plugin.version}`);
            if (plugin.routes) {
              for (const [path, handler] of Object.entries(plugin.routes)) {
                pluginRoutes.set(path, { handler, pluginName: plugin.name });
              }
            }
            const tempInstances = {
              config,
              databaseAdapter,
              assetService,
              storageAdapter,
              emailAdapter,
              cmsEngine,
              localAPI,
              auth: config.auth?.provider,
              pluginRoutes
            };
            console.log(`🔌 Installing plugin: ${plugin.name}`);
            await plugin.install(tempInstances);
          } catch (error) {
            console.error(`❌ Failed to load/install plugin:`, error);
            throw error;
          }
        }
      }
      cmsInstances = {
        config,
        databaseAdapter,
        assetService,
        storageAdapter,
        emailAdapter,
        cmsEngine,
        localAPI,
        auth: config.auth?.provider,
        pluginRoutes
      };
      lastConfigHash = currentConfigHash;
    } else if (configChanged) {
      console.log("🔄 Schema types changed, re-syncing...");
      console.log("Old hash:", lastConfigHash?.substring(0, 100) + "...");
      console.log("New hash:", currentConfigHash.substring(0, 100) + "...");
      console.log("Schema types being updated:", config.schemaTypes.map((s) => s.name));
      cmsInstances.cmsEngine.updateConfig(config);
      await cmsInstances.cmsEngine.initialize();
      lastConfigHash = currentConfigHash;
      console.log("✅ Schema sync complete");
    }
    event.locals.aphexCMS = cmsInstances;
    if (cmsInstances.auth) {
      const authResponse = await handleAuthHook(event, config, cmsInstances.auth, cmsInstances.databaseAdapter);
      if (authResponse)
        return authResponse;
    }
    if (cmsInstances.pluginRoutes && cmsInstances.pluginRoutes.size > 0) {
      const pluginRoute = cmsInstances.pluginRoutes.get(event.url.pathname);
      if (pluginRoute) {
        console.log(`🔌 Plugin ${pluginRoute.pluginName} handling route: ${event.url.pathname}`);
        return pluginRoute.handler(event);
      }
    }
    return resolve(event);
  };
}
const authHook = async ({ event, resolve }) => {
  return svelteKitHandler({ event, resolve, auth, building });
};
const aphexHook = createCMSHook(cmsConfig);
const handle = sequence(authHook, aphexHook);

export { handle };
//# sourceMappingURL=hooks.server-BnDKP31F.js.map
