<script lang="ts">
	// Embeddable contact form. Drop it on any page — a section, the footer, or via
	// the `contactForm` page-builder block. It POSTs JSON to `endpoint` and manages
	// its own state, so it's fully route-independent.
	let {
		endpoint = '/api/contact',
		heading = 'Contact',
		blurb = "Send a message and we'll get back to you."
	}: { endpoint?: string; heading?: string; blurb?: string } = $props();

	type Values = { name: string; email: string; subject: string; message: string };
	const empty: Values = { name: '', email: '', subject: '', message: '' };

	let values = $state<Values>({ ...empty });
	let company = $state(''); // honeypot — real users never fill this
	let errors = $state<Partial<Record<keyof Values, string>>>({});
	let submitting = $state(false);
	let success = $state(false);
	let submitError = $state('');

	async function onsubmit(event: SubmitEvent) {
		event.preventDefault();
		submitting = true;
		submitError = '';
		try {
			const res = await fetch(endpoint, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...values, company })
			});
			const data = (await res.json().catch(() => ({}))) as {
				success?: boolean;
				errors?: typeof errors;
			};
			if (res.ok && data.success) {
				success = true;
				errors = {};
				values = { ...empty };
			} else {
				errors = data.errors ?? {};
				if (!Object.keys(errors).length) submitError = 'Something went wrong. Please try again.';
			}
		} catch {
			submitError = 'Network error. Please try again.';
		} finally {
			submitting = false;
		}
	}
</script>

<section class="mx-auto w-full max-w-xl">
	<header class="mb-8">
		<h2 class="text-2xl font-semibold tracking-tight">{heading}</h2>
		<p class="text-muted-foreground mt-2">{blurb}</p>
	</header>

	{#if success}
		<div class="rounded-lg border border-green-500/30 bg-green-500/10 p-6 text-center">
			<p class="font-medium">Thanks — your message has been sent.</p>
			<p class="text-muted-foreground mt-1 text-sm">We'll be in touch soon.</p>
		</div>
	{:else}
		<form class="space-y-5" {onsubmit}>
			<!-- Honeypot: hidden from users, catches bots. Not tab-reachable. -->
			<div class="hidden" aria-hidden="true">
				<label
					>Company<input type="text" bind:value={company} tabindex="-1" autocomplete="off" /></label
				>
			</div>

			<div class="space-y-1.5">
				<label for="cf-name" class="text-sm font-medium">Name</label>
				<input
					id="cf-name"
					type="text"
					bind:value={values.name}
					autocomplete="name"
					class="bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
					aria-invalid={errors.name ? 'true' : undefined}
				/>
				{#if errors.name}<p class="text-destructive text-sm">{errors.name}</p>{/if}
			</div>

			<div class="space-y-1.5">
				<label for="cf-email" class="text-sm font-medium">Email</label>
				<input
					id="cf-email"
					type="email"
					bind:value={values.email}
					autocomplete="email"
					class="bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
					aria-invalid={errors.email ? 'true' : undefined}
				/>
				{#if errors.email}<p class="text-destructive text-sm">{errors.email}</p>{/if}
			</div>

			<div class="space-y-1.5">
				<label for="cf-subject" class="text-sm font-medium">
					Subject <span class="text-muted-foreground">(optional)</span>
				</label>
				<input
					id="cf-subject"
					type="text"
					bind:value={values.subject}
					class="bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
				/>
			</div>

			<div class="space-y-1.5">
				<label for="cf-message" class="text-sm font-medium">Message</label>
				<textarea
					id="cf-message"
					rows="6"
					bind:value={values.message}
					class="bg-background focus:ring-ring w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2"
					aria-invalid={errors.message ? 'true' : undefined}
				></textarea>
				{#if errors.message}<p class="text-destructive text-sm">{errors.message}</p>{/if}
			</div>

			{#if submitError}<p class="text-destructive text-sm">{submitError}</p>{/if}

			<button
				type="submit"
				disabled={submitting}
				class="bg-primary text-primary-foreground inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
			>
				{submitting ? 'Sending…' : 'Send message'}
			</button>
		</form>
	{/if}
</section>
