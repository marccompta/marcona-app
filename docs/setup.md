# Setup

Everything the human has to do by hand, in order. Claude walks through these one at a time and checks each step before the next. Dashboard labels can change, so if one doesn't match, say what you see.

**Never paste these into the chat or the repo:** the Supabase secret key, the database password, or your admin password. The Supabase URL, publishable key and project ref are safe to share.

## 1. Make the repo public

GitHub Pages needs a public repo on the free plan. Everything committed becomes visible, so Claude scans the repo first.

```
! gh repo edit marccompta/marcona-app --visibility public --accept-visibility-change-consequences
```

**Check:** `gh repo view --json visibility` says `PUBLIC`.

## 2. Create the Supabase project

1. Go to https://supabase.com/dashboard and sign in.
2. Choose **New project**, on the free plan, and name it `marcona`.
3. Pick an EU region, such as Paris or Frankfurt.
4. Generate a database password, and keep it in your password manager.
5. When the project is ready, open **Project Settings**, then **API Keys**.

**Give Claude:** the project URL, the publishable key (starts with `sb_publishable_`) and the project ref (the part of the URL before `.supabase.co`).

**Check:** Claude reaches the Auth API with the publishable key.

## 3. Set up Auth

In **Authentication**, under **Sign In / Providers** and the email settings:

1. Turn off **Allow new users to sign up**.
2. Turn off **Confirm email**.
3. Turn on **Require current password when updating**.
4. Leave the minimum password length as it is, unless you want it longer.

Then in **Authentication**, **Rate Limits**, raise the sign-in limit to 100 per 5 minutes, because everyone at the event shares one IP on the venue's Wi-Fi.

**Check:** Claude tries to sign up with the publishable key, and it's rejected.

## 4. Set up GitHub Pages

Claude does this with `gh` once you say so:

1. Sets the Pages source to **GitHub Actions**.
2. Adds `slice/*` to the deployment branches of the `github-pages` environment, which otherwise allows only `main`.

**Check:** the first deploy succeeds from the slice branch.

## 5. Install the plugin and skills

Type these in the Claude Code prompt:

```
/plugin install frontend-design@claude-plugins-official
```

```
! npx skills add supabase/agent-skills --skill supabase --skill supabase-postgres-best-practices --agent claude-code --yes
```

**Check:** `/plugin` lists `frontend-design`, and `.claude/skills/` has the two Supabase skills.

## 6. Authorise the MCP servers

Claude adds `.mcp.json` first, scoped to this project.

The Playwright server needs Chrome installed on the machine.

1. Restart Claude Code, then continue this session with `claude --continue`.
2. Approve the project's MCP servers when asked.
3. Run `/mcp`, choose `supabase`, and sign in with your browser.
4. Turn auto mode off before any Supabase work: press Shift+Tab until the mode shown isn't "auto". In auto mode, an automatic check can decide tool calls instead of asking you.
5. When Claude asks to use a Supabase tool that changes something, approve each one. Don't choose "always allow". That's how manual approval stays on. If a change happens with no prompt, stop and tell Claude.

**Check:** Claude lists the project's tables through the Supabase MCP server.

## 7. Create your admin account

1. In **Authentication**, **Users**, choose **Add user**, then **Create new user**.
2. Enter `<your username>@marcona.invalid` as the email. Usernames are 3 to 20 characters of lowercase `a-z`, `0-9`, `_` and `-`.
3. Enter a password and tick **Auto Confirm User**.
4. Create a file called `.env.test.local` at the repo root, which git ignores:

   ```
   MARCONA_ADMIN_USERNAME=<your username>
   MARCONA_ADMIN_PASSWORD=<your password>
   ```

**Give Claude:** your username only. Claude adds the admin row with a migration.

**Check:** you log in on your phone at the public URL.

After the final wipe, change this password and delete `.env.test.local`.
