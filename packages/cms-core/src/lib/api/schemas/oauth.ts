import { z } from 'zod';
import { OAUTH_OPT_IN_CAPABILITIES } from '../../types/capabilities';

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

// ---------- PATCH /settings/connected-apps/:clientId ----------

const optInIds = Object.keys(OAUTH_OPT_IN_CAPABILITIES) as [
	keyof typeof OAUTH_OPT_IN_CAPABILITIES,
	...(keyof typeof OAUTH_OPT_IN_CAPABILITIES)[]
];

/** What the user switches on for one connected app, replacing what was on. */
export const connectedAppAllowedRequest = z.object({
	allowed: z.array(z.enum(optInIds)).max(optInIds.length)
});
export type ConnectedAppAllowedRequest = z.infer<typeof connectedAppAllowedRequest>;
