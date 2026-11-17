---
name: set-bun
description: Pins every bun version reference in a repo to one exact version (mise or asdf config, `@types/bun`, `packageManager`, `oven/bun` image tags, `setup-bun` CI inputs), regenerates lockfiles, and verifies. Mechanical work runs in bundled scripts. Takes a single `$version` argument in exact `X.Y.Z` form.
arguments: [version]
argument-hint: "[X.Y.Z]"
allowed-tools:
  - Bash(${CLAUDE_SKILL_DIR}/scripts/*)
  - Edit(**/*.md)
  - Bash(grep *)
  - Bash(docker *)
  - Bash(git diff *)
  - Bash(git status *)
  - Bash(bun run *)
  - Bash(mise *)
---

# Bun Version Pinner

You are a release engineer. The repo must name one exact bun build everywhere it names bun, because bun ships behavioral changes in patch releases. Move every pin together, or move none and say why.

The scripts in `${CLAUDE_SKILL_DIR}/scripts/` do the mechanical work. Run them instead of redoing it by hand, and spend your effort on the `LEFT` and `STALE` lines they hand back. They are POSIX `sh`, locate the repo root themselves, and only touch pin sites that exist. To reuse this skill elsewhere, copy the whole folder.

Output is one finding per line: `OK`, `FAIL`, `SKIP`, `EDIT`, `LEFT` (found, deliberately not rewritten), `STALE` (does not name the target version), `SAME`/`MOVED` (a lockfile), `REJECT`/`ABORT` (hard stop, nothing modified).

## Steps

1. **Validate:** `${CLAUDE_SKILL_DIR}/scripts/validate.sh "$version"`. On `REJECT`, name the broken rule and stop. Never retry with a corrected value. If no argument was given, ask for one.

2. **Discover:** `${CLAUDE_SKILL_DIR}/scripts/discover.sh`. If it finds no pin sites, say so and stop.

3. **Apply:** `${CLAUDE_SKILL_DIR}/scripts/apply.sh "$version"` (`--dry-run` previews). It runs the registry probes first; on `ABORT`, report which probe failed and stop, without substituting a nearby version. It never adds `@types/bun`, `packageManager` or `engines` where absent, since a package may omit them on purpose. Each `LEFT` line is the user's call, and goes in the final report:
  - **Digest-pinned image** (`@sha256:`): never edit the tag alone, since the digest still wins.
  - **Image tag from a variable** (`${BUN_VERSION}`): the real pin is the `ARG` or `ENV` default. Offer to change it, but confirm first.
  - **Untagged image** (`FROM oven/bun`) or **floating CI version** (`latest`, a range, an expression): a human decides whether to make it exact.
  - **Unrecognized format**: show the line and ask.

4. **Install:** `${CLAUDE_SKILL_DIR}/scripts/install.sh "$version"`. On `FAIL`, show the output verbatim and stop. A wrong resolved version usually means a stray `bun` ahead of the version manager on `PATH`. Never run `bun upgrade`. Lockfiles of edited manifests should show `MOVED`; report any other `MOVED` as unexpected.

5. **Docs (no script):** find candidates with `grep -rnE 'oven/bun|@types/bun|bun@|^bun ' --include='*.md' --exclude-dir=node_modules .` (never a bare `bun`, which matches `ubuntu-latest`). Rewrite a literal only where it states the current pin. Leave historical notes such as "verified on 1.3.13" alone, since changing them asserts a test that never ran, and report them.

6. **Verify:** `${CLAUDE_SKILL_DIR}/scripts/verify.sh "$version"`. `STALE` lines for pins already reported as `LEFT` are expected; anything else is a real problem. Then, which the scripts do not do:
  - Build each edited Dockerfile with `docker build -f <Dockerfile> <context>`, using the compose `build.context` if one builds it, else the Dockerfile's directory. If the context is unclear or Docker is unavailable, report it as unverified.
  - Run the project's documented verification. If none, run the root `package.json` scripts that exist among `typecheck`, `lint` and `test` with `bun run`. A passing `typecheck` proves `@types/bun` still resolves.

7. **Report:** a table of every file changed, then a separate list of everything left alone (the `LEFT` items, historical doc lines, absent pin sites, unverified steps). Report failures verbatim, never as success.
