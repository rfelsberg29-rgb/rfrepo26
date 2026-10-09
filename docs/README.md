# Challenge Games — Design & Engineering Docs

Planning documents for turning this student browser-game collection into a polished, cohesive product.

| Document | Purpose |
|----------|---------|
| [audit.md](./audit.md) | Current-state inventory, risks, and gaps (Challenge Games) |
| [game-design.md](./game-design.md) | Vision, loops, progression, player experience |
| [architecture.md](./architecture.md) | Games systems map and technical plan |
| [roadmap.md](./roadmap.md) | Prioritized milestones (games + gated WHOOP track) |
| [whoop-integration.md](./whoop-integration.md) | Real WHOOP OAuth feasibility — **blocked** without a backend |

**Stack today:** plain HTML / CSS / JavaScript games — no server, no database, no app auth.

**WHOOP brief:** cannot be implemented as a real integration in this static repo alone. See whoop-integration.md for the recommended Next.js + PostgreSQL architecture and decision gates.
