---
name: plan-html-visualizer
description: >-
  Use when presenting or revising a complex implementation plan, architecture or design
  proposal, refactoring strategy, migration plan, or multi-step code change analysis as an
  interactive HTML artifact. Also use when the user requests changes based on a previously
  generated HTML coding plan artifact, such as modifying sections, updating diagrams,
  changing comparisons, or adjusting implementation phases. Prefer this skill when the plan
  benefits from navigation, diagrams, timelines, comparisons, or impact maps rather than
  plain chat or Markdown.
---

## Purpose

Present complex coding plans as temporary, interactive, self-contained HTML artifacts that are easier to understand, inspect, and comment on than long chat or Markdown output.

The keywords **MUST**, **MUST NOT**, **SHOULD**, and **MAY** in this document express requirement strength.

This skill:

- structures and visualizes an existing plan (navigation, diagrams, timelines, progressive disclosure)
- embeds enough context in the artifact to interpret later user feedback

The coding agent remains responsible for engineering reasoning, plan quality, and implementation decisions.

---

## Boundaries

This skill does not:

- create the engineering solution or make technical decisions
- replace planning or execute code changes
- turn the HTML file into the source of truth

Do not use this skill when:

- The content is short and can be clearly explained in chat.
- Plain Markdown is sufficient.
- The output is a simple code explanation or a small change summary.
- The content is internal reasoning, logs, tool output, or temporary agent state.
- The user only needs code, not a readable plan artifact.

---

## Inputs

- The coding plan to present (required). Sources include:
  - the current conversation or a host plan-mode artifact
  - a `plan-maker` roadmap under `dev-docs/active/<task>/roadmap.md`
  - any existing plan document the user points to
- For revisions: the previously generated artifact under `.ai/.tmp/html-viewer/`.

## Outputs

- A single self-contained interactive HTML artifact under `.ai/.tmp/html-viewer/`.
- On feedback consumption: updated structured plan information and a regenerated artifact at the same path.

---

## Output Location

Write HTML artifacts to `<repo-root>/.ai/.tmp/html-viewer/` (path relative to the **project root**). Name the file according to the task.

Temporary agent workspace only — not project source or durable documentation unless the user asks to promote or copy files elsewhere.

---

## Configuration

```yaml
# Display language of generated artifacts. Supported: zh-CN | en.
# Edit this value to switch the language.
artifact_language: zh-CN
```

The configured language applies to the whole artifact:

- The agent MUST set `<html lang>` to this value when rendering.
- Fixed UI chrome (navigation, feedback panel, component labels) is localized at runtime by `scripts/i18n.js` based on `<html lang>`; no per-string work needed.
- Generated content (titles, summaries, details) MUST be written in this language, unless the user explicitly requests otherwise.

---

## Roles and Source of Truth

| Layer | Role |
| --- | --- |
| Structured plan information | Source of truth; all plan changes apply here |
| HTML artifact | Derived presentation and feedback surface; regenerated, never hand-edited |
| Pending feedback events | Transient user input that triggers plan updates; consumed, then cleared |

Edit loop:

1. Render structured plan information into the HTML artifact.
2. The user selects a section and enters free-form feedback; the interaction layer records it as a pending feedback event (see Feedback Channel).
3. The agent reads pending events, recovers context, and updates the structured plan information.
4. The agent regenerates the artifact at the same path and clears the consumed events.

---

## Workflow

### Phase 1: Build Structured Information

Convert the coding plan into structured engineering information. This phase answers: *what engineering information exists in the plan?*

- Extract only information that exists in the plan or the current coding context. Do not invent missing information.
- Do not rewrite, improve, or expand the plan.

Candidate semantic elements: goal, context, current state, target state, component, dependency, implementation phase, task, technical decision, risk, file impact, verification strategy, constraint.

Not every element is required. Only extract elements that materially improve understanding.

Also establish artifact metadata when available: artifact identifier, creation/update time, task title or summary, conversation or session identifier, project or repository identifier. Do not fabricate unavailable identifiers; omit them or mark them `"unknown"`.

### Phase 2: Choose Presentation

Map the structured information to presentation components. This phase answers: *how does the user understand this plan most efficiently?*

Choose components based on the structure of the information, not visual decoration. The table below is a menu of **optional** dimensions, not a checklist: most plans need only a few of them, and a dimension absent from the plan is simply skipped.

