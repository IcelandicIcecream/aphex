function authToContext(auth) {
  if (!auth) {
    throw new Error("Authentication required");
  }
  if (auth.type === "session") {
    return {
      organizationId: auth.organizationId,
      user: auth.user,
      auth
      // Preserve full auth for custom permission logic
    };
  }
  if (auth.type === "api_key") {
    return {
      organizationId: auth.organizationId,
      user: {
        id: `apikey:${auth.keyId}`,
        email: `apikey-${auth.name}@system`,
        name: auth.name,
        // Map API key permissions to user roles for permission checking
        role: auth.permissions.includes("write") ? "editor" : "viewer"
      },
      auth
      // Preserve full auth for custom permission logic
    };
  }
  throw new Error("Unknown auth type");
}

export { authToContext as a };
//# sourceMappingURL=auth-helpers-D0NRVV-P.js.map
