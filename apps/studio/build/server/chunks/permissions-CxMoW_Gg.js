class PermissionError extends Error {
  constructor(message, operation, resource) {
    super(message);
    this.operation = operation;
    this.resource = resource;
    this.name = "PermissionError";
  }
}
class PermissionChecker {
  constructor(_config, schemas) {
    this._config = _config;
    this.schemas = schemas;
  }
  /**
   * Get the CMS config
   * Available for future per-collection permission logic
   */
  get config() {
    return this._config;
  }
  /**
   * Check if the current context has read permissions for a collection
   */
  async canRead(context, collectionName) {
    if (context.overrideAccess) {
      return;
    }
    if (!context.user) {
      throw new PermissionError(
        "Authentication required for read operations",
        "read",
        collectionName
      );
    }
    return;
  }
  /**
   * Check if the current context has write permissions (create/update)
   */
  async canWrite(context, collectionName) {
    if (context.overrideAccess) {
      return;
    }
    if (!context.user) {
      throw new PermissionError(
        "Authentication required for write operations",
        "write",
        collectionName
      );
    }
    if (context.user.role === "viewer") {
      throw new PermissionError(
        "Write permission denied. Viewers have read-only access.",
        "write",
        collectionName
      );
    }
    return;
  }
  /**
   * Check if the current context has delete permissions
   */
  async canDelete(context, collectionName) {
    if (context.overrideAccess) {
      return;
    }
    if (!context.user) {
      throw new PermissionError(
        "Authentication required for delete operations",
        "delete",
        collectionName
      );
    }
    if (context.user.role === "viewer") {
      throw new PermissionError(
        "Delete permission denied. Viewers have read-only access.",
        "delete",
        collectionName
      );
    }
    return;
  }
  /**
   * Check if the current context has publish permissions
   */
  async canPublish(context, collectionName) {
    if (context.overrideAccess) {
      return;
    }
    if (!context.user) {
      throw new PermissionError(
        "Authentication required for publish operations",
        "publish",
        collectionName
      );
    }
    if (context.user.role === "viewer") {
      throw new PermissionError(
        "Publish permission denied. Viewers have read-only access.",
        "publish",
        collectionName
      );
    }
    return;
  }
  /**
   * Validate that a collection exists in the schema
   */
  validateCollection(collectionName) {
    if (!this.schemas.has(collectionName)) {
      throw new Error(
        `Collection "${collectionName}" not found in schema. Available collections: ${Array.from(
          this.schemas.keys()
        ).join(", ")}`
      );
    }
  }
}

export { PermissionError as P, PermissionChecker as a };
//# sourceMappingURL=permissions-CxMoW_Gg.js.map
