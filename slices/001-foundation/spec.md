---
slice: "001"
title: Foundation
status: in-review
requirements: [REQ-001, REQ-002, REQ-003, REQ-004, REQ-005, REQ-006, REQ-007, REQ-008, REQ-009, REQ-010, REQ-011, REQ-012, REQ-013, REQ-014, REQ-015, REQ-016, REQ-017, REQ-018, REQ-019, REQ-020, REQ-021, REQ-022, REQ-023, REQ-024, REQ-025, REQ-026, REQ-027, REQ-028, REQ-029, REQ-030, REQ-031, REQ-032, REQ-033, REQ-034]
---

# Slice 001: Foundation

## Problem

Nothing exists yet. Every later slice depends on the hosting, the login, the language layer and the look, so these need proving together on a real phone, not just setting up.

## Outcome

The admin opens the public URL on a phone, logs in, and sees a styled, empty ranking in Catalan, in a visual direction they chose.

## Scope

- The React, TypeScript and Vite app, deployed to GitHub Pages under `/marcona-app/`.
- The Supabase project, its Auth settings, the first migration and the admin account.
- Login, logout and session handling.
- The app shell: header, bottom tab bar and the ranking's empty state. Tabs for screens not built yet show a short Catalan placeholder.
- The language layer: one text module, `Intl` helpers, plurals and error mapping.
- 2 or 3 visual directions, shown early so the human can pick during setup, and the design tokens for the chosen one.
- Tooling, `docs/tooling.md`, `docs/setup.md`, and a step-by-step walkthrough of the human's setup.
- Deployment of `main` and of the slice under review.

## Non-goals

- Creating users, marcones and the ledger (slice 002).
- Events (slice 003), roulette (slice 004) and games (slices 005 and 007).
- Live updates, QR code and home screen install (slice 006).
- Export and wipe (slice 008).

## Requirements

- **REQ-001:** The system shall be served as a static site from GitHub Pages at `https://marccompta.github.io/marcona-app/`, with every asset loaded under the `/marcona-app/` base path.
- **REQ-002:** The system shall use hash-based routes, so that reloading a screen or opening a link to it at the public URL shows that screen.
- **REQ-003:** When a person submits a correct username and password, the system shall start a Supabase Auth session and show the ranking.
- **REQ-004:** The system shall ask people only for a username and a password, and shall map each username to a hidden placeholder email that never appears in the interface.
- **REQ-005:** If a login attempt fails, then the system shall show a Catalan error and keep the person on the login screen.
- **REQ-006:** While a session is valid, the system shall keep the user logged in across page reloads.
- **REQ-007:** When a user logs out, the system shall end their session and show the login screen.
- **REQ-008:** If a request has no logged-in session, then the system shall return no data from any table.
- **REQ-009:** The system shall have Row Level Security enabled on every table.
- **REQ-010:** If anyone tries to sign up through the public Auth API, then the system shall reject the request.
- **REQ-011:** While no other players exist, the system shall show the ranking screen with a styled Catalan empty state.
- **REQ-012:** While a user is logged in, the system shall show a fixed bottom tab bar.
- **REQ-013:** The system shall show the Administració tab only to the admin.
- **REQ-014:** The system shall show every visible word in natural Catalan, including errors, empty states, confirmations, the page title and metadata.
- **REQ-015:** The system shall set `lang="ca"` on the document.
- **REQ-016:** The system shall format dates and numbers with `Intl` using the `ca-ES` locale and the `Europe/Madrid` time zone.
- **REQ-017:** The system shall use the correct Catalan singular and plural forms for amounts, such as 1 marcona and 2 marcones.
- **REQ-018:** The system shall keep all interface text in one place in the code.
- **REQ-019:** If Supabase returns an error, then the system shall show a Catalan message and never the raw English text.
- **REQ-020:** The system shall keep the identity of the "Casino Tokens" artifact: felt greens `#073b2b`, `#0d5439` and `#116a49` with a soft radial glow, gold `#f0c24b`, ivory text `#f6f1dc`, sage secondary text `#9cc7b1`, serif headings, an italic gold logo with a ♠, rounded cards with fine borders, and pill status tags.
- **REQ-021:** The system shall look premium rather than like a template, using felt texture, gold foil detail and refined transitions.
- **REQ-022:** The system shall load all fonts from the site itself, with no requests to third-party font services.
- **REQ-023:** The system shall fit screens from 360px wide without horizontal scrolling.
- **REQ-024:** The system shall give every tappable control a tap target of at least 44px.
- **REQ-025:** The system shall respect device safe areas, such as the iPhone notch and home bar.
- **REQ-026:** The system shall keep text contrast high enough to read comfortably in a dim room.
- **REQ-027:** Where the site is opened in a desktop browser, the system shall remain usable.
- **REQ-028:** When slice 001 is reviewed, the project shall show 2 or 3 rendered phone-sized visual directions from the "Casino Tokens" family, so the human can choose one before later screens are built.
- **REQ-029:** The project shall record each installed tool and its job in `docs/tooling.md`, after checking its install command against official docs.
- **REQ-030:** The project shall provide `docs/setup.md` with exact steps for everything the human must do: making the repo public, creating the Supabase project in an EU region, Auth settings, GitHub Pages and Actions settings, authorising MCP servers, installing plugins, and creating the admin account.
- **REQ-031:** The repository shall contain no Supabase credential other than the project URL and publishable key, and no real password.
- **REQ-032:** The project shall keep migrations in `supabase/migrations/` and apply them to the hosted project, without relying on Docker or the local Supabase stack.
- **REQ-033:** When a slice is under review, the project shall deploy that slice's branch to the public site.
- **REQ-034:** The project shall scope the Supabase MCP server to this one project, with manual approval kept on.

