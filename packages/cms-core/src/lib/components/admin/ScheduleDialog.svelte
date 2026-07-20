<script lang="ts">
	// Schedule a future publish/unpublish. Layout mirrors Sanity's scheduled-drafts dialog
	// (title · description · "Schedule on" field → calendar+time popover · Cancel/Schedule),
	// in Aphex's shadcn skin. Posts to /documents/:id/schedule; the worker runs it at `runAt`
	// (re-validating then), and `runAt` is floored to the minute so 1:30 means 1:30:00.
	import * as Dialog from '@aphexcms/ui/shadcn/dialog';
	import * as Popover from '@aphexcms/ui/shadcn/popover';
	import { Calendar } from '@aphexcms/ui/shadcn/calendar';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Label } from '@aphexcms/ui/shadcn/label';
	import { Calendar as CalendarIcon, Globe } from '@lucide/svelte';
	import { CalendarDate, today, getLocalTimeZone, type DateValue } from '@internationalized/date';
	import { documents } from '../../api/documents';
	import { toast } from 'svelte-sonner';

	interface Props {
		open: boolean;
		documentId: string;
		/**
		 * The action to schedule. Derived from the editor's active perspective by the caller:
		 * viewing the Draft tab → 'publish' (send this draft live later); viewing the Published
		 * tab → 'unpublish' (take it down later). No in-dialog toggle — the tab is the intent.
		 */
		action: 'publish' | 'unpublish';
		onScheduled?: (job: { jobId: string; type: string; runAt: string; status: string }) => void;
	}
	let { open = $bindable(), documentId, action, onScheduled }: Props = $props();

	let dateValue = $state<DateValue | undefined>(undefined);
	let timeStr = $state('09:00'); // "HH:MM", 24h internally
	let pickerOpen = $state(false);
	let submitting = $state(false);

	const actionVerb = $derived(action === 'publish' ? 'Publish' : 'Unpublish');

	const minDate = today(getLocalTimeZone());
	// Short local timezone label, e.g. "MST" — shown so the user knows what zone they're setting.
	const tzLabel =
		new Intl.DateTimeFormat('en-US', { timeZoneName: 'short' })
			.formatToParts(new Date())
			.find((p) => p.type === 'timeZoneName')?.value ?? '';

	const pad = (n: number) => String(n).padStart(2, '0');

	// Reset the date/time each time the dialog opens: default to one hour out, floored to the minute.
	$effect(() => {
		if (open) {
			const d = new Date(Date.now() + 60 * 60 * 1000);
			dateValue = new CalendarDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
			timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
		}
	});

	/** Combine the picked calendar date + time into a local Date floored to the minute. */
	function buildRunAt(): Date | null {
		if (!dateValue) return null;
		const [h, m] = timeStr.split(':').map(Number);
		const d = new Date(dateValue.year, dateValue.month - 1, dateValue.day, h ?? 0, m ?? 0, 0, 0);
		return Number.isNaN(d.getTime()) ? null : d;
	}

	const runAtPreview = $derived(buildRunAt());
	const fieldLabel = $derived(
		runAtPreview
			? runAtPreview.toLocaleString(undefined, {
					month: 'short',
					day: 'numeric',
					year: 'numeric',
					hour: 'numeric',
					minute: '2-digit'
				})
			: 'Select date and time'
	);

	function setToCurrentTime() {
		const now = new Date();
		dateValue = new CalendarDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
		timeStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
	}

	async function submit() {
		const runAt = buildRunAt();
		if (!runAt) {
			toast.error('Pick a date and time');
			return;
		}
		runAt.setSeconds(0, 0);
		// Reject genuinely past minutes; the current minute is allowed (runs on the next tick).
		const currentMinute = new Date();
		currentMinute.setSeconds(0, 0);
		if (runAt.getTime() < currentMinute.getTime()) {
			toast.error('Pick a time in the future');
			return;
		}

		submitting = true;
		try {
			const res = await documents.schedule(documentId, { action, runAt: runAt.toISOString() });
			if (res.success) {
				toast.success(
					`${action === 'publish' ? 'Publish' : 'Unpublish'} scheduled for ${runAt.toLocaleString()}`
				);
				open = false;
				if (res.data) onScheduled?.(res.data);
			} else {
				toast.error(res.error || res.message || 'Failed to schedule');
			}
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to schedule');
		} finally {
			submitting = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Schedule {actionVerb}</Dialog.Title>
			<Dialog.Description>
				Select when this document should be {action === 'publish' ? 'published' : 'unpublished'}.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-2">
			<div class="space-y-1.5">
				<Label>Schedule on</Label>
				<Popover.Root bind:open={pickerOpen}>
					<Popover.Trigger
						class="border-input bg-background hover:bg-muted/40 focus-visible:ring-ring flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm focus-visible:ring-1 focus-visible:outline-none"
					>
						<span>{fieldLabel}</span>
						<CalendarIcon class="text-muted-foreground h-4 w-4" />
					</Popover.Trigger>
					<Popover.Content class="z-[70] w-[19rem] p-0" align="start">
						<Calendar
							type="single"
							bind:value={dateValue}
							minValue={minDate}
							class="w-full rounded-b-none [--cell-size:2.4rem]"
						/>
						<div class="border-rule flex flex-wrap items-center gap-x-2 gap-y-1 border-t p-3">
							<input
								type="time"
								bind:value={timeStr}
								class="border-input bg-background focus-visible:ring-ring rounded-md border px-2 py-1 text-sm focus-visible:ring-1 focus-visible:outline-none"
							/>
							<button
								type="button"
								class="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
								onclick={setToCurrentTime}
							>
								Set to current time
							</button>
							<span class="text-muted-foreground ml-auto flex items-center gap-1 text-xs">
								<Globe class="h-3 w-3" />
								{tzLabel}
							</span>
						</div>
					</Popover.Content>
				</Popover.Root>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="ghost" size="sm" onclick={() => (open = false)} disabled={submitting}>
				Cancel
			</Button>
			<Button size="sm" onclick={submit} disabled={submitting}>
				{submitting ? 'Scheduling…' : 'Schedule'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
