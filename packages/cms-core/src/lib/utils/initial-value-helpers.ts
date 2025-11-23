import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

dayjs.extend(utc);

/**
 * Helper functions for initialValue date/datetime patterns
 * These can be used directly as initialValue in field definitions
 *
 * Note: Returns values in storage format (ISO),
 * which will be converted to the user's configured display format by the field components
 */

// ==================== Date Helpers ====================

/**
 * Returns the current date in YYYY-MM-DD format (storage format)
 * Usage: initialValue: currentDate
 */
export function currentDate(): string {
	return dayjs().format('YYYY-MM-DD');
}

/**
 * Returns a specific date offset from today
 * Usage: initialValue: () => dateFromToday(7) // 7 days from now
 * Usage: initialValue: () => dateFromToday(-7) // 7 days ago
 */
export function dateFromToday(days: number): string {
	return dayjs().add(days, 'day').format('YYYY-MM-DD');
}

/**
 * Returns the first day of the current month
 * Usage: initialValue: firstDayOfMonth
 */
export function firstDayOfMonth(): string {
	return dayjs().startOf('month').format('YYYY-MM-DD');
}

/**
 * Returns the last day of the current month
 * Usage: initialValue: lastDayOfMonth
 */
export function lastDayOfMonth(): string {
	return dayjs().endOf('month').format('YYYY-MM-DD');
}

// ==================== DateTime Helpers ====================

/**
 * Returns the current datetime in ISO UTC format (storage format)
 * Usage: initialValue: currentDateTime
 */
export function currentDateTime(): string {
	return dayjs().utc().format('YYYY-MM-DDTHH:mm:ss[Z]');
}

/**
 * Returns a datetime offset from now in ISO UTC format
 * Usage: initialValue: () => dateTimeFromNow(1, 'hour') // 1 hour from now
 * Usage: initialValue: () => dateTimeFromNow(-30, 'minute') // 30 minutes ago
 */
export function dateTimeFromNow(
	amount: number,
	unit: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'
): string {
	return dayjs().add(amount, unit).utc().format('YYYY-MM-DDTHH:mm:ss[Z]');
}

/**
 * Returns the start of the current day in ISO UTC format
 * Usage: initialValue: startOfToday
 */
export function startOfToday(): string {
	return dayjs().startOf('day').utc().format('YYYY-MM-DDTHH:mm:ss[Z]');
}

/**
 * Returns the end of the current day in ISO UTC format
 * Usage: initialValue: endOfToday
 */
export function endOfToday(): string {
	return dayjs().endOf('day').utc().format('YYYY-MM-DDTHH:mm:ss[Z]');
}
