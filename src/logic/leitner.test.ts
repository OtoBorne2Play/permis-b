import { describe, expect, it } from 'vitest'
import type { Question } from '../types'
import { addDays, buildSession, dayKey, reviewCard, type CardState } from './leitner'

const TODAY = '2026-11-14'

function makeQuestion(id: string, theme = 'vitesse', grave = false): Question {
  return {
    id,
    theme,
    grave,
    image: null,
    fr: 'Question ?',
    ru: 'Вопрос?',
    options: [
      { fr: 'Oui.', ru: 'Да.', correct: true },
      { fr: 'Non.', ru: 'Нет.', correct: false },
    ],
    explanation: { fr: 'Explication.', ru: 'Объяснение.' },
    verified: true,
  }
}

function card(box: number, due: string, failed = false): CardState {
  return { box, due, failed, right: 0, wrong: 0 }
}

describe('dates', () => {
  it('formats a local day', () => {
    expect(dayKey(new Date(2026, 0, 5))).toBe('2026-01-05')
  })

  it('adds days across months and years', () => {
    expect(addDays('2026-11-14', 1)).toBe('2026-11-15')
    expect(addDays('2026-11-14', 30)).toBe('2026-12-14')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
})

describe('reviewCard', () => {
  it('puts a new card in box 1, due tomorrow, whether right or wrong', () => {
    expect(reviewCard(undefined, true, TODAY)).toMatchObject({ box: 1, due: '2026-11-15', failed: false })
    expect(reviewCard(undefined, false, TODAY)).toMatchObject({ box: 1, due: '2026-11-15', failed: true })
  })

  it('moves a right answer to the next box with intervals 1, 3, 7, 15, 30 days', () => {
    expect(reviewCard(card(1, TODAY), true, TODAY)).toMatchObject({ box: 2, due: addDays(TODAY, 3) })
    expect(reviewCard(card(2, TODAY), true, TODAY)).toMatchObject({ box: 3, due: addDays(TODAY, 7) })
    expect(reviewCard(card(3, TODAY), true, TODAY)).toMatchObject({ box: 4, due: addDays(TODAY, 15) })
    expect(reviewCard(card(4, TODAY), true, TODAY)).toMatchObject({ box: 5, due: addDays(TODAY, 30) })
  })

  it('keeps a right answer in box 5', () => {
    expect(reviewCard(card(5, TODAY), true, TODAY)).toMatchObject({ box: 5, due: addDays(TODAY, 30) })
  })

  it('sends a wrong answer back to box 1 from any box', () => {
    for (let box = 1; box <= 5; box++) {
      expect(reviewCard(card(box, TODAY), false, TODAY)).toMatchObject({ box: 1, due: addDays(TODAY, 1), failed: true })
    }
  })

  it('clears the failed mark after a right answer', () => {
    expect(reviewCard(card(1, TODAY, true), true, TODAY).failed).toBe(false)
  })

  it('counts right and wrong answers', () => {
    const once = reviewCard(undefined, false, TODAY)
    const twice = reviewCard(once, true, TODAY)
    expect(twice).toMatchObject({ right: 1, wrong: 1 })
  })
})

describe('buildSession', () => {
  it('takes due cards and leaves the ones due later', () => {
    const questions = [makeQuestion('a'), makeQuestion('b'), makeQuestion('c')]
    const cards = { a: card(2, TODAY), b: card(2, addDays(TODAY, 1)), c: card(3, addDays(TODAY, -4)) }
    const ids = buildSession(questions, cards, TODAY).map((q) => q.id).sort()
    expect(ids).toEqual(['a', 'c'])
  })

  it('fills up with new questions, up to 20', () => {
    const questions = Array.from({ length: 40 }, (_, i) => makeQuestion(`q${i}`, `theme-${i % 5}`))
    const cards = { q0: card(1, TODAY), q1: card(1, TODAY) }
    const session = buildSession(questions, cards, TODAY)
    expect(session).toHaveLength(20)
    expect(new Set(session.map((q) => q.id)).size).toBe(20)
    expect(session.slice(0, 2).map((q) => q.id).sort()).toEqual(['q0', 'q1'])
  })

  it('puts failed grave questions first, then other failed, then other due, then new', () => {
    const questions = [
      makeQuestion('new'),
      makeQuestion('due'),
      makeQuestion('failed'),
      makeQuestion('failed-grave', 'feux-agents', true),
      makeQuestion('grave-not-failed', 'feux-agents', true),
    ]
    const cards = {
      due: card(3, TODAY),
      failed: card(1, TODAY, true),
      'failed-grave': card(1, TODAY, true),
      'grave-not-failed': card(2, TODAY),
    }
    for (let i = 0; i < 10; i++) {
      const ids = buildSession(questions, cards, TODAY).map((q) => q.id)
      expect(ids[0]).toBe('failed-grave')
      expect(ids[1]).toBe('failed')
      expect(ids.slice(2, 4).sort()).toEqual(['due', 'grave-not-failed'])
      expect(ids[4]).toBe('new')
    }
  })

  it('never exceeds the session size, even with many due cards', () => {
    const questions = Array.from({ length: 35 }, (_, i) => makeQuestion(`q${i}`))
    const cards = Object.fromEntries(questions.map((q) => [q.id, card(1, TODAY)]))
    expect(buildSession(questions, cards, TODAY)).toHaveLength(20)
  })

  it('respects the number of new questions still allowed today', () => {
    const questions = Array.from({ length: 30 }, (_, i) => makeQuestion(`q${i}`))
    expect(buildSession(questions, {}, TODAY, { newAllowed: 5 })).toHaveLength(5)
    expect(buildSession(questions, {}, TODAY, { newAllowed: 0 })).toHaveLength(0)
  })

  it('spreads new questions over the themes', () => {
    const questions = Array.from({ length: 100 }, (_, i) => makeQuestion(`q${i}`, `theme-${i % 10}`))
    const themes = new Set(buildSession(questions, {}, TODAY).map((q) => q.theme))
    expect(themes.size).toBe(10)
  })

  it('is empty when nothing is due and nothing is new', () => {
    const questions = [makeQuestion('a')]
    expect(buildSession(questions, { a: card(2, addDays(TODAY, 2)) }, TODAY)).toEqual([])
  })
})
