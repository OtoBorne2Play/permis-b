import { describe, expect, it } from 'vitest'
import {
  currentStreak,
  emptyProgress,
  exportProgress,
  importProgress,
  answerLevelUp,
  recordAnswer,
  recordExam,
  recordPractice,
  recordVocab,
  toggleImageFlag,
  todaySession,
  type ExamRecord,
} from './progress'
import type { Question } from './types'

const day = (d: number) => new Date(2026, 10, d, 10, 0) // November 2026

function makeQuestions(count: number): Question[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `q${i}`,
    theme: `theme-${i % 4}`,
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
  }))
}

describe('streak', () => {
  it('starts at 1 on the first day of practice', () => {
    const p = recordAnswer(emptyProgress(), 'q0', true, day(14))
    expect(currentStreak(p, day(14))).toBe(1)
  })

  it('does not grow twice on the same day', () => {
    let p = recordAnswer(emptyProgress(), 'q0', true, day(14))
    p = recordAnswer(p, 'q1', false, day(14))
    expect(currentStreak(p, day(14))).toBe(1)
  })

  it('grows on consecutive days', () => {
    let p = recordAnswer(emptyProgress(), 'q0', true, day(14))
    p = recordAnswer(p, 'q1', true, day(15))
    p = recordAnswer(p, 'q2', true, day(16))
    expect(currentStreak(p, day(16))).toBe(3)
  })

  it('is still shown the day after, before practising', () => {
    const p = recordAnswer(emptyProgress(), 'q0', true, day(14))
    expect(currentStreak(p, day(15))).toBe(1)
  })

  it('is lost after a day without practice', () => {
    let p = recordAnswer(emptyProgress(), 'q0', true, day(14))
    expect(currentStreak(p, day(16))).toBe(0)
    p = recordAnswer(p, 'q1', true, day(16))
    expect(currentStreak(p, day(16))).toBe(1)
  })
})

describe('recordAnswer', () => {
  it('updates the card and the stats of the day', () => {
    let p = recordAnswer(emptyProgress(), 'q0', true, day(14))
    p = recordAnswer(p, 'q1', false, day(14))
    expect(p.cards.q0).toMatchObject({ box: 1, due: '2026-11-15', failed: false })
    expect(p.cards.q1).toMatchObject({ box: 1, due: '2026-11-15', failed: true })
    expect(p.days['2026-11-14']).toEqual({ answered: 2, correct: 1 })
  })

  it('does not modify the previous progress', () => {
    const before = emptyProgress()
    recordAnswer(before, 'q0', true, day(14))
    expect(before).toEqual(emptyProgress())
  })
})

describe('todaySession', () => {
  const questions = makeQuestions(60)

  it('offers 20 new questions on the first day', () => {
    expect(todaySession(questions, emptyProgress(), day(14))).toHaveLength(20)
  })

  it('does not introduce more than 20 new questions in a day', () => {
    let p = emptyProgress()
    for (const q of todaySession(questions, p, day(14))) p = recordAnswer(p, q.id, true, day(14))
    expect(todaySession(questions, p, day(14))).toHaveLength(0)
  })

  it('brings back yesterday’s cards first, then completes with new ones', () => {
    let p = emptyProgress()
    const first = todaySession(questions, p, day(14)).slice(0, 8)
    for (const q of first) p = recordAnswer(p, q.id, true, day(14))
    const next = todaySession(questions, p, day(15))
    expect(next).toHaveLength(20)
    expect(next.slice(0, 8).map((q) => q.id).sort()).toEqual(first.map((q) => q.id).sort())
  })
})

describe('recordExam', () => {
  const record: ExamRecord = { date: '2026-11-14T10:00:00.000Z', total: 50, score: 44, errors: 2, graveErrors: 1, passed: true }

  it('stores the exam and sends its mistakes back to box 1', () => {
    let p = emptyProgress()
    p = recordAnswer(p, 'q0', true, day(10))
    p = recordAnswer(p, 'q0', true, day(11)) // q0 is now in box 2
    p = recordExam(p, record, ['q0', 'q5'], day(14))
    expect(p.exams).toEqual([record])
    expect(p.cards.q0).toMatchObject({ box: 1, due: '2026-11-15', failed: true })
    expect(p.cards.q5).toMatchObject({ box: 1, due: '2026-11-15', failed: true })
  })

  it('counts as a day of practice', () => {
    const p = recordExam(emptyProgress(), record, [], day(14))
    expect(currentStreak(p, day(14))).toBe(1)
  })
})

