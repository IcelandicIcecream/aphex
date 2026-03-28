import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { p as private_env } from './shared-server-BmU87nph.js';
import { sql, eq, and, inArray, desc, or, like, ilike, lte, lt, gte, gt, isNotNull, isNull, notInArray, ne } from 'drizzle-orm';
import './logger-C1WBmfZZ.js';
import './utils-FiC4zhrQ.js';
import './storage-CxrQC-cN.js';
import 'sharp';
import './date-utils-xyIWAIQq.js';
import { c as createHashForPublishing } from './content-hash-AOe_NOqf.js';
import { pgTable, text, timestamp, integer, boolean, jsonb, uuid, varchar, pgEnum, unique, pgPolicy } from 'drizzle-orm/pg-core';

async function resolveReferences(document, adapter2, organizationId, options) {
  const { depth, currentDepth = 0, visited = /* @__PURE__ */ new Set() } = options;
  if (currentDepth >= depth || visited.has(document.id)) {
    return document;
  }
  visited.add(document.id);
  const resolvedDocument = { ...document };
  if (document.draftData) {
    resolvedDocument.draftData = await resolveDataReferences(document.draftData, adapter2, organizationId, {
      depth,
      currentDepth: currentDepth + 1,
      visited
    });
  }
  if (document.publishedData) {
    resolvedDocument.publishedData = await resolveDataReferences(document.publishedData, adapter2, organizationId, {
      depth,
      currentDepth: currentDepth + 1,
      visited
    });
  }
  return resolvedDocument;
}
async function resolveDataReferences(data, adapter2, organizationId, options) {
  if (!data || typeof data !== "object") {
    return data;
  }
  if (Array.isArray(data)) {
    return Promise.all(data.map((item) => resolveDataReferences(item, adapter2, organizationId, options)));
  }
  const resolved = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string" && key !== "_type" && key !== "_key") {
      try {
        const referencedDoc = await adapter2.findByDocIdAdvanced(organizationId, value);
        if (referencedDoc) {
          resolved[key] = await resolveReferences(referencedDoc, adapter2, organizationId, options);
        } else {
          resolved[key] = value;
        }
      } catch (error) {
        resolved[key] = value;
      }
    } else if (value && typeof value === "object") {
      resolved[key] = await resolveDataReferences(value, adapter2, organizationId, options);
    } else {
      resolved[key] = value;
    }
  }
  return resolved;
}
const JSONB_DATA_COLUMNS = /* @__PURE__ */ new Set(["draftData", "publishedData"]);
function parseWhere(where, table, perspective = "draft") {
  if (!where) {
    return void 0;
  }
  const conditions = [];
  if (where.and && Array.isArray(where.and)) {
    const andConditions = where.and.map((w) => parseWhere(w, table, perspective)).filter((c) => c !== void 0);
    if (andConditions.length > 0) {
      conditions.push(and(...andConditions));
    }
  }
  if (where.or && Array.isArray(where.or)) {
    const orConditions = where.or.map((w) => parseWhere(w, table, perspective)).filter((c) => c !== void 0);
    if (orConditions.length > 0) {
      conditions.push(or(...orConditions));
    }
  }
  for (const [field, filter] of Object.entries(where)) {
    if (field === "and" || field === "or") {
      continue;
    }
    const condition = parseFieldFilter(field, filter, table, perspective);
    if (condition) {
      conditions.push(condition);
    }
  }
  if (conditions.length === 0) {
    return void 0;
  }
  if (conditions.length === 1) {
    return conditions[0];
  }
  return and(...conditions);
}
function parseFieldFilter(fieldPath, filter, table, perspective) {
  let actualFieldPath = fieldPath;
  if (fieldPath.startsWith("_meta.")) {
    actualFieldPath = fieldPath.substring(6);
  }
  const isTopLevelColumn = actualFieldPath in table && !JSONB_DATA_COLUMNS.has(actualFieldPath);
  if (filter === null || filter === void 0 || typeof filter !== "object") {
    if (isTopLevelColumn) {
      const column = table[actualFieldPath];
      return column ? eq(column, filter) : void 0;
    } else {
      return buildJsonbCondition(fieldPath, "equals", filter, table, perspective);
    }
  }
  if (Array.isArray(filter)) {
    if (isTopLevelColumn) {
      const column = table[actualFieldPath];
      return column ? inArray(column, filter) : void 0;
    } else {
      return buildJsonbCondition(fieldPath, "in", filter, table, perspective);
    }
  }
  const fieldFilter = filter;
  const conditions = [];
  for (const [operator, value] of Object.entries(fieldFilter)) {
    if (value === void 0)
      continue;
    const condition = isTopLevelColumn ? buildColumnCondition(actualFieldPath, operator, value, table) : buildJsonbCondition(fieldPath, operator, value, table, perspective);
    if (condition) {
      conditions.push(condition);
    }
  }
  if (conditions.length === 0) {
    return void 0;
  }
  if (conditions.length === 1) {
    return conditions[0];
  }
  return and(...conditions);
}
function buildColumnCondition(fieldPath, operator, value, table) {
  const column = table[fieldPath];
  if (!column) {
    console.warn(`[Filter Parser] Column not found: ${fieldPath}`);
    return void 0;
  }
  switch (operator) {
    case "equals":
      return eq(column, value);
    case "not_equals":
      return ne(column, value);
    case "in":
      return inArray(column, value);
    case "not_in":
      return notInArray(column, value);
    case "exists":
      return value ? isNotNull(column) : isNull(column);
    case "greater_than":
      return gt(column, value);
    case "greater_than_equal":
      return gte(column, value);
    case "less_than":
      return lt(column, value);
    case "less_than_equal":
      return lte(column, value);
    case "like":
      return like(column, value);
    case "contains":
      return ilike(column, `%${value}%`);
    case "starts_with":
      return ilike(column, `${value}%`);
    case "ends_with":
      return ilike(column, `%${value}`);
    default:
      console.warn(`[Filter Parser] Unknown operator: ${operator}`);
      return void 0;
  }
}
function buildJsonbCondition(fieldPath, operator, value, table, perspective) {
  const jsonbColumnName = perspective === "draft" ? "draftData" : "publishedData";
  const jsonbColumn = table[jsonbColumnName];
  if (!jsonbColumn) {
    console.warn(`[Filter Parser] JSONB column not found: ${jsonbColumnName}`);
    return void 0;
  }
  const pathParts = fieldPath.split(".");
  const buildPath = (asText = true) => {
    if (pathParts.length === 1) {
      return asText ? sql`${jsonbColumn}->>${pathParts[0]}` : sql`${jsonbColumn}->${pathParts[0]}`;
    } else {
      const allButLast = pathParts.slice(0, -1);
      const last = pathParts[pathParts.length - 1];
      let pathSql = jsonbColumn;
      for (const part of allButLast) {
        pathSql = sql`${pathSql}->${part}`;
      }
      return asText ? sql`${pathSql}->>${last}` : sql`${pathSql}->${last}`;
    }
  };
  switch (operator) {
    case "equals":
      if (typeof value === "boolean") {
        return sql`(${buildPath(true)})::boolean = ${value}`;
      } else if (typeof value === "number") {
        return sql`(${buildPath(true)})::numeric = ${value}`;
      } else {
        return sql`${buildPath(true)} = ${value}`;
      }
    case "not_equals":
      if (typeof value === "boolean") {
        return sql`(${buildPath(true)})::boolean != ${value}`;
      } else if (typeof value === "number") {
        return sql`(${buildPath(true)})::numeric != ${value}`;
      } else {
        return sql`${buildPath(true)} != ${value}`;
      }
    case "in":
      return sql`${buildPath(true)} = ANY(${value})`;
    case "not_in":
      return sql`${buildPath(true)} != ALL(${value})`;
    case "exists":
      if (value) {
        return sql`${buildPath(false)} IS NOT NULL`;
      } else {
        return sql`${buildPath(false)} IS NULL`;
      }
    case "greater_than":
      return sql`(${buildPath(true)})::numeric > ${value}`;
    case "greater_than_equal":
      return sql`(${buildPath(true)})::numeric >= ${value}`;
    case "less_than":
      return sql`(${buildPath(true)})::numeric < ${value}`;
    case "less_than_equal":
      return sql`(${buildPath(true)})::numeric <= ${value}`;
    case "like":
      return sql`${buildPath(true)} LIKE ${value}`;
    case "contains":
      return sql`${buildPath(true)} ILIKE ${"%" + value + "%"}`;
    case "starts_with":
      return sql`${buildPath(true)} ILIKE ${value + "%"}`;
    case "ends_with":
      return sql`${buildPath(true)} ILIKE ${"%" + value}`;
    default:
      console.warn(`[Filter Parser] Unknown operator for JSONB: ${operator}`);
      return void 0;
  }
}
function parseSort(sort, table, perspective = "draft") {
  if (!sort) {
    return [];
  }
  const sortArray = Array.isArray(sort) ? sort : [sort];
  const orderBy = [];
  for (const sortField of sortArray) {
    const trimmed = sortField.trim();
    if (!trimmed)
      continue;
    const descending = trimmed.startsWith("-");
    const fieldName = descending ? trimmed.substring(1) : trimmed;
    let actualFieldName = fieldName;
    if (fieldName.startsWith("_meta.")) {
      actualFieldName = fieldName.substring(6);
    }
    const isTopLevelColumn = actualFieldName in table && !JSONB_DATA_COLUMNS.has(actualFieldName);
    if (isTopLevelColumn) {
      const column = table[actualFieldName];
      if (column) {
        orderBy.push(descending ? sql`${column} DESC` : sql`${column} ASC`);
      }
    } else {
      const jsonbColumnName = perspective === "draft" ? "draftData" : "publishedData";
      const jsonbColumn = table[jsonbColumnName];
      if (jsonbColumn) {
        const pathParts = fieldName.split(".");
        let pathSql = jsonbColumn;
        for (let i = 0; i < pathParts.length - 1; i++) {
          pathSql = sql`${pathSql}->${pathParts[i]}`;
        }
        const finalPath = sql`${pathSql}->>${pathParts[pathParts.length - 1]}`;
        orderBy.push(descending ? sql`${finalPath} DESC` : sql`${finalPath} ASC`);
      }
    }
  }
  return orderBy;
}
const DEFAULT_LIMIT$1 = 50;
const DEFAULT_OFFSET$1 = 0;
const DOCUMENT_STATUS = {
  DRAFT: "draft",
  PUBLISHED: "published"
};
class PostgreSQLDocumentAdapter {
  db;
  tables;
  constructor(db2, tables) {
    this.db = db2;
    this.tables = tables;
  }
  /**
   * Create new document (always starts as draft)
   */
  async createDocument(data) {
    const now = /* @__PURE__ */ new Date();
    const result = await this.db.insert(this.tables.documents).values({
      organizationId: data.organizationId,
      type: data.type,
      status: DOCUMENT_STATUS.DRAFT,
      draftData: data.draftData,
      createdBy: data.createdBy,
      createdAt: now,
      updatedAt: now
    }).returning();
    return result[0];
  }
  /**
   * Update draft data (auto-save)
   */
  async updateDocDraft(organizationId, id, data, updatedBy) {
    const now = /* @__PURE__ */ new Date();
    const result = await this.db.update(this.tables.documents).set({
      draftData: data,
      updatedBy,
      updatedAt: now
    }).where(and(eq(this.tables.documents.id, id), eq(this.tables.documents.organizationId, organizationId))).returning();
    return result[0] || null;
  }
  /**
   * Publish document (copy draft -> published)
   */
  async publishDoc(organizationId, id) {
    const now = /* @__PURE__ */ new Date();
    const current = await this.findByDocIdAdvanced(organizationId, id);
    if (!current || !current.draftData) {
      return null;
    }
    const contentHash = createHashForPublishing(current.draftData);
    const result = await this.db.update(this.tables.documents).set({
      status: DOCUMENT_STATUS.PUBLISHED,
      publishedData: current.draftData,
      publishedHash: contentHash,
      publishedAt: now,
      updatedAt: now
    }).where(and(eq(this.tables.documents.id, id), eq(this.tables.documents.organizationId, organizationId))).returning();
    return result[0] || null;
  }
  /**
   * Unpublish document (revert to draft only)
   */
  async unpublishDoc(organizationId, id) {
    const now = /* @__PURE__ */ new Date();
    const result = await this.db.update(this.tables.documents).set({
      status: DOCUMENT_STATUS.DRAFT,
      publishedData: null,
      publishedHash: null,
      publishedAt: null,
      updatedAt: now
    }).where(and(eq(this.tables.documents.id, id), eq(this.tables.documents.organizationId, organizationId))).returning();
    return result[0] || null;
  }
  /**
   * Delete document permanently
   */
  async deleteDocById(organizationId, id) {
    const result = await this.db.delete(this.tables.documents).where(and(eq(this.tables.documents.id, id), eq(this.tables.documents.organizationId, organizationId))).returning({ id: this.tables.documents.id });
    return result.length > 0;
  }
  /**
   * Count documents by type
   */
  async countDocsByType(organizationId, type) {
    const result = await this.db.select({ count: sql`count(*)` }).from(this.tables.documents).where(and(eq(this.tables.documents.organizationId, organizationId), eq(this.tables.documents.type, type)));
    return Number(result[0]?.count) || 0;
  }
  /**
   * Get counts for all document types
   */
  async getDocCountsByType(organizationId) {
    const result = await this.db.select({
      type: this.tables.documents.type,
      count: sql`count(*)`
    }).from(this.tables.documents).where(eq(this.tables.documents.organizationId, organizationId)).groupBy(this.tables.documents.type);
    const counts = {};
    result.forEach((row) => {
      counts[row.type] = Number(row.count);
    });
    return counts;
  }
  /**
   * Advanced filtering - find many documents with where clause and pagination
   */
  async findManyDocAdvanced(organizationId, collectionName, options = {}) {
    const { where, limit = DEFAULT_LIMIT$1, offset = DEFAULT_OFFSET$1, sort, depth = 0, perspective = "draft", filterOrganizationIds } = options;
    const baseConditions = [eq(this.tables.documents.type, collectionName)];
    if (filterOrganizationIds && filterOrganizationIds.length > 0) {
      baseConditions.push(inArray(this.tables.documents.organizationId, filterOrganizationIds));
    } else if (organizationId) {
      baseConditions.push(eq(this.tables.documents.organizationId, organizationId));
    }
    const whereCondition = parseWhere(where, this.tables.documents, perspective);
    const allConditions = whereCondition ? and(...baseConditions, whereCondition) : and(...baseConditions);
    const countQuery = this.db.select({ count: sql`count(*)` }).from(this.tables.documents).where(allConditions);
    const countResult = await countQuery;
    const totalDocs = Number(countResult[0]?.count) || 0;
    let query = this.db.select().from(this.tables.documents);
    if (allConditions) {
      query = query.where(allConditions);
    }
    const orderBy = parseSort(sort, this.tables.documents, perspective);
    if (orderBy.length > 0) {
      query = query.orderBy(...orderBy);
    } else {
      query = query.orderBy(desc(this.tables.documents.updatedAt));
    }
    const docs = await query.limit(limit).offset(offset);
    let finalDocs = docs;
    if (depth > 0) {
      finalDocs = await Promise.all(docs.map((doc) => resolveReferences(doc, this, organizationId, { depth })));
    }
    const totalPages = Math.ceil(totalDocs / limit);
    const currentPage = Math.floor(offset / limit) + 1;
    return {
      docs: finalDocs,
      totalDocs,
      limit,
      offset,
      page: currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1
    };
  }
  /**
   * Advanced filtering - find document by ID with options
   */
  async findByDocIdAdvanced(organizationId, id, options = {}) {
    const { depth = 0, filterOrganizationIds } = options;
    const baseConditions = [eq(this.tables.documents.id, id)];
    if (filterOrganizationIds && filterOrganizationIds.length > 0) {
      baseConditions.push(inArray(this.tables.documents.organizationId, filterOrganizationIds));
    } else if (organizationId) {
      baseConditions.push(eq(this.tables.documents.organizationId, organizationId));
    }
    const result = await this.db.select().from(this.tables.documents).where(and(...baseConditions)).limit(1);
    if (result.length === 0) {
      return null;
    }
    let doc = result[0];
    if (depth > 0) {
      doc = await resolveReferences(doc, this, organizationId, { depth });
    }
    return doc;
  }
  /**
   * Count documents matching where clause
   */
  async countDocuments(organizationId, collectionName, where) {
    const baseConditions = [eq(this.tables.documents.type, collectionName)];
    if (organizationId) {
      baseConditions.push(eq(this.tables.documents.organizationId, organizationId));
    }
    const whereCondition = parseWhere(where, this.tables.documents, "draft");
    const allConditions = whereCondition ? and(...baseConditions, whereCondition) : and(...baseConditions);
    const result = await this.db.select({ count: sql`count(*)` }).from(this.tables.documents).where(allConditions);
    return Number(result[0]?.count) || 0;
  }
  /**
   * Find documents that reference a specific asset ID in their JSONB data
   */
  async findDocumentsReferencingAsset(organizationId, assetId) {
    const conditions = [
      eq(this.tables.documents.organizationId, organizationId),
      sql`(${this.tables.documents.draftData}::text LIKE ${"%" + assetId + "%"} OR ${this.tables.documents.publishedData}::text LIKE ${"%" + assetId + "%"})`
    ];
    const results = await this.db.select({
      id: this.tables.documents.id,
      type: this.tables.documents.type,
      status: this.tables.documents.status,
      draftData: this.tables.documents.draftData
    }).from(this.tables.documents).where(and(...conditions));
    return results.map((row) => ({
      documentId: row.id,
      type: row.type,
      title: row.draftData?.title || row.draftData?.name || row.type,
      status: row.status
    }));
  }
  /**
   * Count document references for multiple asset IDs in batch
   */
  async countDocumentReferencesForAssets(organizationId, assetIds) {
    if (assetIds.length === 0)
      return {};
    const counts = {};
    for (const id of assetIds) {
      counts[id] = 0;
    }
    const conditions = [eq(this.tables.documents.organizationId, organizationId)];
    const assetConditions = assetIds.map((id) => sql`(${this.tables.documents.draftData}::text LIKE ${"%" + id + "%"} OR ${this.tables.documents.publishedData}::text LIKE ${"%" + id + "%"})`);
    const results = await this.db.select({
      id: this.tables.documents.id,
      draftData: this.tables.documents.draftData,
      publishedData: this.tables.documents.publishedData
    }).from(this.tables.documents).where(and(...conditions, or(...assetConditions)));
    for (const row of results) {
      const text2 = JSON.stringify(row.draftData) + JSON.stringify(row.publishedData);
      for (const assetId of assetIds) {
        if (text2.includes(assetId)) {
          counts[assetId] = (counts[assetId] ?? 0) + 1;
        }
      }
    }
    return counts;
  }
}
const DEFAULT_LIMIT = 20;
const DEFAULT_OFFSET = 0;
class PostgreSQLAssetAdapter {
  db;
  tables;
  constructor(db2, tables) {
    this.db = db2;
    this.tables = tables;
  }
  /**
   * Create new asset
   */
  async createAsset(data) {
    const result = await this.db.insert(this.tables.assets).values({
      organizationId: data.organizationId,
      assetType: data.assetType,
      filename: data.filename,
      originalFilename: data.originalFilename,
      mimeType: data.mimeType,
      size: data.size,
      url: data.url,
      path: data.path,
      storageAdapter: data.storageAdapter,
      width: data.width,
      height: data.height,
      metadata: data.metadata,
      title: data.title,
      description: data.description,
      alt: data.alt,
      creditLine: data.creditLine,
      createdBy: data.createdBy
    }).returning();
    return result[0];
  }
  /**
   * Find asset by ID
   */
  async findAssetById(organizationId, id) {
    try {
      const result = await this.db.select().from(this.tables.assets).where(and(eq(this.tables.assets.id, id), eq(this.tables.assets.organizationId, organizationId))).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error("Error finding asset by ID:", error);
      return null;
    }
  }
  /**
   * Find asset by ID across multiple organizations (single query)
   */
  async findAssetByIdInOrgs(organizationIds, id) {
    try {
      if (organizationIds.length === 0) {
        return null;
      }
      const result = await this.db.select().from(this.tables.assets).where(and(eq(this.tables.assets.id, id), inArray(this.tables.assets.organizationId, organizationIds))).limit(1);
      return result[0] || null;
    } catch (error) {
      console.error("Error finding asset by ID in orgs:", error);
      return null;
    }
  }
  /**
   * Find multiple assets with filtering
   */
  async findAssets(organizationId, filters = {}) {
    try {
      const { assetType, mimeType, search, limit = DEFAULT_LIMIT, offset = DEFAULT_OFFSET, filterOrganizationIds } = filters;
      const conditions = [];
      if (filterOrganizationIds && filterOrganizationIds.length > 0) {
        conditions.push(inArray(this.tables.assets.organizationId, filterOrganizationIds));
      } else {
        conditions.push(eq(this.tables.assets.organizationId, organizationId));
      }
      if (assetType) {
        conditions.push(eq(this.tables.assets.assetType, assetType));
      }
      if (mimeType) {
        conditions.push(eq(this.tables.assets.mimeType, mimeType));
      }
      if (search) {
        conditions.push(like(this.tables.assets.originalFilename, `%${search}%`));
      }
      const result = await this.db.select().from(this.tables.assets).where(and(...conditions)).orderBy(desc(this.tables.assets.createdAt)).limit(limit).offset(offset);
      return result;
    } catch (error) {
      console.error("Error finding assets:", error);
      return [];
    }
  }
  /**
   * Find asset by ID (bypasses organization filter for public access)
   * Uses raw SQL to bypass RLS policies
   */
  async findAssetByIdGlobal(id) {
    try {
      const result = await this.db.execute(sql`
				SELECT * FROM ${this.tables.assets}
				WHERE id = ${id}
				LIMIT 1
			`);
      if (result && result.length > 0) {
        const raw = result[0];
        return {
          id: raw.id,
          organizationId: raw.organization_id,
          assetType: raw.asset_type,
          filename: raw.filename,
          originalFilename: raw.original_filename,
          mimeType: raw.mime_type,
          size: raw.size,
          url: raw.url,
          path: raw.path,
          storageAdapter: raw.storage_adapter,
          width: raw.width,
          height: raw.height,
          metadata: raw.metadata,
          title: raw.title,
          description: raw.description,
          alt: raw.alt,
          creditLine: raw.credit_line,
          createdBy: raw.created_by,
          createdAt: raw.created_at,
          updatedAt: raw.updated_at
        };
      }
      return null;
    } catch (error) {
      console.error("Error finding asset globally:", error);
      return null;
    }
  }
  /**
   * Update asset metadata
   */
  async updateAsset(organizationId, id, data) {
    try {
      const result = await this.db.update(this.tables.assets).set({
        ...data,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(and(eq(this.tables.assets.id, id), eq(this.tables.assets.organizationId, organizationId))).returning();
      return result[0] || null;
    } catch (error) {
      console.error("Error updating asset:", error);
      return null;
    }
  }
  /**
   * Delete asset by ID
   */
  async deleteAsset(organizationId, id) {
    try {
      const result = await this.db.delete(this.tables.assets).where(and(eq(this.tables.assets.id, id), eq(this.tables.assets.organizationId, organizationId))).returning({ id: this.tables.assets.id });
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting asset:", error);
      return false;
    }
  }
  /**
   * Count total assets
   */
  async countAssets(organizationId) {
    try {
      const result = await this.db.select({ count: sql`count(*)` }).from(this.tables.assets).where(eq(this.tables.assets.organizationId, organizationId));
      return result[0]?.count || 0;
    } catch (error) {
      console.error("Error counting assets:", error);
      return 0;
    }
  }
  /**
   * Count assets by type
   */
  async countAssetsByType(organizationId) {
    try {
      const result = await this.db.select({
        assetType: this.tables.assets.assetType,
        count: sql`count(*)`
      }).from(this.tables.assets).where(eq(this.tables.assets.organizationId, organizationId)).groupBy(this.tables.assets.assetType);
      const counts = {};
      result.forEach((row) => {
        counts[row.assetType] = row.count;
      });
      return counts;
    } catch (error) {
      console.error("Error getting asset counts by type:", error);
      return {};
    }
  }
  /**
   * Get total size of all assets
   */
  async getTotalAssetsSize(organizationId) {
    try {
      const result = await this.db.select({ totalSize: sql`sum(size)` }).from(this.tables.assets).where(eq(this.tables.assets.organizationId, organizationId));
      return result[0]?.totalSize || 0;
    } catch (error) {
      console.error("Error getting total assets size:", error);
      return 0;
    }
  }
  /**
   * Advanced filtering - find many assets with where clause and pagination
   */
  async findManyAssetsAdvanced(organizationId, options = {}) {
    const { where, limit = DEFAULT_LIMIT, offset = DEFAULT_OFFSET, sort } = options;
    const baseConditions = [eq(this.tables.assets.organizationId, organizationId)];
    const whereCondition = parseWhere(where, this.tables.assets, "draft");
    const allConditions = whereCondition ? and(...baseConditions, whereCondition) : and(...baseConditions);
    const countResult = await this.db.select({ count: sql`count(*)` }).from(this.tables.assets).where(allConditions);
    const totalDocs = countResult[0]?.count || 0;
    let query = this.db.select().from(this.tables.assets);
    if (allConditions) {
      query = query.where(allConditions);
    }
    const orderBy = parseSort(sort, this.tables.assets, "draft");
    if (orderBy.length > 0) {
      query = query.orderBy(...orderBy);
    } else {
      query = query.orderBy(desc(this.tables.assets.createdAt));
    }
    const docs = await query.limit(limit).offset(offset);
    const totalPages = Math.ceil(totalDocs / limit);
    const currentPage = Math.floor(offset / limit) + 1;
    return {
      docs,
      totalDocs,
      limit,
      offset,
      page: currentPage,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1
    };
  }
  /**
   * Advanced filtering - find asset by ID
   */
  async findAssetByIdAdvanced(organizationId, id) {
    const result = await this.db.select().from(this.tables.assets).where(and(eq(this.tables.assets.id, id), eq(this.tables.assets.organizationId, organizationId))).limit(1);
    return result[0] || null;
  }
  /**
   * Count assets matching where clause
   */
  async countAssetsAdvanced(organizationId, where) {
    const baseConditions = [eq(this.tables.assets.organizationId, organizationId)];
    const whereCondition = parseWhere(where, this.tables.assets, "draft");
    const allConditions = whereCondition ? and(...baseConditions, whereCondition) : and(...baseConditions);
    const result = await this.db.select({ count: sql`count(*)` }).from(this.tables.assets).where(allConditions);
    return result[0]?.count || 0;
  }
}
class PostgreSQLUserProfileAdapter {
  db;
  tables;
  constructor(db2, tables) {
    this.db = db2;
    this.tables = tables;
  }
  /**
   * Create a new user profile
   */
  async createUserProfile(data) {
    console.log(`[PostgreSQLAdapter]: Creating user profile for userId: ${data.userId}`);
    const result = await this.db.insert(this.tables.userProfiles).values(data).returning();
    const userProfile = result[0];
    return {
      ...userProfile,
      preferences: userProfile.preferences ?? void 0
    };
  }
  /**
   * Find a user profile by their ID
   */
  async findUserProfileById(userId) {
    const result = await this.db.select().from(this.tables.userProfiles).where(eq(this.tables.userProfiles.userId, userId)).limit(1);
    const userProfile = result[0] || null;
    if (!userProfile) {
      return null;
    }
    return {
      ...userProfile,
      preferences: userProfile.preferences ?? void 0
    };
  }
  /**
   * Delete a user profile by their ID
   */
  async deleteUserProfile(userId) {
    const result = await this.db.delete(this.tables.userProfiles).where(eq(this.tables.userProfiles.userId, userId)).returning({ id: this.tables.userProfiles.userId });
    return result.length > 0;
  }
  /**
   * Update user preferences (partial update, merges with existing)
   */
  async updateUserPreferences(userId, preferences) {
    const profile = await this.findUserProfileById(userId);
    const currentPrefs = profile?.preferences || {};
    const updatedPrefs = { ...currentPrefs, ...preferences };
    await this.db.update(this.tables.userProfiles).set({
      preferences: updatedPrefs,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(this.tables.userProfiles.userId, userId));
  }
}
class PostgreSQLSchemaAdapter {
  db;
  tables;
  constructor(db2, tables) {
    this.db = db2;
    this.tables = tables;
  }
  async registerSchemaType(schemaType) {
    const existing = await this.db.select().from(this.tables.schemaTypes).where(eq(this.tables.schemaTypes.name, schemaType.name)).limit(1);
    if (existing.length === 0) {
      await this.db.insert(this.tables.schemaTypes).values({
        name: schemaType.name,
        title: schemaType.title,
        type: schemaType.type,
        description: schemaType.description,
        fields: schemaType.fields
      });
      console.log(`📝 Registered ${schemaType.type}: ${schemaType.name} with ${schemaType.fields?.length || 0} fields`);
    } else {
      await this.db.update(this.tables.schemaTypes).set({
        title: schemaType.title,
        description: schemaType.description,
        fields: schemaType.fields,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(this.tables.schemaTypes.name, schemaType.name));
      console.log(`🔄 Updated ${schemaType.type}: ${schemaType.name} with ${schemaType.fields?.length || 0} fields`);
      console.log(`   Fields:`, schemaType.fields?.map((f) => ({ name: f.name, type: f.type, private: f.private })));
    }
  }
  async getSchemaType(name) {
    console.log(`[PostgreSQL] getSchemaType called for: ${name}`);
    const [schemaType] = await this.db.select().from(this.tables.schemaTypes).where(eq(this.tables.schemaTypes.name, name)).limit(1);
    if (!schemaType) {
      console.log(`[PostgreSQL] Schema ${name} NOT FOUND in database`);
      return null;
    }
    const result = {
      ...schemaType,
      description: schemaType.description ?? void 0,
      fields: schemaType.fields
    };
    console.log(`[PostgreSQL] Schema ${name} found:`, {
      fieldCount: result.fields?.length,
      fields: result.fields?.map((f) => ({ name: f.name, type: f.type, private: f.private }))
    });
    return result;
  }
  async listSchemas() {
    const schemaTypes2 = await this.db.select().from(this.tables.schemaTypes);
    return schemaTypes2.map((st) => ({
      ...st,
      description: st.description ?? void 0,
      fields: st.fields
    }));
  }
  async listDocumentTypes() {
    const documentTypes = await this.db.select({
      name: this.tables.schemaTypes.name,
      title: this.tables.schemaTypes.title,
      description: this.tables.schemaTypes.description
    }).from(this.tables.schemaTypes).where(eq(this.tables.schemaTypes.type, "document")).orderBy(this.tables.schemaTypes.title);
    return documentTypes.map((d) => ({
      name: d.name,
      title: d.title,
      description: d.description || void 0
    }));
  }
  async listObjectTypes() {
    const objectTypes = await this.db.select({
      name: this.tables.schemaTypes.name,
      title: this.tables.schemaTypes.title,
      description: this.tables.schemaTypes.description
    }).from(this.tables.schemaTypes).where(eq(this.tables.schemaTypes.type, "object")).orderBy(this.tables.schemaTypes.title);
    return objectTypes.map((o) => ({
      name: o.name,
      title: o.title,
      description: o.description || void 0
    }));
  }
  async deleteSchemaType(name) {
    await this.db.delete(this.tables.schemaTypes).where(eq(this.tables.schemaTypes.name, name));
    console.log(`🗑️  Deleted schema type: ${name}`);
  }
}
class PostgreSQLOrganizationAdapter {
  db;
  tables;
  constructor(db2, tables) {
    this.db = db2;
    this.tables = tables;
  }
  // ============================================
  // ORGANIZATION CRUD
  // ============================================
  async createOrganization(data) {
    const result = await this.db.insert(this.tables.organizations).values(data).returning();
    return result[0];
  }
  async findAllOrganizations() {
    return this.db.select().from(this.tables.organizations);
  }
  async findOrganizationById(id) {
    const result = await this.db.select().from(this.tables.organizations).where(eq(this.tables.organizations.id, id)).limit(1);
    return result[0] || null;
  }
  async findOrganizationBySlug(slug) {
    const result = await this.db.select().from(this.tables.organizations).where(eq(this.tables.organizations.slug, slug)).limit(1);
    return result[0] || null;
  }
  async updateOrganization(id, data) {
    const result = await this.db.update(this.tables.organizations).set({
      ...data,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(this.tables.organizations.id, id)).returning();
    return result[0] || null;
  }
  async deleteOrganization(id) {
    const result = await this.db.delete(this.tables.organizations).where(eq(this.tables.organizations.id, id)).returning({ id: this.tables.organizations.id });
    return result.length > 0;
  }
  // ============================================
  // MEMBER MANAGEMENT
  // ============================================
  async addMember(data) {
    const result = await this.db.insert(this.tables.organizationMembers).values(data).returning();
    return result[0];
  }
  async removeMember(organizationId, userId) {
    const result = await this.db.delete(this.tables.organizationMembers).where(and(eq(this.tables.organizationMembers.organizationId, organizationId), eq(this.tables.organizationMembers.userId, userId))).returning({ id: this.tables.organizationMembers.id });
    return result.length > 0;
  }
  async removeAllMembers(organizationId) {
    const result = await this.db.delete(this.tables.organizationMembers).where(eq(this.tables.organizationMembers.organizationId, organizationId)).returning({ id: this.tables.organizationMembers.id });
    return result.length > 0;
  }
  async updateMemberRole(organizationId, userId, role) {
    const result = await this.db.update(this.tables.organizationMembers).set({
      role,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(and(eq(this.tables.organizationMembers.organizationId, organizationId), eq(this.tables.organizationMembers.userId, userId))).returning();
    return result[0] || null;
  }
  async findUserMembership(userId, organizationId) {
    const result = await this.db.select().from(this.tables.organizationMembers).where(and(eq(this.tables.organizationMembers.userId, userId), eq(this.tables.organizationMembers.organizationId, organizationId))).limit(1);
    return result[0] || null;
  }
  async findUserOrganizations(userId) {
    const result = await this.db.select().from(this.tables.organizationMembers).innerJoin(this.tables.organizations, eq(this.tables.organizationMembers.organizationId, this.tables.organizations.id)).where(eq(this.tables.organizationMembers.userId, userId));
    return result.map((row) => ({
      organization: row.cms_organizations,
      member: row.cms_organization_members
    }));
  }
  async findOrganizationMembers(organizationId) {
    const result = await this.db.select().from(this.tables.organizationMembers).where(eq(this.tables.organizationMembers.organizationId, organizationId));
    return result;
  }
  // ============================================
  // INVITATION MANAGEMENT
  // ============================================
  async createInvitation(data) {
    const result = await this.db.insert(this.tables.invitations).values(data).returning();
    return result[0];
  }
  async findInvitationByToken(token) {
    const result = await this.db.select().from(this.tables.invitations).where(eq(this.tables.invitations.token, token)).limit(1);
    return result[0] || null;
  }
  async findOrganizationInvitations(organizationId) {
    const result = await this.db.select().from(this.tables.invitations).where(eq(this.tables.invitations.organizationId, organizationId));
    return result;
  }
  async findInvitationsByEmail(email) {
    const result = await this.db.select().from(this.tables.invitations).where(eq(this.tables.invitations.email, email.toLowerCase()));
    return result;
  }
  async acceptInvitation(token, userId) {
    const invitation = await this.findInvitationByToken(token);
    if (!invitation) {
      throw new Error("Invitation not found");
    }
    if (invitation.acceptedAt) {
      throw new Error("Invitation already accepted");
    }
    if (invitation.expiresAt < /* @__PURE__ */ new Date()) {
      throw new Error("Invitation expired");
    }
    const existingMembership = await this.findUserMembership(userId, invitation.organizationId);
    if (existingMembership) {
      await this.db.update(this.tables.invitations).set({ acceptedAt: /* @__PURE__ */ new Date() }).where(eq(this.tables.invitations.token, token));
      return existingMembership;
    }
    const member = await this.addMember({
      organizationId: invitation.organizationId,
      userId,
      role: invitation.role,
      invitationId: invitation.id
    });
    await this.db.update(this.tables.invitations).set({ acceptedAt: /* @__PURE__ */ new Date() }).where(eq(this.tables.invitations.token, token));
    return member;
  }
  async deleteInvitation(id) {
    const result = await this.db.delete(this.tables.invitations).where(eq(this.tables.invitations.id, id)).returning({ id: this.tables.invitations.id });
    return result.length > 0;
  }
  async removeAllInvitations(organizationId) {
    const result = await this.db.delete(this.tables.invitations).where(eq(this.tables.invitations.organizationId, organizationId)).returning({ id: this.tables.invitations.id });
    return result.length > 0;
  }
  async cleanupExpiredInvitations() {
    const result = await this.db.delete(this.tables.invitations).where(sql`${this.tables.invitations.expiresAt} < NOW()`).returning({ id: this.tables.invitations.id });
    return result.length;
  }
  // ============================================
  // USER SESSION MANAGEMENT
  // ============================================
  async updateUserSession(userId, organizationId) {
    await this.db.insert(this.tables.userSessions).values({
      userId,
      activeOrganizationId: organizationId,
      updatedAt: /* @__PURE__ */ new Date()
    }).onConflictDoUpdate({
      target: this.tables.userSessions.userId,
      set: {
        activeOrganizationId: organizationId,
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
  }
  async findUserSession(userId) {
    const result = await this.db.select().from(this.tables.userSessions).where(eq(this.tables.userSessions.userId, userId)).limit(1);
    return result[0] || null;
  }
  async deleteUserSession(userId) {
    const result = await this.db.delete(this.tables.userSessions).where(eq(this.tables.userSessions.userId, userId)).returning({ userId: this.tables.userSessions.userId });
    return result.length > 0;
  }
}
const documentStatusEnum = pgEnum("document_status", ["draft", "published"]);
const schemaTypeEnum = pgEnum("schema_type", ["document", "object"]);
const organizationRoleEnum = pgEnum("organization_role", [
  "owner",
  "admin",
  "editor",
  "viewer"
]);
const organizations = pgTable("cms_organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  parentOrganizationId: uuid("parent_organization_id").references(() => organizations.id, {
    onDelete: "set null"
  }),
  // For parent-child hierarchy (e.g., Record Label -> Artists)
  metadata: jsonb("metadata").$type(),
  createdBy: text("created_by").notNull(),
  // User ID (super admin who created it)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
const organizationMembers = pgTable("cms_organization_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  // References Better Auth user
  role: organizationRoleEnum("role").notNull(),
  preferences: jsonb("preferences").$type(),
  // Org-specific user preferences
  invitationId: uuid("invitation_id").references(() => invitations.id, { onDelete: "set null" }),
  // Link to invitation (get invitedBy, invitedEmail from here)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => [unique().on(table.organizationId, table.userId)]);
const invitations = pgTable("cms_invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  role: organizationRoleEnum("role").notNull(),
  token: text("token").notNull().unique(),
  // Crypto-random token (32 bytes)
  invitedBy: text("invited_by").notNull(),
  // User ID of inviter
  expiresAt: timestamp("expires_at").notNull(),
  // Default: now() + 7 days
  acceptedAt: timestamp("accepted_at"),
  // Null until accepted
  createdAt: timestamp("created_at").defaultNow().notNull()
});
const instanceSettings = pgTable("cms_instance_settings", {
  id: text("id").primaryKey().default("default"),
  settings: jsonb("settings").$type().default({}).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
const userSessions = pgTable("cms_user_sessions", {
  userId: text("user_id").primaryKey(),
  // References Better Auth user
  activeOrganizationId: uuid("active_organization_id").references(() => organizations.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
const documents = pgTable("cms_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 100 }).notNull(),
  // Document type name
  status: documentStatusEnum("status").default("draft"),
  // 'draft' | 'published'
  // Draft/Published data separation
  draftData: jsonb("draft_data"),
  // Current working version
  publishedData: jsonb("published_data"),
  // Live/published version
  // Version tracking
  publishedHash: varchar("published_hash", { length: 20 }),
  // Hash of published content for change detection
  // User tracking (no FK - references user in app layer)
  createdBy: text("created_by"),
  // User ID who created this document
  updatedBy: text("updated_by"),
  // User ID who last updated this document
  // Metadata
  publishedAt: timestamp("published_at"),
  // When was it published
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, () => [
  pgPolicy("documents_org_isolation", {
    for: "all",
    using: sql`(current_setting('app.override_access', true) = 'true') OR (organization_id IN (SELECT current_setting('app.organization_id', true)::uuid UNION SELECT id FROM cms_organizations WHERE parent_organization_id = current_setting('app.organization_id', true)::uuid))`,
    withCheck: sql`(current_setting('app.override_access', true) = 'true') OR (organization_id = current_setting('app.organization_id', true)::uuid)`
  })
]);
const assets = pgTable("cms_assets", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  // Asset type: 'image' or 'file'
  assetType: varchar("asset_type", { length: 20 }).notNull(),
  // 'image' | 'file'
  // File information
  filename: varchar("filename", { length: 255 }).notNull(),
  // Generated filename on disk
  originalFilename: varchar("original_filename", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  size: integer("size").notNull(),
  // Storage information
  url: text("url").notNull(),
  // Public URL
  path: text("path").notNull(),
  // Internal storage path
  storageAdapter: varchar("storage_adapter", { length: 50 }).notNull().default("local"),
  // Which adapter stored this file
  // Image-specific metadata (null for non-images)
  width: integer("width"),
  height: integer("height"),
  // Rich metadata (Sanity-style)
  metadata: jsonb("metadata"),
  // EXIF, color palette, etc.
  // Optional fields (can be set during upload or later)
  title: varchar("title", { length: 255 }),
  description: text("description"),
  alt: text("alt"),
  creditLine: text("credit_line"),
  // User tracking (no FK - references user in app layer)
  createdBy: text("created_by"),
  // User ID who uploaded this asset
  updatedBy: text("updated_by"),
  // User ID who last updated this asset
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
}, () => [
  pgPolicy("assets_org_isolation", {
    for: "all",
    using: sql`(current_setting('app.override_access', true) = 'true') OR (organization_id IN (SELECT current_setting('app.organization_id', true)::uuid UNION SELECT id FROM cms_organizations WHERE parent_organization_id = current_setting('app.organization_id', true)::uuid))`,
    withCheck: sql`(current_setting('app.override_access', true) = 'true') OR (organization_id = current_setting('app.organization_id', true)::uuid)`
  })
]);
const schemaTypes = pgTable("cms_schema_types", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  title: varchar("title", { length: 200 }).notNull(),
  type: schemaTypeEnum("type").notNull(),
  // 'document' or 'object'
  description: text("description"),
  fields: jsonb("fields").notNull(),
  // Field definitions
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
const userProfiles = pgTable("cms_user_profiles", {
  userId: text("user_id").primaryKey(),
  // No FK - references user in app layer
  role: text("role", { enum: ["super_admin", "admin", "editor", "viewer"] }).default("editor").notNull(),
  preferences: jsonb("preferences").$type(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
const cmsSchema$1 = {
  // Multi-tenancy tables
  organizations,
  organizationMembers,
  invitations,
  instanceSettings,
  userSessions,
  // Content tables
  documents,
  assets,
  schemaTypes,
  userProfiles,
  // Enums
  documentStatusEnum,
  schemaTypeEnum,
  organizationRoleEnum
};
function pgConnectionUrl(env) {
  const { DATABASE_URL, PG_HOST, PG_PORT, PG_USER, PG_PASSWORD, PG_DATABASE } = env;
  if (DATABASE_URL)
    return DATABASE_URL;
  if (PG_HOST && PG_PORT && PG_USER && PG_PASSWORD && PG_DATABASE) {
    return `postgresql://${PG_USER}:${PG_PASSWORD}@${PG_HOST}:${PG_PORT}/${PG_DATABASE}`;
  }
  throw new Error("DATABASE_URL is not set, you can alternatively set PG_HOST, PG_PORT, PG_USER, PG_PASSWORD, and PG_DATABASE environment variables.");
}
class PostgreSQLAdapter {
  db;
  tables;
  documentAdapter;
  assetAdapter;
  userProfileAdapter;
  schemaAdapter;
  organizationAdapter;
  rlsEnabled;
  hierarchyEnabled;
  constructor(config) {
    this.db = config.db;
    this.tables = config.tables;
    this.rlsEnabled = config.multiTenancy?.enableRLS ?? true;
    this.hierarchyEnabled = config.multiTenancy?.enableHierarchy ?? true;
    this.documentAdapter = new PostgreSQLDocumentAdapter(this.db, this.tables);
    this.assetAdapter = new PostgreSQLAssetAdapter(this.db, this.tables);
    this.userProfileAdapter = new PostgreSQLUserProfileAdapter(this.db, this.tables);
    this.schemaAdapter = new PostgreSQLSchemaAdapter(this.db, this.tables);
    this.organizationAdapter = new PostgreSQLOrganizationAdapter(this.db, this.tables);
  }
  // Document operations - delegate to document adapter with RLS context
  async createDocument(data) {
    return this.withOrgContext(data.organizationId, () => this.documentAdapter.createDocument(data));
  }
  async updateDocDraft(organizationId, id, data, updatedBy) {
    return this.withOrgContext(organizationId, async () => {
      let document = await this.documentAdapter.updateDocDraft(organizationId, id, data, updatedBy);
      if (!document && this.hierarchyEnabled) {
        const childOrgIds = await this.getChildOrganizations(organizationId);
        for (const childOrgId of childOrgIds) {
          document = await this.documentAdapter.updateDocDraft(childOrgId, id, data, updatedBy);
          if (document)
            break;
        }
      }
      return document;
    });
  }
  async deleteDocById(organizationId, id) {
    return this.withOrgContext(organizationId, async () => {
      let deleted = await this.documentAdapter.deleteDocById(organizationId, id);
      if (!deleted && this.hierarchyEnabled) {
        const childOrgIds = await this.getChildOrganizations(organizationId);
        for (const childOrgId of childOrgIds) {
          deleted = await this.documentAdapter.deleteDocById(childOrgId, id);
          if (deleted)
            break;
        }
      }
      return deleted;
    });
  }
  async publishDoc(organizationId, id) {
    return this.withOrgContext(organizationId, async () => {
      let document = await this.documentAdapter.publishDoc(organizationId, id);
      if (!document && this.hierarchyEnabled) {
        const childOrgIds = await this.getChildOrganizations(organizationId);
        for (const childOrgId of childOrgIds) {
          document = await this.documentAdapter.publishDoc(childOrgId, id);
          if (document)
            break;
        }
      }
      return document;
    });
  }
  async unpublishDoc(organizationId, id) {
    return this.withOrgContext(organizationId, async () => {
      let document = await this.documentAdapter.unpublishDoc(organizationId, id);
      if (!document && this.hierarchyEnabled) {
        const childOrgIds = await this.getChildOrganizations(organizationId);
        for (const childOrgId of childOrgIds) {
          document = await this.documentAdapter.unpublishDoc(childOrgId, id);
          if (document)
            break;
        }
      }
      return document;
    });
  }
  async countDocsByType(organizationId, type) {
    return this.withOrgContext(organizationId, async () => {
      let count = await this.documentAdapter.countDocsByType(organizationId, type);
      if (this.hierarchyEnabled) {
        const childOrgIds = await this.getChildOrganizations(organizationId);
        for (const childOrgId of childOrgIds) {
          const childCount = await this.documentAdapter.countDocsByType(childOrgId, type);
          count += childCount;
        }
      }
      return count;
    });
  }
  async getDocCountsByType(organizationId) {
    return this.withOrgContext(organizationId, async () => {
      const counts = await this.documentAdapter.getDocCountsByType(organizationId);
      if (this.hierarchyEnabled) {
        const childOrgIds = await this.getChildOrganizations(organizationId);
        for (const childOrgId of childOrgIds) {
          const childCounts = await this.documentAdapter.getDocCountsByType(childOrgId);
          for (const [type, count] of Object.entries(childCounts)) {
            counts[type] = (counts[type] || 0) + count;
          }
        }
      }
      return counts;
    });
  }
  // Asset operations - delegate to asset adapter with RLS context
  async createAsset(data) {
    return this.withOrgContext(data.organizationId, () => this.assetAdapter.createAsset(data));
  }
  async findAssetById(organizationId, id) {
    return this.withOrgContext(organizationId, async () => {
      if (this.hierarchyEnabled) {
        const childOrgIds = await this.getChildOrganizations(organizationId);
        const allOrgIds = [organizationId, ...childOrgIds];
        return this.assetAdapter.findAssetByIdInOrgs(allOrgIds, id);
      }
      return this.assetAdapter.findAssetById(organizationId, id);
    });
  }
  async findAssetByIdGlobal(id) {
    return this.assetAdapter.findAssetByIdGlobal(id);
  }
  async findAssets(organizationId, filters) {
    return this.withOrgContext(organizationId, async () => {
      if (this.hierarchyEnabled && filters?.includeChildOrganizations && !filters?.filterOrganizationIds) {
        const childOrgIds = await this.getChildOrganizations(organizationId);
        console.log(`[Hierarchy] Parent org ${organizationId} has ${childOrgIds.length} child orgs for assets:`, childOrgIds);
        const orgIds = [organizationId, ...childOrgIds];
        return this.assetAdapter.findAssets(organizationId, {
          ...filters,
          filterOrganizationIds: orgIds
        });
      }
      return this.assetAdapter.findAssets(organizationId, filters);
    });
  }
  async updateAsset(organizationId, id, data) {
    return this.withOrgContext(organizationId, async () => {
      let asset = await this.assetAdapter.updateAsset(organizationId, id, data);
      if (!asset && this.hierarchyEnabled) {
        const childOrgIds = await this.getChildOrganizations(organizationId);
        for (const childOrgId of childOrgIds) {
          asset = await this.assetAdapter.updateAsset(childOrgId, id, data);
          if (asset)
            break;
        }
      }
      return asset;
    });
  }
  async deleteAsset(organizationId, id) {
    return this.withOrgContext(organizationId, async () => {
      let deleted = await this.assetAdapter.deleteAsset(organizationId, id);
      if (!deleted && this.hierarchyEnabled) {
        const childOrgIds = await this.getChildOrganizations(organizationId);
        for (const childOrgId of childOrgIds) {
          deleted = await this.assetAdapter.deleteAsset(childOrgId, id);
          if (deleted)
            break;
        }
      }
      return deleted;
    });
  }
  async countAssets(organizationId) {
    return this.withOrgContext(organizationId, () => this.assetAdapter.countAssets(organizationId));
  }
  async countAssetsByType(organizationId) {
    return this.withOrgContext(organizationId, () => this.assetAdapter.countAssetsByType(organizationId));
  }
  async getTotalAssetsSize(organizationId) {
    return this.withOrgContext(organizationId, () => this.assetAdapter.getTotalAssetsSize(organizationId));
  }
  // Advanced filtering methods (for unified Local API)
  async findManyDocAdvanced(organizationId, collectionName, options) {
    return this.withOrgContext(organizationId, async () => {
      if (this.hierarchyEnabled && options?.includeChildOrganizations) {
        const childOrgIds = await this.getChildOrganizations(organizationId);
        if (childOrgIds.length > 0) {
          console.log(`[Hierarchy] Parent org ${organizationId} has ${childOrgIds.length} child orgs (advanced query):`, childOrgIds);
          const orgIds = [organizationId, ...childOrgIds];
          return this.documentAdapter.findManyDocAdvanced(organizationId, collectionName, {
            ...options,
            filterOrganizationIds: orgIds
          });
        }
      }
      return this.documentAdapter.findManyDocAdvanced(organizationId, collectionName, options);
    });
  }
  async findByDocIdAdvanced(organizationId, id, options) {
    return this.withOrgContext(organizationId, async () => {
      if (this.hierarchyEnabled) {
        const childOrgIds = await this.getChildOrganizations(organizationId);
        if (childOrgIds.length > 0) {
          console.log(`[Hierarchy] Parent org ${organizationId} has ${childOrgIds.length} child orgs (advanced query):`, childOrgIds);
          const orgIds = [organizationId, ...childOrgIds];
          return this.documentAdapter.findByDocIdAdvanced(organizationId, id, {
            ...options,
            filterOrganizationIds: orgIds
          });
        }
      }
      return this.documentAdapter.findByDocIdAdvanced(organizationId, id, options);
    });
  }
  async countDocuments(organizationId, collectionName, where) {
    return this.withOrgContext(organizationId, () => this.documentAdapter.countDocuments(organizationId, collectionName, where));
  }
  async findManyAssetsAdvanced(organizationId, options) {
    return this.withOrgContext(organizationId, () => this.assetAdapter.findManyAssetsAdvanced(organizationId, options));
  }
  async findAssetByIdAdvanced(organizationId, id) {
    return this.withOrgContext(organizationId, () => this.assetAdapter.findAssetByIdAdvanced(organizationId, id));
  }
  async countAssetsAdvanced(organizationId, where) {
    return this.withOrgContext(organizationId, () => this.assetAdapter.countAssetsAdvanced(organizationId, where));
  }
  // User Profile operations - delegate to user profile adapter
  async createUserProfile(data) {
    return this.userProfileAdapter.createUserProfile(data);
  }
  async findUserProfileById(userId) {
    return this.userProfileAdapter.findUserProfileById(userId);
  }
  async deleteUserProfile(userId) {
    return this.userProfileAdapter.deleteUserProfile(userId);
  }
  /**
   * Check if any user profiles exist (for detecting first user)
   */
  async hasAnyUserProfiles() {
    const result = await this.db.select().from(this.tables.userProfiles).limit(1);
    return result.length > 0;
  }
  // Schema operations - delegate to schema adapter
  async registerSchemaType(schemaType) {
    return this.schemaAdapter.registerSchemaType(schemaType);
  }
  async getSchemaType(name) {
    return this.schemaAdapter.getSchemaType(name);
  }
  async listDocumentTypes() {
    return this.schemaAdapter.listDocumentTypes();
  }
  async listObjectTypes() {
    return this.schemaAdapter.listObjectTypes();
  }
  async listSchemas() {
    return this.schemaAdapter.listSchemas();
  }
  async deleteSchemaType(name) {
    return this.schemaAdapter.deleteSchemaType(name);
  }
  // Organization operations - delegate to organization adapter
  async createOrganization(data) {
    return this.organizationAdapter.createOrganization(data);
  }
  async findAllOrganizations() {
    return this.organizationAdapter.findAllOrganizations();
  }
  async findOrganizationById(id) {
    return this.organizationAdapter.findOrganizationById(id);
  }
  async findOrganizationBySlug(slug) {
    return this.organizationAdapter.findOrganizationBySlug(slug);
  }
  async updateOrganization(id, data) {
    return this.organizationAdapter.updateOrganization(id, data);
  }
  async deleteOrganization(id) {
    return this.organizationAdapter.deleteOrganization(id);
  }
  async addMember(data) {
    return this.organizationAdapter.addMember(data);
  }
  async removeMember(organizationId, userId) {
    return this.organizationAdapter.removeMember(organizationId, userId);
  }
  async removeAllMembers(organizationId) {
    return this.organizationAdapter.removeAllMembers(organizationId);
  }
  async updateMemberRole(organizationId, userId, role) {
    return this.organizationAdapter.updateMemberRole(organizationId, userId, role);
  }
  async findUserMembership(userId, organizationId) {
    return this.organizationAdapter.findUserMembership(userId, organizationId);
  }
  async findUserOrganizations(userId) {
    return this.organizationAdapter.findUserOrganizations(userId);
  }
  async findOrganizationMembers(organizationId) {
    return this.organizationAdapter.findOrganizationMembers(organizationId);
  }
  async createInvitation(data) {
    return this.organizationAdapter.createInvitation(data);
  }
  async findInvitationByToken(token) {
    return this.organizationAdapter.findInvitationByToken(token);
  }
  async findOrganizationInvitations(organizationId) {
    return this.organizationAdapter.findOrganizationInvitations(organizationId);
  }
  async findInvitationsByEmail(email) {
    return this.organizationAdapter.findInvitationsByEmail(email);
  }
  async acceptInvitation(token, userId) {
    return this.organizationAdapter.acceptInvitation(token, userId);
  }
  async deleteInvitation(id) {
    return this.organizationAdapter.deleteInvitation(id);
  }
  async removeAllInvitations(organizationId) {
    return this.organizationAdapter.removeAllInvitations(organizationId);
  }
  async cleanupExpiredInvitations() {
    return this.organizationAdapter.cleanupExpiredInvitations();
  }
  async updateUserSession(userId, organizationId) {
    return this.organizationAdapter.updateUserSession(userId, organizationId);
  }
  async findUserSession(userId) {
    return this.organizationAdapter.findUserSession(userId);
  }
  async deleteUserSession(userId) {
    return this.organizationAdapter.deleteUserSession(userId);
  }
  async updateUserPreferences(userId, preferences) {
    return this.userProfileAdapter.updateUserPreferences(userId, preferences);
  }
  // Instance settings operations
  async getInstanceSettings() {
    const result = await this.db.select().from(this.tables.instanceSettings).where(eq(this.tables.instanceSettings.id, "default")).limit(1);
    const defaults = { allowUserOrgCreation: false };
    if (result.length === 0 || !result[0]) {
      return defaults;
    }
    return result[0].settings ?? defaults;
  }
  async updateInstanceSettings(settings) {
    const existing = await this.db.select().from(this.tables.instanceSettings).where(eq(this.tables.instanceSettings.id, "default")).limit(1);
    if (existing.length === 0) {
      const rows2 = await this.db.insert(this.tables.instanceSettings).values({
        id: "default",
        settings,
        updatedAt: /* @__PURE__ */ new Date()
      }).returning();
      return rows2[0]?.settings ?? settings;
    }
    const merged = { ...existing[0]?.settings ?? {}, ...settings };
    const rows = await this.db.update(this.tables.instanceSettings).set({ settings: merged, updatedAt: /* @__PURE__ */ new Date() }).where(eq(this.tables.instanceSettings.id, "default")).returning();
    return rows[0]?.settings ?? merged;
  }
  // Multi-tenancy RLS helper methods
  /**
   * Initialize RLS by enabling or disabling it on content tables based on config
   * Call this after running migrations to set up RLS according to your configuration
   */
  async initializeRLS() {
    const action = this.rlsEnabled ? "ENABLE" : "DISABLE";
    try {
      await this.db.execute(sql.raw(`ALTER TABLE cms_documents ${action} ROW LEVEL SECURITY`));
      await this.db.execute(sql.raw(`ALTER TABLE cms_assets ${action} ROW LEVEL SECURITY`));
      console.log(`[PostgreSQLAdapter]: RLS ${action}D on content tables`);
    } catch (error) {
      console.error(`[PostgreSQLAdapter]: Failed to ${action} RLS:`, error);
      throw error;
    }
  }
  /**
   * Execute a function within a transaction with organization context set for RLS
   * This ensures SET LOCAL is properly scoped and won't leak between requests in connection pooling
   *
   * @param organizationId - The organization ID to set as context
   * @param fn - Function to execute within the transaction context
   * @param options - Optional configuration
   * @param options.overrideAccess - Bypass RLS policies (for system operations)
   * @param options.userId - User ID for audit logging
   * @param options.userRole - User role for RLS policy checks
   * @returns The result of the function
   *
   * @example
   * // Regular operation with RLS
   * const documents = await adapter.withOrgContext(auth.organizationId, async () => {
   *   return adapter.findManyDoc(auth.organizationId, { type: 'post' });
   * });
   *
   * @example
   * // System operation bypassing RLS
   * const allDocuments = await adapter.withOrgContext('system', async () => {
   *   return adapter.findManyDoc('', { type: 'post' });
   * }, { overrideAccess: true });
   */
  async withOrgContext(organizationId, fn, options) {
    if (!this.rlsEnabled) {
      return fn();
    }
    if (options?.overrideAccess) {
      return this.db.transaction(async (tx) => {
        await tx.execute(sql.raw(`SET LOCAL app.override_access = 'true'`));
        return fn();
      });
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (organizationId && !uuidRegex.test(organizationId)) {
      throw new Error("Invalid organization ID format");
    }
    return this.db.transaction(async (tx) => {
      await tx.execute(sql.raw(`SET LOCAL app.organization_id = '${organizationId}'`));
      if (options?.userId) {
        await tx.execute(sql.raw(`SET LOCAL app.user_id = '${options.userId}'`));
      }
      if (options?.userRole) {
        await tx.execute(sql.raw(`SET LOCAL app.user_role = '${options.userRole}'`));
      }
      return fn();
    });
  }
  /**
   * Get all child organizations for a given parent organization
   * Used for parent-child hierarchy access control
   * @param parentOrganizationId - The parent organization ID
   * @returns Array of child organization IDs
   */
  async getChildOrganizations(parentOrganizationId) {
    if (!this.hierarchyEnabled) {
      return [];
    }
    try {
      const children = await this.db.select({ id: this.tables.organizations.id }).from(this.tables.organizations).where(eq(this.tables.organizations.parentOrganizationId, parentOrganizationId));
      return children.map((child) => child.id);
    } catch (error) {
      console.error("[PostgreSQLAdapter]: Failed to get child organizations:", error);
      throw error;
    }
  }
  // Asset reference methods
  async findDocumentsReferencingAsset(organizationId, assetId) {
    return this.withOrgContext(organizationId, () => this.documentAdapter.findDocumentsReferencingAsset(organizationId, assetId));
  }
  async countDocumentReferencesForAssets(organizationId, assetIds) {
    return this.withOrgContext(organizationId, () => this.documentAdapter.countDocumentReferencesForAssets(organizationId, assetIds));
  }
  // Connection management
  async disconnect() {
  }
  // Health check
  async isHealthy() {
    try {
      await this.db.select().from(this.tables.organizations).limit(1);
      return true;
    } catch (error) {
      console.error("Database health check failed:", error);
      return false;
    }
  }
}
class PostgreSQLProvider {
  name = "postgresql";
  config;
  constructor(config) {
    this.config = config;
  }
  createAdapter() {
    if (this.config.client) {
      const db3 = drizzle(this.config.client, { schema: cmsSchema$1 });
      return new PostgreSQLAdapter({
        db: db3,
        tables: cmsSchema$1,
        multiTenancy: this.config.multiTenancy
      });
    }
    if (!this.config.connectionString) {
      throw new Error("PostgreSQL adapter requires either a client or connectionString");
    }
    const client2 = postgres(this.config.connectionString, this.config.options);
    const db2 = drizzle(client2, { schema: cmsSchema$1 });
    return new PostgreSQLAdapter({
      db: db2,
      tables: cmsSchema$1,
      multiTenancy: this.config.multiTenancy
    });
  }
}
function createPostgreSQLProvider(config) {
  return new PostgreSQLProvider(config);
}
const cmsSchema = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  assets,
  documentStatusEnum,
  documents,
  instanceSettings,
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
  configId: text("config_id").notNull().default("default"),
  name: text("name"),
  start: text("start"),
  prefix: text("prefix"),
  key: text("key").notNull(),
  referenceId: text("reference_id").notNull(),
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
const databaseUrl = pgConnectionUrl(private_env);
const client = postgres(databaseUrl, { max: 50 });
const drizzleDb = drizzle(client, { schema });
const provider = createPostgreSQLProvider({
  client,
  multiTenancy: {
    enableRLS: true,
    enableHierarchy: true
  }
});
const adapter = provider.createAdapter();
const db = adapter;

export { db as a, apikey as b, organizationMembers as c, drizzleDb as d, invitations as i, organizations as o, user as u };
//# sourceMappingURL=index2-CZgae6HB.js.map
