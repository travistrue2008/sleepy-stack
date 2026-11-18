#!/bin/sh
# Sourced by the VS Code wrapper scripts. Defines `find_mise`, which prints the
# path to the mise binary.
#
# VS Code starts its extensions without the user's shell, so the `mise activate`
# hook never runs and `mise` itself is often not on PATH either. Look on PATH
# first, then in the usual install locations (Homebrew, apt, the install script).

find_mise() {
  if command -v mise >/dev/null 2>&1; then
    command -v mise
    return
  fi

  for candidate in /opt/homebrew/bin/mise /usr/local/bin/mise /usr/bin/mise "$HOME/.local/bin/mise"; do
    if [ -x "$candidate" ]; then
      echo "$candidate"
      return
    fi
  done

  return 1
}
