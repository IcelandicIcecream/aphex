// The files `init` writes. Each matches the code in the "Add to an Existing App" guide,
// so a person following the guide by hand and one running init end up with the same app.

import { releaseTag } from '../options.js';

export type Database = 'sqlite' | 'postgres';
export type Storage = 'local' | 's3';
export type Email = 'none' | 'resend';

export interface InitChoices {
	database: Database;
	storage: Storage;
	email: Email;
}

/** A single-quoted TypeScript string literal. */
function quote(value: string): string {
	return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

/** `my-shop` becomes `My Shop`, for the admin's title. */
export function titleFromName(name: string): string {
	const base = name.replace(/^@[^/]+\//, '');
	const words = base.split(/[-_\s.]+/).filter(Boolean);
	if (words.length === 0) return 'My App';
	return words.map((word) => word[0].toUpperCase() + word.slice(1)).join(' ');
}

export function aphexConfig(choices: InitChoices, title: string): string {
	const imports = [
		"import { env } from '$env/dynamic/private';",
		"import { dev } from '$app/environment';",
		"import { createCMSConfig } from '@aphexcms/cms-core/server';",
		"import { aphexAuth } from '@aphexcms/auth';",
		choices.database === 'sqlite'
			? "import { sqliteAdapter } from '@aphexcms/sqlite-adapter';"
			: "import { postgresAdapter } from '@aphexcms/postgresql-adapter';",
		...(choices.storage === 's3' ? ["import { s3Storage } from '@aphexcms/storage-s3';"] : []),
		...(choices.email === 'resend'
			? ["import { resendAdapter } from '@aphexcms/resend-adapter';"]
			: []),
		"import { schemaTypes } from './src/lib/schemaTypes';"
	];

	const fields = [
		'schemaTypes,',
		choices.database === 'sqlite'
			? 'database: sqliteAdapter({ url: env.DATABASE_URL }),'
			: 'database: postgresAdapter({ connectionString: env.DATABASE_URL }),',
		...(choices.storage === 's3'
			? [
					'storage: s3Storage({',
					'\tbucket: env.S3_BUCKET,',
					'\tendpoint: env.S3_ENDPOINT,',
					'\taccessKeyId: env.S3_ACCESS_KEY_ID,',
					'\tsecretAccessKey: env.S3_SECRET_ACCESS_KEY,',
					'\tpublicUrl: env.S3_PUBLIC_URL',
					'}),'
				]
			: []),
		...(choices.email === 'resend'
			? ['email: resendAdapter({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM }),']
			: []),
		'auth: aphexAuth({ secret: env.AUTH_SECRET, baseURL: env.AUTH_URL }),',
		'jobs: { embedded: dev },',
		`customization: { branding: { title: ${quote(title)} } }`
	];

	return `${imports.join('\n')}

export default createCMSConfig({
${fields.map((line) => `\t${line}`).join('\n')}
});
`;
}

export const schemaTypesIndex = `import type { SchemaType } from '@aphexcms/cms-core';

const post: SchemaType = {
	name: 'post',
	type: 'document',
	title: 'Post',
	fields: [
		{ name: 'title', type: 'string', title: 'Title', validation: (Rule) => Rule.required() },
		{ name: 'slug', type: 'slug', title: 'Slug', source: 'title' }
	]
};

export const schemaTypes = [post];
`;

export const adminPageServer = `import { createAdminLoad } from '@aphexcms/cms-core/server';

export const load = createAdminLoad();
`;

export const adminPageSvelte = `<script lang="ts">
	import '@aphexcms/cms-core/admin.css';
	import { AphexStudio } from '@aphexcms/cms-core/client';
	import { aphexClient } from '$lib/aphex.client';

	let { data } = $props();
</script>

<AphexStudio {data} config={aphexClient} />
`;

export const aphexClient = `import type { AphexClientConfig } from '@aphexcms/cms-core/client';
import { adminAuthClient } from '@aphexcms/auth/client';
import { schemaTypes } from '$lib/schemaTypes';

export const aphexClient: AphexClientConfig = {
	schemas: schemaTypes,
	adminAuthClient
};
`;

export const hooksServer = `import { createCMSHook } from '@aphexcms/cms-core/server';
import cmsConfig from '../aphex.config';

export const handle = createCMSHook(cmsConfig);
`;

export const appDts = `import type { CMSInstances, Auth } from '@aphexcms/cms-core/server';
import '@aphexcms/cms-core/app-augment';

declare global {
	namespace App {
		interface Locals {
			aphexCMS: CMSInstances;
			aphexAuth?: Auth;
		}
	}
}

export {};
`;

export const drizzleConfig = `import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	dialect: 'postgresql',
	schema: [
		'./node_modules/@aphexcms/postgresql-adapter/dist/schema.js',
		'./node_modules/@aphexcms/auth/dist/schema/pg.js'
	],
	out: './drizzle'
});
`;

/** `.env` keys, in order, with the value a fresh app should start from. */
export function envEntries(
	choices: InitChoices,
	name: string,
	secret: string
): Array<[string, string]> {
	const database =
		choices.database === 'sqlite'
			? 'file:.aphex/app.db'
			: `postgres://postgres:postgres@localhost:5432/${name.replace(/^@[^/]+\//, '').replace(/[^a-z0-9_]/gi, '_')}`;
	return [
		['DATABASE_URL', database],
		['AUTH_SECRET', secret],
		['AUTH_URL', 'http://localhost:5173'],
		...(choices.storage === 's3'
			? ([
					['S3_BUCKET', ''],
					['S3_ENDPOINT', ''],
					['S3_ACCESS_KEY_ID', ''],
					['S3_SECRET_ACCESS_KEY', ''],
					['S3_PUBLIC_URL', '']
				] as Array<[string, string]>)
			: []),
		...(choices.email === 'resend'
			? ([
					['RESEND_API_KEY', ''],
					['EMAIL_FROM', '']
				] as Array<[string, string]>)
			: [])
	];
}

/** Packages to add, split the way the guide installs them. */
export function packagesFor(choices: InitChoices, needsTailwind: boolean) {
	// Aphex packages come from the tag this create-aphex was published under (see options.ts).
	const aphex = (name: string) => (releaseTag === 'latest' ? name : `${name}@${releaseTag}`);
	const dependencies = [
		aphex('@aphexcms/cms-core'),
		aphex('@aphexcms/auth'),
		'sharp',
		'graphql@16'
	];
	const devDependencies: string[] = [];
	if (choices.database === 'sqlite') {
		// SQLite runs drizzle-kit on boot to update its tables, so production needs it too.
		dependencies.push(aphex('@aphexcms/sqlite-adapter'), 'drizzle-kit');
	} else {
		dependencies.push(aphex('@aphexcms/postgresql-adapter'), 'postgres');
		devDependencies.push('drizzle-kit');
	}
	if (choices.storage === 's3') dependencies.push(aphex('@aphexcms/storage-s3'));
	if (choices.email === 'resend') dependencies.push(aphex('@aphexcms/resend-adapter'));
	if (needsTailwind) devDependencies.push('tailwindcss', '@tailwindcss/vite');
	return { dependencies, devDependencies };
}
