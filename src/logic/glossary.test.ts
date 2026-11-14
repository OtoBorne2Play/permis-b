import { describe, expect, it } from 'vitest'
import type { GlossaryEntry } from '../types'
import { splitGlossary } from './glossary'

const glossary: GlossaryEntry[] = [
  { fr: 'feu', ru: 'светофор', example_fr: 'Le feu est rouge.' },
  { fr: 'passage pour piétons', ru: 'пешеходный переход', example_fr: 'Un piéton traverse.' },
  { fr: 'piéton', ru: 'пешеход', example_fr: 'Un piéton traverse.' },
  { fr: 'autoroute', ru: 'автомагистраль', example_fr: "Je roule sur l'autoroute." },
  { fr: 'GSM', ru: 'мобильный телефон', example_fr: 'Mon GSM.' },
]

/** Words found, as "text→fr" pairs. */
function found(text: string): string[] {
  return splitGlossary(text, glossary).flatMap((p) => (typeof p === 'string' ? [] : [`${p.text}→${p.entry.fr}`]))
}

describe('splitGlossary', () => {
  it('finds a glossary word and keeps the rest of the text', () => {
    const parts = splitGlossary('Le feu est rouge.', glossary)
    expect(parts).toEqual(['Le ', { text: 'feu', entry: glossary[0] }, ' est rouge.'])
  })

  it('gives back the same text when the pieces are joined', () => {
    const text = "Un piéton traverse sur le passage pour piétons, près de l'autoroute."
    const joined = splitGlossary(text, glossary)
      .map((p) => (typeof p === 'string' ? p : p.text))
      .join('')
    expect(joined).toBe(text)
  })

  it('prefers the longest expression', () => {
    expect(found('Le passage pour piétons est libre.')).toEqual(['passage pour piétons→passage pour piétons'])
  })

  it('ignores upper and lower case', () => {
    expect(found('Feu rouge. Mon gsm sonne.')).toEqual(['Feu→feu', 'gsm→GSM'])
  })

  it('accepts a plural ending', () => {
    expect(found('Les feux et les piétons.')).toEqual(['feux→feu', 'piétons→piéton'])
  })

  it('finds a word after an apostrophe', () => {
    expect(found("Je roule sur l'autoroute.")).toEqual(['autoroute→autoroute'])
  })

  it('does not match inside another word', () => {
    expect(found('Une feuille tombe. Le feutre est sec.')).toEqual([])
  })

  it('returns the text unchanged with an empty glossary', () => {
    expect(splitGlossary('Le feu est rouge.', [])).toEqual(['Le feu est rouge.'])
  })
})
