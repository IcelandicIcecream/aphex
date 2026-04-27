/**
 * DEV ONLY: Seed ~100 documents per schema type so the admin UI feels like
 * a real production instance.
 *
 * Usage:
 *   GET /api/seed-all          — adds to existing data
 *   GET /api/seed-all?clean=1  — wipes seeded types in this org first
 *   GET /api/seed-all?n=50     — override docs-per-type (default 100)
 *
 * Image / file fields are skipped (need real uploaded assets).
 */
import { dev } from '$app/environment';
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// ── Tiny helpers ───────────────────────────────────────────────────────

const pick = <T>(arr: T[], i: number) => arr[i % arr.length];
const slugify = (s: string) =>
	s
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');

const padId = (n: number) => String(n).padStart(4, '0');
const isoOffset = (daysFromToday: number) =>
	new Date(Date.now() + daysFromToday * 86_400_000).toISOString();
const dateOnly = (daysFromToday: number) => isoOffset(daysFromToday).slice(0, 10);

// Object factories — every nested item gets the right `_type`.
const tb = (heading: string, content: string) => ({ _type: 'textBlock', heading, content });
const cta = (title: string, description: string, buttonText: string, buttonUrl: string) => ({
	_type: 'callToAction',
	title,
	description,
	buttonText,
	buttonUrl
});
const ci = (title: string, shortDescription: string, price: number) => ({
	_type: 'catalogItem',
	title,
	shortDescription,
	price
});
const mi = (url: string, altText: string, w?: number, h?: number) => ({
	_type: 'mediaItem',
	url,
	altText,
	...(w ? { width: w } : {}),
	...(h ? { height: h } : {})
});
const men = (username: string) => ({ _type: 'mentions', username });

// ── Word pools ─────────────────────────────────────────────────────────

const ADJ = [
	'modern', 'classic', 'rustic', 'minimal', 'bold', 'soft', 'elegant', 'industrial',
	'cozy', 'sleek', 'retro', 'fresh', 'urban', 'organic', 'crafted', 'curated',
	'timeless', 'refined', 'casual', 'premium'
];
const NOUN = [
	'collection', 'series', 'edition', 'release', 'launch', 'project', 'study', 'guide',
	'volume', 'set', 'archive', 'index', 'journal', 'report', 'brief', 'note',
	'memo', 'spec', 'draft', 'final'
];
const TOPICS = [
	'design', 'engineering', 'marketing', 'product', 'finance', 'strategy', 'research',
	'operations', 'people', 'data', 'sales', 'support', 'security', 'infra', 'community'
];
const FIRST_NAMES = [
	'alex', 'jordan', 'sam', 'taylor', 'morgan', 'casey', 'riley', 'jamie', 'avery', 'blake',
	'cameron', 'drew', 'finn', 'harper', 'kai', 'lane', 'reese', 'rowan', 'sage', 'sky'
];
const DIRECTORS = [
	'Christopher Nolan', 'Greta Gerwig', 'Bong Joon-ho', 'Hayao Miyazaki', 'Denis Villeneuve',
	'Quentin Tarantino', 'Martin Scorsese', 'Sofia Coppola', 'David Fincher', 'Chloé Zhao',
	'Jordan Peele', 'Wes Anderson', 'Lulu Wang', 'Damien Chazelle', 'Park Chan-wook',
	'Ari Aster', 'Yorgos Lanthimos', 'Lynne Ramsay', 'Barry Jenkins', 'Céline Sciamma'
];
const MOVIE_PREFIXES = [
	'The Last', 'Across the', 'Echoes of', 'Beyond', 'Whispers in', 'Shadows of',
	'A Tale of', 'The Secret', 'Memories of', 'Portrait of', 'The Long', 'Voices of',
	'Beneath the', 'Children of', 'In Search of', 'The Quiet', 'Letters from',
	'A Year of', 'Notes on', 'Dreams of'
];
const MOVIE_SUFFIXES = [
	'Summer', 'Winter', 'the City', 'the Mountain', 'the Sea', 'Tomorrow', 'Yesterday',
	'the Stars', 'the Garden', 'a Nation', 'Silence', 'the Forest', 'a Stranger',
	'Departure', 'Return', 'the River', 'a Lifetime', 'a Memory', 'Light', 'Stone'
];
const PRODUCT_CATEGORIES = ['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books'] as const;
const PRODUCT_NAMES_BY_CATEGORY: Record<(typeof PRODUCT_CATEGORIES)[number], string[]> = {
	Electronics: ['Wireless Headphones', 'Mechanical Keyboard', '4K Monitor', 'USB-C Hub', 'Smart Watch', 'Bluetooth Speaker', 'Webcam', 'Mouse Pad', 'Laptop Stand', 'Cable Organizer'],
	Clothing: ['Linen T-Shirt', 'Wool Sweater', 'Denim Jacket', 'Cotton Shirt', 'Cashmere Scarf', 'Leather Belt', 'Canvas Sneakers', 'Wool Socks', 'Silk Blouse', 'Down Vest'],
	'Home & Garden': ['Garden Trowel', 'Watering Can', 'Cast Iron Pan', 'Linen Throw', 'Ceramic Vase', 'Bamboo Cutting Board', 'Brass Candlestick', 'Wool Rug', 'Cotton Towel', 'Glass Pitcher'],
	Sports: ['Running Shoes', 'Yoga Mat', 'Dumbbells', 'Tennis Racket', 'Climbing Shoes', 'Bike Helmet', 'Swim Goggles', 'Resistance Bands', 'Foam Roller', 'Water Bottle'],
	Books: ['Hardcover Novel', 'Cookbook', 'Photography Anthology', 'Poetry Collection', 'Travel Guide', 'Biography', 'Field Guide', 'Sketchbook', 'Reference Atlas', 'Coffee Table Book']
};

