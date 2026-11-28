<script lang="ts">
	import { getContext } from 'svelte';
	import type { Snippet } from 'svelte';
	import {
		settingsHeaderActionContextKey,
		type SettingsHeaderActionContext
	} from './settings-header-actions';

	let { children }: { children: Snippet } = $props();

	const context = getContext<SettingsHeaderActionContext | undefined>(
		settingsHeaderActionContextKey
	);

	$effect(() => {
		context?.setActions(children);
		return () => context?.setActions(null);
	});
</script>
