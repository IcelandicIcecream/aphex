/**
 * The route registry — what each mounted endpoint *is*, next to the zod schema
 * that already governs it.
 *
 * This is the one hand-maintained artifact in the OpenAPI pipeline, and it exists
 * because the schemas alone can't say which path they belong to. Everything else
 * (properties, types, required-ness, enums) is derived, so the only thing that can
 * rot here is a missing or stale *row* — which `tests/openapi-registry.test.ts`
 * catches by diffing these keys against Hono's own `app.routes`. Add a route
 * without a row and that test fails.
 *
 * `request`/`query` point at the live zod objects the handler validates with, so a
 * contract change shows up in the spec without anyone editing this file.
 */
import type { ZodType } from 'zod';

import {
	listDocumentsQuery,
	listDocumentsResponse,
	getDocumentsByIdsQuery,
	createDocumentRequest,
	createDocumentResponse,
	getDocumentResponse,
	updateDocumentRequest,
	updateDocumentResponse,
	deleteDocumentResponse,
	publishDocumentRequest,
	publishDocumentResponse,
	unpublishDocumentRequest,
	unpublishDocumentResponse,
	queryDocumentsRequest,
	listVersionsQuery,
	listVersionsResponse,
	getVersionResponse,
	restoreVersionRequest,
	restoreVersionResponse,
	scheduleDocumentRequest,
	scheduleDocumentResponse
} from '../../../api/schemas/documents';
import {
	listAssetsQuery,
	listAssetsResponse,
	getAssetResponse,
	updateAssetRequest,
	updateAssetResponse,
	deleteAssetResponse,
	bulkDeleteAssetsRequest,
	bulkDeleteAssetsResponse,
	getAssetReferencesResponse,
	assetReferenceCountsRequest,
	assetReferenceCountsResponse,
	createUploadUrlRequest,
	confirmUploadRequest
} from '../../../api/schemas/assets';
import {
	createOrganizationRequest,
	updateOrganizationRequest,
	switchOrganizationRequest,
	inviteMemberRequest,
	cancelInvitationRequest,
	removeMemberRequest,
	updateMemberRoleRequest
} from '../../../api/schemas/organizations';
import { createRoleRequest, updateRoleRequest } from '../../../api/schemas/roles';
import {
	updateUserRequest,
	updateUserPreferencesRequest,
	requestPasswordResetRequest,
	resetPasswordRequest
} from '../../../api/schemas/user';
import { jobActionRequestSchema } from '../../../api/schemas/jobs';
import { savePluginSettingsRequest } from '../../../api/schemas/plugin-settings';
import { agentChatRequest } from '../../../api/schemas/agent-chat';
import { recordWorkspaceOperationRequest } from '../../../api/schemas/agent-operations';
import { listJobsQuery, listEventsQuery, healthQuery } from '../routes/jobs';
import { listChangeSetsQuery } from '../routes/agent-change-sets';

/** How a route answers to a read-only API key. See `auth/auth-hooks.ts`. */
export type AuthMode =
	/** Session or API key; a read-only key is accepted. */
	| 'read'
	/** Session or API key; a read-only key gets 403. */
	| 'write'
	/** Read-shaped, but uses POST for a complex payload — read-only keys pass. */
	| 'read-via-post'
	/** No credentials required. */
	| 'public'
	/** Session cookie only — API keys are rejected by the handler. */
	| 'session'
	/** Machine-to-machine, gated on a shared secret rather than user auth. */
	| 'secret';

