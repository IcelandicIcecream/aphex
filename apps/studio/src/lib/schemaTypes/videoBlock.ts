import type { SchemaType } from '@aphexcms/cms-core';

/**
 * A self-hosted video, playable in portable text.
 *
 * The video itself is a `file` field rather than a dedicated type: an asset is an
 * asset, and the reference shape (`{ asset: { _ref } }`) is what makes URL
 * injection, the reference index and the delete guard all work without knowing
 * this block exists.
 *
 * The poster is a separate `image` field on purpose. A browser cannot show a
 * frame until it has fetched part of the video, so a poster-less video is a black
 * rectangle until play is pressed — and on a listing page that is several
 * megabytes of fetch per video just to render a thumbnail.
 */
export const videoBlock: SchemaType = {
	type: 'object',
	name: 'videoBlock',
	title: 'Video',
	description: 'A self-hosted video with an optional poster image',
	fields: [
		{
			name: 'file',
			type: 'file',
			title: 'Video file',
			description: 'MP4 (H.264) plays everywhere; WebM is a good second source',
			accept: ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'],
			validation: (Rule) => Rule.required()
		},
		{
			name: 'poster',
			type: 'image',
			title: 'Poster image',
			description:
				'Shown before playback. Without one the player is blank until the viewer presses play.'
		},
		{
			name: 'caption',
			type: 'string',
			title: 'Caption'
		},
		{
			name: 'autoplay',
			type: 'boolean',
			title: 'Autoplay',
			description: 'Browsers only allow autoplay when the video is also muted.'
		},
		{
			name: 'loop',
			type: 'boolean',
			title: 'Loop'
		},
		{
			name: 'muted',
			type: 'boolean',
			title: 'Muted'
		}
	]
};

export default videoBlock;
