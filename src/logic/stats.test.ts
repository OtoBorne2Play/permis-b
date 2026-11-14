import { describe, expect, it } from 'vitest'
import type { GlossaryEntry, Question, Theme } from '../types'
import type { CardState } from './leitner'
import { pickThemeQuestions, pickVocab, shouldSuggestLevelUp, successRate, themeStats, weakestTheme } from './stats'

const TODAY = '2026-11-14'

function makeQuestion(id: string, theme: string): Question {
  return {
    id,
    theme,
    grave: false,
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

function card(right: number, wrong: number, failed = false): CardState {
  return { box: 1, due: TODAY, failed, right, wrong }
}

const themes: Theme[] = [
  { id: 'vitesse', fr: 'Vitesse', ru: 'Скорость' },
  { id: 'priorite', fr: 'Priorité', ru: 'Приоритет' },
  { id: 'autoroute', fr: 'Autoroute', ru: 'Автомагистраль' },
]

const questions = [
  makeQuestion('v1', 'vitesse'),
  makeQuestion('v2', 'vitesse'),
  makeQuestion('v3', 'vitesse'),
  makeQuestion('p1', 'priorite'),
  makeQuestion('p2', 'priorite'),
  makeQuestion('a1', 'autoroute'),
]

describe('themeStats', () => {
  it('counts the questions and answers of one theme', () => {
    const stats = themeStats('vitesse', questions, { v1: card(3, 1), v2: card(1, 0), p1: card(0, 5) })
    expect(stats).toEqual({ themeId: 'vitesse', total: 3, seen: 2, right: 4, wrong: 1, rate: 0.8 })
  })

  it('has no rate before the first answer', () => {
    expect(themeStats('autoroute', questions, {}).rate).toBeNull()
  })
})

describe('weakestTheme', () => {
  it('picks the lowest rate among themes with enough answers', () => {
    const cards = { v1: card(3, 3), p1: card(1, 5), a1: card(0, 2) }
    // autoroute has the worst rate but only 2 answers.
    expect(weakestTheme(themes, questions, cards)?.themeId).toBe('priorite')
  })

  it('says nothing when every theme is at 80 % or more', () => {
    expect(weakestTheme(themes, questions, { v1: card(8, 2), p1: card(10, 0) })).toBeNull()
  })

  it('says nothing before any answer', () => {
    expect(weakestTheme(themes, questions, {})).toBeNull()
  })
})

describe('pickThemeQuestions', () => {
  it('only takes questions of the theme, failed first, then new, then the others', () => {
    const cards = { v1: card(2, 0), v3: card(0, 1, true) }
    for (let i = 0; i < 10; i++) {
      expect(pickThemeQuestions('vitesse', questions, cards).map((q) => q.id)).toEqual(['v3', 'v2', 'v1'])
    }
  })

  it('limits the number of questions', () => {
    const many = Array.from({ length: 25 }, (_, i) => makeQuestion(`q${i}`, 'vitesse'))
    expect(pickThemeQuestions('vitesse', many, {})).toHaveLength(10)
  })
})

describe('successRate', () => {
  const days = {
    '2026-11-14': { answered: 10, correct: 9 },
    '2026-11-10': { answered: 10, correct: 7 },
    '2026-11-08': { answered: 20, correct: 20 }, // 7th day back: counted
    '2026-11-07': { answered: 50, correct: 0 }, // too old
  }

  it('covers 7 days, today included', () => {
    expect(successRate(days, TODAY)).toEqual({ answered: 40, correct: 36, rate: 0.9 })
  })

  it('has no rate without answers', () => {
    expect(successRate({}, TODAY).rate).toBeNull()
  })
})

describe('shouldSuggestLevelUp', () => {
  const good = { '2026-11-14': { answered: 20, correct: 17 } } // 85 %

  it('suggests when the rate is above 80 % with enough answers', () => {
    expect(shouldSuggestLevelUp({ translationLevel: 1, days: good, levelUpAskedDay: null }, TODAY)).toBe(true)
  })

  it('does not suggest at exactly 80 %', () => {
    const days = { '2026-11-14': { answered: 20, correct: 16 } }
    expect(shouldSuggestLevelUp({ translationLevel: 1, days, levelUpAskedDay: null }, TODAY)).toBe(false)
  })

  it('needs at least 20 answers', () => {
    const days = { '2026-11-14': { answered: 10, correct: 10 } }
    expect(shouldSuggestLevelUp({ translationLevel: 1, days, levelUpAskedDay: null }, TODAY)).toBe(false)
  })

  it('never suggests at level 3', () => {
    expect(shouldSuggestLevelUp({ translationLevel: 3, days: good, levelUpAskedDay: null }, TODAY)).toBe(false)
  })

  it('waits 7 days after the last suggestion', () => {
    expect(shouldSuggestLevelUp({ translationLevel: 2, days: good, levelUpAskedDay: '2026-11-08' }, TODAY)).toBe(false)
    expect(shouldSuggestLevelUp({ translationLevel: 2, days: good, levelUpAskedDay: '2026-11-07' }, TODAY)).toBe(true)
  })
})

describe('pickVocab', () => {
  const glossary: GlossaryEntry[] = ['known', 'missed', 'new', 'other'].map((fr) => ({ fr, ru: fr, example_fr: fr }))

  it('puts missed words first, then new ones, then known ones', () => {
    const scores = { known: { right: 4, wrong: 0 }, missed: { right: 1, wrong: 2 }, other: { right: 1, wrong: 0 } }
    for (let i = 0; i < 10; i++) {
      expect(pickVocab(glossary, scores).map((e) => e.fr)).toEqual(['missed', 'new', 'other', 'known'])
    }
  })

  it('limits the number of words', () => {
    expect(pickVocab(glossary, {}, 2)).toHaveLength(2)
  })
})
