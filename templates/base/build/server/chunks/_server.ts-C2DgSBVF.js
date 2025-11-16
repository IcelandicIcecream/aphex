import { j as json } from './index-CpeNL06-.js';
import './storage-_ubboXxO.js';
import 'sharp';
import './utils-gGoUUMc2.js';
import 'fs/promises';
import 'path';

const POST = async ({ request, locals }) => {
  try {
    const { assetService } = locals.aphexCMS;
    const auth = locals.auth;
    if (!auth) {
      return json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file) {
      return json({ success: false, error: "No file provided" }, { status: 400 });
    }
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const title = formData.get("title") || void 0;
    const description = formData.get("description") || void 0;
    const alt = formData.get("alt") || void 0;
    const creditLine = formData.get("creditLine") || void 0;
    const schemaType = formData.get("schemaType") || void 0;
    const fieldPath = formData.get("fieldPath") || void 0;
    const uploadData = {
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
    const asset = await assetService.uploadAsset(auth.organizationId, uploadData);
    return json({
      success: true,
      data: asset
    });
  } catch (error) {
    console.error("Asset upload failed:", error);
    return json({
      success: false,
      error: "Asset upload failed",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
};
const GET = async ({ url, locals }) => {
  try {
    const { assetService } = locals.aphexCMS;
    const auth = locals.auth;
    if (!auth) {
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
    const assets = await assetService.findAssets(auth.organizationId, filters);
    return json({
      success: true,
      data: assets
    });
  } catch (error) {
    console.error("Failed to fetch assets:", error);
    return json({
      success: false,
      error: "Failed to fetch assets",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
};

export { GET, POST };
//# sourceMappingURL=_server.ts-C2DgSBVF.js.map
