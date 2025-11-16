import { a as authService } from './service-CEhtyGUm.js';
export { a as auth } from './instance-CdYwVbs3.js';
import './index3-D3XGwzxA.js';
import 'drizzle-orm/postgres-js';
import 'postgres';
import './shared-server-DaWdgxVh.js';
import '@aphexcms/postgresql-adapter';
import '@aphexcms/postgresql-adapter/schema';
import 'drizzle-orm/pg-core';
import 'drizzle-orm';
import './utils-gGoUUMc2.js';
import './storage-_ubboXxO.js';
import 'fs/promises';
import 'path';
import 'sharp';
import './instance2-stPrjck3.js';
import 'better-auth';
import 'better-auth/plugins';
import 'better-auth/adapters/drizzle';
import 'better-auth/api';
import '@aphexcms/resend-adapter';

const authProvider = {
  getSession: (request, db) => authService.getSession(request, db),
  requireSession: (request, db) => authService.requireSession(request, db),
  validateApiKey: (request, db) => authService.validateApiKey(request, db),
  requireApiKey: (request, db, permission) => authService.requireApiKey(request, db, permission),
  getUserById: (userId) => authService.getUserById(userId),
  changeUserName: (userId, name) => authService.changeUserName(userId, name),
  requestPasswordReset: (email, redirectTo) => authService.requestPasswordReset(email, redirectTo),
  resetPassword: (token, newPassword) => authService.resetPassword(token, newPassword)
};

export { authProvider, authService };
//# sourceMappingURL=index4-DKPpYvdn.js.map
