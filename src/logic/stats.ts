import type { GlossaryEntry, Question, Theme, TranslationLevel } from '../types'
import { shuffle, type Rng } from './draw'
import { addDays, type CardState } from './leitner'

type Cards = Readonly<Record<string, CardState>>

// ---------------------------------------------------------------- themes

export interface ThemeStats {
  themeId: string
  /** Questions of this theme in the app. */
  total: number
  /** Questions answered at least once. */
  seen: number
  right: number
  wrong: number
  /** Share of right answers, 0 to 1. Null when nothing was answered yet. */
  rate: number | null
}

export function themeStats(themeId: string, questions: readonly Question[], cards: Cards): ThemeStats {
  const stats: ThemeStats = { themeId, total: 0, seen: 0, right: 0, wrong: 0, rate: null }
  for (const q of questions) {
    if (q.theme !== themeId) continue
    stats.total++
    const card = cards[q.id]
    if (!card) continue
    stats.seen++
    stats.right += card.right
    stats.wrong += card.wrong
  }
  const answers = stats.right + stats.wrong
  if (answers > 0) stats.rate = stats.right / answers
  return stats
}

export const WEAK_THEME_MIN_ANSWERS = 5
export const WEAK_THEME_RATE = 0.8

/** The theme with the lowest success rate, once it has enough answers to mean something. */
export function weakestTheme(themes: readonly Theme[], questions: readonly Question[], cards: Cards): ThemeStats | null {
  let weakest: ThemeStats | null = null
  for (const theme of themes) {
    const stats = themeStats(theme.id, questions, cards)
    if (stats.rate === null || stats.right + stats.wrong < WEAK_THEME_MIN_ANSWERS) continue
    if (stats.rate >= WEAK_THEME_RATE) continue
    if (!weakest || stats.rate < weakest.rate!) weakest = stats
  }
  return weakest
}

/** Questions of a theme session: failed ones first, then never seen, then the others. */
export function pickThemeQuestions(
  themeId: string,
  questions: readonly Question[],
  cards: Cards,
  count = 10,
  rng: Rng = Math.random,
): Question[] {
  const rank = (q: Question) => {
    const card = cards[q.id]
    if (!card) return 1
    return card.failed ? 0 : 2
  }
  return shuffle(
    questions.filter((q) => q.theme === themeId),
    rng,
  )
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, count)
}

// ---------------------------------------------------------------- translation level

export const LEVEL_UP_RATE = 0.8
export const LEVEL_UP_MIN_ANSWERS = 20
export const LEVEL_UP_SPAN_DAYS = 7

export interface SuccessRate {
  answered: number
  correct: number
  /** 0 to 1. Null when there is no answer in the period. */
  rate: number | null
}

/** Success rate over the last `span` days, today included. */
export function successRate(
  days: Readonly<Record<string, { answered: number; correct: number }>>,
  today: string,
  span = LEVEL_UP_SPAN_DAYS,
): SuccessRate {
  let answered = 0
  let correct = 0
  for (let i = 0; i < span; i++) {
    const day = days[addDays(today, -i)]
    if (!day) continue
    answered += day.answered
    correct += day.correct
  }
  return { answered, correct, rate: answered > 0 ? correct / answered : null }
}

interface LevelUpInput {
  translationLevel: TranslationLevel
  days: Readonly<Record<string, { answered: number; correct: number }>>
  /** Last day she accepted or postponed the suggestion. */
  levelUpAskedDay: string | null
}

/** Suggest less Russian when more than 80 % of the answers of the last 7 days are right. */
export function shouldSuggestLevelUp(progress: LevelUpInput, today: string): boolean {
  if (progress.translationLevel >= 3) return false
  // Asked recently: wait a full week, so the rate reflects the current level.
  if (progress.levelUpAskedDay && progress.levelUpAskedDay > addDays(today, -LEVEL_UP_SPAN_DAYS)) return false
  const { answered, rate } = successRate(progress.days, today)
  return answered >= LEVEL_UP_MIN_ANSWERS && rate !== null && rate > LEVEL_UP_RATE
}

// ---------------------------------------------------------------- vocabulary cards

export interface VocabScore {
  right: number
  wrong: number
}

/** Words of a vocabulary session: the least known first. */
export function pickVocab(
  glossary: readonly GlossaryEntry[],
  scores: Readonly<Record<string, VocabScore>>,
  count = 10,
  rng: Rng = Math.random,
): GlossaryEntry[] {
  // Missed words have a negative value, new words sit just below the known ones.
  const value = (entry: GlossaryEntry) => {
    const score = scores[entry.fr]
    return score ? score.right - 2 * score.wrong : -0.5
  }
  return shuffle(glossary, rng)
    .sort((a, b) => value(a) - value(b))
    .slice(0, count)
}
