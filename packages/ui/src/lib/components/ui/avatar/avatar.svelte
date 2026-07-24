<script lang="ts">
	import { Avatar as AvatarPrimitive } from 'bits-ui';
	import { cn } from '@lib/utils.js';

	type Props = AvatarPrimitive.RootProps & { size?: 'sm' | 'default' | 'lg' };

	let {
		ref = $bindable(null),
		loadingStatus = $bindable('loading'),
		class: className,
		size = 'default',
		...restProps
	}: Props = $props();
</script>

<AvatarPrimitive.Root
	bind:ref
	bind:loadingStatus
	data-slot="avatar"
	data-size={size}
	class={cn(
		'cn-avatar group/avatar relative flex size-8 shrink-0 overflow-hidden rounded-full',
		className
	)}
	{...restProps}
/>
