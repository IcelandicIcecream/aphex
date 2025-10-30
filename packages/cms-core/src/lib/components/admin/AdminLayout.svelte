<script lang="ts">
	interface Props {
		currentView: 'dashboard' | 'documents' | 'editor';
		mobileView: 'types' | 'documents' | 'editor';
		selectedDocumentType: string | null;
		windowWidth: number;
		children?: any;
	}

	let { currentView, mobileView, selectedDocumentType, windowWidth, children }: Props = $props();

	// Panel layout state for adaptive design
	const typesPanel = $derived.by(() => {
		// Mobile (< 620px): Panel switching with breadcrumbs
		if (windowWidth < 620) {
			return mobileView === 'types' ? 'w-full' : 'hidden';
		}

		// Tablet/Small Desktop (620-745px): Only one panel open, rest compact
		if (windowWidth <= 745) {
			if (currentView === 'editor') {
				return 'w-[60px]'; // Compact when editing
			} else if (currentView === 'documents') {
				return 'w-[60px]'; // Compact when viewing documents
			} else {
				return 'flex-1'; // Dashboard - full width
			}
		}

		// Wide screens (>1300px): Always show expanded panels with fixed widths
		if (windowWidth > 1300) {
			return 'w-[350px]'; // Fixed width
		}

		// Medium screens (1051-1300px): Types compact when editor is open
		if (windowWidth > 1050) {
			if (currentView === 'editor') {
				return 'w-[60px]'; // Compact when editing
			} else {
				return 'w-[350px]'; // Fixed width
			}
		}

		// Smaller screens (746-1050px)
		if (currentView === 'editor') {
			return 'w-[60px]'; // Compact when editing
		} else {
			return 'w-[350px]'; // Fixed width
		}
	});

	const documentsPanel = $derived.by(() => {
		// Mobile (< 620px): Panel switching
		if (windowWidth < 620) {
			return mobileView === 'documents' ? 'w-full' : 'hidden';
		}

		if (!selectedDocumentType) return 'hidden';

		// Tablet/Small Desktop (620-745px)
		if (windowWidth <= 745) {
			if (currentView === 'editor') {
				return 'w-[60px]'; // Compact when editing
			} else if (currentView === 'documents') {
				return 'flex-1'; // Full width
			} else {
				return 'hidden';
			}
		}

		// Wide screens (>1300px)
		if (windowWidth > 1300) {
			return 'w-[350px]'; // Fixed width
		}

		// Medium screens (1051-1300px)
		if (windowWidth > 1050) {
			return 'w-[350px]'; // Fixed width
		}

		// Smaller screens (746-1050px)
		if (currentView === 'editor') {
			return 'w-[60px]'; // Compact when editing
		} else if (currentView === 'documents') {
			return 'w-[350px]'; // Fixed width
		} else {
			return 'hidden';
		}
	});

	const editorPanel = $derived.by(() => {
		// Mobile (< 620px): Panel switching
		if (windowWidth < 620) {
			return mobileView === 'editor' ? 'w-full' : 'hidden';
		}

		if (currentView === 'editor') {
			return 'flex-1'; // Full width when editing
		} else {
			return 'hidden';
		}
	});

	// Expose computed values to parent via context
	// This allows child slot content to access layout state
	export { typesPanel, documentsPanel, editorPanel };
</script>

<div class="flex h-full">
	{@render children({
		typesPanel,
		documentsPanel,
		editorPanel
	})}
</div>
