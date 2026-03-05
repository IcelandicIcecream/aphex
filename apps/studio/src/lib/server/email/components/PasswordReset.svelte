<script lang="ts">
	import { Heading, Text, Button, Section } from 'better-svelte-email';
	import EmailLayout from './EmailLayout.svelte';

	let { userName, resetUrl }: { userName: string; resetUrl: string } = $props();
</script>

<EmailLayout preview="Reset your password">
	<Heading as="h1" class="text-[24px] font-bold text-[#1f2937]">Password Reset</Heading>

	<Text class="text-[16px] text-[#374151]">Hi {userName},</Text>

	<Text class="text-[16px] text-[#374151]">
		You requested to reset your password. Click the button below to reset it:
	</Text>

	<Section class="my-[32px] text-center">
		<Button href={resetUrl} pX={20} pY={12} class="rounded-[4px] bg-[#1f2937] text-white">
			Reset Password
		</Button>
	</Section>

	<Text class="text-[14px] text-[#6b7280]">
		If you didn't request this, you can safely ignore this email.
	</Text>

	<Text class="text-[14px] text-[#6b7280]">This link will expire in 1 hour.</Text>
</EmailLayout>
