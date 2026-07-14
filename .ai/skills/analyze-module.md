# Skill: Analyze Module

## Purpose

Understand a module completely before making any implementation changes.

This skill is responsible for analyzing a software module and producing a technical assessment.

It must never modify code.

---

# When to use

Use this skill whenever:

- A new feature will be implemented.
- A bug must be fixed.
- A refactor is being considered.
- An architectural review is requested.
- The module is unfamiliar.

This skill is the default entry point before changing production code.

---

# Inputs

The user should provide at least one of the following:

- Module name
- Folder
- File
- Service
- Controller
- Feature

Examples:

- Analyze the Payment module.
- Analyze PaymentService.
- Analyze src/payment.
- Analyze the Outbox implementation.

---

# Required Context

Before starting, read:

- AGENTS.md
- docs/mentor-context.md
- docs/architecture.md
- docs/decisions.md
- docs/engineering-principles.md

If any required document is missing, explicitly mention it.

---

# Responsibilities

This skill must:

1. Explain the purpose of the module.

2. Identify its responsibilities.

3. Identify its dependencies.

4. Describe how it fits into the architecture.

5. Detect possible violations of engineering principles.

6. Identify coupling.

7. Identify cohesion.

8. Review existing tests.

9. Detect the single highest-value missing test.

10. Explain technical risks.

11. Recommend the next engineering step.

---

# Output Format

## 1. Summary

A concise explanation of the module's purpose.

---

## 2. Responsibilities

List the module responsibilities.

---

## 3. Dependencies

List internal and external dependencies.

Indicate whether each dependency is appropriate.

---

## 4. Architectural Role

Explain where this module belongs in the overall architecture.

---

## 5. Engineering Review

Evaluate:

- Single Responsibility
- Dependency Inversion
- Separation of Concerns
- Cohesion
- Coupling
- Simplicity

---

## 6. Existing Tests

Describe:

- Unit tests
- Integration tests
- E2E tests

Highlight important gaps.

---

## 7. Highest-Value Missing Test

Recommend exactly ONE new test.

Explain why it has the highest engineering value.

Do not recommend multiple tests.

---

## 8. Risks

List technical risks ordered by impact.

Examples:

- Data consistency
- Duplicate processing
- Tight coupling
- Hidden side effects
- Poor observability

---

## 9. Recommendation

Recommend only the next engineering action.

Do not propose a long roadmap.

---

# Constraints

Never modify files.

Never generate production code.

Never refactor automatically.

Never generate multiple implementation alternatives.

Focus on understanding before implementation.

Always explain WHY before HOW.

Avoid unnecessary complexity.

Prefer production-quality engineering practices.

Challenge design decisions respectfully.

Teach instead of only answering.
