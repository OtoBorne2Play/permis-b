import { useEffect, useRef, useState } from 'react'
import { Label } from '../components/Label'
import { QuestionView, questionSpeechText } from '../components/QuestionView'
import { questions as allQuestions } from '../data'
import { drawExam } from '../logic/draw'
import { EXAM_PASS_SCORE, EXAM_QUESTION_COUNT, EXAM_START_SCORE, isCorrect, scoreExam } from '../logic/scoring'
import type { ExamRecord, ExamSeconds } from '../progress'
import { canSpeakFrench, speak, stopSpeaking } from '../speech'
import type { Question, TranslationLevel } from '../types'

type Answers = (number | null)[]

interface ExamProps {
  level: TranslationLevel
  seconds: ExamSeconds
  onSeconds: (seconds: ExamSeconds) => void
  /** Called once at the end, with the ids of the questions she got wrong. */
  onFinished: (record: ExamRecord, mistakeIds: string[]) => void
  onReview: (questions: Question[]) => void
  onExit: () => void
}

export function Exam({ level, seconds, onSeconds, onFinished, onReview, onExit }: ExamProps) {
  const [drawn, setDrawn] = useState<Question[] | null>(null)
  const [answers, setAnswers] = useState<Answers | null>(null)

  const start = () => {
    setAnswers(null)
    setDrawn(drawExam(allQuestions, EXAM_QUESTION_COUNT))
  }

  if (!drawn) {
    return <ExamIntro level={level} seconds={seconds} onSeconds={onSeconds} onStart={start} onExit={onExit} />
  }

  if (!answers) {
    return (
      <ExamRun
        questions={drawn}
        seconds={seconds}
        onQuit={onExit}
        onDone={(finalAnswers) => {
          const result = scoreExam(drawn.map((q, i) => ({ correct: isCorrect(q, finalAnswers[i]), grave: q.grave })))
          onFinished(
            {
              date: new Date().toISOString(),
              total: drawn.length,
              score: result.score,
              errors: result.errors,
              graveErrors: result.graveErrors,
              passed: result.passed,
            },
            drawn.filter((q, i) => !isCorrect(q, finalAnswers[i])).map((q) => q.id),
          )
          setAnswers(finalAnswers)
        }}
      />
    )
  }

  return (
    <ExamResult level={level} questions={drawn} answers={answers} onReview={onReview} onRestart={start} onExit={onExit} />
  )
}

// ---------------------------------------------------------------- intro

interface ExamIntroProps {
  level: TranslationLevel
  seconds: ExamSeconds
  onSeconds: (seconds: ExamSeconds) => void
  onStart: () => void
  onExit: () => void
}

function ExamIntro({ level, seconds, onSeconds, onStart, onExit }: ExamIntroProps) {
  const hideRu = level === 3
  const available = allQuestions.length
  return (
    <main className="page">
      <h1 className="page-title">
        <Label fr="Examen blanc" ru="Пробный экзамен" hideRu={hideRu} />
      </h1>

      <ul className="rules card">
        <li>
          <span className="rule-icon" aria-hidden="true">
            🔊
          </span>
          <Label
            fr={`50 questions. Une voix lit la question. Ensuite, il y a ${seconds} secondes pour répondre.`}
            ru={`50 вопросов. Голос читает вопрос. Затем даётся ${seconds} секунд на ответ.`}
            hideRu={hideRu}
          />
        </li>
        <li>
          <span className="rule-icon" aria-hidden="true">
            ⛔
          </span>
          <Label
            fr="Pas de retour en arrière. Pas de réponse = erreur."
            ru="Вернуться назад нельзя. Нет ответа — ошибка."
            hideRu={hideRu}
          />
        </li>
        <li>
          <span className="rule-icon" aria-hidden="true">
            🎯
          </span>
          <Label
            fr={`Il faut ${EXAM_PASS_SCORE} points sur ${EXAM_START_SCORE}. Une faute grave coûte 5 points. Deux fautes graves = échec.`}
            ru={`Нужно набрать ${EXAM_PASS_SCORE} балл из ${EXAM_START_SCORE}. Грубая ошибка стоит 5 баллов. Две грубые ошибки — экзамен не сдан.`}
            hideRu={hideRu}
          />
        </li>
        <li>
          <span className="rule-icon" aria-hidden="true">
            🇫🇷
          </span>
          <Label fr="Pendant l'examen, tout est en français." ru="Во время экзамена всё на французском." hideRu={hideRu} />
        </li>
      </ul>

      {available < EXAM_QUESTION_COUNT && (
        <p className="notice notice-warning">
          <Label
            fr={`Pour l'instant, il y a seulement ${available} questions dans l'app. L'examen sera plus court.`}
            ru={`Пока в приложении только ${available} вопросов. Экзамен будет короче.`}
            hideRu={hideRu}
          />
        </p>
      )}

      <section className="card">
        <h2>
          <Label fr="Temps par question" ru="Время на вопрос" hideRu={hideRu} />
        </h2>
        <div className="segmented segmented-2" role="radiogroup" aria-label="Temps par question">
          <button role="radio" aria-checked={seconds === 15} className="segment" onClick={() => onSeconds(15)}>
            <Label fr="15 secondes" ru="15 секунд" hideRu={hideRu} />
          </button>
          <button role="radio" aria-checked={seconds === 20} className="segment" onClick={() => onSeconds(20)}>
            <Label fr="20 secondes (session adaptée)" ru="20 секунд (адаптированная сессия)" hideRu={hideRu} />
          </button>
        </div>
      </section>

      <button className="btn btn-primary" onClick={onStart} disabled={available === 0}>
        <Label fr="Commencer" ru="Начать" hideRu={hideRu} />
      </button>
      <button className="btn" onClick={onExit}>
        <Label fr="← Retour" ru="Назад" hideRu={hideRu} />
      </button>
    </main>
  )
}

