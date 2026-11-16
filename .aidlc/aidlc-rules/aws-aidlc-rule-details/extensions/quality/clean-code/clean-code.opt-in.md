# Clean Code — Opt-In

**Extension**: Clean Code (Shell Console)

## Opt-In Prompt

The following question is automatically included in the Requirements Analysis clarifying questions when this extension is loaded:

```markdown
## Question: Clean Code Extension
Should the clean-code rules (one definition per closed list, capability-driven provider logic, no nested if, words and colours
from their catalogues, every setting documented and tagged, PostgreSQL only with tests on their own database) be enforced as
blocking constraints?

A) Yes — enforce all CLEAN rules as blocking constraints (recommended: the repository's guards already fail on most of them)

B) No — treat them as guidance only

X) Other (please describe after [Answer]: tag below)

[Answer]: 
```
