# Loyalty Card Wallet Documentation

This directory is the project memory for product decisions, architecture, implementation plans, and operational notes.

The app is a React Native pet project for storing loyalty cards locally, showing scanner-friendly barcodes, and learning React Native architecture through explicit decisions.

Some local instruction, planning, developer-experience, and study documents are intentionally ignored by git and are not part of the public repository.

## Directory Map

```text
docs/
  README.md
  adr/
  api/
  architecture/
  data-model/
  design/
  imagesForDesign/
  qa/
  readme/
  research/
  stack/
  user-guide/
```

## What Goes Where

- `adr/`: accepted architecture decision records. Use this for every meaningful technology, architecture, or product tradeoff.
- `api/`: local service contracts, future backend contracts, import/export formats, and integration boundaries.
- `architecture/`: system overview, module boundaries, context maps, diagrams, and dependency rules.
- `data-model/`: SQLite schema, entity definitions, migrations, and persistence notes.
- `design/`: reference analysis, design system, screen specs, interaction states, and accessibility rules.
- `imagesForDesign/`: screenshots, design references, mockups, and visual research assets.
- `qa/`: manual QA checklists, device testing notes, and release validation.
- `readme/`: public screenshots and media used by the root README.
- `research/`: notes from videos, articles, library comparisons, and experiments.
- `stack/`: current technology stack and library ownership notes.
- `user-guide/`: user-facing flows and expected behavior.

Local-only directories may exist in a working copy for agent instructions, private implementation plans, developer workflow notes, and personal study material. They are ignored by git.

## Documentation Rules

- Keep documents in English.
- Prefer small documents with one clear topic.
- Record the reason for a decision, not only the final choice.
- Link from a plan to the ADRs and architecture pages it depends on.
- Update documents when an implementation changes the decision.

## Git Tracking Policy

General project documentation can be committed, especially ADRs, architecture notes, API contracts, data-model notes, QA references, stack decisions, and research.

Local agent instructions, private implementation plans, personal study notes, generated app files, credentials, environment files, and store signing artifacts must stay out of git. The repository `.gitignore` enforces this for `AGENTS.md`, `docs/instructions/`, `docs/plans/`, `docs/conventions/`, `docs/developer-experience/`, `docs/study/`, and common secret/build artifacts.

Agents must not use `git add -f` for ignored files unless the user explicitly confirms the exact file is safe to force-add. See [architecture/git-tracking-policy.md](architecture/git-tracking-policy.md).

## Current Starting Points

- Documentation structure ADR: [adr/0001-documentation-structure.md](adr/0001-documentation-structure.md)
- Mobile stack ADR: [adr/0002-react-native-expo-typescript.md](adr/0002-react-native-expo-typescript.md)
- Offline-first storage ADR: [adr/0003-offline-first-local-data.md](adr/0003-offline-first-local-data.md)
- Mobile design direction ADR: [adr/0004-mobile-design-direction.md](adr/0004-mobile-design-direction.md)
- Private images and sharing ADR: [adr/0005-private-card-images-and-sharing.md](adr/0005-private-card-images-and-sharing.md)
- Scanner and photo import dependency ADR: [adr/0006-scanner-and-photo-import-dependencies.md](adr/0006-scanner-and-photo-import-dependencies.md)
- Import/export contract: [api/import-export.md](api/import-export.md)
- Git tracking policy: [architecture/git-tracking-policy.md](architecture/git-tracking-policy.md)
- Mobile clean architecture: [architecture/mobile-clean-architecture.md](architecture/mobile-clean-architecture.md)
- Design docs: [design/README.md](design/README.md)
