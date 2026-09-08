---
'@aphexcms/cms-core': patch
'@aphexcms/ui': patch
---

Fix `TypeError: crypto.randomUUID is not a function` in the admin when it is opened
over plain HTTP.

`crypto.randomUUID` exists only in a **secure context** — HTTPS or `localhost`. The
dev server runs `vite dev --host`, so the Network URL it prints
(`http://192.168.x.x:5173`, reached from a phone, another machine, or a plain-HTTP
tunnel) is not one, and the property is simply undefined there. Two client call sites
threw on it: the agent chat's turn ids (`AgentChat.svelte`) and the message
scroller's item registration (`message-scroller-item.svelte`), so opening the
assistant over LAN failed with an uncaught rejection and no chat.

Both now use a `randomId()` helper that prefers `crypto.randomUUID` and otherwise
builds a v4 from `crypto.getRandomValues`, which is **not** gated by secure context —
so the fallback is still cryptographically random, with the version and variant
nibbles stamped as the spec requires. Its last resort, a `Math.random` id, is for
environments with no WebCrypto at all and is documented as unsuitable for anything
security-sensitive; server code keeps using `node:crypto` and is unaffected.

The helper is deliberately duplicated in both packages rather than shared:
`cms-core` depends on `@aphexcms/ui`, so importing it back the other way would invert
the dependency.

Note that this is one instance of a general constraint, not a one-off: every
secure-context API — `crypto.subtle`, the async clipboard, service workers — is
unavailable on that same Network URL. Prefer `localhost` when testing anything that
touches them.
