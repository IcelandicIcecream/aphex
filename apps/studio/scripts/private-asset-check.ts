/**
 * End-to-end check for private assets + signed URLs, against a running server.
 *
 *   pnpm -F @aphexcms/studio private-asset-check <assetId> <filename>
 *
 * Deliberately HTTP-only: it reads no database and changes nothing. The setup it
 * needs is an asset uploaded *through a field marked `private: true`*, because
 * that is what records the field context the media route reads. Do that in the
 * admin first, then pass the id here.
 *
 * `$env/dynamic/private` is a Vite virtual module, so a tsx script cannot import
 * the app's db layer even if it wanted to — which is just as well, since the
 * alternative was editing metadata on real content to fake a private asset.
 */
import { signAssetUrl } from '@aphexcms/cms-core/server';

const BASE = process.env.APHEX_PUBLIC_URL ?? 'http://localhost:5173';

const [assetId, filename] = process.argv.slice(2);
if (!assetId || !filename) {
	console.error('usage: private-asset-check <assetId> <filename>');
	process.exit(1);
}

const secret = process.env.APHEX_ASSET_SIGNING_SECRET;
if (!secret) {
	console.error('APHEX_ASSET_SIGNING_SECRET is not set — nothing to verify.');
	process.exit(1);
}

const path = `/media/${assetId}/${encodeURIComponent(filename)}`;

async function check(label: string, url: string, expected: number) {
	// `redirect: 'manual'` so a signedDownloads redirect shows as a 302 rather
	// than silently following to the bucket and reporting its status.
	const res = await fetch(url, { redirect: 'manual' });
	const ok = res.status === expected ? 'PASS' : 'FAIL';
	console.log(`${ok}  ${label.padEnd(28)} ${res.status}  (expect ${expected})`);
	return res.status === expected;
}

const sign = (id: string, expiresIn: number) =>
	`${BASE}${signAssetUrl(secret, path, id, { expiresIn })}`;

const results = [
	// No signature, no session — the whole point of marking a field private.
	await check('unsigned', `${BASE}${path}`, 401),
	await check('signed', sign(assetId, 300), 200),
	// A signature is for one asset, so one minted for a different id must not open this.
	await check(
		'signature for another asset',
		sign('00000000-0000-4000-8000-000000000000', 300),
		401
	),
	// The deadline is inside the signature, so an expired one cannot be revived.
	await check('expired signature', sign(assetId, -60), 401),
	// Tampering with the expiry invalidates the signature rather than extending it.
	await check(
		'tampered expiry',
		sign(assetId, 300).replace(/exp=\d+/, `exp=${Math.floor(Date.now() / 1000) + 99999}`),
		401
	)
];

console.log(results.every(Boolean) ? '\nall checks passed' : '\nFAILURES — see above');
process.exit(results.every(Boolean) ? 0 : 1);
