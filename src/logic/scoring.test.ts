import { describe, expect, it } from 'vitest'
import type { Question } from '../types'
import { isCorrect, scoreExam, type ScoredAnswer } from './scoring'

/** Builds a 50-answer exam with the given numbers of ordinary and grave errors. */
function exam(ordinaryErrors: number, graveErrors: number): ScoredAnswer[] {
  const answers: ScoredAnswer[] = []
  for (let i = 0; i < ordinaryErrors; i++) answers.push({ correct: false, grave: false })
  for (let i = 0; i < graveErrors; i++) answers.push({ correct: false, grave: true })
  while (answers.length < 50) answers.push({ correct: true, grave: answers.length % 3 === 0 })
  return answers
}

describe('scoreExam', () => {
  it('gives 50 and passes with no error', () => {
    expect(scoreExam(exam(0, 0))).toMatchObject({ score: 50, errors: 0, graveErrors: 0, passed: true })
  })

  it('removes 1 point per ordinary error', () => {
    expect(scoreExam(exam(3, 0)).score).toBe(47)
  })

  it('removes 5 points for an error on a grave question', () => {
    expect(scoreExam(exam(0, 1)).score).toBe(45)
  })

  it('does not penalise a grave question answered correctly', () => {
    const answers: ScoredAnswer[] = Array.from({ length: 50 }, () => ({ correct: true, grave: true }))
    expect(scoreExam(answers)).toMatchObject({ score: 50, graveErrors: 0, passed: true })
  })

  it('passes at exactly 41', () => {
    expect(scoreExam(exam(9, 0))).toMatchObject({ score: 41, passed: true })
    expect(scoreExam(exam(4, 1))).toMatchObject({ score: 41, passed: true })
  })

  it('fails at 40', () => {
    expect(scoreExam(exam(10, 0))).toMatchObject({ score: 40, passed: false, failedByScore: true, failedByGrave: false })
    expect(scoreExam(exam(5, 1))).toMatchObject({ score: 40, passed: false, failedByScore: true, failedByGrave: false })
  })

  it('fails with 2 grave errors and reports the grave rule', () => {
    expect(scoreExam(exam(0, 2))).toMatchObject({ graveErrors: 2, passed: false, failedByGrave: true })
  })

  it('applies the 2-grave-errors rule whatever the score', () => {
    // Shorter exam (small question pool): the score alone would be a pass.
    const answers: ScoredAnswer[] = [
      { correct: false, grave: true },
      { correct: false, grave: true },
      { correct: true, grave: false },
    ]
    const short = scoreExam(answers)
    expect(short.failedByGrave).toBe(true)
    expect(short.passed).toBe(false)
  })

  it('allows exactly 1 grave error', () => {
    expect(scoreExam(exam(0, 1))).toMatchObject({ passed: true, failedByGrave: false })
  })

  it('never goes below 0', () => {
    expect(scoreExam(exam(0, 20)).score).toBe(0)
  })
})

describe('isCorrect', () => {
  const question: Question = {
    id: 'q1',
    theme: 'vitesse',
    grave: false,
    image: null,
    fr: 'Question ?',
    ru: 'Вопрос?',
    options: [
      { fr: 'A', ru: 'А', correct: false },
      { fr: 'B', ru: 'Б', correct: true },
    ],
    explanation: { fr: 'Parce que.', ru: 'Потому что.' },
    verified: true,
  }

  it('accepts the right option', () => {
    expect(isCorrect(question, 1)).toBe(true)
  })

  it('rejects a wrong option', () => {
    expect(isCorrect(question, 0)).toBe(false)
  })

  it('counts no answer as an error', () => {
    expect(isCorrect(question, null)).toBe(false)
  })
})
