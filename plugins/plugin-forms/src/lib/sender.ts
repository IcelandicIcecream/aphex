import type { LocalAPI, LocalAPIContext } from '@aphexcms/cms-core/server';

/**
 * Who a site's form emails are from, and who hears about them by default.
 *
 * One app often runs many sites, all sending from the same verified address. The
 * site's name goes in front of it (`"Lily's Bakery" <forms@example.com>`), so a
 * customer sees who wrote to them, while the address stays the one the app's mail
 * provider has verified. Asked when a form is submitted and kept with the
 * submission, like the rest of what its emails need.
 */
export interface FormSite {
	/** The site's name, shown as the sender of every email about its forms. */
	name?: string | null;
	/**
	 * The site's own address: where a form that names nobody sends its messages,
	 * and where a customer's reply to their confirmation goes.
	 */
	email?: string | null;
}

export type FormSiteResolver = (site: {
	organizationId: string;
	/** A system context for that organization, for reading its settings. */
	context: LocalAPIContext;
	localAPI: LocalAPI;
}) => FormSite | null | undefined | Promise<FormSite | null | undefined>;

const ADDRESS = /^[^\s@,<>"]+@[^\s@,<>"]+\.[^\s@,<>"]+$/;

/** Whether a string is one plain email address, safe for a header. */
export function isEmailAddress(value: unknown): value is string {
	return typeof value === 'string' && ADDRESS.test(value.trim());
}

/**
 * The From header for a site: its name in front of the app's address.
 * `Aphex <hello@aphex.site>` with "Lily's Bakery" becomes
 * `"Lily's Bakery" <hello@aphex.site>`. Without a name, the app's own header.
 */
export function fromHeader(appFrom: string, siteName?: string | null): string {
	const name = (siteName ?? '')
		.replace(/["<>\\\r\n]/g, '')
		.trim()
		.slice(0, 100);
	if (!name) return appFrom;
	const address = /<([^<>]+)>\s*$/.exec(appFrom)?.[1]?.trim() ?? appFrom.trim();
	return isEmailAddress(address) ? `"${name}" <${address}>` : appFrom;
}
