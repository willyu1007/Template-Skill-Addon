# Feedback Protocol

How user feedback on a plan HTML artifact reaches the coding agent and becomes plan updates.

The artifact is a read-only presentation with a single feedback entry point. Users only ever write natural language; the agent is responsible for locating context and interpreting intent. See `artifact-format.md` for the embedded model schemas.

## Feedback Event

The built-in feedback UI (`scripts/feedback.js`) lets the user:

1. Select a section of the artifact.
2. Enter free-form text.

The interaction layer records this as a pending feedback event in the `plan-pending-feedback` block — the only part of the file that may change after generation.

Rules:

- Events MUST include `nodeId` and `feedback`; `selectedText`, `viewId`, and `createdAt` MAY be included.
- The interaction layer MUST NOT classify or interpret feedback; it only records where it was given.
- The interaction layer MUST NOT allow editing rendered content or the other embedded blocks.

## Event Persistence

A static HTML page cannot silently write to its own file. The feedback UI persists events through the first available mechanism:

1. **File System Access API (preferred).** On first save, ask the user to grant access to the artifact file, then write the updated `plan-pending-feedback` block back to the same path. Works in Chromium-based browsers.
2. **Download-replace (fallback).** Offer the updated file as a download with the same filename; the user replaces the artifact in `.ai/.tmp/html-viewer/`.
3. **Copy-to-chat (last resort).** Offer a "copy feedback" action that copies the pending event JSON; the user pastes it into the conversation.

Whichever mechanism is used, the agent-facing contract is the same: pending events arrive either inside the artifact's `plan-pending-feedback` block or as pasted JSON in the conversation.

## Lifecycle

```text
user records event → agent consumes event → plan updated → artifact regenerated → event cleared
```

Feedback events are transient. The artifact keeps no feedback history; consumed events are removed when the artifact is regenerated.

## Context Recovery

The agent MUST NOT rely on the event text alone. For each pending event:

1. Locate the artifact file in the output directory.
2. Parse the embedded metadata, semantic context model, and presentation model.
3. Resolve the target semantic node, in order:
   - `nodeId`, when present and valid
   - `selectedText` or `viewId` matched against the presentation model
4. Recover surrounding plan context from the node's `parent`, `related`, and `files` references.
5. Interpret the user's intent within that context.
6. Update the structured plan information (scope: the referenced node and directly affected related nodes).

If no node resolves, ask the user for clarification. Do not guess.

## What Users Never Need To Do

- Classify feedback (question, correction, change request, concern, constraint).
- Write structured JSON by hand.
- Name sections or node identifiers precisely.

Example: a user attaches "This still needs to support legacy clients." to a migration phase. The agent resolves the phase node, recovers related tasks and risks, and decides what the constraint means for the plan.

## Manual Edits

Hand-edited rendered content is untrusted presentation state, never a plan change:

- Do not diff visible content to discover feedback.
- Do not treat edited text as authoritative plan updates.
- Recover from the embedded models or the current conversation, and regeneration resets any manual edits to the authoritative form.

## Failure Handling

- Unmappable event: ask the user; never silently drop or guess.
- Corrupted or unparseable embedded JSON: treat the file as untrusted presentation state; recover from the current conversation and regenerate.
- Conflicting events: surface the conflict to the user instead of picking a side.
