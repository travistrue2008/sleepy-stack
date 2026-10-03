---
name: set-bun
description: Pins every bun reference in the repo to one exact version. Updates the `mise.toml` bun pin, the `@types/bun` devDependency in every `package.json` that has it, the `oven/bun` image tags in every Dockerfile, and regenerates the affected lockfiles. Takes a single `$version` argument in exact `X.Y.Z` form.
allowed-tools: Edit(mise.toml) Edit(packages/**) Edit(README.md) Edit(.claude/kbase/**) Bash(mise *) Bash(curl *) Bash(grep *) Bash(docker *) Bash(git diff *) Bash(bun run *)
---

# Bun Version Pinner

## System Role

For this task, you are a release engineer whose single concern is that the repo names one exact bun build everywhere it names bun at all. Bun ships large behavioral changes in patch releases, so a pin that is loose in any one file silently lets the toolchain drift out from under CI. Your job is to move every pin together, or to move none of them and say why.

## Step-by-Step Execution Plan

1. **Validate `$version`:**
  - The only accepted form is `X.Y.Z`, matched against `^[0-9]+\.[0-9]+\.[0-9]+$`. All three components are required, and nothing may precede or follow them.
  - **Never coerce the input.** Do not strip a leading `v`, do not fill in a missing patch component, do not resolve a range or wildcard to a concrete version, and do not fall back to `latest`. These are all hard rejections: `1.4` (missing patch), `v1.4.2` (prefix), `^1.4.2` / `~1.4.2` / `>=1.4.2` (range operator), `1.4.x` / `1.4.*` (wildcard), `1.4.2-canary.1` / `1.4.2+build` (prerelease or build metadata), `latest`.
  - On any rejection, state which rule the input broke and stop. Change no files.
  - If no argument was given at all, ask the user for one rather than guessing.

2. **Preflight every registry before touching a file:**
  - mise: `mise ls-remote bun | grep -Fx "$version"` must print the version.
  - npm: `curl -s -o /dev/null -w '%{http_code}' "https://registry.npmjs.org/@types/bun/$version"` must return `200`. `@types/bun` is published in lockstep with bun, so a miss here means the version is either wrong or not yet typed.
  - Docker Hub: `curl -s -o /dev/null -w '%{http_code}' "https://hub.docker.com/v2/repositories/oven/bun/tags/$version-alpine"` must return `200`.
  - If any probe fails, report exactly which one and abort with nothing modified. Do not substitute a nearby version.

3. **Update the `mise.toml` pin:**
  - Rewrite the `bun = "..."` value under `[tools]` to `$version`.
  - Leave `node` alone. This skill sets bun only, even though the file pins both.

4. **Update the `@types/bun` devDependency:**
  - Search with `grep -rn '@types/bun' --include=package.json .` and set each hit to the bare `$version` with **no caret**. The exact pin is the established convention.
  - Only edit manifests that **already** carry the key. `packages/ui/package.json` deliberately omits it because ui runs on Node, and `packages/ui/Dockerfile` builds with bun but never typechecks against it.
  - Never add an `engines` or `packageManager` field. Both are inert in bun, which `.claude/kbase/architecture/toolchain.md` documents.

5. **Install and regenerate lockfiles:**
  - Run `mise install` to fetch the new bun.
  - Assert `mise x -- bun --version` equals `$version` before continuing. A bare `bun` may resolve to a stray `~/.bun/bin/bun` ahead of the mise shims, so **every** install below goes through `mise x -- bun`.
  - Run `mise x -- bun install` (plain, not `--frozen-lockfile`) from the repo root. This repo uses Bun workspaces, so a single root install regenerates the root `bun.lock` for all workspace members.
  - If `packages/ui/package.json` was also changed, run `mise x -- bun install` in `packages/ui` separately (it has its own `bun.lock` and is not a workspace member).
  - Only the root `bun.lock` and `packages/ui/bun.lock` (if ui was touched) should move. No other lockfiles should exist.

6. **Pin the Dockerfile image tags:**
  - Find them with `grep -rn 'oven/bun:' --include=Dockerfile .` and rewrite each tag to `oven/bun:$version-alpine`.
  - Match the pattern `oven/bun:[^ ]*`, **not** an anchored `^FROM oven/bun:`. `packages/ui/Dockerfile` carries a `--platform=$BUILDPLATFORM` prefix before the image, and an anchored pattern silently skips it.
  - Preserve everything else on the line: the `--platform` prefix, the `AS <stage>` suffix, and the explanatory comment blocks above the `FROM` lines.
  - Every bun stage in a file gets the same tag. Do not leave one stage floating.

7. **Sweep the docs:**
  - Rewrite bun version literals in `README.md` and under `.claude/kbase/**` **only where they state the current pin**.
  - **Do not rewrite historical notes.** A line like "verified on 1.3.13" records which build a behavior was actually tested against, and changing it asserts a test that never ran. Collect these and report them for a human to judge.
  - Never grep for a bare `bun`. It matches `ubuntu-latest` in the workflow files. Grep for `oven/bun`, `@types/bun`, or `^bun = ` instead.

8. **Verify and Finalize:**
  - Confirm nothing stale survives: `grep -rn 'oven/bun:' --include=Dockerfile .` and `grep -rn '@types/bun' --include=package.json .` should show `$version` everywhere, and `grep -n '^bun = ' mise.toml` should agree.
  - Confirm the toolchain actually moved: `mise x -- bun --version`.
  - Confirm the lockfiles are consistent: `mise x -- bun install --frozen-lockfile` from the root (covers workspace members), and separately in `packages/ui` if it was touched.
  - Confirm the pinned image exists and still builds: `docker run --rm "oven/bun:$version-alpine" bun --version`, then `docker build --target deps -f packages/db/Dockerfile packages/db`.
  - Run the repo gates: `bun run typecheck`, which proves `@types/bun` still resolves, then `bun run test` from the root, which `CLAUDE.md` requires before any change counts as done.
  - Present a table of every file changed, plus a separate list of any doc lines reported but deliberately left alone. Report failures verbatim rather than summarizing them as success.
