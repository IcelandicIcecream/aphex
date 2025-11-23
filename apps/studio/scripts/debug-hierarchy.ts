/**
 * Debug script for organization hierarchy issues
 * Run with: pnpm tsx scripts/debug-hierarchy.ts
 */

import { createLocalAPI } from '@aphexcms/cms-core/server';
import { createPostgreSQLProvider } from '@aphexcms/postgresql-adapter';
import postgres from 'postgres';
import { loadEnv } from 'vite';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';

// Load environment variables
const env = loadEnv('development', process.cwd(), '');

const green = '\x1b[32m';
const red = '\x1b[31m';
const yellow = '\x1b[33m';
const blue = '\x1b[34m';
const dim = '\x1b[2m';
const reset = '\x1b[0m';

async function debugHierarchy() {
	console.log(`\n${blue}🔍 Debugging Organization Hierarchy${reset}\n`);

	const client = postgres(env.DATABASE_URL, { max: 10 });
	const db = drizzle(client);

	// 1. Check all organizations and their parent relationships
	console.log(`${yellow}1. Checking organizations table:${reset}`);
	const orgs = await db.execute(sql`
		SELECT id, name, slug, parent_organization_id
		FROM cms_organizations
		ORDER BY parent_organization_id NULLS FIRST
	`);

	console.log(`Found ${orgs.length} organizations:`);
	for (const org of orgs) {
		const parentInfo = org.parent_organization_id
			? `${dim}(parent: ${org.parent_organization_id})${reset}`
			: `${green}[ROOT]${reset}`;
		console.log(`  - ${org.name} (${org.slug}): ${dim}${org.id}${reset} ${parentInfo}`);
	}
	console.log();

	// 2. Check if RLS is enabled on tables
	console.log(`${yellow}2. Checking RLS status:${reset}`);
	const rlsStatus = await db.execute(sql`
		SELECT tablename, rowsecurity
		FROM pg_tables
		WHERE schemaname = 'public'
		AND tablename IN ('cms_documents', 'cms_assets', 'cms_organizations')
	`);

	for (const table of rlsStatus) {
		const status = table.rowsecurity ? `${green}ENABLED${reset}` : `${red}DISABLED${reset}`;
		console.log(`  - ${table.tablename}: ${status}`);
	}
	console.log();

	// 3. Check RLS policies
	console.log(`${yellow}3. Checking RLS policies:${reset}`);
	const policies = await db.execute(sql`
		SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
		FROM pg_policies
		WHERE schemaname = 'public'
		AND tablename IN ('cms_documents', 'cms_assets')
	`);

	if (policies.length === 0) {
		console.log(`  ${red}No RLS policies found!${reset}`);
		console.log(`  ${dim}You may need to run migrations or manually apply RLS policies${reset}`);
	} else {
		for (const policy of policies) {
			console.log(`  - ${policy.tablename}.${policy.policyname} (${policy.cmd})`);
		}
	}
	console.log();

	// 4. Test hierarchy query directly
	if (orgs.length > 0) {
		const parentOrg = orgs.find((o: any) => !o.parent_organization_id);
		const childOrg = orgs.find((o: any) => o.parent_organization_id);

		if (parentOrg && childOrg) {
			console.log(`${yellow}4. Testing hierarchy query:${reset}`);
			console.log(`  Parent org: ${parentOrg.name} (${parentOrg.id})`);
			console.log(`  Child org: ${childOrg.name} (${childOrg.id})`);

			// Count documents in child org
			const childDocs = await db.execute(sql`
				SELECT COUNT(*) as count FROM cms_documents
				WHERE organization_id = ${childOrg.id}::uuid
			`);
			console.log(`  Documents in child org: ${childDocs[0].count}`);

			// Test the RLS query directly
			console.log(`\n  ${dim}Testing RLS USING clause:${reset}`);
			const hierarchyTest = await db.execute(sql`
				SELECT id, name FROM cms_organizations
				WHERE parent_organization_id = ${parentOrg.id}::uuid
			`);
			console.log(`  Child orgs found via parent_organization_id: ${hierarchyTest.length}`);

			// Simulate what the RLS policy does
			console.log(`\n  ${dim}Simulating RLS policy for parent org:${reset}`);
			const simulatedRLS = await db.execute(sql`
				SELECT COUNT(*) as count FROM cms_documents
				WHERE organization_id IN (
					SELECT ${parentOrg.id}::uuid
					UNION
					SELECT id FROM cms_organizations WHERE parent_organization_id = ${parentOrg.id}::uuid
				)
			`);
			console.log(`  Total documents accessible to parent org: ${simulatedRLS[0].count}`);

			// Test with SET LOCAL (actual RLS behavior)
			console.log(`\n  ${dim}Testing with actual RLS context:${reset}`);
			try {
				const rlsResult = await db.transaction(async (tx) => {
					await tx.execute(sql.raw(`SET LOCAL app.organization_id = '${parentOrg.id}'`));
					return tx.execute(sql`SELECT COUNT(*) as count FROM cms_documents`);
				});
				console.log(`  Documents visible with RLS enabled: ${rlsResult[0].count}`);
			} catch (error) {
				console.log(
					`  ${red}RLS test failed:${reset} ${error instanceof Error ? error.message : error}`
				);
			}
		} else {
			console.log(`${yellow}4. No parent-child relationship found to test${reset}`);
		}
	}

	await client.end();
	console.log(`\n${green}Debug complete!${reset}\n`);
}

debugHierarchy().catch((error) => {
	console.error(`${red}Fatal error:${reset}`, error);
	process.exit(1);
});