| Component | Use for | Resource |
| --- | --- | --- |
| Mindmap overview | plan structure at a glance; auto-rendered from the semantic context model | `components/mindmap.html` + `scripts/mindmap.js` |
| Summary | goals, scope, key changes, constraints, major risks | `components/summary-card.html` |
| Timeline | strictly ordered phases, migration sequences, dependent steps | `components/timeline.html` |
| Flow graph | branching / conditional workflows with decision points | `components/flow-graph.html` + `scripts/flow-graph.js` |
| Parallel tracks | concurrent workstreams with sync points | `components/parallel-tracks.html` |
| Architecture diagram | component relationships, dependencies, data flow, boundaries | `components/architecture-graph.html` |
| Before / after comparison | refactoring, migration, behavior replacement | `components/comparison.html` |
| Decision view | technical choices, trade-offs, alternatives already in the plan | `components/decision-card.html` |
| Risk view | implementation, migration, compatibility, operational risks | `components/risk-card.html` |
| Impact map | affected files, modules, dependencies, cross-cutting changes | `components/impact-map.html` |
| Detail sections | implementation details, commands, API/DB changes, validation steps | inline, collapsed by default |

Selection heuristics and anti-patterns: see `reference/component-guide.md`.

The specification MUST preserve the mapping between presentation elements and the underlying semantic plan concepts.

#### Focus budget (MUST)

Not every dimension deserves screen space. Select ruthlessly:

- The artifact starts with an **overview band**: the mindmap (auto-rendered from the semantic context model, `span-two-thirds`) plus a compact summary card (`span-third`). Always present.
- Beyond the overview band, mark **at most 2** views as `priority: "primary"` — the dimensions that carry the core of this specific plan (for example: timeline + risks for a migration; comparison + impact for a refactor).
- All other views are `priority: "secondary"`: rendered collapsed by default (the interaction layer handles collapsing).
- Omit dimensions with no substance. Never pad with a component just because it exists.

#### Layout (SHOULD)

Each view declares a `span` recorded in the presentation model and mirrored as a class on the section element: `span-full` (default), `span-two-thirds`, `span-half`, `span-third`. Compact views (risk cards, decision cards, comparisons, parallel tracks) SHOULD share rows instead of each occupying a full-width band.

### Phase 3: Render the Artifact

Render a single self-contained HTML file from the structured information and presentation specification.

- The file MUST embed everything: rendered presentation, embedded models (below), styling, and interaction scripts. No companion files.
- The file MUST open offline; do not depend on external network resources (CDN scripts, fonts, remote images).
- Inline scripts MUST be classic scripts (no `import`/`export` module syntax); inline `scripts/i18n.js` before the other scripts.
- Set `<html lang>` and write all content in the configured `artifact_language` (see Configuration).
- Use the skill's templates, components, and scripts when available. If they are not available in the current environment, still produce a self-contained artifact that satisfies the requirements below.

---

## Generation Rules

**Preserve engineering intent (MUST).** The artifact must faithfully represent the plan. Do not introduce new technical decisions, change the implementation strategy, add unsupported assumptions, expand scope, or silently resolve open questions.

**Separate content from presentation (MUST).** Do not create relationships, dependencies, decisions, risks, or constraints only because they would look good in a diagram, card, or timeline. Visual structure reflects the plan; it does not invent the plan.

**Optimize for understanding (SHOULD).** Prefer clear hierarchy, concise summaries, progressive disclosure, visual grouping, and important information first. Do not move the entire plan into HTML without restructuring it. The default view emphasizes what is changing, why it matters, the major approach, important risks, and affected areas; details live in collapsed sections.

**Prefer component-based rendering (SHOULD).** When templates and components are available, use them instead of inventing arbitrary HTML structures. The agent supplies structured content, presentation intent, and semantic context; the template layer owns layout, assembly, styling, and interaction behavior.

**Provide navigation (SHOULD).** Long plans need section navigation, anchors, and a clear heading hierarchy so users can reach major sections without scrolling through the entire document.

---

## Embedded Models

The artifact embeds four JSON blocks. Schemas, field rules, and DOM attribute conventions: `reference/artifact-format.md`.

| Block id | Purpose |
| --- | --- |
| `plan-artifact-metadata` | Task/session identification for agent recovery and disambiguation |
| `plan-semantic-context` | Minimum semantic plan nodes (stable ids) needed to recover context from feedback |
| `plan-presentation-model` | Which views were generated, which nodes they represent, what is collapsed |
| `plan-pending-feedback` | Pending feedback events; empty when generated, cleared after consumption |

