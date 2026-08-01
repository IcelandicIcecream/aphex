import {
	installChunkLoadRecovery,
	handleChunkLoadClientError
} from '@aphexcms/cms-core/chunk-recovery';
import type { HandleClientError } from '@sveltejs/kit';

// Masks a transient CDN/proxy hiccup (a dropped connection to the origin, or a stale cached
// HTML referencing a since-replaced chunk hash) by reloading once instead of leaving the page
// rendered but unresponsive. See chunk-recovery.ts for the full rationale.
installChunkLoadRecovery();

// Covers a failed client-side navigation (clicking a link to a lazily-loaded route) —
// SvelteKit's router catches that failure internally and routes it here rather than letting it
// surface as a global error, so installChunkLoadRecovery()'s window listeners never see it.
export const handleError: HandleClientError = ({ error }) => {
	handleChunkLoadClientError(error);
	console.error(error);
};
