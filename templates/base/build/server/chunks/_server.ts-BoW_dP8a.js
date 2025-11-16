import './utils-gGoUUMc2.js';
import './storage-_ubboXxO.js';
import 'sharp';
import 'fs/promises';
import 'path';

const GET = async ({ params, locals, setHeaders, request }) => {
  console.log("[Asset CDN] ========== ROUTE HIT ==========");
  console.log("[Asset CDN] Params:", params);
  try {
    const { assetService, databaseAdapter, storageAdapter, cmsEngine, config } = locals.aphexCMS;
    let auth = locals.auth;
    const { id, filename } = params;
    console.log("[Asset CDN] Request for asset:", id, filename);
    console.log("[Asset CDN] Has auth?", !!auth);
    if (!auth) {
      const apiKey = request.headers.get("x-api-key");
      console.log("[Asset CDN] API key present?", !!apiKey);
      if (apiKey && config.auth?.provider) {
        try {
          const apiKeyAuth = await config.auth.provider.validateApiKey(request, databaseAdapter);
          if (apiKeyAuth) {
            auth = apiKeyAuth;
            console.log("[Asset CDN] Authenticated via API key, org:", apiKeyAuth.organizationId);
          }
        } catch (err) {
          console.warn("[Asset CDN] API key validation failed:", err);
        }
      }
    }
    console.log("[Asset CDN] Auth type:", auth?.type);
    if (!id) {
      return new Response("Asset ID is required", { status: 400 });
    }
    const asset = await assetService.findAssetByIdGlobal(id);
    console.log("[Asset CDN] Asset found globally?", !!asset);
    if (!asset) {
      console.warn("[Asset CDN] Asset not found:", id);
      return new Response("Asset not found", { status: 404 });
    }
    const organizationId = auth?.organizationId;
    console.log("[Asset CDN] Auth object:", JSON.stringify(auth, null, 2));
    console.log("[Asset CDN] Auth organizationId:", organizationId);
    console.log("[Asset CDN] Asset organizationId:", asset.organizationId);
    let isPrivate = false;
    const schemaType = asset.metadata?.schemaType;
    const fieldPath = asset.metadata?.fieldPath;
    if (schemaType && fieldPath) {
      const schema = cmsEngine.getSchemaTypeByName(schemaType);
      console.log(`[Asset CDN] Schema lookup for ${schemaType}:`, {
        found: !!schema,
        fieldCount: schema?.fields?.length
      });
      if (schema && schema.fields) {
        const findField = (fields, path) => {
          const parts = path.split(".");
          let current = null;
          for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            current = fields.find((f) => f.name === part);
            if (!current)
              return null;
            if (i < parts.length - 1) {
              if (current.type === "object" && current.fields) {
                fields = current.fields;
              } else {
                return null;
              }
            }
          }
          return current;
        };
        const field = findField(schema.fields, fieldPath);
        console.log(`[Asset CDN] Field lookup for ${fieldPath}:`, {
          found: !!field,
          type: field?.type,
          private: field?.private
        });
        if (field && field.type === "image") {
          isPrivate = field.private === true;
          console.log(`[Asset CDN] Field check: ${schemaType}.${fieldPath} - private: ${isPrivate}`);
        } else {
          console.warn(`[Asset CDN] Could not find field: ${schemaType}.${fieldPath}`);
        }
      }
    } else {
      console.log("[Asset CDN] No field metadata - treating as public");
    }
    console.log("[Asset CDN] Asset privacy result:", { isPrivate, schemaType, fieldPath });
    if (isPrivate && !organizationId) {
      console.warn("[Asset CDN] Private asset accessed without auth - DENIED");
      return new Response("Unauthorized - This asset is private", { status: 401 });
    }
    if (isPrivate && organizationId && organizationId !== asset.organizationId) {
      console.warn("[Asset CDN] Org mismatch for private asset - FORBIDDEN");
      return new Response("Forbidden", { status: 403 });
    }
    if (isPrivate && organizationId) {
      console.log("[Asset CDN] Private asset access ALLOWED - user has auth and org matches");
    } else if (!isPrivate) {
      console.log("[Asset CDN] Public asset access ALLOWED");
    }
    console.log("[Asset CDN] Asset found:", {
      id: asset.id,
      path: asset.path,
      mimeType: asset.mimeType,
      storageAdapter: asset.storageAdapter
    });
    if (asset.url && asset.url.startsWith("http")) {
      console.log("[Asset CDN] Redirecting to external URL:", asset.url);
      return new Response(null, {
        status: 302,
        headers: { Location: asset.url }
      });
    }
    if (!storageAdapter?.getObject) {
      console.error("[Asset CDN] Storage adapter does not support getObject");
      return new Response("Storage adapter does not support file serving", { status: 500 });
    }
    console.log("[Asset CDN] Reading file from storage:", asset.path);
    const fileBuffer = await storageAdapter.getObject(asset.path);
    console.log("[Asset CDN] Serving file:", {
      size: fileBuffer.length,
      mimeType: asset.mimeType
    });
    setHeaders({
      "Content-Type": asset.mimeType || "application/octet-stream",
      "Content-Length": fileBuffer.length.toString(),
      "Cache-Control": "public, max-age=31536000, immutable",
      // Cache for 1 year
      "Content-Disposition": `inline; filename="${encodeURIComponent(asset.originalFilename || asset.filename)}"`,
      ...asset.mimeType?.startsWith("image/") && {
        "Accept-Ranges": "bytes"
      }
    });
    const arrayBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength);
    return new Response(arrayBuffer);
  } catch (error) {
    console.error("[Asset CDN] Error serving asset:", error);
    return new Response("Failed to serve asset", { status: 500 });
  }
};
console.log("[Media Route] Module loaded at /media/[id]/[filename]");

export { GET };
//# sourceMappingURL=_server.ts-BoW_dP8a.js.map
