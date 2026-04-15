<script lang="ts">
	import * as AlertDialog from '@aphexcms/ui/shadcn/alert-dialog';
	import { buttonVariants } from '@aphexcms/ui/shadcn/button';
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
			<AlertDialog.Title>{confirmDialogState.title}</AlertDialog.Title>
			{#if confirmDialogState.description}
				<AlertDialog.Description>
					{confirmDialogState.description}
				</AlertDialog.Description>
			{/if}
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel onclick={() => resolveConfirmDialog(false)}>
				{confirmDialogState.cancelText}
			</AlertDialog.Cancel>
			<AlertDialog.Action
				class={buttonVariants({
					variant: confirmDialogState.variant === 'destructive' ? 'destructive' : 'default'
				})}
				onclick={() => resolveConfirmDialog(true)}
			>
				{confirmDialogState.confirmText}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
