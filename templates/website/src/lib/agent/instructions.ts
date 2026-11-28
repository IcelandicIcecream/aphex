import type { McpInstructions } from '@aphexcms/cms-core/server';

/**
 * This site's part of what an AI client (Claude, ChatGPT, Cursor) is told when it
 * connects to /mcp, after core's own guide to drafts, schemas and images. Keep it to
 * what applies every time; the depth goes in the guides (./guides.ts), which the
 * client reads with `get_guide` when it's on that job.
 *
 * Change this when you change the schema: it's how an AI learns what a good page
 * looks like on your site.
 */
export const siteInstructions: McpInstructions = ({ organization }) =>
	`## Building ${organization.name}

This is a website made from Aphex's website template. Every page is a \`page\` document: a title, a slug, a hero, and a stack of layout blocks in \`layout\`. The page slugged \`home\` is the front page; any other is served at \`/<slug>\`. Blog posts are \`post\` documents at \`/posts/<slug>\`, each in one or more \`category\`.

- The hero comes first. Its \`variant\` is \`highImpact\` (a photo with the words over it), \`mediumImpact\` (words, then a photo), \`lowImpact\` (words only) or \`none\`.
- Layout blocks, in the order a visitor reads them: \`content\` (columns of rich text, each with a width), \`mediaBlock\` (one photo or video with a caption), \`cta\` (a call to action with buttons), \`archive\` (a list of posts), \`formBlock\` (a form from the Forms collection).
- A link is internal (\`linkType: "reference"\`, pointing at a page or post) or a URL (\`linkType: "custom"\`). Use internal links for the site's own pages, so they follow a page when its slug changes. A link to a page that isn't live yet shows as plain text until it is, so pages that link to each other can be written in any order.
- The menu is the \`header\` singleton, the footer is \`footer\`, and the site's name, description and logo are \`siteSettings\`. Change them with update_singleton.
- SEO fields (\`seo\`) are on pages, posts and categories. Fill the title and description on every page you make.

Guides for bigger jobs are listed below. To make or redo the site, read \`make-my-site\` first.`;