// ── Generators ─────────────────────────────────────────────────────────

function generatePages(n: number) {
	return Array.from({ length: n }, (_, i) => {
		const adj = pick(ADJ, i);
		const noun = pick(NOUN, i + 3);
		const topic = pick(TOPICS, i + 7);
		const title = i === 0
			? 'Home'
			: `${adj.charAt(0).toUpperCase() + adj.slice(1)} ${noun} ${i}`;
		const slug = i === 0 ? 'home' : slugify(title);
		const published = i % 3 !== 0; // ~67% published
		return {
			title,
			slug,
			hero: {
				heading: i === 0 ? 'A CMS that gets out of your way' : `${title} — overview`,
				subheading: `Learn about our ${topic} ${noun} for the modern team.`,
				ctaText: 'Get Started',
				ctaUrl: '/admin'
			},
			content: [
				tb('Introduction', `This is a ${adj} ${noun} about ${topic}, generated for testing.`),
				tb('Details', `We dive into the specifics of ${topic} and what makes a ${adj} approach work.`),
				cta('Ready to dive in?', `Explore the rest of our ${topic} resources.`, 'Read more', `/${slug}/details`)
			],
			seo: {
				metaTitle: `${title} | Aphex`,
				metaDescription: `A ${adj} ${noun} covering ${topic} for builders and operators.`
			},
			published
		};
	});
}

function generateSimpleDocs(n: number) {
	return Array.from({ length: n }, (_, i) => ({
		// `simple_document` schema caps title at 10 chars and description at 20.
		title: `Doc ${padId(i + 1)}`.slice(0, 10),
		description: `Note #${padId(i + 1)}`.slice(0, 20)
	}));
}

