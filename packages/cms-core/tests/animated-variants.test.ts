import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import { AnimatedSourceError, encodeVariant } from '../src/lib/images/generate';
import {
	animationFits,
	canGenerateVariants,
	MAX_ANIMATED_FRAMES,
	MAX_ANIMATED_PIXELS
} from '../src/lib/images/variants';

/** A small animated GIF: `frames` solid frames of different colours. */
async function animatedGif(frames: number, width: number, height: number): Promise<Buffer> {
	const stills = await Promise.all(
		Array.from({ length: frames }, (_, i) =>
			sharp({
				create: { width, height, channels: 3, background: { r: (i * 60) % 256, g: 120, b: 200 } }
			})
				.png()
				.toBuffer()
		)
	);
	return sharp(stills, { join: { animated: true } })
		.gif()
		.toBuffer();
}

const image = (pages: number, width: number | null, height: number | null) => ({
	assetType: 'image' as const,
	mimeType: 'image/gif',
	width,
	height,
	metadata: { pages }
});

describe('canGenerateVariants for animations', () => {
	it('offers sizes for an animation within the caps', () => {
		// aphex.site's hero: 329 frames at 1280×720, 303M pixels.
		expect(canGenerateVariants(image(329, 1280, 720))).toBe(true);
	});

	it('serves an animation past either cap as-is', () => {
		expect(canGenerateVariants(image(MAX_ANIMATED_FRAMES + 1, 16, 16))).toBe(false);
		expect(canGenerateVariants(image(600, 1920, 1080))).toBe(false);
		expect(animationFits(1, MAX_ANIMATED_PIXELS + 1, 1)).toBe(false);
	});

	it('serves an animation of unknown size as-is', () => {
		expect(canGenerateVariants(image(20, null, null))).toBe(false);
	});

	it('still offers sizes for a still', () => {
		expect(canGenerateVariants(image(1, 4000, 3000))).toBe(true);
	});
});

describe('encodeVariant', () => {
	it('resizes every frame of an animation and keeps it animated', async () => {
		const source = await animatedGif(6, 400, 200);
		const out = await encodeVariant(source, 100, 75);

		expect(out).toMatchObject({ width: 100, height: 50, frames: 6 });
		const meta = await sharp(out.data).metadata();
		expect(meta.format).toBe('webp');
		expect(meta.pages).toBe(6);
		expect(meta.width).toBe(100);
	});

	it('resizes a still to one frame', async () => {
		const source = await sharp({
			create: { width: 400, height: 300, channels: 3, background: '#336699' }
		})
			.jpeg()
			.toBuffer();
		const out = await encodeVariant(source, 200, 75);

		expect(out).toMatchObject({ width: 200, height: 150, frames: 1 });
		expect((await sharp(out.data).metadata()).pages ?? 1).toBe(1);
	});

	it('refuses an animation past the caps rather than flattening it', async () => {
		const source = await animatedGif(MAX_ANIMATED_FRAMES + 1, 2, 2);
		await expect(encodeVariant(source, 1, 75)).rejects.toBeInstanceOf(AnimatedSourceError);
	});
});
