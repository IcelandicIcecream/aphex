<script lang="ts">
	/**
	 * Teleports its children into the settings header's action slot (provided by
	 * SettingsShell's context). A panel renders `<SettingsHeaderActions>` with a
	 * button inside; the shell displays it beside the page title. Cleared on
	 * unmount so a panel's actions don't linger on the next tab.
	 */
	import { getContext } from 'svelte';
	import type { Snippet } from 'svelte';
	import {
		settingsHeaderActionContextKey,
		type SettingsHeaderActionContext
	} from '../../admin/settings-header-actions';

	let { children }: { children: Snippet } = $props();

	const context = getContext<SettingsHeaderActionContext | undefined>(
		settingsHeaderActionContextKey
	);

	$effect(() => {
		context?.setActions(children);
		return () => context?.setActions(null);
	});
</script>
