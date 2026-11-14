import type { Question } from '../types'

export const EXAM_QUESTION_COUNT = 50
export const EXAM_START_SCORE = 50
export const EXAM_PASS_SCORE = 41
export const ORDINARY_PENALTY = 1
export const GRAVE_PENALTY = 5
/** This many errors on "grave" questions fail the exam, whatever the score. */
export const GRAVE_ERRORS_TO_FAIL = 2

export interface ScoredAnswer {
  correct: boolean
  grave: boolean
}

export interface ExamScore {
  score: number
  errors: number
  graveErrors: number
  passed: boolean
  failedByScore: boolean
  failedByGrave: boolean
}

/** No answer (null) counts as an error. */
export function isCorrect(question: Question, chosen: number | null): boolean {
  return chosen !== null && question.options[chosen]?.correct === true
}

export function scoreExam(answers: ScoredAnswer[]): ExamScore {
  let score = EXAM_START_SCORE
  let errors = 0
  let graveErrors = 0
  for (const answer of answers) {
    if (answer.correct) continue
    errors++
    if (answer.grave) {
      graveErrors++
      score -= GRAVE_PENALTY
    } else {
      score -= ORDINARY_PENALTY
    }
  }
  score = Math.max(0, score)
  const failedByScore = score < EXAM_PASS_SCORE
  const failedByGrave = graveErrors >= GRAVE_ERRORS_TO_FAIL
  return { score, errors, graveErrors, passed: !failedByScore && !failedByGrave, failedByScore, failedByGrave }
}
