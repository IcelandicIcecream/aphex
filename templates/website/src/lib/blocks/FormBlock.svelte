<script lang="ts">
	/**
	 * Renders a form built in the studio.
	 *
	 * The plugin owns what a form *is* and what happens to a submission; this owns
	 * how it looks, because a plugin that shipped markup would be shipping a design
	 * with it. Everything here is ordinary Tailwind over the same shadcn tokens the
	 * rest of the site uses.
	 *
	 * ## Progressive-ish, deliberately not a form library
	 *
	 * A plain `<form>` with `onsubmit`, native `required`/`type` attributes for the
	 * browser's own validation, and one fetch. Server-side validation is the real
	 * gate — the endpoint re-checks every field against the form document, because
	 * a client-side constraint isn't one — so the attributes here are purely to
	 * catch mistakes before a round trip.
	 *
	 * ## Preview
	 *
	 * Two cases, handled separately below:
	 *
	 * - **A page is open.** The form comes from `_form`, attached during the page
	 *   load, because the editor's page document holds only a raw reference.
	 * - **The form itself is open.** `ve.live` swaps in the editor's draft, so
	 *   adding a field or renaming a label updates the preview as they type.
	 *
	 * With no form selected at all the block explains itself rather than rendering
	 * an empty shell — the same reasoning as `CMSLink` keeping its button shape
	 * without a destination.
	 */
	import { usePreview } from '@aphexcms/visual-editing';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Textarea } from '@aphexcms/ui/shadcn/textarea';
	import { Checkbox } from '@aphexcms/ui/shadcn/checkbox';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import RichText from '$lib/components/RichText.svelte';
	import { control } from '$lib/utils/stega';
	import type { FormBlockValue } from './types';

	let { block, index }: { block: FormBlockValue; index?: number } = $props();

	const ve = usePreview();

	/**
	 * The form is a *separate document* embedded in this page, so it needs its own
	 * live-preview wiring.
	 *
	 * `_form` is attached during the page load, which is what makes the form render
	 * at all. But when an editor opens the form itself in the studio — from the
	 * block's reference, or from the Forms list — the document the studio pushes is
	 * the *form*, not the page. Without this the preview keeps showing the
	 * server-loaded copy, and editing a label or adding a field appears to do
	 * nothing until a reload.
	 *
	 * `ve.live` already gates on both type and id, so this is a no-op while a page
	 * is open and swaps in the editor's draft only when it's this exact form.
	 */
	const form = $derived(
		block._form ? ve.live(block._form, { type: 'form', id: block._form.id }) : null
	);
	const fields = $derived(form?.fields ?? []);

	/** Field name → current value. Seeded from each field's default. */
	let values = $state<Record<string, string | boolean>>({});
	let errors = $state<Record<string, string>>({});
	let submitting = $state(false);
	let submitted = $state(false);
	let formError = $state<string | null>(null);

	/*
	 * Seed each field's default.
	 *
	 * Every value read here goes through `control()`, including the ones used as
	 * *keys*. In preview a field's `name` carries invisible click-to-edit markers,
	 * so keying this map off the raw name while the inputs below bind to the
	 * cleaned one gives two different keys for the same field: the form looks fine
	 * and submits nothing. Names and type discriminators are machine-read, so they
	 * are always cleaned. See $lib/utils/stega.ts.
	 */
	$effect(() => {
		for (const field of fields) {
			const name = control(field.name);
			// Fill gaps only. Rebuilding the map wholesale would wipe whatever the
			// visitor had typed every time `fields` changed identity — which, in
			// preview, is on every keystroke in the form editor.
			if (!name || values[name] !== undefined) continue;
			values[name] =
				control(field._type) === 'formCheckbox'
					? field.defaultValue === true
					: (control(field.defaultValue as string | undefined) ?? '');
		}
	});

	/*
	 * Bindings go through these rather than `bind:value={values[name]}` directly.
	 *
	 * Two reasons, one of them fatal. The map is populated by an effect, and
	 * effects don't run during SSR or before the first client render — so at bind
	 * time `values[name]` is `undefined`, and a shadcn control with a fallback
	 * value (`Checkbox`'s `checked`) throws `props_invalid_value` on that. In
	 * Svelte 5 that aborts hydration, which tears down every sibling rendered
	 * before it: the whole page above the checkbox disappears, with only a console
	 * error to say why.
	 *
	 * A get/set pair guarantees a defined value whatever the seeding order, and
	 * coerces at the boundary instead of asserting a type the map can't promise.
	 */
	const text = (name: string) => {
		const value = values[name];
		return typeof value === 'string' ? value : '';
	};
	const checked = (name: string) => values[name] === true;
	const set = (name: string) => (value: string | boolean) => {
		values[name] = value;
	};

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (submitting || !form) return;

		submitting = true;
		errors = {};
		formError = null;

		try {
			const response = await fetch('/api/form-submissions', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					form: control(form.id),
					version: control(form.version),
					data: $state.snapshot(values),
					// The honeypot travels as an ordinary field so a bot filling
					// everything trips it. Bound to the hidden input below.
					website: honeypot
				})
			});

			const result = await response.json();

			if (!result.success) {
				errors = result.errors ?? {};
				formError = result.error ?? 'Something went wrong. Please try again.';
				return;
			}

			if (result.confirmationType === 'redirect' && result.redirectUrl) {
				window.location.href = result.redirectUrl;
				return;
			}

			submitted = true;
		} catch {
			// A network failure, not a validation one — say so rather than blaming
			// the visitor's input.
			formError = 'Could not reach the server. Please try again.';
		} finally {
			submitting = false;
		}
	}

	let honeypot = $state('');
