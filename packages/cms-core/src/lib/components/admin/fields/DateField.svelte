<script lang="ts">
	import CalendarIcon from '@lucide/svelte/icons/calendar';
	import { type DateValue, parseDate } from '@internationalized/date';
	import { Input } from '@aphexcms/ui/shadcn/input';
	import { Calendar } from '@aphexcms/ui/shadcn/calendar';
	import * as Popover from '@aphexcms/ui/shadcn/popover';
	import type { DateField } from '../../../types/schemas';
	import dayjs from 'dayjs';
	import customParseFormat from 'dayjs/plugin/customParseFormat';

	// Enable strict parsing
	dayjs.extend(customParseFormat);

	interface Props {
		field: DateField;
		value: string | null; // Always stored as ISO YYYY-MM-DD
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

	// Get date format from options or use default
	const dateFormat = $derived(field.options?.dateFormat || 'YYYY-MM-DD');

	// Track local input value for display
	let inputValue = $state('');

	// Convert stored ISO value to display format
	// Only update if the formatted value is different to avoid overwriting user input
	$effect(() => {
		if (!value || value === '') {
			if (inputValue !== '') {
				inputValue = '';
			}
		} else {
			// Convert ISO (YYYY-MM-DD) to display format
			const date = dayjs(value, 'YYYY-MM-DD', true);
			if (date.isValid()) {
				const formatted = date.format(dateFormat);
				// Only update if different to avoid overwriting user's in-progress typing
				if (inputValue !== formatted) {
					inputValue = formatted;
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
			// Value is stored as ISO date string (YYYY-MM-DD)
			return parseDate(value);
		} catch (err) {
			console.error('Failed to parse date:', value, err);
			return undefined;
		}
	});

	// Handle date selection from calendar
	function handleDateChange(newValue: DateValue | undefined) {
		if (!newValue) {
			onUpdate(null);
		} else {
			// Convert DateValue to ISO string (YYYY-MM-DD) for storage
			const isoString = newValue.toString();
			onUpdate(isoString);
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

		// Parse according to the chosen format
		const parsed = dayjs(displayValue, dateFormat, true);

		if (parsed.isValid()) {
			// Convert to ISO for storage
			const isoString = parsed.format('YYYY-MM-DD');
			onUpdate(isoString);
		} else {
			// Still update with the invalid value so autosave triggers
			// Validation will catch the error
			onUpdate(displayValue);
		}
	}
</script>

<div class="space-y-2">
	<div class="flex w-full gap-2">
		<Input
			id={field.name}
			type="text"
			placeholder={dateFormat}
			value={inputValue}
			oninput={handleInputChange}
			onblur={onBlur}
			onfocus={onFocus}
			class="flex-1 {validationClasses}"
			disabled={readonly}
		/>
		<Popover.Root>
			<Popover.Trigger
				class="inline-flex h-10 w-10 items-center justify-center whitespace-nowrap rounded-md border border-input bg-background text-sm font-medium ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
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
			</Popover.Content>
		</Popover.Root>
	</div>
</div>
