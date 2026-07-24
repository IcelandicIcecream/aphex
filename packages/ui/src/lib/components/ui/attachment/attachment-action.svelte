<script lang="ts">
	import { Button, type ButtonProps } from '../button/index.js';
	let { variant = 'ghost', size = 'icon-sm', children, ...restProps }: ButtonProps = $props();
</script>

<Button data-slot="attachment-action" {variant} {size} {...restProps}>{@render children?.()}</Button
>
