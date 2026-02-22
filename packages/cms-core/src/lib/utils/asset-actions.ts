import { toast } from 'svelte-sonner';

/**
 * Copy a URL to the clipboard, showing a toast on success/failure.
 */
export async function copyUrlToClipboard(url: string): Promise<boolean> {
	try {
		const shareableUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
		await navigator.clipboard.writeText(shareableUrl);
		toast.success('URL copied to clipboard');
		return true;
	} catch {
		toast.error('Failed to copy URL');
		return false;
	}
}

/**
 * Download a file by programmatically creating and clicking an anchor element.
 */
export function downloadFile(url: string, filename: string): void {
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
}
