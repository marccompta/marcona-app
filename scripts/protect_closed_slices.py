"""Claude Code PreToolUse hook: block edits inside closed slices.

Reads the hook's JSON from stdin. Exits 2, with the reason on stderr, if the
target file is in a slice whose spec.md has `status: closed`. Otherwise exits 0.
"""

import json
import re
import sys
from pathlib import Path

SLICE_DIR = re.compile(r"^\d{3}-")
STATUS = re.compile(r"^status:\s*(\S+)\s*$", re.MULTILINE)


def closed_slice_for(file_path):
    """Return the slice folder containing file_path if it's closed, else None."""
    path = Path(file_path)
    for parent in path.parents:
        if parent.parent.name == "slices" and SLICE_DIR.match(parent.name):
            spec = parent / "spec.md"
            if not spec.is_file():
                return None
            match = STATUS.search(spec.read_text(encoding="utf-8"))
            return parent if match and match.group(1) == "closed" else None
    return None


def main():
    payload = json.load(sys.stdin)
    file_path = payload.get("tool_input", {}).get("file_path")
    if not file_path:
        return 0
    closed = closed_slice_for(file_path)
    if closed:
        print(
            f"{closed.name} is closed, so its files are frozen. "
            "Correct mistakes in a new slice and update docs/system/ instead.",
            file=sys.stderr,
        )
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
