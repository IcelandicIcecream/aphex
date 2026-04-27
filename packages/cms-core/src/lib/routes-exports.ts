// SK-style route handlers re-exported for studio/template `+server.ts` shims
// that can't move onto the Hono catch-all. Currently just the CDN handler,
// which lives at `/media/:id/:filename` (outside the `/api` basePath) and
// whose URLs are baked into published documents — moving it would break
// links, so it stays as a SK route.

export { GET as serveAssetCDN } from './routes/assets-cdn';
