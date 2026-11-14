import type { Question } from '../types'
import { Label } from './Label'

const LETTERS = ['A', 'B', 'C']

interface QuestionViewProps {
  question: Question
  /** Show the Russian translation under the French text. */
  showRu: boolean
  selected: number | null
  /** After answering: colour the right and wrong options. */
  revealed?: boolean
  disabled?: boolean
  /** Make the glossary words of the question tappable (never in the mock exam). */
  glossary?: boolean
  onSelect: (index: number) => void
}

/** Official layout: image on top, question underneath, then the A/B/C buttons. */
export function QuestionView({ question, showRu, selected, revealed = false, disabled = false, glossary = false, onSelect }: QuestionViewProps) {
  return (
    <div className="question">
      <div className="question-card">
        {question.image && (
          <img className="question-image" src={import.meta.env.BASE_URL + question.image} alt="" />
        )}
        <p className="question-text">
          <Label fr={question.fr} ru={question.ru} hideRu={!showRu} glossary={glossary} />
        </p>
      </div>
      <div className="options">
        {question.options.map((option, i) => {
          const classes = ['option']
          if (selected === i) classes.push('option-selected')
          if (revealed && option.correct) classes.push('option-correct')
          if (revealed && selected === i && !option.correct) classes.push('option-wrong')
          return (
            <button
              key={i}
              className={classes.join(' ')}
              aria-pressed={selected === i}
              disabled={disabled}
              onClick={() => onSelect(i)}
            >
              <span className="option-letter">{LETTERS[i]}</span>
              <Label fr={option.fr} ru={option.ru} hideRu={!showRu} />
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** What the voice reads: the question, then each proposition with its letter. */
export function questionSpeechText(question: Question): string {
  const options = question.options.map((o, i) => `${LETTERS[i]}. ${o.fr}`).join(' ')
  return `${question.fr} ${options}`
}
