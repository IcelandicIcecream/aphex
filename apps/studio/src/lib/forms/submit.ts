// The transport-agnostic submission core — the one function every transport bottoms out at
// (Slice 0 has just the `endpoint` transport; `remote` wraps this same function later).
//
// It validates against the form's own fields (the CMS engine), then emits `form.submitted`.
// Durable submission storage (a dedicated table) is Slice 1 — for now the event carries the
// ids and the reaction path is what we're proving. Uses the GLOBAL Web Crypto `crypto` (not
// `node:crypto`) so this module stays client-safe and can live in the plugins registry.
import { validateFormData, type FormDefinition } from '@aphexcms/cms-core';
import type { DatabaseAdapter } from '@aphexcms/cms-core/server';
import type { Logger } from '@aphexcms/cms-core';
import { formSubmitted } from './events';

export interface SubmitContext {
	organizationId: string;
	databaseAdapter: DatabaseAdapter;
	logger: Logger;
}

export type SubmitResult =
	| { ok: true; submissionId: string }
	| { ok: false; errors: Array<{ field: string; errors: string[] }> };

/**
 * Validate a raw submission against `form`, then emit `form.submitted`. Returns field-keyed
 * errors on invalid input (no event emitted), or the new submission id on success.
 */
export async function submitForm(
	ctx: SubmitContext,
	form: FormDefinition,
	rawData: Record<string, unknown>
): Promise<SubmitResult> {
	// Transform BEFORE validation — normalize the raw input (trim, lowercase email) the one way
	// validation can't. The form owns this (its plugin-level `beforeValidate` equivalent); default
	// is identity when no `transform` is declared.
	const transformed = form.transform ? form.transform(rawData) : rawData;

	const validation = await validateFormData(form, transformed);
	if (!validation.isValid) {
		return { ok: false, errors: validation.errors };
	}

	const submissionId = crypto.randomUUID();
	const shouldStore = form.store !== false;

	// Store the submission AND emit the fact in one transaction, so a stored submission always
	// has its event and vice versa. `store: false` skips persistence (the "just email me" form)
	// but still emits — so notification consumers run either way. Persistence uses the generic
	// plugin-storage primitive: a submission is a record under (plugin:'forms', collection:formId).
	await ctx.databaseAdapter.withTransaction(async (tx) => {
		if (shouldStore) {
			await tx.createPluginRecord({
				id: submissionId,
				organizationId: ctx.organizationId,
				plugin: 'forms',
				collection: form.id,
				data: validation.normalizedData
			});
		}
		await tx.appendEvent({
			organizationId: ctx.organizationId,
			type: formSubmitted.type,
			payload: formSubmitted.parse({ formId: form.id, submissionId })
		});
	});

	ctx.logger.info(
		`[forms] accepted submission ${submissionId} for "${form.id}" (stored=${shouldStore})`
	);
	return { ok: true, submissionId };
}
