/**
 * The SEO checks, as plain functions: what the dashboard shows and what a test can
 * hold to. One document is checked by `auditDocument`; `markDuplicates` then
 * compares the set, since a duplicate title is a fact about two documents, not one.
 *
 * Every check reads the value the page would really use: the SEO field when it's
 * filled in, else the same fallback the Generate action and the search preview use.
 */
import type { SchemaType } from '@aphexcms/cms-core';
import { readPath } from '@aphexcms/cms-core';
import { resolveDescription, resolveTitle } from './config';

/** Google shows about this many characters of a title before cutting it off. */
export const TITLE_MAX = 60;
/** …and of a description. */
export const DESCRIPTION_MAX = 160;
/** Below this a description reads as unfinished, and Google often writes its own. */
export const DESCRIPTION_MIN = 50;
/** The width share cards are made for (1200×630); smaller ones show soft or small. */
export const SHARE_IMAGE_WIDTH = 1200;

export type Severity = 'error' | 'warning';

export type IssueCode =
	| 'no-title'
	| 'title-long'
	| 'duplicate-title'
	| 'no-description'
	| 'description-long'
	| 'description-short'
	| 'duplicate-description'
	| 'no-image'
	| 'image-small'
	| 'image-shape'
	| 'missing-alt';

export interface SeoIssue {
	code: IssueCode;
	severity: Severity;
	/** One line, written for the person fixing it. */
	message: string;
}

/** What the audit needs to know about an uploaded image. */
export interface AssetInfo {
	alt: string | null;
	width: number | null;
	height: number | null;
	/** `false` for a PDF or a video: only pictures need alt text. */
	isImage: boolean;
}

export interface DocumentAudit {
	id: string;
	type: string;
	typeTitle: string;
	/** The document's own name, for the list. */
	name: string;
	/** The title and description the page will use. */
	title: string;
	description: string;
	/** Hidden from search on purpose: not a problem, but worth seeing. */
	hidden: boolean;
	issues: SeoIssue[];
	status: 'good' | Severity;
}

