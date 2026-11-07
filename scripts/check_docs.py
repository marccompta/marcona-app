"""Check that a project's slices, requirements and docs are consistent.

Usage: python scripts/check_docs.py [project-path]

Exits 1 and lists every problem if a check fails. Uses only the standard
library so it works whatever stack the project uses.
"""

import re
import sys
from pathlib import Path

STATUSES = {
    "draft", "approved", "building", "in-review",
    "changes-requested", "accepted", "closed", "rejected",
}
NEEDS_APPROVAL = {"accepted", "closed"}
NEEDS_TASKS_DONE = {"in-review", "accepted", "closed"}
REQ_ID = re.compile(r"REQ-\d{3}")
BACKLOG_ROW = re.compile(r"^\|\s*(REQ-\d{3})\s*\|(.*)\|\s*$", re.MULTILINE)
VERDICT = re.compile(r"^- Verdict:\s*(\w+)", re.MULTILINE)
LINK = re.compile(r"\[[^\]]*\]\(([^)\s]+)\)")
FENCE = re.compile(r"```.*?```", re.DOTALL)
INLINE_CODE = re.compile(r"`[^`\n]*`")
# Folders that are never part of the project's code or its checked docs.
SKIP_CODE_DIRS = {
    ".git", ".claude", ".github", "docs", "slices", "templates", "scripts",
    "examples", "node_modules", ".venv", "__pycache__",
}
SKIP_DOC_DIRS = {".git", "templates", "examples", "node_modules", ".venv"}


def read(path):
    return path.read_text(encoding="utf-8")


def walk(root, skip):
    """Yield files under root, ignoring folders named in skip."""
    for path in root.iterdir():
        if path.is_dir():
            if path.name not in skip:
                yield from walk(path, skip)
        else:
            yield path


def frontmatter(text):
    """Return the simple key: value pairs from a Markdown file's frontmatter."""
    match = re.match(r"---\n(.*?)\n---", text, re.DOTALL)
    if not match:
        return {}
    pairs = (line.split(":", 1) for line in match.group(1).splitlines() if ":" in line)
    return {key.strip(): value.strip() for key, value in pairs}


def parse_backlog(root, errors):
    """Return {req_id: {"status", "verification"}} and record duplicates."""
    path = root / "docs/product/backlog.md"
    if not path.is_file():
        errors.append("docs/product/backlog.md is missing")
        return {}
    requirements = {}
    for req_id, rest in BACKLOG_ROW.findall(read(path)):
        if req_id in requirements:
            errors.append(f"{req_id}: duplicate ID in the backlog")
        cells = [cell.strip() for cell in rest.split("|")]
        if len(cells) != 4:
            errors.append(f"{req_id}: backlog row needs 5 columns")
            continue
        requirements[req_id] = {"status": cells[1], "verification": cells[3]}
    for req_id, info in requirements.items():
        target = re.match(r"superseded by (REQ-\d{3})", info["status"])
        if target and target.group(1) not in requirements:
            errors.append(f"{req_id}: superseded by unknown {target.group(1)}")
    return requirements


def cited_requirements(root):
    """Return every requirement ID cited in the project's non-Markdown files."""
    cited = set()
    for path in walk(root, SKIP_CODE_DIRS):
        if path.suffix == ".md":
            continue
        try:
            cited.update(REQ_ID.findall(read(path)))
        except (UnicodeDecodeError, OSError):
            continue
    return cited


def check_slice(folder, root, requirements, cited, errors):
    name = folder.name
    spec_path = folder / "spec.md"
    if not spec_path.is_file():
        errors.append(f"{name}: spec.md is missing")
        return
    meta = frontmatter(read(spec_path))
    status = meta.get("status")
    if status not in STATUSES:
        errors.append(f"{name}: invalid status {status!r}")
        return

    slice_reqs = REQ_ID.findall(meta.get("requirements", ""))
    if not slice_reqs:
        errors.append(f"{name}: spec.md lists no requirements")
    for req_id in slice_reqs:
        if req_id not in requirements:
            errors.append(f"{name}: {req_id} isn't in the backlog")

    if status in NEEDS_TASKS_DONE:
        tasks = folder / "tasks.md"
        if not tasks.is_file():
            errors.append(f"{name}: tasks.md is missing")
        elif "- [ ]" in read(tasks):
            errors.append(f"{name}: {status} with unchecked tasks")

    if status in NEEDS_APPROVAL:
        review = folder / "review.md"
        verdicts = VERDICT.findall(read(review)) if review.is_file() else []
        if not verdicts or verdicts[-1].lower() != "approve":
            errors.append(f"{name}: status is {status} without an approve verdict")

    if status != "closed":
        return

    if not (folder / "record.md").is_file():
        errors.append(f"{name}: closed but record.md is missing")
    history = root / "HISTORY.md"
    if not history.is_file() or f"slices/{name}" not in read(history):
        errors.append(f"{name}: closed but not in HISTORY.md")
    for req_id in slice_reqs:
        info = requirements.get(req_id)
        if not info or info["status"] != "active":
            continue
        if info["verification"] == "test" and req_id not in cited:
            errors.append(f"{name}: {req_id} has no test citing it")


def check_links(root, errors):
    for path in walk(root, SKIP_DOC_DIRS):
        if path.suffix != ".md":
            continue
        text = INLINE_CODE.sub("", FENCE.sub("", read(path)))
        for target in LINK.findall(text):
            if re.match(r"[a-z]+:", target) or target.startswith("#"):
                continue
            if not (path.parent / target.split("#")[0]).exists():
                errors.append(f"{path.relative_to(root)}: broken link {target}")


def run(root):
    errors = []
    requirements = parse_backlog(root, errors)
    cited = cited_requirements(root)
    slices = root / "slices"
    folders = []
    if slices.is_dir():
        folders = sorted(p for p in slices.iterdir() if p.is_dir())
    numbers = [folder.name[:3] for folder in folders]
    for folder in folders:
        if not re.match(r"\d{3}-", folder.name):
            errors.append(f"{folder.name}: slice folders must be named NNN-slug")
            continue
        if numbers.count(folder.name[:3]) > 1:
            errors.append(f"{folder.name}: duplicate slice number")
        check_slice(folder, root, requirements, cited, errors)
    check_links(root, errors)
    return errors, len(folders), len(requirements)


def main():
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    if not root.is_dir():
        print(f"Not a folder: {root}")
        return 1
    errors, slice_count, req_count = run(root)
    for error in errors:
        print(f"FAIL {error}")
    if errors:
        print(f"{len(errors)} problem(s) found in {root}")
        return 1
    print(f"OK: {slice_count} slice(s), {req_count} requirement(s) in {root}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
