/**
 * Local API Date Validation Test
 * Tests the new validation flow where:
 * - Drafts are validated but save anyway (with validation results)
 * - Publish attempts are validated and blocked if invalid
 *
 * Run with: pnpm test:date
 */

import { createLocalAPI } from '@aphexcms/cms-core/server';
import { createPostgreSQLProvider } from '@aphexcms/postgresql-adapter';
import postgres from 'postgres';
import { loadEnv } from 'vite';
import type { SchemaType } from '@aphexcms/cms-core/types/schemas';

// Load environment variables
const env = loadEnv('development', process.cwd(), '');

// Test schema without icons (to avoid Svelte imports)
const testSchema: SchemaType = {
	type: 'document',
	name: 'instagram_post',
	title: 'Instagram Post',
	description: 'Test schema for date validation',
	fields: [
		{
			name: 'postId',
			type: 'string',
			title: 'Post ID',
			validation: (Rule) => Rule.required()
		},
		{
			name: 'publishedDate',
			type: 'date',
			title: 'Published Date',
			options: {
				dateFormat: 'MM/DD/YYYY'
			},
			validation: (Rule) => Rule.required().date('MM/DD/YYYY')
		}
	]
};

// Simple CMS config for testing
const testConfig = {
	name: 'Test CMS',
	schemaTypes: [testSchema]
};

// Colors for output
const green = '\x1b[32m';
const red = '\x1b[31m';
const yellow = '\x1b[33m';
const blue = '\x1b[34m';
const dim = '\x1b[2m';
const reset = '\x1b[0m';

const ORG_ID = '077c9496-fe44-4f2e-9b97-586567c66ece';

