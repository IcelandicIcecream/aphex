import { c as cmsLogger } from './logger-C1WBmfZZ.js';
import { j as json } from './index-BcOZ6EV9.js';
import './storage-CxrQC-cN.js';
import 'sharp';
import './date-utils-xyIWAIQq.js';
import './utils-FiC4zhrQ.js';
import 'fs/promises';
import 'path';
import './_commonjsHelpers-C1uiShF5.js';

function detectMimeType(buffer) {
  if (buffer.length < 4) return null;
  if (buffer[0] === 37 && buffer[1] === 80 && buffer[2] === 68 && buffer[3] === 70) {
    return "application/pdf";
  }
  if (buffer[0] === 137 && buffer[1] === 80 && buffer[2] === 78 && buffer[3] === 71) {
    return "image/png";
  }
  if (buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) {
    return "image/jpeg";
  }
  if (buffer[0] === 71 && buffer[1] === 73 && buffer[2] === 70 && buffer[3] === 56 && (buffer[4] === 55 || buffer[4] === 57) && buffer[5] === 97) {
    return "image/gif";
  }
  if (buffer.length >= 12 && buffer[0] === 82 && buffer[1] === 73 && buffer[2] === 70 && buffer[3] === 70 && buffer[8] === 87 && buffer[9] === 69 && buffer[10] === 66 && buffer[11] === 80) {
    return "image/webp";
  }
  if (buffer.length >= 12) {
    const ftypStr = buffer.subarray(4, 8).toString("ascii");
    if (ftypStr === "ftyp") {
      const brand = buffer.subarray(8, 12).toString("ascii");
      if (brand === "avif") return "image/avif";
      if (brand === "heic" || brand === "heix") return "image/heic";
      if (brand.startsWith("mp4") || brand === "isom") return "video/mp4";
    }
  }
  const head = buffer.subarray(0, Math.min(buffer.length, 256)).toString("utf-8");
  if (head.trimStart().startsWith("<") && head.includes("<svg")) {
    return "image/svg+xml";
  }
  if (buffer[0] === 80 && buffer[1] === 75 && buffer[2] === 3 && buffer[3] === 4) {
    return detectZipFormat(buffer);
  }
  if (buffer[0] === 208 && buffer[1] === 207 && buffer[2] === 17 && buffer[3] === 224) {
    return "application/msword";
  }
  if (buffer[0] === 0 && buffer[1] === 97 && buffer[2] === 115 && buffer[3] === 109) {
    return "application/wasm";
  }
  if (buffer[0] === 127 && buffer[1] === 69 && buffer[2] === 76 && buffer[3] === 70) {
    return "application/x-executable";
  }
  if (buffer[0] === 207 && buffer[1] === 250 && buffer[2] === 237 && buffer[3] === 254 || buffer[0] === 206 && buffer[1] === 250 && buffer[2] === 237 && buffer[3] === 254 || buffer[0] === 254 && buffer[1] === 237 && buffer[2] === 250 && buffer[3] === 207 || buffer[0] === 254 && buffer[1] === 237 && buffer[2] === 250 && buffer[3] === 206) {
    return "application/x-executable";
  }
  if (buffer[0] === 77 && buffer[1] === 90) {
    return "application/x-executable";
  }
  if (buffer[0] === 35 && buffer[1] === 33) {
    return "application/x-shellscript";
  }
  return null;
}
function detectZipFormat(buffer) {
  const content = buffer.subarray(0, Math.min(buffer.length, 2e3)).toString("binary");
  if (content.includes("word/")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (content.includes("xl/")) return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (content.includes("ppt/")) return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  return "application/zip";
}
const BLOCKED_MIME_TYPES = /* @__PURE__ */ new Set([
  "application/x-executable",
  "application/x-shellscript",
  "application/wasm",
  "application/x-msdos-program",
  "application/x-msdownload"
]);
const BLOCKED_EXTENSIONS = /* @__PURE__ */ new Set([
  ".exe",
  ".dll",
  ".bat",
  ".cmd",
  ".com",
  ".msi",
  ".scr",
  ".pif",
  ".sh",
  ".bash",
  ".zsh",
  ".csh",
  ".ksh",
  ".app",
  ".command",
  ".action",
  ".ps1",
  ".psm1",
  ".psd1",
  ".vbs",
  ".vbe",
  ".js",
  ".jse",
  ".wsf",
  ".wsh",
  ".reg",
  ".inf",
  ".hta",
  ".wasm"
]);
function validateFile(buffer, filename, clientMimeType, options = {}) {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf("."));
  const detectedMimeType = detectMimeType(buffer);
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return { valid: false, error: `File type "${ext}" is not allowed`, detectedMimeType };
  }
  if (detectedMimeType && BLOCKED_MIME_TYPES.has(detectedMimeType)) {
    return {
      valid: false,
      error: `File content detected as "${detectedMimeType}" which is not allowed`,
      detectedMimeType
    };
  }
  if (detectedMimeType && clientMimeType) {
    const detectedBase = detectedMimeType.split("/")[0];
    const clientBase = clientMimeType.split("/")[0];
    if (detectedMimeType === "application/x-executable" && clientBase !== "application") {
      return {
        valid: false,
        error: "File content does not match the declared type",
        detectedMimeType
      };
    }
    if (clientBase === "image" && detectedBase !== "image" && detectedMimeType !== null) {
      return {
        valid: false,
        error: `File content is "${detectedMimeType}" but was uploaded as an image`,
        detectedMimeType
      };
    }
  }
  if (options.allowedMimeTypes && options.allowedMimeTypes.length > 0) {
    const mimeToCheck = detectedMimeType || clientMimeType;
    const isAllowed = options.allowedMimeTypes.some((allowed) => {
      if (allowed.endsWith("/*")) {
        const prefix = allowed.slice(0, -2);
        return mimeToCheck.startsWith(prefix);
      }
      if (allowed.startsWith(".")) {
        return ext === allowed.toLowerCase();
      }
      return mimeToCheck === allowed;
    });
    if (!isAllowed) {
      return {
        valid: false,
        error: `File type "${mimeToCheck}" is not allowed. Accepted: ${options.allowedMimeTypes.join(", ")}`,
        detectedMimeType
      };
    }
  }
  if (options.maxSize && buffer.length > options.maxSize) {
    const maxMB = (options.maxSize / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File exceeds maximum size of ${maxMB} MB`,
      detectedMimeType
    };
  }
  return { valid: true, detectedMimeType };
}
const POST = async ({ request, locals }) => {
  try {
    const { assetService } = locals.aphexCMS;
    const auth = locals.auth;
    if (!auth || auth.type === "partial_session") {
      return json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) {
      return json({ success: false, error: "No file provided" }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const allowedMimeTypesRaw = formData.get("allowedMimeTypes");
    const maxSizeRaw = formData.get("maxSize");
    const allowedMimeTypes = allowedMimeTypesRaw ? JSON.parse(allowedMimeTypesRaw) : void 0;
    const maxSize = maxSizeRaw ? parseInt(maxSizeRaw, 10) : void 0;
    const validation = validateFile(buffer, file.name, file.type, {
      allowedMimeTypes,
      maxSize
    });
    if (!validation.valid) {
      return json({ success: false, error: validation.error }, { status: 400 });
    }
    const title = formData.get("title") || void 0;
    const description = formData.get("description") || void 0;
    const alt = formData.get("alt") || void 0;
    const creditLine = formData.get("creditLine") || void 0;
    const schemaType = formData.get("schemaType") || void 0;
    const fieldPath = formData.get("fieldPath") || void 0;
    const targetOrganizationId = formData.get("organizationId") || auth.organizationId;
    const uploadData = {
      organizationId: targetOrganizationId,
      // Asset belongs to document's org
      buffer,
      originalFilename: file.name,
      mimeType: file.type,
      size: file.size,
      title,
      description,
      alt,
      creditLine,
      createdBy: auth.type === "session" ? auth.user.id : void 0,
      metadata: {
        schemaType,
        fieldPath
      }
    };
    const asset = await assetService.uploadAsset(targetOrganizationId, uploadData);
    return json({
      success: true,
      data: asset
    });
  } catch (error) {
    cmsLogger.error("Asset upload failed:", error);
    return json(
      {
        success: false,
        error: "Asset upload failed",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
};
const GET = async ({ url, locals }) => {
  try {
    const { assetService } = locals.aphexCMS;
    const auth = locals.auth;
    if (!auth || auth.type === "partial_session") {
      return json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const assetType = url.searchParams.get("assetType");
    const mimeType = url.searchParams.get("mimeType") || void 0;
    const search = url.searchParams.get("search") || void 0;
    const limitParam = url.searchParams.get("limit");
    const offsetParam = url.searchParams.get("offset");
    const limit = limitParam ? parseInt(limitParam) : 20;
    const offset = offsetParam ? parseInt(offsetParam) : 0;
    const filters = {
      assetType,
      mimeType,
      search,
      limit: isNaN(limit) ? 20 : limit,
      offset: isNaN(offset) ? 0 : offset
    };
    const [fetchedAssets, totalAssets] = await Promise.all([
      assetService.findAssets(auth.organizationId, filters),
      assetService.findAssets(auth.organizationId, {
        ...filters,
        limit: 999999,
        offset: 0
      })
    ]);
    const total = totalAssets.length;
    const pageSize = filters.limit || 20;
    const currentPage = Math.floor(filters.offset / pageSize) + 1;
    const totalPages = Math.ceil(total / pageSize);
    return json({
      success: true,
      data: fetchedAssets,
      pagination: {
        total,
        page: currentPage,
        pageSize,
        totalPages,
        hasNextPage: currentPage < totalPages,
        hasPrevPage: currentPage > 1
      }
    });
  } catch (error) {
    cmsLogger.error("Failed to fetch assets:", error);
    return json(
      {
        success: false,
        error: "Failed to fetch assets",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
};

export { GET, POST };
//# sourceMappingURL=_server.ts-Bj4Io5hF.js.map
