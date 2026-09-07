# @aphexcms/storage-s3

S3-compatible storage adapter for [AphexCMS](https://github.com/IcelandicIcecream/aphex) — Cloudflare R2, AWS S3, MinIO, and anything else speaking the S3 API.

Implements the `StorageAdapter` contract from `@aphexcms/cms-core`. Without it, Aphex stores uploads on the local filesystem, which is fine in development and wrong on any platform with an ephemeral disk.

📚 **Documentation: [docs.getaphex.com/storage](https://docs.getaphex.com/storage)**

## Install

```bash
pnpm add @aphexcms/storage-s3
```

## Quick start

```ts title="src/lib/server/storage/index.ts"
import { s3Storage } from '@aphexcms/storage-s3';
import { env } from '$env/dynamic/private';

export const storageAdapter = s3Storage({
	bucket: env.R2_BUCKET,
	endpoint: env.R2_ENDPOINT,
	accessKeyId: env.R2_ACCESS_KEY_ID,
	secretAccessKey: env.R2_SECRET_ACCESS_KEY,
	publicUrl: env.R2_PUBLIC_URL
}).adapter;
```

```ts title="aphex.config.ts"
import { storageAdapter } from './src/lib/server/storage';

export default createCMSConfig({
	schemaTypes,
	database: db,
	storage: storageAdapter
});
```

## What `publicUrl` is for

Assets are addressed through your app by default, which means every image is proxied through a function invocation. `publicUrl` (or `R2_CDN_URL` for a custom domain) points asset URLs straight at the bucket instead, so the bytes never touch your server.

Keep it unset if the bucket is private and you want every read to go through Aphex's access control.

## Signed downloads and direct uploads

The adapter implements the optional parts of `StorageAdapter` that make the two heavier paths work:

- **`getSignedUploadUrl`** — lets large uploads go browser-to-bucket, skipping the request-size ceiling on your platform. Enable it with the `upload` option in `createCMSConfig`.
- **`getObjectRange`** — lets Aphex inspect the first bytes of a direct upload to verify its real content type, rather than trusting what the browser claimed.

## Note on development

This package is consumed from `dist`, not from source — a change here needs a rebuild and a dev-server restart before the studio sees it.

## License

MIT
