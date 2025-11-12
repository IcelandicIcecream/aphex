// Clean Sanity-style asset URLs: /media/{id}/{filename}
// Re-export from Aphex CMS Core
console.log('[Media Route] Module loaded at /media/[id]/[filename]');
export { serveAssetCDN as GET } from '@aphexcms/cms-core/server';
