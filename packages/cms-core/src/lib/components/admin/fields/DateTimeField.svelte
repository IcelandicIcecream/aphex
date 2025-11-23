<script lang="ts">
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import { type DateValue, parseDate } from '@internationalized/date';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Button } from '@aphexcms/ui/shadcn/button';
	import { Calendar } from '@aphexcms/ui/shadcn/calendar';
	import * as Popover from '@aphexcms/ui/shadcn/popover';
	import type { DateTimeField } from '../../../types/schemas';
	import dayjs from 'dayjs';
	import customParseFormat from 'dayjs/plugin/customParseFormat';
	import utc from 'dayjs/plugin/utc';

	// Enable strict parsing and UTC
	dayjs.extend(customParseFormat);
	dayjs.extend(utc);

	interface Props {
		field: DateTimeField;
		value: string | null; // Always stored as ISO datetime UTC YYYY-MM-DDTHH:mm:ssZ
		onUpdate: (value: string | null) => void;
		validationClasses?: string;
		onBlur?: (event: any) => void;
		onFocus?: (event: any) => void;
		readonly?: boolean;
	}

	let {
		field,
		value,
		onUpdate,
		validationClasses,
		onBlur,
		onFocus,
		readonly = false
	}: Props = $props();

	// Get date and time formats from options or use defaults
	const dateFormat = $derived(field.options?.dateFormat || 'YYYY-MM-DD');
	const timeFormat = $derived(field.options?.timeFormat || 'HH:mm');
	const displayFormat = $derived(`${dateFormat} ${timeFormat}`);

	// Track local input value for display
	let inputValue = $state('');
	let timeValue = $state('00:00');

	// Convert stored ISO value to display format
	// Only update if the formatted value is different to avoid overwriting user input
	$effect(() => {
		if (!value || value === '') {
			if (inputValue !== '') {
				inputValue = '';
				timeValue = '00:00';
			}
		} else {
			// Parse the datetime value
			const datetime = dayjs(value);
			if (datetime.isValid()) {
				const formatted = datetime.format(displayFormat);
				const time = datetime.format('HH:mm');
				// Only update if different to avoid overwriting user's in-progress typing
				if (inputValue !== formatted) {
					inputValue = formatted;
				}
				if (timeValue !== time) {
					timeValue = time;
				}
			} else {
				// Value is not ISO (might be user's in-progress input or invalid)
				if (inputValue !== value) {
					inputValue = value;
				}
			}
		}
	});

	// Convert string value to DateValue for calendar
	const dateValue = $derived.by(() => {
		if (!value || value === '') return undefined;

		try {
			// Parse datetime and extract just the date part
			const datetime = dayjs(value);
			if (datetime.isValid()) {
				return parseDate(datetime.format('YYYY-MM-DD'));
			}
		} catch (err) {
			console.error('Failed to parse datetime:', value, err);
		}
		return undefined;
	});

	// Handle date selection from calendar
	function handleDateChange(newValue: DateValue | undefined) {
		if (!newValue) {
			onUpdate(null);
		} else {
			// Combine selected date with current time and convert to UTC
			const dateStr = newValue.toString(); // YYYY-MM-DD
			const localDatetime = dayjs(`${dateStr} ${timeValue}`, 'YYYY-MM-DD HH:mm');
			const utcDatetime = localDatetime.utc().format('YYYY-MM-DDTHH:mm:ss[Z]');
			onUpdate(utcDatetime);
		}
	}

	// Handle manual input changes
	function handleInputChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const displayValue = target.value;
		inputValue = displayValue;

		if (displayValue === '') {
			onUpdate(null);
			return;
		}

		// Parse according to the chosen format (date + time)
		const parsed = dayjs(displayValue, displayFormat, true);

		if (parsed.isValid()) {
			// Convert to ISO datetime UTC
			const utcDatetime = parsed.utc().format('YYYY-MM-DDTHH:mm:ss[Z]');
			onUpdate(utcDatetime);
			// Update time value for picker
			timeValue = parsed.format('HH:mm');
		} else {
			// Still update with the invalid value so autosave triggers
			// Validation will catch the error
			onUpdate(displayValue);
		}
	}

	// Handle time input changes
	function handleTimeChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const newTime = target.value; // HH:mm format
		timeValue = newTime;

		// If we have a date, update the datetime
		if (value && value !== '') {
			const datetime = dayjs(value);
			if (datetime.isValid()) {
				// Get the local date and combine with new time, then convert to UTC
				const dateStr = datetime.format('YYYY-MM-DD');
				const localDatetime = dayjs(`${dateStr} ${newTime}`, 'YYYY-MM-DD HH:mm');
				const utcDatetime = localDatetime.utc().format('YYYY-MM-DDTHH:mm:ss[Z]');
				onUpdate(utcDatetime);
			}
		}
	}

	// Set to current time
	function setToCurrentTime() {
		const now = dayjs();
		timeValue = now.format('HH:mm');

		// If we have a date, update the datetime
		if (value && value !== '') {
			const datetime = dayjs(value);
			if (datetime.isValid()) {
				// Get the local date and combine with current time, then convert to UTC
				const dateStr = datetime.format('YYYY-MM-DD');
				const localDatetime = dayjs(`${dateStr} ${timeValue}`, 'YYYY-MM-DD HH:mm');
				const utcDatetime = localDatetime.utc().format('YYYY-MM-DDTHH:mm:ss[Z]');
				onUpdate(utcDatetime);
			}
		}
	}
</script>

<div class="space-y-2">
	<div class="flex w-full gap-2">
		<Input
			id={field.name}
			type="text"
			placeholder={displayFormat}
			value={inputValue}
			oninput={handleInputChange}
			onblur={onBlur}
			onfocus={onFocus}
			class="flex-1 {validationClasses}"
			disabled={readonly}
		/>
		<Popover.Root>
			<Popover.Trigger
				class="border-input bg-background ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring inline-flex h-10 w-10 items-center justify-center whitespace-nowrap rounded-md border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
				disabled={readonly}
			>
				<CalendarIcon class="h-4 w-4" />
			</Popover.Trigger>
			<Popover.Content class="w-auto p-0">
				<Calendar
					type="single"
					value={dateValue}
					onValueChange={handleDateChange}
					captionLayout="dropdown"
				/>

				<!-- Time Picker Section -->
				<div class="border-border border-t">
					<div class="flex items-center gap-2 p-3">
						<div class="flex-1">
							<Input
								type="time"
								value={timeValue}
								oninput={handleTimeChange}
								aria-label="Select time"
								disabled={readonly}
								class="w-full"
							/>
						</div>
						<Button
							variant="outline"
							size="sm"
							onclick={setToCurrentTime}
							disabled={readonly}
							type="button"
						>
							Set to now
						</Button>
					</div>
				</div>
			</Popover.Content>
		</Popover.Root>
	</div>
</div>
