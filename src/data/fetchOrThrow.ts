export async function fetchOrThrow(url: string, init?: RequestInit) {
  let r = await fetch(url, init);
  if (!r.ok) {
    throw new Error(`Failed to fetch from ${r.url}: ${r.status} ${r.statusText}`);
  }
  return r;
}
