<script lang="ts">
	let { body = '' }: { body?: string } = $props();
</script>

<svg viewBox="0 0 10 10" data-body={body}></svg>
