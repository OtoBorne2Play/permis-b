import { useEffect, useState } from 'react'
import { Label } from '../components/Label'
import { QuestionView, questionSpeechText } from '../components/QuestionView'
import { shuffle } from '../logic/draw'
import { SPEECH_RATE_NORMAL, SPEECH_RATE_SLOW, speak, stopSpeaking } from '../speech'
import type { Bilingual, Question, TranslationLevel } from '../types'

interface PracticeProps {
  title: Bilingual
  questions: Question[]
  level: TranslationLevel
  /** Called once per question with her answer (theme sessions count in the progress). */
  onAnswer?: (questionId: string, correct: boolean) => void
  /** Where the final button leads. Default: home. */
  exitLabel?: Bilingual
  /** Ids of the questions whose image is reported as unsuitable. */
  flaggedImages: string[]
  onFlagImage: (questionId: string) => void
  onExit: () => void
}

const HOME: Bilingual = { fr: 'Accueil', ru: 'На главную' }

/** Untimed questions with the answer and explanation shown after each one. */
export function Practice({
  title,
  questions: source,
  level,
  onAnswer,
  exitLabel = HOME,
  flaggedImages,
  onFlagImage,
  onExit,
}: PracticeProps) {
  // New random order of A/B/C each time, so she cannot just remember "it was B".
  const [questions] = useState(() => source.map((q) => ({ ...q, options: shuffle(q.options) })))
  const [index, setIndex] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [translationOpen, setTranslationOpen] = useState(false)
  const [rightCount, setRightCount] = useState(0)
  const hideRu = level === 3
  const done = index >= questions.length

  useEffect(() => stopSpeaking, [index])

  if (done) {
    return (
      <main className="page">
        <h1 className="page-title">
          <Label fr="Terminé" ru="Готово" hideRu={hideRu} />
        </h1>
        <p className="notice">
          <Label
            fr={`${rightCount} bonne${rightCount > 1 ? 's' : ''} réponse${rightCount > 1 ? 's' : ''} sur ${questions.length}`}
            ru={`Правильных ответов: ${rightCount} из ${questions.length}`}
            hideRu={hideRu}
          />
        </p>
        <button className="btn btn-primary" onClick={onExit}>
          <Label {...exitLabel} hideRu={hideRu} />
        </button>
      </main>
    )
  }

  const question = questions[index]
  const answered = chosen !== null
  const right = answered && question.options[chosen].correct
  // Level 1: always. Level 2: after a tap. Level 3: never.
  const showRu = level === 1 || (level === 2 && translationOpen)

  const choose = (i: number) => {
    if (answered) return
    const correct = question.options[i].correct
    setChosen(i)
    onAnswer?.(question.id, correct)
    if (correct) setRightCount((n) => n + 1)
  }

  const next = () => {
    setIndex(index + 1)
    setChosen(null)
    setTranslationOpen(false)
  }

  return (
    <main className="page">
      <header className="exam-header">
        <span className="exam-progress">
          <Label fr={`${title.fr} · ${index + 1} / ${questions.length}`} ru={title.ru} hideRu={hideRu} />
        </span>
        <button className="btn-quiet" onClick={onExit}>
          <Label fr="Quitter" ru="Выйти" hideRu={hideRu} />
        </button>
      </header>

      <div className="toolbar">
        <button className="btn btn-small" onClick={() => speak(questionSpeechText(question), SPEECH_RATE_NORMAL)}>
          <Label fr="🔊 Écouter" ru="Слушать" hideRu={hideRu} />
        </button>
        <button className="btn btn-small" onClick={() => speak(questionSpeechText(question), SPEECH_RATE_SLOW)}>
          <Label fr="🐢 Lentement" ru="Медленно" hideRu={hideRu} />
        </button>
        {level === 2 && (
          <button className="btn btn-small" aria-pressed={translationOpen} onClick={() => setTranslationOpen((open) => !open)}>
            <Label fr="Traduction" ru="Перевод" />
          </button>
        )}
      </div>

      <QuestionView
        key={question.id}
        question={question}
        showRu={showRu}
        selected={chosen}
        revealed={answered}
        glossary
        imageFlagged={flaggedImages.includes(question.id)}
        onFlagImage={() => onFlagImage(question.id)}
        onSelect={choose}
      />

      {answered && (
        <section className={`feedback ${right ? 'feedback-right' : 'feedback-wrong'}`} role="status">
          <strong>
            <Label fr={right ? 'Bonne réponse !' : 'Mauvaise réponse'} ru={right ? 'Правильно!' : 'Неправильно'} hideRu={hideRu} />
          </strong>
          <Label fr={question.explanation.fr} ru={question.explanation.ru} hideRu={!showRu} glossary />
        </section>
      )}

      {answered && (
        <button className="btn btn-primary" onClick={next}>
          <Label fr="Suivant" ru="Дальше" hideRu={hideRu} />
        </button>
      )}
    </main>
  )
}
