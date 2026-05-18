# CLAUDE.md — Understand_Your_Vibe-UYV (Code Tribunal)

> **Note pour Claude Code** : Ce fichier décrit l'objectif, l'architecture, la stack, les conventions et le plan d'exécution de ce projet. **Lis-le entièrement** avant toute modification de code. En cas de doute entre une instruction utilisateur et ce document, demande confirmation avant d'agir. Si tu détectes une contradiction entre le code et ce document, signale-la.

---

## 🎯 Mission

Construire un outil qui force les développeurs à **prouver leur compréhension** du code généré par IA avant qu'il puisse être mergé dans `main`.

Trois agents IA analysent chaque PR :

- **Defense** (l'avocat) — argumente les mérites de la PR, met en valeur les bonnes décisions de conception
- **Prosecution** (le procureur) — expose les risques, vulnérabilités, edge cases, dette technique
- **Interrogator** — génère 3 questions techniques précises et ciblées sur le diff
- **Judge** — synthétise les 3 sorties en un verdict structuré

Un cinquième agent, **Evaluator**, note les réponses du développeur au quiz.

Le développeur est le **juge final**. Il lit défense + accusation, répond aux questions, et débloque (ou non) le merge selon son score de compréhension.

> **One-liner** : *"Every AI-generated PR deserves a fair trial. Defense argues its merits, Prosecution exposes its risks, and the developer renders the final verdict after proving understanding."*

---

## 🏆 Contexte hackathon

- **Durée** : 3 jours
- **Thème** : *"Comment intégrer un Coding Agent dans un workflow de développement sans perdre la maîtrise du code ?"*
- **Équipe** : 6 personnes, profil *"on apprend en faisant"*
- **Langage cible pour la démo** : C / C++ (sujets critiques : gestion mémoire, pointeurs, UB, race conditions)
- **Clé OpenAI fournie** par l'organisateur, accès à toute la gamme (GPT-5.x, codex, mini, etc.)

---

## 🏗️ Architecture

### Vue d'ensemble

```bash
┌─────────────────────┐
│  GitHub             │
│  (PR opened/synced) │
└──────────┬──────────┘
           │ webhook (via ngrok static domain)
           ▼
┌─────────────────────────────────────────────┐
│  Next.js 15 (TypeScript)                    │
│  - Webhook receiver                         │
│  - Orchestration (DB, status checks)        │
│  - Page de quiz                             │
│  - Landing & dashboard                      │
│  - Prisma + SQLite                          │
└──────────┬──────────────────────────────────┘
           │ HTTP POST (localhost:8000)
           ▼
┌─────────────────────────────────────────────┐
│  FastAPI (Python 3.11+)                     │
│  - Defense agent                            │
│  - Prosecution agent                        │
│  - Interrogator agent                       │
│  - Judge agent (synthèse)                   │
│  - Evaluator agent (note les réponses)      │
└──────────┬──────────────────────────────────┘
           │
           ▼
┌─────────────────────┐
│  OpenAI API         │
└─────────────────────┘
```

### Flux end-to-end d'une PR

1. PR ouverte sur GitHub → webhook `pull_request.opened` reçu par Next.js
2. Next.js récupère le diff via Octokit, le push au service Python
3. Le service Python lance **3 agents en parallèle** (`asyncio.gather`) : Defense, Prosecution, Interrogator
4. Le **Judge** est appelé ensuite, avec les 3 sorties en entrée, et produit un verdict structuré
5. Le verdict est renvoyé à Next.js qui :
   - Poste un **commentaire structuré** sur la PR (collapsible Defense / Prosecution + lien quiz)
   - Crée un **status check `pending`** sur le `head_sha` du PR
   - Crée une `QuizSession` en DB
6. Le dev clique le lien dans le commentaire → arrive sur `/quiz/[sessionId]`
7. Il voit Defense + Prosecution côte à côte + 3 questions
8. Il répond → le service Python lance l'**Evaluator** → score de compréhension calculé
9. Si seuil atteint (par défaut ≥ 70/100), Next.js passe le **status check à `success`** via l'API GitHub → le bouton merge se débloque

### Pourquoi cette archi

- **GitHub App + Branch Protection** = on ne bloque pas le `git push`, on bloque le **merge**. Impossible à contourner avec `--no-verify` ou autres tricks locaux.
- **Multi-agents en parallèle** = pattern propre, légitime, latence acceptable, séparation claire des responsabilités. Chaque agent = un prompt, un schéma, un fichier.
- **Split TS/Python** = chaque équipe travaille dans son confort, les agents s'itèrent vite côté Python.

---

## 🛠️ Stack technique

### Web (TypeScript)

- **Next.js 15** (App Router, dossier `src/`)
- **TypeScript strict** (`strict: true`)
- **Tailwind CSS + shadcn/ui**
- **Prisma + SQLite** (fichier `dev.db`)
- **@octokit/app**, **@octokit/webhooks**, **@octokit/rest**
- **Zod** pour la validation runtime de tous les payloads externes

### AI Service (Python)

- **Python 3.11+**
- **FastAPI + uvicorn**
- **OpenAI SDK officiel** (`openai>=1.50`)
- **Pydantic v2** pour les Structured Outputs
- **httpx**, **python-dotenv**

### Infra locale

- **pnpm** (jamais npm/yarn)
- **ngrok avec Static Domain** (URL stable indispensable, on ne reconfigure pas la GitHub App à chaque relance)
- **Pas de Docker**, pas de Vercel, pas de Redis, pas de queue, pas de Kubernetes. Tout en local pour le hackathon.

### ❌ Ce qu'on n'utilise PAS (décidé, ne pas y revenir)

- ❌ Pas de **LangChain / CrewAI / AutoGen / Haystack** — on code direct avec le SDK OpenAI
- ❌ Pas de microservices supplémentaires
- ❌ Pas de Redis / Kafka / RabbitMQ
- ❌ Pas de Vercel / déploiement distant (sauf décision contraire en Phase 5)
- ❌ Pas de TypeScript pour les agents (Python uniquement)
- ❌ Pas de Python pour le web (TypeScript uniquement)
- ❌ Pas de Tailwind dans le service Python (évidemment, mais on évite les confusions de scope)

---

## 📁 Structure du repo

```bash
Understand_Your_Vibe-UYV/
├── CLAUDE.md                       ← Ce fichier
├── README.md
├── .env.example                    ← Template (commité)
├── .gitignore
├── start-dev.sh                    ← Lance tout en une commande
│
├── web/                            ← Next.js (TypeScript)
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/
│   │   │   │   ├── webhooks/github/route.ts
│   │   │   │   ├── quiz/[sessionId]/route.ts
│   │   │   │   └── installations/route.ts
│   │   │   ├── quiz/[sessionId]/page.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   └── page.tsx                ← Landing
│   │   ├── components/
│   │   │   ├── ui/                     ← shadcn (généré)
│   │   │   ├── verdict-card.tsx
│   │   │   ├── perspective-column.tsx  ← Defense / Prosecution
│   │   │   ├── quiz-form.tsx
│   │   │   └── risk-score.tsx
│   │   └── lib/
│   │       ├── db.ts                   ← Prisma client singleton
│   │       ├── github/
│   │       │   ├── app.ts              ← Octokit App init
│   │       │   ├── status.ts           ← Set status checks
│   │       │   └── comment.ts          ← Post PR comments
│   │       ├── ai-service.ts           ← HTTP client → FastAPI
│   │       ├── schemas.ts              ← Zod schemas (mirroir de schemas.py)
│   │       └── env.ts
│   ├── prisma/
│   │   └── schema.prisma
│   ├── package.json
│   └── tsconfig.json
│
├── ai/                             ← Python (FastAPI)
│   ├── main.py                     ← FastAPI app, routes /api/trial et /api/evaluate
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── defense.py
│   │   ├── prosecution.py
│   │   ├── interrogator.py
│   │   ├── judge.py
│   │   └── evaluator.py
│   ├── prompts/
│   │   ├── defense.md
│   │   ├── prosecution.md
│   │   ├── interrogator.md
│   │   ├── judge.md
│   │   └── evaluator.md
│   ├── schemas.py                  ← Pydantic models (mirroir de schemas.ts)
│   ├── llm.py                      ← Client OpenAI partagé + constantes MODELS
│   ├── pyproject.toml
│   └── .python-version
│
└── demo/                           ← Repo C de démo (track 6)
    ├── arena_allocator.c
    ├── arena_allocator.h
    └── README.md
```

**Règle de séparation stricte** : aucune logique d'analyse de code, de prompting, ou d'évaluation ne doit vivre dans `web/`. Toute interaction avec OpenAI passe par le service Python. Le code TS appelle `runTrial()` ou `runEvaluation()` et c'est tout.

---

## 🤖 Modèles OpenAI par agent

Définis dans `ai/llm.py` comme **constantes** — ne jamais hardcoder un nom de modèle dans un agent.

| Agent        | Modèle              | Pourquoi                                      |
|--------------|---------------------|-----------------------------------------------|
| Interrogator | `gpt-5.1-codex`     | Spécialisé code, idéal pour questions C/C++   |
| Defense      | `gpt-5.1`           | Raisonnement argumentatif général             |
| Prosecution  | `gpt-5.1-codex`     | Repère leaks, UB, race conditions en C/C++    |
| Judge        | `gpt-5.1`           | Synthèse structurée                           |
| Evaluator    | `gpt-5.1-mini`      | Rapide, suffisant pour noter des réponses     |
| Dev / debug  | `gpt-4.1-mini`      | Économique pour itération locale              |

```python
# ai/llm.py
from openai import AsyncOpenAI
import os

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class MODELS:
    INTERROGATOR = "gpt-5.1-codex"
    DEFENSE = "gpt-5.1"
    PROSECUTION = "gpt-5.1-codex"
    JUDGE = "gpt-5.1"
    EVALUATOR = "gpt-5.1-mini"
    DEV = "gpt-4.1-mini"
```

---

## 💾 Schéma de base de données

Prisma + SQLite, fichier `web/prisma/schema.prisma`. Cinq tables :

- **Installation** : une org GitHub qui a installé l'app
- **PullRequest** : une PR analysée. `status ∈ { pending, awaiting_proof, approved, rejected }`
- **Trial** : un "procès" complet, **1 par `head_sha`**. Contient les JSON des sorties des 4 agents.
- **QuizSession** : une tentative de réponse aux questions (1 PR peut en avoir plusieurs si le dev réessaye)
- **AuditLog** *(optionnel)* : événements pour le dashboard

⚠️ **Sur `pull_request.synchronize`** (nouveau push sur PR existante) : il faut **invalider** le précédent Trial, créer un nouveau Trial pour le nouveau `head_sha`, et **remettre le status check à `pending`**. Sinon un dev peut faire valider une version, puis push n'importe quoi avant le merge.

---

## 🌐 Contrat d'API entre `web` et `ai`

JSON, port 8000 par défaut pour le service Python.

### `POST /api/trial`

**Request** :

```json
{
  "diff": "string (unified diff au format git)",
  "repo_full_name": "owner/repo",
  "pr_number": 42,
  "language": "c"
}
```

**Response** :

```json
{
  "defense": {
    "strengths": [
      { "title": "...", "explanation": "...", "line_references": ["L42-L50"] }
    ],
    "design_intent": "...",
    "defense_summary": "..."
  },
  "prosecution": {
    "concerns": [
      { "title": "...", "severity": "low|medium|high|critical", "explanation": "...", "line_references": ["..."] }
    ],
    "attack_vectors": ["..."],
    "prosecution_summary": "..."
  },
  "questions": {
    "items": [
      { "id": "q1", "text": "...", "topic": "memory_management", "expected_concepts": ["malloc/free pairing", "..."] }
    ]
  },
  "verdict": {
    "risk_score": 6.5,
    "recommendation": "approve | request_changes | needs_understanding_proof",
    "summary": "..."
  }
}
```

### `POST /api/evaluate`

**Request** :

```json
{
  "questions": [{ "id": "q1", "text": "...", "expected_concepts": ["..."] }],
  "answers": ["string", "string", "string"]
}
```

**Response** :

```json
{
  "understanding_score": 78,
  "per_question": [
    { "question_id": "q1", "score": 80, "feedback": "...", "missing_concepts": [] }
  ],
  "passed": true
}
```

Les schémas Pydantic sont dans `ai/schemas.py`, les Zod équivalents dans `web/src/lib/schemas.ts`. **Ces deux fichiers doivent rester strictement alignés.** Si tu modifies l'un, modifie l'autre dans le même commit.

---

## ⚙️ Commandes utiles

### Setup initial

```bash
# Web
cd web && pnpm install && pnpm dlx prisma migrate dev

# AI service
cd ai && python -m venv .venv && source .venv/bin/activate && pip install -e .
```

### Dev (3 terminaux, ou utiliser `start-dev.sh`)

```bash
# Terminal 1 — Next.js
cd web && pnpm dev

# Terminal 2 — FastAPI
cd ai && source .venv/bin/activate && uvicorn main:app --reload --port 8000 --reload-include "*.md"

# Terminal 3 — ngrok
ngrok http --url=your-team.ngrok-free.app 3000
```

### Tester un agent en isolation (sans GitHub)

```bash
cd ai && source .venv/bin/activate
python -m agents.defense < ../demo/sample_diff.txt
```

### DB

```bash
cd web
pnpm dlx prisma studio          # UI graphique sur la DB
pnpm dlx prisma migrate dev     # Nouvelle migration après modif du schema
pnpm dlx prisma generate        # Régénérer le client après modif
```

### Replay d'un webhook GitHub

**GitHub App → Advanced → Recent Deliveries → Redeliver**. Indispensable pour debug, ne réinvente pas ça.

---

## 🔐 Variables d'environnement

Toutes dans `.env.local` (gitignoré). Template dans `.env.example`.

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# GitHub App
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_APP_WEBHOOK_SECRET=
GITHUB_APP_CLIENT_ID=
GITHUB_APP_CLIENT_SECRET=

# DB
DATABASE_URL="file:./dev.db"

# Services
AI_SERVICE_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=https://your-team.ngrok-free.app
```

⚠️ **Ne jamais commit `.env.local`. Ne jamais logger la private key ni le webhook secret.**

---

## 📐 Conventions de code

### Général

- **Pas de refacto pendant les 3 jours.** Code-it-now, clean-it-later.
- **`main` toujours déployable.** Personne ne casse `main`.
- **Une branche par track**, pas par personne. Ex: `track/backend-agents`, `track/web-ui`, `track/devops`.
- **Commits explicites** : `feat(agents): add prosecution`, `fix(webhook): handle missing installation`, `chore(deps): bump openai sdk`.
- **PR review** : un autre membre relit avant merge dans `main`. Pas de self-merge sauf urgence et accord du tech lead.

### TypeScript

- `strict: true` dans `tsconfig.json`
- **Aucun `any`.** Préférer `unknown` + parsing Zod.
- **Tous les payloads externes** (GitHub webhooks, AI service responses) sont parsés via Zod **avant** d'être utilisés.
- Pas d'`export default` sauf pour les pages Next.js (obligatoire).
- Préférer les **named exports** et les **fichiers courts** (1 chose par fichier).

### Python

- Python 3.11+ avec **type hints partout**
- **Pydantic v2** pour tout schéma de données
- Pas de classes inutiles : si une fonction suffit, c'est une fonction.
- **Tous les prompts sont en fichiers `.md` séparés**, jamais en strings inline.
- **Async par défaut** (`async def`) pour tout I/O (OpenAI, HTTP).
- Imports absolus depuis la racine `ai/`.

### Prompts

- Stockés dans `ai/prompts/*.md`
- Chargés via `Path(__file__).parent.parent / "prompts" / "X.md".read_text()`
- Versionnés en Git, reviewables comme du code
- Structure recommandée :

  ```bash
  # Identity
  You are [role]...

  # Mission
  ...

  # Output format
  (rappeler le schéma attendu)

  # Constraints
  - ...
  - ...

  # Examples (optionnel)
  ```

### UI / Design

- Composants **shadcn/ui** par défaut
- **Thème "tribunal"** : palette sobre
  - Defense : bleu profond / navy
  - Prosecution : bordeaux / rouge sobre
  - Background : crème / off-white
  - Accent : doré sobre pour le verdict
- **Pas de vert/rouge agressifs** type linter. On joue le sérieux, pas l'alarme.
- Font serif pour les titres (Playfair Display, EB Garamond, ou Cormorant)
- Font sans pour le corps (Inter, Geist)
- Composants clés à créer :
  - `<VerdictCard />` — la carte avec le verdict + risk score
  - `<PerspectiveColumn variant="defense|prosecution" />` — colonne d'arguments
  - `<QuizForm />` — formulaire de réponses
  - `<RiskScore value={n} />` — visu du score

---

## 🚦 Plan de développement en 5 phases

### Phase 1 — Fondations (Jour 1 matin, ~4h)

**Objectif** : webhook GitHub reçoit `pull_request.opened` et écrit en DB. Pas d'IA, pas d'UI, juste la plomberie.

- [ ] Init Next.js + Prisma + SQLite
- [ ] GitHub App créée, installée sur un repo de test
- [ ] ngrok static domain configuré
- [ ] Webhook receiver vérifie la signature et écrit en DB
- [ ] Validation : créer une PR sur le repo de test fait apparaître une ligne dans `prisma studio`

### Phase 2 — Premier agent end-to-end (Jour 1 aprèm)

**Objectif** : flux complet avec **uniquement l'Interrogator**. Une PR → 3 questions → quiz → status check vert.

- [ ] Service FastAPI minimal (`/api/trial` qui ne fait tourner que l'Interrogator pour l'instant)
- [ ] Agent Interrogator avec Pydantic structured output
- [ ] Côté web : récupération du diff via Octokit, appel au service Python
- [ ] Status check `pending` posé sur le commit
- [ ] Commentaire posté sur la PR avec lien `/quiz/[sessionId]`
- [ ] Page `/quiz/[sessionId]` fonctionnelle (peut être moche)
- [ ] Soumission → Evaluator → status check à `success`

### Phase 3 — Multi-agents (Jour 2 matin)

- [ ] Defense agent + Prosecution agent
- [ ] Lancement en parallèle avec `asyncio.gather`
- [ ] Judge synthétise un verdict structuré
- [ ] Commentaire PR enrichi (collapsibles Defense / Prosecution)
- [ ] Page quiz affiche les 2 perspectives en colonnes

### Phase 4 — UX & branding (Jour 2 aprèm)

- [ ] Landing avec bouton "Install on GitHub"
- [ ] Dashboard minimal (liste des PRs analysées, scores)
- [ ] Look "tribunal" cohérent (palette, fonts)
- [ ] Risk score visualisé proprement
- [ ] Détection auto si branch protection absente → bouton "Enable protection" via API GitHub

### Phase 5 — Polish & démo (Jour 3)

- [ ] Edge cases : re-push sur PR (synchronize), erreurs OpenAI (retry, fallback), payload trop gros (chunk diff)
- [ ] Repo C de démo finalisé (allocateur custom ~200 lignes avec pièges intéressants)
- [ ] Slides
- [ ] Démo répétée **minimum 5 fois** avec chrono
- [ ] **Machine backup prête** (deuxième ordi avec stack identique qui tourne en miroir)

---

## 🎬 Scénario de démo (à viser : 90 secondes)

1. *"Voici Understand_Your_Vibe-UYV, installé sur ce repo C."* — montrer la GitHub App installée
2. *"Je simule un dev qui a copié-collé 200 lignes d'allocateur générées par un agent IA."* — push sur une branche
3. PR créée → en ~10 secondes, le commentaire structuré apparaît : Defense, Prosecution, lien quiz
4. Status check rouge / pending, **bouton merge grisé** *(c'est la punchline visuelle)*
5. *"Le dev clique sur le lien."* → ouvre la page quiz, deux colonnes Defense / Prosecution + 3 questions
6. Tape une réponse vague à la première question → score faible, check reste rouge
7. Tape une réponse précise → score bon, check passe au vert, merge débloqué
8. **Punchline finale** : *"Vous pouvez `git push` tout ce que vous voulez. Vous ne shippez que ce que vous comprenez."*

---

## 🚫 Ce qu'il NE faut PAS faire (rappel)

- ❌ Ajouter des frameworks d'agents (LangChain, CrewAI…)
- ❌ Mettre des prompts en string inline
- ❌ Hardcoder un nom de modèle dans un agent (utiliser `MODELS.X`)
- ❌ Refactor du code existant pendant le hackathon
- ❌ Faire des microservices supplémentaires
- ❌ Casser `main`
- ❌ Commit un secret
- ❌ Faire confiance à un payload externe sans le parser
- ❌ Ajouter une feature hors scope (analytics avancées, multi-tenant, billing, OAuth fancy)
- ❌ Push directement sur `main` sans PR (sauf tech lead en urgence justifiée)
- ❌ Mélanger les responsabilités web/ai (toute logique LLM dans `ai/`)

---

## 🧭 Si tu hésites, demande-toi

1. **Est-ce que ça sert la phrase mission ?** ("Defense argues, Prosecution exposes, dev judges after proving understanding") — Si non → ne le fais pas.
2. **Est-ce que ça tient en moins de 4h ?** — Si non → coupe en plus petit.
3. **Est-ce que ça marche en local + ngrok ?** — Si non → mauvaise piste.
4. **Est-ce que ça améliore la démo ?** — Si non, c'est peut-être pour après le hackathon.
5. **Est-ce que ça respecte le split web (TS) / ai (Python) ?** — Si non → revoir.

---

## 👥 Équipe & responsabilités

| Personne | Track                 | Tech       | Mission principale                                   |
|----------|-----------------------|------------|------------------------------------------------------|
| Dev 1    | Backend GitHub        | TypeScript |  GitHub App, webhook, status checks, Octokit         |
| Dev 2    | Backend orchestration | TypeScript |  Glue web ↔ ai, DB, gestion des sessions quiz        |
| Dev 3    | Frontend Quiz         | TypeScript | Page `/quiz/[id]`, soumission, UI deux colonnes      |
| Dev 4    | Frontend Marketing    | TypeScript |  Landing, dashboard, branding tribunal               |
| Dev 5    | AI Service            | Python     |  Tous les agents + FastAPI + prompts                 |
| Dev 6    | Demo & Pitch          | C + slides |  Repo C de démo, scénario, slides, vidéo backup      |

**Tech lead** : Dev 1 ou Dev 2 (à désigner). Tranche les choix d'archi à chaud.

---

## 📊 État actuel

*Ce tableau de bord doit être mis à jour régulièrement par l'équipe — c'est le tableau de bord vivant du projet.*

- **Phase actuelle** : Phase 1 — Fondations
- **Date démo** : `[À compléter]`
- **URL ngrok** : `https://your-team.ngrok-free.app` *(à remplacer par la vraie)*
- **Statut global** : Setup en cours

### Blocages connus

- *(aucun pour l'instant)*

### Décisions prises

- Split TS (web) / Python (ai)
- ngrok local + Static Domain, pas de Vercel pour la démo
- Modèles : `gpt-5.1` pour raisonnement, `gpt-5.1-codex` pour code, `gpt-5.1-mini` pour eval
- Pattern multi-agents en parallèle + Judge synthétiseur

---

## 📝 Notes finales pour Claude Code

- Ce document est **autoritaire** sur les choix d'archi. Si l'utilisateur te demande quelque chose qui contredit ce document, **signale-le et demande confirmation**.
- Si tu ajoutes une dépendance, mets-la à jour dans la section **Stack technique** du document.
- Si tu modifies un contrat d'API, mets à jour la section correspondante **et** les schémas Zod + Pydantic dans le même commit.
- Si tu finis une phase, coche les items et mets à jour **État actuel**.
- En cas d'erreur OpenAI (rate limit, modèle down), retombe sur `gpt-4.1-mini` temporairement et signale-le dans la PR/commit.
