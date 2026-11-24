const hostedProject = /^([a-z0-9]{20})\.supabase\.co$/;
const poolerHost = /^(?:[a-z0-9-]+\.)+pooler\.supabase\.com$/;

export function isLoopback(hostname: string) {
  return ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
}

export function supabaseProjectUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.href !== url.origin + "/") return null;
    if (isLoopback(url.hostname) && ["http:", "https:"].includes(url.protocol)) return url;
    if (url.protocol === "https:" && !url.port && hostedProject.test(url.hostname)) return url;
  } catch {
    return null;
  }
  return null;
}

export function plusOneProjectUrl(value: string | undefined, authUrl: URL | null) {
  const url = supabaseProjectUrl(value);
  if (!url || !authUrl || url.origin === authUrl.origin) return null;
  return url;
}

export function matchesPlusOneDatabase(connection: URL, project: URL) {
  const username = decodeURIComponent(connection.username);
  if (isLoopback(project.hostname)) {
    return isLoopback(connection.hostname) && username === "plus_one_runtime";
  }
  const ref = hostedProject.exec(project.hostname)?.[1];
  return Boolean(ref && (
    (connection.hostname === `db.${ref}.supabase.co` && username === "plus_one_runtime")
    || (poolerHost.test(connection.hostname) && username === `plus_one_runtime.${ref}`)
  ));
}
