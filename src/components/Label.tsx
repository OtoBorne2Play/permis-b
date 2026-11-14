import { GlossaryText } from './GlossaryText'

interface LabelProps {
  fr: string
  ru: string
  /** Hide the Russian line (translation level 3, or level 2 before the tap). */
  hideRu?: boolean
  /** Underline the glossary words of the French text and make them tappable. */
  glossary?: boolean
}

/** French on top, Russian underneath in violet. */
export function Label({ fr, ru, hideRu = false, glossary = false }: LabelProps) {
  // French puts a space before ? ! : ; — keep the sign on the same line as the word.
  const french = fr.replace(/ ([?!:;])/g, ' $1')
  return (
    <span className="label">
      <span className="label-fr" lang="fr">
        {glossary ? <GlossaryText text={french} /> : french}
      </span>
      {!hideRu && (
        <span className="label-ru" lang="ru">
          {ru}
        </span>
      )}
    </span>
  )
}
