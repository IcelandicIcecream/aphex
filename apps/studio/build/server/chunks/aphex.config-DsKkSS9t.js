import './logger-C1WBmfZZ.js';
import './utils-FiC4zhrQ.js';
import { c as createStorageAdapter } from './storage-CxrQC-cN.js';
import 'sharp';
import './date-utils-xyIWAIQq.js';
import { s as schemaTypes } from './index12-ZuUw5hPA.js';
import { a as authProvider } from './index4-FTZh_aP0.js';
import { a as db } from './index2-CZgae6HB.js';
import { a as email } from './index8-DrQ5zxy0.js';
import { p as private_env } from './shared-server-BmU87nph.js';
import { a as cacheAdapter } from './instance-BV3tjq30.js';
import 'fs/promises';
import 'path';
import './_commonjsHelpers-C1uiShF5.js';
import './index5-DltsKoco.js';
import './context-CAhUmS6w.js';
import './Icon-DO-BLZpI.js';
import './sheet-content-CfdNXqIw.js';
import './utils2-CVx6kO_W.js';
import './button-1bYQaKO-.js';
import './create-id-BLMzD-FL.js';
import './index3-BFl01i1Z.js';
import './states.svelte-CxCkWsnb.js';
import './events-C5y5VZ_W.js';
import './exports-Ci9YzwMm.js';
import './mail-BIlX5HQf.js';
import './service-D_kWyptI.js';
import 'drizzle-orm';
import './auth-errors-BOr7Rsjn.js';
import './badge-DEuvdmY7.js';
import './client-BGGljB7r.js';
import 'drizzle-orm/postgres-js';
import 'postgres';
import './content-hash-AOe_NOqf.js';
import 'drizzle-orm/pg-core';
import 'events';
import 'url';
import 'util';
import 'fs';
import 'http';
import 'https';
import 'zlib';
import 'stream';
import 'net';
import 'dns';
import 'os';
import 'crypto';
import 'tls';
import 'child_process';
import 'node:crypto';
import './html-FW6Ia4bL.js';
import './string-BWrpxotr.js';
import '@better-auth/api-key';
import '@better-auth/drizzle-adapter';

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
const t = "AWS4-HMAC-SHA256", e = "aws4_request", r = "UNSIGNED-PAYLOAD", o = "application/octet-stream", s = "application/xml", n = /* @__PURE__ */ new Set(["accessKeyId", "secretAccessKey", "sessionToken", "password", "token"]), i = /* @__PURE__ */ new Set(["if-match", "if-none-match", "if-modified-since", "if-unmodified-since"]), a = "x-amz-content-sha256", c = "x-amz-checksum-sha256", h = "content-type", u = "content-length", d = "etag", l = "[s3mini] ", p = l + "accessKeyId must be a non-empty string", y = l + "secretAccessKey must be a non-empty string", f = l + "endpoint must be a non-empty string", w = l + "endpoint must be a valid URL. Expected format: https://<host>[:port][/base-path]", b = l + "key must be a non-empty string", g = l + "uploadId must be a non-empty string", m = l + "data must be a Buffer or string", E = l + "prefix must be a string", $ = l + "delimiter must be a string", j = new TextEncoder(), T = "0123456789abcdef", O = (t2) => {
  if ("string" == typeof t2) return j.encode(t2).byteLength;
  if (t2 instanceof ArrayBuffer || t2 instanceof Uint8Array) return t2.byteLength;
  if (t2 instanceof Blob) return t2.size;
  throw Error("Unsupported data type");
}, A = (t2) => {
  const e2 = new Uint8Array(t2);
  let r2 = "";
  for (const t3 of e2) r2 += T[t3 >> 4] + T[15 & t3];
  return r2;
}, S = async (t2) => {
  const e2 = j.encode(t2);
  return await globalThis.crypto.subtle.digest("SHA-256", e2);
}, U = async (t2, e2) => {
  const r2 = await globalThis.crypto.subtle.importKey("raw", "string" == typeof t2 ? j.encode(t2) : t2, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]), o2 = j.encode(e2);
  return await globalThis.crypto.subtle.sign("HMAC", r2, o2);
}, x = (t2) => {
  const e2 = { '"': "", "&quot;": "", "&#34;": "" };
  return t2.replaceAll(/(^("|&quot;|&#34;))|(("|&quot;|&#34;)$)/g, (t3) => e2[t3] || "");
}, _ = { "&quot;": '"', "&apos;": "'", "&lt;": "<", "&gt;": ">", "&amp;": "&" }, v = (t2) => t2.replaceAll(/&(quot|apos|lt|gt|amp);/g, (t3) => _[t3] ?? t3), q = (t2) => {
  const e2 = t2.replace(/<\?xml[^?]*\?>\s*/, ""), r2 = /<([A-Za-z_][\w\-.]*)[^>]*>([\s\S]*?)<\/\1>/gm, o2 = {};
  let s2;
  for (; null !== (s2 = r2.exec(e2)); ) {
    const t3 = s2[1], e3 = s2[2], r3 = e3 ? q(e3) : v(e3?.trim() || "");
    if (!t3) continue;
    const n2 = o2[t3];
    void 0 === n2 ? o2[t3] = r3 : Array.isArray(n2) ? n2.push(r3) : o2[t3] = [n2, r3];
  }
  return Object.keys(o2).length > 0 ? o2 : v(e2.trim());
}, C = (t2) => "%" + t2.charCodeAt(0).toString(16).toUpperCase(), D = (t2) => encodeURIComponent(t2).replace(/[!'()*]/g, C);
class H extends Error {
  code;
  constructor(t2, e2, r2) {
    super(t2), this.name = new.target.name, this.code = e2, this.cause = r2;
  }
}
class R extends H {
}
class k extends H {
  status;
  serviceCode;
  body;
  constructor(t2, e2, r2, o2) {
    super(t2, r2), this.status = e2, this.serviceCode = r2, this.body = o2;
  }
}
class N {
  accessKeyId;
  secretAccessKey;
  endpoint;
  region;
  bucketName;
  requestSizeInBytes;
  requestAbortTimeout;
  logger;
  fetch;
  signingKeyDate;
  signingKey;
  constructor({ accessKeyId: t2, secretAccessKey: e2, endpoint: r2, region: o2 = "auto", requestSizeInBytes: s2 = 8388608, requestAbortTimeout: n2, logger: i2, fetch: a2 = globalThis.fetch }) {
    this.t(t2, e2, r2), this.accessKeyId = t2, this.secretAccessKey = e2, this.endpoint = new URL(this.o(r2)), this.region = o2, this.bucketName = this.i(), this.requestSizeInBytes = s2, this.requestAbortTimeout = n2, this.logger = i2, this.fetch = a2;
  }
  h(t2) {
    return "object" != typeof t2 || null === t2 ? t2 : Object.keys(t2).reduce((e2, r2) => (e2[r2] = n.has(r2.toLowerCase()) ? "[REDACTED]" : "object" == typeof t2[r2] && null !== t2[r2] ? this.h(t2[r2]) : t2[r2], e2), Array.isArray(t2) ? [] : {});
  }
  u(t2, e2, r2 = {}) {
    if (this.logger && "function" == typeof this.logger[t2]) {
      const o2 = this.h(r2), s2 = { timestamp: (/* @__PURE__ */ new Date()).toISOString(), level: t2, message: e2, details: o2, context: this.h({ region: this.region, endpoint: "" + this.endpoint, accessKeyId: this.accessKeyId ? this.accessKeyId.substring(0, 4) + "..." : void 0 }) };
      this.logger[t2](JSON.stringify(s2));
    }
  }
  t(t2, e2, r2) {
    if ("string" != typeof t2 || 0 === t2.trim().length) throw new TypeError(p);
    if ("string" != typeof e2 || 0 === e2.trim().length) throw new TypeError(y);
    if ("string" != typeof r2 || 0 === r2.trim().length) throw new TypeError(f);
  }
  o(t2) {
    const e2 = /^(https?:)?\/\//i.test(t2) ? t2 : "https://" + t2;
    try {
      new URL(e2);
      let t3 = e2.length;
      for (; t3 > 0 && "/" === e2[t3 - 1]; ) t3--;
      return t3 === e2.length ? e2 : e2.substring(0, t3);
    } catch {
      const e3 = `${w} But provided: "${t2}"`;
      throw this.u("error", e3), new TypeError(e3);
    }
  }
  l(t2) {
    if ("GET" !== t2 && "HEAD" !== t2) throw this.u("error", l + "method must be either GET or HEAD"), Error(l + "method must be either GET or HEAD");
  }
  p(t2) {
    if ("string" != typeof t2 || 0 === t2.trim().length) throw this.u("error", b), new TypeError(b);
  }
  m(t2) {
    if ("string" != typeof t2 || 0 === t2.trim().length) throw this.u("error", $), new TypeError($);
  }
  $(t2) {
    if ("string" != typeof t2) throw this.u("error", E), new TypeError(E);
  }
  j(t2) {
    if ("object" != typeof t2) throw this.u("error", l + "opts must be an object"), new TypeError(l + "opts must be an object");
  }
  T(t2) {
    const e2 = {}, r2 = {};
    for (const [o2, s2] of Object.entries(t2)) i.has(o2.toLowerCase()) ? r2[o2] = s2 : e2[o2] = s2;
    return { filteredOpts: e2, conditionalHeaders: r2 };
  }
  O(t2) {
    if (!(globalThis.Buffer && t2 instanceof globalThis.Buffer || "string" == typeof t2)) throw this.u("error", m), new TypeError(m);
    return t2;
  }
  A(t2, e2, r2, o2, s2) {
    if (this.p(t2), "string" != typeof e2 || 0 === e2.trim().length) throw this.u("error", g), new TypeError(g);
    if (!Number.isInteger(o2) || o2 <= 0) throw this.u("error", l + "partNumber must be a positive integer"), new TypeError(l + "partNumber must be a positive integer");
    return this.j(s2), this.O(r2);
  }
  async S(o2, s2, n2 = {}, i2 = {}) {
    const c2 = new URL(this.endpoint);
    s2 && s2.length > 0 && (c2.pathname = "/" === c2.pathname ? "/" + s2.replace(/^\/+/, "") : `${c2.pathname}/${s2.replace(/^\/+/, "")}`);
    const h2 = /* @__PURE__ */ new Date(), u2 = `${h2.getUTCFullYear()}${(h2.getUTCMonth() + 1 + "").padStart(2, "0")}${(h2.getUTCDate() + "").padStart(2, "0")}`, d2 = `${u2}T${(h2.getUTCHours() + "").padStart(2, "0")}${(h2.getUTCMinutes() + "").padStart(2, "0")}${(h2.getUTCSeconds() + "").padStart(2, "0")}Z`, l2 = `${u2}/${this.region}/s3/${e}`;
    i2[a] = r, i2["x-amz-date"] = d2, i2.host = c2.host;
    const p2 = /* @__PURE__ */ new Set(["authorization", "content-length", "content-type", "user-agent"]);
    let y2 = "", f2 = "";
    for (const [t2, e2] of Object.entries(i2).sort(([t3], [e3]) => t3.localeCompare(e3))) {
      const r2 = t2.toLowerCase();
      p2.has(r2) || (y2 && (y2 += "\n", f2 += ";"), y2 += `${r2}:${(e2 + "").trim()}`, f2 += r2);
    }
    const w2 = `${o2}
${c2.pathname}
${this.U(n2)}
${y2}

${f2}
${r}`, b2 = `${t}
${d2}
${l2}
${A(await S(w2))}`;
    u2 === this.signingKeyDate && this.signingKey || (this.signingKeyDate = u2, this.signingKey = await this._(u2));
    const g2 = A(await U(this.signingKey, b2));
    return i2.authorization = `${t} Credential=${this.accessKeyId}/${l2}, SignedHeaders=${f2}, Signature=${g2}`, { url: "" + c2, headers: i2 };
  }
  async v(t2, e2, { query: o2 = {}, body: s2 = "", headers: n2 = {}, tolerated: i2 = [], withQuery: c2 = false } = {}) {
    const { filteredOpts: h2, conditionalHeaders: u2 } = ["GET", "HEAD"].includes(t2) ? this.T(o2) : { filteredOpts: o2, conditionalHeaders: {} }, d2 = { [a]: r, ...n2, ...u2 }, l2 = e2 ? D(e2).replaceAll("%2F", "/") : "", { url: p2, headers: y2 } = await this.S(t2, l2, h2, d2);
    Object.keys(o2).length > 0 && (c2 = true);
    const f2 = Object.fromEntries(Object.entries(h2).map(([t3, e3]) => [t3, e3 + ""])), w2 = c2 && Object.keys(h2).length ? `${p2}?${new URLSearchParams(f2)}` : p2, b2 = Object.fromEntries(Object.entries(y2).map(([t3, e3]) => [t3, e3 + ""]));
    return this.q(w2, t2, b2, s2, i2);
  }
  sanitizeETag(t2) {
    return x(t2);
  }
  async createBucket() {
    const t2 = `
      <CreateBucketConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
        <LocationConstraint>${this.region}</LocationConstraint>
      </CreateBucketConfiguration>
    `, e2 = { [h]: s, [u]: O(t2) };
    return 200 === (await this.v("PUT", "", { body: t2, headers: e2, tolerated: [200, 404, 403, 409] })).status;
  }
  i() {
    const t2 = this.endpoint, e2 = t2.pathname.split("/").filter(Boolean);
    if (e2.length > 0 && "string" == typeof e2[0]) return e2[0];
    const r2 = t2.hostname.split(".");
    if (r2.length >= 3) {
      const t3 = r2.slice(-2).join(".");
      if (["amazonaws.com", "digitaloceanspaces.com", "cloudflare.com"].some((e3) => t3.includes(e3)) && "string" == typeof r2[0]) return r2[0];
    }
    return r2[0] || "";
  }
  async bucketExists() {
    return 200 === (await this.v("HEAD", "", { tolerated: [200, 404, 403] })).status;
  }
  async listObjects(t2 = "/", e2 = "", r2, o2 = {}) {
    this.m(t2), this.$(e2), this.j(o2);
    const s2 = "/" === t2 ? t2 : D(t2), n2 = !(r2 && r2 > 0);
    let i2, a2 = n2 ? 1 / 0 : r2;
    const c2 = [];
    do {
      const t3 = await this.C(s2, e2, a2, i2, o2);
      if (null === t3) return null;
      c2.push(...t3.objects), n2 || (a2 -= t3.objects.length), i2 = t3.continuationToken;
    } while (i2 && a2 > 0);
    return c2;
  }
  async C(t2, e2, r2, o2, s2) {
    const n2 = this.D(e2, r2, o2, s2), i2 = await this.v("GET", t2, { query: n2, withQuery: true, tolerated: [200, 404] });
    if (404 === i2.status) return null;
    200 !== i2.status && await this.H(i2);
    const a2 = await i2.text();
    return this.R(a2);
  }
  D(t2, e2, r2, o2) {
    return { "list-type": "2", "max-keys": Math.min(e2, 1e3) + "", ...t2 ? { prefix: t2 } : {}, ...r2 ? { "continuation-token": r2 } : {}, ...o2 };
  }
  async H(t2) {
    const e2 = await t2.text(), r2 = this.k(t2.headers, e2), o2 = t2.headers.get("x-amz-error-code") ?? r2.svcCode ?? "Unknown", s2 = t2.headers.get("x-amz-error-message") ?? r2.errorMessage ?? t2.statusText;
    throw this.u("error", `${l}Request failed with status ${t2.status}: ${o2} - ${s2}, err body: ${e2}`), Error(`${l}Request failed with status ${t2.status}: ${o2} - ${s2}, err body: ${e2}`);
  }
  R(t2) {
    const e2 = q(t2);
    if ("object" != typeof e2 || !e2 || "error" in e2) throw this.u("error", `${l}Unexpected listObjects response shape: ${JSON.stringify(e2)}`), Error(l + "Unexpected listObjects response shape");
    const r2 = e2.ListBucketResult || e2.listBucketResult || e2;
    return { objects: this.P(r2), continuationToken: this.N(r2) };
  }
  P(t2) {
    const e2 = t2.Contents || t2.contents;
    return e2 ? Array.isArray(e2) ? e2 : [e2] : [];
  }
  N(t2) {
    if ("true" === t2.IsTruncated || "true" === t2.isTruncated) return t2.NextContinuationToken || t2.nextContinuationToken || t2.NextMarker || t2.nextMarker;
  }
  async listMultipartUploads(t2 = "/", e2 = "", r2 = "GET", o2 = {}) {
    this.m(t2), this.$(e2), this.l(r2), this.j(o2);
    const s2 = { uploads: "", ...o2 }, n2 = "/" === t2 ? t2 : D(t2), i2 = await this.v(r2, n2, { query: s2, withQuery: true }), a2 = q(await i2.text());
    if ("object" != typeof a2 || null === a2) throw Error(l + "Unexpected listMultipartUploads response shape");
    return "listMultipartUploadsResult" in a2 ? a2.listMultipartUploadsResult : a2;
  }
  async getObject(t2, e2 = {}, r2) {
    const o2 = await this.v("GET", t2, { query: e2, tolerated: [200, 404, 412, 304], headers: r2 ? { ...r2 } : void 0 });
    return [404, 412, 304].includes(o2.status) ? null : o2.text();
  }
  async getObjectResponse(t2, e2 = {}, r2) {
    const o2 = await this.v("GET", t2, { query: e2, tolerated: [200, 404, 412, 304], headers: r2 ? { ...r2 } : void 0 });
    return [404, 412, 304].includes(o2.status) ? null : o2;
  }
  async getObjectArrayBuffer(t2, e2 = {}, r2) {
    const o2 = await this.v("GET", t2, { query: e2, tolerated: [200, 404, 412, 304], headers: r2 ? { ...r2 } : void 0 });
    return [404, 412, 304].includes(o2.status) ? null : o2.arrayBuffer();
  }
  async getObjectJSON(t2, e2 = {}, r2) {
    const o2 = await this.v("GET", t2, { query: e2, tolerated: [200, 404, 412, 304], headers: r2 ? { ...r2 } : void 0 });
    return [404, 412, 304].includes(o2.status) ? null : o2.json();
  }
  async getObjectWithETag(t2, e2 = {}, r2) {
    try {
      const o2 = await this.v("GET", t2, { query: e2, tolerated: [200, 404, 412, 304], headers: r2 ? { ...r2 } : void 0 });
      if ([404, 412, 304].includes(o2.status)) return { etag: null, data: null };
      const s2 = o2.headers.get(d);
      if (!s2) throw Error(l + "ETag not found in response headers");
      return { etag: x(s2), data: await o2.arrayBuffer() };
    } catch (e3) {
      throw this.u("error", `Error getting object ${t2} with ETag: ${e3 + ""}`), e3;
    }
  }
  async getObjectRaw(t2, e2 = true, r2 = 0, o2 = this.requestSizeInBytes, s2 = {}, n2) {
    return this.v("GET", t2, { query: { ...s2 }, headers: { ...e2 ? {} : { range: `bytes=${r2}-${o2 - 1}` }, ...n2 }, withQuery: true });
  }
  async getContentLength(t2, e2) {
    try {
      const r2 = (await this.v("HEAD", t2, { headers: e2 ? { ...e2 } : void 0 })).headers.get(u);
      return r2 ? +r2 : 0;
    } catch (e3) {
      throw this.u("error", `Error getting content length for object ${t2}: ${e3 + ""}`), Error(`${l}Error getting content length for object ${t2}: ${e3 + ""}`);
    }
  }
  async objectExists(t2, e2 = {}) {
    const r2 = await this.v("HEAD", t2, { query: e2, tolerated: [200, 404, 412, 304] });
    return 404 !== r2.status && (412 !== r2.status && 304 !== r2.status || null);
  }
  async getEtag(t2, e2 = {}, r2) {
    const o2 = await this.v("HEAD", t2, { query: e2, tolerated: [200, 304, 404, 412], headers: r2 ? { ...r2 } : void 0 });
    if (404 === o2.status) return null;
    if (412 === o2.status || 304 === o2.status) return null;
    const s2 = o2.headers.get(d);
    if (!s2) throw Error(l + "ETag not found in response headers");
    return x(s2);
  }
  async putObject(t2, e2, r2 = o, s2, n2) {
    return this.v("PUT", t2, { body: this.O(e2), headers: { [u]: O(e2), [h]: r2, ...n2, ...s2 }, tolerated: [200] });
  }
  async getMultipartUploadId(t2, e2 = o, r2) {
    if (this.p(t2), "string" != typeof e2) throw new TypeError(l + "fileType must be a string");
    const s2 = { [h]: e2, ...r2 }, n2 = await this.v("POST", t2, { query: { uploads: "" }, headers: s2, withQuery: true }), i2 = q(await n2.text());
    if (i2 && "object" == typeof i2) {
      const t3 = i2.initiateMultipartUploadResult || i2.InitiateMultipartUploadResult;
      if (t3 && "object" == typeof t3) {
        const e3 = t3.uploadId || t3.UploadId;
        if (e3 && "string" == typeof e3) return e3;
      }
    }
    throw Error(`${l}Failed to create multipart upload: ${JSON.stringify(i2)}`);
  }
  async uploadPart(t2, e2, r2, o2, s2 = {}, n2) {
    const i2 = this.A(t2, e2, r2, o2, s2), a2 = { uploadId: e2, partNumber: o2, ...s2 }, c2 = await this.v("PUT", t2, { query: a2, body: i2, headers: { [u]: O(r2), ...n2 } });
    return { partNumber: o2, etag: x(c2.headers.get("etag") || "") };
  }
  async completeMultipartUpload(t2, e2, r2) {
    const o2 = { uploadId: e2 }, n2 = this.I(r2), i2 = { [h]: s, [u]: O(n2) }, a2 = await this.v("POST", t2, { query: o2, body: n2, headers: i2, withQuery: true }), c2 = q(await a2.text());
    if (c2 && "object" == typeof c2) {
      const t3 = c2.completeMultipartUploadResult || c2.CompleteMultipartUploadResult || c2;
      if (t3 && "object" == typeof t3) {
        const e3 = t3, r3 = e3.ETag || e3.eTag || e3.etag;
        return r3 && "string" == typeof r3 ? { ...e3, etag: x(r3) } : t3;
      }
    }
    throw Error(`${l}Failed to complete multipart upload: ${JSON.stringify(c2)}`);
  }
  async abortMultipartUpload(t2, e2, r2) {
    if (this.p(t2), !e2) throw new TypeError(g);
    const o2 = { uploadId: e2 }, n2 = { [h]: s, ...r2 ? { ...r2 } : {} }, i2 = await this.v("DELETE", t2, { query: o2, headers: n2, withQuery: true }), a2 = q(await i2.text());
    if (a2 && "error" in a2 && "object" == typeof a2.error && null !== a2.error && "message" in a2.error) throw this.u("error", `${l}Failed to abort multipart upload: ${a2.error.message + ""}`), Error(`${l}Failed to abort multipart upload: ${a2.error.message + ""}`);
    return { status: "Aborted", key: t2, uploadId: e2, response: a2 };
  }
  I(t2) {
    let e2 = "<CompleteMultipartUpload>";
    for (const r2 of t2) e2 += `<Part><PartNumber>${r2.partNumber}</PartNumber><ETag>${r2.etag}</ETag></Part>`;
    return e2 += "</CompleteMultipartUpload>", e2;
  }
  async M(t2, e2, r2) {
    const { metadataDirective: o2 = "COPY", metadata: s2 = {}, contentType: n2, storageClass: i2, taggingDirective: a2, websiteRedirectLocation: c2, sourceSSECHeaders: u2 = {}, destinationSSECHeaders: d2 = {}, additionalHeaders: l2 = {} } = r2, p2 = { "x-amz-copy-source": e2, "x-amz-metadata-directive": o2, ...l2, ...n2 && { [h]: n2 }, ...i2 && { "x-amz-storage-class": i2 }, ...a2 && { "x-amz-tagging-directive": a2 }, ...c2 && { "x-amz-website-redirect-location": c2 }, ...this.G(u2, d2), ..."REPLACE" === o2 ? this.L(s2) : {} };
    try {
      const e3 = await this.v("PUT", t2, { headers: p2, tolerated: [200] });
      return this.K(await e3.text());
    } catch (e3) {
      throw this.u("error", "Error in copy operation to " + t2, { error: e3 + "" }), e3;
    }
  }
  copyObject(t2, e2, r2 = {}) {
    this.p(t2), this.p(e2);
    const o2 = `/${this.bucketName}/${D(t2)}`;
    return this.M(e2, o2, r2);
  }
  G(t2, e2) {
    const r2 = {};
    for (const [o2, s2] of Object.entries({ ...t2, ...e2 })) void 0 !== s2 && (r2[o2] = s2);
    return r2;
  }
  async moveObject(t2, e2, r2 = {}) {
    try {
      const o2 = await this.copyObject(t2, e2, r2);
      if (!await this.deleteObject(t2)) throw Error(l + "Failed to delete source object after successful copy");
      return o2;
    } catch (r3) {
      throw this.u("error", `Error moving object from ${t2} to ${e2}`, { error: r3 + "" }), r3;
    }
  }
  L(t2) {
    const e2 = {};
    for (const [r2, o2] of Object.entries(t2)) e2[r2.startsWith("x-amz-meta-") ? r2 : "x-amz-meta-" + r2] = o2;
    return e2;
  }
  K(t2) {
    const e2 = q(t2);
    if (!e2 || "object" != typeof e2) throw Error(l + "Unexpected copyObject response format");
    const r2 = e2.CopyObjectResult || e2.copyObjectResult || e2, o2 = r2.ETag || r2.eTag || r2.etag, s2 = r2.LastModified || r2.lastModified;
    if (!o2 || "string" != typeof o2) throw Error(l + "ETag not found in copyObject response");
    return { etag: x(o2), lastModified: s2 ? new Date(s2) : void 0 };
  }
  async deleteObject(t2) {
    const e2 = await this.v("DELETE", t2, { tolerated: [200, 204] });
    return 200 === e2.status || 204 === e2.status;
  }
  async B(t2) {
    const e2 = "<Delete>" + t2.map((t3) => {
      return `<Object><Key>${e3 = t3, e3.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;")}</Key></Object>`;
      var e3;
    }).join("") + "</Delete>", r2 = ((t3) => {
      const e3 = new Uint8Array(t3);
      let r3 = "";
      for (let t4 = 0; t4 < e3.length; t4 += 32768) {
        const o3 = e3.subarray(t4, t4 + 32768);
        r3 += btoa(String.fromCodePoint(...o3));
      }
      return r3;
    })(await S(e2)), o2 = { [h]: s, [u]: O(e2), [c]: r2 }, n2 = await this.v("POST", "", { query: { delete: "" }, body: e2, headers: o2, withQuery: true }), i2 = q(await n2.text());
    if (!i2 || "object" != typeof i2) throw Error(`${l}Failed to delete objects: ${JSON.stringify(i2)}`);
    const a2 = i2.DeleteResult || i2.deleteResult || i2, d2 = /* @__PURE__ */ new Map();
    for (const e3 of t2) d2.set(e3, false);
    const p2 = a2.deleted || a2.Deleted;
    if (p2) {
      const t3 = Array.isArray(p2) ? p2 : [p2];
      for (const e3 of t3) if (e3 && "object" == typeof e3) {
        const t4 = e3.key || e3.Key;
        t4 && "string" == typeof t4 && d2.set(t4, true);
      }
    }
    const y2 = a2.error || a2.Error;
    if (y2) {
      const t3 = Array.isArray(y2) ? y2 : [y2];
      for (const e3 of t3) if (e3 && "object" == typeof e3) {
        const t4 = e3.key || e3.Key, r3 = e3.code || e3.Code, o3 = e3.message || e3.Message;
        t4 && "string" == typeof t4 && (d2.set(t4, false), this.u("warn", "Failed to delete object: " + t4, { code: r3 || "Unknown", message: o3 || "Unknown error" }));
      }
    }
    return t2.map((t3) => d2.get(t3) || false);
  }
  async deleteObjects(t2) {
    if (!Array.isArray(t2) || 0 === t2.length) return [];
    const e2 = 1e3;
    if (t2.length > e2) {
      const r2 = [];
      for (let o2 = 0; o2 < t2.length; o2 += e2) {
        const s2 = t2.slice(o2, o2 + e2);
        r2.push(this.B(s2));
      }
      return (await Promise.all(r2)).flat();
    }
    return await this.B(t2);
  }
  async q(t2, e2, r2, o2, s2 = []) {
    this.u("info", `Sending ${e2} request to ${t2}`, "headers: " + JSON.stringify(r2));
    try {
      const n2 = await this.fetch(t2, { method: e2, headers: r2, body: ["GET", "HEAD"].includes(e2) ? void 0 : o2, signal: this.requestAbortTimeout ? AbortSignal.timeout(this.requestAbortTimeout) : void 0 });
      return this.u("info", `Response status: ${n2.status}, tolerated: ${s2.join(",")}`), n2.ok || s2.includes(n2.status) || await this.F(n2), n2;
    } catch (t3) {
      const e3 = ((t4) => {
        if ("object" != typeof t4 || null === t4) return;
        const e4 = t4;
        return "string" == typeof e4.code ? e4.code : "string" == typeof e4.cause?.code ? e4.cause.code : void 0;
      })(t3);
      if (e3 && ["ENOTFOUND", "EAI_AGAIN", "ETIMEDOUT", "ECONNREFUSED"].includes(e3)) throw new R("S3 network error: " + e3, e3, t3);
      throw t3;
    }
  }
  k(t2, e2) {
    if ("application/xml" !== t2.get("content-type")) return {};
    const r2 = q(e2);
    if (!r2 || "object" != typeof r2 || !("Error" in r2) || !r2.Error || "object" != typeof r2.Error) return {};
    const o2 = r2.Error;
    return { svcCode: "Code" in o2 && "string" == typeof o2.Code ? o2.Code : void 0, errorMessage: "Message" in o2 && "string" == typeof o2.Message ? o2.Message : void 0 };
  }
  async F(t2) {
    const e2 = await t2.text(), r2 = this.k(t2.headers, e2), o2 = t2.headers.get("x-amz-error-code") ?? r2.svcCode ?? "Unknown", s2 = t2.headers.get("x-amz-error-message") ?? r2.errorMessage ?? t2.statusText;
    throw this.u("error", `${l}Request failed with status ${t2.status}: ${o2} - ${s2},err body: ${e2}`), new k(`S3 returned ${t2.status} – ${o2}`, t2.status, o2, e2);
  }
  U(t2) {
    return t2 && 0 !== Object.keys(t2).length ? Object.keys(t2).map((e2) => `${encodeURIComponent(e2)}=${encodeURIComponent(t2[e2])}`).sort((t3, e2) => t3.localeCompare(e2)).join("&") : "";
  }
  async _(t2) {
    const r2 = await U("AWS4" + this.secretAccessKey, t2), o2 = await U(r2, this.region), s2 = await U(o2, "s3");
    return await U(s2, e);
  }
}
class S3StorageAdapter {
  name = "s3";
  client;
  bucket;
  publicUrl;
  config;
  constructor(config) {
    const { bucket, endpoint, accessKeyId, secretAccessKey, region, publicUrl } = config.options;
    this.client = new N({
      endpoint,
      accessKeyId,
      secretAccessKey,
      region: region || "auto"
    });
    this.bucket = bucket;
    this.publicUrl = publicUrl || endpoint;
    this.config = {
      basePath: config.basePath ?? "",
      baseUrl: config.baseUrl || this.publicUrl,
      maxFileSize: config.maxFileSize || 10 * 1024 * 1024
      // 10MB default
    };
  }
  generateUniqueFilename(originalFilename) {
    const lastDot = originalFilename.lastIndexOf(".");
    const name = lastDot > -1 ? originalFilename.substring(0, lastDot) : originalFilename;
    const ext = lastDot > -1 ? originalFilename.substring(lastDot) : "";
    return `${name}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
  }
  async store(data) {
    if (data.size > this.config.maxFileSize) {
      throw new Error(`File too large: ${data.size} bytes`);
    }
    const filename = this.generateUniqueFilename(data.filename);
    const s3Key = this.config.basePath ? `${this.bucket}/${this.config.basePath}/${filename}` : `${this.bucket}/${filename}`;
    const publicPath = this.config.basePath ? `${this.config.basePath}/${filename}` : filename;
    const buffer = Buffer.isBuffer(data.buffer) ? data.buffer : Buffer.from(data.buffer);
    await this.client.putObject(s3Key, buffer, data.mimeType);
    return {
      path: s3Key,
      url: `${this.config.baseUrl}/${publicPath}`,
      size: data.size
    };
  }
  async delete(path) {
    return await this.client.deleteObject(path);
  }
  async exists(path) {
    try {
      const response = await this.client.objectExists(path);
      return Boolean(response?.valueOf?.() ?? response);
    } catch (error) {
      console.error(`Error checking existence of ${path}:`, error);
      return false;
    }
  }
  getUrl(path) {
    const pathWithoutBucket = path.startsWith(`${this.bucket}/`) ? path.slice(this.bucket.length + 1) : path;
    return `${this.config.baseUrl}/${pathWithoutBucket}`;
  }
  async getStorageInfo() {
    return { totalSize: 0 };
  }
  async isHealthy() {
    try {
      return await this.client.bucketExists();
    } catch {
      return false;
    }
  }
  async getSignedUrl(path) {
    return this.getUrl(path);
  }
}
function s3Storage(config) {
  return {
    adapter: new S3StorageAdapter({
      basePath: config.basePath ?? "",
      baseUrl: config.baseUrl || config.publicUrl || config.endpoint,
      maxFileSize: config.maxFileSize,
      options: {
        bucket: config.bucket,
        endpoint: config.endpoint,
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        region: config.region,
        publicUrl: config.publicUrl
      }
    }),
    disableLocalStorage: true
  };
}
let storageAdapter;
if (private_env.R2_BUCKET && private_env.R2_ENDPOINT && private_env.R2_ACCESS_KEY_ID && private_env.R2_SECRET_ACCESS_KEY) {
  storageAdapter = s3Storage({
    bucket: private_env.R2_BUCKET,
    endpoint: private_env.R2_ENDPOINT,
    accessKeyId: private_env.R2_ACCESS_KEY_ID,
    secretAccessKey: private_env.R2_SECRET_ACCESS_KEY,
    publicUrl: private_env.R2_PUBLIC_URL || ""
  }).adapter;
} else {
  storageAdapter = createStorageAdapter("local", {
    basePath: "./static/uploads",
    baseUrl: "/uploads"
  });
}
const cmsConfig = createCMSConfig({
  schemaTypes,
  // Provide the shared database and storage adapter instances directly.
  // These are created once in their respective /lib/server/.. files.
  database: db,
  storage: storageAdapter,
  email,
  cache: cacheAdapter,
  auth: {
    provider: authProvider,
    loginUrl: "/login"
    // Redirect here when unauthenticated
  },
  // GraphQL is built-in and enabled by default.
  // Set to false to disable, or pass config: { defaultPerspective: 'draft', path: '/api/graphql' }
  graphql: {
    defaultPerspective: "draft",
    path: "/api/aphex-graphql"
  },
  customization: {
    branding: {
      title: "Aphex"
    }
  }
});

export { cmsConfig as default };
//# sourceMappingURL=aphex.config-DsKkSS9t.js.map
