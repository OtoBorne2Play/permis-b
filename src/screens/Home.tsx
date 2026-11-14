import { useRef, useState } from 'react'
import type { Screen } from '../App'
import { Label } from '../components/Label'
import { glossary, questions, themes } from '../data'
import { dayKey } from '../logic/leitner'
import { shouldSuggestLevelUp, successRate, weakestTheme } from '../logic/stats'
import { currentStreak, exportProgress, importProgress, todaySession, type Progress } from '../progress'
import { speak, useVoiceStatus } from '../speech'
import type { TranslationLevel } from '../types'

interface HomeProps {
  progress: Progress
  onNavigate: (screen: Screen) => void
  onOpenTheme: (themeId: string) => void
  onTranslationLevel: (level: TranslationLevel) => void
  /** Answer to the "less Russian" suggestion: accepted or postponed. */
  onLevelUp: (accepted: boolean) => void
  onImport: (progress: Progress) => void
}

const LEVELS: { level: TranslationLevel; fr: string; ru: string }[] = [
  { level: 1, fr: 'Russe visible', ru: 'Русский виден' },
  { level: 2, fr: 'Russe au tap', ru: 'Русский по нажатию' },
  { level: 3, fr: 'Français seul', ru: 'Только французский' },
]

export function Home({ progress, onNavigate, onOpenTheme, onTranslationLevel, onLevelUp, onImport }: HomeProps) {
  const today = new Date()
  const todayKey = dayKey(today)
  const streak = currentStreak(progress, today)
  const due = todaySession(questions, progress, today).length
  const voice = useVoiceStatus()
  const hideRu = progress.translationLevel === 3
  const fileInput = useRef<HTMLInputElement>(null)
  const [importStatus, setImportStatus] = useState<'ok' | 'error' | null>(null)

  const suggestLevelUp = shouldSuggestLevelUp(progress, todayKey)
  const nextLevel = LEVELS.find((l) => l.level === progress.translationLevel + 1)
  const weekPercent = Math.round((successRate(progress.days, todayKey).rate ?? 0) * 100)

  const weak = weakestTheme(themes, questions, progress.cards)
  const weakTheme = weak && themes.find((t) => t.id === weak.themeId)

  const exportFile = () => {
    const blob = new Blob([exportProgress(progress, today)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `permis-b-progression-${todayKey}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const importFile = async (file: File | undefined) => {
    if (!file) return
    const imported = importProgress(await file.text())
    if (!imported) {
      setImportStatus('error')
      return
    }
    const question =
      'Remplacer la progression de cet appareil par celle du fichier ?\nЗаменить прогресс на этом устройстве данными из файла?'
    if (window.confirm(question)) {
      onImport(imported)
      setImportStatus('ok')
    }
  }

  return (
    <main className="page home">
      <header className="home-header">
        <span className="home-logo" aria-hidden="true">
          B
        </span>
        <div>
          <h1>Permis B</h1>
          <p className="subtitle">
            <Label fr="Théorie · Wallonie" ru="Теория · Валлония" hideRu={hideRu} />
          </p>
        </div>
      </header>

      <section className="stats" aria-label="Progression">
        <div className="stat stat-streak">
          <span className="stat-value">
            <span className="stat-icon" aria-hidden="true">
              🔥
            </span>
            {streak}
          </span>
          <Label fr={streak > 1 ? 'jours de suite' : 'jour de suite'} ru="дней подряд" hideRu={hideRu} />
        </div>
        <div className="stat stat-due">
          <span className="stat-value">
            <span className="stat-icon" aria-hidden="true">
              📋
            </span>
            {due}
          </span>
          <Label fr={due > 1 ? 'fiches aujourd’hui' : 'fiche aujourd’hui'} ru="карточек на сегодня" hideRu={hideRu} />
        </div>
      </section>

      {suggestLevelUp && nextLevel && (
        <section className="banner banner-level" role="status">
          <Label
            fr={`Bravo ! ${weekPercent} % de bonnes réponses sur 7 jours. Passer au niveau « ${nextLevel.fr} » ?`}
            ru={`Отлично! ${weekPercent} % правильных ответов за 7 дней. Перейти на уровень «${nextLevel.ru}»?`}
          />
          <div className="menu-2">
            <button className="btn" onClick={() => onLevelUp(true)}>
              <Label fr="Oui" ru="Да" />
            </button>
            <button className="btn" onClick={() => onLevelUp(false)}>
              <Label fr="Plus tard" ru="Позже" />
            </button>
          </div>
        </section>
      )}

      <button className="cta" onClick={() => onNavigate('review')}>
        <span className="cta-icon" aria-hidden="true">
          ▶
        </span>
        <Label fr="Révision du jour" ru="Повторение дня" hideRu={hideRu} />
        <span className="chevron" aria-hidden="true">
          ›
        </span>
      </button>

      {weak && weakTheme && (
        <button className="banner banner-weak" onClick={() => onOpenTheme(weakTheme.id)}>
          <span className="banner-icon" aria-hidden="true">
            🎯
          </span>
          <span className="banner-text">
            <Label fr="À travailler" ru="Над чем поработать" hideRu={hideRu} />
            <strong>
              <Label fr={weakTheme.fr} ru={weakTheme.ru} hideRu={hideRu} />
            </strong>
            <span lang="fr">{Math.round(weak.rate! * 100)} % de réussite</span>
          </span>
          <span className="chevron" aria-hidden="true">
            ›
          </span>
        </button>
      )}

      <h2 className="section-title">
        <Label fr="S'entraîner" ru="Тренировка" hideRu={hideRu} />
      </h2>
      <div className="tiles">
        <button className="tile tile-exam" onClick={() => onNavigate('exam')}>
          <span className="tile-icon" aria-hidden="true">
            📝
          </span>
          <Label fr="Examen blanc" ru="Пробный экзамен" hideRu={hideRu} />
          <span className="chevron" aria-hidden="true">
            ›
          </span>
        </button>
        <button className="tile tile-themes" onClick={() => onNavigate('themes')}>
          <span className="tile-icon" aria-hidden="true">
            📚
          </span>
          <Label fr="Thèmes" ru="Темы" hideRu={hideRu} />
          <span className="chevron" aria-hidden="true">
            ›
          </span>
        </button>
        <button className="tile tile-vocab" onClick={() => onNavigate('vocab')} disabled={glossary.length === 0}>
          <span className="tile-icon" aria-hidden="true">
            🗂️
          </span>
          <Label fr="Vocabulaire" ru="Словарь" hideRu={hideRu} />
          <span className="chevron" aria-hidden="true">
            ›
          </span>
        </button>
        <button className="tile tile-hazards" disabled>
          <span className="tile-icon" aria-hidden="true">
            ⚠️
          </span>
          <Label fr="Dangers (plus tard)" ru="Опасности (позже)" hideRu={hideRu} />
        </button>
      </div>

      <h2 className="section-title">
        {/* The settings stay bilingual, so she can find them again in "French only". */}
        <Label fr="Réglages" ru="Настройки" />
      </h2>
      <section className="card">
        <h2>
          <Label fr="Traduction" ru="Перевод" />
        </h2>
        <p className="legend" aria-hidden="true">
          <span lang="fr">Français</span>
          <span className="legend-ru" lang="ru">
            Русский
          </span>
        </p>
        <div className="segmented" role="radiogroup" aria-label="Niveau de traduction">
          {LEVELS.map(({ level, fr, ru }) => (
            <button
              key={level}
              role="radio"
              aria-checked={progress.translationLevel === level}
              className="segment"
              onClick={() => onTranslationLevel(level)}
            >
              <Label fr={fr} ru={ru} />
            </button>
          ))}
        </div>

        <hr className="card-divider" />

        <h2>
          <Label fr="Voix française" ru="Французский голос" hideRu={hideRu} />
        </h2>
        {voice === 'missing' && (
          <p className="notice notice-warning" role="alert">
            <Label
              fr="Aucune voix française n'est installée sur cet appareil. Il faut en installer une dans les paramètres (Synthèse vocale)."
              ru="На этом устройстве нет французского голоса. Его нужно установить в настройках (Синтез речи)."
            />
          </p>
        )}
        {voice === 'unsupported' && (
          <p className="notice notice-warning" role="alert">
            <Label
              fr="Ce navigateur ne peut pas lire le texte à voix haute. Utilise Chrome."
              ru="Этот браузер не умеет читать текст вслух. Используйте Chrome."
            />
          </p>
        )}
        <button
          className="btn"
          disabled={voice === 'unsupported'}
          onClick={() => speak('Bonjour ! Je lis les questions en français.')}
        >
          <Label fr="🔊 Tester la voix" ru="Проверить голос" hideRu={hideRu} />
        </button>

        <hr className="card-divider" />

        <h2>
          <Label fr="Ma progression" ru="Мой прогресс" hideRu={hideRu} />
        </h2>
        <div className="menu-2">
          <button className="btn" onClick={exportFile}>
            <Label fr="⬇ Enregistrer dans un fichier" ru="Сохранить в файл" hideRu={hideRu} />
          </button>
          <button className="btn" onClick={() => fileInput.current?.click()}>
            <Label fr="⬆ Reprendre depuis un fichier" ru="Загрузить из файла" hideRu={hideRu} />
          </button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(event) => {
            void importFile(event.target.files?.[0])
            event.target.value = ''
          }}
        />
        {importStatus === 'ok' && (
          <p className="notice notice-success" role="status">
            <Label fr="Progression reprise." ru="Прогресс загружен." hideRu={hideRu} />
          </p>
        )}
        {importStatus === 'error' && (
          <p className="notice notice-warning" role="alert">
            <Label
              fr="Ce fichier n'est pas une sauvegarde de l'app."
              ru="Этот файл не является сохранением приложения."
              hideRu={hideRu}
            />
          </p>
        )}
      </section>

      <footer className="footer">
        <span lang="fr">
          {questions.length} questions · {glossary.length} mots de vocabulaire
        </span>
        <button className="btn-quiet" onClick={() => onNavigate('credits')}>
          <Label fr="Crédits des images" ru="Источники изображений" hideRu={hideRu} />
        </button>
      </footer>
    </main>
  )
}
