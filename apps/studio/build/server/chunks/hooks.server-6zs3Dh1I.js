import { m as merge_tracing } from './index-D2kfQJW7.js';
import { g as get_request_store, a as with_request_store } from './exports-Ci9YzwMm.js';
import { r as redirect } from './index-BcOZ6EV9.js';
import './string-BWrpxotr.js';
import { b as auth } from './instance-BV3tjq30.js';
import { s as setLogLevel, c as cmsLogger } from './logger-C1WBmfZZ.js';
import { A as AuthError } from './auth-errors-BOr7Rsjn.js';
import { c as createStorageAdapter } from './storage-CxrQC-cN.js';
import sharp from 'sharp';
import { n as normalizeDateFields, R as Rule } from './date-utils-xyIWAIQq.js';
import { a as PermissionChecker } from './permissions-CxMoW_Gg.js';
import './index2-CZgae6HB.js';
import './button-1bYQaKO-.js';
import './badge-DEuvdmY7.js';
import './sheet-content-CfdNXqIw.js';
import './client-BGGljB7r.js';
import './states.svelte-CxCkWsnb.js';
import './index3-BFl01i1Z.js';
import './events-C5y5VZ_W.js';
import './context-CAhUmS6w.js';
import './index5-DltsKoco.js';
import './routing-Dq0DhfOc.js';
import './shared-server-BmU87nph.js';
import './utils-FiC4zhrQ.js';
import './index8-DrQ5zxy0.js';
import 'events';
import 'url';
import 'util';
import 'fs';
import 'http';
import 'https';
import 'zlib';
import 'stream';
import 'net';
import 'dns';
import 'os';
import 'path';
import 'crypto';
import 'tls';
import 'child_process';
import './_commonjsHelpers-C1uiShF5.js';
import 'node:crypto';
import './html-FW6Ia4bL.js';
import '@better-auth/api-key';
import '@better-auth/drizzle-adapter';
import 'fs/promises';
import 'drizzle-orm/postgres-js';
import 'postgres';
import 'drizzle-orm';
import './content-hash-AOe_NOqf.js';
import 'drizzle-orm/pg-core';
import './utils2-CVx6kO_W.js';
import './create-id-BLMzD-FL.js';

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

