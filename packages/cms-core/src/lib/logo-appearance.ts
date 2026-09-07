/** Whether a transparent, near-black logo needs inversion on a dark surface. */
export function shouldInvertLogoOnDark(metadata: Record<string, any> | null | undefined): boolean {
	if (metadata?.hasAlpha !== true) return false;

	const { r, g, b } = metadata.dominantColor ?? {};
	if (![r, g, b].every((channel) => typeof channel === 'number' && Number.isFinite(channel))) {
		return false;
	}

	const channels = [r, g, b] as number[];
	return Math.max(...channels) <= 72 && Math.max(...channels) - Math.min(...channels) <= 24;
}
