import type { McpGuide } from '@aphexcms/cms-core/server';

/**
 * Guides an AI client reads when it's on that job, like skills. The instructions list
 * each one in a line, and `get_guide` returns it in full, so they cost nothing until
 * they're asked for. Add your own: a guide per kind of page your site has, your house
 * style, the facts about the business an AI should never get wrong.
 */

const makeMySite = `Work as a designer and a copywriter would: understand the business, plan, build, then look at what you made and fix the weakest part.

## 1. Learn the business
Read what the person gave you: their current site, notes, photos. Ask for what you can't find and a visitor would rely on (address, hours, prices, phone, email). Don't make those up. Placeholder copy is fine for tone and layout if you say which parts need real details.

## 2. Plan the pages
Most small sites need four to six: Home, one page per main thing they offer (or one Services page), About, Contact. Add a blog only if they'll write for it. Write the plan down for the person (pages, what each is for, the one thing a visitor should do on it) before you build.

## 3. Set up the site
- \`siteSettings\`: the site's name, a one-sentence description, the logo if they gave you one.
- \`header\`: one link per page in the plan, in the order a visitor needs them. Put the main action (Book, Contact, Get a quote) last, with the \`default\` appearance.
- \`footer\`: the same pages, plus anything legal or practical. Put the address or contact line in \`note\`.

## 4. Build each page
Read the \`pages\` guide for which block does what. Build Home last, once you know what the other pages say, so it can point to them.

## 5. Look and fix
Read each page back with get_document. Check every page has an SEO title and description, every link goes somewhere, and no two pages repeat the same sentences. Then fix the weakest page.

## 6. Hand over
Everything you made is a draft. Tell the person which pages you made, which details they need to check, and to review and publish them in the admin.`;

const pages = `A page is a hero followed by layout blocks. Call get_schema for \`page\` before writing one, and use the exact field names it returns.

## The hero
- \`highImpact\`: a photo with the headline over it. Only with a strong photo of the real thing (the shop, the work, the team).
- \`mediumImpact\`: headline and a line under it, then the photo. The safe choice when there is a photo.
- \`lowImpact\`: words only. For pages without a photo, and inner pages like Contact.
- \`none\`: the page starts with its first block.
The hero's \`richText\` is a heading (h1) and one or two sentences. Give it one or two buttons in \`links\`: the main action first.

## Layout blocks
- \`content\`: columns of rich text. Widths are \`oneThird\`, \`half\`, \`twoThirds\` and \`full\`; a row is columns that add up to a whole (three thirds, two halves, a third and two thirds). Three thirds suit three services or three reasons; a full column suits a story. A column can end in a link.
- \`mediaBlock\`: one photo, full width, with a short caption. Use it to break up long pages, never twice in a row.
- \`cta\`: a short heading, a sentence and one or two buttons. End most pages with one, pointing at the page's main action.
- \`archive\`: a list of posts, the newest in some categories (\`populateBy: "collection"\`) or ones you pick (\`"selection"\`).
- \`formBlock\`: a form from the Forms collection, for a contact or enquiry page. Make the form first, then point the block at it.

## A good page
One idea per block, the most important first. Headings say something specific to this business ("Same-day boiler repairs in Leeds"), not a category ("Our services"). Three to six blocks is plenty.`;

const copywriting = `- Write like the owner talking to a customer: plain, specific, warm. Short sentences.
- Lead with what the visitor gets, then why this business. "Fresh bread by 7am, baked in the back" beats "We are passionate about quality".
- Use the business's own facts and words: their dishes, their streets, their customers' questions. If a sentence could sit on a competitor's site, rewrite it.
- No filler: "welcome to our website", "we pride ourselves", "one-stop shop", "look no further".
- One call to action per section, worded as what happens: "Book a table", "Get a quote", "Call us".
- SEO: the title is what the page is and where (under 60 characters). The description is one sentence a searcher would click (under 155).`;

const blog = `A post is a \`post\` document: a title, a slug, a hero image, rich text, one or more categories and, optionally, related posts. Call get_schema for \`post\` before writing one.

- Write about what customers ask: how to choose, what it costs, what to expect, what's new. One question per post.
- Start with the answer, then the detail. Use h2 headings for each part, so it's easy to scan.
- 400 to 900 words. Use the owner's own examples and photos.
- Make the categories first, if they don't exist. Two to five is plenty for a small site.
- Pick related posts from ones that exist. A related post that isn't live yet is left out until it is.`;

export const siteGuides: McpGuide[] = [
	{
		name: 'make-my-site',
		title: 'Make the site',
		description: 'Making or redoing the whole site: the steps, in order.',
		content: makeMySite
	},
	{
		name: 'pages',
		title: 'Pages and blocks',
		description: 'Which hero and blocks to use, and what makes a good page.',
		content: pages
	},
	{
		name: 'copywriting',
		title: 'Writing the words',
		description: 'How to write headings, copy, buttons and SEO text.',
		content: copywriting
	},
	{
		name: 'blog',
		title: 'Blog posts',
		description: 'Writing a post: topics, shape, categories.',
		content: blog
	}
];
