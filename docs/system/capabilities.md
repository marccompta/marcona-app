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
- Removal declines the person's pending invitations, and it's blocked while they've accepted an open event, whether or not it was forced. Removing someone invited to a duel also cancels that duel and refunds anyone who paid.
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
- Only the creator can complete a classic event, once at least 2 people are in. Nobody can complete a game by hand. The pot is the buy-in times the people in it.
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

## Confia o traeix

- Only the admin can create a game, and only while it's turned on. Nobody else is offered one, and the server refuses them.
- A duel has exactly two different players: the admin and one invited person, or two invited people when the admin isn't playing. An admin who plays pays at once, and one who doesn't pays nothing and shows as the organiser.
- A duel starts once both have paid. With forced participation, both pay at once and it starts straight away, or it's refused and those who can't pay are named.
- A decline cancels the duel and refunds anyone who paid. The admin can cancel an unrevealed duel, which refunds everyone in it.
- Each player picks Confia or Traeix in a private panel, with one tap and no confirmation. Each tap replaces the last, until both have picked. The moment the second person picks, the duel is revealed and paid, in one transaction. A tap after that changes nothing, and shows the reveal.
- Nobody can read a choice or tell who has picked before the reveal, including the admin and the player who made it, through any screen, the API or Realtime. If a duel gets stuck, the admin asks both players or cancels it.
- By default, both trusting pays each 150% of the buy-in, one betrayal pays the betrayer 250% and the other 0%, and both betraying pays each 50%. Each payout rounds down, and the house covers or keeps the difference. A payout of 0 writes no movement.
- Each duel keeps its own copy of the settings and description, so later changes leave it alone.
- The admin can turn a game on or off, and edit its Catalan description and numbers, for new events. The numbers are whole percentages from 0 to 1,000, with betrayer > both trust > both betray ≥ betrayed.

## Screens

- **Classificació:** active users by balance, then alphabetically, with medals on the top three and a "tu" pill. A styled empty state shows until a second active user exists. Tapping someone opens their balance and every movement on it.
- **Auditoria:** every movement, newest first, with who, the amount, the concept or event, the balance after and the time. A movement on an event opens it. A filter shows one person, including removed people.
- **Administració:** create users, adjust marcones, reset passwords, remove users, and change the roulette and game settings, with a worked example for a buy-in of 10 that follows the numbers. Only the admin has this tab.
- **Esdeveniments:** my invitations, open events and past events, with each one's buy-in, pot and status pill. **Nou esdeveniment** opens the form, where the admin also chooses the type and whether to play. A game shows its name in the list instead of a pot. An event shows its buy-in, pot, payout rule, results and participants, with a crown on the creator, and the actions open to this person.
- **A duel:** the same resting screen for everyone in it, whether or not they've picked: the rules, each payoff for this buy-in, the people, and **Tria en privat**, which opens the private panel. It checks for changes every 3 seconds until the reveal. The panel covers the screen, with two cards side by side, ivory Confia and red Traeix, and looks the same whether or not you've picked. A saved tap lights the card's outer border for 0.7 seconds, and nothing else changes. If the connection fails after one retry, it says so.
- **The reveal:** the screen brings two face-down cards into view, which turn one at a time, yours first, then the verdict and every choice and payout. A winner also gets the amount and confetti from roulette. The tap that completes the pair glows first. It plays once on each device. With reduced motion, the result shows at once and still.
- **Ruleta:** the balance, the wheel, red and black, the bet and the current maximum. The wheel starts on the tap and lands on the server's result, and only then do the result and balance show. On a win, the marcones won show large over the wheel for about a second, with confetti across the screen. With reduced motion, the wheel jumps to the result, the amount shows still, and there's no confetti. A closed table shows a message instead, and the tab stays.
- Balances show as chip stacks, with numbers that count up. With reduced motion they appear at once.

## Security

- Row Level Security is on for every table, and nothing is readable without a login.
- The browser can't write to any table, and nobody can change a ledger row.
- Secret choices are in a schema the API doesn't expose, and in no Realtime publication.
- Every policy and public function checks that the user is active, so a removal takes effect even on an unexpired token.
- There can only be one admin.
- Creating, removing and resetting users run in an Edge Function, and the secret key exists only in Supabase.
- Accounts made by automated tests only see each other, and real users never see them.
- The repo holds no secrets, and a test scans the working tree and every commit.
