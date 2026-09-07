<script lang="ts">
	/**
	 * A strip across the top of the site for signed-in editors: who you are, a way
	 * into the studio, and a direct edit link for whatever this page is showing.
	 *
	 * Payload's website template has the same thing, and it earns its place — the
	 * gap it closes is "I'm looking at the live page and I want to change this",
	 * which otherwise means opening the studio and finding the document by hand.
	 *
	 * It renders **only when signed in**, so a reader never sees it and it never
	 * advertises that an admin exists at this path. Everything it needs comes from
	 * the layout's server load; nothing here is fetched in the browser.
	 */
	import { goto, invalidateAll } from '$app/navigation';
	import { signOut } from '$lib/auth-client';
	import { SquarePen, LayoutDashboard, LogOut } from '@lucide/svelte';

	interface Props {
		email?: string | null;
		/** The document this page is rendering, when there is exactly one. */
		doc?: { id: string; type: string; label: string } | null;
	}

	let { email, doc }: Props = $props();

	let signingOut = $state(false);

	async function handleSignOut() {
		if (signingOut) return;
		signingOut = true;
		try {
			await signOut();
			// `invalidateAll` re-runs the layout load, which is what drops this bar
			// and the footer's studio link. Without it the page keeps rendering as
			// though someone were still signed in until the next full navigation.
			await invalidateAll();
			await goto('/');
		} finally {
			signingOut = false;
		}
	}
</script>

<!-- Black, not `bg-foreground`: this bar is chrome for one person, not part of
     the site's design, and it should read as a tool bolted on top whichever
     theme the page is using. -->
<div class="bg-black text-white">
	<div class="container flex h-10 items-center justify-between gap-4 text-xs whitespace-nowrap">
		<div class="flex min-w-0 items-center gap-4">
			<a href="/admin" class="flex items-center gap-1.5 font-medium hover:text-white/80">
				<LayoutDashboard class="size-3.5" />
				Studio
			</a>
			{#if email}
				<span class="truncate text-white/50">{email}</span>
			{/if}
		</div>

		<div class="flex items-center gap-4">
			{#if doc}
				<!-- The admin is a single route that reads `docType`/`docId` from the
				     query string — there is no /admin/<type>/<id>. -->
				<a
					href="/admin?docType={doc.type}&docId={doc.id}"
					class="flex items-center gap-1.5 font-medium hover:text-white/80"
				>
					<SquarePen class="size-3.5" />
					Edit {doc.label}
				</a>
			{/if}
			<button
				type="button"
				onclick={handleSignOut}
				disabled={signingOut}
				class="flex cursor-pointer items-center gap-1.5 text-white/70 hover:text-white disabled:opacity-50"
			>
				<LogOut class="size-3.5" />
				{signingOut ? 'Signing out…' : 'Log out'}
			</button>
		</div>
	</div>
</div>