/** The groups the dashboard sums issues into, in the order they matter. */
export const ISSUE_GROUPS: { code: IssueCode; label: string }[] = [
	{ code: 'no-title', label: 'No title' },
	{ code: 'no-description', label: 'No description' },
	{ code: 'duplicate-title', label: 'Same title as another page' },
	{ code: 'duplicate-description', label: 'Same description as another page' },
	{ code: 'title-long', label: 'Title gets cut off' },
	{ code: 'description-long', label: 'Description gets cut off' },
	{ code: 'description-short', label: 'Description is very short' },
	{ code: 'missing-alt', label: 'Images without alt text' },
	{ code: 'no-image', label: 'No share image' },
	{ code: 'image-small', label: 'Share image is small' },
	{ code: 'image-shape', label: 'Share image gets cropped' }
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

/** The asset id an image or file value points at, if it has one. */
function assetRef(value: unknown): string | null {
	if (!isRecord(value) || !isRecord(value.asset)) return null;
	const ref = value.asset._ref;
	return typeof ref === 'string' && ref ? ref : null;
}

const IMAGE_FIELDS = ['coverImage', 'mainImage', 'image', 'avatar', 'photo'];

/** The image a share card uses: the SEO image, else the document's own main picture. */
export function shareImage(doc: Record<string, unknown>, schema?: SchemaType): unknown {
	const seo = isRecord(doc.seo) ? doc.seo : {};
	if (assetRef(seo.ogImage)) return seo.ogImage;
	const path = schema?.preview?.select?.media;
	const media = path ? readPath(doc, path) : undefined;
	if (assetRef(media)) return media;
	return IMAGE_FIELDS.map((name) => doc[name]).find((value) => assetRef(value));
}

/**
 * Every placed picture in a document, with its own alt text. The SEO image is left
 * out: it's drawn on someone else's site, not on this page.
 */
export function placedImages(value: unknown, skip = true): { ref: string; alt: string }[] {
	if (Array.isArray(value)) return value.flatMap((item) => placedImages(item, false));
	if (!isRecord(value)) return [];
	const ref = assetRef(value);
	if (ref && value._type !== 'file') return [{ ref, alt: text(value.alt) }];
	return Object.entries(value).flatMap(([key, inner]) =>
		skip && key === 'seo' ? [] : placedImages(inner, false)
	);
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Check one document. `assets` is the site's image library, by id. */
export function auditDocument(
	doc: Record<string, unknown>,
	schema: SchemaType,
	assets: ReadonlyMap<string, AssetInfo>
): DocumentAudit {
	const seo = isRecord(doc.seo) ? doc.seo : {};
	const issues: SeoIssue[] = [];

	const title = text(seo.metaTitle) || resolveTitle(doc, schema);
	if (!title) issues.push({ code: 'no-title', severity: 'error', message: 'No title' });
	else if (title.length > TITLE_MAX)
		issues.push({
			code: 'title-long',
			severity: 'warning',
			message: `Title is ${title.length} characters; Google shows about ${TITLE_MAX}`
		});

	const description = text(seo.metaDescription) || resolveDescription(doc, schema);
	if (!description)
		issues.push({ code: 'no-description', severity: 'error', message: 'No description' });
	else if (description.length > DESCRIPTION_MAX)
		issues.push({
			code: 'description-long',
			severity: 'warning',
			message: `Description is ${description.length} characters; Google shows about ${DESCRIPTION_MAX}`
		});
	else if (description.length < DESCRIPTION_MIN)
		issues.push({
			code: 'description-short',
			severity: 'warning',
			message: `Description is only ${plural(description.length, 'character')}`
		});

	const image = shareImage(doc, schema);
	const imageRef = assetRef(image);
	const imageInfo = imageRef ? assets.get(imageRef) : undefined;
	if (!imageRef) issues.push({ code: 'no-image', severity: 'warning', message: 'No share image' });
	else if (imageInfo?.width && imageInfo.height) {
		const ratio = imageInfo.width / imageInfo.height;
		if (imageInfo.width < SHARE_IMAGE_WIDTH)
			issues.push({
				code: 'image-small',
				severity: 'warning',
				message: `Share image is ${imageInfo.width}×${imageInfo.height}; cards are made for 1200×630`
			});
		else if (ratio < 1.5 || ratio > 2.2)
			issues.push({
				code: 'image-shape',
				severity: 'warning',
				message: `Share image is ${imageInfo.width}×${imageInfo.height}, so cards crop it to 1.91:1`
			});
	}

	const noAlt = placedImages(doc).filter(({ ref, alt }) => {
		const asset = assets.get(ref);
		return asset?.isImage === true && !alt && !text(asset.alt);
	}).length;
	if (noAlt > 0)
		issues.push({
			code: 'missing-alt',
			severity: 'warning',
			message: `${plural(noAlt, 'image')} without alt text`
		});

	return {
		id: typeof doc.id === 'string' ? doc.id : '',
		type: schema.name,
		typeTitle: schema.title ?? schema.name,
		name: resolveTitle(doc, schema) || 'Untitled',
		title,
		description,
		hidden: seo.noIndex === true,
		issues,
		status: statusOf(issues)
	};
}

function statusOf(issues: SeoIssue[]): DocumentAudit['status'] {
	if (issues.some((issue) => issue.severity === 'error')) return 'error';
	return issues.length > 0 ? 'warning' : 'good';
}

/**
 * Flag documents that share a title or a description. Search engines pick one of a
 * pair and drop the other, so both are flagged, each naming the other. Documents
 * hidden from search don't count: they can't compete.
 */
export function markDuplicates(audits: DocumentAudit[]): DocumentAudit[] {
	const key = (value: string) => value.toLowerCase().replace(/\s+/g, ' ');
	const holders = (pick: (a: DocumentAudit) => string) => {
		const map = new Map<string, DocumentAudit[]>();
		for (const audit of audits) {
			const value = pick(audit);
			if (!value || audit.hidden) continue;
			map.set(key(value), [...(map.get(key(value)) ?? []), audit]);
		}
		return map;
	};
	const titles = holders((a) => a.title);
	const descriptions = holders((a) => a.description);

	return audits.map((audit) => {
		if (audit.hidden) return audit;
		const others = (map: Map<string, DocumentAudit[]>, value: string) =>
			(map.get(key(value)) ?? []).filter((other) => other !== audit);
		const issues = [...audit.issues];
		const named = (list: DocumentAudit[]) => {
			const [first, ...rest] = list;
			if (!first) return null;
			return `“${first.name}”${rest.length > 0 ? ` and ${plural(rest.length, 'other')}` : ''}`;
		};
		const sameTitle = named(audit.title ? others(titles, audit.title) : []);
		if (sameTitle)
			issues.push({
				code: 'duplicate-title',
				severity: 'warning',
				message: `Same title as ${sameTitle}`
			});
		const sameDescription = named(audit.description ? others(descriptions, audit.description) : []);
		if (sameDescription)
			issues.push({
				code: 'duplicate-description',
				severity: 'warning',
				message: `Same description as ${sameDescription}`
			});
		return { ...audit, issues, status: statusOf(issues) };
	});
}

/** How many documents have each kind of issue, in `ISSUE_GROUPS` order, empty ones left out. */
export function issueCounts(
	audits: DocumentAudit[]
): { code: IssueCode; label: string; count: number }[] {
	return ISSUE_GROUPS.map((group) => ({
		...group,
		count: audits.filter((a) => a.issues.some((issue) => issue.code === group.code)).length
	})).filter((group) => group.count > 0);
}
