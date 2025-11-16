import './utils-gGoUUMc2.js';
import './storage-_ubboXxO.js';
import 'sharp';
import { s as schemaTypes } from './index6-BnUmswa-.js';
import { authProvider } from './index4-DKPpYvdn.js';
import { d as db } from './index3-D3XGwzxA.js';
import { e as email } from './instance2-stPrjck3.js';

function createCMSConfig(config) {
  return {
    // Start with the user's config and apply defaults for missing properties
    ...config,
    storage: config.storage ?? null,
    // Default to null if not provided
    customization: {
      branding: {
        title: "Aphex CMS",
        ...config.customization?.branding
      },
      ...config.customization
    },
    plugins: config.plugins ?? []
  };
}
function createLazyGraphQLPlugin(options = {}) {
  return {
    name: "@aphexcms/graphql-plugin",
    version: "0.1.0",
    config: options,
    async install(cms) {
      const { createGraphQLPlugin } = await import('@aphexcms/graphql-plugin');
      const actualPlugin = createGraphQLPlugin(options);
      if (actualPlugin.install) {
        await actualPlugin.install(cms);
      }
    }
  };
}
const graphqlPlugin = createLazyGraphQLPlugin({
  endpoint: "/api/graphql",
  enableGraphiQL: true,
  defaultPerspective: "draft"
});
const cmsConfig = createCMSConfig({
  schemaTypes,
  // Provide the shared database and storage adapter instances directly.
  // These are created once in their respective /lib/server/.. files.
  database: db,
  // storage: storageAdapter, <-- defaults to local if not added. - to enable setup storageAdapter in ./src/lib/server/storage
  auth: {
    provider: authProvider,
    loginUrl: "/login"
    // Redirect here when unauthenticated
  },
  // GraphQL plugin with lazy loading - bundle stays small via dynamic import in install()
  plugins: [graphqlPlugin],
  customization: {
    branding: {
      title: "Aphex - Base Template"
    }
  },
  email
});

export { cmsConfig as c };
//# sourceMappingURL=aphex.config-m9M2q4ce.js.map
