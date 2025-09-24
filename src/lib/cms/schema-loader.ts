// Auto-discovery schema loader - like Sanity's build process
import { glob } from 'glob';
import path from 'path';
import type { Collection, Block } from './types.js';

interface SchemaType {
  type: 'collection' | 'block' | 'object';
  name: string;
  [key: string]: any;
}

/**
 * Dynamically loads all schema files from schemaTypes directory
 * This mimics Sanity's auto-import behavior
 */
export async function loadSchemas(): Promise<{
  collections: Collection[];
  blocks: Block[];
  objects: any[];
}> {
  const schemaDir = path.resolve('src/lib/schemaTypes');

  // Find all .ts/.js files in schemaTypes directory (excluding index)
  const schemaFiles = await glob('**/*.{ts,js}', {
    cwd: schemaDir,
    ignore: ['index.ts', 'index.js']
  });

  console.log('📁 Found schema files:', schemaFiles);

  const schemas: SchemaType[] = [];

  // Dynamically import each schema file
  for (const file of schemaFiles) {
    try {
      const filePath = path.join(schemaDir, file);
      const module = await import(filePath);

      // Get default export or named export
      const schema = module.default || module[path.basename(file, path.extname(file))];

      if (schema && typeof schema === 'object') {
        schemas.push(schema);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to load schema file ${file}:`, error);
    }
  }

  // Separate by type
  const collections = schemas.filter(s => s.type === 'collection') as Collection[];
  const blocks = schemas.filter(s => s.type === 'block') as Block[];
  const objects = schemas.filter(s => s.type === 'object');

  console.log('📚 Loaded schemas:', {
    collections: collections.map(c => c.name),
    blocks: blocks.map(b => b.name),
    objects: objects.map(o => o.name)
  });

  return { collections, blocks, objects };
}

/**
 * Alternative approach: Use Vite's import.meta.glob for better HMR support
 * This works at build time and enables hot reloading
 */
export function createSchemaLoader() {
  if (typeof window === 'undefined' && typeof import.meta !== 'undefined') {
    // Use Vite's glob imports for automatic discovery
    const schemaModules = import.meta.glob('../schemaTypes/**/*.{ts,js}', {
      eager: true,
      import: 'default'
    });

    const schemas: SchemaType[] = [];

    for (const [path, schema] of Object.entries(schemaModules)) {
      if (schema && typeof schema === 'object') {
        schemas.push(schema as SchemaType);
      }
    }

    return {
      collections: schemas.filter(s => s.type === 'collection') as Collection[],
      blocks: schemas.filter(s => s.type === 'block') as Block[],
      objects: schemas.filter(s => s.type === 'object')
    };
  }

  // Fallback for runtime loading
  return { collections: [], blocks: [], objects: [] };
}