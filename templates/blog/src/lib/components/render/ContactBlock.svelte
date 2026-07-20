<script lang="ts">
	import type { CustomBlockComponentProps } from '@portabletext/svelte';
	import { stegaClean } from '@aphexcms/visual-editing';
	import ContactForm from '$lib/blog/ContactForm.svelte';

	interface Props {
		portableText: CustomBlockComponentProps<{
			_type: 'contactForm';
			formId?: string;
			heading?: string;
			blurb?: string;
		}>;
	}

	let { portableText }: Props = $props();

	// stegaClean so the editor's invisible preview markers don't leak into the
	// rendered copy (same reason Callout cleans its tone).
	const heading = $derived(stegaClean(portableText.value.heading ?? '') || 'Contact');
	const blurb = $derived(
		stegaClean(portableText.value.blurb ?? '') || "Send a message and we'll get back to you."
	);
	// Which code-defined form to submit to (defaults to 'contact' on the endpoint side).
	const formId = $derived(stegaClean(portableText.value.formId ?? '') || 'contact');
</script>

<div class="contact-block">
	<ContactForm {formId} {heading} {blurb} />
</div>

<style>
	.contact-block {
		margin: 3rem 0;
	}
</style>