export interface RouteMeta {
	/** Hono path as mounted, e.g. `/api/documents/:id`. */
	path: string;
	method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
	summary: string;
	description?: string;
	tag: string;
	auth: AuthMode;
	/** Zod object validating the JSON request body. */
	request?: ZodType;
	/** Zod object validating the query string. */
	query?: ZodType;
	/** Zod object describing the success response, where one exists. */
	response?: ZodType;
	/** Set for endpoints whose body is `multipart/form-data`, not JSON. */
	formData?: { fields: Record<string, { type: string; format?: string; description?: string }> };
	/**
	 * Replace the generated schema for named body properties.
	 *
	 * For fields the zod contract deliberately leaves as `z.unknown()` because
	 * something downstream validates them — `where` and `select` on the query
	 * endpoint, parsed by `LocalAPI.find()`. Converting `z.unknown()` yields `{}`,
	 * which is accurate and useless.
	 */
	bodyOverrides?: Record<string, Record<string, unknown>>;
	/** A worked request body, shown in place of a generated one. */
	requestExample?: unknown;
	/**
	 * For `/api/documents` writes: the request body's document payload is
	 * per-collection, so the generator expands it into a `oneOf` over
	 * `<Type>Data` components instead of leaving `Record<string, unknown>`.
	 */
	expandDocumentData?: boolean;
}

