import type { GlossaryEntry } from '../types'

/** A piece of text: plain, or a glossary word with its entry. */
export type GlossaryPart = string | { text: string; entry: GlossaryEntry }

interface Matcher {
  regex: RegExp
  byTerm: Map<string, GlossaryEntry>
}

const matchers = new WeakMap<readonly GlossaryEntry[], Matcher | null>()

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getMatcher(glossary: readonly GlossaryEntry[]): Matcher | null {
  let matcher = matchers.get(glossary)
  if (matcher === undefined) {
    const byTerm = new Map(glossary.map((entry) => [entry.fr.toLowerCase(), entry]))
    // Longest first, so "passage pour piétons" wins over a shorter word inside it.
    const terms = [...byTerm.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp)
    matcher =
      terms.length === 0
        ? null
        : {
            // Whole words only, with an optional plural ending (feu -> feux, carrefour -> carrefours).
            regex: new RegExp(`(?<![\\p{L}\\p{N}])(${terms.join('|')})([sx]?)(?![\\p{L}\\p{N}])`, 'giu'),
            byTerm,
          }
    matchers.set(glossary, matcher)
  }
  return matcher
}

/** Cuts a French text into plain pieces and glossary words. */
export function splitGlossary(text: string, glossary: readonly GlossaryEntry[]): GlossaryPart[] {
  const matcher = getMatcher(glossary)
  if (!matcher) return [text]

  const parts: GlossaryPart[] = []
  let last = 0
  for (const match of text.matchAll(matcher.regex)) {
    const entry = matcher.byTerm.get(match[1].toLowerCase())
    if (!entry) continue
    if (match.index > last) parts.push(text.slice(last, match.index))
    parts.push({ text: match[0], entry })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}
