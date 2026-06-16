import type { BlogPost } from '$lib/generated-types';

const WORDS_PER_MINUTE = 220;

/** Count words in the text spans of a Portable Text body. */
function countWords(content: BlogPost['content'] | undefined): number {
	if (!Array.isArray(content)) return 0;
	let words = 0;
	for (const block of content) {
		if (block._type !== 'block' || !Array.isArray(block.children)) continue;
		for (const child of block.children) {
			if (typeof child.text === 'string') {
				words += child.text.trim().split(/\s+/).filter(Boolean).length;
			}
		}
	}
	return words;
}

/** Estimated reading time, e.g. "5 min read". Always at least 1 minute. */
export function readingTime(content: BlogPost['content'] | undefined): string {
	const minutes = Math.max(1, Math.round(countWords(content) / WORDS_PER_MINUTE));
	return `${minutes} min read`;
}
