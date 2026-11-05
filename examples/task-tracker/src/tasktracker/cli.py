"""Command-line interface: arguments in, messages out."""

import argparse
import sys

from tasktracker.store import TaskStore


def build_parser():
    parser = argparse.ArgumentParser(prog="tt", description="A small personal task tracker.")
    parser.add_argument("--db", default="tasks.db", help="database file (default: tasks.db)")
    commands = parser.add_subparsers(dest="command", required=True)
    add = commands.add_parser("add", help="add a task")
    add.add_argument("title", help="what needs doing")
    commands.add_parser("list", help="list tasks")
    return parser


def add_task(store, title):
    title = title.strip()
    if not title:
        print("Error: the title can't be blank.", file=sys.stderr)
        return 1
    print(f"Added task {store.add(title)}: {title}")
    return 0


def list_tasks(store):
    tasks = store.all()
    if not tasks:
        print("No tasks.")
    for task_id, title in tasks:
        print(f"{task_id}. {title}")
    return 0


def main(argv=None):
    args = build_parser().parse_args(argv)
    with TaskStore(args.db) as store:
        if args.command == "add":
            return add_task(store, args.title)
        return list_tasks(store)
