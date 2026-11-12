import type { PublishLabels, SchemaType } from '../types/schemas';

/** The editor's standard publishing words, used wherever a schema doesn't rename one. */
export const DEFAULT_PUBLISH_LABELS: PublishLabels = {
	draft: 'Draft',
	published: 'Published',
	publish: 'Publish',
	publishChanges: 'Publish Changes',
	upToDate: 'Published',
	publishing: 'Publishing...',
	justPublished: 'Published!',
	unpublish: 'Unpublish',
	unpublished: 'Unpublished'
};

/** The publishing words for a schema: its own `publishing.labels` over the defaults. */
export function publishLabelsFor(
	schema: Pick<SchemaType, 'publishing'> | null | undefined
): PublishLabels {
	return { ...DEFAULT_PUBLISH_LABELS, ...schema?.publishing?.labels };
}

/** Whether the editor shows only save status for this schema, rather than publishing controls. */
export function showsSaveStatusOnly(
	schema: Pick<SchemaType, 'publishing'> | null | undefined
): boolean {
	return schema?.publishing?.controls === 'status';
}
