# Preview Feature Documentation

## Overview

Added support for custom preview titles and subtitles in schema definitions, similar to Sanity Studio's preview configuration. The preview configuration is used throughout the CMS interface including document lists and the document editor header.

## Changes Made

### 1. Type Definitions (`packages/cms-core/src/types/schemas.ts`)

Added `PreviewConfig` interface:

```typescript
export interface PreviewConfig {
	select?: {
		title?: string; // Field name to use for preview title
		subtitle?: string; // Field name to use for preview subtitle
		media?: string; // Field name to use for preview media/image
	};
}
```

Added `preview?: PreviewConfig` to:

- `DocumentType`
- `ObjectType`
- `SchemaType`
- `NewSchemaType`

### 2. AdminApp Component (`packages/cms-core/src/components/AdminApp.svelte`)

Updated `fetchDocuments()` to:

- Read preview config from schema
- Use preview.select.title for document title in lists
- Use preview.select.subtitle for document subtitle in lists
- Falls back to `title` field if no preview config

Updated document list rendering to:

- Display subtitle from preview config with higher priority than slug/status

### 3. DocumentEditor Component (`packages/cms-core/src/components/admin/DocumentEditor.svelte`)

Added `getPreviewTitle()` function to:

- Use preview.select.title for document header
- Use preview.select.title for auto-save notifications
- Falls back to `title` field if no preview config

### 4. Example Usage

Created `apps/studio/src/lib/schemaTypes/movie.ts` demonstrating the feature:

```typescript
export const movie: SchemaType = {
	type: 'document',
	name: 'movie',
	title: 'Movie',
	fields: [
		{ name: 'title', type: 'string', title: 'Movie Title' },
		{ name: 'releaseDate', type: 'string', title: 'Release Date' },
		{ name: 'poster', type: 'image', title: 'Movie Poster' }
	],
	preview: {
		select: {
			title: 'title',
			subtitle: 'releaseDate', // Uses a different field for subtitle
			media: 'poster'
		}
	}
};
```

## Usage

The `preview` configuration allows you to specify which fields to display in lists and previews:

- **title**: The main preview title (can be any string field)
- **subtitle**: Additional context (e.g., date, author, status)
- **media**: An image field to show as thumbnail

This is especially useful when you want to show metadata in the preview that differs from the document title, such as release dates, publication dates, authors, or status information.

## Where Preview is Used

1. **Document Lists**: Shows preview title and subtitle for each document
2. **Document Editor Header**: Shows preview title at the top of the editor
3. **Auto-save Notifications**: Uses preview title when notifying of auto-saves