class DocumentCache {
  constructor(adapter) {
    this.adapter = adapter;
  }
  async getDocument(orgId, docId) {
    return this.adapter.get(`doc:${orgId}:${docId}`);
  }
  async setDocument(orgId, docId, value) {
    await this.adapter.set(`doc:${orgId}:${docId}`, value);
  }
  async getQuery(orgId, collection, options) {
    return this.adapter.get(this.buildQueryKey(orgId, collection, options));
  }
  async setQuery(orgId, collection, options, value) {
    await this.adapter.set(this.buildQueryKey(orgId, collection, options), value);
  }
  async invalidateDocument(orgId, docId) {
    await this.adapter.delete(`doc:${orgId}:${docId}`);
  }
  async invalidateCollection(orgId, collection) {
    await this.adapter.invalidateByPrefix(`query:${orgId}:${collection}:`);
  }
  async flush() {
    await this.adapter.flush();
  }
  buildQueryKey(orgId, collection, options) {
    const normalized = JSON.stringify(options, Object.keys(options).sort());
    return `query:${orgId}:${collection}:${normalized}`;
  }
}
const RESERVED_FIELD_NAMES = [
  "id",
  "type",
  "status",
  "organizationId",
  "createdBy",
  "updatedBy",
  "createdAt",
  "updatedAt",
  "publishedAt",
  "draftData",
  "publishedData",
  "publishedHash"
];
function isReservedFieldName(fieldName) {
  return RESERVED_FIELD_NAMES.includes(fieldName);
}
function validateSchemaReferences(schemas) {
  const schemaNames = new Set(schemas.map((schema) => schema.name));
  const errors = [];
  const primitiveTypes = [
    "string",
    "text",
    "number",
    "boolean",
    "slug",
    "url",
    "image",
    "file",
    "date",
    "datetime",
    "reference"
  ];
  const validFieldTypes = [...primitiveTypes, "array", "object"];
  function validateField2(field, parentSchema) {
    if (!field.type) {
      errors.push(
        `Schema "${parentSchema}" field "${field.name || "unknown"}" is missing required "type" property`
      );
      return;
    }
    if (!validFieldTypes.includes(field.type)) {
      errors.push(
        `Schema "${parentSchema}" field "${field.name}" has invalid type "${field.type}". Valid types: ${validFieldTypes.join(", ")}`
      );
    }
    if (isReservedFieldName(field.name)) {
      errors.push(
        `Schema "${parentSchema}" uses reserved field name "${field.name}". Reserved names: ${RESERVED_FIELD_NAMES.join(", ")}`
      );
    }
    if (field.type === "array" && field.of) {
      for (const arrayType of field.of) {
        if (primitiveTypes.includes(arrayType.type)) {
          continue;
        }
        if (arrayType.type === "object" && arrayType.fields) {
          continue;
        }
        if (!schemaNames.has(arrayType.type)) {
          errors.push(
            `Schema "${parentSchema}" field "${field.name}" references unknown type "${arrayType.type}"`
          );
        }
      }
    }
    if (field.type === "object" && typeof field.fields === "string") {
      if (!schemaNames.has(field.fields)) {
        errors.push(
          `Schema "${parentSchema}" field "${field.name}" references unknown object type "${field.fields}"`
        );
      }
    }
    if (field.type === "reference" && "to" in field && field.to) {
      for (const target of field.to) {
        if (!schemaNames.has(target.type)) {
          errors.push(
            `Schema "${parentSchema}" field "${field.name}" references unknown document type "${target.type}"`
          );
        }
      }
    }
    if ("fields" in field && Array.isArray(field.fields)) {
      for (const nestedField of field.fields) {
        validateField2(nestedField, parentSchema);
      }
    }
  }
  for (const schema of schemas) {
    if (schema.type !== "document" && schema.type !== "object") {
      errors.push(
        `Schema "${schema.name}" has invalid type "${schema.type}". Must be "document" or "object"`
      );
    }
    if (schema.fields) {
      for (const field of schema.fields) {
        validateField2(field, schema.name);
      }
    }
    if (schema.preview?.select) {
      const fieldNames = new Set(schema.fields?.map((f) => f.name) || []);
      if (schema.preview.select.title && !fieldNames.has(schema.preview.select.title)) {
        errors.push(
          `Schema "${schema.name}" preview.select.title references unknown field "${schema.preview.select.title}"`
        );
      }
      if (schema.preview.select.subtitle && !fieldNames.has(schema.preview.select.subtitle)) {
        errors.push(
          `Schema "${schema.name}" preview.select.subtitle references unknown field "${schema.preview.select.subtitle}"`
        );
      }
      if (schema.preview.select.media && !fieldNames.has(schema.preview.select.media)) {
        errors.push(
          `Schema "${schema.name}" preview.select.media references unknown field "${schema.preview.select.media}"`
        );
      }
    }
    if (schema.orderings && schema.orderings.length > 0) {
      const fieldNames = new Set(schema.fields?.map((f) => f.name) || []);
      fieldNames.add("createdAt");
      fieldNames.add("updatedAt");
      for (const ordering of schema.orderings) {
        if (!ordering.name) {
          errors.push(`Schema "${schema.name}" has an ordering without a "name" property`);
          continue;
        }
        if (!ordering.title) {
          errors.push(
            `Schema "${schema.name}" ordering "${ordering.name}" is missing required "title" property`
          );
        }
        if (!ordering.by || ordering.by.length === 0) {
          errors.push(
            `Schema "${schema.name}" ordering "${ordering.name}" is missing required "by" array`
          );
          continue;
        }
        for (const orderItem of ordering.by) {
          if (!orderItem.field) {
            errors.push(
              `Schema "${schema.name}" ordering "${ordering.name}" has an item without a "field" property`
            );
            continue;
          }
          if (!fieldNames.has(orderItem.field)) {
            errors.push(
              `Schema "${schema.name}" ordering "${ordering.name}" references unknown field "${orderItem.field}"`
            );
          }
          if (orderItem.direction && orderItem.direction !== "asc" && orderItem.direction !== "desc") {
            errors.push(
              `Schema "${schema.name}" ordering "${ordering.name}" field "${orderItem.field}" has invalid direction "${orderItem.direction}". Must be "asc" or "desc"`
            );
          }
        }
      }
    }
  }
  if (errors.length > 0) {
    cmsLogger.error("[Schema]", "Validation errors:");
    errors.forEach((error) => cmsLogger.error("[Schema]", error));
    throw new Error(errors.join("\n"));
  }
  cmsLogger.info("[Schema]", "Validation passed - all references are valid");
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
    cmsLogger.info("[CMS]", "Config updated:", {
      schemaTypes: newConfig.schemaTypes.length,
      documents: newConfig.schemaTypes.filter((t) => t.type === "document").length,
      objects: newConfig.schemaTypes.filter((t) => t.type === "object").length
    });
  }
  // Initialize CMS - register schema types in database
  async initialize() {
    cmsLogger.info("[CMS]", "Initializing...");
    validateSchemaReferences(this.config.schemaTypes);
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
    cmsLogger.info("[CMS]", "Initialized successfully");
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
async function handleAuthHook(event, config, authProvider, db) {
  const path = event.url.pathname;
  if (path.startsWith("/admin")) {
    try {
      const session = await authProvider.requireSession(event.request, db);
      event.locals.auth = session;
    } catch (error) {
      if (error instanceof AuthError) {
        if (error.code === "pending_invitations") {
          throw redirect(302, "/invitations");
        }
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
    const graphqlEndpoint = config.graphql !== false ? typeof config.graphql === "object" ? config.graphql.path ?? "/api/graphql" : "/api/graphql" : void 0;
    const protectedApiRoutes = [
      "/api/documents",
      "/api/assets",
      "/api/schemas",
      "/api/organizations",
      "/api/invitations",
      "/api/settings",
      "/api/instance-settings"
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
      const readOnlyPostEndpoints = ["/api/documents/query"];
      const isReadOnlyPost = readOnlyPostEndpoints.some((route) => path === route);
      if (!isReadOnlyPost) {
        if (graphqlEndpoint && path.startsWith(graphqlEndpoint)) {
          const requestBody = await event.request.clone().text();
          const isMutation = requestBody.trim().startsWith("mutation");
          if (isMutation && auth2.type === "api_key" && !auth2.permissions.includes("write")) {
            return new Response(
              JSON.stringify({ error: "Forbidden: Write permission required for mutations" }),
              {
                status: 403,
                headers: { "Content-Type": "application/json" }
              }
            );
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
    }
    if (auth2) {
      event.locals.auth = auth2;
    }
  }
  if (!event.locals.auth) {
    try {
      const auth2 = await authProvider.getSession(event.request, db);
      if (auth2) {
        event.locals.auth = auth2;
      }
    } catch {
    }
  }
  return null;
}
class AssetService {
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
        cmsLogger.warn("Could not extract image metadata:", error);
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
      cmsLogger.debug("[AssetService] Using findAssetByIdGlobal from adapter");
      return await this.database.findAssetByIdGlobal(id);
    }
    cmsLogger.warn("[AssetService] findAssetByIdGlobal not supported by this database adapter");
    cmsLogger.warn("[AssetService] Database adapter type:", this.database.constructor.name);
    cmsLogger.warn(
      "[AssetService] Available methods:",
      Object.getOwnPropertyNames(Object.getPrototypeOf(this.database))
    );
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
        cmsLogger.warn(`Failed to delete file from storage: ${asset.path}`, error);
      }
    } else {
      cmsLogger.warn(
        `Asset ${id} was stored by '${asset.storageAdapter}' but current adapter is '${this.storage.name}'. File at ${asset.path} may need manual cleanup.`
      );
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
async function validateField(field, value, context = {}) {
  cmsLogger.debug("[validateField]", `Validating field "${field.name}"`, {
    type: field.type,
    value,
    hasValidation: !!field.validation
  });
  const allErrors = [];
  if (field.type === "date") {
    const dateField = field;
    const dateFormat = dateField.options?.dateFormat || "YYYY-MM-DD";
    cmsLogger.debug("[validateField]", `Adding automatic DATE validation for "${field.name}"`, {
      dateFormat
    });
    const autoRule = new Rule().date(dateFormat);
    const markers = await autoRule.validate(value, {
      path: [field.name],
      ...context
    });
    allErrors.push(
      ...markers.map((marker) => ({
        level: marker.level,
        message: marker.message
      }))
    );
  } else if (field.type === "datetime") {
    const dateTimeField = field;
    const dateFormat = dateTimeField.options?.dateFormat || "YYYY-MM-DD";
    const timeFormat = dateTimeField.options?.timeFormat || "HH:mm";
    cmsLogger.debug("[validateField]", `Adding automatic DATETIME validation for "${field.name}"`, {
      dateFormat,
      timeFormat
    });
    const autoRule = new Rule().datetime(dateFormat, timeFormat);
    const markers = await autoRule.validate(value, {
      path: [field.name],
      ...context
    });
    allErrors.push(
      ...markers.map((marker) => ({
        level: marker.level,
        message: marker.message
      }))
    );
  } else if (field.type === "url") {
    if (!field.validation) {
      cmsLogger.debug("[validateField]", `Adding automatic URL validation for "${field.name}"`);
      if (value && value !== "") {
        const autoRule = new Rule().uri();
        const markers = await autoRule.validate(value, {
          path: [field.name],
          ...context
        });
        allErrors.push(
          ...markers.map((marker) => ({
            level: marker.level,
            message: marker.message
          }))
        );
      }
    } else {
      cmsLogger.debug(
        "[validateField]",
        `Skipping automatic URL validation for "${field.name}" (has custom validation)`
      );
    }
  }
  if (!field.validation) {
    cmsLogger.debug("[validateField]", `No custom validation rules for "${field.name}"`);
  } else {
    try {
      const validationFunctions = Array.isArray(field.validation) ? field.validation : [field.validation];
      cmsLogger.debug(
        "[validateField]",
        `Field "${field.name}" has ${validationFunctions.length} custom validation function(s)`
      );
      for (const validationFn of validationFunctions) {
        const rule = validationFn(new Rule());
        if (!(rule instanceof Rule)) {
          cmsLogger.error(
            `Validation function for field "${field.name}" did not return a Rule object. Make sure you are chaining validation methods and returning the result.`
          );
          continue;
        }
        const markers = await rule.validate(value, {
          path: [field.name],
          ...context
        });
        allErrors.push(
          ...markers.map((marker) => ({
            level: marker.level,
            message: marker.message
          }))
        );
      }
    } catch (error) {
      cmsLogger.error("[validateField]", `Validation error for "${field.name}":`, error);
      allErrors.push({ level: "error", message: "Validation failed" });
    }
  }
  const isValid = allErrors.filter((e) => e.level === "error").length === 0;
  cmsLogger.debug("[validateField]", `Field "${field.name}" validation complete`, {
    isValid,
    errors: allErrors
  });
  return { isValid, errors: allErrors };
}
async function validateDocumentData(schema, data, context = {}) {
  cmsLogger.debug("[validateDocumentData]", "Starting validation", {
    schemaName: schema.name,
    data
  });
  const validationErrors = [];
  const { normalizedData, dataForValidation } = normalizeDateFields(data, schema);
  cmsLogger.debug("[validateDocumentData]", "After normalization", {
    normalizedData,
    dataForValidation
  });
  for (const field of schema.fields) {
    const value = dataForValidation[field.name];
    cmsLogger.debug("[validateDocumentData]", `Validating field "${field.name}"`, {
      type: field.type,
      value
    });
    const result = await validateField(field, value, { ...context, ...dataForValidation });
    cmsLogger.debug("[validateDocumentData]", `Field "${field.name}" validation result`, {
      isValid: result.isValid,
      errors: result.errors
    });
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
  cmsLogger.debug("[validateDocumentData]", "Final result", {
    isValid: validationErrors.length === 0,
    errors: validationErrors
  });
  return {
    isValid: validationErrors.length === 0,
    errors: validationErrors,
    normalizedData
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
  constructor(collectionName, databaseAdapter, _schema, permissions, documentCache) {
    this.collectionName = collectionName;
    this.databaseAdapter = databaseAdapter;
    this._schema = _schema;
    this.permissions = permissions;
    this.documentCache = documentCache;
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
    const perspective = options.perspective || "draft";
    if (perspective === "published" && this.documentCache) {
      const cached = await this.documentCache.getQuery(context.organizationId, this.collectionName, options);
      if (cached) return cached;
    }
    const result = await this.databaseAdapter.findManyDocAdvanced(
      context.organizationId,
      this.collectionName,
      options
    );
    const transformedDocs = result.docs.map((doc) => transformDocument(doc, perspective));
    const findResult = {
      ...result,
      docs: transformedDocs
    };
    if (perspective === "published" && this.documentCache) {
      await this.documentCache.setQuery(context.organizationId, this.collectionName, options, findResult);
    }
    return findResult;
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
    const perspective = options?.perspective || "draft";
    if (perspective === "published" && this.documentCache) {
      const cached = await this.documentCache.getDocument(context.organizationId, id);
      if (cached) return cached;
    }
    const result = await this.databaseAdapter.findByDocIdAdvanced(
      context.organizationId,
      id,
      options
    );
    if (!result) {
      return null;
    }
    const transformed = transformDocument(result, perspective);
    if (perspective === "published" && this.documentCache) {
      await this.documentCache.setDocument(context.organizationId, id, transformed);
    }
    return transformed;
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
    return this.databaseAdapter.countDocuments(
      context.organizationId,
      this.collectionName,
      options?.where
    );
  }
  /**
   * Create a new document
   *
   * @example
   * ```typescript
   * const result = await api.collections.pages.create(
   *   { organizationId: 'org_123', user },
   *   {
   *     title: 'New Page',
   *     slug: 'new-page',
   *     content: []
   *   }
   * );
   * // result.document - the created document
   * // result.validation - validation results
   * ```
   */
  async create(context, data, options) {
    await this.permissions.canWrite(context, this.collectionName);
    const validationResult = await validateDocumentData(this._schema, data, data);
    if (options?.publish) {
      await this.permissions.canPublish(context, this.collectionName);
      if (!validationResult.isValid) {
        const errorMessage = validationResult.errors.map((e) => `${e.field}: ${e.errors.join(", ")}`).join("; ");
        throw new Error(`Cannot publish: validation errors - ${errorMessage}`);
      }
    }
    const document = await this.databaseAdapter.createDocument({
      organizationId: context.organizationId,
      type: this.collectionName,
      draftData: validationResult.normalizedData,
      createdBy: context.user?.id
    });
    if (options?.publish) {
      const published = await this.databaseAdapter.publishDoc(context.organizationId, document.id);
      if (published) {
        return {
          document: transformDocument(published, "published"),
          validation: validationResult
        };
      }
    }
    return {
      document: transformDocument(document, "draft"),
      validation: validationResult
    };
  }
  /**
   * Update an existing document
   *
   * @example
   * ```typescript
   * const result = await api.collections.pages.update(
   *   { organizationId: 'org_123', user },
   *   'doc_123',
   *   { title: 'Updated Title' },
   *   { publish: true }
   * );
   * // result.document - the updated document
   * // result.validation - validation results
   * ```
   */
  async update(context, id, data, options) {
    await this.permissions.canWrite(context, this.collectionName);
    const existingDoc = await this.databaseAdapter.findByDocIdAdvanced(context.organizationId, id);
    if (!existingDoc) {
      return null;
    }
    const schemaFieldNames = new Set(this._schema.fields.map((f) => f.name));
    const cleanedExisting = {};
    for (const [key, value] of Object.entries(existingDoc.draftData || {})) {
      if (schemaFieldNames.has(key)) {
        cleanedExisting[key] = value;
      }
    }
    const mergedData = { ...cleanedExisting, ...data };
    const validationResult = await validateDocumentData(this._schema, mergedData, mergedData);
    const document = await this.databaseAdapter.updateDocDraft(
      context.organizationId,
      id,
      validationResult.normalizedData,
      context.user?.id
    );
    if (!document) {
      return null;
    }
    if (options?.publish) {
      await this.permissions.canPublish(context, this.collectionName);
      if (!validationResult.isValid) {
        const errorMessage = validationResult.errors.map((e) => `${e.field}: ${e.errors.join(", ")}`).join("; ");
        throw new Error(`Cannot publish: validation errors - ${errorMessage}`);
      }
      const published = await this.databaseAdapter.publishDoc(context.organizationId, document.id);
      if (published) {
        return {
          document: transformDocument(published, "published"),
          validation: validationResult
        };
      }
    }
    return {
      document: transformDocument(document, "draft"),
      validation: validationResult
    };
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
    const result = await this.databaseAdapter.deleteDocById(context.organizationId, id);
    if (result && this.documentCache) {
      await this.documentCache.invalidateDocument(context.organizationId, id);
      await this.documentCache.invalidateCollection(context.organizationId, this.collectionName);
    }
    return result;
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
    const document = await this.databaseAdapter.findByDocIdAdvanced(context.organizationId, id);
    if (!document || !document.draftData) {
      throw new Error("Document not found or has no draft content to publish");
    }
    const validationResult = await validateDocumentData(
      this._schema,
      document.draftData,
      document.draftData
    );
    if (!validationResult.isValid) {
      const errorMessage = validationResult.errors.map((e) => `${e.field}: ${e.errors.join(", ")}`).join("; ");
      throw new Error(`Cannot publish: validation errors - ${errorMessage}`);
    }
    const publishedDocument = await this.databaseAdapter.publishDoc(context.organizationId, id);
    if (!publishedDocument) {
      return null;
    }
    if (this.documentCache) {
      await this.documentCache.invalidateDocument(context.organizationId, id);
      await this.documentCache.invalidateCollection(context.organizationId, this.collectionName);
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
    if (this.documentCache) {
      await this.documentCache.invalidateDocument(context.organizationId, id);
      await this.documentCache.invalidateCollection(context.organizationId, this.collectionName);
    }
    return transformDocument(document, "draft");
  }
}
class LocalAPI {
  constructor(config, userAdapter, systemAdapter) {
    this.config = config;
    this.userAdapter = userAdapter;
    this.systemAdapter = systemAdapter || null;
    this.documentCache = config.cache ? new DocumentCache(config.cache) : null;
    this.schemas = new Map(
      config.schemaTypes.filter((schema) => schema.type === "document").map((schema) => [schema.name, schema])
    );
    this.permissions = new PermissionChecker(config, this.schemas);
    this.initializeCollections();
  }
  collections = {};
  userAdapter;
  systemAdapter;
  documentCache;
  permissions;
  schemas;
  /**
   * Initialize collection APIs for all document schema types
   */
  initializeCollections() {
    const documentSchemas = this.config.schemaTypes.filter((s) => s.type === "document");
    for (const schema of documentSchemas) {
      const collectionAPI = new Proxy(
        new CollectionAPI(schema.name, this.userAdapter, schema, this.permissions, this.documentCache),
        {
          get: (target, prop) => {
            const method = target[prop];
            if (typeof method === "function") {
              return async (...args) => {
                const context = args[0];
                const adapter = this.getAdapter(context);
                const api = new CollectionAPI(schema.name, adapter, schema, this.permissions, this.documentCache);
                return api[prop].apply(api, args);
              };
            }
            return method;
          }
        }
      );
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
let schemaError = null;
function checkSchemasDirty() {
  const dirty = global.__aphexSchemasDirty === true;
  if (dirty) {
    global.__aphexSchemasDirty = false;
  }
  return dirty;
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
      throw new Error(
        `Failed to load plugin "${pluginConfig}". Make sure it's installed: npm install ${pluginConfig}
Error: ${error}`
      );
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
      throw new Error(
        `Failed to load plugin "${pluginConfig.name}". Make sure it's installed: npm install ${pluginConfig.name}
Error: ${error}`
      );
    }
  }
  throw new Error(`Invalid plugin configuration: ${JSON.stringify(pluginConfig)}`);
}
function createCMSHook(config) {
  if (config.logLevel) setLogLevel(config.logLevel);
  return async ({ event, resolve }) => {
    if (!cmsInstances) {
      cmsLogger.info("[CMS]", "Initializing...");
      const databaseAdapter = config.database;
      const storageAdapter = config.storage ?? createDefaultStorageAdapter();
      const emailAdapter = config.email ?? null;
      const assetService = new AssetService(storageAdapter, databaseAdapter);
      const cmsEngine = createCMS(config, databaseAdapter);
      const localAPI = createLocalAPI(config, databaseAdapter);
      try {
        await cmsEngine.initialize();
      } catch (error) {
        cmsLogger.error("[CMS]", "Failed to initialize:", error);
        schemaError = error instanceof Error ? error : new Error(String(error));
      }
      const pluginRoutes = /* @__PURE__ */ new Map();
      if (config.plugins && config.plugins.length > 0) {
        for (const pluginConfig of config.plugins) {
          try {
            const plugin = await resolvePlugin(pluginConfig);
            cmsLogger.info("[CMS]", `Loading plugin: ${plugin.name}@${plugin.version}`);
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
            cmsLogger.info("[CMS]", `Installing plugin: ${plugin.name}`);
            await plugin.install(tempInstances);
          } catch (error) {
            cmsLogger.error("[CMS]", "Failed to load/install plugin:", error);
            throw error;
          }
        }
      }
      let graphqlSettings = null;
      if (config.graphql !== false) {
        try {
          const { createGraphQLHandler } = await import('./index11-CeP1ownW.js');
          const graphqlConfig = typeof config.graphql === "object" ? config.graphql : {};
          const result = await createGraphQLHandler(
            {
              config,
              databaseAdapter,
              assetService,
              storageAdapter,
              emailAdapter,
              cmsEngine,
              localAPI,
              auth: config.auth?.provider,
              pluginRoutes
            },
            config.schemaTypes,
            graphqlConfig
          );
          const rawPath = graphqlConfig.path ?? "/api/graphql";
          const endpoint = rawPath.startsWith("/") ? rawPath : `/${rawPath}`;
          pluginRoutes.set(endpoint, {
            handler: result.handler,
            pluginName: "built-in:graphql"
          });
          graphqlSettings = result.settings;
        } catch (error) {
          cmsLogger.error("[CMS]", "Failed to initialize GraphQL:", error);
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
        graphqlSettings,
        pluginRoutes
      };
    } else if (checkSchemasDirty()) {
      cmsLogger.info("[CMS]", "Schema change detected, re-initializing...");
      if (cmsInstances?.config.cache) {
        cmsInstances.config.cache.flush();
      }
      cmsInstances = null;
      schemaError = null;
      return resolve(event);
    }
    if (cmsInstances) {
      cmsInstances.schemaError = schemaError;
    }
    event.locals.aphexCMS = cmsInstances;
    if (cmsInstances.auth) {
      const authResponse = await handleAuthHook(
        event,
        config,
        cmsInstances.auth,
        cmsInstances.databaseAdapter
      );
      if (authResponse) return authResponse;
    }
    if (cmsInstances.pluginRoutes && cmsInstances.pluginRoutes.size > 0) {
      const pluginRoute = cmsInstances.pluginRoutes.get(event.url.pathname);
      if (pluginRoute) {
        cmsLogger.debug(
          "[CMS]",
          `Plugin ${pluginRoute.pluginName} handling route: ${event.url.pathname}`
        );
        return pluginRoute.handler(event);
      }
    }
    return resolve(event);
  };
}
const svelteKitHandler = async ({ auth: auth2, event, resolve, building: building2 }) => {
  const { request, url } = event;
  if (isAuthPath(url.toString(), auth2.options)) return auth2.handler(request);
  return resolve(event);
};
function isAuthPath(url, options) {
  const _url = new URL(url);
  const baseURLStr = typeof options.baseURL === "string" ? options.baseURL : void 0;
  const baseURL = new URL(`${baseURLStr || _url.origin}${options.basePath || "/api/auth"}`);
  if (_url.origin !== baseURL.origin) return false;
  if (!_url.pathname.startsWith(baseURL.pathname.endsWith("/") ? baseURL.pathname : `${baseURL.pathname}/`)) return false;
  return true;
}
const authHook = async ({ event, resolve }) => {
  return svelteKitHandler({ event, resolve, auth, building });
};
let aphexHookInstance = null;
const aphexHook = async ({ event, resolve }) => {
  if (global.__aphexSchemasDirty) {
    global.__aphexSchemasDirty = false;
    aphexHookInstance = null;
  }
  if (!aphexHookInstance) {
    const cmsConfig = (await import(
      /* @vite-ignore */
      './aphex.config-DsKkSS9t.js'
    )).default;
    aphexHookInstance = createCMSHook(cmsConfig);
  }
  return aphexHookInstance({ event, resolve });
};
const routingHook = async ({ event, resolve }) => {
  if (event.url.pathname === "/") {
    throw redirect(302, "/admin");
  }
  return resolve(event);
};
const handle = sequence(authHook, aphexHook, routingHook);

export { handle };
//# sourceMappingURL=hooks.server-6zs3Dh1I.js.map
