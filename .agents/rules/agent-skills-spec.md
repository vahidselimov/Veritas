# Official Agent Skills Specification & Guidelines

This project conforms to the official Agent Skills open standard (`https://github.com/agentskills/agentskills`).

## Structure of a Skill

A valid Agent Skill directory follows this structure:

```
my-skill/
├── SKILL.md          # Required: YAML frontmatter + clear markdown instructions
├── scripts/          # Optional: executable scripts (Node, Python, Bash)
├── references/       # Optional: deep documentation, cheatsheets, domain manuals
└── assets/           # Optional: templates, icons, presets, static files
```

## Frontmatter Requirements

Every `SKILL.md` must start with valid YAML frontmatter:
- `name`: Lowercase slug matching the directory name (`a-z`, `0-9`, `-`).
- `description`: 1-3 sentences stating what the skill does and **when it should be activated**.

## Progressive Disclosure

1. **Discovery**: Harness loads only `name` and `description` to conserve context window.
2. **Activation**: Full `SKILL.md` loads only when the task calls for this skill.
3. **Execution**: Detailed reference files and scripts are read/executed only as needed.
