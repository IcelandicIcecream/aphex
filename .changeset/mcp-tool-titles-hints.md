---
'@aphexcms/cms-core': minor
---

MCP tools carry a title and hints: whether each one only reads, only adds, or can overwrite, and whether it reaches outside the site (`openWorld`, for a tool that reads a web page). Clients use them in permission prompts, and Claude's connector directory requires them. An agent tool can set its own `title`, `destructive` and `openWorld`; without them the title is its name in words and a mutating tool counts as destructive unless its name starts with `create_`, `upload_` or `add_`.
