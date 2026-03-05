<script lang="ts">
	import { Heading, Text, Button, Section } from 'better-svelte-email';
	import EmailLayout from './EmailLayout.svelte';

	let { orgName, role, inviteUrl }: { orgName: string; role: string; inviteUrl: string } =
		$props();
	const article = role === 'admin' ? 'an' : 'a';
</script>

<EmailLayout preview="You've been invited to join {orgName}">
	<Heading as="h1" class="text-[24px] font-bold text-[#1f2937]">Organization Invitation</Heading>

	<Text class="text-[16px] text-[#374151]">
		You've been invited to join <strong>{orgName}</strong> as {article}
		<strong>{role}</strong>.
	</Text>

	<Text class="text-[16px] text-[#374151]">
		Click the button below to accept the invitation:
	</Text>

	<Section class="my-[32px] text-center">
		<Button href={inviteUrl} pX={20} pY={12} class="rounded-[4px] bg-[#1f2937] text-white">
			Accept Invitation
		</Button>
	</Section>

	<Text class="text-[14px] text-[#6b7280]">This invitation will expire in 7 days.</Text>

	<Text class="text-[14px] text-[#6b7280]">
		If you didn't expect this invitation, you can safely ignore this email.
	</Text>
</EmailLayout>
