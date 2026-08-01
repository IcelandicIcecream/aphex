---
'@aphexcms/ui': patch
---

Publish the chat UI primitives the in-admin agent panel is built on: `./shadcn/message`, `./shadcn/message-scroller`, `./shadcn/bubble`, `./shadcn/marker`, and `./shadcn/attachment`.

These components landed with the agent chat work but `@aphexcms/ui` was never released alongside it, so the published package stopped at 0.8.3 while `cms-core`'s `AgentChat.svelte` imported four of them. Any app installing cms-core 9.8.0/9.8.1 from npm fails to build with `"./shadcn/message-scroller" is not exported ... from @aphexcms/ui` — the workspace resolves it from source, so it only appears against the published tarball. Caught by the sync-template workflow, which exists for exactly this class of drift.

Released as a patch deliberately, even though new exports would normally be a minor. Every core package peer-depends on `@aphexcms/ui`, and changesets treats a peer-range change as breaking — so a minor here (0.8.3 → 0.9.0) falls outside the published `^0.8.3` range and cascades a **major** bump onto cms-core and every adapter. A patch stays inside that range, so already-published cms-core 9.8.0/9.8.1 installs resolve 0.8.4 and pick up the exports with no further releases. The change is purely additive, so nothing about the patch is misleading except the strictness of the label.
