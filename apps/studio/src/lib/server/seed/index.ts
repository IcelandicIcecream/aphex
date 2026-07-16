/**
 * Demo-content seed for the blog.
 *
 * Two entry points:
 *
 * - `seedOnFirstRun(locals)` — wired into `hooks.server.ts`. Runs once per process,
 *   and only when the site is completely untouched: the first organization exists and
 *   holds zero rows of any seeded type (posts, pages, authors, tags, site settings —
 *   even a lazy-created settings row counts as touched). That makes it safe to leave
 *   enabled in production: it can populate exactly one moment in a site's life, right
 *   after the first signup, and can never stomp anything a person made.
 *
 * - `seedBlogContent(...)` — the actual content creation, also used by the dev-only
 *   `GET /api/seed-blog` route with `wipe: true` as a reset button.
 *
 * Don't want demo content? Set `APHEX_SEED=false`, or delete this directory and the
 * seed hook in `hooks.server.ts`.
 */
import { env } from '$env/dynamic/private';
import { systemContext } from '@aphexcms/cms-core/local-api/auth-helpers';
import type { LocalAPIContext } from '@aphexcms/cms-core/server';

type AphexServices = App.Locals['aphexCMS'];

// --- tiny Portable Text helpers ---------------------------------------------
let n = 0;
const key = () => `k${n++}`;

type Span = { _type: 'span'; _key: string; text: string; marks?: string[] };

const span = (text: string, marks?: string[]): Span => ({
	_type: 'span',
	_key: key(),
	text,
	...(marks ? { marks } : {})
});

const block = (style: string, children: Span[], extra: Record<string, unknown> = {}) => ({
	_type: 'block',
	_key: key(),
	style,
	markDefs: [],
	children,
	...extra
});

const p = (...children: Span[]) => block('normal', children);
const h = (level: 2 | 3, text: string) => block(`h${level}`, [span(text)]);
const quote = (text: string) => block('blockquote', [span(text)]);
const li = (text: string, listItem: 'bullet' | 'number') =>
	block('normal', [span(text)], { listItem, level: 1 });

const callout = (tone: string, text: string) => ({ _type: 'callout', _key: key(), tone, text });
const code = (language: string, codeStr: string) => ({
	_type: 'codeBlock',
	_key: key(),
	language,
	code: codeStr
});
const divider = (style: 'line' | 'dots' = 'line') => ({ _type: 'divider', _key: key(), style });
const toggle = (heading: string, content: string) => ({
	_type: 'toggle',
	_key: key(),
	heading,
	content
});
const button = (
	label: string,
	url: string,
	opts: { style?: 'primary' | 'secondary'; align?: 'left' | 'center' | 'right' } = {}
) => ({
	_type: 'button',
	_key: key(),
	label,
	url,
	style: opts.style ?? 'primary',
	align: opts.align ?? 'center'
});
const embed = (embedCode: string, caption?: string) => ({
	_type: 'embed',
	_key: key(),
	embedCode,
	...(caption ? { caption } : {})
});
const gallery = (images: Array<ReturnType<typeof imageBlock>>, caption?: string) => {
	const present = images.filter(Boolean);
	// Gallery requires images — if every download failed (offline), skip the block.
	return present.length > 0
		? { _type: 'gallery', _key: key(), images: present, ...(caption ? { caption } : {}) }
		: null;
};

// Reference array items need a unique _key (the admin keys its {#each} on it).
const ref = (id: string) => ({ _type: 'reference', _ref: id, _key: key() });
// alt lives on the image value (per-placement) — the single source of truth and the
// stega carrier for visual editing.
const imageValue = (id: string | null, alt?: string) =>
	id
		? { _type: 'image', asset: { _type: 'reference', _ref: id }, ...(alt ? { alt } : {}) }
		: undefined;
const imageBlock = (id: string | null, alt?: string) =>
	id
		? {
				_type: 'image',
				_key: key(),
				asset: { _type: 'reference', _ref: id },
				...(alt ? { alt } : {})
			}
		: null;

/** The document types the seed creates — and the types whose presence blocks it. */
const SEEDED_TYPES = ['blog_post', 'page', 'author', 'tag', 'siteSettings'] as const;

