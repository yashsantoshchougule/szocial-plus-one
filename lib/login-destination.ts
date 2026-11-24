const paths = /^\/plus-one(?:\/(?:dashboard|discover|bookings|chats|apply|application|team\/setup|members\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}|admin\/applications(?:\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})?))?$/i;

export function plusOneReturnPath(path: string) {
  return paths.test(path) && !/\s/.test(path) ? path : "/plus-one";
}

export function szocialOrigin(origin: string) {
  const site = new URL(origin);
  if (!["http:", "https:"].includes(site.protocol) || site.href !== site.origin + "/") {
    throw new Error("SZOCIAL_PUBLIC_ORIGIN must be a web origin");
  }
  return site.origin;
}

export function szocialLoginUrl(origin: string, pathname: string) {
  const login = new URL("/login", szocialOrigin(origin));
  login.searchParams.set("returnTo", plusOneReturnPath(pathname));
  return login;
}
