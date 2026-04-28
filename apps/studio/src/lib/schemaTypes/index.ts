// Sanity-style schema registry
import page from './page.js';
import agent from './agent.js';
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
import movie from './movie.js';
import instagramPost from './instagramPost.js';
import { initialValueTest } from './initialValueTest.js';
import testProduct from './testProduct.js';
import dataImport from './dataImport.js';
import edm from './edm.js';
import richContentBlock from './richContentBlock.js';
import siteNavigation from './siteNavigation.js';

export const schemaTypes = [
	// Document types
	page,
	simpleDoc,
	catalog,
	referenceToPage,
	movie,
	agent,
	instagramPost,
	initialValueTest,
	testProduct,
	dataImport,
	edm,
	siteNavigation,

	// Object types (used in other schemas)
	textBlock,
	imageBlock,
	callToAction,
	catalogBlock,
	catalogItem,
	hero,
	seo,
	richContentBlock
];
