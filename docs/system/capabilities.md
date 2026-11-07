# Capabilities

What the system does **now**. Each slice updates this file when it closes. Requirements that have been superseded don't appear here.

## The site

- It's served from https://marccompta.github.io/marcona-app/, and a reload or a link opens the same screen.
- It fits screens from 360px wide, respects safe areas, and stays usable as a centred column on a desktop.
- All text is Catalan, and all fonts come from the site itself.

## Accounts

- People log in with a username and password. Public sign-up is off, so the admin creates every account. Only the admin's own account was made in the Supabase dashboard.
- A session survives a reload, and logging out works with no connection.
- Failed logins and other errors show a Catalan message.
- A username is 3 to 20 characters of `a-z`, `0-9`, `_` and `-`, and it's never reused, even after a removal.
- Only the admin can change a password, and a reset ends that person's sessions.
- Removing a user needs a second confirmation, and the admin can't remove themselves. A removed user can't log in, leaves the ranking, and keeps their history in the audit.
- A phone notices a reset or a removal when it reloads or comes back to the tab, and returns to the login.

## Marcones

- New users start with 0 marcones. Only the admin can add or remove them, with a required Concept and a whole amount of at least 1.
- A balance can't go below 0.
- Every change is a movement in an append-only ledger, which stores the balance after it.
- Sending the same action twice, or two at the same moment, can't apply it twice or overdraw a balance.

## Screens

- **Classificació:** active users by balance, then alphabetically, with medals on the top three and a "tu" pill. A styled empty state shows until a second active user exists. Tapping someone opens their balance and every movement on it.
- **Auditoria:** every movement, newest first, with who, the amount, the concept, the balance after and the time. A filter shows one person, including removed people.
- **Administració:** create users, adjust marcones, reset passwords and remove users. Only the admin has this tab.
- **Esdeveniments, Ruleta:** placeholders.
- Balances show as chip stacks, with numbers that count up. With reduced motion they appear at once.

## Security

- Row Level Security is on for every table, and nothing is readable without a login.
- The browser can't write to any table, and nobody can change a ledger row.
- Every policy and public function checks that the user is active, so a removal takes effect even on an unexpired token.
- There can only be one admin.
- Creating, removing and resetting users run in an Edge Function, and the secret key exists only in Supabase.
- Accounts made by automated tests only see each other, and real users never see them.
- The repo holds no secrets, and a test scans the working tree and every commit.
