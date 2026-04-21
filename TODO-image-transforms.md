# Image Transforms via CDN

## Goal

Add on-the-fly image transformation to the asset CDN endpoint. Users can request resized, reformatted, and quality-adjusted images via query params.

## API

```
/assets/{id}/{filename}                    → original
/assets/{id}/{filename}?w=400              → resize to 400px wide (auto height)
/assets/{id}/{filename}?w=800&h=600        → resize to 800x600
/assets/{id}/{filename}?w=800&f=webp       → resize + convert to webp
/assets/{id}/{filename}?q=60&f=webp        → quality 60 webp (original size)
/assets/{id}/{filename}?w=400&q=80&f=avif  → resize + quality 80 + avif
```

### Query Params

| Param | Description                                                               | Default         |
| ----- | ------------------------------------------------------------------------- | --------------- |
| `w`   | Width in pixels                                                           | original        |
| `h`   | Height in pixels (optional, auto-calculated from aspect ratio if omitted) | auto            |
| `q`   | Quality 1-100                                                             | 80              |
| `f`   | Format: `webp`, `avif`, `png`, `jpeg`                                     | original format |
| `fit` | Resize fit: `cover`, `contain`, `fill`, `inside`, `outside`               | `inside`        |

## Implementation

### Where

`packages/cms-core/src/lib/routes/assets-cdn.ts` — after fetching the file buffer, before responding.

### How

1. Parse query params from the request URL
2. If no transform params AND it's an image → serve original (current behavior)
3. If transform params exist AND `mimeType` starts with `image/`:
   - Pipe buffer through `sharp`
   - Apply resize if `w` or `h` set
   - Apply format conversion if `f` set
   - Apply quality if `q` set
   - Update `Content-Type` header
4. For S3/R2 redirects: can't transform — either skip transforms or proxy the file through the server

### Code sketch

```typescript
import sharp from 'sharp';

// Inside GET handler, after getting fileBuffer:
const width = url.searchParams.get('w') ? parseInt(url.searchParams.get('w')!) : undefined;
const height = url.searchParams.get('h') ? parseInt(url.searchParams.get('h')!) : undefined;
const quality = parseInt(url.searchParams.get('q') || '80');
const format = url.searchParams.get('f') as 'webp' | 'avif' | 'png' | 'jpeg' | null;
const fit = (url.searchParams.get('fit') || 'inside') as sharp.FitEnum;

const hasTransforms = width || height || format;

if (hasTransforms && asset.mimeType?.startsWith('image/')) {
	let pipeline = sharp(fileBuffer);

	if (width || height) {
		pipeline = pipeline.resize(width, height, { fit, withoutEnlargement: true });
	}

	if (format) {
		pipeline = pipeline.toFormat(format, { quality });
	} else {
		// Apply quality to original format
		const originalFormat = asset.mimeType.split('/')[1];
		pipeline = pipeline.toFormat(originalFormat as any, { quality });
	}

	const transformed = await pipeline.toBuffer();
	const contentType = format ? `image/${format}` : asset.mimeType;

	return new Response(transformed, {
		headers: {
			'Content-Type': contentType,
			'Cache-Control': 'public, max-age=31536000, immutable'
		}
	});
}
```

### Client helper

```typescript
// packages/cms-core/src/lib/utils/image-url.ts
export function imageUrl(
	assetPath: string,
	options?: {
		width?: number;
		height?: number;
		quality?: number;
		format?: 'webp' | 'avif' | 'png' | 'jpeg';
		fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
	}
): string {
	if (!assetPath || !options) return assetPath;

	const params = new URLSearchParams();
	if (options.width) params.set('w', String(options.width));
	if (options.height) params.set('h', String(options.height));
	if (options.quality) params.set('q', String(options.quality));
	if (options.format) params.set('f', options.format);
	if (options.fit) params.set('fit', options.fit);

	const qs = params.toString();
	return qs ? `${assetPath}?${qs}` : assetPath;
}
```

### Caching

Transformed images should be cached to avoid re-processing on every request. Options:

1. **In-memory via CacheAdapter** — cache the transformed buffer keyed by `asset:{id}:{w}:{h}:{q}:{f}`. Fast but memory-heavy for large images.
2. **Disk cache** — write transformed images to a temp directory. Survives restarts.
3. **CDN-level** — the `Cache-Control: immutable` header already tells CDNs/browsers to cache. If behind Cloudflare/Vercel, this handles it.

Option 3 (CDN-level) is sufficient for most cases. Option 1 can be added later for high-traffic scenarios.

### S3/R2 consideration

Currently S3/R2 assets redirect (`302`) to the storage URL. To support transforms for S3 assets, the server would need to proxy the file instead of redirecting — fetch from S3, transform, respond. This adds latency but enables transforms for all storage backends.

### Dependencies

- `sharp` — already in the project (listed in `ssr.external`)
- No new packages needed

### Effort

~1-2 hours. Mostly the CDN route changes + client helper + tests.
