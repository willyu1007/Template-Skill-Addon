# Documentation Guidelines (LLM-first)

## 1. Purpose and scope
These guidelines target repository documentation that is **maintained for both LLMs and human collaborators**, with the goals of:
- **Semantic precision**: minimize ambiguity and "guesswork".
- **Balanced information density**: surface key decisions quickly; details are available on demand.
- **Token efficiency**: avoid non-essential verbosity so the model can act reliably within limited context.

Applies to (non-exhaustive):
- Entry & rules: `README.md`, `AGENTS.md`, `CLAUDE.md`
- Standards & design: specs, ADRs, design notes under `docs/`
- SSOT content: `.ai/skills/`
- Bootstrap materials: docs and artifacts under `construction/` (or `init/`)

## 2. Core principles (write for LLMs)
### 2.1 Information structure
- **Conclusion first**: start each section with decisions/constraints, then explain rationale/details.
- **One paragraph, one intent**: do not mix multiple topics in the same paragraph.
- **Verifiable**: key claims must include "how to verify" (commands, paths, checkpoints).
- **Progressive disclosure**: keep the top doc to "overview + navigation"; move deep detail to supporting files (`reference.md`, `examples.md`, `scripts/`, `templates/`, `appendix/`).

### 2.2 Semantic precision
- Use **MUST/SHOULD/MAY** to express requirement strength.
- Avoid vague references ("it/this/above/related"); use explicit nouns and paths instead.
- Define terms on first use (e.g., SSOT, skill stub).
- Make assumptions explicit (OS differences, relative vs absolute paths, workspace roots).

### 2.3 Token efficiency
- Prefer bullet lists over long paragraphs.
- Do not paste large code blocks/logs into docs; reference paths and include only minimal excerpts.
- Avoid repeating background across documents; use links + 1-line summaries.
- Keep examples minimal; move complex examples to an appendix.

## 3. Recommended templates
> Consistent structure significantly reduces LLM misinterpretation.

### 3.1 Standards/spec docs (like this file)
1. Purpose & scope
2. Core principles
3. Rules (MUST/SHOULD/MAY)
4. Exceptions & boundaries
5. Verification (how to check compliance)
6. Change log (optional)

### 3.2 Task/implementation docs (when you want the LLM to do work)
1. Background (<= 5 lines)
2. Goals (verifiable)
3. Scope (IN/OUT)
4. Constraints (MUST / DON'T)
5. Steps (executable)
6. Verification (commands/checkpoints)
7. Risks & rollback (if generating/overwriting)

### 3.3 Skill / Command docs (SSOT)
For `.ai/skills/` content, use:
- **Purpose (1-2 sentences)**: what problem it solves
- **Trigger / usage**: when to use; required inputs; expected outputs
- **Steps**: bullet list; minimal examples only
- **Notes**: boundaries, forbidden actions, failure handling
- **References**: optional (file paths / external links)

## 4. Readability and maintainability rules (MUST)
- Keep heading depth <= 4 levels (`#` to `####`).
- Wrap all paths/commands/identifiers in backticks (e.g., `.ai/skills/`, `.ai/scripts/sync-skills.js`).
- Any action that generates/overwrites files MUST specify:
  - blast radius (which directories/files are written)
  - idempotency (whether repeated runs are safe)
  - rollback plan (if available)

## 5. Prompt-oriented writing (recommended)
When a doc is meant to guide an LLM, write the "inputs/outputs/invariants" like an interface:
- **Inputs**: required fields (e.g., project profile, target directory)
- **Outputs**: which files/directories are generated
- **Invariants**: rules that must not be violated (e.g., SSOT must not fork; artifact naming is fixed)

Include a minimal prompt template at the end:
```
Goal:
Constraints (MUST / DON'T):
Relevant paths:
Acceptance criteria:
```

## 6. Self-review checklist
- Can the key decisions be extracted within 30 seconds?
- Are there any terms/references that require guessing?
- Are MUST/SHOULD/MAY used correctly (no "nice-to-have" phrased as MUST)?
- Is verification included?
- Can any redundant background be removed or replaced by a link + 1-line summary?
