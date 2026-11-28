// How fast one caller may use the API and MCP: per API key, per connected app, per
// signed-in person. Every caller is already signed in and bound to one site, so this
// isn't about strangers. It bounds a runaway agent (an AI stuck in a loop), a leaked
// key used at full speed, and the expensive calls (an upload makes the server fetch,
// scan and resize a file), so one caller can't slow every other site on the instance.
//
// Per process, like `RateLimiter`: behind N instances the real limit is N times this.
// A limit in front of the app (Cloudflare) is the hard ceiling; this is the fair share.
import type { Auth } from '../../types/auth';
import { RateLimiter } from './rate-limit';

/** What a call costs: reading, changing content, or uploading a file. */
export type CallKind = 'read' | 'write' | 'upload';

/** Calls a minute, by kind. */
export type CallLimits = Record<CallKind, number>;

export interface CallerLimitsConfig {
	/** API keys and connected apps (Claude, ChatGPT, scripts). */
	agent?: Partial<CallLimits>;
	/** People signed in to the admin, whose editor autosaves as they type. */
	session?: Partial<CallLimits>;
}

/** Generous for a person or an agent at work, tight enough to stop a loop within a minute. */
export const DEFAULT_CALLER_LIMITS: Required<Record<keyof CallerLimitsConfig, CallLimits>> = {
	agent: { read: 120, write: 60, upload: 10 },
	session: { read: 600, write: 240, upload: 60 }
};

const WINDOW_MS = 60_000;

export interface CallerLimitResult {
	allowed: boolean;
	/** Seconds until the caller may try again, for `Retry-After`. */
	retryAfterSeconds: number;
	kind: CallKind;
}

/**
 * One instance's counters. Limiters are made per limit value, so an app changing its
 * config (schema hot reload) gets fresh ones rather than counting against stale rules.
 */
export class CallerLimits {
	private limiters = new Map<string, RateLimiter>();

	/** Count one call by `auth`, or say how long it must wait. `config === false` turns it off. */
	check(
		auth: Auth,
		kind: CallKind,
		config: CallerLimitsConfig | false | undefined
	): CallerLimitResult {
		if (config === false) return { allowed: true, retryAfterSeconds: 0, kind };
		const who = callerOf(auth);
		const max = config?.[who.group]?.[kind] ?? DEFAULT_CALLER_LIMITS[who.group][kind];
		const name = `${kind}:${max}`;
		let limiter = this.limiters.get(name);
		if (!limiter) {
			limiter = new RateLimiter({ windowMs: WINDOW_MS, max });
			this.limiters.set(name, limiter);
		}
		const { allowed, retryAfterSeconds } = limiter.check(who.key);
		return { allowed, retryAfterSeconds, kind };
	}
}

/** The one shared set of counters for this process. */
export const callerLimits = new CallerLimits();

/** Who is counted: a key or connected app on its site, or a person on theirs. */
function callerOf(auth: Auth): { group: keyof CallerLimitsConfig; key: string } {
	if (auth.type === 'api_key') {
		return { group: 'agent', key: `${auth.organizationId}:${auth.keyId}` };
	}
	const site = auth.type === 'session' ? auth.organizationId : 'none';
	return { group: 'session', key: `${site}:user:${auth.user.id}` };
}

/**
 * What an `/api` request costs. Reads are GET and HEAD (and the query endpoints, which
 * POST only to carry a filter); uploads are a new asset's POST; the rest change
 * something.
 */
export function apiCallKind(method: string, path: string): CallKind {
	const upper = method.toUpperCase();
	if (upper === 'GET' || upper === 'HEAD' || upper === 'OPTIONS') return 'read';
	if (/\/(query|graphql)$/.test(path)) return 'read';
	// A direct upload is two calls (a URL, then a confirm): count the first.
	if (upper === 'POST' && /\/assets(\/upload-url)?\/?$/.test(path)) return 'upload';
	return 'write';
}

/** The words an agent reads when it's over: plain, with how long to wait, so it backs off. */
export function tooManyCallsMessage(result: CallerLimitResult): string {
	const what =
		result.kind === 'upload' ? 'uploads' : result.kind === 'write' ? 'changes' : 'requests';
	return `Too many ${what} at once. Wait ${result.retryAfterSeconds} seconds, then try again.`;
}
