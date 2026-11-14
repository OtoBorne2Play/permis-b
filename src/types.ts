export interface Bilingual {
  fr: string
  ru: string
}

export interface Theme extends Bilingual {
  id: string
}

export interface QuestionOption extends Bilingual {
  correct: boolean
}

export interface Question extends Bilingual {
  id: string
  theme: string
  grave: boolean
  image: string | null
  image_query?: string
  options: QuestionOption[]
  explanation: Bilingual
  verified: boolean
}

export interface LessonBlock extends Bilingual {
  image?: string
}

export interface Lesson {
  theme: string
  title: Bilingual
  blocks: LessonBlock[]
}

export interface GlossaryEntry extends Bilingual {
  example_fr: string
}

export interface HazardZone extends Bilingual {
  x: number
  y: number
  w: number
  h: number
}

export interface Hazard {
  id: string
  image: string
  zones: HazardZone[]
}

export interface Credit {
  image: string
  source: string
  /** Name of the original file or photo at the source. */
  title?: string
  author: string
  license: string
  url: string
}

/** 1 = Russian visible, 2 = Russian on tap, 3 = French only. */
export type TranslationLevel = 1 | 2 | 3
