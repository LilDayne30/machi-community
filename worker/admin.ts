import worker, { type Env } from "./index";
// This surface never issues login sessions while administrator login is deferred.
export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return worker.fetch(
      request,
      {
        ...env,
        APP_SURFACE: "admin",
        APP_ORIGIN:
          env.APP_ENV === "development"
            ? "http://127.0.0.1:5174"
            : env.APP_ORIGIN,
      },
      ctx,
    );
  },
};
