import themesJson from '../data/themes.json'
import questionsJson from '../data/questions.json'
import lessonsJson from '../data/lessons.json'
import glossaryJson from '../data/glossary.json'
import hazardsJson from '../data/hazards.json'
import creditsJson from '../data/credits.json'
import type { Credit, GlossaryEntry, Hazard, Lesson, Question, Theme } from './types'

// The JSON files are bundled at build time, so the app works offline.
// Their shape is checked by scripts/validate-data.mjs (npm test).
export const themes = themesJson as Theme[]
export const questions = questionsJson as Question[]
export const lessons = lessonsJson as Lesson[]
export const glossary = glossaryJson as GlossaryEntry[]
export const hazards = hazardsJson as Hazard[]
export const credits = creditsJson as Credit[]
