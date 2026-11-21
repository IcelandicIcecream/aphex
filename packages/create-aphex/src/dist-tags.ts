import { releaseTag } from './options.js';

async function hasTag(name: string, tag: string): Promise<boolean> {
	try {
		const response = await fetch(`https://registry.npmjs.org/-/package/${name}/dist-tags`);
		if (!response.ok) return true;
		const tags: unknown = await response.json();
		return typeof tags === 'object' && tags !== null && Object.hasOwn(tags, tag);
	} catch {
		// Offline or the registry is down: the install would fail anyway, and say why.
		return true;
	}
}

/**
 * `name@tag` for each package, from the tag this create-aphex was published under. A
 * snapshot only publishes the packages that changed, so one with no such tag (say
 * `@aphexcms/visual-editing@next`) comes from `latest` instead of failing the install.
 */
export async function withReleaseTag(names: string[]): Promise<string[]> {
	if (releaseTag === 'latest') return names.map((name) => `${name}@latest`);
	return Promise.all(
		names.map(async (name) =>
			(await hasTag(name, releaseTag)) ? `${name}@${releaseTag}` : `${name}@latest`
		)
	);
}
