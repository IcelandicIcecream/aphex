import { stat, mkdir, writeFile, unlink, readdir } from 'fs/promises';
import { join, dirname } from 'path';

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;
const DEFAULT_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "application/pdf",
  "text/plain"
];
class LocalStorageAdapter {
  name = "local";
  config;
  constructor(config) {
    this.config = {
      basePath: config.basePath,
      baseUrl: config.baseUrl || "",
      maxFileSize: config.maxFileSize || DEFAULT_MAX_FILE_SIZE,
      allowedTypes: config.allowedTypes || DEFAULT_ALLOWED_TYPES,
      options: config.options || {}
    };
  }
  /**
   * Generate unique filename preserving original name
   */
  async generateUniqueFilename(originalFilename) {
    const { name, ext } = this.parseFilename(originalFilename);
    let filename = originalFilename;
    let counter = 1;
    while (await this.fileExistsOnDisk(filename)) {
      filename = `${name} (${counter})${ext}`;
      counter++;
    }
    return filename;
  }
  /**
   * Parse filename into name and extension
   */
  parseFilename(filename) {
    const lastDotIndex = filename.lastIndexOf(".");
    if (lastDotIndex === -1) {
      return { name: filename, ext: "" };
    }
    return {
      name: filename.substring(0, lastDotIndex),
      ext: filename.substring(lastDotIndex)
    };
  }
  /**
   * Check if file exists on disk
   */
  async fileExistsOnDisk(filename) {
    try {
      const filePath = join(this.config.basePath, filename);
      await stat(filePath);
      return true;
    } catch {
      return false;
    }
  }
  /**
   * Store a file and return storage info
   */
  async store(data) {
    if (!this.config.allowedTypes.includes(data.mimeType)) {
      throw new Error(`Invalid file type: ${data.mimeType}. Allowed types: ${this.config.allowedTypes.join(", ")}`);
    }
    if (data.size > this.config.maxFileSize) {
      throw new Error(`File too large: ${data.size} bytes. Maximum size: ${this.config.maxFileSize} bytes`);
    }
    const filename = await this.generateUniqueFilename(data.filename);
    const filePath = join(this.config.basePath, filename);
    const url = "";
    console.log("[LocalStorageAdapter] Storing file:", {
      filename,
      filePath,
      note: "URL will be generated as /assets/{assetId}/{filename}",
      basePath: this.config.basePath
    });
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, data.buffer);
    return {
      path: filePath,
      url,
      // Empty - API will generate clean URL with asset ID
      size: data.size
    };
  }
  /**
   * Read a file from storage
   * Used by API endpoint to serve files
   */
  async getObject(path) {
    const { readFile } = await import('fs/promises');
    return await readFile(path);
  }
  /**
   * Delete a file from storage
   */
  async delete(path) {
    try {
      await unlink(path);
      return true;
    } catch (error) {
      console.warn("Could not delete file from disk:", error);
      return false;
    }
  }
  /**
   * Check if file exists
   */
  async exists(path) {
    try {
      await stat(path);
      return true;
    } catch {
      return false;
    }
  }
  /**
   * Get public URL for a file path
   */
  getUrl(path) {
    const filename = path.split("/").pop() || "";
    return `${this.config.baseUrl}/${encodeURIComponent(filename)}`;
  }
  /**
   * Get storage information
   */
  async getStorageInfo() {
    try {
      const files = await readdir(this.config.basePath);
      let totalSize = 0;
      for (const file of files) {
        try {
          const filePath = join(this.config.basePath, file);
          const stats = await stat(filePath);
          if (stats.isFile()) {
            totalSize += stats.size;
          }
        } catch {
        }
      }
      return { totalSize };
    } catch (error) {
      console.error("Error getting storage info:", error);
      return { totalSize: 0 };
    }
  }
  /**
   * Health check - test if we can write to storage
   */
  async isHealthy() {
    try {
      const testFile = join(this.config.basePath, `health-check-${Date.now()}.tmp`);
      await mkdir(dirname(testFile), { recursive: true });
      await writeFile(testFile, "health check");
      await unlink(testFile);
      return true;
    } catch (error) {
      console.error("Storage health check failed:", error);
      return false;
    }
  }
}
class LocalStorageProvider {
  name = "local";
  createAdapter(config) {
    return new LocalStorageAdapter(config);
  }
}
class StorageProviderRegistry {
  providers = /* @__PURE__ */ new Map();
  constructor() {
    this.register(new LocalStorageProvider());
  }
  register(provider) {
    this.providers.set(provider.name.toLowerCase(), provider);
  }
  get(name) {
    return this.providers.get(name.toLowerCase());
  }
  list() {
    return Array.from(this.providers.keys());
  }
}
const storageProviders = new StorageProviderRegistry();
function createStorageAdapter(providerName, config) {
  const provider = storageProviders.get(providerName);
  if (!provider) {
    const available = storageProviders.list();
    throw new Error(`Unknown storage provider: ${providerName}. Available providers: ${available.join(", ")}`);
  }
  return provider.createAdapter(config);
}

export { createStorageAdapter as c };
//# sourceMappingURL=storage-_ubboXxO.js.map