function generateCatalogs(n: number) {
	return Array.from({ length: n }, (_, i) => {
		const adj = pick(ADJ, i);
		const noun = pick(NOUN, i + 1);
		const title = `${adj.charAt(0).toUpperCase() + adj.slice(1)} ${noun}`;
		const itemCount = 3 + (i % 4); // 3–6 items
		const items = Array.from({ length: itemCount }, (_, j) =>
			ci(
				`${pick(ADJ, i + j)} ${pick(NOUN, j)}`,
				`A ${pick(ADJ, j)} item from the ${title} catalog.`,
				20 + ((i * 13 + j * 7) % 200)
			)
		);
		return {
			title: `${title} ${i + 1}`,
			description: `A ${adj} catalog of ${itemCount} items for the ${pick(TOPICS, i)} team.`,
			items,
			published: i % 2 === 0
		};
	});
}

function generateMovies(n: number) {
	return Array.from({ length: n }, (_, i) => {
		const title = `${pick(MOVIE_PREFIXES, i)} ${pick(MOVIE_SUFFIXES, i + 3)}`;
		const director = pick(DIRECTORS, i);
		const releaseDate = dateOnly(-(i * 73) % 18000); // spread across ~50 years
		return {
			title,
			releaseDate,
			director,
			synopsis: `${title} is a film by ${director}, released on ${releaseDate}. A meditation on memory, distance, and quiet defiance.`
		};
	});
}

function generateAgents(n: number) {
	const personas = [
		{ name: 'Concierge', desc: 'Friendly front-desk assistant' },
		{ name: 'Researcher', desc: 'Deep-dive analyst with citations' },
		{ name: 'Editor', desc: 'Sharp prose editor' },
		{ name: 'Coach', desc: 'Motivational accountability partner' },
		{ name: 'Translator', desc: 'Bilingual translator with context' },
		{ name: 'Critic', desc: 'Brutal but fair design critic' },
		{ name: 'Strategist', desc: 'Long-horizon strategic thinker' },
		{ name: 'Analyst', desc: 'Numbers-first data analyst' },
		{ name: 'Storyteller', desc: 'Narrative-driven explainer' },
		{ name: 'Mentor', desc: 'Experienced guide for new builders' }
	];
	return Array.from({ length: n }, (_, i) => {
		const p = personas[i % personas.length];
		const variant = Math.floor(i / personas.length) + 1;
		const name = variant === 1 ? p.name : `${p.name} ${variant}`;
		return {
			name,
			slug: slugify(name),
			description: p.desc,
			enabled: i % 4 !== 0, // ~75% enabled
			openingResponses: [
				`Hi, I'm ${name}. How can I help?`,
				'Let’s get into it.',
				'Ready when you are.'
			],
			traitContext: [
				'Stay focused on the user’s actual goal.',
				'Prefer concrete advice over abstract.',
				'Flag uncertainty explicitly.',
				'Mirror the user’s tone.'
			],
			notes: `${name} is best for ${pick(TOPICS, i)} workflows.`,
			reactivity_test: `Last updated at iteration ${i}.`
		};
	});
}

function generateInstagramPosts(n: number) {
	const types = ['image', 'video', 'carousel', 'reel'] as const;
	const qualityByType: Record<(typeof types)[number], string[]> = {
		image: ['standard', 'high', 'original'],
		video: ['720p', '1080p', '4k'],
		carousel: ['standard', 'high'],
		reel: ['720p', '1080p', '4k']
	};
	const captions = [
		'Golden hour ☀️', 'Morning ritual', 'Quick line at the park', 'Studio refresh',
		'BTS from yesterday’s shoot.', 'Three days, one ridgeline.', 'Sunday sauce in 30 seconds',
		'Re-shelved by color.', 'Late-night sketch', 'Field notes', 'Lab snapshot',
		'New gear day', 'Trail report', 'Slow morning'
	];
	return Array.from({ length: n }, (_, i) => {
		const mediaType = types[i % types.length];
		const quality = pick(qualityByType[mediaType], i);
		const mediaCount = mediaType === 'carousel' ? 2 + (i % 4) : 1;
		const media = Array.from({ length: mediaCount }, (_, j) =>
			mi(
				`https://example.com/${mediaType}/${padId(i)}_${j}.jpg`,
				`${mediaType} ${i}/${j}`,
				1080,
				mediaType === 'reel' ? 1920 : 1080
			)
		);
		return {
			postId: `IG_${padId(i + 1)}`,
			mediaType,
			quality,
			media,
			caption: pick(captions, i),
			hashtags: [pick(TOPICS, i), pick(ADJ, i), 'photo'],
			mentions: i % 3 === 0 ? [men(pick(FIRST_NAMES, i)), men(pick(FIRST_NAMES, i + 5))] : []
		};
	});
}

