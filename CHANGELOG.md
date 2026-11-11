# Changelog

All notable user-facing changes are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- The MarcOna site at its public address, in Catalan, in the "Saló privat" look.
- Logging in with a username and password, staying logged in, and logging out.
- A styled, empty ranking, and a bottom tab bar with placeholders for the screens to come.
- The ranking of players by marcones, with medals, chip stacks and numbers that count up.
- A screen for each person, with their balance and every movement on it.
- The audit: every movement, newest first, with a filter by person.
- The admin screen, to create and remove users, reset passwords, and add or remove marcones.
- Classic events: create one, invite friends, collect buy-ins, then pay out the winners or cancel with full refunds.
- The Esdeveniments screen, with invitations, open events and past events, and a screen for each event.
- Forced participation for the admin, where every invitee joins and pays at once.
- Buy-ins, refunds and payouts in the audit, each opening its event.
- Roulette: pick red or black, bet up to your limit and watch the wheel land on a result decided by the server.
- A win celebration, with the marcones won shown large and confetti across the screen.
- Spins in the audit, with the choice and the result.
- Roulette settings for the admin: the white chance, the maximum bet, and opening or closing the table.
- Confia o traeix: a secret duel the admin sets up, playing or not, where each player picks in a private panel and nobody can tell who has picked.
- A dramatic reveal the moment the second player picks, with cards that turn one at a time, and payouts in the audit.
- Forced participation for duels.
- Game settings for the admin: on or off, the description and the numbers, with a worked example.
- Live updates: the ranking, a person's page, the audit and events change by themselves when someone else plays.
- A QR code on the admin screen, for friends to scan and open the site.
- Home screen install, opening full screen as MarcOna with its own icon.
- La minoria: a secret group game for 3 or more, which the admin sets up and starts, where everyone confirms Blanc or Negre and sees who has picked, never what.
- La minoria's reveal: each side's count, then the smaller side splitting the pot, or everyone's buy-in back on a tie or a unanimous choice.
- Forced participation for La minoria, which starts it at once.
- La minoria's settings for the admin: on or off, the description and the two option names.
- Data on the admin screen: export everything as JSON, and the movements as a CSV.
- Wiping the test data, only after typing ESBORRA, and locking the wipe for good once the real data is in.
- The Ruleta board: your last 10 results under the bet, newest on the left.
- Ruleta lowers your bet to the new maximum when a losing spin brings the maximum below it.

### Fixed

- Live screens, the audit above all, stopped updating while changes kept arriving faster than they could read. The ranking also left out anyone past the first 1,000 people.

### Changed

- A user can't be removed while they've accepted an open event, and removal declines their pending invitations.
- Removing someone invited to a duel cancels it, and refunds anyone who paid.

### Fixed

- The audit could show a movement twice on a busy night.
- The audit's filter was hard to read on Safari.
