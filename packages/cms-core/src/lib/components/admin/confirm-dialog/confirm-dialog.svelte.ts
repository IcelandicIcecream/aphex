export interface ConfirmDialogOptions {
	title: string;
	description?: string;
	confirmText?: string;
	cancelText?: string;
	variant?: 'default' | 'destructive';
}

interface ConfirmDialogState extends ConfirmDialogOptions {
	open: boolean;
	resolve: ((value: boolean) => void) | null;
}

export const confirmDialogState = $state<ConfirmDialogState>({
	open: false,
	title: '',
	description: undefined,
	confirmText: 'Confirm',
	cancelText: 'Cancel',
	variant: 'default',
	resolve: null
});

export function confirmDialog(options: ConfirmDialogOptions): Promise<boolean> {
	return new Promise((resolve) => {
		if (confirmDialogState.resolve) {
			confirmDialogState.resolve(false);
		}
		confirmDialogState.title = options.title;
		confirmDialogState.description = options.description;
		confirmDialogState.confirmText = options.confirmText ?? 'Confirm';
		confirmDialogState.cancelText = options.cancelText ?? 'Cancel';
		confirmDialogState.variant = options.variant ?? 'default';
		confirmDialogState.resolve = resolve;
		confirmDialogState.open = true;
	});
}

export function resolveConfirmDialog(value: boolean) {
	const r = confirmDialogState.resolve;
	confirmDialogState.resolve = null;
	confirmDialogState.open = false;
	r?.(value);
}
