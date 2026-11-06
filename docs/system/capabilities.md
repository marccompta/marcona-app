# Capabilities

What the system does **now**. Each slice updates this file when it closes. Requirements that have been superseded don't appear here.

## The site

- It's served from https://marccompta.github.io/marcona-app/, and a reload or a link opens the same screen.
- It fits screens from 360px wide, respects safe areas, and stays usable as a centred column on a desktop.
- All text is Catalan, and all fonts come from the site itself.

## Accounts

- People log in with a username and password. Public sign-up is off, so accounts are made in the Supabase dashboard for now.
- A session survives a reload, and logging out works with no connection.
- Failed logins and other errors show a Catalan message.

## Screens

- **Classificació:** a styled empty state. It doesn't list players yet.
- **Esdeveniments, Ruleta, Auditoria:** placeholders.
- **Administració:** a placeholder, and only the admin has this tab.

## Security

- Row Level Security is on for every table, and nothing is readable without a login.
- The browser can't write to `profiles`.
- The repo holds no secrets, and a test scans the working tree and every commit.
