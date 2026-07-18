// local-api/hooks.ts
//
// Runner for schema lifecycle hooks. Currently the only phase is `beforeValidate`
// (normalization/transform). Hooks are for transforming data — rejection and
// cross-field invariants belong in `validation: (Rule) => Rule.custom(...)`, which
// already sees the whole document.

import type { DocumentHook, DocumentHookArgs } from '../types/schemas';

/**
 * Run a phase of document hooks in order, threading the (possibly transformed)
 * data through each. Returns the final data. A hook that throws aborts the write.
 */
export async function runDocumentHooks(
	hooks: DocumentHook[] | undefined,
	args: DocumentHookArgs
): Promise<Record<string, unknown>> {
	if (!hooks?.length) return args.data;
	let data = args.data;
	for (const hook of hooks) {
		data = await hook({ ...args, data });
	}
	return data;
}
