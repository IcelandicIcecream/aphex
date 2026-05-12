/**
 * One-shot backfill: rewrites singular reference fields from bare strings
 * to the unified { _type: 'reference', _ref } shape.
 *
 * Run: npx tsx scripts/backfill-refs.ts
 * Dry run: DRY_RUN=1 npx tsx scripts/backfill-refs.ts
 *
 * Rather than importing the schema files (which pull in Svelte/Lucide),
 * we define the paths to singular reference fields inline.
 */
import { config } from 'dotenv';
config();

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { cmsSchema } from '@aphexcms/postgresql-adapter/schema';

const DRY_RUN = !!process.env.DRY_RUN;

const sql = postgres(process.env.DATABASE_URL!, { max: 5 });
const db = drizzle(sql);

// Singular reference field paths per document/object type.
// Top-level keys: doc type names that contain singular refs (directly or
// via nested objects/arrays whose items have singular refs).
//
// Each entry is a dot-path FROM THE ROOT of draftData/publishedData.
// Array segments are marked with `[]` — the rewriter iterates all items.
const REF_PATHS: Record<string, string[]> = {
	referenceToPage: ['pageReference'],
	// richContentBlock is an object type that appears as array items inside
	// the `page` document's `content` array. Its singular refs live at:
	//   content[].sections[].columns[].relatedPage
	//   content[].sections[].columns[].featuredProduct
	page: [
		'content[].sections[].columns[].relatedPage',
		'content[].sections[].columns[].featuredProduct'
	]
};

function rewriteAtPath(obj: any, segments: string[]): boolean {
	if (!obj || typeof obj !== 'object') return false;
	if (segments.length === 0) return false;

	const [head, ...rest] = segments;
	const seg = head!;

	// Array segment: iterate all items and recurse
	if (seg.endsWith('[]')) {
		const key = seg.slice(0, -2);
		const arr = obj[key];
		if (!Array.isArray(arr)) return false;
		let changed = false;
		for (const item of arr) {
			if (rewriteAtPath(item, rest)) changed = true;
		}
		return changed;
	}

	// Leaf segment: this is the singular ref field
	if (rest.length === 0) {
		const value = obj[seg];
		if (typeof value === 'string' && value.length > 0) {
			obj[seg] = { _type: 'reference', _ref: value };
			return true;
		}
		return false;
	}

	// Intermediate object segment: recurse
	return rewriteAtPath(obj[seg], rest);
}

async function main() {
	console.log(DRY_RUN ? '🔍 DRY RUN — no writes' : '🔧 LIVE RUN — will update documents');
	console.log('Ref paths:', REF_PATHS);

	const docs = await db.select().from(cmsSchema.documents).execute();
	console.log(`\nScanning ${docs.length} documents...`);

	let updated = 0;
	let skipped = 0;

	for (const doc of docs) {
		const paths = REF_PATHS[doc.type];
		if (!paths) {
			skipped++;
			continue;
		}

		let draftChanged = false;
		let publishedChanged = false;

		const draftData = doc.draftData ? JSON.parse(JSON.stringify(doc.draftData)) : null;
		const publishedData = doc.publishedData ? JSON.parse(JSON.stringify(doc.publishedData)) : null;

		for (const path of paths) {
			const segments = path.split('.');
			if (draftData && rewriteAtPath(draftData, segments)) draftChanged = true;
			if (publishedData && rewriteAtPath(publishedData, segments)) publishedChanged = true;
		}

		if (draftChanged || publishedChanged) {
			updated++;
			if (DRY_RUN) {
				console.log(`  [DRY] Would update ${doc.type} ${doc.id}`);
				if (draftChanged) console.log(`    draftData changed`);
				if (publishedChanged) console.log(`    publishedData changed`);
			} else {
				await db
					.update(cmsSchema.documents)
					.set({
						...(draftChanged ? { draftData } : {}),
						...(publishedChanged ? { publishedData } : {})
					})
					.where(eq(cmsSchema.documents.id, doc.id));
				console.log(`  Updated ${doc.type} ${doc.id}`);
			}
		} else {
			skipped++;
		}
	}

	console.log(`\n✅ Done. Updated: ${updated}, Skipped: ${skipped}`);
	await sql.end();
}

main().catch((err) => {
	console.error('❌ Backfill failed:', err);
	process.exit(1);
});
