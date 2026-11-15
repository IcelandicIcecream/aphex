import { z } from 'zod';

// The signed query the OAuth flow passes from page to page. The auth provider checks
// its signature; here it only has to be present and of a sane size.
const oauthQuerySchema = z.string().min(1).max(8192);

// ---------- POST /oauth/site ----------

export const chooseOAuthSiteRequest = z.object({
	oauthQuery: oauthQuerySchema,
	organizationId: z.string().min(1)
});
export type ChooseOAuthSiteRequest = z.infer<typeof chooseOAuthSiteRequest>;

// ---------- POST /oauth/consent ----------

export const oauthConsentRequest = z.object({
	oauthQuery: oauthQuerySchema,
	accept: z.boolean()
});
export type OAuthConsentRequest = z.infer<typeof oauthConsentRequest>;
