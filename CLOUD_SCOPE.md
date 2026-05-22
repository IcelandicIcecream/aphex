# Aphex Cloud — Full Scope

---

## Overview

Aphex Cloud is a managed hosting platform for AphexCMS projects. Users connect
a GitHub repository, and the platform handles everything else — building Docker
images, provisioning isolated PostgreSQL databases and R2 storage buckets,
deploying containers, routing traffic, and managing SSL certificates.

The platform lives in a **separate private repository** (`aphex-cloud`) and has
no code dependency on the `aphex` monorepo. It builds Docker images from user
repos that happen to be AphexCMS projects, but the infrastructure is
CMS-agnostic.

---

## Repository structure

```
aphex-cloud/
  apps/
    dashboard/                  ← SvelteKit (control plane UI + API)
    worker/                     ← Go (deployment pipeline)
  infrastructure/
    caddy/
      Caddyfile
    swarm/
      init.sh                   ← docker swarm init + overlay network
      deploy.sh                 ← deploy the platform stack itself
    terraform/                  ← provision servers (Hetzner, DigitalOcean)
  docker-compose.yml            ← full local dev stack
  Makefile
  README.md
```

---

## Technology choices

| Layer | Choice | Why |
|---|---|---|
| DNS | Cloudflare | Free, API for wildcard SSL challenge, DDoS |
| Reverse proxy | Caddy | On-demand TLS built-in, admin API, zero restarts |
| Control plane | SvelteKit | Same stack as the rest of the product |
| Platform DB | PostgreSQL + Drizzle | Already used everywhere |
| Job queue | PostgreSQL (`FOR UPDATE SKIP LOCKED`) | No extra dependency |
| Log streaming | PostgreSQL `LISTEN/NOTIFY` | No extra dependency |
| Auth | Better Auth | Already used in studio |
| Container runtime | Docker Swarm | Built into Docker, no K8s overhead |
| Build system | BuildKit | Fast, layer caching |
| Registry | GitHub Container Registry (ghcr.io) | Free, no setup |
| Customer DBs | Shared PostgreSQL cluster | One `CREATE DATABASE` per env |
| Connection pooling | PgBouncer | Transaction mode, handles thousands of apps |
| Customer storage | Cloudflare R2 | Already in the template, no egress fees |
| Billing | Stripe | Industry standard |
| Encryption | AES-256-GCM (Web Crypto / Go stdlib) | No extra deps |
| Worker language | Go | Long-running background process, I/O heavy, goroutines |

---

## Plans and limits

| | Hobby | Pro | Enterprise |
|---|---|---|---|
| Price | Free | $19/mo | Custom |
| Projects | 1 | 10 | Unlimited |
| Environments per project | 2 (prod + staging) | 5 | Unlimited |
| Preview environments (per PR) | No | Yes | Yes |
| RAM per container | 512 MB | 2 GB | 8 GB |
| vCPU per container | 0.5 | 2 | 4 |
| DB storage | 256 MB | 5 GB | Unlimited |
| Builds per month | 50 | 500 | Unlimited |
| Custom domains | No | Yes | Yes |
| Team members | 1 | 5 | Unlimited |
| Log retention | 24h | 30 days | 90 days |
| Support | Community | Email | Dedicated |

Limits enforced in two places:
- **Dashboard API** — before creating a project, environment, or triggering a
  deploy, check the user's plan limits
- **Worker** — before starting a build, check build minutes used this month

---

