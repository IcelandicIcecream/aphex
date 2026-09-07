import type { CMSInstances, LocalAPIContext } from '@aphexcms/cms-core/server';
import type {
	FormDocument as PluginFormDocument,
	FormFieldValue as PluginFormFieldValue
} from '@aphexcms/plugin-forms';
import type { FormFieldValue, PublicFormDTO } from '$lib/blocks/types';
import { isResolvedRef } from '$lib/utils/reference';

/**
 * Populating the form block.
 *
 * A `formBlock` names which form to show; rendering one needs the form's actual
 * fields, its submit label and its confirmation behaviour. `resolveReferences`
 * turns the reference into a `ResolvedRef` — enough to link to a document, not
 * enough to draw a form — so this runs afterwards during the page load and
 * attaches a deliberately small public projection as `_form`.
 *
 * Same shape as `loadArchiveBlocks`, and for the same reason: the component stays
 * a pure renderer, and the page server-renders in one pass instead of fetching
 * the form from the browser after paint.
 *
 * The leading underscore marks `_form` as derived-at-load rather than authored.
 */

interface FormBlock {
	_type?: string;
	form?: unknown;
	_form?: PublicFormDTO | null;
	[key: string]: unknown;
}

interface LoadedFormDocument extends PluginFormDocument {
	_meta?: { publishedHash?: string | null; status?: string | null };
}

/** Copy only renderer-safe field properties; never trust a document-shaped spread here. */
function projectField(field: PluginFormFieldValue): FormFieldValue {
	return {
		_type: field._type,
		_key: field._key,
		name: field.name,
		label: field.label,
		required: field.required,
		width: field.width,
		placeholder: field.placeholder,
		defaultValue: field.defaultValue,
		rows: field.rows,
		min: field.min,
		max: field.max,
		options: field.options?.map((option) => ({ label: option.label, value: option.value })),
		message: field.message as FormFieldValue['message']
	};
}

export function toPublicForm(doc: LoadedFormDocument): PublicFormDTO | null {
	const version = doc._meta?.publishedHash;
	if (!version || doc._meta?.status !== 'published') return null;
	const confirmationType = doc.confirmationType ?? 'message';

	return {
		id: doc.id,
		fields: (doc.fields ?? []).map(projectField),
		submitButtonLabel: doc.submitButtonLabel,
		confirmationType,
		...(confirmationType === 'redirect'
			? { redirectUrl: doc.redirectUrl }
			: { confirmationMessage: doc.confirmationMessage as PublicFormDTO['confirmationMessage'] }),
		version
	};
}

export async function loadFormBlocks(
	services: CMSInstances,
	context: LocalAPIContext,
	blocks: unknown
): Promise<void> {
	if (!Array.isArray(blocks)) return;

	const formBlocks = blocks.filter(
		(block): block is FormBlock =>
			!!block && typeof block === 'object' && (block as FormBlock)._type === 'formBlock'
	);
	if (formBlocks.length === 0) return;

	/*
	 * Reached by name rather than through `collections.form`: the `form`
	 * collection comes from `@aphexcms/plugin-forms`, so it isn't in the app's
	 * generated collection map. If the plugin isn't registered this is undefined,
	 * and every block simply renders its placeholder instead of throwing.
	 */
	const forms = services.localAPI.getCollection<LoadedFormDocument>('form');
	if (!forms) return;

	// One fetch per distinct form: the same form embedded twice on a page — a
	// newsletter signup at the top and bottom, say — should cost one read.
	const ids = [
		...new Set(
			formBlocks
				.map((block) => (isResolvedRef(block.form) ? block.form.id : null))
				.filter((id): id is string => !!id)
		)
	];

	const loaded = new Map<string, PublicFormDTO>();
	await Promise.all(
		ids.map(async (id) => {
			// Published perspective explicitly: the submit endpoint only accepts
			// published forms, so rendering a draft would produce a form that looks
			// live and is rejected on submit.
			const doc = await forms
				.findByID(context, id, {
					perspective: 'published',
					select: [
						'fields',
						'submitButtonLabel',
						'confirmationType',
						'confirmationMessage',
						'redirectUrl'
					]
				})
				.catch(() => null);
			const publicForm = doc ? toPublicForm(doc) : null;
			if (publicForm) loaded.set(id, publicForm);
		})
	);

	for (const block of formBlocks) {
		block._form = isResolvedRef(block.form) ? (loaded.get(block.form.id) ?? null) : null;
	}
}
