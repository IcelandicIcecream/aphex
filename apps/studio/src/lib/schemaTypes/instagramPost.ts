import type { SchemaType } from '@aphexcms/cms-core';
import { Instagram } from '@lucide/svelte';

export const instagramPost: SchemaType = {
	type: 'document',
	name: 'instagram_post',
	title: 'Instagram Post',
	description: 'Instagram post with media, caption, and engagement data',
	preview: {
        "select": {
            "title": "postId",
        }
	},
	icon: Instagram,
	fields: [
		{
			name: 'postId',
			type: 'string',
			title: 'Post ID',
			description: 'Unique identifier from Instagram',
			validation: (Rule) => Rule.required()
		},
		{
			name: 'mediaType',
			type: 'string',
			title: 'Media Type',
			description: 'Type of media content',
			initialValue: 'image',
			list: [
				{ title: 'Image', value: 'image' },
				{ title: 'Video', value: 'video' },
				{ title: 'Carousel', value: 'carousel' },
				{ title: 'Reel', value: 'reel' }
			],
			options: {
				layout: 'radio'
			},
			validation: (Rule) => Rule.required()
		},
		{
			name: 'quality',
			type: 'string',
			title: 'Media Quality',
			description: 'Quality settings based on media type',
			initialValue: 'standard',
			list: {
				dependsOn: 'mediaType',
				options: {
					image: [
						{ title: 'Standard (1080x1080)', value: 'standard' },
						{ title: 'High (1440x1440)', value: 'high' },
						{ title: 'Original', value: 'original' }
					],
					video: [
						{ title: '720p', value: '720p' },
						{ title: '1080p', value: '1080p' },
						{ title: '4K', value: '4k' }
					],
					carousel: [
						{ title: 'Standard (1080x1080)', value: 'standard' },
						{ title: 'High (1440x1440)', value: 'high' }
					],
					reel: [
						{ title: '720p', value: '720p' },
						{ title: '1080p (Recommended)', value: '1080p' },
						{ title: '4K', value: '4k' }
					]
				}
			}
		},
		{
			name: 'media',
			type: 'array',
			title: 'Media Files',
			description: 'Images or videos in this post',
			of: [
				{
					type: 'object',
					name: 'mediaItem',
					title: 'Media Item',
					fields: [
						{
							name: 'url',
							type: 'url',
							title: 'Media URL',
							validation: (Rule) => Rule.required()
						},
						{
							name: 'altText',
							type: 'string',
							title: 'Alt Text',
							description: 'Accessibility description'
						},
						{
							name: 'width',
							type: 'number',
							title: 'Width'
						},
						{
							name: 'height',
							type: 'number',
							title: 'Height'
						},
						{
							name: 'thumbnail',
							type: 'url',
							title: 'Thumbnail URL',
							description: 'For videos'
						}
					]
				}
			],
			validation: (Rule) => Rule.required().min(1)
		},
		{
			name: 'caption',
			type: 'text',
			title: 'Caption',
			description: 'Post caption text',
			rows: 5,
			validation: (Rule) => Rule.max(2200)
		},
		{
			name: 'hashtags',
			type: 'array',
			title: 'Hashtags',
			description: 'Tags used in the post',
			of: [{ type: 'string' }]
		},
		{
			name: 'mentions',
			type: 'array',
			title: 'Mentions',
			description: 'Users mentioned in the post',
			of: [
				{
					type: 'object',
					fields: [
						{
							name: 'username',
							type: 'string',
							title: 'Username',
							validation: (Rule) => Rule.required()
						},
						{
							name: 'userId',
							type: 'string',
							title: 'User ID'
						}
					]
				}
			]
		},
		{
			name: 'location',
			type: 'object',
			title: 'Location',
			description: 'Tagged location',
			fields: [
				{
					name: 'name',
					type: 'string',
					title: 'Location Name'
				},
				{
					name: 'locationId',
					type: 'string',
					title: 'Location ID'
				},
				{
					name: 'latitude',
					type: 'number',
					title: 'Latitude'
				},
				{
					name: 'longitude',
					type: 'number',
					title: 'Longitude'
				}
			]
		},
		{
			name: 'permalink',
			type: 'url',
			title: 'Permalink',
			description: 'Direct link to the Instagram post',
			validation: (Rule) => Rule.required()
		},
		{
			name: 'publishedDate',
			type: 'datetime',
			title: 'Published Date',
			description: 'When the post was published on Instagram',
			options: {
				dateFormat: 'MM/DD/YYYY',
			},
		},
		{
			name: 'engagement',
			type: 'object',
			title: 'Engagement Metrics',
			description: 'Likes, comments, and shares',
			fields: [
				{
					name: 'likes',
					type: 'number',
					title: 'Likes Count',
					initialValue: 0,
					validation: (Rule) => Rule.min(0)
				},
				{
					name: 'comments',
					type: 'number',
					title: 'Comments Count',
					initialValue: 0,
					validation: (Rule) => Rule.min(0)
				},
				{
					name: 'saves',
					type: 'number',
					title: 'Saves Count',
					initialValue: 0,
					validation: (Rule) => Rule.min(0)
				},
				{
					name: 'shares',
					type: 'number',
					title: 'Shares Count',
					initialValue: 0,
					validation: (Rule) => Rule.min(0)
				},
				{
					name: 'reach',
					type: 'number',
					title: 'Reach',
					description: 'Number of unique accounts reached',
					validation: (Rule) => Rule.min(0)
				},
				{
					name: 'impressions',
					type: 'number',
					title: 'Impressions',
					description: 'Total number of times the post was seen',
					validation: (Rule) => Rule.min(0)
				},
				{
					name: 'plays',
					type: 'number',
					title: 'Video Plays',
					description: 'For video posts only',
					validation: (Rule) => Rule.min(0)
				}
			]
		},
		{
			name: 'isArchived',
			type: 'boolean',
			title: 'Archived',
			description: 'Whether this post has been archived',
			initialValue: false
		},
		{
			name: 'isPinned',
			type: 'boolean',
			title: 'Pinned',
			description: 'Whether this post is pinned to profile',
			initialValue: false
		}
	]
};

export default instagramPost;
