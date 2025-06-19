type ServerContext = {
  sessionId?: string;
};

declare global {
  var __amica_server_context__: ServerContext;
}

export function setServerContext(ctx: ServerContext) {
  globalThis.__amica_server_context__ = ctx;
}

export function getServerSessionId(): string | undefined {
  return globalThis.__amica_server_context__?.sessionId;
}
