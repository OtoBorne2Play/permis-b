import { buildSession, dayKey, addDays, reviewCard, SESSION_SIZE, type CardState } from './logic/leitner'
import type { Rng } from './logic/draw'
import type { VocabScore } from './logic/stats'
import type { Question, TranslationLevel } from './types'

const STORAGE_KEY = 'permis-b-progress'
const EXPORT_MARKER = 'permis-b'

/** Maximum number of never-seen questions introduced per day by the daily review. */
export const DAILY_NEW_LIMIT = SESSION_SIZE

export type ExamSeconds = 15 | 20

export interface ExamRecord {
  /** ISO date and time of the end of the exam. */
  date: string
  /** Number of questions in this exam (50 once the question pool is complete). */
  total: number
  score: number
  errors: number
  graveErrors: number
  passed: boolean
}

export interface DayStats {
  answered: number
  correct: number
}

export interface Progress {
  version: 1
  translationLevel: TranslationLevel
  /** Time to answer in the mock exam: 15 s, or 20 s for the adapted session. */
  examSeconds: ExamSeconds
  /** History of mock exams, oldest first. */
  exams: ExamRecord[]
  streak: { count: number; lastDay: string | null }
  /** Leitner state per question id. A question with no entry is "new". */
  cards: Record<string, CardState>
  /** Counted answers per day (YYYY-MM-DD), for the 7-day success rate. */
  days: Record<string, DayStats>
  /** How many new questions the daily review introduced on its last active day. */
  newIntroduced: { day: string | null; count: number }
  /** Last day she accepted or postponed the "less Russian" suggestion. */
  levelUpAskedDay: string | null
  /** Self-assessed vocabulary cards, per French word. */
  vocab: Record<string, VocabScore>
  /** Ids of the questions whose image she reported as unsuitable. Read by scripts/fetch-images.mjs. */
  flaggedImages: string[]
}

export function emptyProgress(): Progress {
  return {
    version: 1,
    translationLevel: 1,
    examSeconds: 15,
    exams: [],
    streak: { count: 0, lastDay: null },
    cards: {},
    days: {},
    newIntroduced: { day: null, count: 0 },
    levelUpAskedDay: null,
    vocab: {},
    flaggedImages: [],
  }
}

/** Fills in anything missing, so data saved by an older version of the app still loads. */
function normalize(parsed: Partial<Progress>): Progress {
  return { ...emptyProgress(), ...parsed, version: 1 }
}

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyProgress()
    const parsed = JSON.parse(raw) as Partial<Progress>
    if (parsed.version !== 1) return emptyProgress()
    return normalize(parsed)
  } catch {
    return emptyProgress()
  }
}

export function saveProgress(progress: Progress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // Storage unavailable (private mode, quota): the app still works for this visit.
  }
}

// ---------------------------------------------------------------- streak

/** Streak to display: it only counts if she practised today or yesterday. */
export function currentStreak(progress: Progress, today: Date): number {
  const { count, lastDay } = progress.streak
  if (!lastDay) return 0
  const todayKey = dayKey(today)
  return lastDay === todayKey || lastDay === addDays(todayKey, -1) ? count : 0
}

function touchStreak(streak: Progress['streak'], todayKey: string): Progress['streak'] {
  if (streak.lastDay === todayKey) return streak
  const continues = streak.lastDay === addDays(todayKey, -1)
  return { count: continues ? streak.count + 1 : 1, lastDay: todayKey }
}

// ---------------------------------------------------------------- daily review

function newAllowedToday(progress: Progress, todayKey: string): number {
  const used = progress.newIntroduced.day === todayKey ? progress.newIntroduced.count : 0
  return Math.max(0, DAILY_NEW_LIMIT - used)
}

/** The cards of the next review session for today. */
export function todaySession(questions: readonly Question[], progress: Progress, today: Date, rng?: Rng): Question[] {
  const todayKey = dayKey(today)
  return buildSession(questions, progress.cards, todayKey, {
    newAllowed: newAllowedToday(progress, todayKey),
    rng,
  })
}

