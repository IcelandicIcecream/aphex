/**
 * Local API DateTime Validation Test
 * Tests the datetime validation flow where:
 * - Drafts are validated but save anyway (with validation results)
 * - Publish attempts are validated and blocked if invalid
 * - Datetimes are stored as UTC ISO strings
 * - Automatic validation based on field type and options
 *
 * Run with: pnpm tsx scripts/test-datetime-localapi.ts
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
	name: 'event',
	title: 'Event',
	description: 'Test schema for datetime validation',
	fields: [
		{
			name: 'eventId',
			type: 'string',
			title: 'Event ID',
			validation: (Rule) => Rule.required()
		},
		{
			name: 'eventDateTime',
			type: 'datetime',
			title: 'Event Date & Time',
			options: {
				dateFormat: 'MM/DD/YYYY',
				timeFormat: 'HH:mm'
			},
			validation: (Rule) => Rule.required()
			// Note: No need for .datetime() - it's automatic based on field type!
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
	console.log(`\n${blue}📅⏰ Testing DateTime Validation with Local API${reset}\n`);

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

	// Test 1: Create draft with INVALID datetime - invalid date (should succeed but return validation errors)
	console.log(`${yellow}Test 1:${reset} Create draft with invalid datetime (13/45/2025 23:59)`);
	try {
		const result = await localAPI.collections.event.create(context, {
			eventId: 'test-invalid-draft-' + Date.now(),
			eventDateTime: '13/45/2025 23:59' // Invalid date
		});

		if (result.document.id && !result.validation.isValid) {
			console.log(`${green}✓${reset} Draft created with ID: ${dim}${result.document.id}${reset}`);
			console.log(`  ${yellow}⚠${reset}  Validation returned errors (as expected):`);
			result.validation.errors.forEach((e) => {
				console.log(`    ${dim}${e.field}: ${e.errors.join(', ')}${reset}`);
			});
			console.log();
			testsPassed++;

			// Clean up
			await localAPI.collections.event.delete(context, result.document.id);
		} else {
			console.log(`${red}✗${reset} Expected validation errors but got none\n`);
			testsFailed++;
		}
	} catch (error) {
		console.log(
			`${red}✗${reset} Unexpected error: ${error instanceof Error ? error.message : error}\n`
		);
		testsFailed++;
	}

	// Test 2: Create draft with date-only format (should fail validation - datetime requires time)
	console.log(`${yellow}Test 2:${reset} Create draft with date-only (01/15/2025 - missing time)`);
	try {
		const result = await localAPI.collections.event.create(context, {
			eventId: 'test-date-only-' + Date.now(),
			eventDateTime: '01/15/2025' // Missing time portion - should fail validation
		});

		if (result.document.id && !result.validation.isValid) {
			console.log(`${green}✓${reset} Draft created with ID: ${dim}${result.document.id}${reset}`);
			console.log(`  ${yellow}⚠${reset}  Validation correctly rejected date-only format:`);
			result.validation.errors.forEach((e) => {
				console.log(`    ${dim}${e.field}: ${e.errors.join(', ')}${reset}`);
			});
			console.log();
			testsPassed++;

			// Clean up
			await localAPI.collections.event.delete(context, result.document.id);
		} else {
			console.log(`${red}✗${reset} Expected validation errors but got none\n`);
			testsFailed++;
		}
	} catch (error) {
		console.log(
			`${red}✗${reset} Unexpected error: ${error instanceof Error ? error.message : error}\n`
		);
		testsFailed++;
	}

	// Test 3: Create and publish with INVALID datetime (should fail validation)
	console.log(`${yellow}Test 3:${reset} Create + publish with invalid datetime (13/45/2025 23:59)`);
	try {
		const published = await localAPI.collections.event.create(
			context,
			{
				eventId: 'test-invalid-publish-' + Date.now(),
				eventDateTime: '13/45/2025 23:59' // Invalid date
			},
			{ publish: true }
		);
		console.log(`${red}✗${reset} Should have failed validation but didn't!\n`);
		testsFailed++;

		// Clean up if it somehow succeeded
		await localAPI.collections.event.delete(context, published.id);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (message.includes('validation errors') && message.includes('eventDateTime')) {
			console.log(`${green}✓${reset} Validation correctly blocked publish`);
			console.log(`  Error: ${dim}${message}${reset}\n`);
			testsPassed++;
		} else {
			console.log(`${red}✗${reset} Wrong error: ${message}\n`);
			testsFailed++;
		}
	}

	// Test 4: Create and publish with VALID datetime in user format (should succeed)
	console.log(`${yellow}Test 4:${reset} Create + publish with valid datetime (01/15/2025 14:30)`);
	try {
		const result = await localAPI.collections.event.create(
			context,
			{
				eventId: 'test-valid-publish-' + Date.now(),
				eventDateTime: '01/15/2025 14:30' // Valid MM/DD/YYYY HH:mm
			},
			{ publish: true }
		);

		if (result.document.id && result.validation.isValid) {
			console.log(
				`${green}✓${reset} Published successfully (ID: ${dim}${result.document.id}${reset})`
			);
			console.log(`  ${green}✓${reset} Validation passed`);
			console.log(`  ${dim}Stored as UTC: ${result.document.eventDateTime}${reset}\n`);
			testsPassed++;

			// Clean up
			await localAPI.collections.event.delete(context, result.document.id);
		} else {
			console.log(`${red}✗${reset} Expected valid document but got validation errors:`);
			result.validation.errors.forEach((e) => {
				console.log(`  ${dim}${e.field}: ${e.errors.join(', ')}${reset}`);
			});
			console.log();
			testsFailed++;
		}
	} catch (error) {
		console.log(
			`${red}✗${reset} Unexpected error: ${error instanceof Error ? error.message : error}\n`
		);
		testsFailed++;
	}

	// Test 5: Create and publish with UTC ISO datetime (should succeed)
	console.log(
		`${yellow}Test 5:${reset} Create + publish with UTC ISO datetime (2025-12-25T15:30:00Z)`
	);
	try {
		const result = await localAPI.collections.event.create(
			context,
			{
				eventId: 'test-valid-iso-' + Date.now(),
				eventDateTime: '2025-12-25T15:30:00Z' // UTC ISO format
			},
			{ publish: true }
		);

		if (result.document.id && result.validation.isValid) {
			console.log(
				`${green}✓${reset} Published successfully (ID: ${dim}${result.document.id}${reset})`
			);
			console.log(`  ${green}✓${reset} Validation passed`);
			console.log(`  ${dim}Stored as: ${result.document.eventDateTime}${reset}\n`);
			testsPassed++;

			// Clean up
			await localAPI.collections.event.delete(context, result.document.id);
		} else {
			console.log(`${red}✗${reset} Expected valid document but got validation errors:`);
			result.validation.errors.forEach((e) => {
				console.log(`  ${dim}${e.field}: ${e.errors.join(', ')}${reset}`);
			});
			console.log();
			testsFailed++;
		}
	} catch (error) {
		console.log(
			`${red}✗${reset} Unexpected error: ${error instanceof Error ? error.message : error}\n`
		);
		testsFailed++;
	}

	// Test 6: Create draft then try to publish with invalid datetime
	console.log(`${yellow}Test 6:${reset} Create draft with invalid datetime, then try to publish`);
	try {
		// Create draft
		const result = await localAPI.collections.event.create(context, {
			eventId: 'test-draft-then-publish-' + Date.now(),
			eventDateTime: '02/31/2025 23:59' // Invalid date (Feb 31st)
		});

		console.log(`  ${green}✓${reset} Draft created (ID: ${dim}${result.document.id}${reset})`);
		console.log(
			`  ${yellow}⚠${reset}  Validation errors: ${dim}${result.validation.errors.map((e) => e.field).join(', ')}${reset}`
		);
		console.log(`  ${dim}Stored datetime value: ${result.document.eventDateTime}${reset}`);

		// Try to publish
		try {
			const published = await localAPI.collections.event.publish(context, result.document.id);
			console.log(`${red}✗${reset} Publish should have failed but didn't!`);
			console.log(`  ${dim}Published result:${reset}`, published);
			testsFailed++;

			// Clean up the published document
			await localAPI.collections.event.delete(context, result.document.id);
		} catch (publishError) {
			const message = publishError instanceof Error ? publishError.message : String(publishError);
			console.log(`  ${dim}Publish error:${reset}`, message);

			if (message.includes('validation errors') || message.includes('eventDateTime')) {
				console.log(`  ${green}✓${reset} Publish correctly blocked by validation\n`);
				testsPassed++;

				// Clean up the draft
				await localAPI.collections.event.delete(context, result.document.id);
			} else {
				console.log(`  ${red}✗${reset} Wrong error (expected validation error)\n`);
				testsFailed++;

				// Clean up
				await localAPI.collections.event.delete(context, result.document.id);
			}
		}
	} catch (error) {
		console.log(
			`${red}✗${reset} Unexpected error: ${error instanceof Error ? error.message : error}\n`
		);
		testsFailed++;
	}

	// Test 7: Update draft with invalid datetime (should succeed but return validation errors)
	console.log(`${yellow}Test 7:${reset} Update draft with invalid datetime (should succeed)`);
	try {
		// Create valid draft
		const createResult = await localAPI.collections.event.create(context, {
			eventId: 'test-update-draft-' + Date.now(),
			eventDateTime: '01/15/2025 10:00'
		});

		console.log(`  ${dim}Created valid draft (ID: ${createResult.document.id})${reset}`);

		// Update with invalid datetime
		const updateResult = await localAPI.collections.event.update(
			context,
			createResult.document.id,
			{
				eventDateTime: '99/99/9999 99:99' // Invalid datetime
			}
		);

		if (updateResult && !updateResult.validation.isValid) {
			console.log(
				`${green}✓${reset} Draft updated with invalid datetime (ID: ${dim}${updateResult.document.id}${reset})`
			);
			console.log(`  ${yellow}⚠${reset}  Validation returned errors (as expected):`);
			updateResult.validation.errors.forEach((e) => {
				console.log(`    ${dim}${e.field}: ${e.errors.join(', ')}${reset}`);
			});
			console.log();
			testsPassed++;
		} else {
			console.log(`${red}✗${reset} Expected validation errors but got none\n`);
			testsFailed++;
		}

		// Clean up
		await localAPI.collections.event.delete(context, createResult.document.id);
	} catch (error) {
		console.log(
			`${red}✗${reset} Unexpected error: ${error instanceof Error ? error.message : error}\n`
		);
		testsFailed++;
	}

	// Test 8: Verify UTC storage and conversion
	console.log(`${yellow}Test 8:${reset} Verify UTC storage and timezone handling`);
	try {
		const result = await localAPI.collections.event.create(
			context,
			{
				eventId: 'test-utc-storage-' + Date.now(),
				eventDateTime: '12/25/2025 15:30' // User format (local time)
			},
			{ publish: true }
		);

		const stored = result.document.eventDateTime as string;
		const isUTC = stored.endsWith('Z');
		const hasTimeZone = stored.includes('T');

		if (result.document.id && isUTC && hasTimeZone) {
			console.log(`${green}✓${reset} DateTime correctly stored in UTC format`);
			console.log(`  ${dim}Input: 12/25/2025 15:30${reset}`);
			console.log(`  ${dim}Stored: ${stored}${reset}\n`);
			testsPassed++;

			// Clean up
			await localAPI.collections.event.delete(context, result.document.id);
		} else {
			console.log(`${red}✗${reset} DateTime not stored in UTC format`);
			console.log(`  ${dim}Expected format: YYYY-MM-DDTHH:mm:ssZ${reset}`);
			console.log(`  ${dim}Got: ${stored}${reset}\n`);
			testsFailed++;
		}
	} catch (error) {
		console.log(
			`${red}✗${reset} Unexpected error: ${error instanceof Error ? error.message : error}\n`
		);
		testsFailed++;
	}

	// Summary
	console.log('─'.repeat(60));
	const total = testsPassed + testsFailed;
	const allPassed = testsFailed === 0;

	console.log(
		`\n${allPassed ? green : testsPassed > 0 ? yellow : red}${testsPassed}/${total} tests passed${reset}\n`
	);

	if (allPassed) {
		console.log(`${green}✨ All datetime validation tests passed!${reset}`);
		console.log(`${dim}✓ Automatic validation based on field type${reset}`);
		console.log(`${dim}✓ UTC storage format${reset}`);
		console.log(`${dim}✓ User format conversion${reset}`);
		console.log(`${dim}✓ Draft/publish validation flow${reset}\n`);
	}

	// Close database connection
	await client.end();

	process.exit(allPassed ? 0 : 1);
}

runTests().catch((error) => {
	console.error(`${red}Fatal error:${reset}`, error);
	process.exit(1);
});
