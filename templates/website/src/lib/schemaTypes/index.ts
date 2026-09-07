// Schema Registry — website starter
// =================================
// A page-builder site, modelled on Payload's website template:
//
//   page      a hero + a stack of layout blocks, served at /<slug> (/ for "home")
//   post      a dated article with rich text, categories and related posts
//   category  the one taxonomy
//   header    singleton — primary navigation
//   footer    singleton — footer navigation
//   siteSettings  singleton — site name, description, logo, favicon
//
// The blocks a page can contain live in ./objects/blocks.ts, and the reusable
// link shape in ./fields/link.ts. SEO fields are injected on page/post/category
// by `seoPlugin({ collections: [...] })` in src/lib/plugins.ts rather than being
// declared on each type.
//
// The CMS can describe its own field vocabulary — call `describe_cms` on the MCP
// server at /mcp rather than working from a list that can go stale, and
// `validate_schema` before writing a new file. See AGENTS.md.

import page from './page.js';
import post from './post.js';
import category from './category.js';
import header from './header.js';
import footer from './footer.js';
import siteSettings from './siteSettings.js';

export const schemaTypes = [page, post, category, header, footer, siteSettings];
