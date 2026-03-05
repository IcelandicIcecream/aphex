// Schema Registry
// ================
// Define your content schemas here and add them to the array below.
// Each schema is either a 'document' (top-level entity) or an 'object' (reusable nested structure).
//
// See the Aphex CMS docs for available field types:
// string, text, number, boolean, slug, image, date, datetime, url, array, object, reference

import post from './post.js';

export const schemaTypes = [post];
