# MicroSure AI: Branching Strategy & Workflow

To ensure the `main` branch is always stable, every team member must follow this workflow.

## 1. The Golden Rule
> **Never push directly to `main`.**
> All code must enter `main` through a Pull Request (PR) approved by at least one teammate.

## 2. Naming Convention
| Prefix | Purpose | Example |
| :--- | :--- | :--- |
| `feat/` | New features/AI models | `feat/ocr-paddle-integration` |
| `fix/` | Bug fixes | `fix/api-timeout-error` |
| `docs/` | Documentation changes | `docs/update-readme` |
| `refactor/` | Code cleanup | `refactor/db-schema` |

## 3. The PR Workflow
1. **Sync:** `git checkout main` -> `git pull origin main`.
2. **Branch:** `git checkout -b feat/your-feature`.
3. **Commit:** Use clear messages like `feat: add ocr extraction logic`.
4. **Push:** `git push origin feat/your-feature`.
5. **PR:** Open a Pull Request on GitHub. Assign a reviewer.
6. **Merge:** Once approved and CI passes, use **Squash and Merge**.

## 4. Code Review Checklist
- Does the code build without errors?
- Are there comments for complex AI logic?
- Does it follow the established folder structure?
