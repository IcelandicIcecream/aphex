<script lang="ts">
	// Read-only job/event history. Auth is enforced by the (protected) layout and the
	// GET /api/jobs · /api/events endpoints (gated on document.read); the component fetches
	// them client-side, so this route is a thin mount point.
	import { ActivityView } from '@aphexcms/cms-core/client/ui';
</script>

<svelte:head><title>Activity · Aphex</title></svelte:head>

<ActivityView />
