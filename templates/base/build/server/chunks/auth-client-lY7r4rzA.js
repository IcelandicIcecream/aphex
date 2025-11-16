import { createAuthClient } from 'better-auth/svelte';
import { apiKeyClient } from 'better-auth/client/plugins';

const authClient = createAuthClient({
  // Base URL is same domain, so we don't need to specify it
  plugins: [
    apiKeyClient()
    // Enable API key management from client
  ]
});
const {
  signIn,
  signUp,
  signOut,
  useSession,
  apiKey
  // API key management methods
} = authClient;

export { authClient as a };
//# sourceMappingURL=auth-client-lY7r4rzA.js.map
