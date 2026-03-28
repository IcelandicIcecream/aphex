class AuthError extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "AuthError";
  }
}

export { AuthError as A };
//# sourceMappingURL=auth-errors-BOr7Rsjn.js.map
