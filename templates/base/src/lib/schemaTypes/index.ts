// Schema Registry
// ================
// Define your content schemas here and add them to the array below.
// Each schema is either a 'document' (top-level entity) or an 'object' (reusable nested structure).
//
// The CMS can describe its own field vocabulary — call `describe_cms` on the MCP
// server at /mcp rather than working from a list that can go stale, and
// `validate_schema` before writing a new file. See AGENTS.md.

import page from './page.js';
import siteSettings from './siteSettings.js';

export const schemaTypes = [page, siteSettings];