/** Records a counted answer of the daily review (not the in-session retries). */
export function recordAnswer(progress: Progress, questionId: string, correct: boolean, today: Date): Progress {
  const todayKey = dayKey(today)
  const previous = progress.cards[questionId]
  const day = progress.days[todayKey] ?? { answered: 0, correct: 0 }
  const usedNew = progress.newIntroduced.day === todayKey ? progress.newIntroduced.count : 0
  return {
    ...progress,
    cards: { ...progress.cards, [questionId]: reviewCard(previous, correct, todayKey) },
    days: {
      ...progress.days,
      [todayKey]: { answered: day.answered + 1, correct: day.correct + (correct ? 1 : 0) },
    },
    newIntroduced: { day: todayKey, count: usedNew + (previous ? 0 : 1) },
    streak: touchStreak(progress.streak, todayKey),
  }
}

/**
 * Records an answer given in a theme session (outside the daily review).
 * A mistake sends the card back to box 1. A right answer is counted for the
 * statistics but does not move the card: only the daily review promotes it.
 */
export function recordPractice(progress: Progress, questionId: string, correct: boolean, today: Date): Progress {
  const todayKey = dayKey(today)
  const previous = progress.cards[questionId]
  const day = progress.days[todayKey] ?? { answered: 0, correct: 0 }
  const card =
    previous && correct ? { ...previous, right: previous.right + 1 } : reviewCard(previous, correct, todayKey)
  return {
    ...progress,
    cards: { ...progress.cards, [questionId]: card },
    days: {
      ...progress.days,
      [todayKey]: { answered: day.answered + 1, correct: day.correct + (correct ? 1 : 0) },
    },
    streak: touchStreak(progress.streak, todayKey),
  }
}

/** Records a self-assessed vocabulary card. */
export function recordVocab(progress: Progress, word: string, knew: boolean, today: Date): Progress {
  const score = progress.vocab[word] ?? { right: 0, wrong: 0 }
  return {
    ...progress,
    vocab: {
      ...progress.vocab,
      [word]: { right: score.right + (knew ? 1 : 0), wrong: score.wrong + (knew ? 0 : 1) },
    },
    streak: touchStreak(progress.streak, dayKey(today)),
  }
}

/** Reports the image of a question as unsuitable, or withdraws the report. */
export function toggleImageFlag(progress: Progress, questionId: string): Progress {
  const flagged = progress.flaggedImages.includes(questionId)
  return {
    ...progress,
    flaggedImages: flagged
      ? progress.flaggedImages.filter((id) => id !== questionId)
      : [...progress.flaggedImages, questionId],
  }
}

/** She accepted (level goes up) or postponed the "less Russian" suggestion. */
export function answerLevelUp(progress: Progress, accepted: boolean, today: Date): Progress {
  const translationLevel = accepted
    ? (Math.min(3, progress.translationLevel + 1) as TranslationLevel)
    : progress.translationLevel
  return { ...progress, translationLevel, levelUpAskedDay: dayKey(today) }
}

/**
 * Records a finished mock exam. Its mistakes go back to box 1, so they come
 * up in the daily review from tomorrow. Right answers do not move any card.
 */
export function recordExam(progress: Progress, record: ExamRecord, mistakeIds: string[], today: Date): Progress {
  const todayKey = dayKey(today)
  const cards = { ...progress.cards }
  for (const id of mistakeIds) cards[id] = reviewCard(cards[id], false, todayKey)
  return {
    ...progress,
    cards,
    exams: [...progress.exams, record],
    streak: touchStreak(progress.streak, todayKey),
  }
}

// ---------------------------------------------------------------- export / import

export function exportProgress(progress: Progress, now: Date): string {
  return JSON.stringify({ app: EXPORT_MARKER, exportedAt: now.toISOString(), progress }, null, 2)
}

/** Reads a file made by exportProgress. Returns null if it is not one. */
export function importProgress(text: string): Progress | null {
  try {
    const data = JSON.parse(text) as { app?: unknown; progress?: Partial<Progress> }
    const p = data.progress
    if (data.app !== EXPORT_MARKER || !p || p.version !== 1) return null
    if (typeof p.cards !== 'object' || p.cards === null || !Array.isArray(p.exams)) return null
    if (![1, 2, 3].includes(p.translationLevel as number)) return null
    return normalize(p)
  } catch {
    return null
  }
}
