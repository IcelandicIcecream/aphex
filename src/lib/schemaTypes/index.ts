// Sanity-style schema registry
import page from './page.js';
import textBlock from './textBlock.js';
import imageBlock from './imageBlock.js';
import callToAction from './callToAction.js';
import hero from './hero.js';
import seo from './seo.js';

export const schemaTypes = [
  // Document types
  page,

  // Object types (used in other schemas)
  textBlock,
  imageBlock,
  callToAction,
  hero,
  seo
];
