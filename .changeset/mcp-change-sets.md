---
'@aphexcms/cms-core': minor
'@aphexcms/auth': minor
---

What an app connected over MCP changes now shows in Activity › Agent changes, with Undo, like the in-admin agent's turns. Each app's burst of writes on a site is one change set, closed after 3 minutes without a write, so it's about one reply from the app; it's credited to the person the app acts for and shown as "through Claude" (its model and tokens are the client's, never seen). Connected-app auth carries that person as `ApiKeyAuth.userId`; `buildContentTools` takes an `onWrite` callback for every mutating call.
