import { useState } from 'react'
import { glossary } from '../data'
import { splitGlossary } from '../logic/glossary'
import { speak } from '../speech'
import type { GlossaryEntry } from '../types'

/**
 * French text where the glossary words are underlined with dots.
 * A tap on a word shows its Russian translation and says it aloud.
 */
export function GlossaryText({ text }: { text: string }) {
  const [open, setOpen] = useState<GlossaryEntry | null>(null)
  const parts = splitGlossary(text, glossary)

  return (
    <>
      {parts.map((part, i) =>
        typeof part === 'string' ? (
          part
        ) : (
          <button
            key={i}
            type="button"
            className="gloss"
            aria-expanded={open === part.entry}
            onClick={(event) => {
              // The word may sit inside a card that reacts to taps: keep the tap for the word.
              event.stopPropagation()
              setOpen(open === part.entry ? null : part.entry)
              speak(part.entry.fr)
            }}
          >
            {part.text}
          </button>
        ),
      )}
      {open && (
        <span className="gloss-pop" role="status">
          <span className="gloss-pop-word">
            <strong lang="fr">{open.fr}</strong>
            <span className="gloss-pop-ru" lang="ru">
              {open.ru}
            </span>
          </span>
          <span className="gloss-pop-example" lang="fr">
            {open.example_fr}
          </span>
        </span>
      )}
    </>
  )
}
