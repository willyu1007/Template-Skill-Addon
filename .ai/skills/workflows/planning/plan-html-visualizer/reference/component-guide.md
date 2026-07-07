# Component Guide

Selecting and composing presentation components for plan HTML artifacts.

## Component Index

| Component | File | Use for |
| --- | --- | --- |
| Mindmap overview | `components/mindmap.html` (+ `scripts/mindmap.js`) | whole-plan structure at a glance; auto-rendered, zero content cost |
| Summary card | `components/summary-card.html` | goals, scope, key changes, constraints, major risks |
| Timeline | `components/timeline.html` | strictly ordered phases, migration sequences, dependent steps |
| Flow graph | `components/flow-graph.html` (+ `scripts/flow-graph.js`) | branching / conditional workflows, decision points, rollback paths |
| Parallel tracks | `components/parallel-tracks.html` | concurrent workstreams with sync points |
| Architecture graph | `components/architecture-graph.html` | component relationships, dependencies, data flow, boundaries |
| Comparison | `components/comparison.html` | before/after or current/target changes |
| Decision card | `components/decision-card.html` | technical choices, trade-offs, alternatives already in the plan |
| Risk card | `components/risk-card.html` | implementation, migration, compatibility, operational risks |
| Impact map | `components/impact-map.html` | affected files, modules, dependencies, cross-cutting changes |
| Detail section | inline | implementation details, commands, API/DB changes, validation steps |

## Selection Heuristics

- Choose by information structure, not decoration: relationships → architecture graph, strict sequences → timeline, branching → flow graph, concurrency → parallel tracks, changes → comparison, uncertainty → risk cards, affected surface → impact map.
- Timeline vs flow graph vs parallel tracks: timeline for a single strict order; flow graph when there are decision points or alternate paths (including rollback); parallel tracks when independent workstreams run concurrently and meet at sync points.
- One view per concern. Do not force every plan into every format; a small plan may need only the overview band and one detail section.
- Detail sections are collapsed by default. The default view shows what is changing, why it matters, the major approach, important risks, and affected areas.
- Rejected alternatives appear in decision cards only when they already exist in the plan. Never invent alternatives for symmetry.

## Focus and Layout

- **Overview band first**: mindmap (`span-two-thirds`, auto-rendered from the semantic context model) + compact summary card (`span-third`). The mindmap doubles as a navigation and feedback surface — every node is clickable and selectable.
- **Focus budget**: beyond the overview band, at most 2 primary views. Everything else is `data-priority="secondary"` and starts collapsed; clicking the heading expands it (handled by `scripts/interaction.js`).
- **Row sharing**: pair compact views with `span-half` / `span-third` classes (for example two risk cards side by side, or comparison + decision card). Reserve `span-full` for timeline, flow graph, and dense content.

## Anti-Patterns

- A diagram with nodes or edges that do not correspond to semantic context nodes.
- Timelines used for unordered lists, or for flows that actually branch.
- Comparisons where the "before" state was never described in the plan.
- Visual decoration (icons, badges, colors) that encodes no plan information.
- Marking everything primary — if everything is emphasized, nothing is.

## Composition

- `templates/base.html` is the page shell: header, navigation, main content grid, feedback panel, and the four embedded JSON blocks.
- Component fragments are inserted into `<main>`; each fragment root keeps its `data-component`, `data-semantic-node-id`, `data-priority`, and `span-*` class.
- Page scripts (`scripts/i18n.js` first, then `scripts/navigation.js`, `scripts/interaction.js`, optional `scripts/graph-support.js` + `scripts/mindmap.js` + `scripts/flow-graph.js`, then `scripts/feedback.js`) are inlined into the final artifact so it stays a single offline file. They provide in-page interaction only; there is no server or persistent runtime.
- Mindmap and flow-graph canvases get a zoom toolbar (zoom in/out, actual size, fit width) from `scripts/graph-support.js`; the default is fit-width, which only scales down, never up.
- Fixed component labels (Before/After, Details, Decision, Trade-offs, Alternatives, Mitigation) carry `data-i18n` attributes and are localized at runtime from `<html lang>`; agent-generated text must be written directly in the configured `artifact_language`.

## Semantic Traceability

- Every feedback-attachable element MUST carry `data-semantic-node-id` resolving to a node in `plan-semantic-context`.
- Component roots SHOULD carry `data-component`.
- Each rendered view MUST be registered in `plan-presentation-model` with the node ids it represents.
- Mindmap and flow-graph nodes participate in feedback: clicking a rendered graph node selects the referenced semantic node even if it has no other rendered section.
