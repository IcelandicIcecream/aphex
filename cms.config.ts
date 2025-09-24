// CMS Configuration - Auto-loads schemas from schemaTypes
import { DATABASE_URL } from '$env/static/private';
import { defineCMSConfig } from './src/lib/cms/define.js';
import { schemaTypes } from './src/lib/schemaTypes/index.js';

// Auto-generate collections and blocks from schemaTypes
const collections = schemaTypes.filter(type => type.type === 'collection');
const blocks = schemaTypes.filter(type => type.type === 'block');

console.log('🔄 Auto-loaded schemas:', {
  collections: collections.map(c => c.name),
  blocks: blocks.map(b => b.name)
});

// Main CMS configuration - now uses auto-discovered schemas
export default defineCMSConfig({
  collections,
  blocks,
  database: {
    url: DATABASE_URL || 'postgresql://cms_user:cms_password@localhost:5432/cms_db'
  },
  media: {
    uploadDir: './static/uploads',
    maxFileSize: 10 * 1024 * 1024 // 10MB
  }
});
