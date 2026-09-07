<script lang="ts">
	import { Label } from '@aphexcms/ui/shadcn/label';
	import { Switch } from '@aphexcms/ui/shadcn/switch';
	import * as Card from '@aphexcms/ui/shadcn/card';
	import type { UserSessionPreferences } from '@aphexcms/cms-core';
	import { user as userApi } from '@aphexcms/cms-core/client/ui';
	import { Building2 } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';

	/**
	 * Per-user workspace preferences.
	 *
	 * Split out of AccountSettings so the settings page can file it under its own
	 * heading — these change what you *see* in the CMS, not who you are, and
	 * grouping them with name and avatar made "Profile" mean two things.
	 *
	 * Preferences save immediately on toggle, with no Save button. They're
	 * per-user view settings, so the cost of a wrong one is seeing the wrong list
	 * for a moment, and an unsaved toggle is a worse failure than an instant one.
	 */

	type Props = {
		userPreferences?: UserSessionPreferences | null;
		hasChildOrganizations?: boolean;
	};

	let { userPreferences = null, hasChildOrganizations = false }: Props = $props();

	let includeChildOrganizations = $state(false);
	let isUpdating = $state(false);

	$effect(() => {
		includeChildOrganizations = userPreferences?.includeChildOrganizations ?? false;
	});

	async function updatePreferences(prefs: Partial<UserSessionPreferences>) {
		isUpdating = true;
		try {
			const result = await userApi.updatePreferences(prefs);

			if (!result.success) {
				throw new Error(result.error || result.message || 'Failed to update preferences');
			}
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'Failed to update preferences');
			// Revert on error
			if (prefs.includeChildOrganizations !== undefined) {
				includeChildOrganizations = !prefs.includeChildOrganizations;
			}
		} finally {
			isUpdating = false;
		}
	}
</script>

{#if hasChildOrganizations}
	<Card.Root>
		<Card.Content>
			<div class="flex items-center justify-between gap-4">
				<div class="flex items-center gap-3">
					<Building2 class="text-muted-foreground h-5 w-5 shrink-0" />
					<div>
						<Label class="text-base font-medium">Include child organizations</Label>
						<p class="text-muted-foreground text-sm">
							Show documents from child organizations in your content lists
						</p>
					</div>
				</div>
				<Switch
					checked={includeChildOrganizations}
					disabled={isUpdating}
					onCheckedChange={(checked) => {
						includeChildOrganizations = checked;
						updatePreferences({ includeChildOrganizations: checked });
					}}
				/>
			</div>
		</Card.Content>
	</Card.Root>
{/if}
