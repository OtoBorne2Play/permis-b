import { Label } from '../components/Label'
import { credits } from '../data'
import type { TranslationLevel } from '../types'

interface CreditsProps {
  level: TranslationLevel
  onExit: () => void
}

/** Where each image comes from: source, author and licence. */
export function Credits({ level, onExit }: CreditsProps) {
  const hideRu = level === 3
  return (
    <main className="page">
      <header className="exam-header">
        <h1 className="page-title">
          <Label fr="Crédits des images" ru="Источники изображений" hideRu={hideRu} />
        </h1>
        <button className="btn-quiet" onClick={onExit}>
          <Label fr="Accueil" ru="На главную" hideRu={hideRu} />
        </button>
      </header>

      {credits.length === 0 ? (
        <p className="notice">
          <Label fr="Il n'y a pas encore d'image dans l'app." ru="В приложении пока нет изображений." hideRu={hideRu} />
        </p>
      ) : (
        <ul className="credits">
          {credits.map((credit) => (
            <li key={credit.image} className="credit">
              <img src={import.meta.env.BASE_URL + credit.image} alt="" loading="lazy" />
              <div className="credit-text" lang="fr">
                <strong>{credit.title ?? credit.image}</strong>
                <span>
                  {credit.author} · {credit.license}
                </span>
                <a href={credit.url} target="_blank" rel="noreferrer">
                  {credit.source}
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
