import { a as auth } from './instance-CdYwVbs3.js';
import { a as drizzleDb, u as user, b as apikey } from './index3-D3XGwzxA.js';
import { eq } from 'drizzle-orm';
import './utils-gGoUUMc2.js';
import './storage-_ubboXxO.js';
import 'sharp';

class AuthError extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "AuthError";
  }
}
const authService = {
  async getSession(request, db) {
    try {
      console.log("[AuthService]: getSession called.");
      const session = await auth.api.getSession({ headers: request.headers });
      if (!session) {
        console.log("[AuthService]: No active session found from auth provider.");
        return null;
      }
      console.log(`[AuthService]: Found session for user ${session.user.id}`);
      console.log(`[AuthService]: Checking for user profile for ${session.user.id}`);
      let userProfile = await db.findUserProfileById(session.user.id);
      if (!userProfile) {
        console.log(
          `[AuthService]: User profile not found for ${session.user.id}. Creating one now (lazy sync).`
        );
        const hasExistingUsers = typeof db.hasAnyUserProfiles === "function" ? await db.hasAnyUserProfiles() : false;
        const isFirstUser = !hasExistingUsers;
        const newUserProfile = {
          userId: session.user.id,
          role: isFirstUser ? "super_admin" : "editor"
          // First user gets super_admin, others get editor
        };
        userProfile = await db.createUserProfile(newUserProfile);
        console.log(
          `[AuthService]: Successfully created user profile for ${session.user.id}${isFirstUser ? " with SUPER_ADMIN role" : ""}`
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
      console.log(`[AuthService]: Successfully assembled CMSUser for ${session.user.id}`);
      console.log(`[AuthService]: Fetching active organization for ${session.user.id}`);
      const userSession = await db.findUserSession(session.user.id);
      if (!userSession) {
        console.log(`[AuthService]: No user session found. Fetching user's organizations.`);
        const userOrgs = await db.findUserOrganizations(session.user.id);
        if (userOrgs.length === 0) {
          if (cmsUser.role === "super_admin") {
            console.log(
              `[AuthService]: Super admin ${session.user.id} has no organizations. Creating default organization.`
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
            console.log(
              `[AuthService]: Created default organization ${defaultOrg.id} for super admin.`
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
          console.log(
            `[AuthService]: User ${session.user.id} has no organizations. Checking for pending invitations.`
          );
          const invitations = await db.findInvitationsByEmail(session.user.email);
          const hasPendingInvitations = invitations.some(
            (inv) => !inv.acceptedAt && inv.expiresAt > /* @__PURE__ */ new Date()
          );
          if (hasPendingInvitations) {
            console.log(
              `[AuthService]: User ${session.user.id} has pending invitations. Processing them now.`
            );
            for (const invitation of invitations.filter(
              (inv) => !inv.acceptedAt && inv.expiresAt > /* @__PURE__ */ new Date()
            )) {
              await db.acceptInvitation(invitation.token, session.user.id);
              console.log(
                `[AuthService]: Accepted invitation ${invitation.id} for org ${invitation.organizationId}`
              );
            }
            const firstInvitation = invitations.find(
              (inv) => !inv.acceptedAt && inv.expiresAt > /* @__PURE__ */ new Date()
            );
            if (firstInvitation) {
              await db.updateUserSession(session.user.id, firstInvitation.organizationId);
              console.log(
                `[AuthService]: Set org ${firstInvitation.organizationId} as active for user ${session.user.id}`
              );
              const userOrgsAfterAccept = await db.findUserOrganizations(session.user.id);
              if (userOrgsAfterAccept.length > 0) {
                const firstOrg2 = userOrgsAfterAccept[0];
                console.log(
                  `[AuthService]: User now has ${userOrgsAfterAccept.length} organization(s)`
                );
                return {
                  type: "session",
                  user: cmsUser,
                  session: {
                    id: session.session.id,
                    expiresAt: session.session.expiresAt
                  },
                  organizationId: firstOrg2.organization.id,
                  organizationRole: firstOrg2.member.role
                };
              }
            }
          }
          console.error(
            `[AuthService]: User ${session.user.id} has no organizations and no pending invitations.`
          );
          throw new AuthError("no_organization", "User must belong to at least one organization");
        }
        const firstOrg = userOrgs[0];
        await db.updateUserSession(session.user.id, firstOrg.organization.id);
        console.log(`[AuthService]: Set first organization ${firstOrg.organization.id} as active.`);
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
      console.log(`[AuthService]: Getting membership for org ${userSession.activeOrganizationId}`);
      const membership = await db.findUserMembership(
        session.user.id,
        userSession.activeOrganizationId
      );
      if (!membership) {
        console.error(
          `[AuthService]: User ${session.user.id} is not a member of org ${userSession.activeOrganizationId}`
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
      console.error("[AuthService]: Error in getSession:", error);
      return null;
    }
  },
  async requireSession(request, db) {
    const session = await this.getSession(request, db);
    if (!session) {
      throw new Error("Unauthorized: Session required");
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
        console.error(`[AuthService]: API key ${result.key.id} missing organizationId in metadata`);
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
      console.error("[AuthService] validateApiKey error:", error);
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
      where: eq(apikey.userId, userId),
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
    console.log(`Deleting key ${keyId} for user ${userId}`);
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
      console.error("[AuthService]: Error fetching user by ID:", error);
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
      await auth.api.forgetPassword({
        body: {
          email,
          redirectTo
        }
      });
    } catch (error) {
      console.error("[AuthService]: Error requesting password reset:", error);
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
      console.error("[AuthService]: Error resetting password:", error);
      throw error;
    }
  }
};

export { AuthError as A, authService as a };
//# sourceMappingURL=service-CEhtyGUm.js.map
