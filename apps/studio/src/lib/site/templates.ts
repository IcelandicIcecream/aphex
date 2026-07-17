import BrutalistLedgerShell from './templates/BrutalistLedgerShell.svelte';
import EditorialJournalShell from './templates/EditorialJournalShell.svelte';
import MinimalIndexShell from './templates/MinimalIndexShell.svelte';

export const SITE_TEMPLATES = [
	{
		id: 'editorial-journal',
		name: 'Editorial Journal',
		description: 'A story-led publication with an expansive editorial shell.',
		component: EditorialJournalShell
	},
	{
		id: 'minimal-index',
		name: 'Minimal Index',
		description: 'A compact index with a fixed site rail and utility navigation.',
		component: MinimalIndexShell
	},
	{
		id: 'brutalist-ledger',
		name: 'Brutalist Ledger',
		description: 'A high-contrast, grid-led shell with assertive utility navigation.',
		component: BrutalistLedgerShell
	}
] as const;

export type SiteTemplateId = (typeof SITE_TEMPLATES)[number]['id'];

const templateById = new Map(SITE_TEMPLATES.map((template) => [template.id, template]));

/** Resolve untrusted CMS data to a compiled, supported public template. */
export function resolveSiteTemplate(value: unknown) {
	return templateById.get(value as SiteTemplateId) ?? SITE_TEMPLATES[0];
}
