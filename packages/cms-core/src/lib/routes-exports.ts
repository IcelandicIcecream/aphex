// SK-style route handlers re-exported for studio/template `+server.ts` shims
// that haven't moved onto the Hono catch-all yet. Most cms-core endpoints
// now live in `server/api/` as Hono routers — these are the holdouts.

export { GET as serveAssetCDN } from './routes/assets-cdn';
export {
	POST as inviteMember,
	DELETE as cancelInvitation
} from './routes/organizations-invitations';
