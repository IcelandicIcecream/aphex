function sortObject(item) {
  if (item === null || typeof item !== "object") return item;
  if (Array.isArray(item)) {
    return item.map(sortObject);
  }
  const sortedKeys = Object.keys(item).sort();
  const sortedObj = {};
  for (const key of sortedKeys) {
    sortedObj[key] = sortObject(item[key]);
  }
  return sortedObj;
}
function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}
function createContentHash(data, includeTimestamp = true) {
  const hashData = includeTimestamp ? {
    ...data,
    _lastModified: (/* @__PURE__ */ new Date()).toISOString()
  } : data;
  const stableJson = JSON.stringify(sortObject(hashData));
  return simpleHash(stableJson);
}
function createPublishedHash(data) {
  return createContentHash(data, false);
}
function hasUnpublishedChanges(draftData, publishedHash) {
  if (!publishedHash) return true;
  const publishedDataHash = createPublishedHash(draftData);
  return publishedDataHash !== publishedHash;
}
function createHashForPublishing(draftData) {
  return createPublishedHash(draftData);
}

export { createHashForPublishing as c, hasUnpublishedChanges as h };
//# sourceMappingURL=content-hash-AOe_NOqf.js.map
