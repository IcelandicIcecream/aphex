import { c as cmsLogger } from './logger-C1WBmfZZ.js';
import { j as json } from './index-BcOZ6EV9.js';
import './storage-CxrQC-cN.js';
import 'sharp';
import './date-utils-xyIWAIQq.js';
import './utils-FiC4zhrQ.js';
import 'fs/promises';
import 'path';
import './_commonjsHelpers-C1uiShF5.js';

const GET = async ({ params, locals }) => {
  try {
    const { assetService } = locals.aphexCMS;
    const auth = locals.auth;
    const { id } = params;
    if (!auth || auth.type === "partial_session") {
      return json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!id) {
      return json({ success: false, error: "Asset ID is required" }, { status: 400 });
    }
    const asset = await assetService.findAssetById(auth.organizationId, id);
    if (!asset) {
      return json({ success: false, error: "Asset not found" }, { status: 404 });
    }
    return json({
      success: true,
      data: asset
    });
  } catch (error) {
    cmsLogger.error("[Asset API] Error fetching asset:", error);
    return json({ success: false, error: "Failed to fetch asset" }, { status: 500 });
  }
};
const DELETE = async ({ params, locals }) => {
  try {
    const { id } = params;
    const { assetService, databaseAdapter } = locals.aphexCMS;
    const auth = locals.auth;
    if (!auth || auth.type === "partial_session") {
      return json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!id) {
      return json({ success: false, error: "Asset ID is required" }, { status: 400 });
    }
    if (databaseAdapter.findDocumentsReferencingAsset) {
      const refs = await databaseAdapter.findDocumentsReferencingAsset(auth.organizationId, id);
      if (refs.length > 0) {
        return json(
          {
            success: false,
            error: `Cannot delete asset — it is referenced by ${refs.length} document${refs.length > 1 ? "s" : ""}`
          },
          { status: 409 }
        );
      }
    }
    const result = await assetService.deleteAsset(auth.organizationId, id);
    if (!result) {
      return json(
        { success: false, error: "Asset not found or could not be deleted" },
        { status: 404 }
      );
    }
    return json({ success: true });
  } catch (error) {
    cmsLogger.error("Error deleting asset:", error);
    return json({ success: false, error: "Failed to delete asset" }, { status: 500 });
  }
};
const PATCH = async ({ params, locals, request }) => {
  try {
    const { assetService } = locals.aphexCMS;
    const auth = locals.auth;
    const { id } = params;
    if (!auth || auth.type === "partial_session") {
      return json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!id) {
      return json({ success: false, error: "Asset ID is required" }, { status: 400 });
    }
    const { title, description, alt, creditLine } = await request.json();
    let updatedAsset;
    if (auth.type == "session") {
      updatedAsset = await assetService.updateAssetMetadata(auth.organizationId, id, {
        title,
        description,
        alt,
        creditLine,
        updatedBy: auth.user.id
      });
    } else {
      updatedAsset = await assetService.updateAssetMetadata(auth.organizationId, id, {
        title,
        description,
        alt,
        creditLine,
        updatedBy: auth.keyId
      });
    }
    if (!updatedAsset) {
      return json({ success: false, error: "Asset not found" }, { status: 404 });
    }
    return json({
      success: true,
      data: updatedAsset
    });
  } catch (error) {
    cmsLogger.error("Error updating asset:", error);
    return json({ success: false, error: "Failed to update asset" }, { status: 500 });
  }
};

export { DELETE, GET, PATCH };
//# sourceMappingURL=_server.ts-BI42iGCE.js.map
