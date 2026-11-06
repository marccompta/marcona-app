"""Claude Code PreToolUse hook: block git commits while the unit tests fail.

Reads the hook's JSON from stdin. If the shell command runs `git commit`, runs
the unit tests first. Exits 2, with the failure on stderr, if they fail.
Otherwise exits 0.

The tests run before the whole command does, so edits made earlier in the same
command aren't seen. MARCONA_HOOK_TEST_COMMAND replaces `npm test` in this
hook's own tests.
"""

import json
import os
import re
import subprocess
import sys
from pathlib import Path

GIT_COMMIT = re.compile(r"\bgit(\s+-\S+(\s+[^-\s]\S*)?)*\s+commit\b")
ROOT = Path(__file__).resolve().parent.parent
LAST_LINES = 30


def main():
    payload = json.load(sys.stdin)
    command = payload.get("tool_input", {}).get("command", "")
    if not GIT_COMMIT.search(command):
        return 0

    result = subprocess.run(
        os.environ.get("MARCONA_HOOK_TEST_COMMAND", "npm test"),
        cwd=ROOT,
        shell=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    if result.returncode == 0:
        return 0

    output = (result.stdout + result.stderr).strip().splitlines()
    print("The unit tests failed, so this commit is blocked. Fix them first.", file=sys.stderr)
    print("\n".join(output[-LAST_LINES:]), file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main())
