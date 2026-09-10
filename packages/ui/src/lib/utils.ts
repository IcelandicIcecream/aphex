import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * A v4 UUID that also works outside a secure context.
 *
 * `crypto.randomUUID` is only defined on HTTPS or `localhost`, so opening the
 * dev server's Network URL (`vite dev --host` prints one) from a phone or
 * another machine leaves it `undefined` and every call throws. Kept here rather
 * than imported from `@aphexcms/cms-core` because the dependency runs the other
 * way — cms-core consumes this package.
 */
export function randomId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}

	if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
		const bytes = crypto.getRandomValues(new Uint8Array(16));
		const hex = Array.from(bytes, (byte, index) => {
			const value = index === 6 ? (byte & 0x0f) | 0x40 : index === 8 ? (byte & 0x3f) | 0x80 : byte;
			return value.toString(16).padStart(2, '0');
		}).join('');

		return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
	}

	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, 'child'> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, 'children'> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };
