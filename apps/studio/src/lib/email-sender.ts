// The app's outbound sender identity and default — one source of truth, imported by BOTH the
// server email config and the client-safe forms plugin registry (which the `aphex()` Vite plugin
// also loads in a plain Node context). That three-context reach is why this module stays a plain
// const with NO env access: a SvelteKit `$env` virtual module can't be resolved in the Node/esbuild
// contexts, and SvelteKit doesn't populate `process.env` from `.env`. To override the sender from
// the environment, set `APHEX_EMAIL_FROM` — the server-only email config reads it via
// `$env/dynamic/private` and falls back to this default.
export const EMAIL_FROM = 'Ben @ Aphex CMS <ben@newsletter.getaphex.com>';
