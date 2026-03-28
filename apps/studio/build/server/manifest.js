const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([".DS_Store","images/aphex-darkmode.png","images/aphex-lightmode.png","robots.txt","uploads/192.168.1.28 Image (1).jpeg","uploads/192.168.1.28 Image (2).jpeg","uploads/192.168.1.28 Image.jpeg","uploads/5ed454ab image 1380x1380 (1).avif","uploads/5ed454ab image 1380x1380 (2).avif","uploads/5ed454ab image 1380x1380 (3).avif","uploads/5ed454ab image 1380x1380 (4).avif","uploads/5ed454ab image 1380x1380.avif","uploads/AEV48.jpg","uploads/DSP Matrix mixer AVE808.docx (1).png","uploads/DSP-AVE Karaoke AVE-Karaoke.docx.png","uploads/Power-Dynamics-LOGO-BLACK (1).png","uploads/Power-Dynamics-LOGO-BLACK.png","uploads/tumblr_lxqljtaDg81qbs47q540 (1).gif","uploads/tumblr_lxqljtaDg81qbs47q540 (2).gif","uploads/tumblr_lxqljtaDg81qbs47q540 (3).gif","uploads/tumblr_lxqljtaDg81qbs47q540.gif"]),
	mimeTypes: {".png":"image/png",".txt":"text/plain",".jpeg":"image/jpeg",".avif":"image/avif",".jpg":"image/jpeg",".gif":"image/gif"},
	_: {
		client: {start:"_app/immutable/entry/start.Dm6nlCBz.js",app:"_app/immutable/entry/app.ChaTQtGn.js",imports:["_app/immutable/entry/start.Dm6nlCBz.js","_app/immutable/chunks/Bcrdfp_K.js","_app/immutable/chunks/CK91KPpo.js","_app/immutable/chunks/ngokrZaz.js","_app/immutable/entry/app.ChaTQtGn.js","_app/immutable/chunks/CK91KPpo.js","_app/immutable/chunks/CPc8x607.js","_app/immutable/chunks/D8MlOj3o.js","_app/immutable/chunks/BDCi2jMF.js","_app/immutable/chunks/ngokrZaz.js","_app/immutable/chunks/C0mwdGTf.js","_app/immutable/chunks/dt7zgPvE.js","_app/immutable/chunks/DUACBwDd.js","_app/immutable/chunks/o_7Dr-qM.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-Bi_0XR3c.js')),
			__memo(() => import('./chunks/1-yikbtI4b.js')),
			__memo(() => import('./chunks/2-ZoJyOBHX.js')),
			__memo(() => import('./chunks/3-CekbUYnU.js')),
			__memo(() => import('./chunks/4-DTErmfMN.js')),
			__memo(() => import('./chunks/5-C7fVSrgN.js')),
			__memo(() => import('./chunks/6-nNmlHWJi.js')),
			__memo(() => import('./chunks/7-C5bgKf6T.js')),
			__memo(() => import('./chunks/8-gdGkQ6VZ.js')),
			__memo(() => import('./chunks/9-Dwx6YuPM.js')),
			__memo(() => import('./chunks/10-tt0N2rdq.js')),
			__memo(() => import('./chunks/11-B4KNByDp.js')),
			__memo(() => import('./chunks/12-8b7Mvvl0.js')),
			__memo(() => import('./chunks/13-BZDTT8Bq.js')),
			__memo(() => import('./chunks/14-BKAD9ala.js')),
			__memo(() => import('./chunks/15-BHmrx95-.js')),
			__memo(() => import('./chunks/16-CRU-aKCE.js')),
			__memo(() => import('./chunks/17-D0jtBwCm.js')),
			__memo(() => import('./chunks/18-DBTIIRPA.js')),
			__memo(() => import('./chunks/19-BsMfkmTk.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/(protected)/admin",
				pattern: /^\/admin\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/(protected)/admin/organizations",
				pattern: /^\/admin\/organizations\/?$/,
				params: [],
				page: { layouts: [0,2,], errors: [1,,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/(protected)/admin/settings",
				pattern: /^\/admin\/settings\/?$/,
				params: [],
				page: { layouts: [0,2,3,], errors: [1,,,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/(protected)/admin/settings/account",
				pattern: /^\/admin\/settings\/account\/?$/,
				params: [],
				page: { layouts: [0,2,3,], errors: [1,,,], leaf: 9 },
				endpoint: null
			},
			{
				id: "/(protected)/admin/settings/api-keys",
				pattern: /^\/admin\/settings\/api-keys\/?$/,
				params: [],
				page: { layouts: [0,2,3,], errors: [1,,,], leaf: 10 },
				endpoint: null
			},
			{
				id: "/(protected)/admin/settings/members",
				pattern: /^\/admin\/settings\/members\/?$/,
				params: [],
				page: { layouts: [0,2,3,], errors: [1,,,], leaf: 11 },
				endpoint: null
			},
			{
				id: "/api/assets",
				pattern: /^\/api\/assets\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Bj4Io5hF.js'))
			},
			{
				id: "/api/assets/bulk",
				pattern: /^\/api\/assets\/bulk\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-x6VUqgv-.js'))
			},
			{
				id: "/api/assets/references/counts",
				pattern: /^\/api\/assets\/references\/counts\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-C1zJmTVf.js'))
			},
			{
				id: "/api/assets/[id]",
				pattern: /^\/api\/assets\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BI42iGCE.js'))
			},
			{
				id: "/api/assets/[id]/references",
				pattern: /^\/api\/assets\/([^/]+?)\/references\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-MAOemwRV.js'))
			},
			{
				id: "/api/documents",
				pattern: /^\/api\/documents\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-MB2FRap1.js'))
			},
			{
				id: "/api/documents/query",
				pattern: /^\/api\/documents\/query\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BJ9Gfi0T.js'))
			},
			{
				id: "/api/documents/[id]",
				pattern: /^\/api\/documents\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Cp6oSMx6.js'))
			},
			{
				id: "/api/documents/[id]/publish",
				pattern: /^\/api\/documents\/([^/]+?)\/publish\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BmqpXefW.js'))
			},
			{
				id: "/api/instance-settings",
				pattern: /^\/api\/instance-settings\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BzBfaBA6.js'))
			},
			{
				id: "/api/invitations",
				pattern: /^\/api\/invitations\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Bnem_FqL.js'))
			},
			{
				id: "/api/invitations/[id]/accept",
				pattern: /^\/api\/invitations\/([^/]+?)\/accept\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CWhcYEwV.js'))
			},
			{
				id: "/api/invitations/[id]/reject",
				pattern: /^\/api\/invitations\/([^/]+?)\/reject\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-00k6QwqU.js'))
			},
			{
				id: "/api/organizations",
				pattern: /^\/api\/organizations\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-B2PiQZ1s.js'))
			},
			{
				id: "/api/organizations/invitations",
				pattern: /^\/api\/organizations\/invitations\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BAWev41m.js'))
			},
			{
				id: "/api/organizations/members",
				pattern: /^\/api\/organizations\/members\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-usqAb7s0.js'))
			},
			{
				id: "/api/organizations/switch",
				pattern: /^\/api\/organizations\/switch\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-oEIecCsv.js'))
			},
			{
				id: "/api/organizations/[id]",
				pattern: /^\/api\/organizations\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DUiL8SxL.js'))
			},
			{
				id: "/api/schemas",
				pattern: /^\/api\/schemas\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-C90dPOIu.js'))
			},
			{
				id: "/api/schemas/[type]",
				pattern: /^\/api\/schemas\/([^/]+?)\/?$/,
				params: [{"name":"type","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BzFHNVEc.js'))
			},
			{
				id: "/api/seed-movies",
				pattern: /^\/api\/seed-movies\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DtQpryi1.js'))
			},
			{
				id: "/api/settings/api-keys",
				pattern: /^\/api\/settings\/api-keys\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DLEarWQ5.js'))
			},
			{
				id: "/api/settings/api-keys/[id]",
				pattern: /^\/api\/settings\/api-keys\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CRWDC22a.js'))
			},
			{
				id: "/api/user",
				pattern: /^\/api\/user\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CuuGg8EC.js'))
			},
			{
				id: "/api/user/cms-preference",
				pattern: /^\/api\/user\/cms-preference\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CQPj2udz.js'))
			},
			{
				id: "/api/user/request-password-reset",
				pattern: /^\/api\/user\/request-password-reset\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BMuPB-Cc.js'))
			},
			{
				id: "/api/user/reset-password",
				pattern: /^\/api\/user\/reset-password\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DaE6Cnej.js'))
			},
			{
				id: "/god-mode",
				pattern: /^\/god-mode\/?$/,
				params: [],
				page: { layouts: [0,4,], errors: [1,,], leaf: 12 },
				endpoint: null
			},
			{
				id: "/god-mode/organizations",
				pattern: /^\/god-mode\/organizations\/?$/,
				params: [],
				page: { layouts: [0,4,], errors: [1,,], leaf: 13 },
				endpoint: null
			},
			{
				id: "/invitations",
				pattern: /^\/invitations\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 14 },
				endpoint: null
			},
			{
				id: "/invite/[token]",
				pattern: /^\/invite\/([^/]+?)\/?$/,
				params: [{"name":"token","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 15 },
				endpoint: null
			},
			{
				id: "/login",
				pattern: /^\/login\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 16 },
				endpoint: null
			},
			{
				id: "/media/[id]/[filename]",
				pattern: /^\/media\/([^/]+?)\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false},{"name":"filename","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-D0mY1ls6.js'))
			},
			{
				id: "/render",
				pattern: /^\/render\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 17 },
				endpoint: null
			},
			{
				id: "/reset-password/[token]",
				pattern: /^\/reset-password\/([^/]+?)\/?$/,
				params: [{"name":"token","optional":false,"rest":false,"chained":false}],
				page: { layouts: [0,], errors: [1,], leaf: 18 },
				endpoint: null
			},
			{
				id: "/verify-email",
				pattern: /^\/verify-email\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 19 },
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
