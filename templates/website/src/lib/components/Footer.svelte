<script lang="ts">
	/** The site footer: nav from the `footer` singleton, plus its note line. */
	import CMSLink from './CMSLink.svelte';
	import ThemeSelector from './ThemeSelector.svelte';
	import type { CMSLinkValue } from '$lib/utils/link';

	interface Props {
		siteName: string;
		navItems?: CMSLinkValue[];
		note?: string | null;
		/** Only shown to a signed-in user — see the layout for why. */
		signedIn?: boolean;
	}

	let { siteName, navItems = [], note, signedIn = false }: Props = $props();
</script>

<footer class="mt-20 border-t">
	<div
		class="text-muted-foreground container flex flex-col gap-6 py-10 text-sm md:flex-row md:items-center md:justify-between"
	>
		<div>
			<p class="text-foreground font-medium">{siteName}</p>
			{#if note}<p class="mt-1">{note}</p>{/if}
		</div>

		<div class="flex flex-wrap items-center gap-x-8 gap-y-4">
			<nav class="flex flex-wrap gap-x-6 gap-y-2">
				{#each navItems as link, i (i)}
					<CMSLink {link} appearance="link" class="hover:text-foreground" />
				{/each}
				{#if signedIn}
					<!-- Only for signed-in users: a reader has no studio to go to, and
					     the link would advertise that an admin exists at this path. -->
					<a href="/admin" class="hover:text-foreground">Studio</a>
				{/if}
			</nav>

			<!-- The theme control lives here rather than in the header: it is a
			     preference, not navigation, and the footer is where someone looks for
			     one. Payload's website template puts it in the same place. -->
			<ThemeSelector />
		</div>
	</div>
</footer>
