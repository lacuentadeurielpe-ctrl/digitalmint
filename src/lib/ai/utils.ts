/**
 * Robust JSON extraction and parsing for AI outputs.
 * Handles: leading/trailing text, smart quotes, truncated JSON.
 */
export function extractJson<T>(raw: string): T {
  // Strategy 1: direct parse
  try { return JSON.parse(raw) as T } catch {}

  // Strategy 2: extract first {...} block
  const match = raw.match(/\{[\s\S]*\}/)
  if (match) {
    try { return JSON.parse(match[0]) as T } catch {}

    // Strategy 3: normalize smart quotes + try again
    const normalized = match[0]
      .replace(/[“”]/g, '"')
      .replace(/[‘’]/g, "'")
    try { return JSON.parse(normalized) as T } catch {}

    // Strategy 4: fix trailing commas before } or ]
    const trailingFixed = normalized.replace(/,\s*([\]}])/g, '$1')
    try { return JSON.parse(trailingFixed) as T } catch {}
  }

  throw new Error(`JSON parse failed. Raw starts with: ${raw.slice(0, 300)}`)
}
