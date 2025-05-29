# Agents and Project Memory

This file is used to store the project memory for all agents. It should contain key
information and context that agents need to assist with development, debugging,
and decision making.

## How to Use

1. **Project Context**: Brief overview of the project's purpose, architecture, and
   main components.
2. **Design Decisions**: Document major design or implementation decisions, along
   with their rationale and any trade-offs considered.
3. **Open Tasks and Issues**: List outstanding tasks, bugs, or technical debt that
   agents should be aware of.
4. **References**: Include links to relevant documentation, tickets, or external
   resources.
5. **Update Regularly**: Whenever the project context changes or new decisions are
   made, update this file to keep the memory current.
6. **Commit Suggestions**: After each user instruction, include a suggested `git add . && git commit --all -m 'message'`
   command with a concise commit message to record the change. Always use this full command form when suggesting how to commit.

## Sections

- **Project Overview**: High-level description of the project.
- **Architecture Diagram**: (optional) ASCII diagram or linked image.
- **Key Dependencies**: Major libraries, frameworks, and tools.
- **Design Decisions**: Decisions, rationale, and alternatives.
- **Open Tasks and Issues**: Outstanding work items.
- **References**: Links to specs, design docs, tickets, or external resources.

By centralizing the project memory in this file, all agents and collaborators will have
a single source of truth for important project information.