/**
 * Create the demo content set: tags, authors, three posts, two pages, and site
 * settings. Assumes the target org — pass `wipe: true` (the dev reset path) to
 * delete existing seeded-type documents first; the first-run path never wipes.
 */
export async function seedBlogContent(
	aphex: Pick<AphexServices, 'localAPI' | 'assetService'>,
	orgId: string,
	context: LocalAPIContext,
	options: { wipe?: boolean } = {}
): Promise<{ tags: number; authors: number; posts: number; pages: number }> {
	const { localAPI, assetService } = aphex;

	if (options.wipe) {
		// Idempotent reset: wipe existing blog content so re-running gives a clean
		// set instead of duplicates. (siteSettings is a singleton — updated, not deleted.)
		const collectionsToWipe = [
			localAPI.collections.blog_post,
			localAPI.collections.page,
			localAPI.collections.author,
			localAPI.collections.tag
		];
		for (const coll of collectionsToWipe) {
			const existing = await coll.find(context, { perspective: 'draft', limit: 1000 });
			for (const doc of existing.docs) await coll.delete(context, doc.id);
		}
	}

	// --- Images: download from Unsplash → store as assets --------------------
	// Stable Unsplash CDN URLs (no API key needed). Failures are tolerated so the
	// seed still works offline — posts just render without a cover.
	async function unsplash(photoId: string): Promise<string | null> {
		try {
			const url = `https://images.unsplash.com/photo-${photoId}?w=1600&q=80&auto=format&fit=crop`;
			const r = await fetch(url);
			if (!r.ok) return null;
			const buffer = Buffer.from(await r.arrayBuffer());
			const asset = await assetService.uploadAsset(orgId, {
				buffer,
				originalFilename: `${photoId}.jpg`,
				mimeType: r.headers.get('content-type') ?? 'image/jpeg',
				size: buffer.length,
				creditLine: 'Photo via Unsplash'
			});
			return asset.id;
		} catch {
			return null;
		}
	}

	const [
		coverOpen,
		coverTypes,
		coverPT,
		inlinePT,
		coverAbout,
		avatarMara,
		avatarDev,
		heroImage,
		galleryA,
		galleryB,
		galleryC
	] = await Promise.all([
		unsplash('1517180102446-f3ece451e9d8'),
		unsplash('1461749280684-dccba630e2f6'),
		unsplash('1455390582262-044cdead277a'),
		unsplash('1499750310107-5fef28a66643'),
		unsplash('1481277542470-605612bd2d61'),
		unsplash('1494790108377-be9c29b29330'),
		unsplash('1500648767791-00dcc994a43e'),
		unsplash('1486312338219-ce68d2c6f44d'),
		unsplash('1497366216548-37526070297c'),
		unsplash('1519389950473-47ba0277781c'),
		unsplash('1504384308090-c894fdcc538d')
	]);

	// --- Tags ----------------------------------------------------------------
	const tagDefs = [
		{
			title: 'Design',
			slug: 'design',
			description: 'Craft, type, and the visual side of the studio.'
		},
		{
			title: 'Engineering',
			slug: 'engineering',
			description: 'How the software actually gets built.'
		},
		{ title: 'Process', slug: 'process', description: 'How we work, ship, and stay sane doing it.' }
	];
	const tagIds: Record<string, string> = {};
	for (const t of tagDefs) {
		const res = await localAPI.collections.tag.create(context, t as never, { publish: true });
		tagIds[t.slug] = res.document.id;
	}

	// --- Authors -------------------------------------------------------------
	const authorDefs = [
		{
			name: 'Mara Lindqvist',
			slug: 'mara-lindqvist',
			role: 'Founder & Writer',
			bio: 'Mara started the studio to make small, sharp tools for the web. She writes about craft, process, and the work in progress.',
			avatar: imageValue(avatarMara, 'Portrait of Mara Lindqvist'),
			// Object array items carry their member's `_type` — the admin resolves each
			// item against the array's `of` list by it, and renders "Unknown" without it.
			links: [
				{ _type: 'link', _key: key(), label: 'Website', url: 'https://example.com' },
				{ _type: 'link', _key: key(), label: 'Twitter', url: 'https://twitter.com/example' }
			]
		},
		{
			name: 'Dev Okonkwo',
			slug: 'dev-okonkwo',
			role: 'Engineer',
			bio: 'Dev builds the parts you do not see — type generation, APIs, and the plumbing that makes content type-safe.',
			avatar: imageValue(avatarDev, 'Portrait of Dev Okonkwo'),
			links: [{ _type: 'link', _key: key(), label: 'GitHub', url: 'https://github.com/example' }]
		}
	];
	const authorIds: Record<string, string> = {};
	for (const a of authorDefs) {
		const res = await localAPI.collections.author.create(context, a as never, { publish: true });
		authorIds[a.name] = res.document.id;
	}

	// --- Posts ---------------------------------------------------------------
	const posts = [
		{
			title: 'Designing in the open',
			slug: 'designing-in-the-open',
			author: ref(authorIds['Mara Lindqvist']),
			postDate: '2026-05-28',
			excerpt:
				'Why we publish work-in-progress, and what a year of building the studio journal taught us about momentum.',
			coverImage: imageValue(coverOpen, 'Desk with a laptop and notes'),
			tags: [ref(tagIds.design), ref(tagIds.process)],
			content: [
				p(
					span('There is a particular kind of courage in showing work before it is finished. '),
					span('Designing in the open', ['em']),
					span(' is not a marketing tactic for us — it is how the work stays honest.')
				),
				h(2, 'Momentum beats polish'),
				p(
					span(
						'A draft shipped on Tuesday teaches you more than a perfect thing shipped next month. The feedback loop is the product.'
					)
				),
				quote('Make it real, then make it right. In that order, always.'),
				divider('dots'),
				h(3, 'What we changed'),
				li('Weekly notes instead of quarterly essays', 'bullet'),
				li('Smaller, more frequent releases', 'bullet'),
				li('Public changelogs for every package', 'bullet'),
				callout('info', 'These notes are written in the same editor you are reading them from.'),
				toggle(
					'Doesn’t publishing drafts invite bad feedback?',
					'The opposite, mostly. People are kinder to work labelled in-progress than to work presented as finished — and far more specific. The worst feedback we ever got was on things we polished in private.'
				),
				p(span('The studio journal is the result. Thanks for reading along.')),
				button('Read the colophon', '/colophon', { style: 'secondary' })
			]
		},
		{
			title: 'Type-safe content with Aphex',
			slug: 'type-safe-content-with-aphex',
			author: ref(authorIds['Dev Okonkwo']),
			postDate: '2026-05-14',
			excerpt:
				'Schemas are the single source of truth. Generate the types once and the whole frontend stops lying to you.',
			coverImage: imageValue(coverTypes, 'Code on a screen'),
			tags: [ref(tagIds.engineering)],
			content: [
				p(
					span(
						'Most CMS bugs are really type bugs — a field renamed in the studio, a shape the frontend still assumes. Aphex closes that gap by generating TypeScript straight from your schema.'
					)
				),
				h(2, 'One command'),
				code('bash', 'pnpm generate:types\n# → src/lib/generated-types.ts'),
				p(
					span('Now '),
					span('post.coverImage', ['code']),
					span(' is an '),
					span('ImageValue', ['code']),
					span(', '),
					span('post.tags', ['code']),
					span(' is '),
					span('Reference<Tag>[]', ['code']),
					span(', and the editor and the page can never drift apart.')
				),
				callout(
					'warning',
					'Re-run generate:types whenever you change a schema — it is not automatic.'
				),
				divider('line'),
				h(3, 'In a load function'),
				code(
					'ts',
					"const { docs } = await api.collections.blog_post.find(ctx, {\n  perspective: 'published',\n  limit: 12\n});\n// docs is BlogPost[] — fully typed."
				),
				toggle(
					'What happens to existing documents when a schema changes?',
					'Nothing, immediately — documents are stored as plain JSON, so old rows keep their shape. The generated types describe the current schema, which is exactly how you find every place the frontend still assumes the old one: the compiler lists them.'
				)
			]
		},
		{
			title: 'A field guide to portable text',
			slug: 'a-field-guide-to-portable-text',
			author: ref(authorIds['Mara Lindqvist']),
			postDate: '2026-04-30',
			excerpt:
				'Rich text as data, not markup. Why we store an array of blocks and render it on our own terms.',
			coverImage: imageValue(coverPT, 'Notebook and pen on a desk'),
			tags: [ref(tagIds.engineering), ref(tagIds.design)],
			content: [
				p(
					span(
						'Portable Text treats a document as structured data: an array of blocks, each with a style and a list of spans. No HTML soup, no surprises.'
					)
				),
				imageBlock(inlinePT, 'Writing in a notebook'),
				h(2, 'The shape'),
				li('Blocks carry a style — normal, h2, blockquote, code', 'number'),
				li('Spans carry marks — strong, em, links', 'number'),
				li('Custom types sit between blocks — images, embeds, galleries, callouts', 'number'),
				p(
					span('Because it is just data, you render it however you like. This sentence has '),
					span('a bold bit', ['strong']),
					span(' and '),
					span('an emphatic bit', ['em']),
					span(', and both round-trip cleanly.')
				),
				quote('Markup is a rendering decision. Content should outlive it.'),
				divider('dots'),
				h(2, 'Beyond text'),
				p(
					span(
						'Anything with a schema can sit between paragraphs. An embed is just a block holding an iframe snippet — the renderer extracts the src and emits its own markup:'
					)
				),
				embed(
					'<iframe width="560" height="315" src="https://www.youtube.com/embed/AdNJ3fydeao" title="Rethinking Reactivity — Rich Harris" frameborder="0" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen></iframe>',
					'Rich Harris — Rethinking Reactivity, the talk behind Svelte 3.'
				),
				p(
					span(
						'A gallery is a block holding an array of image references. Same storage rules as every other image — real assets, credited, reusable:'
					)
				),
				gallery(
					[
						imageBlock(galleryA, 'The studio, mid-morning'),
						imageBlock(galleryB, 'Pairing on the editor'),
						imageBlock(galleryC, 'Notes from a planning day')
					],
					'Scenes from the studio, stored as one gallery block.'
				),
				toggle(
					'And this one?',
					'A toggle — a heading plus a collapsible body, rendered as a native details/summary. Good for asides and FAQs that would break the flow if they sat open on the page.'
				),
				callout('info', 'Every block you see here is a row in the array stored for this post.'),
				button('Write your own in the studio', '/admin', { align: 'center' })
			]
		}
	];

	const postIds: string[] = [];
	for (const post of posts) {
		// Drop any null inline blocks (images that failed to download)
		const data = { ...post, content: post.content.filter(Boolean) };
		const res = await localAPI.collections.blog_post.create(context, data as never, {
			publish: true
		});
		postIds.push(res.document.id);
	}

	// --- Pages ---------------------------------------------------------------
	const pages = [
		{
			title: 'About',
			slug: 'about',
			excerpt: 'A small studio building tools for people who make things on the web.',
			coverImage: imageValue(coverAbout, 'Bookshelf'),
			content: [
				p(
					span(
						'We are a small, independent studio. We design and build software, and we write about the parts worth sharing.'
					)
				),
				h(2, 'What we do'),
				p(
					span(
						'Product design, frontend engineering, and the occasional open-source tool — like the CMS rendering this very page.'
					)
				),
				divider('line'),
				p(span('Say hello: '), span('hello@aphexstudio.example', ['code']), span('.')),
				button('Read the journal', '/blog', { style: 'secondary', align: 'left' })
			]
		},
		{
			title: 'Colophon',
			slug: 'colophon',
			excerpt: 'How this site is made.',
			content: [
				h(2, 'Made with'),
				li('AphexCMS — schema-driven content', 'bullet'),
				li('SvelteKit — the app and this page', 'bullet'),
				li('Fraunces & Inter — the typefaces', 'bullet'),
				p(span('Set in the open. Edited live. Published when ready.'))
			]
		}
	];

	const pageIds: string[] = [];
	for (const page of pages) {
		const res = await localAPI.collections.page.create(context, page as never, { publish: true });
		pageIds.push(res.document.id);
	}

	// --- Site settings (singleton) -------------------------------------------
	const settingsColl = localAPI.collections.siteSettings;
	await settingsColl.get(context, { perspective: 'draft' }); // lazy-create the row
	const settingsId = settingsColl.getSingletonId(context);
	if (settingsId) {
		await settingsColl.update(
			context,
			settingsId,
			{
				title: 'Aphex',
				tagline: 'Field notes, essays, and dispatches from the studio.',
				// Required by the schema — publish fails without it.
				template: 'editorial-journal',
				// ---- Home hero (drives the masthead on the index) ----
				heroEyebrow: 'The Journal',
				heroTitle: 'Notes from a studio\nbuilding in the open.',
				heroSubtitle:
					'Essays on craft, process, and the tools we make along the way. Published when ready, drafted in public.',
				heroImage: imageValue(heroImage, 'Hands on a laptop keyboard, morning light'),
				heroLayout: 'split',
				// Brand color — the rich color object the color-picker plugin stores
				// ({ hex, alpha, rgb, hsl, hsv }); templates read `.hex` for accents.
				color: {
					hex: '#9D2F2F',
					alpha: 1,
					rgb: { r: 157, g: 47, b: 47, a: 1 },
					hsl: { h: 0, s: 53.9, l: 40, a: 1 },
					hsv: { h: 0, s: 70.1, v: 61.6, a: 1 }
				},
				nav: [
					{ _type: 'navLink', _key: key(), label: 'About', url: '/about', newTab: false },
					{ _type: 'navLink', _key: key(), label: 'Colophon', url: '/colophon', newTab: false }
				],
				social: [
					{
						_type: 'socialLink',
						_key: key(),
						label: 'Twitter',
						url: 'https://twitter.com/example'
					},
					{ _type: 'socialLink', _key: key(), label: 'GitHub', url: 'https://github.com/example' }
				]
			} as never,
			{ publish: true }
		);
	}

	return {
		tags: Object.keys(tagIds).length,
		authors: Object.keys(authorIds).length,
		posts: postIds.length,
		pages: pageIds.length
	};
}

