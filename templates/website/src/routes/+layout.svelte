<script lang="ts">
	import '../app.css';
	import { AphexVisualOverlay } from '@aphexcms/visual-editing';

	let { children } = $props();

	// No `<link rel="icon">` here. `app.html` already ships the bundled default,
	// and the site and admin layouts each override it with the favicon from site
	// settings when one is uploaded. Declaring a third, unconditional icon at the
	// root only meant competing tags whose winner is left to the browser.
</script>

<AphexVisualOverlay>
	{@render children?.()}
</AphexVisualOverlay>
