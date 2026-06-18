# ADR 0001: Documentation Structure

## Status

Accepted

## Date

2026-06-10

## Context

This project is a learning-focused React Native pet project. The documentation needs to capture not only the final implementation, but also the reasoning behind each architecture and library decision.

The referenced video showed a documentation tree organized around ADRs, architecture, conventions, stack, plans, data model, user guide, images, and review notes. That pattern is useful because it gives agents and humans a stable place to look before changing code.

## Decision

Use a `docs/`-first documentation system with these top-level areas:

- `adr/` for decisions.
- `architecture/` for diagrams, context, and boundaries.
- `conventions/` for recurring project rules.
- `plans/` for executable implementation plans.
- `stack/` for selected technologies and library ownership.
- `data-model/` for persistence details.
- `user-guide/` for product behavior.
- `api/` for import/export and future integration contracts.
- `qa/` for validation.
- `research/` for source notes and experiments.
- `imagesForDesign/` for visual references.

## Consequences

- New decisions should be recorded as ADRs before or alongside implementation.
- Plans should link to the relevant ADRs instead of repeating all context.
- Documentation will be slightly more work upfront, but it will reduce repeated rediscovery during future sessions.

## Alternatives Considered

- One large project plan only: simpler at first, but hard to maintain as the app grows.
- Code comments only: close to implementation, but poor for product and architecture tradeoffs.
- External notes app only: useful for thinking, but not versioned with the project.