**Semantic traceability (MUST).** Rendered content must remain traceable to the underlying plan concepts: any element the user can reference for feedback must resolve to a node in the semantic context model. The concrete mechanism (data attributes, anchor ids) is defined in `reference/artifact-format.md`.

---

## Feedback Channel

The artifact is a **read-only presentation with a single feedback entry point**.

- Users give feedback by selecting a section and entering free-form text in the built-in feedback UI. The interaction layer records it as a pending feedback event in the `plan-pending-feedback` block — the only part of the file that may change after generation.
- How the event is saved back into the file (File System Access API, with download-replace and copy-to-chat fallbacks): see `reference/feedback-protocol.md`.
- Users MUST NOT hand-edit rendered content or the other embedded blocks. The agent MUST NOT interpret hand-edited content as plan changes; treat such files as untrusted presentation state and recover from the embedded models or the current conversation.
- Users never classify feedback (question, correction, change request, concern, constraint) and never write structured data by hand. Interpreting intent is the agent's responsibility.

A pending feedback event:

```json
{
  "nodeId": "phase-2-db-migration",
  "feedback": "Run this after the canary release instead.",
  "selectedText": "Migrate the user table",
  "viewId": "view-timeline",
  "createdAt": "2026-07-07T17:20:00+08:00"
}
```

Feedback events are **transient**: they exist only between the moment the user records them and the moment the agent consumes them. The artifact does not keep a feedback history.

---

## Feedback Recovery and Update Flow

When the user references a plan artifact or asks for changes based on one:

1. Read the artifact file from the output directory.
2. Parse the embedded models (metadata, semantic context, presentation model, pending feedback).
3. Map each pending feedback event to a semantic node: use `nodeId` when present, otherwise match `selectedText` or `viewId` against the presentation model.
4. If an event cannot be mapped to a node, ask the user for clarification instead of guessing.
5. Interpret the feedback within the recovered context and update the structured plan information.
6. Regenerate the artifact at the same path:
   - rewrite the whole file, keeping identifiers and content of unaffected nodes stable
   - bump `updatedAt` and `version` in the metadata
   - clear the consumed feedback events (`plan-pending-feedback` returns to empty)

**Scope (MUST).** Apply feedback to the referenced semantic node and directly affected related nodes (for example: a migration phase plus its related tasks, risks, validation steps, and affected diagrams). Do not rewrite unrelated sections unless the feedback changes the overall plan structure.

---

## Verification

Before delivering or regenerating an artifact, verify:

- [ ] Single HTML file that opens offline; no external network dependencies.
- [ ] All four embedded JSON blocks parse; `plan-pending-feedback` is empty after (re)generation.
- [ ] Every element the user can reference for feedback resolves to a node in the semantic context model.
- [ ] Every view in the presentation model references existing node identifiers.
- [ ] Navigation anchors resolve; collapsed detail sections expand.
- [ ] Overview band (mindmap + summary) present; at most 2 additional primary views; secondary sections are collapsed by default.
- [ ] Content is faithful to the plan: no invented decisions, scope, or resolved open questions.

---

## Included assets

- `templates/base.html` — page shell with the four embedded JSON blocks and the layout grid.
- `components/` — reusable presentation components (see Phase 2 table).
- `scripts/i18n.js` — UI chrome localization (zh-CN / en); inline first.
- `scripts/navigation.js` — navigation behavior.
- `scripts/interaction.js` — selection and secondary-section collapsing.
- `scripts/graph-support.js` — shared zoom toolbar and jump-to-node helpers; inline before mindmap/flow-graph scripts when either is used.
- `scripts/mindmap.js` — renders the overview mindmap from the semantic context model; inline when a mindmap view is used.
- `scripts/flow-graph.js` — renders flow graphs from embedded flow specs; inline when a flow-graph view is used.
- `scripts/feedback.js` — recording and persisting pending feedback events.
- `reference/artifact-format.md` — embedded model schemas and attribute conventions.
- `reference/component-guide.md` — component selection guidance.
- `reference/feedback-protocol.md` — feedback event lifecycle, persistence, and recovery details.

Read reference files only when needed. Do not load implementation resources unnecessarily.
