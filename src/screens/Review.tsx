import { useEffect, useState } from 'react'
import { Label } from '../components/Label'
import { QuestionView, questionSpeechText } from '../components/QuestionView'
import { shuffle } from '../logic/draw'
import { SPEECH_RATE_NORMAL, SPEECH_RATE_SLOW, speak, stopSpeaking } from '../speech'
import type { Question, TranslationLevel } from '../types'

interface ReviewProps {
  questions: Question[]
  level: TranslationLevel
  /** Called once per card, for its first answer of the session. Retries do not count. */
  onAnswer: (questionId: string, correct: boolean) => void
  onExit: () => void
}

interface Card {
  /** The question, with its propositions in a random order. */
  question: Question
  /** A missed card shown again at the end of the session: it does not count. */
  retry: boolean
}

/** New random order of A/B/C each time, so she cannot just remember "it was B". */
function makeCard(question: Question, retry: boolean): Card {
  return { question: { ...question, options: shuffle(question.options) }, retry }
}

/**
 * Daily review with flashcards.
 * Front: the question alone, she answers in her head. Back: the propositions.
 * A missed card comes back at the end of the session, only to correct the
 * mistake: it stays "to review tomorrow" whatever she answers then.
 */
export function Review({ questions, level, onAnswer, onExit }: ReviewProps) {
  const [queue, setQueue] = useState<Card[]>(() => questions.map((q) => makeCard(q, false)))
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [chosen, setChosen] = useState<number | null>(null)
  const [translationOpen, setTranslationOpen] = useState(false)
  const [rightFirstTime, setRightFirstTime] = useState(0)
  const hideRu = level === 3

  useEffect(() => stopSpeaking, [index, flipped])

  if (questions.length === 0) {
    return (
      <main className="page">
        <section className="done-card">
          <span className="done-icon" aria-hidden="true">
            ✅
          </span>
          <h1 className="page-title">
            <Label fr="Tout est à jour" ru="Всё повторено" hideRu={hideRu} />
          </h1>
          <Label
            fr="Il n'y a plus de fiches pour aujourd'hui. Reviens demain !"
            ru="На сегодня карточек больше нет. Возвращайся завтра!"
            hideRu={hideRu}
          />
        </section>
        <button className="btn btn-primary" onClick={onExit}>
          <Label fr="Accueil" ru="На главную" hideRu={hideRu} />
        </button>
      </main>
    )
  }

  if (index >= queue.length) {
    const missed = questions.length - rightFirstTime
    return (
      <main className="page">
        <section className="done-card">
          <span className="done-icon" aria-hidden="true">
            🎉
          </span>
          <h1 className="page-title">
            <Label fr="Séance terminée" ru="Занятие окончено" hideRu={hideRu} />
          </h1>
          <p className="done-score">
            {rightFirstTime} / {questions.length}
          </p>
          <Label fr="bonnes réponses du premier coup" ru="правильно с первого раза" hideRu={hideRu} />
        </section>
        {missed > 0 && (
          <p className="notice">
            <Label
              fr={`${missed} fiche${missed > 1 ? 's' : ''} à revoir demain.`}
              ru={`Карточек на завтра: ${missed}.`}
              hideRu={hideRu}
            />
          </p>
        )}
        <button className="btn btn-primary" onClick={onExit}>
          <Label fr="Accueil" ru="На главную" hideRu={hideRu} />
        </button>
      </main>
    )
  }

  const card = queue[index]
  const { question } = card
  const answered = chosen !== null
  const right = answered && question.options[chosen].correct
  // Level 1: always. Level 2: after a tap. Level 3: never.
  const showRu = level === 1 || (level === 2 && translationOpen)

  const choose = (i: number) => {
    if (answered) return
    const correct = question.options[i].correct
    setChosen(i)
    if (!card.retry) {
      onAnswer(question.id, correct)
      if (correct) setRightFirstTime((n) => n + 1)
    }
    if (!correct) setQueue((q) => [...q, makeCard(question, true)])
  }

  const next = () => {
    setIndex(index + 1)
    setFlipped(false)
    setChosen(null)
    setTranslationOpen(false)
  }

  // Front: only the question is read. Back: the question and the propositions.
  const speechText = flipped ? questionSpeechText(question) : question.fr

  return (
    <main className="page">
      <header className="exam-header">
        <span className={`exam-progress ${card.retry ? 'exam-progress-retry' : ''}`}>
          {card.retry ? (
            <Label fr="Rattrapage" ru="Работа над ошибками" hideRu={hideRu} />
          ) : (
            <Label fr={`Fiche ${index + 1} / ${questions.length}`} ru="Карточка" hideRu={hideRu} />
          )}
        </span>
        <button className="btn-quiet" onClick={onExit}>
          <Label fr="Quitter" ru="Выйти" hideRu={hideRu} />
        </button>
      </header>

      <div className="toolbar">
        <button className="btn btn-small" onClick={() => speak(speechText, SPEECH_RATE_NORMAL)}>
          <Label fr="🔊 Écouter" ru="Слушать" hideRu={hideRu} />
        </button>
        <button className="btn btn-small" onClick={() => speak(speechText, SPEECH_RATE_SLOW)}>
          <Label fr="🐢 Lentement" ru="Медленно" hideRu={hideRu} />
        </button>
        {level === 2 && (
          <button className="btn btn-small" aria-pressed={translationOpen} onClick={() => setTranslationOpen((open) => !open)}>
            <Label fr="Traduction" ru="Перевод" />
          </button>
        )}
      </div>

      {question.grave && (
        <span className="badge badge-grave">
          <Label fr="Question grave · −5 à l'examen" ru="Грубая ошибка на экзамене: −5" hideRu={hideRu} />
        </span>
      )}

      {!flipped ? (
        <div key={`front-${index}`} className="flashcard" onClick={() => setFlipped(true)}>
          {question.image && (
            <img className="question-image" src={import.meta.env.BASE_URL + question.image} alt="" />
          )}
          <span className="flashcard-text">
            <Label fr={question.fr} ru={question.ru} hideRu={!showRu} glossary />
          </span>
          <span className="flashcard-hint">
            <Label fr="Réponds dans ta tête, puis retourne la fiche." ru="Ответь про себя, потом переверни карточку." hideRu={hideRu} />
          </span>
          <button className="flashcard-turn" onClick={() => setFlipped(true)}>
            <span className="flashcard-turn-icon" aria-hidden="true">
              ↻
            </span>
            <Label fr="Retourner la fiche" ru="Перевернуть карточку" hideRu={hideRu} />
          </button>
        </div>
      ) : (
        <div key={`back-${index}`} className="flip-in">
          <QuestionView question={question} showRu={showRu} selected={chosen} revealed={answered} glossary onSelect={choose} />
        </div>
      )}

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
