/**
 * LocalAPI showcase — the typed, in-process content API (no HTTP).
 * Run: cd apps/studio && npx tsx scripts/localapi-demo.ts
 */
import { createLocalAPI, systemContext } from '@aphexcms/cms-core/server';
import { createPostgreSQLProvider } from '@aphexcms/postgresql-adapter';
import postgres from 'postgres';
import { loadEnv } from 'vite';
import type { SchemaType } from '@aphexcms/cms-core/types/schemas';

const env = loadEnv('development', process.cwd(), '');
const g = '\x1b[32m',
	y = '\x1b[33m',
	b = '\x1b[34m',
	d = '\x1b[2m',
	c = '\x1b[36m',
	r = '\x1b[0m';

// Minimal, icon-free schemas mirroring the real collections (so reads hit real rows).
const schemaTypes: SchemaType[] = [
	{
		type: 'document',
		name: 'blog_post',
		title: 'Blog Post',
		fields: [
			{ name: 'title', type: 'string', title: 'Title', validation: (R) => R.required() },
			{ name: 'slug', type: 'slug', title: 'Slug' },
			{ name: 'excerpt', type: 'text', title: 'Excerpt' },
			{ name: 'postDate', type: 'date', title: 'Post Date' },
			{ name: 'author', type: 'reference', title: 'Author', to: [{ type: 'author' }] },
			{ name: 'content', type: 'array', title: 'Content', of: [{ type: 'block' }] },
			{
				name: 'tags',
				type: 'array',
				title: 'Tags',
				of: [{ type: 'reference', to: [{ type: 'tag' }] }]
			}
		]
	},
	{
		type: 'document',
		name: 'page',
		title: 'Page',
		fields: [
			{ name: 'title', type: 'string', title: 'Title', validation: (R) => R.required() },
			{ name: 'slug', type: 'slug', title: 'Slug' }
		]
	},
	{
		type: 'document',
		name: 'siteSettings',
		title: 'Site Settings',
		singleton: true,
		fields: [
			{ name: 'title', type: 'string', title: 'Title' },
			{ name: 'tagline', type: 'string', title: 'Tagline' }
		]
	}
] as SchemaType[];

async function main() {
	const client = postgres(env.DATABASE_URL, { max: 10 });
	const db = createPostgreSQLProvider({
		client,
		multiTenancy: { enableRLS: true, enableHierarchy: true }
	}).createAdapter();
	const api = createLocalAPI({ name: 'Demo', schemaTypes }, db);

	// Pick the org that actually has content.
	const orgs = await db.findAllOrganizations();
	let orgId = orgs[0]?.id;
	for (const o of orgs) {
		const n = await api.collections.blog_post.count(systemContext(o.id));
		if (n > 0) {
			orgId = o.id;
			break;
		}
	}
	const ctx = systemContext(orgId);
	console.log(`\n${b}▶ LocalAPI against org${r} ${d}${orgId}${r}\n`);

	// 1. Typed query: find + where + sort + limit
	console.log(`${y}find()${r} — published posts, newest first:`);
	const { docs, totalDocs } = await api.collections.blog_post.find(ctx, {
		perspective: 'published',
		sort: '-postDate',
		limit: 5
	});
	docs.forEach((p: any) =>
		console.log(`  • ${c}${p.title}${r} ${d}/${p.slug} · ${p._meta.status}${r}`)
	);
	console.log(`  ${d}(${totalDocs} total)${r}\n`);

	// 2. count()
	console.log(
		`${y}count()${r} — pages: ${g}${await api.collections.page.count(ctx)}${r}, tags: ${g}${(await api.collections.tag) ? await api.collections.blog_post.count(ctx) : 0}${r}\n`
	);

	// 3. findByID
	if (docs[0]) {
		const one = await api.collections.blog_post.findByID(ctx, docs[0].id);
		console.log(
			`${y}findByID()${r} — ${g}${(one as any)?.title}${r} ${d}(${one ? 'resolved' : 'null'})${r}\n`
		);
	}

	// 4. Singleton get()
	const settings: any = await api.collections.siteSettings.get(ctx);
	console.log(
		`${y}siteSettings.get()${r} — ${g}${settings.title}${r} ${d}— "${settings.tagline}"${r}\n`
	);

	// 5. Write + validation: create an INVALID draft (no title) — saves, but flags errors
	console.log(`${y}create()${r} — invalid draft (missing required title):`);
	const bad = await api.collections.blog_post.create(ctx, { slug: 'localapi-demo-bad' } as any);
	console.log(
		`  saved id ${d}${bad.document.id}${r} · valid=${bad.validation.isValid ? g + 'true' : '\x1b[31mfalse'}${r} · errors: ${d}${JSON.stringify(bad.validation.errors)}${r}`
	);
	await api.collections.blog_post.delete(ctx, bad.document.id);
	console.log(`  ${d}(cleaned up)${r}\n`);

	// 6. Create valid + publish + read back + cleanup
	console.log(`${y}create({publish:true})${r} — valid doc:`);
	const good = await api.collections.blog_post.create(
		ctx,
		{
			title: 'LocalAPI demo post',
			slug: 'localapi-demo',
			excerpt: 'Created via the LocalAPI.'
		} as any,
		{ publish: true }
	);
	console.log(
		`  id ${d}${good.document.id}${r} · status=${g}${(good.document as any)._meta.status}${r} · valid=${g}${good.validation.isValid}${r}`
	);
	await api.collections.blog_post.delete(ctx, good.document.id);
	console.log(`  ${d}(cleaned up)${r}\n`);

	console.log(
		`${b}✔ Same engine the admin UI and the MCP tools call — just typed function calls, no HTTP.${r}\n`
	);
	await client.end();
}
main().catch((e) => {
	console.error(e);
	process.exit(1);
});
