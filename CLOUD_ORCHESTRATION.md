# Cloud Orchestration

**Goal**: Offer a managed cloud deployment option alongside the existing self-hosted model — without compromising the open-source, self-hostable, vendor-unlocked nature of AphexCMS.

---

## Philosophy

AphexCMS is open source, self-hostable, and not vendor-locked. This is non-negotiable — anything else contradicts why it was made.

**Why Open Source?**

- Lower barrier of entry for users
- More users → More bugs caught → Better product
- A value proposition in itself

The cloud offering exists to **accelerate dev-to-prod flow**, not to lock users in. Users can eject to self-hosted at any time — their schemas, data, and application code remain identical.

---

## Two Modes of Building

AphexCMS supports two development models:

1. **Full Studio + App Platform** — The complete CMS admin with content editing, publishing, media management
2. **Headless Studio → Schema Platform** — Schema-driven content API consumed by external frontends

Both modes work identically whether self-hosted or cloud-managed. The **only difference** is how adapters are configured at the `aphex.config.ts` level.

---

## Entry Point: Preset-Based Configuration

The architectural boundary between self-hosted and cloud is the `aphex.config.ts` file. Both presets return the same shape — adapters for database, storage, email, auth, and cache — so `createCMSConfig` doesn't know or care which mode it's running in.

```typescript
// Self-hosted: you own and configure every adapter
import { selfHosted } from '@aphexcms/self-hosted';

export default createCMSConfig({
  schemaTypes,
  ...selfHosted({
    database: {
      url: env.DATABASE_URL,
      // or: adapter: myCustomAdapter
    },
    storage: {
      type: 's3',
      bucket: env.R2_BUCKET,
      endpoint: env.R2_ENDPOINT,
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      publicUrl: env.R2_PUBLIC_URL,
    },
    email: {
      type: 'resend',
      apiKey: env.RESEND_API_KEY,
    },
    auth: {
      provider: authProvider,
      loginUrl: '/login',
    },
  }),
});

// Cloud: Aphex manages infrastructure, you provide project credentials
import { cloud } from '@aphexcms/cloud';

export default createCMSConfig({
  schemaTypes,
  ...cloud({
    projectId: env.APHEX_PROJECT_ID,
    token: env.APHEX_TOKEN,
  }),
});
```

### What Each Preset Returns

Both presets return the same partial `CMSConfig` shape (everything except `schemaTypes`):

```typescript
interface PresetResult {
  database: DatabaseAdapter;
  storage?: StorageAdapter | null;
  email?: EmailAdapter | null;
  cache?: CacheAdapter | null;
  auth?: {
    provider: AuthProvider;
    loginUrl?: string;
  };
}
```

This means:

- **Schemas stay in user code** — always. Cloud never owns your content model.
- **Application code is identical** — routes, components, hooks all work the same.
- **Migration is trivial** — swap the preset import, update env vars, done.

---

## Package Architecture

### `@aphexcms/self-hosted`

A convenience preset that wires up self-hosted adapters declaratively. Instead of manually creating adapter instances in separate files, you configure everything in one place.

```
packages/self-hosted/
├── src/
│   └── index.ts        # selfHosted() function
├── package.json
└── tsconfig.json
```

**What it does:**

1. Creates a `DatabaseAdapter` from a connection URL (via `@aphexcms/postgresql-adapter`)
2. Creates a `StorageAdapter` based on config (`local` or `s3`)
3. Creates an `EmailAdapter` based on config (`mailpit`, `nodemailer`, `resend`)
4. Creates a `CacheAdapter` if enabled
5. Passes through auth provider as-is (auth stays in app layer)

**What it does NOT do:**

- Force any specific database, storage, or email provider
- Prevent direct adapter instantiation (power users can still wire manually)
- Own schemas, routes, or application code

### `@aphexcms/cloud`

A preset that connects to Aphex Cloud managed infrastructure. The user provides a `projectId` and `token`, and the package handles all adapter wiring internally.

```
packages/cloud/
├── src/
│   ├── index.ts          # cloud() function
│   ├── adapters/
│   │   ├── database.ts   # Cloud-managed Postgres adapter
│   │   ├── storage.ts    # Cloud-managed S3 adapter
│   │   ├── email.ts      # Cloud-managed email adapter
│   │   ├── auth.ts       # Cloud-managed auth provider
│   │   └── cache.ts      # Cloud-managed cache adapter
│   └── client.ts         # API client for Aphex Cloud control plane
├── package.json
└── tsconfig.json
```

**What it does:**

1. Authenticates with Aphex Cloud control plane using `projectId` + `token`
2. Fetches provisioned infrastructure credentials (DB URL, S3 keys, etc.)
3. Creates all adapters pointing at managed infrastructure
4. Handles credential rotation, health checks, telemetry

**What it does NOT do:**

- Own schemas — those stay in user code
- Modify application behavior — same CMS engine, same routes
- Prevent ejection — users can `selfHosted()` at any time with their own infra

---

## Cloud Infrastructure (Control Plane)

The cloud offering requires a **control plane** — a separate service that manages tenant infrastructure. This is NOT part of the open-source repo. It's a hosted service operated by the Aphex team.

### Per-Project Provisioning

When a user creates a cloud project, the control plane provisions:

| Resource | Implementation | Isolation |
|----------|---------------|-----------|
| **Database** | Dedicated PostgreSQL database on shared cluster (Neon/Supabase-style) | Database-level isolation |
| **Storage** | S3 bucket with project-scoped prefix (Cloudflare R2) | Prefix-level isolation |
| **Email** | Shared email service with project-scoped sender | Shared, rate-limited |
| **Cache** | Shared Redis/Valkey with project-scoped namespace | Namespace-level isolation |
| **Auth** | Managed Better Auth instance per project | Full isolation |

