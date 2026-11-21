// Connecting an app (Claude, ChatGPT) with OAuth, and the apps already connected.
import { apiClient } from './client';
import type { ApiResponse } from './types';
import type {
	ChooseOAuthSiteRequest,
	ConnectedAppAllowedRequest,
	OAuthConsentRequest
} from './schemas/oauth';
import type { OAuthConnection } from '../auth/provider';

/** Where the browser goes next in the flow. */
export interface OAuthNext {
	url: string;
}

export const oauth = {
	chooseSite: (body: ChooseOAuthSiteRequest): Promise<ApiResponse<OAuthNext>> =>
		apiClient.post<OAuthNext>('/oauth/site', body),
	consent: (body: OAuthConsentRequest): Promise<ApiResponse<OAuthNext>> =>
		apiClient.post<OAuthNext>('/oauth/consent', body),
	connections: (): Promise<ApiResponse<OAuthConnection[]>> =>
		apiClient.get<OAuthConnection[]>('/settings/connected-apps'),
	setAllowed: (clientId: string, body: ConnectedAppAllowedRequest): Promise<ApiResponse<void>> =>
		apiClient.patch<void>(`/settings/connected-apps/${encodeURIComponent(clientId)}`, body),
	disconnect: (clientId: string): Promise<ApiResponse<void>> =>
		apiClient.delete<void>(`/settings/connected-apps/${encodeURIComponent(clientId)}`)
};
