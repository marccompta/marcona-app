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
- Removal declines the person's pending invitations, and it's blocked while they've accepted an open event, whether or not it was forced.
- A phone notices a reset or a removal when it reloads or comes back to the tab, and returns to the login.

## Marcones

- New users start with 0 marcones. Only the admin can add or remove them, with a required Concept and a whole amount of at least 1.
- A balance can't go below 0.
- Every change is a movement in an append-only ledger, which stores the balance after it.
- Sending the same action twice, or two at the same moment, can't apply it twice or overdraw a balance.

## Events

- Anyone can create a classic event with a name of up to 40 characters, a whole buy-in of at least 1, and at least one invitee from the other active users. Payout percentages for 1st, 2nd and 3rd start at 50, 30 and 20, must sum to 100, and a place may be 0%.
- The creator is always a participant, and pays when the event is created.
- An invited person can accept, which charges the buy-in at once, or decline. They can be invited with too low a balance, but can't accept until they have enough.
- A participant who has paid can't withdraw.
- An event is open, completed or cancelled, and only an open one can change.
- The creator or the admin can cancel an open event, with a second confirmation, which refunds everyone in it.
- Only the creator can complete an event, once at least 2 people are in. The pot is the buy-in times the people in it.
- With 2 people, the creator picks a winner, who takes the pot. With 3 or more, they pick a different person for each paid place. Each share rounds down, and the remainder goes to the first paid place, so the total equals the pot.
- Pending invitations lapse when an event completes or is cancelled.
- The admin can force participation on a new event: every invitee joins and pays at once, or the event is rejected and those who can't pay are named. Nobody else can.
- Every buy-in, refund and payout is a movement linked to its event. A forced buy-in shows who made it.

## Roulette

- A player picks red or black and bets. White can't be chosen, and always loses.
- The server decides every spin with a secure random source. The odds start at 18, 18 and 1 in 37.
- A win pays a net gain equal to the bet, and a loss takes the bet.
- A bet is a whole number of at least 1. The maximum is a percentage of the balance, 5% by default, rounded down and never below 1, and a bet can't exceed the balance.
- Each spin is one movement, and the audit shows the choice and the result.
- Sending the same spin twice can't apply it twice, and a retry after a lost reply gets the first result.
- The admin can set white from 1 in 2 to 1 in 1,000, set the maximum bet from 1% to 100%, and open or close the table. Changes apply to later spins.

## Screens

- **Classificació:** active users by balance, then alphabetically, with medals on the top three and a "tu" pill. A styled empty state shows until a second active user exists. Tapping someone opens their balance and every movement on it.
- **Auditoria:** every movement, newest first, with who, the amount, the concept or event, the balance after and the time. A movement on an event opens it. A filter shows one person, including removed people.
- **Administració:** create users, adjust marcones, reset passwords, remove users, and change the roulette settings. Only the admin has this tab.
- **Esdeveniments:** my invitations, open events and past events, with each one's buy-in, pot and status pill. **Nou esdeveniment** opens the form. An event shows its buy-in, pot, payout rule, results and participants, with a crown on the creator, and the actions open to this person.
- **Ruleta:** the balance, the wheel, red and black, the bet and the current maximum. The wheel starts on the tap and lands on the server's result, and only then do the result and balance show. On a win, the marcones won show large over the wheel for about a second, with confetti across the screen. With reduced motion, the wheel jumps to the result, the amount shows still, and there's no confetti. A closed table shows a message instead, and the tab stays.
- Balances show as chip stacks, with numbers that count up. With reduced motion they appear at once.

## Security

- Row Level Security is on for every table, and nothing is readable without a login.
- The browser can't write to any table, and nobody can change a ledger row.
- Every policy and public function checks that the user is active, so a removal takes effect even on an unexpired token.
- There can only be one admin.
- Creating, removing and resetting users run in an Edge Function, and the secret key exists only in Supabase.
- Accounts made by automated tests only see each other, and real users never see them.
- The repo holds no secrets, and a test scans the working tree and every commit.
