# Git Tracking Policy

This repository separates commit-ready project knowledge from local agent instructions and private planning material.

## Commit-Ready Documentation

These paths can be committed when relevant:

- `docs/adr/`
- `docs/api/`
- `docs/architecture/`
- `docs/data-model/`
- `docs/design/`
- `docs/imagesForDesign/`
- `docs/qa/`
- `docs/research/`
- `docs/stack/`
- `docs/user-guide/`
- `docs/README.md`
- `.gitignore`

These documents explain product decisions, architecture, public contracts, design direction, testing expectations, and technology choices.

## Local-Only Material

These paths must stay out of git:

- `AGENTS.md`
- `CLAUDE.md`
- `GEMINI.md`
- `.codex/`
- `.claude/`
- `.cursor/`
- `.windsurf/`
- `docs/instructions/`
- `docs/plans/`
- `docs/conventions/`
- `docs/developer-experience/`
- `docs/study/`
- `docs/loyalty-card-wallet-plan.md`

These files are local agent instructions, private plans, developer-workflow notes, or personal study notes. They can guide local work, but they should not be committed.

## Sensitive And Generated Files

Never commit:

- `.env` files,
- signing keys,
- provisioning profiles,
- store credentials,
- generated native folders,
- build artifacts,
- dependency folders.

## Agent Rule

Agents must respect `.gitignore`. Do not use `git add -f` for ignored files unless the user explicitly asks for a specific ignored file to be force-added and confirms that it is safe.

Before staging, check:

```sh
git status --short --ignored
git check-ignore -v <path>
```

If a file is ignored because it is local-only or sensitive, do not stage it.
