// A small fixed-window rate limiter for the unauthenticated endpoints cms-core exposes.
//
// Why this exists at all: the auth provider rate-limits its *own* HTTP endpoints, but the
// CMS facades (`POST /api/user/request-password-reset`, `/reset-password`) call the provider
// server-side. Better Auth's limiter — like its other request-shaped guards — only engages
// for calls that arrived over HTTP with a `ctx.request`, so an in-process call sails past it.
// The facades were therefore completely unthrottled: an email-sending endpoint and a
// token-checking endpoint, both reachable by anyone.
//
// Scope, stated plainly: this is per-process memory. Behind N app instances the effective
// limit is N× what's configured, and a restart forgets every window. That is a real
// weakening, and a deployment that needs a hard guarantee should put a limiter in front of
// the app or back this with the shared cache. It is still worth having — it turns "unlimited"
// into "bounded per instance", which is the difference between an email bomb and a nuisance.

/** One caller's window: when it started and how many requests have landed in it. */
type Window = { startedAt: number; count: number };

export interface RateLimitRule {
	/** Window length in milliseconds. */
	windowMs: number;
	/** Requests allowed per window. */
	max: number;
}

export interface RateLimitResult {
	allowed: boolean;
	/** Seconds until the current window rolls over — for a `Retry-After` header. */
	retryAfterSeconds: number;
}

/**
 * A named bucket of windows.
 *
 * Entries are swept lazily on write rather than on a timer: an interval would keep a
 * reference alive for the process's whole life (and in a test run, past the end of the
 * suite), and the map only grows when requests are arriving anyway.
 */
export class RateLimiter {
	private windows = new Map<string, Window>();
	private lastSweep = 0;

	constructor(private rule: RateLimitRule) {}

	/** Count one request against `key`, and say whether it may proceed. */
	check(key: string): RateLimitResult {
		const now = Date.now();
		this.sweep(now);

		const existing = this.windows.get(key);
		if (!existing || now - existing.startedAt >= this.rule.windowMs) {
			this.windows.set(key, { startedAt: now, count: 1 });
			return { allowed: true, retryAfterSeconds: 0 };
		}

		existing.count += 1;
		if (existing.count <= this.rule.max) {
			return { allowed: true, retryAfterSeconds: 0 };
		}
		const remaining = this.rule.windowMs - (now - existing.startedAt);
		return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(remaining / 1000)) };
	}

	/** Drop windows that have already rolled over. Runs at most once per window length. */
	private sweep(now: number): void {
		if (now - this.lastSweep < this.rule.windowMs) return;
		this.lastSweep = now;
		for (const [key, window] of this.windows) {
			if (now - window.startedAt >= this.rule.windowMs) this.windows.delete(key);
		}
	}
}

/**
 * Best-effort client address for rate-limit keying.
 *
 * `x-forwarded-for` is caller-supplied and trivially spoofed unless a trusted proxy sets it,
 * so an IP bucket alone is not a control — it's the half that stops casual abuse. Pair it
 * with a bucket on something the attacker can't rotate freely (the target email address) so
 * the limit still bites when the address is forged.
 */
export function clientAddress(headers: Headers): string {
	const forwarded = headers.get('x-forwarded-for');
	// Left-most entry is the original client; the rest are proxies that appended themselves.
	if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
	return headers.get('x-real-ip')?.trim() || 'unknown';
}