async function runTests() {
	console.log(`\n${blue}📅 Testing Date Validation with Local API${reset}\n`);

	// Setup database adapter (same as src/lib/server/db/index.ts)
	const client = postgres(env.DATABASE_URL, { max: 10 });
	const provider = createPostgreSQLProvider({
		client,
		multiTenancy: {
			enableRLS: true,
			enableHierarchy: true
		}
	});
	const db = provider.createAdapter();

	// Create Local API using the test config and db adapter
	const localAPI = createLocalAPI(testConfig, db);

	const context = {
		organizationId: ORG_ID,
		user: { id: 'test-user', role: 'admin' as const }
	};

	let testsPassed = 0;
	let testsFailed = 0;

	// Test 1: Create draft with INVALID date (should succeed but return validation errors)
	console.log(`${yellow}Test 1:${reset} Create draft with invalid date (13/45/2025)`);
	try {
		const result = await localAPI.collections.instagram_post.create(context, {
			postId: 'test-invalid-draft-' + Date.now(),
			publishedDate: '13/45/2025' // Invalid date
		});

		if (result.document.id && !result.validation.isValid) {
			console.log(`${green}✓${reset} Draft created with ID: ${dim}${result.document.id}${reset}`);
			console.log(`  ${yellow}⚠${reset}  Validation returned errors (as expected):`);
			result.validation.errors.forEach(e => {
				console.log(`    ${dim}${e.field}: ${e.errors.join(', ')}${reset}`);
			});
			console.log();
			testsPassed++;

			// Clean up
			await localAPI.collections.instagram_post.delete(context, result.document.id);
		} else {
			console.log(`${red}✗${reset} Expected validation errors but got none\n`);
			testsFailed++;
		}
	} catch (error) {
		console.log(`${red}✗${reset} Unexpected error: ${error instanceof Error ? error.message : error}\n`);
		testsFailed++;
	}

	// Test 2: Create and publish with INVALID date (should fail validation)
	console.log(`${yellow}Test 2:${reset} Create + publish with invalid date (13/45/2025)`);
	try {
		const published = await localAPI.collections.instagram_post.create(
			context,
			{
				postId: 'test-invalid-publish-' + Date.now(),
				publishedDate: '13/45/2025' // Invalid date
			},
			{ publish: true }
		);
		console.log(`${red}✗${reset} Should have failed validation but didn't!\n`);
		testsFailed++;

		// Clean up if it somehow succeeded
		await localAPI.collections.instagram_post.delete(context, published.id);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (message.includes('validation errors') && message.includes('publishedDate')) {
			console.log(`${green}✓${reset} Validation correctly blocked publish`);
			console.log(`  Error: ${message}\n`);
			testsPassed++;
		} else {
			console.log(`${red}✗${reset} Wrong error: ${message}\n`);
			testsFailed++;
		}
	}

	// Test 3: Create and publish with VALID date (should succeed with no validation errors)
	console.log(`${yellow}Test 3:${reset} Create + publish with valid date (01/15/2025)`);
	try {
		const result = await localAPI.collections.instagram_post.create(
			context,
			{
				postId: 'test-valid-publish-' + Date.now(),
				publishedDate: '01/15/2025' // Valid MM/DD/YYYY
			},
			{ publish: true }
		);

		if (result.document.id && result.validation.isValid) {
			console.log(`${green}✓${reset} Published successfully (ID: ${dim}${result.document.id}${reset})`);
			console.log(`  ${green}✓${reset} Validation passed\n`);
			testsPassed++;

			// Clean up
			await localAPI.collections.instagram_post.delete(context, result.document.id);
		} else {
			console.log(`${red}✗${reset} Expected valid document but got validation errors\n`);
			testsFailed++;
		}
	} catch (error) {
		console.log(`${red}✗${reset} Unexpected error: ${error instanceof Error ? error.message : error}\n`);
		testsFailed++;
	}

	// Test 4: Create draft then try to publish with invalid date
	console.log(`${yellow}Test 4:${reset} Create draft with invalid date, then try to publish`);
	try {
		// Create draft
		const result = await localAPI.collections.instagram_post.create(context, {
			postId: 'test-draft-then-publish-' + Date.now(),
			publishedDate: '02/31/2025' // Invalid date (Feb 31st)
		});

		console.log(`  ${green}✓${reset} Draft created (ID: ${dim}${result.document.id}${reset})`);
		console.log(`  ${yellow}⚠${reset}  Validation errors: ${dim}${result.validation.errors.map(e => e.field).join(', ')}${reset}`);

		// Try to publish
		try {
			await localAPI.collections.instagram_post.publish(context, result.document.id);
			console.log(`${red}✗${reset} Publish should have failed but didn't!\n`);
			testsFailed++;
		} catch (publishError) {
			const message = publishError instanceof Error ? publishError.message : String(publishError);
			if (message.includes('validation errors') && message.includes('publishedDate')) {
				console.log(`  ${green}✓${reset} Publish correctly blocked by validation`);
				console.log(`    ${dim}${message}${reset}\n`);
				testsPassed++;
			} else {
				console.log(`  ${red}✗${reset} Wrong error: ${message}\n`);
				testsFailed++;
			}
		}

		// Clean up
		await localAPI.collections.instagram_post.delete(context, result.document.id);
	} catch (error) {
		console.log(`${red}✗${reset} Unexpected error: ${error instanceof Error ? error.message : error}\n`);
		testsFailed++;
	}

	// Test 5: Update draft with invalid date (should succeed but return validation errors)
	console.log(`${yellow}Test 5:${reset} Update draft with invalid date (should succeed)`);
	try {
		// Create valid draft
		const createResult = await localAPI.collections.instagram_post.create(context, {
			postId: 'test-update-draft-' + Date.now(),
			publishedDate: '01/15/2025'
		});

		console.log(`  ${dim}Created valid draft (ID: ${createResult.document.id})${reset}`);

		// Update with invalid date
		const updateResult = await localAPI.collections.instagram_post.update(context, createResult.document.id, {
			publishedDate: '99/99/9999' // Invalid date
		});

		if (updateResult && !updateResult.validation.isValid) {
			console.log(`${green}✓${reset} Draft updated with invalid date (ID: ${dim}${updateResult.document.id}${reset})`);
			console.log(`  ${yellow}⚠${reset}  Validation returned errors (as expected):`);
			updateResult.validation.errors.forEach(e => {
				console.log(`    ${dim}${e.field}: ${e.errors.join(', ')}${reset}`);
			});
			console.log();
			testsPassed++;
		} else {
			console.log(`${red}✗${reset} Expected validation errors but got none\n`);
			testsFailed++;
		}

		// Clean up
		await localAPI.collections.instagram_post.delete(context, createResult.document.id);
	} catch (error) {
		console.log(`${red}✗${reset} Unexpected error: ${error instanceof Error ? error.message : error}\n`);
		testsFailed++;
	}

	// Summary
	console.log('─'.repeat(60));
	const total = testsPassed + testsFailed;
	const allPassed = testsFailed === 0;

	console.log(
		`\n${allPassed ? green : testsPassed > 0 ? yellow : red}${testsPassed}/${total} tests passed${reset}\n`
	);

	// Close database connection
	await client.end();

	process.exit(allPassed ? 0 : 1);
}

runTests().catch((error) => {
	console.error(`${red}Fatal error:${reset}`, error);
	process.exit(1);
});
