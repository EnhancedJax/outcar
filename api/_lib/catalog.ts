type SupabaseRow = Record<string, unknown>

function supabaseConfig() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const anonKey =
    process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  if (!url || !anonKey) return null
  return { url: url.replace(/\/$/, ""), anonKey }
}

export async function readRows(
  table: string,
  params: Record<string, string>
): Promise<SupabaseRow[] | null> {
  const config = supabaseConfig()
  if (!config) return null

  const url = new URL(`${config.url}/rest/v1/${table}`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  try {
    const response = await fetch(url, {
      headers: {
        apikey: config.anonKey,
        Authorization: `Bearer ${config.anonKey}`,
        Accept: "application/json",
      },
    })
    if (!response.ok) return null
    const data: unknown = await response.json()
    return Array.isArray(data) ? (data as SupabaseRow[]) : null
  } catch {
    return null
  }
}

export function imageDataUrlToBytes(value: unknown) {
  if (typeof value !== "string") return null
  const match = value.match(
    /^data:(image\/(?:jpeg|png|webp|gif));base64,([a-z0-9+/]+=*)$/i
  )
  if (!match) return null

  return {
    contentType: match[1].toLowerCase(),
    bytes: Buffer.from(match[2], "base64"),
  }
}

export function htmlEscape(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

export function replaceMeta(
  html: string,
  attribute: "name" | "property",
  key: string,
  content: string
) {
  const escapedContent = htmlEscape(content)
  const matcher = new RegExp(
    `<meta\\b(?=[^>]*\\b${attribute}=["']${key}["'])[^>]*>`,
    "i"
  )
  return html.replace(matcher, (tag) =>
    /\bcontent=["'][^"']*["']/i.test(tag)
      ? tag.replace(/\bcontent=["'][^"']*["']/i, `content="${escapedContent}"`)
      : tag.replace(/\s*\/?\s*>$/, ` content="${escapedContent}" />`)
  )
}