## System architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLOUDFLARE                              │
│                                                                 │
│   *.aphex.studio      →  server IP  (wildcard A record)        │
│   cloud.aphex.studio  →  server IP                              │
│   DNS API token given to Caddy for wildcard SSL challenge       │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                           CADDY                                 │
│                                                                 │
│   *.aphex.studio    wildcard cert  (DNS-01 via Cloudflare)     │
│   custom domains    on-demand TLS  (HTTP-01 via Let's Encrypt) │
│                                                                 │
│   asks dashboard /api/internal/caddy/ask before issuing cert   │
│   routes registered dynamically via admin API (port 2019)      │
└──────┬──────────────────────────────────────────┬──────────────┘
       │                                          │
       │ cloud.aphex.studio                       │ everything else
       ▼                                          ▼
┌─────────────────────┐          ┌────────────────────────────────┐
│     DASHBOARD       │          │    DOCKER SWARM CLUSTER        │
│     SvelteKit       │          │                                │
│     :3001           │          │   aphex-env-<id>  :3000        │
│                     │          │   aphex-env-<id>  :3000        │
│  UI + API           │          │   aphex-env-<id>  :3000        │
│  GitHub webhooks    │          │   ...                          │
│  Stripe webhooks    │          └──────────────┬─────────────────┘
│  Job enqueuer       │                         │
│  SSE log stream     │          ┌──────────────▼─────────────────┐
│  Billing portal     │          │           PGBOUNCER            │
│  /internal/ask  ◄───┼─── Caddy │   transaction mode pooling     │
└──────────┬──────────┘          │   customer apps connect here   │
           │                     └──────────────┬─────────────────┘
           │                                    │
           ▼                                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                         POSTGRESQL                              │
│                                                                 │
│   aphex_platform          ← control plane data + job queue     │
│   aphex_env_<id>          ← one isolated DB per environment     │
│   aphex_env_<id>          ← ...                                 │
└──────────────────────────────────────────────────────────────────┘
           │
           │  pg_notify  ← log lines streamed to dashboard
           │
┌──────────▼───────────────────────────────────────────────────────┐
│                         GO WORKER                               │
│   (no HTTP, background process, multiple goroutines)            │
│                                                                 │
│   polls cloud_jobs with FOR UPDATE SKIP LOCKED                  │
│   provisions PostgreSQL databases                               │
│   provisions R2 storage buckets                                 │
│   builds Docker images via BuildKit                             │
│   manages Swarm services                                        │
│   registers routes via Caddy admin API                          │
│   writes status + logs back to PostgreSQL                       │
└──────────────────────────────────────────────────────────────────┘
```

---

## Platform database schema

All tables live in the `aphex_platform` database.

```sql
-- ── Auth ──────────────────────────────────────────────────────────────────

cloud_users
  id, name, email, password_hash,
  email_verified,
  stripe_customer_id,
  plan,                     -- hobby | pro | enterprise
  plan_status,              -- active | past_due | cancelled
  created_at, updated_at

cloud_sessions
  id, user_id, token, expires_at,
  ip_address, user_agent, created_at

cloud_accounts                -- OAuth providers (GitHub login)
  id, user_id, provider_id, account_id,
  access_token, refresh_token,
  created_at, updated_at

cloud_verifications           -- email verification tokens
  id, identifier, value, expires_at, created_at

-- ── Projects ──────────────────────────────────────────────────────────────

cloud_projects
  id, user_id,
  name, slug,               -- slug used in *.aphex.studio subdomain
  github_repo_id,
  github_repo_full_name,    -- "owner/repo"
  github_installation_id,
  github_default_branch,
  region,                   -- us-east-1 | eu-west-1 | ap-southeast-1
  status,                   -- active | suspended | deleted
  created_at, updated_at

-- ── Environments ──────────────────────────────────────────────────────────

cloud_environments
  id, project_id,
  name,                     -- production | staging | pr-42
  type,                     -- production | staging | preview
  branch,
  pr_number,                -- set for preview envs
  url,                      -- https://slug.aphex.studio
  status,                   -- pending | deploying | running | failed | stopped
  auto_deploy,
  created_at, updated_at

-- ── Deployments ───────────────────────────────────────────────────────────

cloud_deployments
  id, environment_id, project_id,
  commit_sha, commit_message, commit_author, branch,
  status,                   -- queued | building | deploying | running | failed | cancelled
  build_started_at, build_finished_at, deployed_at,
  image_tag,
  error_message,
  created_at

cloud_deployment_logs         -- append only, one row per log line
  id, deployment_id,
  line,
  created_at

-- ── Job queue ─────────────────────────────────────────────────────────────

cloud_jobs
  id, type,                 -- deploy | deprovision | verify_domain | health_check
  payload,                  -- jsonb
  status,                   -- queued | running | done | failed
  worker_id,                -- which goroutine claimed it
  attempts, max_attempts,
  error,
  created_at, claimed_at, finished_at

-- ── Environment variables ──────────────────────────────────────────────────

cloud_env_vars
  id, environment_id,
  key, value_encrypted,     -- AES-256-GCM
  is_secret,
  created_at, updated_at

-- ── Custom domains ────────────────────────────────────────────────────────

cloud_domains
  id, environment_id,
  domain,
  status,                   -- pending | verified | active | failed
  ssl_status,               -- pending | provisioning | active | failed
  verification_token,       -- TXT record value user must add to DNS
  verified_at, ssl_issued_at, ssl_expires_at,
  created_at

-- ── Provisioned infrastructure ────────────────────────────────────────────

cloud_provisioned_databases
  id, environment_id,
  host, port, database, username,
  password_encrypted,       -- AES-256-GCM
  status,                   -- provisioning | ready | error
  storage_mb,
  created_at

cloud_provisioned_storage
  id, environment_id,
  bucket, region, endpoint,
  access_key_id,
  secret_access_key_encrypted,  -- AES-256-GCM
  public_url,
  status,
  created_at

-- ── Billing ───────────────────────────────────────────────────────────────

cloud_subscriptions
  id, user_id,
  stripe_subscription_id,
  stripe_price_id,
  plan,                     -- hobby | pro | enterprise
  status,                   -- active | past_due | cancelled | trialing
  current_period_start,
  current_period_end,
  cancel_at_period_end,
  created_at, updated_at

cloud_invoices
  id, user_id,
  stripe_invoice_id,
  amount_cents, currency,
  status,                   -- paid | open | void | uncollectible
  invoice_url,
  paid_at, created_at

cloud_usage_records           -- recorded per billing period per environment
  id, project_id, environment_id,
  period_start, period_end,
  compute_minutes,          -- container uptime
  build_minutes,
  storage_gb,
  bandwidth_gb,
  db_storage_mb,
  created_at

-- ── Teams (pro+) ─────────────────────────────────────────────────────────

cloud_team_members
  id, project_id, user_id,
  role,                     -- owner | admin | member
  invited_by,
  accepted_at,
  created_at
```

---

## Job queue

No Redis. Jobs are rows in `cloud_jobs`. The worker claims them safely across
multiple goroutines using `FOR UPDATE SKIP LOCKED`:

```sql
UPDATE cloud_jobs
SET
  status     = 'running',
  claimed_at = now(),
  worker_id  = $1
WHERE id = (
  SELECT id FROM cloud_jobs
  WHERE status = 'queued'
  ORDER BY created_at
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
RETURNING *;
```

### Job types

| Type | Payload | Triggered by |
|---|---|---|
| `deploy` | deploymentId | GitHub push, PR event, manual trigger |
| `deprovision_env` | environmentId | PR closed, environment deleted |
| `verify_domain` | domainId | User clicks Verify |
| `health_check` | environmentId | Scheduled every 60s |

---

## Log streaming

No Redis. Worker writes log lines to PostgreSQL and fires `pg_notify`.
Dashboard SSE endpoint listens and streams to the browser.

**Worker (Go):**
```go
func (l *Logger) Log(deploymentID, line string) {
    db.Exec(`INSERT INTO cloud_deployment_logs (deployment_id, line) VALUES ($1, $2)`,
        deploymentID, line)
    db.Exec(`SELECT pg_notify($1, $2)`,
        "deployment:"+deploymentID, line)
}
```

**Dashboard SSE endpoint:**
```
GET /api/deployments/[id]/logs

1. backfill existing lines from cloud_deployment_logs
2. LISTEN "deployment:<id>" on a dedicated PostgreSQL connection
3. stream each NOTIFY payload as an SSE event
4. close stream when deployment status = running | failed | cancelled
```

---

## Dashboard (`apps/dashboard`)

SvelteKit app. Better Auth for authentication. Drizzle for database access.
Same patterns as `apps/studio`.

### Route structure

```
src/routes/
  (app)/
    +layout.svelte                    ← auth guard, sidebar, plan banner
    dashboard/
      +page.svelte                    ← overview, stats, recent deploys
    projects/
      +page.svelte                    ← project list
      new/
        +page.svelte                  ← create project, connect GitHub
      [id]/
        +page.svelte                  ← project overview
        settings/
          +page.svelte                ← rename, delete, GitHub reconnect
        environments/
          [envId]/
            +page.svelte              ← env overview, deploy history
            logs/
              +page.svelte            ← live build log viewer
            vars/
              +page.svelte            ← env var manager
            domains/
              +page.svelte            ← custom domain manager
    billing/
      +page.svelte                    ← current plan, usage, invoices
      upgrade/
        +page.svelte                  ← plan comparison, Stripe checkout
    settings/
      +page.svelte                    ← account settings
      team/
        +page.svelte                  ← invite members (pro+)
  login/
    +page.svelte
  signup/
    +page.svelte

  api/
    auth/[...all]/+server.ts          ← Better Auth handler
    webhooks/
      github/+server.ts               ← push/PR events, HMAC verified
      stripe/+server.ts               ← payment events, signature verified
    projects/
      +server.ts
      [id]/+server.ts
      [id]/environments/
        +server.ts
        [envId]/+server.ts
        [envId]/deploy/+server.ts
        [envId]/rollback/+server.ts
        [envId]/vars/+server.ts
        [envId]/domains/+server.ts
        [envId]/domains/[domainId]/verify/+server.ts
    deployments/
      [id]/+server.ts
      [id]/logs/+server.ts            ← SSE stream
    billing/
      checkout/+server.ts
      portal/+server.ts
      usage/+server.ts
      invoices/+server.ts
    internal/
      caddy/ask/+server.ts            ← Caddy cert authorisation
```

### Full API surface

**Auth**
```
POST   /api/auth/sign-up/email
POST   /api/auth/sign-in/email
POST   /api/auth/sign-out
GET    /api/auth/session
```

**Projects**
```
GET    /api/projects
POST   /api/projects
GET    /api/projects/[id]
PATCH  /api/projects/[id]
DELETE /api/projects/[id]
```

**Environments**
```
GET    /api/projects/[id]/environments
POST   /api/projects/[id]/environments
GET    /api/projects/[id]/environments/[envId]
DELETE /api/projects/[id]/environments/[envId]
POST   /api/projects/[id]/environments/[envId]/deploy
POST   /api/projects/[id]/environments/[envId]/rollback
```

**Env vars**
```
GET    /api/projects/[id]/environments/[envId]/vars
POST   /api/projects/[id]/environments/[envId]/vars
DELETE /api/projects/[id]/environments/[envId]/vars?key=X
```

**Domains**
```
GET    /api/projects/[id]/environments/[envId]/domains
POST   /api/projects/[id]/environments/[envId]/domains
POST   /api/projects/[id]/environments/[envId]/domains/[domainId]/verify
DELETE /api/projects/[id]/environments/[envId]/domains/[domainId]
```

**Deployments**
```
GET    /api/deployments/[id]
DELETE /api/deployments/[id]           cancel
GET    /api/deployments/[id]/logs      SSE stream
```

**Billing**
```
GET    /api/billing/usage
GET    /api/billing/invoices
POST   /api/billing/checkout           create Stripe checkout session
POST   /api/billing/portal             redirect to Stripe customer portal
```

**Webhooks**
```
POST   /api/webhooks/github
POST   /api/webhooks/stripe
```

**Internal**
```
GET    /api/internal/caddy/ask?domain=mycoolsite.com
```

---

## GitHub integration

Uses a **GitHub App** (not OAuth App) — required for installation tokens that
allow fetching private repo source tarballs.

### Installation flow
```
User installs GitHub App on their account/org
  → GitHub redirects back to /projects/new?installation_id=xxx
  → dashboard stores installation_id on the project
  → worker uses installation_id to generate short-lived access tokens
  → access tokens used to fetch source tarballs (private repos work)
```

### Webhook events

| Event | Action | What happens |
|---|---|---|
| `push` | any | deploy matching environments (auto_deploy = true) |
| `pull_request` | opened / synchronize / reopened | create/update preview env, deploy |
| `pull_request` | closed | stop preview container, deprovision if merged |
| `installation` | deleted | mark all projects for that installation as disconnected |

### Webhook handler
```
POST /api/webhooks/github
  → verify HMAC-SHA256 (X-Hub-Signature-256 header)
  → parse event type + payload
  → find project by github_repo_id
  → check plan allows this action (preview envs = pro+ only)
  → INSERT INTO cloud_deployments
  → INSERT INTO cloud_jobs (type: deploy)
  → return 200 immediately
```

---

## Billing (Stripe)

### Products
```
Hobby       ← free, no Stripe subscription
Pro         ← $19/mo, Stripe subscription
Enterprise  ← custom pricing, managed manually or Stripe quote
```

### Signup → billing flow
```
User signs up
  → create Stripe customer (stripe.customers.create)
  → store stripe_customer_id on cloud_users
  → assign hobby plan by default

User clicks Upgrade
  → POST /api/billing/checkout
  → create Stripe checkout session (mode: subscription)
  → redirect to Stripe hosted checkout

Stripe payment succeeds
  → POST /api/webhooks/stripe (checkout.session.completed)
  → verify Stripe-Signature header
  → update cloud_users.plan = pro
  → INSERT INTO cloud_subscriptions
  → INSERT INTO cloud_invoices

Stripe payment fails
  → POST /api/webhooks/stripe (invoice.payment_failed)
  → update cloud_subscriptions.status = past_due
  → email user warning
  → if unpaid after grace period → suspend environments

User cancels
  → POST /api/billing/portal → redirect to Stripe customer portal
  → user manages/cancels subscription there
  → POST /api/webhooks/stripe (customer.subscription.deleted)
  → downgrade plan to hobby
  → enforce hobby limits
```

### Stripe webhook events

| Event | What happens |
|---|---|
| `checkout.session.completed` | activate subscription, upgrade plan |
| `invoice.payment_succeeded` | record invoice, reset monthly usage |
| `invoice.payment_failed` | mark past_due, email user |
| `customer.subscription.updated` | sync plan + status changes |
| `customer.subscription.deleted` | downgrade to hobby, enforce limits |

---

## Go worker (`apps/worker`)

Long-running background process. No HTTP server. Multiple goroutines each
polling the job queue independently — N concurrent deployments with N
goroutines.

### Structure
```
apps/worker/
  main.go
  internal/
    worker/
      worker.go           ← goroutine pool, main job loop
      deploy.go           ← full deployment pipeline
      deprovision.go      ← environment teardown
      health.go           ← periodic health check loop
    queue/
      queue.go            ← FOR UPDATE SKIP LOCKED poller
    provisioner/
      database.go         ← CREATE DATABASE / CREATE USER
      storage.go          ← R2 bucket creation
    builder/
      builder.go          ← fetch tarball, BuildKit, push image
    orchestrator/
      swarm.go            ← Swarm service create/update/remove
    router/
      caddy.go            ← Caddy admin API client
    crypto/
      crypto.go           ← AES-256-GCM encrypt/decrypt
    db/
      db.go               ← pgx connection pool
    logger/
      logger.go           ← write log line + pg_notify
```

### Deployment pipeline (`deploy.go`)

```
1.  load deployment + environment + project from platform DB
2.  update status: building
3.  check plan limits (build minutes this month)
4.  provision PostgreSQL DB     if first deploy for this environment
5.  provision R2 bucket         if first deploy for this environment
6.  generate GitHub installation token
7.  fetch source tarball from GitHub API at commit SHA
8.  build Docker image via BuildKit
9.  push image to ghcr.io registry
10. update deployment: image_tag, build_finished_at
11. update status: deploying
12. decrypt + assemble env vars
      platform-injected:  DATABASE_URL, AUTH_URL, AUTH_SECRET,
                          AUTH_TRUSTED_ORIGINS, R2_*, PORT
      user-defined:       whatever they added in the dashboard
      platform vars always override user vars
13. create/update Swarm service with image + env vars + resource limits
14. register route with Caddy admin API
      primary:   myproject.aphex.studio
      custom:    mycoolsite.com  (if verified domain exists)
15. health check loop  retry for 60s  GET /api/health on container
16. update status: running, deployed_at = now()
17. record usage (compute start time)
18. log: "Deployment complete."
```

### Deprovision pipeline (`deprovision.go`)

```
1.  remove Swarm service
2.  deregister route from Caddy admin API
3.  DROP DATABASE + DROP USER on PostgreSQL
4.  empty R2 bucket (list all objects, delete in batches)
5.  delete R2 bucket
6.  mark environment status: stopped
7.  record final usage
```

### Health check (`health.go`)

```
every 60 seconds:
  for each environment where status = running:
    GET <swarm-service-ip>:3000/api/health
    if 3 consecutive failures:
      mark environment status: failed
      enqueue deploy job (auto-restart using last known image_tag)
```

---

## Caddy

### Caddyfile

```
{
  admin localhost:2019

  on_demand_tls {
    ask http://dashboard:3001/api/internal/caddy/ask
  }
}

*.aphex.studio {
  tls {
    dns cloudflare {env.CF_API_TOKEN}
  }
  reverse_proxy {http.reverse_proxy.upstream.host}
}

:443 {
  tls { on_demand }
  reverse_proxy {http.reverse_proxy.upstream.host}
}
```

### Worker registers a route (Go)

```go
route := map[string]any{
    "match": []map[string]any{
        {"host": []string{"myproject.aphex.studio", "mycoolsite.com"}},
    },
    "handle": []map[string]any{{
        "handler": "reverse_proxy",
        "upstreams": []map[string]any{
            {"dial": serviceName + ":3000"},
        },
    }},
}

// POST localhost:2019/config/apps/http/servers/main/routes
```

Swarm assigns the service a stable DNS name on the overlay network
(`aphex-env-<id>`). Caddy uses the service name as the upstream — no IP
tracking needed.

### Ask endpoint (dashboard)

```typescript
// GET /api/internal/caddy/ask?domain=mycoolsite.com
// Returns 200 if domain is verified + has a running environment
// Returns 403 otherwise — Caddy will not issue the cert
```

---

## Custom domain flow

```
User adds mycoolsite.com in dashboard
  → INSERT INTO cloud_domains (status: pending)
  → UI shows:
      Add CNAME:  mycoolsite.com          →  myproject.aphex.studio
      Add TXT:    _aphex-verify.mycoolsite.com  →  <verification_token>

User clicks Verify
  → INSERT INTO cloud_jobs (type: verify_domain)

Worker picks up verify_domain job
  → DNS TXT lookup for _aphex-verify.mycoolsite.com
  → token matches
  → UPDATE cloud_domains SET status = verified
  → call Caddy admin API: add mycoolsite.com to this environment's route

First request to mycoolsite.com
  → Caddy asks /api/internal/caddy/ask → 200
  → Caddy provisions Let's Encrypt cert via HTTP-01
  → UPDATE cloud_domains SET ssl_status = active
  → domain is live with HTTPS
```

---

## Docker Swarm

### Why not Kubernetes

Swarm is built into Docker. You get rolling deploys, restart policies, resource
limits, and multi-node scaling without managing a control plane, etcd, or
ingress controllers. Kubernetes is operationally heavy and not necessary until
you have a concrete scaling problem Swarm can't solve.

### Migration path

```
MVP                  →  Growth               →  If ever needed
Single node Swarm       Multi-node Swarm        Migrate to K8s
(manager + worker)      (1 manager, N workers)  (probably never)
```

### Adding a node

```bash
# On existing manager
docker swarm join-token worker

# On new server
docker swarm join --token <token> manager-ip:2377
```

Swarm redistributes services automatically. No config changes needed.

### Swarm service per environment (Go)

```go
swarm.ServiceSpec{
    Annotations: swarm.Annotations{
        Name: "aphex-env-" + environmentID,
    },
    TaskTemplate: swarm.TaskSpec{
        ContainerSpec: &container.Config{
            Image: imageTag,
            Env:   envVarSlice,
        },
        Resources: &swarm.ResourceRequirements{
            Limits: &swarm.Limit{
                MemoryBytes: planMemoryBytes(plan),
                NanoCPUs:    planNanoCPUs(plan),
            },
        },
        RestartPolicy: &swarm.RestartPolicy{
            Condition: swarm.RestartPolicyConditionOnFailure,
        },
    },
}
```

---

## PgBouncer

```ini
[databases]
aphex_env_* = host=postgres port=5432

[pgbouncer]
pool_mode             = transaction
max_client_conn       = 10000
default_pool_size     = 20
min_pool_size         = 0       ← hobby: no idle connections held
server_idle_timeout   = 60
listen_port           = 5432
listen_addr           = *
auth_type             = scram-sha-256
```

Customer `DATABASE_URL` always points at PgBouncer, not PostgreSQL directly.
PostgreSQL is on an internal network, not publicly reachable.

Worker admin connection (`PROVISION_DB_ADMIN_URL`) bypasses PgBouncer and
connects directly to PostgreSQL — needed for `CREATE DATABASE / DROP DATABASE`.

---

## Encryption

All secrets stored encrypted at rest using AES-256-GCM.

| Column | What is encrypted |
|---|---|
| `cloud_provisioned_databases.password_encrypted` | PostgreSQL user password |
| `cloud_provisioned_storage.secret_access_key_encrypted` | R2 secret access key |
| `cloud_env_vars.value_encrypted` | All env var values |

Single `ENCRYPTION_KEY` env var (32 bytes, base64-encoded) on both dashboard
and worker. Neither app stores plaintext secrets anywhere.

Key rotation: add a `key_version` column, re-encrypt on read with the new key,
write back.

---

## Docker Compose (local dev)

```yaml
services:

  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: aphex_platform
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]

  pgbouncer:
    image: pgbouncer/pgbouncer
    environment:
      DATABASES_HOST: postgres
      PGBOUNCER_POOL_MODE: transaction
      PGBOUNCER_MAX_CLIENT_CONN: 1000
      PGBOUNCER_DEFAULT_POOL_SIZE: 20
    ports: ["5433:5432"]
    depends_on: [postgres]

  caddy:
    image: caddy:2
    ports: ["80:80", "443:443", "2019:2019"]
    volumes:
      - ./infrastructure/caddy/Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    environment:
      CF_API_TOKEN: ${CF_API_TOKEN}

  dind:
    image: docker:27-dind
    privileged: true
    environment:
      DOCKER_TLS_CERTDIR: ""
    command: ["dockerd", "--host=tcp://0.0.0.0:2375", "--tls=false"]

  dashboard:
    build: apps/dashboard
    ports: ["3001:3001"]
    environment:
      DATABASE_URL: postgres://admin:password@postgres/aphex_platform
      AUTH_SECRET: local-dev-secret
      AUTH_URL: http://localhost:3001
      AUTH_TRUSTED_ORIGINS: http://localhost:3001
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
      STRIPE_WEBHOOK_SECRET: ${STRIPE_WEBHOOK_SECRET}
      STRIPE_PRO_PRICE_ID: ${STRIPE_PRO_PRICE_ID}
      STRIPE_ENTERPRISE_PRICE_ID: ${STRIPE_ENTERPRISE_PRICE_ID}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      GITHUB_APP_ID: ${GITHUB_APP_ID}
      GITHUB_APP_CLIENT_ID: ${GITHUB_APP_CLIENT_ID}
      GITHUB_APP_CLIENT_SECRET: ${GITHUB_APP_CLIENT_SECRET}
      GITHUB_WEBHOOK_SECRET: ${GITHUB_WEBHOOK_SECRET}
      CLOUD_BASE_DOMAIN: aphex.studio
    depends_on: [postgres, caddy]

  worker:
    build: apps/worker
    environment:
      DATABASE_URL: postgres://admin:password@postgres/aphex_platform
      PROVISION_DB_ADMIN_URL: postgres://admin:password@postgres/postgres
      DOCKER_HOST: tcp://dind:2375
      CADDY_ADMIN_URL: http://caddy:2019
      REGISTRY_URL: ghcr.io/aphexcms
      REGISTRY_USERNAME: ${REGISTRY_USERNAME}
      REGISTRY_PASSWORD: ${REGISTRY_PASSWORD}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      GITHUB_APP_ID: ${GITHUB_APP_ID}
      GITHUB_APP_PRIVATE_KEY: ${GITHUB_APP_PRIVATE_KEY}
      PROVISION_S3_ENDPOINT: ${PROVISION_S3_ENDPOINT}
      PROVISION_S3_ACCESS_KEY_ID: ${PROVISION_S3_ACCESS_KEY_ID}
      PROVISION_S3_SECRET_ACCESS_KEY: ${PROVISION_S3_SECRET_ACCESS_KEY}
      PROVISION_S3_REGION: auto
      PROVISION_S3_PUBLIC_URL_BASE: https://assets.aphex.studio
      CLOUD_BASE_DOMAIN: aphex.studio
    depends_on: [postgres, dind, caddy]

volumes:
  pgdata:
  caddy_data:
  caddy_config:
```

---

## Environment variables reference

### Dashboard

```
DATABASE_URL                  platform PostgreSQL
AUTH_SECRET                   Better Auth secret (32+ chars)
AUTH_URL                      https://cloud.aphex.studio
AUTH_TRUSTED_ORIGINS          https://cloud.aphex.studio
STRIPE_SECRET_KEY             sk_live_...
STRIPE_WEBHOOK_SECRET         whsec_...
STRIPE_PRO_PRICE_ID           price_...
STRIPE_ENTERPRISE_PRICE_ID    price_...
ENCRYPTION_KEY                32 bytes, base64-encoded
GITHUB_APP_ID
GITHUB_APP_CLIENT_ID
GITHUB_APP_CLIENT_SECRET
GITHUB_WEBHOOK_SECRET
CLOUD_BASE_DOMAIN             aphex.studio
```

### Worker

```
DATABASE_URL                  platform PostgreSQL
PROVISION_DB_ADMIN_URL        admin connection for CREATE DATABASE
DOCKER_HOST                   tcp://dind:2375 (or unix socket)
CADDY_ADMIN_URL               http://caddy:2019
REGISTRY_URL                  ghcr.io/aphexcms
REGISTRY_USERNAME
REGISTRY_PASSWORD
ENCRYPTION_KEY                same key as dashboard
GITHUB_APP_ID
GITHUB_APP_PRIVATE_KEY        PEM, base64-encoded
PROVISION_S3_ENDPOINT         https://accountid.r2.cloudflarestorage.com
PROVISION_S3_ACCESS_KEY_ID
PROVISION_S3_SECRET_ACCESS_KEY
PROVISION_S3_REGION           auto
PROVISION_S3_PUBLIC_URL_BASE  https://assets.aphex.studio
CLOUD_BASE_DOMAIN             aphex.studio
```

---

## Infrastructure (`infrastructure/`)

```
infrastructure/
  caddy/
    Caddyfile

  swarm/
    init.sh           ← docker swarm init, create overlay network
    deploy.sh         ← docker stack deploy for the platform itself

  terraform/
    main.tf           ← server provisioning (Hetzner / DigitalOcean)
    variables.tf
    outputs.tf
```

### `swarm/init.sh`

```bash
#!/usr/bin/env bash
docker swarm init
docker network create --driver overlay aphex-cloud
echo "Swarm ready. Join token:"
docker swarm join-token worker
```

### `swarm/deploy.sh`

```bash
#!/usr/bin/env bash
docker stack deploy \
  --compose-file docker-compose.prod.yml \
  aphex-cloud
```

---

## Build order

Each phase is independently shippable and testable.

| Phase | What gets built | Milestone |
|---|---|---|
| 1 | Platform DB schema + Drizzle migrations | `pnpm db:push` works |
| 2 | Better Auth, login/signup UI | Users can sign up and log in |
| 3 | Stripe integration, billing UI, webhook handler | Plans, checkout, upgrade/downgrade work |
| 4 | GitHub App setup, project creation + connect repo flow | Projects exist, GitHub linked |
| 5 | Go worker — queue poller + DB provisioner | Databases provisioned on first deploy |
| 6 | Go worker — BuildKit image builder | Images built and pushed to ghcr.io |
| 7 | Go worker — Swarm orchestrator | Containers start after build |
| 8 | Go worker — Caddy admin API client | Routes registered, apps reachable at *.aphex.studio |
| 9 | Dashboard — GitHub webhook handler | Push to GitHub triggers full end-to-end deploy |
| 10 | Dashboard — SSE log streaming | Live build logs visible in UI |
| 11 | Dashboard — env var manager | Users can set/delete env vars |
| 12 | Custom domain verification + Caddy wiring | Custom domains work with SSL |
| 13 | Plan limit enforcement | Limits checked before every billable action |
| 14 | Usage recording + billing sync | Usage shown in dashboard, Stripe invoices match |
| 15 | Health checks + auto-restart | Failed containers recover automatically |
| 16 | Preview environments (pro+) | PR open/close creates/destroys preview envs |

**Shippable product at phase 9.** Users can sign up, connect a repo, push
code, and see it deployed live at `their-project.aphex.studio`. Everything
after is polish, reliability, and features.
