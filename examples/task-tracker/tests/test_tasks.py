import contextlib
import io
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from tasktracker.cli import main

APP_DIR = Path(__file__).resolve().parent.parent


class TaskTestCase(unittest.TestCase):
    def setUp(self):
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        self.db = str(Path(folder.name) / "test.db")

    def run_app(self, *args):
        """Run the app in-process and return (exit code, stdout, stderr)."""
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = main(["--db", self.db, *args])
        return code, out.getvalue(), err.getvalue()


class AddTests(TaskTestCase):
    def test_add_stores_task_and_shows_id(self):
        """REQ-001"""
        code, out, _ = self.run_app("add", "Buy milk")
        self.assertEqual(code, 0)
        self.assertEqual(out.strip(), "Added task 1: Buy milk")

    def test_add_removes_surrounding_spaces(self):
        """REQ-001"""
        _, out, _ = self.run_app("add", "  Buy milk  ")
        self.assertEqual(out.strip(), "Added task 1: Buy milk")

    def test_blank_title_is_rejected_and_nothing_is_stored(self):
        """REQ-002"""
        for title in ("", "   "):
            with self.subTest(title=title):
                code, out, err = self.run_app("add", title)
                self.assertNotEqual(code, 0)
                self.assertEqual(out, "")
                self.assertIn("title can't be blank", err)
                self.assertEqual(self.run_app("list")[1].strip(), "No tasks.")


class ListTests(TaskTestCase):
    def test_list_shows_tasks_in_order_added(self):
        """REQ-003"""
        self.run_app("add", "Buy milk")
        self.run_app("add", "Call the bank")
        code, out, _ = self.run_app("list")
        self.assertEqual(code, 0)
        self.assertEqual(out.splitlines(), ["1. Buy milk", "2. Call the bank"])

    def test_list_says_so_when_empty(self):
        """REQ-005"""
        code, out, _ = self.run_app("list")
        self.assertEqual(code, 0)
        self.assertEqual(out.strip(), "No tasks.")


class PersistenceTests(TaskTestCase):
    def run_process(self, *args):
        return subprocess.run(
            [sys.executable, str(APP_DIR / "tt.py"), "--db", self.db, *args],
            capture_output=True,
            text=True,
            check=True,
        )

    def test_tasks_survive_between_separate_runs(self):
        """REQ-004"""
        self.run_process("add", "Buy milk")
        result = self.run_process("list")
        self.assertEqual(result.stdout.strip(), "1. Buy milk")


if __name__ == "__main__":
    unittest.main()
