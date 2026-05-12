/**
 * Seed script — creates documents across all types with version history
 *
 * Run: npx tsx scripts/seed-versions.ts
 * Run subset: NUM_DOCS=1000 npx tsx scripts/seed-versions.ts
 */
import { config } from 'dotenv';
config();

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { cmsSchema } from '@aphexcms/postgresql-adapter/schema';

const NUM_DOCUMENTS = parseInt(process.env.NUM_DOCS || '100000');
const VERSIONS_PER_DOC = 5;
const BATCH_SIZE = 500;

function pick<T>(arr: T[]): T {
	return arr[Math.floor(Math.random() * arr.length)];
}
function rand(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── Document type generators ──

const docTypes = [
	{
		type: 'page',
		weight: 25,
		generate: (i: number, variant: string) => ({
			title: `${pick(['Getting Started', 'About Us', 'Our Story', 'Blog Post', 'Landing Page', 'FAQ', 'Documentation', 'Tutorial', 'Press Release', 'Careers'])} — ${variant}`,
			slug: `page-${i}-${Date.now().toString(36)}`,
			hero: {
				heading: pick([
					'Welcome',
					'Discover More',
					'Build Something Great',
					'Your Content, Your Way',
					'Next Generation'
				]),
				subheading: pick([
					'A comprehensive platform for modern content.',
					'Everything you need to get started.',
					'Powerful tools for creative teams.'
				]),
				ctaText: pick(['Learn More', 'Get Started', 'Try Free', 'Sign Up']),
				ctaUrl: `/page-${i}`
			},
			content: [
				{
					_type: 'textBlock',
					heading: `Section ${rand(1, 20)}`,
					content: pick([
						'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
						'Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
						'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.'
					])
				},
				{
					_type: 'callToAction',
					title: pick(['Join Now', 'Subscribe', 'Download']),
					description: 'Take the next step today.',
					buttonText: 'Go',
					buttonUrl: '/action'
				}
			],
			seo: {
				metaTitle: `Page ${i} | Aphex CMS`,
				metaDescription: `SEO description for page ${i} — ${variant}.`
			},
			published: Math.random() > 0.3
		})
	},
	{
		type: 'movie',
		weight: 20,
		generate: (i: number, variant: string) => ({
			title: `${pick(['The Matrix', 'Inception', 'Interstellar', 'Blade Runner', 'Dune', 'Arrival', 'Tenet', 'Oppenheimer', 'Barbie', 'Everything Everywhere'])} ${rand(1, 99)} — ${variant}`,
			releaseDate: `${rand(1990, 2026)}-${String(rand(1, 12)).padStart(2, '0')}-${String(rand(1, 28)).padStart(2, '0')}`,
			director: pick([
				'Christopher Nolan',
				'Denis Villeneuve',
				'Greta Gerwig',
				'Wes Anderson',
				'Jordan Peele',
				'Bong Joon-ho',
				'Chloe Zhao',
				'Taika Waititi'
			]),
			synopsis: `A ${pick(['thrilling', 'mind-bending', 'visually stunning', 'critically acclaimed', 'groundbreaking'])} ${pick(['sci-fi epic', 'drama', 'action film', 'comedy', 'mystery'])} that ${pick(['challenges perception', 'explores the human condition', 'pushes boundaries', 'captivates audiences'])}. Variant: ${variant}.`
		})
	},
	{
		type: 'agent',
		weight: 10,
		generate: (i: number, variant: string) => ({
			name: `${pick(['Atlas', 'Nova', 'Echo', 'Pixel', 'Sage', 'Bolt', 'Iris', 'Apex', 'Luna', 'Zen'])} Agent ${i}`,
			slug: `agent-${i}-${Date.now().toString(36)}`,
			description: `${pick(['A helpful assistant', 'An expert advisor', 'A creative companion', 'A data analyst', 'A customer support bot'])} configured for ${pick(['general tasks', 'technical support', 'content creation', 'data analysis', 'onboarding'])}. Version: ${variant}.`,
			enabled: Math.random() > 0.2,
			openingResponses: [
				{
					_type: 'string',
					value: pick([
						'Hi! How can I help?',
						'Hello there!',
						'Welcome! What can I do for you?',
						'Hey! Ready to assist.'
					])
				},
				{
					_type: 'string',
					value: pick(['Good to see you!', "Let's get started!", "What's on your mind?"])
				}
			],
			traitContext: [
				{
					_type: 'string',
					value: pick(['friendly', 'professional', 'concise', 'detailed', 'casual', 'formal'])
				},
				{
					_type: 'string',
					value: pick(['helpful', 'knowledgeable', 'patient', 'creative', 'analytical'])
				}
			],
			tags: [
				{ _type: 'string', value: pick(['support', 'sales', 'onboarding', 'technical', 'general']) }
			]
		})
	},
	{
		type: 'catalog',
		weight: 10,
		generate: (i: number, variant: string) => ({
			title: `${pick(['Summer', 'Winter', 'Spring', 'Premium', 'Essential', 'Pro', 'Starter'])} Collection ${i} — ${variant}`,
			description: `A curated ${pick(['collection of premium items', 'selection of essential products', 'bundle of top-rated goods', 'set of handpicked favorites'])}. Features ${rand(5, 50)} items across multiple categories.`,
			items: Array.from({ length: rand(2, 5) }, (_, _j) => ({
				_type: 'catalogItem',
				title: `${pick(['Widget', 'Gadget', 'Tool', 'Kit', 'Pack'])} ${pick(['Pro', 'Plus', 'Max', 'Lite', 'Ultra'])}`,
				shortDescription: pick([
					'High quality materials.',
					'Best in class.',
					'Customer favorite.',
					'New arrival.'
				]),
				price: rand(9, 999)
			})),
			published: Math.random() > 0.4
		})
	},
	{
		type: 'testProduct',
		weight: 15,
		generate: (i: number, variant: string) => ({
			name: `${pick(['Wireless Headphones', 'Smart Watch', 'USB-C Hub', 'Mechanical Keyboard', 'Monitor Arm', 'Desk Lamp', 'Mouse Pad', 'Webcam', 'Microphone', 'Speaker'])} ${pick(['Pro', 'Max', 'Ultra', 'Lite', 'SE'])} — ${variant}`,
			sku: `SKU-${String(i).padStart(6, '0')}`,
			price: rand(10, 2000) + rand(0, 99) / 100,
			stockQuantity: rand(0, 500),
			inStock: Math.random() > 0.2,
			releaseDate: `${rand(2020, 2026)}-${String(rand(1, 12)).padStart(2, '0')}-${String(rand(1, 28)).padStart(2, '0')}`,
			description: `${pick(['Premium', 'Professional', 'Essential', 'Budget-friendly', 'High-end'])} ${pick(['product', 'device', 'accessory', 'tool'])} designed for ${pick(['everyday use', 'professionals', 'gamers', 'content creators', 'remote workers'])}. ${variant}.`,
			category: pick(['Electronics', 'Accessories', 'Audio', 'Peripherals', 'Office'])
		})
	},
	{
		type: 'edm',
		weight: 10,
		generate: (i: number, variant: string) => ({
			subject: `${pick(["🚀 Don't miss out!", '📢 Big announcement', '🎉 Special offer inside', '💡 New feature alert', '🔥 Limited time deal'])} — ${variant}`,
			preheader: pick([
				"Open to see what's new",
				"This won't last long",
				"You're going to love this",
				'A message from our team'
			]),
			body: `Dear subscriber,\n\n${pick(['We are excited to announce', 'We wanted to share', "Here's something special for you", 'Check out our latest'])}: ${pick(['a brand new feature that will change how you work', 'an exclusive offer just for you', 'our biggest update yet', "something we've been working on"])}.\n\n${pick(['Click below to learn more.', "Don't miss this opportunity.", "See what's in store."])}\n\nBest,\nThe Team`,
			scheduledAt: new Date(Date.now() + rand(1, 30) * 86400000).toISOString(),
			campaignStatus: pick(['draft', 'scheduled', 'sent', 'cancelled'])
		})
	},
	{
		type: 'instagram_post',
		weight: 10,
		generate: (i: number, variant: string) => ({
			postId: `IG_${Date.now().toString(36)}_${i}`,
			mediaType: pick(['image', 'video', 'carousel', 'reel']),
			quality: 'standard',
			caption: `${pick(['✨', '🌟', '💫', '🔥', '❤️'])} ${pick(['Check out our latest', 'Excited to share', 'New drop alert', 'Behind the scenes', 'Swipe to see more'])} ${pick(['collection', 'update', 'project', 'collaboration', 'creation'])}! ${variant} #aphexcms #content #creative`,
			hashtags: [
				{ _type: 'string', value: pick(['#design', '#tech', '#creative', '#content', '#digital']) },
				{ _type: 'string', value: pick(['#cms', '#webdev', '#saas', '#startup', '#builder']) }
			],
			mentions: [
				{ _type: 'string', value: pick(['@aphexcms', '@designteam', '@devops', '@marketing']) }
			],
			location: {
				name: pick(['Sydney', 'Melbourne', 'Tokyo', 'London', 'New York', 'Berlin', 'Paris']),
				lat: rand(-90, 90),
				lng: rand(-180, 180)
			},
			publishedDate: new Date(Date.now() - rand(1, 365) * 86400000).toISOString(),
			engagement: {
				likes: rand(10, 50000),
				comments: rand(0, 2000),
				shares: rand(0, 500),
				saves: rand(0, 3000)
			},
			isArchived: Math.random() > 0.9,
			isPinned: Math.random() > 0.95
		})
	}
];

// Build weighted selection
const weightedTypes: typeof docTypes = [];
for (const dt of docTypes) {
	for (let w = 0; w < dt.weight; w++) {
		weightedTypes.push(dt);
	}
}

function pgConnectionUrl(env: Record<string, string | undefined>): string {
	if (env.DATABASE_URL) return env.DATABASE_URL;
	const host = env.PG_HOST || 'localhost';
	const port = env.PG_PORT || '5432';
	const user = env.PG_USER || 'postgres';
	const password = env.PG_PASSWORD || 'postgres';
	const database = env.PG_DATABASE || 'postgres';
	return `postgres://${user}:${password}@${host}:${port}/${database}`;
}

async function seed() {
	const startTime = performance.now();
	console.log(
		`🌱 Seeding ${NUM_DOCUMENTS.toLocaleString()} documents across ${docTypes.length} types...\n`
	);
	console.log(`   Types: ${docTypes.map((d) => d.type).join(', ')}`);
	console.log(`   Versions per doc: ${VERSIONS_PER_DOC}`);
	console.log(`   Total versions: ~${(NUM_DOCUMENTS * VERSIONS_PER_DOC).toLocaleString()}`);
	console.log(`   Batch size: ${BATCH_SIZE}\n`);

	const databaseUrl = pgConnectionUrl(process.env);
	const client = postgres(databaseUrl, { max: 20 });
	const db = drizzle(client, { schema: cmsSchema });

	const orgs = await db.select().from(cmsSchema.organizations).limit(1);
	if (!orgs.length) {
		console.error('❌ No organizations found.');
		await client.end();
		process.exit(1);
	}
	const orgId = orgs[0].id;
	console.log(`📁 Organization: ${orgs[0].name} (${orgId})\n`);

	let totalDocs = 0;
	let totalVersions = 0;
	const typeCounts: Record<string, number> = {};

	for (let batch = 0; batch < NUM_DOCUMENTS; batch += BATCH_SIZE) {
		const batchEnd = Math.min(batch + BATCH_SIZE, NUM_DOCUMENTS);
		const batchNum = Math.floor(batch / BATCH_SIZE) + 1;
		const totalBatches = Math.ceil(NUM_DOCUMENTS / BATCH_SIZE);

		const docValues = [];
		const docMeta: { type: string; generate: (i: number, v: string) => any }[] = [];

		for (let i = batch; i < batchEnd; i++) {
			const dt = pick(weightedTypes);
			const data = dt.generate(i + 1, 'initial');
			typeCounts[dt.type] = (typeCounts[dt.type] || 0) + 1;
			docMeta.push(dt);

			docValues.push({
				organizationId: orgId,
				type: dt.type,
				status: 'published' as const,
				draftData: data,
				publishedData: data,
				publishedHash: `s${i}`,
				publishedAt: new Date(),
				createdAt: new Date(),
				updatedAt: new Date()
			});
		}

		const insertedDocs = await db
			.insert(cmsSchema.documents)
			.values(docValues)
			.returning({ id: cmsSchema.documents.id });

		const versionValues = [];
		for (let idx = 0; idx < insertedDocs.length; idx++) {
			const docId = insertedDocs[idx].id;
			const docNum = batch + idx + 1;
			const dt = docMeta[idx];

			for (let v = 1; v <= VERSIONS_PER_DOC; v++) {
				const isDraft = v <= 3 || v === 5;
				versionValues.push({
					documentId: docId,
					organizationId: orgId,
					versionNumber: v,
					eventType: (isDraft ? 'draft' : 'publish') as 'draft' | 'publish',
					data: dt.generate(docNum, `v${v}`),
					createdAt: new Date(Date.now() - (VERSIONS_PER_DOC - v) * 60000)
				});
			}
		}

		const VERSION_BATCH = 2000;
		for (let vb = 0; vb < versionValues.length; vb += VERSION_BATCH) {
			await db
				.insert(cmsSchema.documentVersions)
				.values(versionValues.slice(vb, vb + VERSION_BATCH));
		}

		totalDocs += insertedDocs.length;
		totalVersions += versionValues.length;

		const elapsed = ((performance.now() - startTime) / 1000).toFixed(1);
		const pct = ((batchEnd / NUM_DOCUMENTS) * 100).toFixed(1);
		const rate = Math.round(totalDocs / (parseFloat(elapsed) || 1));
		process.stdout.write(
			`\r   Batch ${batchNum}/${totalBatches} | ${totalDocs.toLocaleString()} docs | ${totalVersions.toLocaleString()} versions | ${pct}% | ${elapsed}s | ${rate} docs/s`
		);
	}

	const totalTime = ((performance.now() - startTime) / 1000).toFixed(1);
	console.log(`\n\n✅ Done in ${totalTime}s!`);
	console.log(
		`   ${totalDocs.toLocaleString()} documents | ${totalVersions.toLocaleString()} versions`
	);
	console.log(`   ${Math.round(totalDocs / parseFloat(totalTime))} docs/s average\n`);
	console.log('   By type:');
	for (const [type, count] of Object.entries(typeCounts).sort((a, b) => b[1] - a[1])) {
		console.log(`   ${type.padEnd(20)} ${count.toLocaleString()}`);
	}

	await client.end();
	process.exit(0);
}

seed().catch((err) => {
	console.error('\n❌ Seed failed:', err);
	process.exit(1);
});
