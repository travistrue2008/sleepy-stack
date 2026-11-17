# retag.awk: move oven/bun image tags to a target version.
#
#   awk -v V=<X.Y.Z> -v MODE=rewrite -f retag.awk <file>   copy the file with every
#                                                          rewritable tag moved to V
#   awk -v V=<X.Y.Z> -v MODE=list    -f retag.awk <file>   print the new tag of every
#                                                          rewritable reference
#
# Each reference keeps its own variant: 1.3.0-alpine -> V-alpine, a bare
# "alpine" -> V-alpine, and "latest" or a bare major like "1" -> V. The match is
# unanchored, so a "FROM --platform=... oven/bun:..." line and a compose
# "image:" line are handled the same way. Everything else on the line is kept.
#
# Never rewritten, reported as LEFT on stderr (rewrite mode only):
#   - a reference pinned by digest (oven/bun:1.4.2@sha256:...): the digest would
#     still win over the tag, so a tag-only edit would be a silent no-op
#   - a tag taken from a variable (oven/bun:${BUN_VERSION}): the default lives
#     elsewhere
#   - an untagged reference (FROM oven/bun)

function variant(tag,   rest) {
  if (tag == "latest") return ""
  if (tag ~ /^[0-9]/) {
    rest = tag
    if (sub(/^[^-]*-/, "", rest)) return rest
    return ""
  }
  return tag
}

function note(kind, what, why) {
  if (MODE == "rewrite")
    print kind " " FILENAME ":" FNR ": " what " (" why ")" > "/dev/stderr"
}

{
  orig = $0
  line = $0
  out = ""
  while (match(line, /oven\/bun:[^ \t"']*/)) {
    pre = substr(line, 1, RSTART - 1)
    tok = substr(line, RSTART, RLENGTH)
    line = substr(line, RSTART + RLENGTH)
    tag = substr(tok, 10)
    if (tag == "" || tag ~ /[$@{]/) {
      note("LEFT", tok, tag ~ /@/ ? "pinned by digest" : "tag comes from a variable")
      out = out pre tok
    } else {
      v = variant(tag)
      nt = V (v == "" ? "" : "-" v)
      if (MODE == "list") print nt
      out = out pre "oven/bun:" nt
    }
  }
  if (orig ~ /oven\/bun([ \t"']|$)/) note("LEFT", "oven/bun", "untagged reference")
  if (MODE == "rewrite") print out line
}