### Tenant Tiers

| Tier | Database | Storage | Compute | Use Case |
|------|----------|---------|---------|----------|
| **Free** | Shared Postgres (row-level) | Shared R2 (prefix) | Shared | Hobby, evaluation |
| **Pro** | Dedicated database | Dedicated R2 bucket | Shared | Production sites |
| **Enterprise** | Dedicated Postgres cluster | Dedicated R2 + CDN | Dedicated | High-traffic, compliance |

### Control Plane API

```
POST   /api/projects                    # Create project
GET    /api/projects/:id                # Get project details + credentials
PATCH  /api/projects/:id                # Update project settings
DELETE /api/projects/:id                # Tear down project
POST   /api/projects/:id/deploy         # Trigger build + deploy
GET    /api/projects/:id/status         # Health + metrics
POST   /api/projects/:id/credentials/rotate  # Rotate secrets
```

### Credential Flow

```
1. User signs up at cloud.getaphex.com
2. Creates a project → gets projectId + token
3. Adds to aphex.config.ts:
   ...cloud({ projectId: '...', token: '...' })
4. On first boot, cloud() calls control plane:
   GET /api/projects/:id (with token)
   → Returns: { databaseUrl, s3Config, emailConfig, authConfig }
5. cloud() creates adapters with provisioned credentials
6. CMS runs normally — no difference from self-hosted
```

---

## Build & Deploy Pipeline

> **Note**: The build/deploy pipeline is part of the **Cloud SaaS control plane** — a separate system, not part of this open-source repo. This section describes the architecture for context only.

The control plane is responsible for:

1. **Image builds** — Building Docker images from user projects (or the base template)
2. **Registry** — Storing built images in a private container registry
3. **Deployment** — Deploying per-tenant containers with tenant-specific env vars
4. **Routing** — Mapping custom domains / subdomains to tenant containers
5. **Scaling** — Horizontal scaling, health checks, zero-downtime deploys

```
User pushes schemas → Cloud control plane detects change
                        ↓
                      Builds project image (or uses base image + schema overlay)
                        ↓
                      Pushes to private registry
                        ↓
                      Deploys container with tenant credentials
                        ↓
                      Routes traffic via subdomain (project-slug.cloud.getaphex.com)
```

This is architecturally similar to how Vercel, Railway, or Render work — the open-source repo provides the **client package** (`@aphexcms/cloud`), the SaaS provides the **infrastructure**.

---

## Self-Hosted vs Cloud: Feature Parity

| Feature | Self-Hosted | Cloud |
|---------|------------|-------|
| Schema definitions | User code | User code |
| Content API (REST, GraphQL) | ✅ | ✅ |
| Admin UI | ✅ | ✅ |
| Multi-tenancy | ✅ (configure yourself) | ✅ (managed) |
| Custom plugins | ✅ | ✅ |
| Custom auth | ✅ (any provider) | ✅ (managed, or bring your own) |
| Storage | ✅ (any S3-compatible) | ✅ (managed R2) |
| Email | ✅ (any adapter) | ✅ (managed) |
| Database | ✅ (any PostgreSQL) | ✅ (managed) |
| Custom domains | ✅ (your DNS) | ✅ (via control plane) |
| Data export | ✅ (direct DB access) | ✅ (export API) |
| Eject to self-hosted | N/A | ✅ (always possible) |

---

## Migration Paths

### Cloud → Self-Hosted (Ejection)

```bash
# 1. Export data from cloud
aphex export --project <id> --output ./backup

# 2. Set up self-hosted infrastructure
docker compose up -d  # Postgres + app

# 3. Import data
aphex import --source ./backup

# 4. Update aphex.config.ts
# Replace: ...cloud({ projectId, token })
# With:    ...selfHosted({ database: { url: '...' }, ... })

# 5. Deploy
docker compose up --build
```

### Self-Hosted → Cloud

```bash
# 1. Create cloud project
# Visit cloud.getaphex.com → Create Project → Get credentials

# 2. Export self-hosted data
aphex export --output ./backup

# 3. Import to cloud
aphex import --project <id> --source ./backup

# 4. Update aphex.config.ts
# Replace: ...selfHosted({ ... })
# With:    ...cloud({ projectId: '...', token: '...' })

# 5. Deploy (or push to cloud)
aphex deploy
```

---

## Implementation Phases

### Phase 1: Preset Packages (Now) — this repo

- [ ] `@aphexcms/self-hosted` — Convenience preset for self-hosted config
- [ ] `@aphexcms/cloud` — Cloud preset client (connects to provisioned infra)
- [ ] Update `templates/base` with preset examples

### Phase 2: Control Plane (Next) — separate SaaS repo

- [ ] Project provisioning API
- [ ] Credential management + rotation
- [ ] Tenant database provisioning (Neon or managed PG)
- [ ] Tenant storage provisioning (R2)
- [ ] Build & deploy pipeline (image builds, registry, container orchestration)
- [ ] Dashboard at cloud.getaphex.com

### Phase 3: Developer Experience

- [ ] `aphex deploy` CLI command
- [ ] `aphex export` / `aphex import` for data portability
- [ ] GitHub integration (push-to-deploy)
- [ ] Preview deployments per branch

### Phase 4: Scale & Reliability

- [ ] Multi-region support
- [ ] Auto-scaling per tenant
- [ ] Monitoring + alerting per project
- [ ] Usage-based billing integration

---

## Key Principles

1. **Open source first** — The cloud offering is a convenience layer, not the product
2. **No vendor lock-in** — Eject at any time with full data portability
3. **Schema stays in user code** — Cloud never owns your content model
4. **Same engine** — Identical CMS behavior whether self-hosted or cloud
5. **Preset, not platform** — The difference is one line in `aphex.config.ts`
