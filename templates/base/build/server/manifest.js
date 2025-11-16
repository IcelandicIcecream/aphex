const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set(["favicon.svg","images/aphex-darkmode.png","images/aphex-lightmode.png","robots.txt"]),
	mimeTypes: {".svg":"image/svg+xml",".png":"image/png",".txt":"text/plain"},
	_: {
		client: {start:"_app/immutable/entry/start.B75RIXFX.js",app:"_app/immutable/entry/app.CN6BjXm9.js",imports:["_app/immutable/entry/start.B75RIXFX.js","_app/immutable/chunks/CrOXdnIQ.js","_app/immutable/chunks/zhm3sqsy.js","_app/immutable/chunks/DWBROaph.js","_app/immutable/entry/app.CN6BjXm9.js","_app/immutable/chunks/DWBROaph.js","_app/immutable/chunks/zhm3sqsy.js","_app/immutable/chunks/DsnmJJEf.js","_app/immutable/chunks/CrQaW3DA.js","_app/immutable/chunks/D4agE4Ng.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-CJ70pQUg.js')),
			__memo(() => import('./chunks/1-DXmedy64.js')),
			__memo(() => import('./chunks/2-OdplYznA.js')),
			__memo(() => import('./chunks/3-BonFCUTv.js')),
			__memo(() => import('./chunks/4-Di0Lu3Jy.js')),
			__memo(() => import('./chunks/5-DQPGeqpy.js')),
			__memo(() => import('./chunks/6-B8jxMFnx.js')),
			__memo(() => import('./chunks/7-AT_3UdUw.js')),
			__memo(() => import('./chunks/8-CUjfouZY.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/(protected)/admin",
				pattern: /^\/admin\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/(protected)/admin/organizations",
				pattern: /^\/admin\/organizations\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/(protected)/admin/settings",
				pattern: /^\/admin\/settings\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/api/assets",
				pattern: /^\/api\/assets\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-C2DgSBVF.js'))
			},
			{
				id: "/api/assets/[id]",
				pattern: /^\/api\/assets\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DNqVwb0W.js'))
			},
			{
				id: "/api/documents",
				pattern: /^\/api\/documents\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DagNqmGv.js'))
			},
			{
				id: "/api/documents/[id]",
				pattern: /^\/api\/documents\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-UlhGKAK5.js'))
			},
			{
				id: "/api/documents/[id]/publish",
				pattern: /^\/api\/documents\/([^/]+?)\/publish\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CoJGxTaP.js'))
			},
			{
				id: "/api/organizations",
				pattern: /^\/api\/organizations\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-B12cWJqH.js'))
			},
			{
				id: "/api/organizations/invitations",
				pattern: /^\/api\/organizations\/invitations\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BuJ5h7N5.js'))
			},
			{
				id: "/api/organizations/members",
				pattern: /^\/api\/organizations\/members\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-B5i9JUjS.js'))
			},
			{
				id: "/api/organizations/switch",
				pattern: /^\/api\/organizations\/switch\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BKzL1w1M.js'))
			},
			{
				id: "/api/organizations/[id]",
				pattern: /^\/api\/organizations\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-_7zXh_kM.js'))
			},
			{
				id: "/api/schemas",
				pattern: /^\/api\/schemas\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-monPx8jd.js'))
			},
			{
				id: "/api/schemas/[type]",
				pattern: /^\/api\/schemas\/([^/]+?)\/?$/,
				params: [{"name":"type","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-B55clK0L.js'))
			},
			{
				id: "/api/settings/api-keys",
				pattern: /^\/api\/settings\/api-keys\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CZxkt7Ax.js'))
			},
			{
				id: "/api/settings/api-keys/[id]",
				pattern: /^\/api\/settings\/api-keys\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BHVxoVVi.js'))
			},
			{
				id: "/api/user",
				pattern: /^\/api\/user\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BOESmVj7.js'))
			},
			{
				id: "/api/user/request-password-reset",
				pattern: /^\/api\/user\/request-password-reset\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BC2Ad0Tq.js'))
			},
			{
				id: "/api/user/reset-password",
				pattern: /^\/api\/user\/reset-password\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-C140B2sL.js'))
			},
			{
				id: "/login",
				pattern: /^\/login\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/media/[id]/[filename]",
				pattern: /^\/media\/([^/]+?)\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false},{"name":"filename","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BoW_dP8a.js'))
			},
			{
				id: "/reset-password/[token]",
				pattern: /^\/reset-password\/([^/]+?)\/?$/,
				params: [{"name":"token","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 8 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

const prerendered = new Set([]);

const base = "";

export { base, manifest, prerendered };
//# sourceMappingURL=manifest.js.map
