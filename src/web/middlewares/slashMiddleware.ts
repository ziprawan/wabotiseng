import { MiddlewareHandler } from "hono";

export const slashMiddleware: MiddlewareHandler = async (c, next) => {
  const url = new URL(c.req.url);

  const blacklisted = url.pathname === "/" || url.pathname === "/docs/";

  if (blacklisted) await next();

  if (url.pathname.endsWith("/")) {
    let removedSlash = "";
    let isSlash = true;
    for (let i = url.pathname.length - 1; i >= 0; i--) {
      const char = url.pathname[i];

      if (char !== "/" || !isSlash) {
        isSlash = false;
        removedSlash = char + removedSlash;
      }
    }

    url.pathname = removedSlash;

    return c.redirect(url);
  } else {
    if (!blacklisted) await next();
  }
};
