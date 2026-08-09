<script lang="ts">
	import { Heading, Text, Section } from 'better-svelte-email';
	import EmailLayout from './EmailLayout.svelte';

	/**
	 * The sign-in second factor, delivered by email.
	 *
	 * No button and no link, unlike the other auth emails — a code the reader
	 * types back into a page they already have open can't be phished by a lookalike
	 * link, and adding one would train people to click their way through a
	 * security step.
	 */
	let { userName, code }: { userName: string; code: string } = $props();
</script>

<EmailLayout preview="Your sign-in code">
	<Heading as="h1" class="text-[24px] font-bold text-[#1f2937]">Your sign-in code</Heading>

	<Text class="text-[16px] text-[#374151]">Hi {userName},</Text>

	<Text class="text-[16px] text-[#374151]">Enter this code to finish signing in:</Text>

	<Section class="my-8 text-center">
		<Text
			class="rounded-lg bg-[#f3f4f6] py-[16px] text-[32px] font-bold tracking-[8px] text-[#1f2937]"
		>
			{code}
		</Text>
	</Section>

	<Text class="text-[14px] text-[#6b7280]">This code expires in a few minutes.</Text>

	<Text class="text-[14px] text-[#6b7280]">
		If you didn't try to sign in, someone may have your password. Change it as soon as you can.
	</Text>
</EmailLayout>
