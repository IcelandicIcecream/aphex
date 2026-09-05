/**
 * Mint a signed `/media/...` URL for an asset, from the command line.
 *
 * Signing needs the secret, so it can only happen server-side — this is the
 * smallest way to get a real signed URL in your hands without first building a
 * page that produces one.
 *
 *   pnpm -F @aphexcms/studio sign-url <assetId> [filename] [--expires 3600]
 *
 * Prints the path and a full localhost URL. Pair it with the unsigned URL to see
 * both halves of the check:
 *
 *   curl -s -o /dev/null -w '%{http_code}\n' 'http://localhost:5173/media/<id>/<file>'
 *   curl -s -o /dev/null -w '%{http_code}\n' '<the signed URL this prints>'
 *
 * A private asset answers 401 to the first and 200 to the second.
 */
import { signAssetUrl } from '@aphexcms/cms-core/server';

const [assetId, maybeFilename] = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));

if (!assetId) {
	console.error('usage: sign-asset-url <assetId> [filename] [--expires <seconds>]');
	process.exit(1);
}

const expiresFlag = process.argv.indexOf('--expires');
const expiresIn = expiresFlag === -1 ? 900 : Number(process.argv[expiresFlag + 1]);

const secret = process.env.APHEX_ASSET_SIGNING_SECRET;
if (!secret) {
	// Being loud about this matters: without a secret `signAssetUrl` returns the
	// URL untouched, which looks like success and then 401s. Fail closed, and say so.
	console.error(
		'APHEX_ASSET_SIGNING_SECRET is not set — signing would silently return an unsigned URL.\n' +
			'Add it to apps/studio/.env. Generate one with:\n' +
			"  node -e \"console.log(require('crypto').randomBytes(32).toString('base64url'))\""
	);
	process.exit(1);
}

// The filename segment is cosmetic — the route resolves the asset by id — so any
// placeholder works when you don't have the real one to hand.
const filename = maybeFilename ?? 'file';
const path = signAssetUrl(secret, `/media/${assetId}/${filename}`, assetId, { expiresIn });

const base = process.env.APHEX_PUBLIC_URL ?? 'http://localhost:5173';
console.log(path);
console.log(`${base}${path}`);
console.error(`\n(valid for ${expiresIn}s)`);
