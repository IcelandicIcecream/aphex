/**
 * Aphex Cloud control plane API client.
 *
 * Authenticates with projectId + token and fetches the provisioned
 * infrastructure credentials for this project.
 */

export interface CloudCredentials {
	database: {
		url: string;
		poolOptions?: {
			max?: number;
			idle_timeout?: number;
			connect_timeout?: number;
		};
	};
	storage: {
		bucket: string;
		endpoint: string;
		accessKeyId: string;
		secretAccessKey: string;
		region: string;
		publicUrl: string;
	};
	email: {
		from: string;
		apiEndpoint: string;
		apiKey: string;
	};
	auth: {
		issuer: string;
		loginUrl: string;
	};
}

export interface CloudClientConfig {
	projectId: string;
	token: string;
	/** Override the control plane URL (defaults to https://api.cloud.getaphex.com) */
	apiUrl?: string;
}

const DEFAULT_API_URL = 'https://api.cloud.getaphex.com';

export class CloudClient {
	private projectId: string;
	private token: string;
	private apiUrl: string;
	private credentials: CloudCredentials | null = null;

	constructor(config: CloudClientConfig) {
		this.projectId = config.projectId;
		this.token = config.token;
		this.apiUrl = config.apiUrl ?? DEFAULT_API_URL;
	}

	/**
	 * Fetch provisioned credentials from the control plane.
	 * Results are cached for the lifetime of this client instance.
	 */
	async getCredentials(): Promise<CloudCredentials> {
		if (this.credentials) return this.credentials;

		const response = await fetch(
			`${this.apiUrl}/api/projects/${this.projectId}/credentials`,
			{
				headers: {
					Authorization: `Bearer ${this.token}`,
					'Content-Type': 'application/json'
				}
			}
		);

		if (!response.ok) {
			const body = await response.text().catch(() => '');
			throw new Error(
				`Aphex Cloud: failed to fetch project credentials (${response.status}). ` +
					`Ensure your projectId and token are correct. ${body}`
			);
		}

		this.credentials = (await response.json()) as CloudCredentials;
		return this.credentials;
	}

	/** Report deployment health back to the control plane. */
	async reportHealth(status: { healthy: boolean; version?: string }): Promise<void> {
		try {
			await fetch(`${this.apiUrl}/api/projects/${this.projectId}/health`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${this.token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(status)
			});
		} catch {
			// Health reporting is best-effort, don't throw
		}
	}
}
