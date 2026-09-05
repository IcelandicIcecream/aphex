/**
 * Read a video's duration, real pixel dimensions and a representative frame —
 * in the browser, from the file the user just picked.
 *
 * Done here rather than on the server because the alternative is ffmpeg: a large
 * native dependency, awkward on serverless, and a build-time burden for every
 * self-hoster who never uploads a video. The browser already has a demuxer and a
 * decoder for exactly the formats it can play, and at upload time the file is
 * local — no download, no storage round-trip.
 *
 * What it cannot do is the honest tradeoff: a codec this browser can't decode
 * (or a server-side/API upload, which never runs this) yields nothing. Every
 * field is therefore optional, and callers must render a video with no poster
 * and no duration rather than treating absence as an error.
 */

export interface VideoInfo {
	/** Seconds. Absent for streams the browser reports as unbounded or unknown. */
	duration?: number;
	width?: number;
	height?: number;
	/** A frame from early in the video, for use as a poster. */
	poster?: Blob;
}

/** Give up rather than hang a queue on a file the browser silently won't decode. */
const TIMEOUT_MS = 10_000;

/**
 * Where to grab the poster frame from.
 *
 * Not 0: the first frame of a video is very often black, a fade-in, or a slate,
 * which makes for a poster that identifies nothing. A little way in is far more
 * likely to be representative — capped so a long recording doesn't seek minutes
 * deep, which would mean fetching that far into the file.
 */
function posterTimestamp(duration: number): number {
	if (!Number.isFinite(duration) || duration <= 0) return 0;
	return Math.min(duration * 0.1, 3);
}

export async function extractVideoInfo(file: File): Promise<VideoInfo> {
	if (typeof document === 'undefined' || !file.type.startsWith('video/')) return {};

	const objectUrl = URL.createObjectURL(file);
	const video = document.createElement('video');
	// Muted + playsinline are what make programmatic seeking work on iOS Safari,
	// which otherwise refuses to decode without a user gesture.
	video.muted = true;
	video.playsInline = true;
	video.preload = 'metadata';
	video.src = objectUrl;

	try {
		const metadata = await once(video, 'loadedmetadata', TIMEOUT_MS);
		if (!metadata) return {};

		const info: VideoInfo = {
			duration: Number.isFinite(video.duration) && video.duration > 0 ? video.duration : undefined,
			width: video.videoWidth || undefined,
			height: video.videoHeight || undefined
		};

		// The frame is a bonus, never a reason to lose the metadata above: a
		// browser may expose duration and dimensions yet refuse to paint a frame
		// (a codec it can demux but not decode, or a tainted canvas).
		try {
			info.poster = await captureFrame(video, posterTimestamp(video.duration));
		} catch {
			/* no poster; duration and dimensions still stand */
		}

		return info;
	} catch {
		return {};
	} finally {
		video.removeAttribute('src');
		video.load();
		URL.revokeObjectURL(objectUrl);
	}
}

async function captureFrame(video: HTMLVideoElement, time: number): Promise<Blob | undefined> {
	video.currentTime = time;
	if (!(await once(video, 'seeked', TIMEOUT_MS))) return undefined;

	const canvas = document.createElement('canvas');
	canvas.width = video.videoWidth;
	canvas.height = video.videoHeight;
	if (!canvas.width || !canvas.height) return undefined;

	const context = canvas.getContext('2d');
	if (!context) return undefined;
	context.drawImage(video, 0, 0, canvas.width, canvas.height);

	return new Promise<Blob | undefined>((resolve) => {
		// WebP over JPEG: a poster is a thumbnail, and the size difference is worth
		// more than the marginal compatibility, which every target browser has.
		canvas.toBlob((blob) => resolve(blob ?? undefined), 'image/webp', 0.8);
	});
}

/**
 * Resolve on an event, or `false` on timeout or error.
 *
 * A rejected promise would be wrong: none of these are exceptional. A video the
 * browser can't decode is an ordinary outcome, and the caller's response is the
 * same as for a plain file — upload it without extras.
 */
function once(target: HTMLVideoElement, event: string, timeoutMs: number): Promise<boolean> {
	return new Promise((resolve) => {
		const done = (result: boolean) => {
			clearTimeout(timer);
			target.removeEventListener(event, onEvent);
			target.removeEventListener('error', onError);
			resolve(result);
		};
		const onEvent = () => done(true);
		const onError = () => done(false);
		const timer = setTimeout(() => done(false), timeoutMs);
		target.addEventListener(event, onEvent, { once: true });
		target.addEventListener('error', onError, { once: true });
	});
}

/**
 * Read duration, dimensions and a poster frame from a video already in storage.
 *
 * For assets uploaded before posters existed, or through the API, where no
 * browser ever saw the file. Only viable because `/media/:id/:filename` serves
 * byte ranges: the browser fetches the container header and the frames around
 * the seek point, not the whole video. Against a 200-only server this would
 * download the entire file to grab one frame.
 *
 * `crossOrigin` is left unset deliberately — the media route is same-origin, and
 * a canvas tainted by a cross-origin frame throws on `toBlob` rather than
 * returning anything.
 */
export async function extractVideoInfoFromUrl(url: string): Promise<VideoInfo> {
	if (typeof document === 'undefined') return {};

	const video = document.createElement('video');
	video.muted = true;
	video.playsInline = true;
	video.preload = 'metadata';
	video.src = url;

	try {
		if (!(await once(video, 'loadedmetadata', TIMEOUT_MS))) return {};

		// Duration and dimensions come off the same event as the frame, so an
		// existing video gets all three from one pass. Returning only the poster
		// here — as this did at first — left every pre-existing video with a
		// thumbnail and a blank duration, for no saving whatsoever.
		const info: VideoInfo = {
			duration: Number.isFinite(video.duration) && video.duration > 0 ? video.duration : undefined,
			width: video.videoWidth || undefined,
			height: video.videoHeight || undefined
		};

		try {
			info.poster = await captureFrame(video, posterTimestamp(video.duration));
		} catch {
			/* metadata still stands without a frame */
		}

		return info;
	} catch {
		return {};
	} finally {
		video.removeAttribute('src');
		video.load();
	}
}
