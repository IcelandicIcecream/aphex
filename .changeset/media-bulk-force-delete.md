---
'@aphexcms/cms-core': patch
---

Bulk asset delete stops contradicting itself, gains force, and the selection bar sticks.

## The client and the server were answering different questions

Before sending a bulk delete, the media browser counted references via
`getReferenceCounts` — which filters to **registered** schema types. The server's delete guard
scans **unfiltered**, deliberately: a document whose type was removed from the codebase still
exists and still holds its reference.

So an asset blocked only by an orphaned type passed the client's check, hit the server, and
came back 409 — while the client insisted nothing referenced it. Asking two different
questions and treating them as one answer is the bug.

The pre-check is gone. The server does a fresh authoritative scan on every attempt, so it is
the only sensible authority; the client attempts the delete and handles the refusal.

## Bulk delete had no force, and its refusal was a dead end

The single-asset path already reported which blocking documents use unregistered schema types
and offered force, because those documents cannot be opened in the admin — the reference
cannot be removed by hand, so without force the asset is simply undeletable. The bulk route
inherited none of it: one flat sentence, no way forward.

It now returns `unregisteredTypes` alongside `referencedIds`, accepts `?force=true`, and the
browser offers **Force delete** on exactly the condition the single-asset flow does. The
server-corrected counts are written back so the grid stops showing the blocked assets as
unused before the next fetch.

## What force actually does

Both force dialogs claimed it "leaves a dangling reference". It doesn't — `clearAssetReferences`
runs on every delete and strips the asset from `draftData` on every document, and from
`publishedData` on non-published ones.

The single exception is `publishedData` on a **currently published** document, which is left
alone on purpose: that column is written only by publish, and rewriting it here would desync
the content hash from its version record. The reference leaves on the next publish, when the
cleaned draft flows through normally.

So the accurate statement, and what the dialogs now say: drafts are cleaned immediately, and a
live page keeps the reference until it is republished, where it renders as nothing.

## Sticky selection bar

The bulk action bar lived inside the scrolling grid, so it scrolled away — stranding the
selection you had just built, with the running count out of sight while you built it. It is
now `sticky top-0` against the scroll container.
