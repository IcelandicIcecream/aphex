<script lang="ts">
	import * as AlertDialog from '@aphexcms/ui/shadcn/alert-dialog';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { confirmDialogState, resolveConfirmDialog } from './confirm-dialog.svelte';

	function handleOpenChange(open: boolean) {
		if (!open && confirmDialogState.open) {
			resolveConfirmDialog(false);
		}
	}
</script>

<AlertDialog.Root bind:open={confirmDialogState.open} onOpenChange={handleOpenChange}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title class="break-words">{confirmDialogState.title}</AlertDialog.Title>
			{#if confirmDialogState.description}
				<AlertDialog.Description class="break-words">
					{confirmDialogState.description}
				</AlertDialog.Description>
			{/if}
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<Button variant="outline" onclick={() => resolveConfirmDialog(false)}>
				{confirmDialogState.cancelText}
			</Button>
			<Button
				variant={confirmDialogState.variant === 'destructive' ? 'destructive' : 'default'}
				onclick={() => resolveConfirmDialog(true)}
			>
				{confirmDialogState.confirmText}
			</Button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
