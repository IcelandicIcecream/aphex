---
'@aphexcms/cms-core': minor
---

Two additions for agents that do longer jobs:

- `agentMaxToolRoundtrips` sets how many tool-calling round trips one chat turn may make (default 8).
- `/admin?assistant` opens the assistant, and `/admin?assistant=<text>` also puts that text in its message box. Nothing is sent until the person presses send.
