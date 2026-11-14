import { useEffect, useState } from 'react'
import { Label } from '../components/Label'
import { SPEECH_RATE_NORMAL, SPEECH_RATE_SLOW, speak, stopSpeaking } from '../speech'
import type { GlossaryEntry, TranslationLevel } from '../types'

interface VocabProps {
  words: GlossaryEntry[]
  level: TranslationLevel
  /** Called once per word, for its first card of the session. */
  onAnswer: (word: string, knew: boolean) => void
  onExit: () => void
}

interface Card {
  entry: GlossaryEntry
  /** true: French word shown, find the meaning. false: Russian shown, say the French word. */
  frenchFirst: boolean
  retry: boolean
}

/**
 * Vocabulary flashcards, in both directions, self-assessed.
 * She answers in her head (or aloud), turns the card, then says whether she knew.
 */
export function Vocab({ words, level, onAnswer, onExit }: VocabProps) {
  const [queue, setQueue] = useState<Card[]>(() =>
    words.map((entry) => ({ entry, frenchFirst: Math.random() < 0.5, retry: false })),
  )
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState(0)
  const hideRu = level === 3
  const card = queue[index]

  useEffect(() => stopSpeaking, [index])

  const flip = () => {
    if (flipped) return
    setFlipped(true)
    // Russian first: she just said the French word, now she hears it.
    if (!card.frenchFirst) speak(card.entry.fr)
  }

  if (!card) {
    return (
      <main className="page">
        <section className="done-card">
          <span className="done-icon" aria-hidden="true">
            {words.length === 0 ? '📭' : '🎉'}
          </span>
          <h1 className="page-title">
            <Label
              fr={words.length === 0 ? 'Pas encore de mots' : 'Séance terminée'}
              ru={words.length === 0 ? 'Слов пока нет' : 'Занятие окончено'}
              hideRu={hideRu}
            />
          </h1>
          {words.length > 0 && (
            <>
              <p className="done-score">
                {known} / {words.length}
              </p>
              <Label fr="mots connus du premier coup" ru="слов с первого раза" hideRu={hideRu} />
            </>
          )}
        </section>
        <button className="btn btn-primary" onClick={onExit}>
          <Label fr="Accueil" ru="На главную" hideRu={hideRu} />
        </button>
      </main>
    )
  }

  const { entry, frenchFirst } = card

  const assess = (knew: boolean) => {
    if (!card.retry) {
      onAnswer(entry.fr, knew)
      if (knew) setKnown((n) => n + 1)
    }
    // A word she did not know comes back at the end, in the other direction.
    if (!knew) setQueue((q) => [...q, { entry, frenchFirst: !frenchFirst, retry: true }])
    setIndex(index + 1)
    setFlipped(false)
  }

  return (
    <main className="page">
      <header className="exam-header">
        <span className={`exam-progress ${card.retry ? 'exam-progress-retry' : ''}`}>
          {card.retry ? (
            <Label fr="Rattrapage" ru="Работа над ошибками" hideRu={hideRu} />
          ) : (
            <Label fr={`Mot ${index + 1} / ${words.length}`} ru="Слово" hideRu={hideRu} />
          )}
        </span>
        <button className="btn-quiet" onClick={onExit}>
          <Label fr="Quitter" ru="Выйти" hideRu={hideRu} />
        </button>
      </header>

      <div key={`${index}-${flipped}`} className={`vocab-card ${flipped ? 'vocab-card-back' : ''}`} onClick={flip}>
        {!flipped ? (
          <>
            {frenchFirst ? (
              <span className="vocab-word" lang="fr">
                {entry.fr}
              </span>
            ) : (
              <span className="vocab-word vocab-word-ru" lang="ru">
                {entry.ru}
              </span>
            )}
            <span className="vocab-hint">
              {frenchFirst ? (
                <Label fr="Que veut dire ce mot ? Réponds dans ta tête." ru="Что значит это слово? Ответь про себя." />
              ) : (
                <Label fr="Dis ce mot en français, à voix haute." ru="Скажи это слово по-французски вслух." />
              )}
            </span>
          </>
        ) : (
          <>
            <span className="vocab-word" lang="fr">
              {entry.fr}
            </span>
            <span className="vocab-word vocab-word-ru" lang="ru">
              {entry.ru}
            </span>
            <span className="vocab-example" lang="fr">
              {entry.example_fr}
            </span>
          </>
        )}
      </div>

      {/* The French word can only be heard once it is visible. */}
      {(frenchFirst || flipped) && (
        <div className="toolbar">
          <button className="btn btn-small" onClick={() => speak(flipped ? `${entry.fr}. ${entry.example_fr}` : entry.fr, SPEECH_RATE_NORMAL)}>
            <Label fr="🔊 Écouter" ru="Слушать" hideRu={hideRu} />
          </button>
          <button className="btn btn-small" onClick={() => speak(flipped ? `${entry.fr}. ${entry.example_fr}` : entry.fr, SPEECH_RATE_SLOW)}>
            <Label fr="🐢 Lentement" ru="Медленно" hideRu={hideRu} />
          </button>
        </div>
      )}

      {!flipped ? (
        <button className="btn btn-primary" onClick={flip}>
          <Label fr="↻ Retourner la fiche" ru="Перевернуть карточку" hideRu={hideRu} />
        </button>
      ) : (
        <div className="menu-2">
          <button className="btn btn-assess btn-assess-no" onClick={() => assess(false)}>
            <Label fr="✗ Je ne savais pas" ru="Я не знала" hideRu={hideRu} />
          </button>
          <button className="btn btn-assess btn-assess-yes" onClick={() => assess(true)}>
            <Label fr="✓ Je savais" ru="Я знала" hideRu={hideRu} />
          </button>
        </div>
      )}
    </main>
  )
}
