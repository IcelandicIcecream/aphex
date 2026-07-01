// Schema Registry — blog starter (inspired by the reference studio).
// Field types: string, text, number, boolean, slug, image, file, date, datetime, url, array, object, reference

import blogPost from './blogPost.js';
import author from './author.js';
import tag from './tag.js';
import page from './page.js';
import siteSettings from './siteSettings.js';

export const schemaTypes = [blogPost, page, author, tag, siteSettings];
