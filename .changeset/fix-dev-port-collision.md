---
'create-aphex': patch
---

Keep scaffolded development servers on Vite's default loopback host so a SvelteKit
app already using localhost:5173 is detected and Aphex advances to the next free
port. Network-wide development hosting remains available explicitly with
`pnpm dev --host`.