// ---------------------------------------------------------------- running

interface ExamRunProps {
  questions: Question[]
  seconds: ExamSeconds
  onDone: (answers: Answers) => void
  onQuit: () => void
}

/** The exam itself: French only, voice first, then the countdown. No way back. */
function ExamRun({ questions, seconds, onDone, onQuit }: ExamRunProps) {
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [stage, setStage] = useState<'reading' | 'countdown'>('reading')
  const [remainingMs, setRemainingMs] = useState(seconds * 1000)
  const answersRef = useRef<Answers>([])
  const selectedRef = useRef<number | null>(null)
  const question = questions[index]

  const select = (i: number) => {
    selectedRef.current = i
    setSelected(i)
  }

  /** Records the current choice (or no answer) and moves on. */
  const submit = () => {
    if (answersRef.current.length !== index) return // already recorded
    const answers = [...answersRef.current, selectedRef.current]
    answersRef.current = answers
    selectedRef.current = null
    if (index + 1 < questions.length) {
      setIndex(index + 1)
      setSelected(null)
      setStage('reading')
      setRemainingMs(seconds * 1000)
    } else {
      onDone(answers)
    }
  }
  const submitRef = useRef(submit)
  useEffect(() => {
    submitRef.current = submit
  })

  // Read the question aloud, then start the countdown.
  useEffect(() => {
    let cancelled = false
    const startCountdown = () => {
      if (!cancelled) setStage('countdown')
    }
    const text = questionSpeechText(questions[index])
    const timers: number[] = []
    if (canSpeakFrench()) {
      // Short pause so the previous reading is fully stopped before this one starts.
      timers.push(window.setTimeout(() => speak(text, 1, startCountdown), 200))
      // Some devices never report the end of the reading: do not wait forever.
      timers.push(window.setTimeout(startCountdown, 3000 + text.length * 110))
    } else {
      timers.push(window.setTimeout(startCountdown, 0))
    }
    return () => {
      cancelled = true
      timers.forEach((t) => window.clearTimeout(t))
      stopSpeaking()
    }
  }, [index, questions])

  // Countdown: when it reaches zero, the current choice is recorded.
  useEffect(() => {
    if (stage !== 'countdown') return
    const deadline = Date.now() + seconds * 1000
    const timer = window.setInterval(() => {
      const left = deadline - Date.now()
      if (left <= 0) {
        window.clearInterval(timer)
        setRemainingMs(0)
        submitRef.current()
      } else {
        setRemainingMs(left)
      }
    }, 100)
    return () => window.clearInterval(timer)
  }, [stage, index, seconds])

  const quit = () => {
    if (window.confirm("Quitter l'examen ?\nВыйти из экзамена?")) onQuit()
  }

  const secondsLeft = Math.ceil(remainingMs / 1000)
  const reading = stage === 'reading'

  return (
    <main className="page exam">
      <header className="exam-header">
        <span className="exam-progress" lang="fr">
          Question {index + 1} / {questions.length}
        </span>
        <button className="btn-quiet" onClick={quit} lang="fr">
          Quitter
        </button>
      </header>

      <div className={`timer ${!reading && secondsLeft <= 5 ? 'timer-urgent' : ''}`} role="timer" aria-live="off">
        <div className="timer-track">
          <div className="timer-fill" style={{ width: `${(remainingMs / (seconds * 1000)) * 100}%` }} />
        </div>
        <span className="timer-label" lang="fr">
          {reading ? '🔊 Écoute…' : `${secondsLeft} s`}
        </span>
      </div>

      <QuestionView key={question.id} question={question} showRu={false} selected={selected} onSelect={select} />

      <button className="btn btn-primary" onClick={submit} disabled={selected === null} lang="fr">
        Valider
      </button>
    </main>
  )
}