function generateTestProducts(n: number) {
	return Array.from({ length: n }, (_, i) => {
		const category = PRODUCT_CATEGORIES[i % PRODUCT_CATEGORIES.length];
		const namePool = PRODUCT_NAMES_BY_CATEGORY[category];
		const baseName = namePool[Math.floor(i / PRODUCT_CATEGORIES.length) % namePool.length];
		const variant = Math.floor(i / (PRODUCT_CATEGORIES.length * namePool.length)) + 1;
		const name = variant === 1 ? baseName : `${baseName} v${variant}`;
		const stockQuantity = (i * 17) % 250;
		return {
			name,
			sku: `${category.slice(0, 2).toUpperCase()}-${padId(i + 1)}`,
			price: 15 + ((i * 7) % 480),
			stockQuantity,
			inStock: stockQuantity > 0,
			category,
			releaseDate: dateOnly(-(i * 31) % 1500),
			lastRestocked: stockQuantity > 0 ? isoOffset(-(i % 90)) : undefined,
			description: `${name} — a ${pick(ADJ, i)} ${category.toLowerCase()} item, sku ${padId(i + 1)}.`
		};
	});
}

function generateEdms(n: number) {
	const statuses = ['draft', 'scheduled', 'sent'] as const;
	const subjects = [
		'Spring Sale — 20% off', 'Welcome to the newsletter', 'New product drop',
		'Holiday gift guide', 'You left something in your cart', 'Year in review',
		'Back in stock', 'Last chance', 'Flash sale', 'Exclusive preview', 'Member benefits',
		'Restock alert', 'Special collaboration', 'Limited release'
	];
	return Array.from({ length: n }, (_, i) => {
		const status = pick(statuses, i);
		return {
			subject: `${pick(subjects, i)} #${i + 1}`,
			preheader: `${pick(ADJ, i)} update — read inside.`,
			body: `Hi there,\n\nThis is a ${status} ${pick(NOUN, i)} for our ${pick(TOPICS, i)} list.\n\nThanks for reading.`,
			campaignStatus: status,
			...(status === 'scheduled' ? { scheduledAt: isoOffset(7 + (i % 60)) } : {})
		};
	});
}

function generateDataImports(n: number) {
	const sources = ['Customer list', 'Vendor contacts', 'Newsletter subscribers', 'Lapsed customers', 'B2B prospects', 'Event RSVPs', 'Beta testers', 'Survey respondents'];
	return Array.from({ length: n }, (_, i) => ({
		title: `${pick(sources, i)} — batch ${padId(i + 1)}`
	}));
}

// ── Handler ────────────────────────────────────────────────────────────