## Acceptance criteria

```gherkin
# REQ-001, REQ-002
Scenario: Open the site at its public address
  Given the site is deployed
  When I open https://marccompta.github.io/marcona-app/ and reload a screen
  Then that screen loads again
  And no asset request fails

# REQ-003, REQ-004
Scenario: Log in with a username
  Given the admin account exists
  When I enter my username and password
  Then I see the ranking
  And no email address appears anywhere in the interface

# REQ-005, REQ-019
Scenario: Wrong password
  When I submit a wrong password
  Then I stay on the login screen
  And I see a Catalan error with no English text from Supabase

# REQ-006, REQ-007
Scenario: Stay logged in, then log out
  Given I'm logged in
  When I reload the page
  Then I'm still logged in
  When I log out
  Then I see the login screen

# REQ-008, REQ-009
Scenario: Nothing is readable without a login
  Given I call the API with only the publishable key
  When I read any table
  Then I get no rows
  And the RLS report lists no table without Row Level Security

# REQ-010
Scenario: Public sign-up is off
  When I call sign-up with the publishable key
  Then the request is rejected and no user is created

# REQ-011, REQ-012
Scenario: See the empty ranking
  Given I'm the only user
  When I log in
  Then I see a styled Catalan empty state on the ranking
  And a bottom tab bar stays fixed while the page scrolls

# REQ-013
Scenario: The admin tab is for the admin
  Given a player account exists in test data
  When that player logs in
  Then they don't see the Administració tab
  And the admin does

# REQ-014, REQ-015, REQ-018
Scenario: Every word is Catalan and in one place
  When I walk through every screen, error and page title
  Then every visible word is natural Catalan
  And the document says lang="ca"
  And the wording all comes from one text module

# REQ-016, REQ-017
Scenario: Catalan dates, numbers and plurals
  When the helpers format 1234 marcones, 1 marcona and a date
  Then I get "1.234 marcones", "1 marcona" and a ca-ES date in Madrid time

# REQ-020, REQ-021, REQ-026
Scenario: It looks like a premium "Casino Tokens"
  When I compare the site with the artifact on my phone in a dim room
  Then I recognise its colours, logo, cards and tags
  And it looks premium rather than like a template
  And the text is comfortable to read

# REQ-022
Scenario: Fonts are self-hosted
  When I load the site and watch its network requests
  Then every font comes from the site itself

# REQ-023, REQ-024
Scenario: Fits a small phone
  Given a screen 360px wide
  When I open each screen
  Then nothing scrolls sideways
  And every tappable control is at least 44px

# REQ-025, REQ-027
Scenario: Works on a notched phone and on a desktop
  When I open the site on an iPhone and on a desktop browser
  Then nothing sits under the notch or home bar
  And the desktop layout is usable

# REQ-028
Scenario: Choose a visual direction
  When I review this slice
  Then I see 2 or 3 phone-sized directions from the "Casino Tokens" family
  And the chosen one is what's built

# REQ-029, REQ-030, REQ-034
Scenario: Tools and setup are documented
  When I read docs/tooling.md and docs/setup.md
  Then each tool has a clear job and a checked install command
  And every step I had to do is written down exactly
  And the Supabase MCP server is scoped to this project with manual approval on

# REQ-031
Scenario: No secrets in the repo
  When the secret scan runs over the repository
  Then it finds nothing beyond the Supabase URL and publishable key

# REQ-032
Scenario: Migrations live in the repo
  When I look at supabase/migrations/
  Then it holds every change applied to the hosted project

# REQ-033
Scenario: The slice under review is deployed
  When this slice's branch is pushed
  Then the public site shows this slice
```

## Impact on existing behaviour

The repo becomes public, so everything committed so far is published. CI gains the app's unit tests and build. No requirements are superseded.

## Open questions

None.
