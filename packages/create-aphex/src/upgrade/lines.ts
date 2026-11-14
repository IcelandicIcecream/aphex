import { createHash } from 'node:crypto';

/**
 * A short hash of one line, ignoring its indentation. The manifest lists the hash of
 * every line any shipped version of a file had, so the upgrade can show which lines
 * of a changed file are the person's own without shipping the old files themselves.
 */
export function lineHash(line: string): string {
	return createHash('sha1').update(line.trim()).digest('hex').slice(0, 8);
}

/** The lines worth comparing: blank lines carry no meaning. */
export function meaningfulLines(source: string): string[] {
	return source.split(/\r?\n/).filter((line) => line.trim() !== '');
}
