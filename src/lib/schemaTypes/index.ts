// Sanity-style schema registry
import page from './page.js';
import textBlock from './textBlock.js';
import imageBlock from './imageBlock.js';
import callToAction from './callToAction.js';
import hero from './hero.js';
import seo from './seo.js';
import simpleDoc from './simpleDoc.js';
import catalog from './catalog.js';
import catalogItem from './catalogItem.js';
import catalogBlock from './catalogBlock.js';
import referenceToPage from './referenceToPage.js';

export const schemaTypes = [
  // Document types
  page,
  simpleDoc,
  catalog,
  referenceToPage,


  // Object types (used in other schemas)
  textBlock,
  imageBlock,
  callToAction,
  catalogBlock,
  catalogItem,
  hero,
  seo
];
