import type { SchemaType } from '@aphex/cms-core';

export const movie: SchemaType = {
	type: 'document',
	name: 'movie',
	title: 'Movie',
	description: 'A movie with title, release date, and details',
	fields: [
		{
			name: 'title',
			type: 'string',
			title: 'Movie Title',
			description: 'The title of the movie',
			validation: (Rule) => Rule.required().max(200)
		},
		{
			name: 'releaseDate',
			type: 'string',
			title: 'Release Date',
			description: 'When the movie was released',
			validation: (Rule) => Rule.required()
		},
		{
			name: 'director',
			type: 'string',
			title: 'Director',
			description: 'Director of the movie'
		},
		{
			name: 'synopsis',
			type: 'text',
			title: 'Synopsis',
			description: 'Plot summary',
			rows: 5
		},
		{
			name: 'poster',
			type: 'image',
			title: 'Movie Poster'
		}
	],
	preview: {
		select: {
			title: 'releaseDate',
			media: 'poster'
		}
	}
};

export default movie;