// --- first-run trigger --------------------------------------------------------

/**
 * Per-process latch. `'done'` means "decided" — either we seeded, or the site was
 * already touched. A pending promise dedupes concurrent first requests. `null`
 * means "no organization yet, check again next request" (pre-signup, one cheap
 * org query per request; signup itself creates the org mid-request, so the
 * decision lands on the request after it).
 */
let seedState: Promise<void> | 'done' | null = null;

/** Seed demo content the first time the app runs against an untouched site. */
export function seedOnFirstRun(locals: App.Locals): Promise<void> {
	if (seedState === 'done') return Promise.resolve();
	if (seedState) return seedState;

	const attempt = (async () => {
		const { databaseAdapter } = locals.aphexCMS;
		const orgs = await databaseAdapter.findAllOrganizations();
		const org = orgs[0];
		if (!org) {
			seedState = null; // nothing to seed into yet — re-check next request
			return;
		}

		// One counts query decides it: any row of any seeded type — even a
		// lazy-created settings singleton — means a person has touched this site,
		// and the seed stays out of it forever.
		const counts = await databaseAdapter.getDocCountsByType(org.id);
		const touched = SEEDED_TYPES.some((type) => (counts[type] ?? 0) > 0);
		if (touched) {
			seedState = 'done';
			return;
		}

		console.log('[seed] Fresh site detected — creating demo content…');
		const created = await seedBlogContent(locals.aphexCMS, org.id, systemContext(org.id));
		console.log(
			`[seed] Done: ${created.posts} posts, ${created.pages} pages, ` +
				`${created.authors} authors, ${created.tags} tags.`
		);
		seedState = 'done';
	})().catch((error) => {
		// Never let seeding take a request down. A partial seed leaves rows behind,
		// so the counts check above keeps the retry from duplicating anything.
		console.error('[seed] Failed to seed demo content:', error);
		seedState = 'done';
	});

	seedState = attempt;
	return attempt;
}

/** Whether the first-run seed is enabled (kill switch: `APHEX_SEED=false`). */
export function seedEnabled(): boolean {
	return env.APHEX_SEED !== 'false';
}
