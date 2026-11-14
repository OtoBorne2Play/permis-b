import { describe, expect, it } from 'vitest'
import type { Question } from '../types'
import { drawExam, shuffle, type Rng } from './draw'

/** Small seeded random generator, so the tests are repeatable. */
function seeded(seed: number): Rng {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeQuestion(theme: string, n: number): Question {
  return {
    id: `${theme}-${n}`,
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

function makePool(themeCount: number, perTheme: number): Question[] {
  const pool: Question[] = []
  for (let t = 0; t < themeCount; t++) {
    for (let n = 0; n < perTheme; n++) pool.push(makeQuestion(`theme-${t}`, n))
  }
  return pool
}

function countByTheme(drawn: Question[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const q of drawn) counts.set(q.theme, (counts.get(q.theme) ?? 0) + 1)
  return counts
}

describe('drawExam', () => {
  const pool = makePool(17, 10)

  it('draws 50 questions', () => {
    expect(drawExam(pool, 50, seeded(1))).toHaveLength(50)
  })

  it('never draws the same question twice', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const ids = drawExam(pool, 50, seeded(seed)).map((q) => q.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('covers every theme, evenly', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const counts = countByTheme(drawExam(pool, 50, seeded(seed)))
      expect(counts.size).toBe(17)
      // 50 questions over 17 themes: 2 or 3 per theme.
      for (const n of counts.values()) {
        expect(n).toBeGreaterThanOrEqual(2)
        expect(n).toBeLessThanOrEqual(3)
      }
    }
  })

  it('still covers a theme that has a single question', () => {
    const uneven = [...makePool(16, 10), makeQuestion('rare', 0)]
    const drawn = drawExam(uneven, 50, seeded(7))
    expect(drawn).toHaveLength(50)
    expect(drawn.some((q) => q.theme === 'rare')).toBe(true)
  })

  it('returns the whole pool when it is smaller than the exam', () => {
    const small = makePool(6, 1)
    const drawn = drawExam(small, 50, seeded(3))
    expect(drawn).toHaveLength(6)
    expect(new Set(drawn.map((q) => q.id)).size).toBe(6)
  })

  it('ignores a question listed twice in the data', () => {
    const duplicated = [...makePool(2, 2), makeQuestion('theme-0', 0)]
    expect(drawExam(duplicated, 50, seeded(5))).toHaveLength(4)
  })

  it('does not modify the question list', () => {
    const before = pool.map((q) => q.id)
    drawExam(pool, 50, seeded(9))
    expect(pool.map((q) => q.id)).toEqual(before)
  })

  it('gives the same draw for the same seed and a different one otherwise', () => {
    const a = drawExam(pool, 50, seeded(11)).map((q) => q.id)
    const b = drawExam(pool, 50, seeded(11)).map((q) => q.id)
    const c = drawExam(pool, 50, seeded(12)).map((q) => q.id)
    expect(a).toEqual(b)
    expect(a).not.toEqual(c)
  })
})

describe('shuffle', () => {
  it('keeps every item exactly once', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8]
    expect(shuffle(items, seeded(2)).sort((x, y) => x - y)).toEqual(items)
  })
})
