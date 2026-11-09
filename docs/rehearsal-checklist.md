# Rehearsal checklist

REQ-169: before the feature freeze, go through every money flow on real phones, on an iPhone and on an Android if you have one. It takes about an hour, and goes faster with a friend.

Do it on the real site, https://marccompta.github.io/marcona-app/, before the final wipe. Everything you create here is test data, and the wipe removes it.

## Before you start

- **Phones:** the admin's phone, plus a player's phone. Use an iPhone for at least one of them, and an Android for the other if you have one.
- **Players:** create two rehearsal players from **Administració**, for example `assaig-1` and `assaig-2`, and log in as one of them on the second phone. The demo accounts can play from the computer, so you have enough people for La minoria:

  ```
  npm.cmd run demo -- fund 100
  ```

  `fund` cancels every open event first, and gives each demo player 100 marcones. `npm.cmd run demo -- status` shows each demo player's balance and pending invitations, and the commands in `AGENTS.md` accept, decline or pick for a demo player.
- **Install:** on each phone, add the site to the home screen, and run the rehearsal from the home screen icon.
- **Results:** tick each line on each phone. Write down anything that fails or looks wrong, with the phone and the step, and give the list in your verdict.

## 1. The site

| # | Check | iPhone | Android |
|---|---|---|---|
| 1.1 | The QR code in **Administració** opens the site when scanned | ☐ | ☐ |
| 1.2 | The home screen icon opens full screen, as **MarcOna** | ☐ | ☐ |
| 1.3 | Logging in, closing the app and opening it again keeps you logged in | ☐ | ☐ |
| 1.4 | A wrong password shows a Catalan message | ☐ | ☐ |

## 2. The admin's marcones

| # | Check | iPhone | Android |
|---|---|---|---|
| 2.1 | Add 100 marcones to each rehearsal player, with a concept. The player's ranking updates by itself | ☐ | ☐ |
| 2.2 | Remove 5 from one. The audit shows both movements, with the concept and the balance after | ☐ | ☐ |
| 2.3 | Removing more than their balance is refused, and nothing changes | ☐ | ☐ |

## 3. A classic event

| # | Check | iPhone | Android |
|---|---|---|---|
| 3.1 | The player creates an event with a buy-in of 10, inviting the admin and a demo player. Their balance drops by 10 | ☐ | ☐ |
| 3.2 | The admin accepts on their phone and pays 10. The demo player declines from the computer | ☐ | ☐ |
| 3.3 | The creator completes it with 2 people, picking the admin. The admin gets the pot of 20 | ☐ | ☐ |
| 3.4 | A second event with 3 people in it pays 50%, 30% and 20%, rounded down, with the remainder to 1st | ☐ | ☐ |
| 3.5 | A third event, cancelled by its creator, refunds everyone, and pending invitations lapse | ☐ | ☐ |
| 3.6 | The admin forces participation on an event, and every invitee pays at once | ☐ | ☐ |
| 3.7 | Forcing someone who can't pay is refused, and names them | ☐ | ☐ |

## 4. Ruleta

| # | Check | iPhone | Android |
|---|---|---|---|
| 4.1 | A spin starts the wheel on the tap, and the result and balance show only when it stops | ☐ | ☐ |
| 4.2 | A win shows the amount and confetti, and adds the bet. A loss takes it | ☐ | ☐ |
| 4.3 | A bet over the maximum is refused | ☐ | ☐ |
| 4.4 | The admin sets white to 1 in 2, and a white comes up within a few spins and loses. Put it back afterwards | ☐ | ☐ |
| 4.5 | The admin closes the table, and the player sees it closed. Open it again afterwards | ☐ | ☐ |

## 5. Confia o traeix

| # | Check | iPhone | Android |
|---|---|---|---|
| 5.1 | The admin creates a duel between the two phones' players, or plays against the player. Both pay once both accept | ☐ | ☐ |
| 5.2 | Each picks in the private panel. Before the second pick, nothing on either screen shows who has picked | ☐ | ☐ |
| 5.3 | The second pick reveals on both phones, with the cards, the verdict and the payouts from the rules screen | ☐ | ☐ |
| 5.4 | Play it again until you've seen both trusting, one betrayal and both betraying | ☐ | ☐ |
| 5.5 | A decline cancels a duel and refunds whoever paid | ☐ | ☐ |
| 5.6 | The admin cancels an unrevealed duel, and both are refunded | ☐ | ☐ |

## 6. La minoria

| # | Check | iPhone | Android |
|---|---|---|---|
| 6.1 | The admin creates La minoria with the two phones' players and a demo player. **Comença el joc** stays dimmed until 3 have paid | ☐ | ☐ |
| 6.2 | The creator starts it. Each person shows **Triant**, then **Ha triat**, and never what they chose | ☐ | ☐ |
| 6.3 | A confirmed choice is final, and the panel then only shows your own | ☐ | ☐ |
| 6.4 | The last pick reveals on every phone. The smaller side splits the pot, with the remainder to whoever locked in first | ☐ | ☐ |
| 6.5 | A tie, or everyone picking the same, refunds everyone | ☐ | ☐ |

## 7. Live updates and the room

| # | Check | iPhone | Android |
|---|---|---|---|
| 7.1 | With the ranking open on the player's phone, an admin adjustment shows within a few seconds, with no reload | ☐ | ☐ |
| 7.2 | Lock the phone for a minute, unlock it, and the screen catches up by itself | ☐ | ☐ |
| 7.3 | Turn on airplane mode, then off. The screen catches up | ☐ | ☐ |
| 7.4 | On mobile data instead of Wi-Fi, a spin and a pick still work | ☐ | ☐ |

## 8. Accounts

| # | Check | iPhone | Android |
|---|---|---|---|
| 8.1 | The admin resets a player's password. Their phone returns to the login when it comes back to the app | ☐ | ☐ |
| 8.2 | Removing a player in an open event is refused. Removing them afterwards sends their phone to the login, and keeps their history in the audit | ☐ | ☐ |

## 9. Data

| # | Check | iPhone | Android |
|---|---|---|---|
| 9.1 | **Prepara l'exportació**, then each download link, saves a JSON file and a CSV file on the admin's phone. Note where the phone put them | ☐ | ☐ |
| 9.2 | The CSV opens in a spreadsheet, with accents intact and one row per movement | ☐ | ☐ |
| 9.3 | **Esborra-ho tot** stays dimmed until you type `ESBORRA` exactly. Don't press it here: the final wipe comes after the verdict | ☐ | ☐ |

## Afterwards

- Put the roulette and game settings back as you want them for the event.
- Give the list of failures in your verdict. A fix goes in before the wipe. Anything that isn't a fix goes to the backlog.
- The final wipe, the real accounts and the lock follow the order in the [day-of guide](day-of-guide.md).
