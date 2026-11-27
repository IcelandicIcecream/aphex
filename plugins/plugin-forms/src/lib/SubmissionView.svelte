<script lang="ts">
	import { documents, type FieldComponentProps } from '@aphexcms/cms-core';
	import { Mail, Reply } from '@lucide/svelte';

	/**
	 * A submission as a message, in place of its stored fields: who sent it and
	 * when, from which form, each question as the form asked it with the answer
	 * under it, and a Reply that opens an email to them. Read-only, like the
	 * submission itself (the public endpoint writes it, nobody edits it).
	 */
	let { documentData }: FieldComponentProps = $props();

	type Answer = { field?: string; value?: unknown };
	type Label = { field?: string; label?: string };

	const doc = $derived((documentData ?? {}) as Record<string, any>);
	const answers = $derived(((doc.submissionData ?? []) as Answer[]).filter((a) => a.field));

	// The questions as they read when it was sent: a form renamed or edited since
	// still shows what this person answered.
	const labels = $derived(
		new Map(
			((doc.notificationFieldLabels ?? []) as Label[])
				.filter((l) => l.field && l.label)
				.map((l) => [l.field!, l.label!])
		)
	);
	/** `firstName` or `first_name` → "First name", for a submission without a snapshot. */
	const humanize = (name: string) => {
		const words = name
			.replace(/([a-z])([A-Z])/g, '$1 $2')
			.replace(/[_-]+/g, ' ')
			.trim()
			.toLowerCase();
		return words.charAt(0).toUpperCase() + words.slice(1);
	};
	const labelOf = (field: string) => labels.get(field) ?? humanize(field);
	const text = (value: unknown) =>
		Array.isArray(value) ? value.join(', ') : value == null ? '' : String(value);

	const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	const PHONE = /^\+?[\d\s().-]{7,}$/;

	// Who sent it: the address the confirmation went to, else the first answer
	// that is an email address; the name from a question about a name.
	const email = $derived(
		(typeof doc.confirmationEmail?.to === 'string' && EMAIL.test(doc.confirmationEmail.to)
			? doc.confirmationEmail.to
			: answers.map((a) => text(a.value).trim()).find((v) => EMAIL.test(v))) ?? ''
	);
	const name = $derived(
		text(
			answers.find((a) => /name/i.test(a.field!) || /name/i.test(labelOf(a.field!)))?.value
		).trim()
	);

	const sentAt = $derived(doc.submittedAt ? new Date(doc.submittedAt) : null);
	const when = $derived(
		sentAt && !isNaN(sentAt.getTime())
			? sentAt.toLocaleString(undefined, {
					weekday: 'short',
					day: 'numeric',
					month: 'short',
					year: 'numeric',
					hour: 'numeric',
					minute: '2-digit'
				})
			: ''
	);

	// The form's title, for "via Contact". Its reference is all the submission holds.
	let formTitle = $state('');
	$effect(() => {
		const ref = doc.form?._ref as string | undefined;
		if (!ref) return;
		let live = true;
		documents
			.getById(ref)
			.then((res) => {
				const data = (res.data?.publishedData ?? res.data?.draftData) as
					| Record<string, unknown>
					| undefined;
				if (live && res.success && typeof data?.title === 'string') formTitle = data.title;
			})
			.catch(() => {});
		return () => {
			live = false;
		};
	});

	const replyHref = $derived(
		email
			? `mailto:${email}?subject=${encodeURIComponent(`Re: ${formTitle || 'your message'}`)}`
			: ''
	);
</script>

<article class="message">
	<header>
		<div class="avatar" aria-hidden="true">
			{#if name}{name.charAt(0).toUpperCase()}{:else}<Mail size={16} />{/if}
		</div>
		<div class="who">
			<div class="name">{name || email || 'Someone'}</div>
			<div class="meta">
				{#if name && email}<span>{email}</span>{/if}
				{#if when}<span>{when}</span>{/if}
				{#if formTitle}<span>via {formTitle}</span>{/if}
			</div>
		</div>
		{#if replyHref}
			<a class="reply" href={replyHref}><Reply size={14} /> Reply</a>
		{/if}
	</header>

	{#if answers.length === 0}
		<p class="empty">This message has no answers.</p>
	{:else}
		<dl>
			{#each answers as answer (answer.field)}
				{@const value = text(answer.value).trim()}
				<div class="answer">
					<dt>{labelOf(answer.field!)}</dt>
					<dd>
						{#if !value}
							<span class="none">Not answered</span>
						{:else if EMAIL.test(value)}
							<a href="mailto:{value}">{value}</a>
						{:else if PHONE.test(value)}
							<a href="tel:{value.replace(/[^\d+]/g, '')}">{value}</a>
						{:else}
							{value}
						{/if}
					</dd>
				</div>
			{/each}
		</dl>
	{/if}

	{#if doc.confirmationEmail?.to}
		<footer>We emailed {doc.confirmationEmail.to} to say their message arrived.</footer>
	{/if}
</article>

<style>
	.message {
		border: 1px solid var(--border);
		border-radius: var(--radius, 0.5rem);
		background: var(--card, var(--background));
		overflow: hidden;
	}
	header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--border);
	}
	.avatar {
		display: grid;
		place-items: center;
		flex: none;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 999px;
		background: var(--muted);
		color: var(--muted-foreground);
		font-weight: 600;
	}
	.who {
		min-width: 0;
		flex: 1;
	}
	.name {
		font-weight: 600;
		color: var(--foreground);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.meta {
		display: flex;
		flex-wrap: wrap;
		column-gap: 0.75rem;
		font-size: 0.8125rem;
		color: var(--muted-foreground);
	}
	.reply {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		flex: none;
		padding: 0.375rem 0.75rem;
		border: 1px solid var(--border);
		border-radius: calc(var(--radius, 0.5rem) - 2px);
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--foreground);
		text-decoration: none;
	}
	.reply:hover {
		background: var(--muted);
	}
	dl {
		margin: 0;
		padding: 0.25rem 1.25rem;
	}
	.answer {
		padding: 0.875rem 0;
	}
	.answer + .answer {
		border-top: 1px solid var(--border);
	}
	dt {
		font-size: 0.8125rem;
		color: var(--muted-foreground);
	}
	dd {
		margin: 0.25rem 0 0;
		color: var(--foreground);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		line-height: 1.55;
	}
	dd a {
		color: inherit;
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.none,
	.empty {
		color: var(--muted-foreground);
	}
	.empty {
		margin: 0;
		padding: 1rem 1.25rem;
	}
	footer {
		padding: 0.75rem 1.25rem;
		border-top: 1px solid var(--border);
		font-size: 0.8125rem;
		color: var(--muted-foreground);
	}
</style>