export const ROUTE_REGISTRY: RouteMeta[] = [
	// ---------------- Documents ----------------
	{
		path: '/api/documents',
		method: 'GET',
		summary: 'List documents',
		description:
			'Filter by type and status with pagination. `perspective` selects draft or published data.',
		tag: 'Documents',
		auth: 'read',
		query: listDocumentsQuery,
		response: listDocumentsResponse
	},
	{
		path: '/api/documents',
		method: 'POST',
		summary: 'Create a document',
		description:
			'Creates a draft. Returns 201 with the document and its validation result. Set `publish: true` to publish immediately — validation failures then return 400.',
		tag: 'Documents',
		auth: 'write',
		request: createDocumentRequest,
		response: createDocumentResponse,
		expandDocumentData: true
	},
	{
		path: '/api/documents/by-ids',
		method: 'GET',
		summary: 'Batch document lookup',
		description: 'Fetch up to 100 documents in one round-trip by comma-separated id list.',
		tag: 'Documents',
		auth: 'read',
		query: getDocumentsByIdsQuery
	},
	{
		path: '/api/documents/query',
		method: 'POST',
		summary: 'Advanced query',
		description: [
			'Read-only despite being a POST — the filter payload is too complex for a query string. Accepted with a read-only API key.',
			'',
			'`where` is a map of field → `{ operator: value }`. Multiple fields are ANDed; `and` and `or` take arrays of nested `where` objects. Dot-notation reaches into nested fields (`"seo.title"`).',
			'',
			'```json',
			'{',
			'  "type": "post",',
			'  "where": {',
			'    "title": { "contains": "incident" },',
			'    "or": [',
			'      { "slug": { "starts_with": "2026-" } },',
			'      { "featured": { "equals": true } }',
			'    ]',
			'  },',
			'  "sort": "-publishedAt",',
			'  "limit": 20',
			'}',
			'```',
			'',
			'**Operators are not validated.** An unrecognised one (`eq` instead of `equals`) is dropped rather than rejected, and the query then matches *every* document of that type — a typo widens the result set instead of narrowing it. A `where` of the wrong shape, or naming a field the schema does not declare, returns zero results with a 200 rather than an error. Check the operator list below against what you send.'
		].join('\n'),
		tag: 'Documents',
		auth: 'read-via-post',
		request: queryDocumentsRequest,
		response: listDocumentsResponse,
		bodyOverrides: {
			where: { $ref: '#/components/schemas/WhereFilter' },
			select: {
				type: 'array',
				items: { type: 'string' },
				description:
					'Field paths to return, e.g. `["title", "slug"]`. Not currently applied — the full document is returned regardless.'
			}
		},
		requestExample: {
			type: 'post',
			where: { title: { contains: 'incident' } },
			sort: '-publishedAt',
			limit: 20,
			perspective: 'published'
		}
	},
	{
		path: '/api/documents/:id',
		method: 'GET',
		summary: 'Get a document',
		tag: 'Documents',
		auth: 'read',
		response: getDocumentResponse
	},
	{
		path: '/api/documents/:id',
		method: 'PUT',
		summary: 'Update a document draft',
		description:
			'Pass `expectedRevision` (from `_meta.revision`) for compare-and-swap; a mismatch returns 409 with `currentRevision` rather than overwriting.',
		tag: 'Documents',
		auth: 'write',
		request: updateDocumentRequest,
		response: updateDocumentResponse,
		expandDocumentData: true
	},
	{
		path: '/api/documents/:id',
		method: 'DELETE',
		summary: 'Delete a document',
		tag: 'Documents',
		auth: 'write',
		response: deleteDocumentResponse
	},
	{
		path: '/api/documents/:id/publish',
		method: 'POST',
		summary: 'Publish a document',
		description: 'Validates the draft and copies it to published data. 400 if validation fails.',
		tag: 'Documents',
		auth: 'write',
		request: publishDocumentRequest,
		response: publishDocumentResponse
	},
	{
		path: '/api/documents/:id/publish',
		method: 'DELETE',
		summary: 'Unpublish a document',
		tag: 'Documents',
		auth: 'write',
		request: unpublishDocumentRequest,
		response: unpublishDocumentResponse
	},
	{
		path: '/api/documents/:id/back-references',
		method: 'GET',
		summary: 'List documents referencing this one',
		tag: 'Documents',
		auth: 'read'
	},
	{
		path: '/api/documents/:id/schedule',
		method: 'GET',
		summary: 'Read the pending publish/unpublish schedule',
		tag: 'Documents',
		auth: 'read'
	},
	{
		path: '/api/documents/:id/schedule',
		method: 'POST',
		summary: 'Schedule a publish or unpublish',
		description:
			'Enqueues a durable job that runs at `runAt`. At most one pending schedule per document — rescheduling cancels the prior one.',
		tag: 'Documents',
		auth: 'write',
		request: scheduleDocumentRequest,
		response: scheduleDocumentResponse
	},
	{
		path: '/api/documents/:id/schedule',
		method: 'DELETE',
		summary: 'Cancel a pending schedule',
		tag: 'Documents',
		auth: 'write'
	},

	// ---------------- Versions ----------------
	{
		path: '/api/documents/:id/versions',
		method: 'GET',
		summary: 'List versions',
		tag: 'Versions',
		auth: 'read',
		query: listVersionsQuery,
		response: listVersionsResponse
	},
	{
		path: '/api/documents/:id/versions/:version',
		method: 'GET',
		summary: 'Get one version',
		tag: 'Versions',
		auth: 'read',
		response: getVersionResponse
	},
	{
		path: '/api/documents/:id/versions/:version/restore',
		method: 'POST',
		summary: 'Restore a version into the draft',
		tag: 'Versions',
		auth: 'write',
		request: restoreVersionRequest,
		response: restoreVersionResponse
	},

	// ---------------- Assets ----------------
	{
		path: '/api/assets',
		method: 'GET',
		summary: 'List assets',
		tag: 'Assets',
		auth: 'read',
		query: listAssetsQuery,
		response: listAssetsResponse
	},
	{
		path: '/api/assets',
		method: 'POST',
		summary: 'Upload an asset',
		description:
			'`multipart/form-data`. Rejected with 413 above the configured upload ceiling (`upload.maxFileSize`).',
		tag: 'Assets',
		auth: 'write',
		formData: {
			fields: {
				file: { type: 'string', format: 'binary', description: 'The file to upload.' },
				title: { type: 'string' },
				alt: { type: 'string' },
				description: { type: 'string' }
			}
		}
	},
	{
		path: '/api/assets/upload-url',
		method: 'POST',
		summary: 'Create a direct-upload URL',
		description:
			'Presigned upload straight to storage, bypassing the app. Enabled by `upload.direct`. Pair with `/api/assets/confirm`.',
		tag: 'Assets',
		auth: 'write',
		request: createUploadUrlRequest
	},
	{
		path: '/api/assets/confirm',
		method: 'POST',
		summary: 'Confirm a direct upload',
		description: 'Registers an asset record for a file already written to storage.',
		tag: 'Assets',
		auth: 'write',
		request: confirmUploadRequest
	},
	{
		path: '/api/assets/bulk',
		method: 'DELETE',
		summary: 'Bulk delete assets',
		tag: 'Assets',
		auth: 'write',
		request: bulkDeleteAssetsRequest,
		response: bulkDeleteAssetsResponse
	},
	{
		path: '/api/assets/references/counts',
		method: 'POST',
		summary: 'Reference counts for a list of assets',
		tag: 'Assets',
		auth: 'write',
		request: assetReferenceCountsRequest,
		response: assetReferenceCountsResponse
	},
	{
		path: '/api/assets/:id',
		method: 'GET',
		summary: 'Get asset metadata',
		tag: 'Assets',
		auth: 'read',
		response: getAssetResponse
	},
	{
		path: '/api/assets/:id',
		method: 'PATCH',
		summary: 'Update asset metadata',
		tag: 'Assets',
		auth: 'write',
		request: updateAssetRequest,
		response: updateAssetResponse
	},
	{
		path: '/api/assets/:id',
		method: 'DELETE',
		summary: 'Delete an asset',
		tag: 'Assets',
		auth: 'write',
		response: deleteAssetResponse
	},
	{
		path: '/api/assets/:id/references',
		method: 'GET',
		summary: 'List documents referencing this asset',
		tag: 'Assets',
		auth: 'read',
		response: getAssetReferencesResponse
	},
	{
		path: '/api/assets/:id/poster',
		method: 'POST',
		summary: 'Attach a poster image to a video asset',
		description: '`multipart/form-data`.',
		tag: 'Assets',
		auth: 'write',
		formData: {
			fields: { file: { type: 'string', format: 'binary', description: 'Poster image.' } }
		}
	},

	// ---------------- Schemas ----------------
	{
		path: '/api/schemas',
		method: 'GET',
		summary: 'List all registered schemas',
		description:
			'Read from live config, so validation functions and groups survive. This is the content model this instance is running.',
		tag: 'Schemas',
		auth: 'read'
	},
	{
		path: '/api/schemas/:type',
		method: 'GET',
		summary: 'Get one schema',
		tag: 'Schemas',
		auth: 'read'
	},

	// ---------------- Organizations ----------------
	{
		path: '/api/organizations',
		method: 'GET',
		summary: 'List organizations the caller belongs to',
		tag: 'Organizations',
		auth: 'read'
	},
	{
		path: '/api/organizations',
		method: 'POST',
		summary: 'Create an organization',
		tag: 'Organizations',
		auth: 'write',
		request: createOrganizationRequest
	},
	{
		path: '/api/organizations/switch',
		method: 'POST',
		summary: 'Switch the active organization',
		tag: 'Organizations',
		auth: 'write',
		request: switchOrganizationRequest
	},
	{
		path: '/api/organizations/members',
		method: 'GET',
		summary: 'List members of the active organization',
		tag: 'Organizations',
		auth: 'read'
	},
	{
		path: '/api/organizations/members',
		method: 'PATCH',
		summary: "Update a member's role",
		tag: 'Organizations',
		auth: 'write',
		request: updateMemberRoleRequest
	},
	{
		path: '/api/organizations/members',
		method: 'DELETE',
		summary: 'Remove a member',
		tag: 'Organizations',
		auth: 'write',
		request: removeMemberRequest
	},
	{
		path: '/api/organizations/invitations',
		method: 'POST',
		summary: 'Invite a member',
		tag: 'Organizations',
		auth: 'write',
		request: inviteMemberRequest
	},
	{
		path: '/api/organizations/invitations',
		method: 'DELETE',
		summary: 'Cancel an invitation',
		tag: 'Organizations',
		auth: 'write',
		request: cancelInvitationRequest
	},
	{
		path: '/api/organizations/:id',
		method: 'GET',
		summary: 'Get an organization',
		tag: 'Organizations',
		auth: 'read'
	},
	{
		path: '/api/organizations/:id',
		method: 'PATCH',
		summary: 'Update an organization',
		tag: 'Organizations',
		auth: 'write',
		request: updateOrganizationRequest
	},
	{
		path: '/api/organizations/:id',
		method: 'DELETE',
		summary: 'Delete an organization',
		tag: 'Organizations',
		auth: 'write'
	},

	// ---------------- Roles ----------------
	{
		path: '/api/roles',
		method: 'GET',
		summary: 'List built-in and custom roles',
		tag: 'Roles',
		auth: 'read'
	},
	{
		path: '/api/roles',
		method: 'POST',
		summary: 'Create a custom role',
		tag: 'Roles',
		auth: 'write',
		request: createRoleRequest
	},
	{
		path: '/api/roles/:name',
		method: 'PATCH',
		summary: "Update a role's capabilities",
		tag: 'Roles',
		auth: 'write',
		request: updateRoleRequest
	},
	{
		path: '/api/roles/:name',
		method: 'DELETE',
		summary: 'Delete a custom role',
		tag: 'Roles',
		auth: 'write'
	},

	// ---------------- Plugin settings ----------------
	{
		path: '/api/plugin-settings',
		method: 'GET',
		summary: 'Read per-organization plugin settings',
		description: 'Session only — API keys are rejected. Secret values are returned redacted.',
		tag: 'Plugin settings',
		auth: 'session'
	},
	{
		path: '/api/plugin-settings/:pluginId',
		method: 'PUT',
		summary: "Save one plugin's settings",
		description: 'Session only. `type: "secret"` values are encrypted at rest.',
		tag: 'Plugin settings',
		auth: 'session',
		request: savePluginSettingsRequest
	},

	// ---------------- User ----------------
	{
		path: '/api/user',
		method: 'PATCH',
		summary: 'Update the signed-in profile',
		tag: 'User',
		auth: 'session',
		request: updateUserRequest
	},
	{
		path: '/api/user/cms-preference',
		method: 'GET',
		summary: 'Read editor preferences',
		tag: 'User',
		auth: 'session'
	},
	{
		path: '/api/user/cms-preference',
		method: 'PATCH',
		summary: 'Update editor preferences',
		tag: 'User',
		auth: 'session',
		request: updateUserPreferencesRequest
	},
	{
		path: '/api/user/request-password-reset',
		method: 'POST',
		summary: 'Send a password-reset email',
		tag: 'User',
		auth: 'public',
		request: requestPasswordResetRequest
	},
	{
		path: '/api/user/reset-password',
		method: 'POST',
		summary: 'Complete a password reset',
		tag: 'User',
		auth: 'public',
		request: resetPasswordRequest
	},

	// ---------------- Jobs & events ----------------
	{
		path: '/api/jobs',
		method: 'GET',
		summary: 'List queue jobs',
		description:
			'Observability over the durable spine. `?scope=all` crosses the tenant boundary and is super-admin only.',
		tag: 'Jobs & events',
		auth: 'read',
		query: listJobsQuery
	},
	{
		path: '/api/jobs/health',
		method: 'GET',
		summary: 'Queue health counters',
		tag: 'Jobs & events',
		auth: 'read',
		query: healthQuery
	},
	{
		path: '/api/jobs/:id/retry',
		method: 'POST',
		summary: 'Requeue a failed or dead-lettered job',
		tag: 'Jobs & events',
		auth: 'write',
		request: jobActionRequestSchema
	},
	{
		path: '/api/jobs/:id/cancel',
		method: 'POST',
		summary: 'Cancel a pending job',
		tag: 'Jobs & events',
		auth: 'write',
		request: jobActionRequestSchema
	},
	{
		path: '/api/events',
		method: 'GET',
		summary: 'List domain events',
		description: 'The append-only fact log. Immutable — there is no write endpoint.',
		tag: 'Jobs & events',
		auth: 'read',
		query: listEventsQuery
	},
	{
		path: '/api/internal/workers/run',
		method: 'POST',
		summary: 'Run one worker tick (relay + execute)',
		description:
			'Machine-to-machine. Bearer `jobs.workerSecret`; returns 404 when that secret is unset, so it is never an unauthenticated surface.',
		tag: 'Jobs & events',
		auth: 'secret'
	},

	// ---------------- Agent ----------------
	{
		path: '/api/agent/chat',
		method: 'POST',
		summary: 'Streaming admin agent chat',
		description: '404 unless `aiProvider` is configured.',
		tag: 'Agent',
		auth: 'session',
		request: agentChatRequest
	},
	{
		path: '/api/agent/operations',
		method: 'POST',
		summary: 'Record a workspace operation',
		tag: 'Agent',
		auth: 'session',
		request: recordWorkspaceOperationRequest
	},
	{
		path: '/api/agent/change-sets',
		method: 'GET',
		summary: 'List agent turns with their operations',
		tag: 'Agent',
		auth: 'read',
		query: listChangeSetsQuery
	},
	{
		path: '/api/agent/change-sets/:id',
		method: 'GET',
		summary: 'Get one agent turn in detail',
		tag: 'Agent',
		auth: 'read'
	},
	{
		path: '/api/agent/change-sets/:id/undo',
		method: 'POST',
		summary: 'Undo an agent turn',
		description: 'Restores each mutated document to its prior version, in reverse order.',
		tag: 'Agent',
		auth: 'write'
	},

	// ---------------- Meta ----------------
	{
		path: '/api/aphex-health',
		method: 'GET',
		summary: 'Health check',
		description:
			'Unauthenticated. The database decides the status code; storage is reported but never fails the check (it degrades to `status: "degraded"` with HTTP 200). Storage is only probed when `storageHealthCheck` is enabled. Note that the templates deploy `/healthz` instead, which 503s on storage failure.',
		tag: 'Meta',
		auth: 'public'
	},
	{
		path: '/api/openapi.json',
		method: 'GET',
		summary: 'This document',
		description: 'Generated per instance from the live schema config and the zod contracts.',
		tag: 'Meta',
		auth: 'read'
	},
	{
		path: '/api/docs',
		method: 'GET',
		summary: 'Rendered API reference',
		description:
			'A Scalar reference over `/api/openapi.json`. Static HTML — it fetches the spec from the browser with your session, so the page itself carries no content. Unmount with `openapi.docsUi: false`.',
		tag: 'Meta',
		auth: 'public'
	}
];

