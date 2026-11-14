# Points à vérifier

Valeurs utilisées dans l'app dont la source n'est pas officielle ou qui peuvent changer.
À confirmer auprès du centre d'examen de Tournai ou du SPW Mobilité.

## Règles de l'examen

- [ ] **Fautes graves à l'examen théorique** — L'app applique : faute grave = −5 points, **2 fautes graves = échec**, réussite à 41/50.
  Vérifié le 14/11/2026 dans la presse (Moniteur Automobile, avril 2026 ; RTBF) : une faute grave est tolérée, deux éliminent.
  Une page d'un site de préparation affirme au contraire qu'aucune faute grave n'est permise. Pas de confirmation sur un site officiel.
  Si la règle est « une seule faute grave = échec », changer `GRAVE_ERRORS_TO_FAIL` de 2 à 1 dans `src/logic/scoring.ts`.

## Questions

Questions marquées `verified: false` dans `data/questions.json`.
Une fois la règle confirmée, passer `verified` à `true` et cocher la ligne.

- [ ] `signalisation-indication-009` — Usagers exclus d'une route pour automobiles (panneau F9) : à confirmer.
- [ ] `signalisation-indication-010` — Signification des panneaux orange en forme de flèche (F41, déviation) : à confirmer.
- [ ] `marquages-010` — Couleur des marques temporaires de chantier en Belgique (orange) : à confirmer.
- [ ] `ronds-points-002` — Usage du clignotant à l'entrée d'un rond-point (non obligatoire) : à confirmer.
- [ ] `vitesse-005` — Limite de 120 km/h sur une route à 2×2 bandes avec berme centrale, hors agglomération, en Wallonie : à confirmer.
- [ ] `vitesse-007` — Portée d'une limitation par panneau C43 (jusqu'au prochain carrefour) : à confirmer.
- [ ] `depassement-010` — Règle de dépassement des trams (par la droite, exceptions par la gauche) : à confirmer.
- [ ] `passages-a-niveau-007` — Signification du feu blanc clignotant aux passages à niveau : à confirmer.
- [ ] `vehicule-technique-002` — Conditions exactes d'utilisation du feu antibrouillard arrière (visibilité de 100 m, forte pluie) : à confirmer.
- [ ] `vehicule-technique-005` — Liste de l'équipement obligatoire en Belgique (extincteur, trousse de secours) : à confirmer.
- [ ] `permis-infractions-008` — Sanctions pour les conducteurs titulaires du permis depuis moins de deux ans : à confirmer.
