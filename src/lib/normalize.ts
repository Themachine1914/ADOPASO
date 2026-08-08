export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
}

export function matchesSearch(haystack: string, query: string): boolean {
  const q = normalize(query)
  if (!q) return true
  return normalize(haystack).includes(q)
}
