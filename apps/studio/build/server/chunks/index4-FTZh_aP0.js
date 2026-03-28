import { a as authService } from './service-D_kWyptI.js';
import './instance-BV3tjq30.js';

const authProvider = {
  getSession: (request, db) => authService.getSession(request, db),
  requireSession: (request, db) => authService.requireSession(request, db),
  validateApiKey: (request) => authService.validateApiKey(request),
  requireApiKey: (request, db, permission) => authService.requireApiKey(request, db, permission),
  getUserById: (userId) => authService.getUserById(userId),
  changeUserName: (userId, name) => authService.changeUserName(userId, name),
  requestPasswordReset: (email, redirectTo) => authService.requestPasswordReset(email, redirectTo),
  resetPassword: (token, newPassword) => authService.resetPassword(token, newPassword)
};

export { authProvider as a };
//# sourceMappingURL=index4-FTZh_aP0.js.map
