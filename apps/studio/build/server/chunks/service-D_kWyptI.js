import { b as auth } from './instance-BV3tjq30.js';
import { d as drizzleDb, u as user, b as apikey } from './index2-CZgae6HB.js';
import { eq } from 'drizzle-orm';
import { A as AuthError } from './auth-errors-BOr7Rsjn.js';
import { c as cmsLogger } from './logger-C1WBmfZZ.js';
import './utils-FiC4zhrQ.js';
import './storage-CxrQC-cN.js';
import 'sharp';
import './date-utils-xyIWAIQq.js';
import './button-1bYQaKO-.js';
import './badge-DEuvdmY7.js';
import './sheet-content-CfdNXqIw.js';
import './client-BGGljB7r.js';
import './exports-Ci9YzwMm.js';
import './states.svelte-CxCkWsnb.js';
import './index3-BFl01i1Z.js';

const authService = {
  async getSession(request, db) {
    try {
      cmsLogger.debug("[AuthService]", "getSession called");
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        cmsLogger.debug("[AuthService]", "No active session found from auth provider");
        return null;
      }
      cmsLogger.debug("[AuthService]", `Found session for user ${session.user.id}`);
      cmsLogger.debug("[AuthService]", `Checking for user profile for ${session.user.id}`);
      let userProfile = await db.findUserProfileById(session.user.id);
      if (!userProfile) {
        cmsLogger.info(
          "[AuthService]",
          `User profile not found for ${session.user.id}. Creating one now (lazy sync).`
        );
        const hasExistingUsers = typeof db.hasAnyUserProfiles === "function" ? await db.hasAnyUserProfiles() : false;
        const isFirstUser = !hasExistingUsers;
        const newUserProfile = {
          userId: session.user.id,
          role: isFirstUser ? "super_admin" : "editor"
          // First user gets super_admin, others get editor
        };
        userProfile = await db.createUserProfile(newUserProfile);
        cmsLogger.info(
          "[AuthService]",
          `Successfully created user profile for ${session.user.id}${isFirstUser ? " with SUPER_ADMIN role" : ""}`
        );
      }
      const cmsUser = {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name ?? void 0,
        image: session.user.image ?? void 0,
        role: userProfile.role,
        preferences: userProfile.preferences
      };
      cmsLogger.debug("[AuthService]", `Successfully assembled CMSUser for ${session.user.id}`);
      cmsLogger.debug("[AuthService]", `Fetching active organization for ${session.user.id}`);
      const userSession = await db.findUserSession(session.user.id);
      if (!userSession) {
        cmsLogger.debug("[AuthService]", `No user session found. Fetching user's organizations.`);
        const userOrgs = await db.findUserOrganizations(session.user.id);
        if (userOrgs.length === 0) {
          if (cmsUser.role === "super_admin") {
            cmsLogger.info(
              "[AuthService]",
              `Super admin ${session.user.id} has no organizations. Creating default organization.`
            );
            const defaultOrg = await db.createOrganization({
              name: "Default Organization",
              slug: "default",
              createdBy: session.user.id
            });
            await db.addMember({
              organizationId: defaultOrg.id,
              userId: session.user.id,
              role: "owner"
            });
            await db.updateUserSession(session.user.id, defaultOrg.id);
            cmsLogger.info(
              "[AuthService]",
              `Created default organization ${defaultOrg.id} for super admin.`
            );
            return {
              type: "session",
              user: cmsUser,
              session: {
                id: session.session.id,
                expiresAt: session.session.expiresAt
              },
              organizationId: defaultOrg.id,
              organizationRole: "owner"
            };
          }
          cmsLogger.debug(
            "[AuthService]",
            `User ${session.user.id} has no organizations. Returning partial session.`
          );
          return {
            type: "partial_session",
            user: cmsUser,
            session: {
              id: session.session.id,
              expiresAt: session.session.expiresAt
            }
          };
        }
        const firstOrg = userOrgs[0];
        await db.updateUserSession(session.user.id, firstOrg.organization.id);
        cmsLogger.debug(
          "[AuthService]",
          `Set first organization ${firstOrg.organization.id} as active.`
        );
        return {
          type: "session",
          user: cmsUser,
          session: {
            id: session.session.id,
            expiresAt: session.session.expiresAt
          },
          organizationId: firstOrg.organization.id,
          organizationRole: firstOrg.member.role
        };
      }
      cmsLogger.debug(
        "[AuthService]",
        `Getting membership for org ${userSession.activeOrganizationId}`
      );
      const membership = await db.findUserMembership(
        session.user.id,
        userSession.activeOrganizationId
      );
      if (!membership) {
        cmsLogger.error(
          "[AuthService]",
          `User ${session.user.id} is not a member of org ${userSession.activeOrganizationId}`
        );
        throw new AuthError("kicked_from_org", "User is not a member of the active organization");
      }
      return {
        type: "session",
        user: cmsUser,
        session: {
          id: session.session.id,
          expiresAt: session.session.expiresAt
        },
        organizationId: userSession.activeOrganizationId,
        organizationRole: membership.role
      };
    } catch (error) {
      if (error instanceof AuthError) {
        throw error;
      }
      cmsLogger.error("[AuthService]", "Error in getSession:", error);
      return null;
    }
  },
  async requireSession(request, db) {
    const session = await this.getSession(request, db);
    if (!session) {
      throw new AuthError("no_session", "Unauthorized: Session required");
    }
    if (session.type === "partial_session") {
      throw new AuthError("pending_invitations", "User has pending invitations to review");
    }
    return session;
  },
  async validateApiKey(request) {
    try {
      const apiKeyHeader = request.headers.get("x-api-key");
      if (!apiKeyHeader) return null;
      const result = await auth.api.verifyApiKey({ body: { key: apiKeyHeader } });
      if (!result.valid || !result.key) return null;
      const metadata = result.key.metadata || {};
      const permissions = metadata.permissions || ["read", "write"];
      const organizationId = metadata.organizationId;
      if (!organizationId) {
        cmsLogger.error(
          "[AuthService]",
          `API key ${result.key.id} missing organizationId in metadata`
        );
        return null;
      }
      return {
        type: "api_key",
        keyId: result.key.id,
        name: result.key.name || "Unnamed Key",
        permissions,
        organizationId,
        lastUsedAt: result.key.lastRequest || void 0
      };
    } catch (error) {
      cmsLogger.error("[AuthService]", "validateApiKey error:", error);
      return null;
    }
  },
  async requireApiKey(request, db, permission) {
    const apiKeyAuth = await this.validateApiKey(request);
    if (!apiKeyAuth) {
      throw new Error("Unauthorized: Valid API key required");
    }
    if (permission && !apiKeyAuth.permissions.includes(permission)) {
      throw new Error(`Forbidden: API key missing ${permission} permission`);
    }
    return apiKeyAuth;
  },
  async listApiKeys(db, userId) {
    const userApiKeys = await drizzleDb.query.apikey.findMany({
      where: eq(apikey.referenceId, userId),
      columns: {
        id: true,
        name: true,
        metadata: true,
        expiresAt: true,
        lastRequest: true,
        createdAt: true
      },
      orderBy: (apikey2, { desc }) => [desc(apikey2.createdAt)]
    });
    return userApiKeys.map((key) => {
      const metadata = typeof key.metadata === "string" ? JSON.parse(key.metadata) : key.metadata || {};
      return {
        ...key,
        permissions: metadata.permissions || [],
        organizationId: metadata.organizationId
        // Include organizationId from metadata
      };
    });
  },
  async createApiKey(userId, organizationId, data) {
    const expiresIn = data.expiresInDays ? data.expiresInDays * 24 * 60 * 60 : void 0;
    const result = await auth.api.createApiKey({
      body: {
        userId,
        name: data.name,
        expiresIn,
        metadata: {
          permissions: data.permissions,
          organizationId
          // Store organization ID in metadata
        }
      }
    });
    if (!result || !result.id) {
      throw new Error("Failed to create API key");
    }
    return {
      id: result.id,
      name: result.name,
      key: result.key,
      permissions: data.permissions,
      organizationId,
      // Include in return value
      expiresAt: result.expiresAt,
      createdAt: result.createdAt
    };
  },
  async deleteApiKey(userId, keyId) {
    cmsLogger.debug("[AuthService]", `Deleting key ${keyId} for user ${userId}`);
    return Promise.resolve(true);
  },
  async getUserById(userId) {
    try {
      const userRecord = await drizzleDb.query.user.findFirst({
        where: eq(user.id, userId),
        columns: {
          id: true,
          name: true,
          email: true
        }
      });
      if (!userRecord) {
        return null;
      }
      return {
        id: userRecord.id,
        name: userRecord.name ?? void 0,
        email: userRecord.email
      };
    } catch (error) {
      cmsLogger.error("[AuthService]", "Error fetching user by ID:", error);
      return null;
    }
  },
  async changeUserName(userId, name) {
    await drizzleDb.update(user).set({
      name,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(user.id, userId));
  },
  async requestPasswordReset(email, redirectTo) {
    try {
      await auth.api.requestPasswordReset({
        body: {
          email,
          redirectTo
        }
      });
    } catch (error) {
      cmsLogger.error("[AuthService]", "Error requesting password reset:", error);
      throw error;
    }
  },
  async resetPassword(token, newPassword) {
    try {
      await auth.api.resetPassword({
        body: {
          newPassword,
          token
        }
      });
    } catch (error) {
      cmsLogger.error("[AuthService]", "Error resetting password:", error);
      throw error;
    }
  }
};

export { authService as a };
//# sourceMappingURL=service-D_kWyptI.js.map
