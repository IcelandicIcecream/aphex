import type { SchemaType } from '../types/schemas';
import type { SidebarNavGroup } from '../types/sidebar';
import { pluralize } from '../utils/pluralize';
import { hasRequiredCapabilities } from '../schema-utils/required-capabilities';

/**
 * The document types as sidebar groups, for `sidebar.types`: the same list the
 * types panel shows, so an app's sidebar can carry it and new types appear
 * without anyone editing a nav list.
 *
 * One group per schema `group`, in the order the schemas are declared (a group
 * sits where its first type does); ungrouped types form an unlabelled group.
 * A collection is labelled by its plural title and opens its list; a singleton
 * keeps its title and opens its editor.
 *
 * Read access is filtered as the types panel does: an `access.read` role list
 * hides the type from other roles; a function can't be judged here and is shown,
 * the server deciding. A type whose `requiredCapabilities` the organization
 * lacks is left out, as the server refuses it.
 */
export function typeNavGroups(
	schemas: SchemaType[],
	role: string | null,
	capabilities: readonly string[]
): SidebarNavGroup[] {
	const groups = new Map<string | null, SidebarNavGroup>();
	for (const schema of schemas) {
		if (schema.type !== 'document') continue;
		if (!hasRequiredCapabilities(schema, capabilities)) continue;
		const readList = schema.access?.read;
		if (Array.isArray(readList) && (role === null || !readList.includes(role))) continue;

		const key = schema.group ?? null;
		if (!groups.has(key)) {
			groups.set(key, {
				id: key ? `types:${key}` : 'types',
				label: key ?? undefined,
				items: []
			});
		}
		const title = schema.title ?? schema.name;
		groups.get(key)!.items!.push({
			href: `/admin?docType=${encodeURIComponent(schema.name)}`,
			// "Invoice settings" is plural already.
			label: schema.singleton || /s$/i.test(title) ? title : pluralize(title),
			icon: schema.icon
		});
	}
	return [...groups.values()];
}

/**
 * Where the type groups go: in place of a `{ id: 'types' }` group the app put in
 * `navGroups`, or else straight after its first group (Home or Dashboard).
 */
export function withTypeGroups(
	appGroups: SidebarNavGroup[],
	allTypeGroups: SidebarNavGroup[]
): SidebarNavGroup[] {
	// An app group with a type group's id (`types:Website`) takes that group's types,
	// first, before its own links: so a schema `group` and the app's own links (its
	// media, a tool) can share one heading.
	const claimed = new Set(appGroups.map((group) => group.id));
	const groups = appGroups.map((group) => {
		const types = allTypeGroups.find((typeGroup) => typeGroup.id === group.id);
		return types
			? {
					...group,
					label: group.label ?? types.label,
					items: [...(types.items ?? []), ...(group.items ?? [])]
				}
			: group;
	});
	const typeGroups = allTypeGroups.filter((group) => !claimed.has(group.id));
	const slot = groups.findIndex((group) => group.id === 'types' && !group.items?.length);
	if (slot !== -1) return [...groups.slice(0, slot), ...typeGroups, ...groups.slice(slot + 1)];
	const firstTop = groups.findIndex((group) => group.placement !== 'bottom');
	const at = firstTop === -1 ? 0 : firstTop + 1;
	return [...groups.slice(0, at), ...typeGroups, ...groups.slice(at)];
}