describe('recordPractice', () => {
  it('sends a mistake back to box 1', () => {
    let p = recordAnswer(emptyProgress(), 'q0', true, day(10))
    p = recordAnswer(p, 'q0', true, day(11)) // box 2
    p = recordPractice(p, 'q0', false, day(14))
    expect(p.cards.q0).toMatchObject({ box: 1, due: '2026-11-15', failed: true, right: 2, wrong: 1 })
  })

  it('counts a right answer without moving the card', () => {
    let p = recordAnswer(emptyProgress(), 'q0', true, day(10))
    const before = p.cards.q0
    p = recordPractice(p, 'q0', true, day(14))
    expect(p.cards.q0).toEqual({ ...before, right: before.right + 1 })
  })

  it('puts a never-seen question in box 1', () => {
    const p = recordPractice(emptyProgress(), 'q7', true, day(14))
    expect(p.cards.q7).toMatchObject({ box: 1, due: '2026-11-15', right: 1 })
  })

  it('feeds the stats of the day and the streak, but not the quota of new questions', () => {
    const p = recordPractice(emptyProgress(), 'q7', false, day(14))
    expect(p.days['2026-11-14']).toEqual({ answered: 1, correct: 0 })
    expect(currentStreak(p, day(14))).toBe(1)
    expect(p.newIntroduced.count).toBe(0)
  })
})

describe('recordVocab', () => {
  it('counts known and unknown words', () => {
    let p = recordVocab(emptyProgress(), 'feu', true, day(14))
    p = recordVocab(p, 'feu', false, day(14))
    expect(p.vocab.feu).toEqual({ right: 1, wrong: 1 })
  })
})

describe('answerLevelUp', () => {
  it('raises the level when accepted and remembers the day', () => {
    const p = answerLevelUp(emptyProgress(), true, day(14))
    expect(p.translationLevel).toBe(2)
    expect(p.levelUpAskedDay).toBe('2026-11-14')
  })

  it('keeps the level when postponed', () => {
    const p = answerLevelUp(emptyProgress(), false, day(14))
    expect(p.translationLevel).toBe(1)
    expect(p.levelUpAskedDay).toBe('2026-11-14')
  })

  it('never goes above level 3', () => {
    const p = answerLevelUp({ ...emptyProgress(), translationLevel: 3 }, true, day(14))
    expect(p.translationLevel).toBe(3)
  })
})

describe('toggleImageFlag', () => {
  it('reports an image, then withdraws the report', () => {
    let p = toggleImageFlag(emptyProgress(), 'q3')
    expect(p.flaggedImages).toEqual(['q3'])
    p = toggleImageFlag(p, 'q3')
    expect(p.flaggedImages).toEqual([])
  })

  it('travels in the exported file, where the image script reads it', () => {
    const p = toggleImageFlag(emptyProgress(), 'q3')
    expect(JSON.parse(exportProgress(p, day(14))).progress.flaggedImages).toEqual(['q3'])
  })
})

describe('export / import', () => {
  it('gives back the same progress', () => {
    let p = recordAnswer(emptyProgress(), 'q0', false, day(14))
    p = { ...p, translationLevel: 2, examSeconds: 20 }
    expect(importProgress(exportProgress(p, day(14)))).toEqual(p)
  })

  it('refuses anything that is not an export of this app', () => {
    expect(importProgress('pas du JSON')).toBeNull()
    expect(importProgress('{}')).toBeNull()
    expect(importProgress(JSON.stringify({ app: 'autre', progress: emptyProgress() }))).toBeNull()
    expect(importProgress(JSON.stringify({ app: 'permis-b', progress: { version: 2 } }))).toBeNull()
  })
})
