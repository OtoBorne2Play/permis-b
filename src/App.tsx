import { useEffect, useState } from 'react'
import { glossary, questions as allQuestions, themes } from './data'
import { pickThemeQuestions, pickVocab } from './logic/stats'
import {
  answerLevelUp,
  loadProgress,
  recordAnswer,
  recordExam,
  recordPractice,
  recordVocab,
  toggleImageFlag,
  saveProgress,
  todaySession,
  type ExamSeconds,
  type Progress,
} from './progress'
import { Credits } from './screens/Credits'
import { Exam } from './screens/Exam'
import { Home } from './screens/Home'
import { Practice } from './screens/Practice'
import { Review } from './screens/Review'
import { ThemeLesson, Themes } from './screens/Themes'
import { Vocab } from './screens/Vocab'
import type { GlossaryEntry, Question, TranslationLevel } from './types'

/** Screens the home screen can open directly. */
export type Screen = 'review' | 'exam' | 'themes' | 'vocab' | 'credits'

/** What is on screen. The lists are chosen once, when the screen opens. */
type View =
  | { name: 'home' }
  | { name: 'review'; cards: Question[] }
  | { name: 'exam' }
  | { name: 'exam-errors'; questions: Question[] }
  | { name: 'themes' }
  | { name: 'theme'; themeId: string }
  | { name: 'theme-questions'; themeId: string; questions: Question[] }
  | { name: 'vocab'; words: GlossaryEntry[] }
  | { name: 'credits' }

export function App() {
  const [view, setView] = useState<View>({ name: 'home' })
  const [progress, setProgress] = useState<Progress>(loadProgress)

  useEffect(() => {
    saveProgress(progress)
  }, [progress])

  // A new screen starts at the top of the page.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [view])

  const level = progress.translationLevel
  const goHome = () => setView({ name: 'home' })
  const flagImage = (questionId: string) => setProgress((p) => toggleImageFlag(p, questionId))

  const open = (screen: Screen) => {
    if (screen === 'review') setView({ name: 'review', cards: todaySession(allQuestions, progress, new Date()) })
    else if (screen === 'vocab') setView({ name: 'vocab', words: pickVocab(glossary, progress.vocab) })
    else if (screen === 'exam') setView({ name: 'exam' })
    else if (screen === 'credits') setView({ name: 'credits' })
    else setView({ name: 'themes' })
  }

  switch (view.name) {
    case 'home':
      return (
        <Home
          progress={progress}
          onNavigate={open}
          onOpenTheme={(themeId) => setView({ name: 'theme', themeId })}
          onTranslationLevel={(translationLevel: TranslationLevel) => setProgress((p) => ({ ...p, translationLevel }))}
          onLevelUp={(accepted) => setProgress((p) => answerLevelUp(p, accepted, new Date()))}
          onImport={setProgress}
        />
      )

    case 'review':
      return (
        <Review
          questions={view.cards}
          level={level}
          onAnswer={(questionId, correct) => setProgress((p) => recordAnswer(p, questionId, correct, new Date()))}
          flaggedImages={progress.flaggedImages}
          onFlagImage={flagImage}
          onExit={goHome}
        />
      )

    case 'exam':
      return (
        <Exam
          level={level}
          seconds={progress.examSeconds}
          onSeconds={(examSeconds: ExamSeconds) => setProgress((p) => ({ ...p, examSeconds }))}
          onFinished={(record, mistakeIds) => setProgress((p) => recordExam(p, record, mistakeIds, new Date()))}
          onReview={(questions) => setView({ name: 'exam-errors', questions })}
          onExit={goHome}
        />
      )

    case 'exam-errors':
      // Free practice: the mistakes were already recorded when the exam ended.
      return (
        <Practice
          title={{ fr: 'Mes erreurs', ru: 'Мои ошибки' }}
          questions={view.questions}
          level={level}
          flaggedImages={progress.flaggedImages}
          onFlagImage={flagImage}
          onExit={goHome}
        />
      )

    case 'themes':
      return (
        <Themes
          cards={progress.cards}
          level={level}
          onOpen={(themeId) => setView({ name: 'theme', themeId })}
          onExit={goHome}
        />
      )

    case 'theme': {
      const theme = themes.find((t) => t.id === view.themeId)
      if (!theme) return <Themes cards={progress.cards} level={level} onOpen={() => {}} onExit={goHome} />
      const sessionQuestions = pickThemeQuestions(theme.id, allQuestions, progress.cards)
      return (
        <ThemeLesson
          theme={theme}
          questionCount={sessionQuestions.length}
          level={level}
          onStart={() => setView({ name: 'theme-questions', themeId: theme.id, questions: sessionQuestions })}
          onExit={() => setView({ name: 'themes' })}
        />
      )
    }

    case 'theme-questions': {
      const theme = themes.find((t) => t.id === view.themeId)!
      return (
        <Practice
          title={theme}
          questions={view.questions}
          level={level}
          onAnswer={(questionId, correct) => setProgress((p) => recordPractice(p, questionId, correct, new Date()))}
          exitLabel={{ fr: 'Retour aux thèmes', ru: 'Назад к темам' }}
          flaggedImages={progress.flaggedImages}
          onFlagImage={flagImage}
          onExit={() => setView({ name: 'themes' })}
        />
      )
    }

    case 'credits':
      return <Credits level={level} onExit={goHome} />

    case 'vocab':
      return (
        <Vocab
          words={view.words}
          level={level}
          onAnswer={(word, knew) => setProgress((p) => recordVocab(p, word, knew, new Date()))}
          onExit={goHome}
        />
      )
  }
}
