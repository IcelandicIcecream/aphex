/**
 * `aphex migrate` — apply the committed Drizzle migrations to the database.
 *
 * Self-contained on purpose: it does NOT load `aphex.config.ts` (that imports SvelteKit
 * virtual modules like `$env/dynamic/private` which only resolve inside Vite). Instead it reads
 * the connection from the environment — exactly like `drizzle.config.ts` — and runs the drizzle
 * runtime migrator (`drizzle-orm`, a runtime dependency), so it works inside a pruned production
 * image where `drizzle-kit` (a devDependency) isn't present. That's the bug it fixes, and it's
 * what the container entrypoint runs (`aphex migrate && node build`).
 *
 * Driver selection:
 * - Postgres (default) when `DATABASE_URL` or `PG_*` vars are set.
 * - SQLite (libsql) when `APHEX_DATABASE=sqlite` or `DATABASE_URL` is a `file:`/`libsql:` URL
 *   (the @aphexcms/sqlite-adapter path).
 * - pglite when `APHEX_DATABASE=pglite` (or no Postgres conn is configured but `APHEX_PGLITE_DIR`
 *   is). Migrations run as the default role — RLS policies are created here; tenant enforcement
 *   (the non-superuser `SET ROLE`) is a runtime concern of the adapter, not migration.
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';

/** Import a package from the *consuming app's* node_modules (cwd), not cms-core's. */
async function appImport(spec: string): Promise<Record<string, unknown>> {
	const appRequire = createRequire(pathToFileURL(resolve(process.cwd(), 'package.json')).href);
	return import(pathToFileURL(appRequire.resolve(spec)).href);
}

/** Build a Postgres connection string from env, mirroring `drizzle.config.ts`. Null if none set. */
function postgresUrlFromEnv(): string | null {
	if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
	const { PG_HOST, PG_PORT, PG_USER, PG_PASSWORD, PG_DATABASE } = process.env;
	if (PG_HOST || PG_USER || PG_DATABASE) {
		return `postgresql://${PG_USER || 'root'}:${PG_PASSWORD || 'mysecretpassword'}@${PG_HOST || 'localhost'}:${PG_PORT || '5432'}/${PG_DATABASE || 'local'}`;
	}
	return null;
}

export interface MigrateOptions {
	/** Folder holding the generated `.sql` migrations + `meta/`. Default `./drizzle`. */
	migrationsFolder?: string;
}

export interface MigrateResult {
	driver: 'postgresql' | 'pglite' | 'sqlite';
	target: string;
}

export async function runMigrations(options: MigrateOptions = {}): Promise<MigrateResult> {
	// Load `.env` from the project root if present, so `aphex migrate` picks up DATABASE_URL in
	// local dev (the CLI isn't run through Vite/SvelteKit). In production the env is provided by
	// the container/host, so the missing file is fine.
	if (typeof process.loadEnvFile === 'function') {
		try {
			process.loadEnvFile(resolve(process.cwd(), '.env'));
		} catch {
			// no .env — env vars come from the environment
		}
	}

	const migrationsFolder = resolve(process.cwd(), options.migrationsFolder ?? './drizzle');
	const rawDbUrl = process.env.DATABASE_URL;
	const useSqlite =
		process.env.APHEX_DATABASE?.toLowerCase() === 'sqlite' ||
		/^(file:|libsql:)/.test(rawDbUrl ?? '');

	if (useSqlite) {
		const url = rawDbUrl && /^(file:|libsql:)/.test(rawDbUrl) ? rawDbUrl : 'file:.aphex/data.db';
		// libsql only creates the leaf file, not parent dirs — ensure the path exists for file: URLs.
		if (url.startsWith('file:') && !url.startsWith('file::memory:')) {
			const filePath = resolve(process.cwd(), url.slice('file:'.length));
			mkdirSync(dirname(filePath), { recursive: true });
		}
		const { createClient } = (await appImport('@libsql/client')) as {
			createClient: (cfg: { url: string; authToken?: string }) => { close(): void };
		};
		const { drizzle } = (await appImport('drizzle-orm/libsql')) as {
			drizzle: (client: unknown) => unknown;
		};
		const { migrate } = (await appImport('drizzle-orm/libsql/migrator')) as {
			migrate: (db: unknown, cfg: { migrationsFolder: string }) => Promise<void>;
		};
		const client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
		try {
			await migrate(drizzle(client), { migrationsFolder });
		} finally {
			client.close();
		}
		const safe = url.replace(/authToken=[^&]+/, 'authToken=***');
		return { driver: 'sqlite', target: safe };
	}

	const pgUrl = postgresUrlFromEnv();
	const pgliteDir = process.env.APHEX_PGLITE_DIR;
	const usePglite =
		process.env.APHEX_DATABASE?.toLowerCase() === 'pglite' || (!pgUrl && !!pgliteDir);

	if (usePglite) {
		const dir = resolve(process.cwd(), pgliteDir ?? '.aphex/pgdata');
		// pglite only creates the leaf dir, not parents — ensure the full path exists first.
		mkdirSync(dir, { recursive: true });
		const { PGlite } = (await appImport('@electric-sql/pglite')) as {
			PGlite: new (dir: string) => { close(): Promise<void> };
		};
		const { drizzle } = (await appImport('drizzle-orm/pglite')) as {
			drizzle: (client: unknown) => unknown;
		};
		const { migrate } = (await appImport('drizzle-orm/pglite/migrator')) as {
			migrate: (db: unknown, cfg: { migrationsFolder: string }) => Promise<void>;
		};
		const client = new PGlite(dir);
		await migrate(drizzle(client), { migrationsFolder });
		await client.close();
		return { driver: 'pglite', target: dir };
	}

	if (!pgUrl) {
		throw new Error(
			'No database configured. Set DATABASE_URL (or PG_HOST/PG_USER/PG_DATABASE), APHEX_DATABASE=sqlite (with a file:/libsql: DATABASE_URL), or APHEX_DATABASE=pglite (with optional APHEX_PGLITE_DIR).'
		);
	}

	const { default: postgres } = (await appImport('postgres')) as {
		default: (url: string, opts?: Record<string, unknown>) => { end: () => Promise<void> };
	};
	const { drizzle } = (await appImport('drizzle-orm/postgres-js')) as {
		drizzle: (client: unknown) => unknown;
	};
	const { migrate } = (await appImport('drizzle-orm/postgres-js/migrator')) as {
		migrate: (db: unknown, cfg: { migrationsFolder: string }) => Promise<void>;
	};
	const sql = postgres(pgUrl, { max: 1 });
	try {
		await migrate(drizzle(sql), { migrationsFolder });
	} finally {
		await sql.end();
	}
	const safe = pgUrl.replace(/:\/\/([^:]+):[^@]+@/, '://$1:***@');
	return { driver: 'postgresql', target: safe };
}
