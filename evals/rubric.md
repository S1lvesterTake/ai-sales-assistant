# Agentic Session Evaluation Rubric

Fill this out after every agentic session with Claude Code. Scale: 1–5.
Save a copy per session as `evals/session-YYYY-MM-DD-[feature].md`.

---

## 7 Evaluation Dimensions

### 1. Intent Satisfaction — _Did Claude produce what was meant, not just what was said?_

| Score | Criteria |
|---|---|
| 5 | Output is exactly what was needed, including edge cases not explicitly mentioned |
| 4 | Output matches intent; one or two small details needed manual correction |
| 3 | Output matched the literal words of the prompt but missed implicit intent |
| 2 | Partial output — some parts correct, others missed the mark |
| 1 | Output did not match intent at all; had to redo from scratch |

**Target: ≥ 4**

---

### 2. Functional Correctness — _Does the code run and do all tests pass?_

| Score | Criteria |
|---|---|
| 5 | Code compiles, all tests pass, no runtime errors |
| 4 | Code compiles, ≥ 90% of tests pass, minor errors that are easy to fix |
| 3 | Code compiles but has test failures that required debugging |
| 2 | Code has compile errors or significant test failures |
| 1 | Code cannot be run at all |

**Target: 5 (binary pass/fail)**

---

### 3. Security Correctness — _No missing auth, no frontend trust, no exposed secrets?_

| Score | Criteria |
|---|---|
| 5 | All security checks pass: ownership scoped, guard in place, no exposed internals, no raw secrets |
| 4 | One minor security issue that is not a blocker (e.g. missing `@ApiProperty` on an internal DTO field) |
| 3 | One security warning that needs fixing before production |
| 2 | One ❌ BLOCK security issue found — must fix before merge |
| 1 | Multiple ❌ BLOCK security issues — fundamental rethink required |

**Target: 5 (binary for blocking issues)**

---

### 4. Code Quality & Convention — _Does output follow project conventions in AGENTS.md?_

| Score | Criteria |
|---|---|
| 5 | Fully compliant: naming, DTO pattern, error handling, layering — no corrections needed |
| 4 | One or two minor convention deviations (easy to fix) |
| 3 | Several convention deviations that need correcting before commit |
| 2 | Many deviations — overall pattern does not follow AGENTS.md |
| 1 | Output ignores project conventions entirely |

**Target: ≥ 4**

---

### 5. Trajectory Quality — _Did Claude read relevant files before writing?_

| Score | Criteria |
|---|---|
| 5 | Claude read all relevant files (schema, existing module, AGENTS.md) before generating code |
| 4 | Claude read most relevant files; one missed but it did not cause problems |
| 3 | Claude started writing without sufficient exploration — some assumptions were wrong |
| 2 | Claude made many assumptions without reading; frequently got patterns wrong |
| 1 | Claude read no files; generated from scratch with no project context |

**Target: ≥ 3**

---

### 6. Efficiency — _How many corrections before the final output? (fewer = better)_

| Score | Criteria |
|---|---|
| 5 | 0–1 corrections — output was almost immediately correct |
| 4 | 2–3 corrections — small adjustments needed |
| 3 | 4–5 corrections — required several iterations |
| 2 | 6–9 corrections — many iterations, significant time lost |
| 1 | ≥ 10 corrections or abandoned and restarted |

**Actual correction count:** ___
**Target: ≤ 3 corrections (score ≥ 4)**

---

### 7. Self-Repair — _Did Claude recover well when errors occurred?_

| Score | Criteria |
|---|---|
| 5 | Claude detected the error itself, diagnosed correctly, and fixed without any help |
| 4 | Claude needed one hint but then diagnosed and fixed the issue on its own |
| 3 | Claude needed several hints to find the root cause |
| 2 | Claude got stuck; needed explicit instructions for each fix step |
| 1 | Claude could not recover — human had to fix manually |

**Target: ≥ 3**

---

## Session Scorecard Template

Copy this section into `evals/session-YYYY-MM-DD-[feature].md`:

```markdown
# Eval Session: [Feature/Task Name]
**Date:** YYYY-MM-DD
**Task:** [Describe what was asked in one sentence]
**Prompt used:** [Paste the actual prompt]

## Scores

| Dimension | Score (1–5) | Notes |
|---|---|---|
| 1. Intent Satisfaction | | |
| 2. Functional Correctness | | |
| 3. Security Correctness | | |
| 4. Code Quality & Convention | | |
| 5. Trajectory Quality | | |
| 6. Efficiency | [score] | Actual corrections: [N] |
| 7. Self-Repair | | |
| **Total** | **/35** | |

## What Worked
-

## What Caused Drift
-

## Prompt Improvements for Next Time
-

## Action Items for AGENTS.md
- [ ]
```

---

## Cross-Session Analysis (fill after 3+ sessions)

Review all scorecards and identify patterns:

```markdown
# Cross-Session Analysis — Week of [date]

## Dimensions averaging < 3 (required action items):
- Dimension [X]: avg [Y] → Root cause: [Z] → Fix in AGENTS.md: [specific change]

## Dimensions averaging ≥ 4 (keep doing this):
- Dimension [X]: avg [Y] → Pattern that worked: [Z]

## Intent Satisfaction trend:
Session 1: [score] → Session 2: [score] → Session 3: [score]
Trend: improving / stable / declining

## Efficiency trend (correction count):
Session 1: [N] → Session 2: [N] → Session 3: [N]
Trend: improving / stable / declining

## Top 3 Prompt Patterns That Worked This Week:
1.
2.
3.

## Top 3 Prompt Patterns That Caused Drift:
1.
2.
3.
```

---

## Quick Reference: Target Scores

| Dimension | Target |
|---|---|
| Intent Satisfaction | ≥ 4 |
| Functional Correctness | 5 (pass/fail) |
| Security Correctness | 5 (pass/fail) |
| Code Quality & Convention | ≥ 4 |
| Trajectory Quality | ≥ 3 |
| Efficiency | ≤ 3 corrections |
| Self-Repair | ≥ 3 |
| **Total target** | **≥ 28/35** |