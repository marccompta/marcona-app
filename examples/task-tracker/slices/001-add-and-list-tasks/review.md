# Slice 001 review

This should take about 5 minutes.

## 1. What to look at

You can now add tasks from the terminal, list them, and find them again after closing the terminal. Blank titles are refused. There's no way to complete a task yet; that's slice 002.

## 2. Before you start

- **You need:** Python 3 and a PowerShell terminal. There's nothing to install.
- **Setup:** go to the demo folder:

  ```powershell
  cd C:\Repos\marcona-app\examples\task-tracker
  ```

- **Reset afterwards:** run this from the same folder to delete the throwaway database:

  ```powershell
  Remove-Item review.db
  ```

## 3. How to review

Run each command and compare the result with what's shown. `--db review.db` keeps your test data in a throwaway file.

**Step 1: start with an empty list.**

```powershell
python tt.py --db review.db list
```

```
No tasks.
```

**Step 2: add two tasks.**

```powershell
python tt.py --db review.db add "Buy milk"
python tt.py --db review.db add "Call the bank"
```

```
Added task 1: Buy milk
Added task 2: Call the bank
```

**Step 3: list them.**

```powershell
python tt.py --db review.db list
```

```
1. Buy milk
2. Call the bank
```

**Step 4: try a blank title.** The second command shows the exit code, and anything other than 0 means failure.

```powershell
python tt.py --db review.db add "   "
$LASTEXITCODE
```

```
Error: the title can't be blank.
1
```

**Step 5: check that tasks survive.** Close the terminal, open a new one, go back to the demo folder, and list again.

```powershell
cd C:\Repos\marcona-app\examples\task-tracker
python tt.py --db review.db list
```

```
1. Buy milk
2. Call the bank
```

The blank title from step 4 isn't there, and both tasks are.

**Step 6: clean up.** Run the reset from section 2. If you skip it, step 1 won't show `No tasks.` next time.

## 4. Checklist

| # | Requirement | Check | Expected result |
|---|---|---|---|
| 1 | REQ-001 | Step 2 | Each task is confirmed with its ID |
| 2 | REQ-002 | Step 4, then step 5 | An error, a non-zero exit code, and no blank task in the list |
| 3 | REQ-003 | Step 3 | Tasks appear in the order you added them, with IDs and titles |
| 4 | REQ-004 | Step 5 | Tasks are still there in a new terminal |
| 5 | REQ-005 | Step 1 | `No tasks.` |

While you're there, consider the things a test can't judge: are the messages clear, and does it feel right to use?

## 5. Already checked automatically

| Check | Command | Result |
|---|---|---|
| Tests | `python -m unittest discover` | 6 passed |
| Docs | `python ../../scripts/check_docs.py .` | Passed: 1 slice, 11 requirements |

Instructions run as written: yes, by the agent that built this slice and again by an independent auditor, both in PowerShell. Neither could close a terminal, so step 5 was run in a new process instead.

Audit: passed, with all 5 steps and the reset matching. It found three unclear spots, now fixed: this section's pointer to the audit result, the missing reminder to reset after step 5, and no mention of where to send your verdict.

## 6. Known limitations

- Tasks can't be completed, edited or deleted yet. Completing them is slice 002, and the others aren't in the backlog.
- Without `--db`, the app uses `tasks.db` in the current folder, so running it from a different folder starts a separate list.

## 7. Your verdict

Type one of these in a Claude Code session started in `C:\Repos\marcona-app`:

- `/slice-verdict 001 approve --project examples/task-tracker`
- `/slice-verdict 001 changes <what to fix> --project examples/task-tracker`
- `/slice-verdict 001 reject <why> --project examples/task-tracker`

## Review log

### Round 1

- Verdict: pending
- Date:
- Notes:
