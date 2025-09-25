import type { SchemaType } from "$lib/cms/types";
import hero from './hero.js';
import seo from './seo.js';

export const page: SchemaType = {
  type: 'document',
  name: 'page',
  title: 'Page',
  description: 'Website pages with Hero, Content blocks, and SEO',
  fields: [
    {
      name: 'title',
      type: 'string',
      title: 'Page Title',
      description: 'The main title of the page',
      validation: Rule => Rule.required().max(100)
    },
    {
      name: 'slug',
      type: 'slug',
      title: 'URL Slug',
      description: 'The URL path for this page',
      source: 'title',
      validation: Rule => Rule.required()
    },
    {
      name: 'hero',
      type: 'object',
      title: 'Hero Section',
      fields: hero.fields
    },
    {
      name: 'content',
      type: 'array',
      title: 'Content Blocks',
      description: 'Flexible content sections',
      of: [
        { type: 'textBlock' },
        { type: 'imageBlock' },
        { type: 'callToAction' }
      ]
    },
    {
      name: 'seo',
      type: 'object',
      title: 'SEO Settings',
      fields: seo.fields
    },
    {
      name: 'published',
      type: 'boolean',
      title: 'Published',
      description: 'Whether this page is publicly visible',
      initialValue: false
    }
  ]
};

export default page;
