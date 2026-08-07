// Schema registry for the test suite.
//
// A frozen snapshot, deliberately separate from `src/lib/schemaTypes`. The app's
// registry is a scratchpad — schemas get commented out to shape the blog
// template, fields gain `Rule.required()` while someone is trying something out
// — and every one of those edits used to break the core test suite, which asserts
// things like version history and singleton behaviour that have nothing to do
// with content modelling.
//
// The rule: **tests own their schemas.** Change `src/lib/schemaTypes` freely; if
// a test needs a schema shape, it belongs here instead. Nothing in the app reads
// this file, and nothing here reads the app.
//
// Everything is registered, including the schemas the app comments out — tests
// reference `movie`, `catalog`, `menu`, `siteNavigation`, `player`, `team` and
// `league`, which the app's registry currently omits.

import blogPost from './blogPost.js';
import author from './author.js';
import tag from './tag.js';
import page from './page.js';
import siteSettings from './siteSettings.js';
import agent from './agent.js';
import textBlock from './textBlock.js';
import imageBlock from './imageBlock.js';
import callToAction from './callToAction.js';
import hero from './hero.js';
import seo from './seo.js';
import simpleDoc from './simpleDoc.js';
import catalog from './catalog.js';
import catalogItem from './catalogItem.js';
import menu from './menu.js';
import menuItem from './menuItem.js';
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
import player from './player.js';
import team from './team.js';
import league from './league.js';
import strictDoc from './strictDoc.js';
import chainNode from './chainNode.js';
import hookedDoc from './hookedDoc.js';

export const schemaTypes = [
	blogPost,
	page,
	author,
	tag,
	siteSettings,
	simpleDoc,
	catalog,
	catalogItem,
	menu,
	menuItem,
	referenceToPage,
	player,
	team,
	league,
	movie,
	agent,
	instagramPost,
	initialValueTest,
	testProduct,
	dataImport,
	edm,
	siteNavigation,
	textBlock,
	imageBlock,
	callToAction,
	catalogBlock,
	hero,
	seo,
	richContentBlock,

	// Purpose-built validation / reference / hook fixtures
	strictDoc,
	chainNode,
	hookedDoc
];
