# Plan

## Building the Plan

- This applies to the sessions when Claude Code is in _Plan Mode_
- Always output the plan to a markdown file under `.claude/plans`
- Break plans up into slices
- Break slices up into individual phases
    - Provide lists of unit and integration test cases at the end of each phase
    - Group by module
- Phase numbering should be continuous (see example below)
- Launch a (Sonnet 4.6) sub-agent to review the plan. This sub-agent should:
    - Raise any ordering issues (example: changing the values for db records on new fields in a step before the step that implements the new field)
    - Find any contradictory issues

Here's a skeleton example of how to organize a plan:

```markdown
## Slice 1: <NAME>

### Phase 1: <NAME>

### Phase 2: <NAME>

## Slice 2: <NAME>

### Phase 3: <NAME>

### Phase 4: <NAME>

## Slice 3: <NAME>

### Phase 5: <NAME>

### Phase 6: <NAME>
```

## Executing the Plan

- Implement a single phase at a time, and then stop, unless explicitly told otherwise. The user will tell you when to proceed.
- Run standard verification steps after each phase
- Add any tests for that phase after implementation, but before verification
- Run the `/kbase` skill once the plan is complete
