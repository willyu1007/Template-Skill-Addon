# Artifact Format

Schemas and conventions for the JSON models embedded in plan HTML artifacts.

The keywords **MUST**, **SHOULD**, and **MAY** express requirement strength.

## Embedded Blocks

Every artifact embeds four JSON blocks as `<script type="application/json">` elements with fixed ids:

| Block id | Content | Required |
| --- | --- | --- |
| `plan-artifact-metadata` | Task/session identification | MUST |
| `plan-semantic-context` | Semantic plan nodes | MUST |
| `plan-presentation-model` | Views rendered for the user | MUST |
| `plan-pending-feedback` | Pending feedback events | MUST (empty after generation) |

All blocks MUST parse as standalone JSON. Do not embed comments or trailing commas.

Only `plan-pending-feedback` may change after generation, and only through the feedback UI. All other content is read-only presentation state.

## `plan-artifact-metadata`

```json
{
  "artifactId": "auth-refactor-plan",
  "createdAt": "2026-07-07T16:00:00+08:00",
  "updatedAt": "2026-07-07T16:00:00+08:00",
  "taskTitle": "Auth module refactor",
  "taskSummary": "Replace session auth with JWT and migrate the user table",
  "sessionId": "unknown",
  "repository": "Skill_Template_Addon",
  "version": 1
}
```

Field rules:

- `artifactId` (MUST): stable across regenerations of the same plan; kebab-case, derived from the task.
- `createdAt` / `updatedAt` (MUST): ISO 8601. `createdAt` never changes; `updatedAt` and `version` are bumped on every regeneration.
- `taskTitle` (MUST), `taskSummary` (SHOULD).
- `sessionId`, `repository` (MAY): omit or use `"unknown"` when unavailable. Never fabricate identifiers.
- `version` (MUST): integer starting at 1.

## `plan-semantic-context`

The minimum structured information needed to recover context from feedback — not the full plan.

```json
{
  "nodes": [
    {
      "id": "phase-2-db-migration",
      "type": "phase",
      "title": "Database migration",
      "summary": "Migrate the user table to the new schema",
      "parent": "goal-auth-refactor",
      "related": ["risk-downtime", "task-write-migration-script"],
      "files": ["db/schema.prisma"]
    }
  ]
}
```

Field rules:

- `id` (MUST): unique, stable, kebab-case. Regeneration MUST keep ids of unaffected nodes unchanged.
- `type` (MUST): one of `goal`, `context`, `current-state`, `target-state`, `component`, `dependency`, `phase`, `task`, `decision`, `risk`, `file-impact`, `verification`, `constraint`.
- `title` (MUST), `summary` (MUST): concise.
- `parent` (SHOULD when a natural grouping exists), `related` (MAY), `files` (MAY): reference other node ids or repository paths.

## `plan-presentation-model`

Records what the user saw.

```json
{
  "views": [
    {
      "viewId": "view-timeline",
      "component": "timeline",
      "nodes": ["phase-1-prep", "phase-2-db-migration"],
      "priority": "primary",
      "span": "full"
    }
  ]
}
```

Field rules:

- `viewId` (MUST): unique per artifact.
- `component` (MUST): component name (`mindmap`, `summary-card`, `timeline`, `flow-graph`, `parallel-tracks`, `architecture-graph`, `comparison`, `decision-card`, `risk-card`, `impact-map`, `detail-section`).
- `nodes` (MUST): semantic node ids represented by the view; each MUST exist in `plan-semantic-context`.
- `priority` (MUST): `primary` or `secondary`. Overview band views (mindmap, summary) plus at most 2 more are `primary`; everything else is `secondary` and renders collapsed by default.
- `span` (MAY, default `full`): `full`, `two-thirds`, `half`, or `third`. Mirrored as a `span-*` class on the section element.

All views support feedback attachment by default; there is no per-view opt-out field.

### Flow spec (flow-graph views only)

A `flow-graph` section embeds its graph as a JSON block inside the section:

```html
<script type="application/json" class="flow-spec">
{
  "nodes": [
    { "id": "f-start", "label": "Start cutover", "type": "start" },
    { "id": "f-check", "label": "Metrics healthy?", "type": "decision", "nodeRef": "phase-3-cutover" },
    { "id": "f-done", "label": "Done", "type": "end" }
  ],
  "edges": [
    { "from": "f-start", "to": "f-check" },
    { "from": "f-check", "to": "f-done", "label": "yes" }
  ]
}
</script>
```

- `type` is one of `start`, `step`, `decision`, `end`.
- `nodeRef` (MAY) links a flow node to a semantic context node; clicking it jumps to and selects that node.
- The graph MUST be acyclic; express loops as a terminal step with explanatory text.
- `scripts/flow-graph.js` renders the spec into the section's `.flow-canvas`.

## `plan-pending-feedback`

Pending feedback events awaiting consumption by the agent. This is a transient queue, not a feedback history.

```json
{
  "entries": [
    {
      "nodeId": "phase-2-db-migration",
      "feedback": "Run this after the canary release instead.",
      "selectedText": "Migrate the user table",
      "viewId": "view-timeline",
      "createdAt": "2026-07-07T17:20:00+08:00"
    }
  ]
}
```

Field rules:

- `entries` (MUST): empty array in freshly generated or regenerated artifacts.
- `nodeId` (MUST), `feedback` (MUST): free-form user text, never classified by the interaction layer.
- `selectedText`, `viewId`, `createdAt` (MAY): aid disambiguation.

Lifecycle: recorded by the feedback UI → consumed by the agent → cleared on regeneration. Consumed events are not retained anywhere in the artifact.

## Element Attributes

- Every feedback-attachable element MUST carry `data-semantic-node-id="<node-id>"` resolving to a node in `plan-semantic-context`.
- Component root elements SHOULD carry `data-component="<component-name>"`.
- Section elements MUST carry `data-priority` matching the view's `priority`, and a `span-*` class matching its `span` (omit for `full`).
- Anchor ids used for navigation SHOULD match view or node ids.

## Stability Rules

- Node ids, view ids, and `artifactId` are contracts between regenerations: keep them stable for unaffected content.
- Regeneration rewrites the whole file; stability applies to identifiers and unaffected content, not to bytes.
