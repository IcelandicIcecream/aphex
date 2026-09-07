<script lang="ts">
	// Job/event history plus the two operator actions (retry, cancel). Auth is enforced by the
	// (protected) layout and the /api/jobs · /api/events endpoints; the component fetches them
	// client-side, so this route is a thin mount point. The two props are UI gating only —
	// hiding a button the server would refuse anyway, so the page doesn't offer dead controls.
	import { ActivityView } from '@aphexcms/cms-core/client/ui';
	import { hasCapability } from '@aphexcms/cms-core';

	let { data } = $props();

	// `hasCapability`, not a raw `capabilities.includes`: it also honours the instance-role
	// override, so a super admin with no per-org grant still gets the controls.
	const canControlJobs = $derived(hasCapability(data.auth, 'org.settings'));
	const isSuperAdmin = $derived(data.auth.user.role === 'super_admin');
</script>

<svelte:head><title>Activity · Aphex</title></svelte:head>

<ActivityView {canControlJobs} {isSuperAdmin} />
