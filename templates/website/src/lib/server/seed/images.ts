import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/**
 * Where the seed's photographs come from.
 *
 * A demo site needs a handful of *different* real photographs, and this repo
 * shouldn't carry a few megabytes of stock imagery to provide them. Payload's
 * website template solves this by fetching its seed images over HTTP at seed
 * time; this does the same, from picsum.photos, which serves a stable photo per
 * `seed` string — so two runs produce the same site, and no two images are the
 * same picture.
 *
 * The two images that have to look deliberate — the favicon and the hero
 * artwork the headline sits on — are bundled instead, in `./assets/`.
 *
 * The network is not guaranteed, so a failed fetch yields nothing rather than
 * throwing. A seeded site with fewer pictures is a much better outcome than a
 * seed that fails on a plane.
 */

/**
 * Files that ship with the template, in `./assets/`.
 *
 * Resolved relative to this module rather than the working directory: the seed
 * runs from wherever the server was started, and `resolve('static/…')` only
 * happened to work because that was the project root in dev.
 */
const BUNDLED = {
	/** The favicon. */
	mark: { file: 'mark.png', mimeType: 'image/png' },
	/**
	 * The wordmark: black marks on transparency.
	 *
	 * **A PNG, not the SVG it was drawn as.** `image/svg+xml` is blocked by the
	 * CMS's default accepted types, and that default is right: an SVG is a
	 * document, it can carry `<script>` and event handlers, and it is served from
	 * your own origin — so allowing uploads of them hands stored XSS to anyone who
	 * can add media. Rasterising at 800px wide costs a few kilobytes and no
	 * argument. (If you do need SVG, widen the accepted types on the one *field*
	 * rather than globally, and only where you trust every uploader.)
	 *
	 * Black rather than white on purpose: the header renders on a white page
	 * almost everywhere and inverts the logo in the one place it doesn't (over a
	 * full-bleed hero), so authoring it dark means the filter applies on one page
	 * rather than on all of them. Payload's template assumes the same thing with
	 * `invert dark:invert-0`.
	 */
	logo: { file: 'logo.png', mimeType: 'image/png' },
	/**
	 * The hero artwork: a dark topographic wave render.
	 *
	 * A render rather than a stock photograph, and deliberately so — a stock
	 * landscape behind a headline is the most recognisable "template" signal there
	 * is, and it fights the text sitting on it. Payload's website template uses an
	 * abstract dark image for the same reason.
	 *
	 * Very dark overall, with the only bright passage a low band of sunset behind
	 * the ridgeline. Centred white copy sits above that band rather than on it, and
	 * `HighImpact` lays a `bg-black/35` scrim over the whole thing anyway, so the
	 * headline holds without the image being dimmed into mud. Replace it from the
	 * studio.
	 *
	 * A JPEG: continuous tone, no flat colour, no transparency — the exact case
	 * JPEG stores well. 194KB against the 1.5MB lossless PNG it came from, at its
	 * native 1672×941 (no upscaling: enlarging a source adds bytes and no detail).
	 * It ships in the repo, so that size is a permanent cost.
	 */
	hero: { file: 'hero.jpg', mimeType: 'image/jpeg' }
} as const;

const assetsDir = fileURLToPath(new URL('./assets/', import.meta.url));

export interface SeedFile {
	buffer: Buffer;
	originalFilename: string;
	mimeType: string;
}

/** Read one of the bundled fixtures, or null if it isn't there. */
async function bundled(which: keyof typeof BUNDLED): Promise<SeedFile | null> {
	const { file, mimeType } = BUNDLED[which];
	try {
		return {
			buffer: await readFile(assetsDir + file),
			originalFilename: file,
			mimeType
		};
	} catch (cause) {
		console.warn(`[seed] Missing bundled asset ${file}:`, cause);
		return null;
	}
}

/**
 * Fetch a photograph for `seed` at the given size, falling back to the bundled
 * photo. `seed` makes the choice deterministic — the same string always returns
 * the same picture — so re-seeding doesn't reshuffle the whole site.
 */
export async function photo(seed: string, width: number, height: number): Promise<SeedFile | null> {
	const url = `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}`;
	try {
		// A short timeout on purpose: seeding runs inside a request (or on first
		// boot), and a hung image fetch would hold that open. Ten seconds is
		// generous for ~150KB and short enough not to look like a crash.
		const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
		if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
		const buffer = Buffer.from(await response.arrayBuffer());
		return { buffer, originalFilename: `${seed}.jpg`, mimeType: 'image/jpeg' };
	} catch (cause) {
		console.warn(`[seed] Could not fetch ${url} — the article will have no image.`, cause);
		return null;
	}
}

/** The site wordmark. */
export const wordmark = () => bundled('logo');

/**
 * The favicon. Always bundled, never fetched — a random photograph is not a
 * mark, and the one thing that has to look deliberate at 16px is the one thing
 * you cannot leave to chance.
 */
export const mark = () => bundled('mark');

/**
 * The hero artwork. Bundled for the same reason and one more: the headline sits
 * directly on it, so it has to be dark and quiet in a way no random photograph
 * can be relied on to be.
 */
export const heroArt = () => bundled('hero');
