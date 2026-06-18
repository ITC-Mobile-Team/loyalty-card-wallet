# Video Notes: Documentation Tree Reference

## Source

Local screen recording:

```text
/Users/perets/Downloads/ScreenRecording_05-28-2026 14-19-58_1.MP4
```

## Observed Pattern

The video shows an Obsidian-style project documentation tree for an agentic pet project. The useful pattern is not the exact folder names, but the separation of responsibilities:

- ADRs for technology and architecture decisions.
- API notes for contracts.
- Architecture pages for context maps, layers, diagrams, and overview.
- Conventions for recurring implementation rules.
- Images for diagrams and visual references.
- Performance and QA notes.
- Stack documentation.
- Plans that agents can execute.
- Data model notes.
- User guide notes.

## Adaptation For This Project

This project uses a mobile-first version of that structure:

- `docs/adr/` records decisions.
- `docs/architecture/` records module boundaries and maps.
- `docs/stack/` records the React Native mobile stack.
- `docs/data-model/` records SQLite and local file storage.
- `docs/user-guide/` records app behavior from the user's perspective.
- `docs/qa/` records mobile validation.

## Initial Takeaway

Documentation should be actionable for agents and maintainable for humans. Each document should make future implementation easier by preserving context, constraints, and reasons.
