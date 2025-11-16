/**
 * Local API URL Validation Test
 * Tests the URL validation flow where:
 * - Drafts are validated but save anyway (with validation results)
 * - Publish attempts are validated and blocked if invalid
 * - URLs support scheme restrictions, relative URLs, and relativeOnly options
 *
 * Run with: pnpm tsx scripts/test-url-localapi.ts
 */

import { createLocalAPI } from '@aphexcms/cms-core/server';
import { createPostgreSQLProvider } from '@aphexcms/postgresql-adapter';
import postgres from 'postgres';
import { loadEnv } from 'vite';
import type { SchemaType } from '@aphexcms/cms-core/types/schemas';

// Load environment variables
const env = loadEnv('development', process.cwd(), '');

// Test schema with different URL field configurations
const testSchema: SchemaType = {
	type: 'document',
	name: 'website',
	title: 'Website',
	description: 'Test schema for URL validation',
	fields: [
		{
			name: 'websiteId',
			type: 'string',
			title: 'Website ID',
			validation: (Rule) => Rule.required()
		},
		{
			name: 'homepage',
			type: 'url',
			title: 'Homepage URL',
			placeholder: 'https://example.com'
			// Default: only http/https, no relative URLs
		},
		{
			name: 'contactLink',
			type: 'url',
			title: 'Contact Link',
			placeholder: 'mailto:contact@example.com',
			validation: (Rule) =>
				Rule.uri({
					scheme: [/^https?$/, /^mailto$/, /^tel$/]
				})
		},
		{
			name: 'internalLink',
			type: 'url',
			title: 'Internal Link',
			placeholder: '/about',
			validation: (Rule) =>
				Rule.uri({
					allowRelative: true
				})
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
	console.log(`\n${blue}🔗 Testing URL Validation with Local API${reset}\n`);

	// Setup database adapter
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

	// Test 1: Create draft with invalid URL (not a URL at all)
	console.log(`${yellow}Test 1:${reset} Create draft with invalid URL (not-a-url)`);
	try {
		const result = await localAPI.collections.website.create(context, {
			websiteId: 'test-invalid-url-' + Date.now(),
			homepage: 'not-a-url'
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
			await localAPI.collections.website.delete(context, result.document.id);
		} else {
			console.log(`${red}✗${reset} Expected validation errors but got none\n`);
			testsFailed++;
		}
	} catch (error) {
		console.log(`${red}✗${reset} Unexpected error: ${error instanceof Error ? error.message : error}\n`);
		testsFailed++;
	}

	// Test 2: Create draft with relative URL in absolute-only field
	console.log(`${yellow}Test 2:${reset} Create draft with relative URL in absolute-only field (/about)`);
	try {
		const result = await localAPI.collections.website.create(context, {
			websiteId: 'test-relative-in-absolute-' + Date.now(),
			homepage: '/about' // Should fail - homepage doesn't allow relative
		});

		if (result.document.id && !result.validation.isValid) {
			console.log(`${green}✓${reset} Draft created with ID: ${dim}${result.document.id}${reset}`);
			console.log(`  ${yellow}⚠${reset}  Validation correctly rejected relative URL:`);
			result.validation.errors.forEach((e) => {
				console.log(`    ${dim}${e.field}: ${e.errors.join(', ')}${reset}`);
			});
			console.log();
			testsPassed++;

			// Clean up
			await localAPI.collections.website.delete(context, result.document.id);
		} else {
			console.log(`${red}✗${reset} Expected validation errors but got none\n`);
			testsFailed++;
		}
	} catch (error) {
		console.log(`${red}✗${reset} Unexpected error: ${error instanceof Error ? error.message : error}\n`);
		testsFailed++;
	}

	// Test 3: Create + publish with valid HTTPS URL
	console.log(`${yellow}Test 3:${reset} Create + publish with valid HTTPS URL (https://example.com)`);
	try {
		const result = await localAPI.collections.website.create(
			context,
			{
				websiteId: 'test-valid-https-' + Date.now(),
				homepage: 'https://example.com'
			},
			{ publish: true }
		);

		if (result.document.id && result.validation.isValid) {
			console.log(`${green}✓${reset} Published successfully (ID: ${dim}${result.document.id}${reset})`);
			console.log(`  ${green}✓${reset} Validation passed`);
			console.log(`  ${dim}Stored URL: ${result.document.homepage}${reset}\n`);
			testsPassed++;

			// Clean up
			await localAPI.collections.website.delete(context, result.document.id);
		} else {
			console.log(`${red}✗${reset} Expected valid document but got validation errors:`);
			result.validation.errors.forEach((e) => {
				console.log(`  ${dim}${e.field}: ${e.errors.join(', ')}${reset}`);
			});
			console.log();
			testsFailed++;
		}
	} catch (error) {
		console.log(`${red}✗${reset} Unexpected error: ${error instanceof Error ? error.message : error}\n`);
		testsFailed++;
	}

	// Test 4: Test mailto scheme support
	console.log(`${yellow}Test 4:${reset} Create + publish with mailto URL (mailto:test@example.com)`);
	try {
		const result = await localAPI.collections.website.create(
			context,
			{
				websiteId: 'test-mailto-' + Date.now(),
				contactLink: 'mailto:test@example.com'
			},
			{ publish: true }
		);

		if (result.document.id && result.validation.isValid) {
			console.log(`${green}✓${reset} Published successfully (ID: ${dim}${result.document.id}${reset})`);
			console.log(`  ${green}✓${reset} mailto scheme accepted`);
			console.log(`  ${dim}Stored URL: ${result.document.contactLink}${reset}\n`);
			testsPassed++;

			// Clean up
			await localAPI.collections.website.delete(context, result.document.id);
		} else {
			console.log(`${red}✗${reset} Expected valid document but got validation errors:`);
			result.validation.errors.forEach((e) => {
				console.log(`  ${dim}${e.field}: ${e.errors.join(', ')}${reset}`);
			});
			console.log();
			testsFailed++;
		}
	} catch (error) {
		console.log(`${red}✗${reset} Unexpected error: ${error instanceof Error ? error.message : error}\n`);
		testsFailed++;
	}

	// Test 5: Test tel scheme support
	console.log(`${yellow}Test 5:${reset} Create + publish with tel URL (tel:+1234567890)`);
	try {
		const result = await localAPI.collections.website.create(
			context,
			{
				websiteId: 'test-tel-' + Date.now(),
				contactLink: 'tel:+1234567890'
			},
			{ publish: true }
		);

		if (result.document.id && result.validation.isValid) {
			console.log(`${green}✓${reset} Published successfully (ID: ${dim}${result.document.id}${reset})`);
			console.log(`  ${green}✓${reset} tel scheme accepted`);
			console.log(`  ${dim}Stored URL: ${result.document.contactLink}${reset}\n`);
			testsPassed++;

			// Clean up
			await localAPI.collections.website.delete(context, result.document.id);
		} else {
			console.log(`${red}✗${reset} Expected valid document but got validation errors:`);
			result.validation.errors.forEach((e) => {
				console.log(`  ${dim}${e.field}: ${e.errors.join(', ')}${reset}`);
			});
			console.log();
			testsFailed++;
		}
	} catch (error) {
		console.log(`${red}✗${reset} Unexpected error: ${error instanceof Error ? error.message : error}\n`);
		testsFailed++;
	}

	// Test 6: Test invalid scheme (ftp in mailto/tel field)
	console.log(`${yellow}Test 6:${reset} Create draft with invalid scheme (ftp:// in mailto/tel field)`);
	try {
		const result = await localAPI.collections.website.create(context, {
			websiteId: 'test-invalid-scheme-' + Date.now(),
			contactLink: 'ftp://files.example.com' // ftp not in allowed schemes
		});

		if (result.document.id && !result.validation.isValid) {
			console.log(`${green}✓${reset} Draft created with ID: ${dim}${result.document.id}${reset}`);
			console.log(`  ${yellow}⚠${reset}  Validation correctly rejected ftp scheme:`);
			result.validation.errors.forEach((e) => {
				console.log(`    ${dim}${e.field}: ${e.errors.join(', ')}${reset}`);
			});
			console.log();
			testsPassed++;

			// Clean up
			await localAPI.collections.website.delete(context, result.document.id);
		} else {
			console.log(`${red}✗${reset} Expected validation errors but got none\n`);
			testsFailed++;
		}
	} catch (error) {
		console.log(`${red}✗${reset} Unexpected error: ${error instanceof Error ? error.message : error}\n`);
		testsFailed++;
	}

	// Test 7: Test allowRelative option
	console.log(`${yellow}Test 7:${reset} Create + publish with relative URL in allowRelative field (/about)`);
	try {
		const result = await localAPI.collections.website.create(
			context,
			{
				websiteId: 'test-allow-relative-' + Date.now(),
				internalLink: '/about/team' // relative URL allowed
			},
			{ publish: true }
		);

		if (result.document.id && result.validation.isValid) {
			console.log(`${green}✓${reset} Published successfully (ID: ${dim}${result.document.id}${reset})`);
			console.log(`  ${green}✓${reset} Relative URL accepted`);
			console.log(`  ${dim}Stored URL: ${result.document.internalLink}${reset}\n`);
			testsPassed++;

			// Clean up
			await localAPI.collections.website.delete(context, result.document.id);
		} else {
			console.log(`${red}✗${reset} Expected valid document but got validation errors:`);
			result.validation.errors.forEach((e) => {
				console.log(`  ${dim}${e.field}: ${e.errors.join(', ')}${reset}`);
			});
			console.log();
			testsFailed++;
		}
	} catch (error) {
		console.log(`${red}✗${reset} Unexpected error: ${error instanceof Error ? error.message : error}\n`);
		testsFailed++;
	}

	// Test 8: Test empty URL (optional field)
	console.log(`${yellow}Test 8:${reset} Create + publish with empty URL (optional field)`);
	try {
		const result = await localAPI.collections.website.create(
			context,
			{
				websiteId: 'test-empty-url-' + Date.now(),
				homepage: '' // Empty should be valid (not required)
			},
			{ publish: true }
		);

		if (result.document.id && result.validation.isValid) {
			console.log(`${green}✓${reset} Published successfully (ID: ${dim}${result.document.id}${reset})`);
			console.log(`  ${green}✓${reset} Empty URL accepted for optional field\n`);
			testsPassed++;

			// Clean up
			await localAPI.collections.website.delete(context, result.document.id);
		} else {
			console.log(`${red}✗${reset} Expected valid document but got validation errors:`);
			result.validation.errors.forEach((e) => {
				console.log(`  ${dim}${e.field}: ${e.errors.join(', ')}${reset}`);
			});
			console.log();
			testsFailed++;
		}
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

	if (allPassed) {
		console.log(`${green}✨ All URL validation tests passed!${reset}`);
		console.log(`${dim}✓ Automatic validation based on field type${reset}`);
		console.log(`${dim}✓ Scheme restrictions (http, https, mailto, tel)${reset}`);
		console.log(`${dim}✓ Relative URL support (allowRelative)${reset}`);
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
