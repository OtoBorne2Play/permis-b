import { useEffect, useState } from 'react'
import { Label } from '../components/Label'
import { lessons, questions, themes } from '../data'
import type { CardState } from '../logic/leitner'
import { themeStats } from '../logic/stats'
import { SPEECH_RATE_NORMAL, SPEECH_RATE_SLOW, speak, stopSpeaking } from '../speech'
import type { Theme, TranslationLevel } from '../types'

// ---------------------------------------------------------------- list of themes

interface ThemesProps {
  cards: Record<string, CardState>
  level: TranslationLevel
  onOpen: (themeId: string) => void
  onExit: () => void
}

export function Themes({ cards, level, onOpen, onExit }: ThemesProps) {
  const hideRu = level === 3
  return (
    <main className="page">
      <header className="exam-header">
        <h1 className="page-title">
          <Label fr="Thèmes" ru="Темы" hideRu={hideRu} />
        </h1>
        <button className="btn-quiet" onClick={onExit}>
          <Label fr="Accueil" ru="На главную" hideRu={hideRu} />
        </button>
      </header>

      <ul className="theme-list">
        {themes.map((theme) => {
          const stats = themeStats(theme.id, questions, cards)
          const empty = stats.total === 0
          const percent = stats.rate === null ? null : Math.round(stats.rate * 100)
          const tone = percent === null ? 'new' : percent >= 80 ? 'good' : percent >= 50 ? 'medium' : 'weak'
          return (
            <li key={theme.id}>
              <button className={`theme-row theme-${tone}`} disabled={empty} onClick={() => onOpen(theme.id)}>
                <span className="theme-row-main">
                  <Label fr={theme.fr} ru={theme.ru} hideRu={hideRu} />
                  <span className="theme-bar" aria-hidden="true">
                    <span className="theme-bar-fill" style={{ width: `${percent ?? 0}%` }} />
                  </span>
                  <span className="theme-count" lang="fr">
                    {empty
                      ? 'Bientôt'
                      : `${stats.seen} / ${stats.total} question${stats.total > 1 ? 's' : ''} vue${stats.total > 1 ? 's' : ''}`}
                  </span>
                </span>
                <span className="theme-rate">{percent === null ? '—' : `${percent} %`}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </main>
  )
}

// ---------------------------------------------------------------- lesson of one theme

interface ThemeLessonProps {
  theme: Theme
  questionCount: number
  level: TranslationLevel
  onStart: () => void
  onExit: () => void
}

/** Short lesson in easy French, then a button to the questions of the theme. */
export function ThemeLesson({ theme, questionCount, level, onStart, onExit }: ThemeLessonProps) {
  const [translationOpen, setTranslationOpen] = useState(false)
  const hideRu = level === 3
  const showRu = level === 1 || (level === 2 && translationOpen)
  const lesson = lessons.find((l) => l.theme === theme.id)

  useEffect(() => stopSpeaking, [])

  return (
    <main className="page">
      <header className="exam-header">
        <h1 className="page-title">
          <Label fr={lesson?.title.fr ?? theme.fr} ru={lesson?.title.ru ?? theme.ru} hideRu={hideRu} />
        </h1>
        <button className="btn-quiet" onClick={onExit}>
          <Label fr="Thèmes" ru="Темы" hideRu={hideRu} />
        </button>
      </header>

      {level === 2 && lesson && (
        <div className="toolbar">
          <button className="btn btn-small" aria-pressed={translationOpen} onClick={() => setTranslationOpen((open) => !open)}>
            <Label fr="Traduction" ru="Перевод" />
          </button>
        </div>
      )}

      {lesson ? (
        <ol className="lesson">
          {lesson.blocks.map((block, i) => (
            <li key={i} className="lesson-block">
              {block.image && <img className="question-image" src={import.meta.env.BASE_URL + block.image} alt="" />}
              <div className="lesson-text">
                <Label fr={block.fr} ru={block.ru} hideRu={!showRu} glossary />
              </div>
              <div className="lesson-audio">
                <button className="btn-icon" aria-label="Écouter" onClick={() => speak(block.fr, SPEECH_RATE_NORMAL)}>
                  🔊
                </button>
                <button className="btn-icon" aria-label="Écouter lentement" onClick={() => speak(block.fr, SPEECH_RATE_SLOW)}>
                  🐢
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="notice">
          <Label fr="Pas encore de fiche pour ce thème." ru="Для этой темы пока нет урока." hideRu={hideRu} />
        </p>
      )}

      <button className="btn btn-primary" onClick={onStart} disabled={questionCount === 0}>
        <Label
          fr={`Faire les questions (${questionCount})`}
          ru={`Перейти к вопросам (${questionCount})`}
          hideRu={hideRu}
        />
      </button>
    </main>
  )
}
