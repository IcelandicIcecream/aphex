<script lang="ts">
	import { Heading, Text, Button, Section } from 'better-svelte-email';
	import EmailLayout from './EmailLayout.svelte';

	let { userName, verifyUrl }: { userName: string; verifyUrl: string } = $props();
</script>

<EmailLayout preview="Verify your email address">
	<Heading as="h1" class="text-[24px] font-bold text-[#1f2937]">Email Verification</Heading>

	<Text class="text-[16px] text-[#374151]">Hi {userName},</Text>

	<Text class="text-[16px] text-[#374151]">
		Welcome to Aphex CMS! Please verify your email address by clicking the button below:
	</Text>

	<Section class="my-[32px] text-center">
		<Button href={verifyUrl} pX={20} pY={12} class="rounded-[4px] bg-[#1f2937] text-white">
			Verify Email
		</Button>
	</Section>

	<Text class="text-[14px] text-[#6b7280]">
		If you didn't create this account, you can safely ignore this email.
	</Text>
</EmailLayout>
