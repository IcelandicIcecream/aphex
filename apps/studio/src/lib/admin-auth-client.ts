// The app's implementation of cms-core's client-side auth seam.
//
// cms-core's account settings panels (change password, two-factor, delete
// account) are provider-agnostic: they call an `AdminAuthClient` the host
// supplies, rather than importing Better Auth directly. This maps that interface
// onto our Better Auth `authClient`, and is handed to `<AphexStudio>` in the
// admin mount. Swapping auth providers means rewriting this file, nothing in core.
import type { AdminAuthClient } from '@aphexcms/cms-core/client';
import { authClient } from './auth-client';

export const adminAuthClient: AdminAuthClient = {
	changePassword: (input) => authClient.changePassword(input),
	deleteUser: (input) => authClient.deleteUser(input),
	twoFactor: {
		enable: (input) => authClient.twoFactor.enable(input),
		verifyTotp: (input) => authClient.twoFactor.verifyTotp(input),
		disable: (input) => authClient.twoFactor.disable(input),
		generateBackupCodes: (input) => authClient.twoFactor.generateBackupCodes(input)
	},
	useSession: () => authClient.useSession()
};
