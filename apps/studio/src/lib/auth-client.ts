// Better Auth client for Svelte
import { createAuthClient } from 'better-auth/svelte';
import { apiKeyClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
	// Base URL is same domain, so we don't need to specify it
	plugins: [
		apiKeyClient() // Enable API key management from client
	]
});

// Export specific methods for convenience
export const {
	signIn,
	signUp,
	signOut,
	useSession,
	apiKey // API key management methods
} = authClient;