/** `METHOD path` key, matching the shape of Hono's `app.routes` entries. */
export function routeKey(method: string, path: string): string {
	return `${method.toUpperCase()} ${path}`;
}

/**
 * What each tag groups, for the rendered doc's section headers. Keyed by the
 * `tag` values used above; a tag without an entry still renders, just bare.
 */
export const TAG_DESCRIPTIONS: Record<string, string> = {
	Documents:
		'Draft/published content. Every write is guarded by a monotonic `revision` — pass `expectedRevision` to turn a lost update into a 409 instead of a silent overwrite.',
	Versions: 'Point-in-time snapshots of a document, and restoring one into the draft.',
	Assets: 'Uploaded media and files, their metadata, and what references them.',
	Schemas: 'The content model this instance is running.',
	Organizations: 'Tenants, their members, and invitations.',
	Roles: 'Built-in and custom roles, and the capabilities they carry.',
	'Plugin settings': 'Per-organization plugin configuration, including encrypted secrets.',
	User: 'The signed-in account and its editor preferences.',
	'Jobs & events':
		'The durable spine: an append-only domain-event log, the job queue that reacts to it, and the worker endpoint that drives a tick.',
	Agent: 'The in-admin AI assistant and its audit/undo trail.',
	Meta: 'Health and self-description.'
};