// ---------------------------------------------------------------- result

interface ExamResultProps {
  level: TranslationLevel
  questions: Question[]
  answers: Answers
  onReview: (questions: Question[]) => void
  onRestart: () => void
  onExit: () => void
}

function ExamResult({ level, questions, answers, onReview, onRestart, onExit }: ExamResultProps) {
  const hideRu = level === 3
  const result = scoreExam(questions.map((q, i) => ({ correct: isCorrect(q, answers[i]), grave: q.grave })))
  const mistakes = questions
    .map((question, i) => ({ question, chosen: answers[i] }))
    .filter(({ question, chosen }) => !isCorrect(question, chosen))

  return (
    <main className="page">
      <section className={`verdict ${result.passed ? 'verdict-pass' : 'verdict-fail'}`}>
        <h1>
          <Label fr={result.passed ? 'Réussi' : 'Échoué'} ru={result.passed ? 'Сдано' : 'Не сдано'} hideRu={hideRu} />
        </h1>
        <p className="verdict-score">
          {result.score} / {EXAM_START_SCORE}
        </p>
        {result.passed && (
          <Label
            fr={`${EXAM_PASS_SCORE} points ou plus, et moins de 2 fautes graves.`}
            ru={`Набрано ${EXAM_PASS_SCORE} балл или больше, и меньше двух грубых ошибок.`}
            hideRu={hideRu}
          />
        )}
        {result.failedByGrave && (
          <Label
            fr={`${result.graveErrors} fautes graves. Deux fautes graves = échec, quel que soit le score.`}
            ru={`Грубых ошибок: ${result.graveErrors}. Две грубые ошибки — экзамен не сдан при любом счёте.`}
            hideRu={hideRu}
          />
        )}
        {result.failedByScore && (
          <Label
            fr={`Il faut au moins ${EXAM_PASS_SCORE} points.`}
            ru={`Нужно набрать не меньше ${EXAM_PASS_SCORE} балла.`}
            hideRu={hideRu}
          />
        )}
      </section>

      <p className="result-summary">
        <Label
          fr={`${questions.length} questions · ${result.errors} erreur${result.errors > 1 ? 's' : ''}, dont ${result.graveErrors} grave${result.graveErrors > 1 ? 's' : ''}`}
          ru={`Вопросов: ${questions.length} · ошибок: ${result.errors}, из них грубых: ${result.graveErrors}`}
          hideRu={hideRu}
        />
      </p>

      {mistakes.length > 0 && (
        <button className="btn btn-primary" onClick={() => onReview(mistakes.map((m) => m.question))}>
          <Label fr="Réviser ces questions" ru="Повторить эти вопросы" hideRu={hideRu} />
        </button>
      )}
      <div className="menu menu-2">
        <button className="btn" onClick={onRestart}>
          <Label fr="Nouvel examen" ru="Новый экзамен" hideRu={hideRu} />
        </button>
        <button className="btn" onClick={onExit}>
          <Label fr="Accueil" ru="На главную" hideRu={hideRu} />
        </button>
      </div>

      {mistakes.length > 0 && (
        <section className="panel">
          <h2>
            <Label fr="Mes erreurs" ru="Мои ошибки" hideRu={hideRu} />
          </h2>
          <ol className="mistakes">
            {mistakes.map(({ question, chosen }) => {
              const right = question.options.find((o) => o.correct)!
              const given = chosen === null ? null : question.options[chosen]
              return (
                <li key={question.id} className="mistake">
                  {question.grave && (
                    <span className="badge badge-grave">
                      <Label fr="Faute grave · −5" ru="Грубая ошибка · −5" hideRu={hideRu} />
                    </span>
                  )}
                  {question.image && (
                    <img className="question-image" src={import.meta.env.BASE_URL + question.image} alt="" />
                  )}
                  <p className="mistake-question">
                    <Label fr={question.fr} ru={question.ru} hideRu={hideRu} />
                  </p>
                  <div className="mistake-line mistake-wrong">
                    <span className="mistake-mark" aria-hidden="true">
                      ✗
                    </span>
                    {given ? (
                      <Label fr={given.fr} ru={given.ru} hideRu={hideRu} />
                    ) : (
                      <Label fr="Pas de réponse" ru="Нет ответа" hideRu={hideRu} />
                    )}
                  </div>
                  <div className="mistake-line mistake-right">
                    <span className="mistake-mark" aria-hidden="true">
                      ✓
                    </span>
                    <Label fr={right.fr} ru={right.ru} hideRu={hideRu} />
                  </div>
                  <p className="mistake-explanation">
                    <Label fr={question.explanation.fr} ru={question.explanation.ru} hideRu={hideRu} />
                  </p>
                </li>
              )
            })}
          </ol>
        </section>
      )}
    </main>
  )
}
