import { untrack } from 'svelte';
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

/**
 * The host that draws the dialog. More than one can be mounted (AphexStudio and
 * AdminApp each mount one, and so does a host layout around AdminApp), and each
 * drew the same dialog, so every confirmation showed twice. The first mounted
 * draws; the others stand by in case it unmounts.
 */
const hosts = $state<symbol[]>([]);

export function registerConfirmDialogHost(id: symbol): () => void {
	// Untracked: called from an effect, and push/indexOf read the list, so a
	// tracked call would re-run that effect on its own write, forever.
	untrack(() => hosts.push(id));
	return () =>
		untrack(() => {
			const index = hosts.indexOf(id);
			if (index !== -1) hosts.splice(index, 1);
		});
}

export function isDrawingConfirmDialogHost(id: symbol): boolean {
	return hosts[0] === id;
}