const SEEDED_TYPES = [
	'page',
	'simple_document',
	'catalog',
	'movie',
	'agent',
	'instagram_post',
	'testProduct',
	'edm',
	'dataImport',
	'referenceToPage',
	'initialValueTest'
] as const;

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!dev) error(404, 'Not found');

	const { localAPI } = locals.aphexCMS;
	const auth = locals.auth;
	if (!auth || auth.type !== 'session') {
		error(401, 'You must be logged in. Visit /admin first.');
	}

	const N = Math.max(1, Math.min(500, parseInt(url.searchParams.get('n') ?? '100', 10)));
	const ctx = { organizationId: auth.organizationId, user: auth.user, auth };
	const counts: Record<string, number> = {};
	const errors: string[] = [];
	const cleaned: Record<string, number> = {};

	// `?clean=1` deletes every doc of the seeded types in this org first.
	if (url.searchParams.get('clean') === '1') {
		for (const collectionName of SEEDED_TYPES) {
			const collection = (localAPI.collections as any)[collectionName];
			if (!collection) continue;
			try {
				const { docs } = await collection.find(ctx, { limit: 5000 });
				let deleted = 0;
				for (const doc of docs) {
					try {
						await collection.delete(ctx, doc.id);
						deleted++;
					} catch (err) {
						errors.push(
							`Failed to delete ${collectionName}/${doc.id}: ${err instanceof Error ? err.message : String(err)}`
						);
					}
				}
				cleaned[collectionName] = deleted;
			} catch (err) {
				errors.push(
					`Failed to list ${collectionName} for cleanup: ${err instanceof Error ? err.message : String(err)}`
				);
			}
		}
	}

	async function seedMany<T>(
		typeKey: string,
		collectionName: string,
		items: T[],
		opts?: (item: T, i: number) => { publish?: boolean }
	) {
		const collection = (localAPI.collections as any)[collectionName];
		if (!collection) {
			errors.push(`No "${collectionName}" collection registered — skipped`);
			return [];
		}
		let created = 0;
		const ids: string[] = [];
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			try {
				const result = await collection.create(ctx, item, opts?.(item, i));
				created++;
				if (result?.document?.id) ids.push(result.document.id);
			} catch (err) {
				errors.push(
					`Failed to create ${typeKey}[${i}]: ${err instanceof Error ? err.message : String(err)}`
				);
			}
		}
		counts[typeKey] = created;
		return ids;
	}

	// Pages first so referenceToPage has targets to point at.
	const pageIds = await seedMany('page', 'page', generatePages(N), (p) => ({
		publish: (p as { published: boolean }).published
	}));

	await seedMany('simple_document', 'simple_document', generateSimpleDocs(N));
	await seedMany('catalog', 'catalog', generateCatalogs(N), (c) => ({
		publish: (c as { published: boolean }).published
	}));
	await seedMany('movie', 'movie', generateMovies(N), (_m, i) => ({ publish: i % 3 !== 0 }));
	await seedMany('agent', 'agent', generateAgents(N));
	await seedMany('instagram_post', 'instagram_post', generateInstagramPosts(N));
	await seedMany('testProduct', 'testProduct', generateTestProducts(N), (_p, i) => ({
		publish: i % 2 === 0
	}));
	await seedMany('edm', 'edm', generateEdms(N));
	await seedMany('dataImport', 'dataImport', generateDataImports(N));

	if (pageIds.length > 0) {
		// Reference fields to documents store a plain ID string (not the
		// `{ _ref, _type: 'reference' }` shape — that's for asset references).
		const refs = Array.from({ length: N }, (_, i) => ({
			title: `Reference ${padId(i + 1)}`,
			pageReference: pageIds[i % pageIds.length]
		}));
		await seedMany('referenceToPage', 'referenceToPage', refs);
	}

	// initialValueTest: a handful — server-side initialValues fill the rest.
	await seedMany(
		'initialValueTest',
		'initialValueTest',
		Array.from({ length: Math.min(N, 10) }, () => ({}))
	);

	const total = Object.values(counts).reduce((a, b) => a + b, 0);
	const totalCleaned = Object.values(cleaned).reduce((a, b) => a + b, 0);
	return json({
		success: errors.length === 0,
		message:
			totalCleaned > 0
				? `Cleaned ${totalCleaned} existing docs, then seeded ${total} new docs (~${N} per type)`
				: `Seeded ${total} documents (~${N} per type) across ${Object.keys(counts).length} types`,
		counts,
		cleaned: totalCleaned > 0 ? cleaned : undefined,
		errors: errors.length > 0 ? errors : undefined
	});
};