</script>

<!--
	Two different click-to-edit targets, and the distinction matters.

	The section reveals *this block* in the page's form pane — that's how an author
	reorders or removes it, which opening the form document wouldn't let them do.
	The form itself points at the form document, because the fields, the button
	label and the confirmation message are authored there and nowhere else.
-->
<section class="container my-12" {...ve.edit({ field: 'layout', arrayIndex: index })}>
	<div class="mx-auto max-w-2xl">
		{#if block.introContent}
			<div class="mb-8">
				<RichText value={block.introContent} />
			</div>
		{/if}

		{#if !form}
			<!-- No form attached: either none is selected yet, or this is preview,
			     where references aren't resolved. Either way, say which. -->
			<div class="rounded-lg border border-dashed p-8 text-center">
				<p class="text-muted-foreground text-sm">
					This block will render the selected form on the published page.
				</p>
			</div>
		{:else if submitted}
			<div class="bg-card rounded-lg border p-8">
				{#if form.confirmationMessage}
					<RichText value={form.confirmationMessage} />
				{:else}
					<p>Thanks — your message has been sent.</p>
				{/if}
			</div>
		{:else}
			<form
				onsubmit={submit}
				class="flex flex-wrap gap-x-4 gap-y-5"
				{...ve.edit({ id: form.id, type: 'form' })}
			>
				{#each fields as field, i (field._key ?? i)}
					{@const name = control(field.name) ?? ''}
					{@const kind = control(field._type)}
					{@const half = control(field.width) === 'half'}

					<div class={half ? 'w-[calc(50%-0.5rem)] min-w-[12rem] grow' : 'w-full'}>
						{#if kind === 'formMessage'}
							<div class="text-muted-foreground py-1 text-sm">
								<RichText value={field.message} />
							</div>
						{:else}
							<div class="flex flex-col gap-2">
								{#if kind !== 'formCheckbox'}
									<Label for="{name}-{i}">
										{field.label}
										{#if field.required}<span class="text-destructive">*</span>{/if}
									</Label>
								{/if}

								{#if kind === 'formTextarea'}
									<Textarea
										id="{name}-{i}"
										bind:value={() => text(name), set(name)}
										placeholder={control(field.placeholder)}
										rows={field.rows ?? 4}
										required={field.required}
									/>
								{:else if kind === 'formSelect'}
									<select
										id="{name}-{i}"
										bind:value={() => text(name), set(name)}
										required={field.required}
										class="border-input bg-background h-9 rounded-md border px-3 text-sm"
									>
										<option value="">Choose…</option>
										{#each field.options ?? [] as option, oi (oi)}
											{@const value = control(option.value) || control(option.label) || ''}
											<option {value}>{option.label}</option>
										{/each}
									</select>
								{:else if kind === 'formCheckbox'}
									<div class="flex items-center gap-2">
										<Checkbox id="{name}-{i}" bind:checked={() => checked(name), set(name)} />
										<Label for="{name}-{i}" class="font-normal">
											{field.label}
											{#if field.required}<span class="text-destructive">*</span>{/if}
										</Label>
									</div>
								{:else}
									<Input
										id="{name}-{i}"
										type={kind === 'formEmail'
											? 'email'
											: kind === 'formNumber'
												? 'number'
												: 'text'}
										bind:value={() => text(name), set(name)}
										placeholder={control(field.placeholder)}
										min={field.min}
										max={field.max}
										required={field.required}
									/>
								{/if}

								{#if errors[name]}
									<p class="text-destructive text-sm">{errors[name]}</p>
								{/if}
							</div>
						{/if}
					</div>
				{/each}

				<!--
					The honeypot. Hidden from sight and from assistive technology, and
					excluded from tabbing, so no real visitor can fill it in by accident —
					which is what makes a filled value meaningful. `type="text"` rather
					than `type="hidden"`: a bot that skips hidden inputs would skip this.
				-->
				<div class="hidden" aria-hidden="true">
					<label>
						Website
						<input type="text" bind:value={honeypot} tabindex="-1" autocomplete="off" />
					</label>
				</div>

				{#if formError}
					<p class="text-destructive w-full text-sm">{formError}</p>
				{/if}

				<div class="w-full">
					<Button type="submit" disabled={submitting}>
						{submitting ? 'Sending…' : (control(form.submitButtonLabel) ?? 'Submit')}
					</Button>
				</div>
			</form>
		{/if}
	</div>
</section>
