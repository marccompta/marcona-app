# Rehearsal checklist

REQ-169: before the feature freeze, go through every money flow on real phones, on an iPhone and on an Android if you have one. It takes about an hour, and goes faster with a friend.

Do it on the real site, https://marccompta.github.io/marcona-app/, before the final wipe. Everything you create here is test data, and the wipe removes it.

## Before you start

- **Two phones:**
  - **Phone A** is yours, logged in as the admin.
  - **Phone B** is a player's, logged in as `assaig`, a rehearsal player you create in step 1 below.
  - Use an iPhone for one and an Android for the other if you have both. Write down which is which, as both count.
- **The demo players,** `demo-nuria` and `demo-pau`, play from the computer, in a PowerShell terminal in `C:\Repos\marcona-app`. Each command below names the event and the player, and an event name is one word, so nothing needs quotes.
- **Install:** on each phone, add the site to the home screen, and run the rehearsal from the home screen icon. On an iPhone, open the site in Safari, tap **Share**, then **Add to Home Screen**. On an Android, open it in Chrome, tap the **⋮** menu, then **Add to Home screen** or **Install app**.
- **Results:** tick a row once it works on every phone it uses. Write down anything that fails or looks wrong, with the row number and the phone, and give the list in your verdict.

1. On phone A, in **Administració**, create the user `assaig` with a password of your choice, and log in as `assaig` on phone B, from the home screen icon.
2. On the computer, run this. It cancels every open event first, then sets **you**, `demo-nuria` and `demo-pau` to exactly 100 marcones, adding or removing what's needed, with the concept `Preparació de la revisió`:

   ```powershell
   npm.cmd run demo -- fund 100
   ```

   It ends by listing those three accounts with `: 100`.

## 1. The site

| # | Check | Works |
|---|---|---|
| 1.1 | The QR code in **Administració**, scanned with phone B's camera, opens the site | ☐ |
| 1.2 | On both phones, the home screen icon opens full screen, as **MarcOna** | ☐ |
| 1.3 | On both phones, closing the app and opening it again keeps you logged in | ☐ |
| 1.4 | Log out on phone B. A wrong password shows a Catalan message. Log in again as `assaig` | ☐ |

## 2. The admin's marcones

| # | Check | Works |
|---|---|---|
| 2.1 | Phone B has **Classificació** open. On phone A, add 100 marcones to `assaig`, with a concept. Phone B's ranking shows them by itself | ☐ |
| 2.2 | On phone A, remove 5 from `assaig`. **Auditoria** shows both movements, with the concept and the balance after | ☐ |
| 2.3 | Removing more than their balance is refused, and nothing changes | ☐ |

## 3. A classic event

| # | Check | Works |
|---|---|---|
| 3.1 | On phone B, `assaig` creates an event named `Sopar` with a buy-in of 10, inviting you and `demo-nuria`. Their balance drops by 10 | ☐ |
| 3.2 | On phone A, accept it, and you pay 10. Then run `npm.cmd run demo -- decline Sopar demo-nuria`. On both phones, `demo-nuria` shows as declined | ☐ |
| 3.3 | On phone B, complete it, picking you. You get the pot of 20 | ☐ |
| 3.4 | On phone B, create `Podi` with a buy-in of 10, inviting you, `demo-nuria` and `demo-pau`. Accept it on phone A, then run `npm.cmd run demo -- accept Podi`. Complete it on phone B, with three different places. The pot of 40 pays 20, 12 and 8, as 50%, 30% and 20% | ☐ |
| 3.5 | On phone B, create `Cancel` with a buy-in of 10, inviting you. Without anyone answering, cancel it on phone B. `assaig` gets 10 back, and your invitation lapses | ☐ |
| 3.6 | On phone A, create a new event named `Forcat` with a buy-in of 5, inviting `assaig` and `demo-pau`, and tick **Participació obligatòria**. Everyone pays at once. Then cancel it, which refunds everyone | ☐ |
| 3.7 | Run `npm.cmd run demo -- status` to see `demo-pau`'s balance. On phone A, try the same with a buy-in above `demo-pau`'s balance but below yours. It's refused, and names everyone who can't pay, `demo-pau` among them | ☐ |

## 4. Ruleta

| # | Check | Works |
|---|---|---|
| 4.1 | On phone B, spin. The wheel starts on the tap, and the result and balance show only when it stops | ☐ |
| 4.2 | Spin until you've seen both. A win shows the amount and confetti, and adds the bet. A loss takes it | ☐ |
| 4.3 | A bet over the maximum shown is refused | ☐ |
| 4.4 | On phone A, set white to 1 in 2. On phone B, white comes up within a few spins, and loses. Put it back to 37 on phone A | ☐ |
| 4.5 | On phone A, close the table, and phone B sees it closed. Open it again | ☐ |

## 5. Confia o traeix

| # | Check | Works |
|---|---|---|
| 5.1 | On phone A, create a Confia o traeix duel named `Duel`, with **Hi jugo** ticked, inviting `assaig`. You pay at once. On phone B, `assaig` accepts and pays, and the duel starts | ☐ |
| 5.2 | Each of you picks in the private panel. Before the second pick, nothing on either screen shows who has picked | ☐ |
| 5.3 | The second pick reveals on both phones, with the cards, the verdict and the payouts the rules screen shows | ☐ |
| 5.4 | Play more duels the same way until you've seen both trusting, one betrayal and both betraying | ☐ |
| 5.5 | Create another duel, and decline it on phone B. It's cancelled, and you get your buy-in back | ☐ |
| 5.6 | Create another duel, accept it on phone B, then cancel it on phone A before anyone picks. Both are refunded | ☐ |

## 6. La minoria

| # | Check | Works |
|---|---|---|
| 6.1 | On phone A, create La minoria named `Minoria`, with **Hi jugo** ticked, inviting `assaig`, `demo-nuria` and `demo-pau`. On phone B, `assaig` accepts. Run `npm.cmd run demo -- accept Minoria demo-nuria`. **Comença el joc** stays dimmed until 3 are in, and lights up at 3 | ☐ |
| 6.2 | Run `npm.cmd run demo -- accept Minoria demo-pau`, then start it on phone A. Each person shows **Triant** | ☐ |
| 6.3 | Run `npm.cmd run demo -- pick Minoria Blanc demo-nuria`. Both phones show **Ha triat** for her, and never what she chose | ☐ |
| 6.4 | On both phones, pick **Blanc** and confirm. A confirmed choice is final, and the panel then shows only your own | ☐ |
| 6.5 | Run `npm.cmd run demo -- pick Minoria Negre demo-pau`. The last pick reveals on both phones: **Negre** wins, 1 against 3, and `demo-pau` takes the whole pot of 40 | ☐ |
| 6.6 | Set up another as in rows 6.1 and 6.2, named `Minoria2`. Run `npm.cmd run demo -- pick Minoria2 Blanc demo-nuria` and `npm.cmd run demo -- pick Minoria2 Negre demo-pau`, then pick **Blanc** on phone A and **Negre** on phone B. It's a tie, 2 against 2, and everyone gets their buy-in back | ☐ |

## 7. Live updates and the room

| # | Check | Works |
|---|---|---|
| 7.1 | With **Classificació** open on phone B, an adjustment on phone A shows within a few seconds, with no reload | ☐ |
| 7.2 | Lock phone B for a minute. Make an adjustment on phone A, then unlock phone B. It catches up by itself | ☐ |
| 7.3 | Turn airplane mode on and off on phone B. It catches up | ☐ |
| 7.4 | On mobile data instead of Wi-Fi, a spin on phone B and an adjustment on phone A still work | ☐ |

## 8. Accounts

| # | Check | Works |
|---|---|---|
| 8.1 | On phone A, reset `assaig`'s password. Phone B returns to the login when it comes back to the app. Log in with the new one | ☐ |
| 8.2 | On phone B, create an event inviting you, and accept it on phone A. Removing `assaig` is refused while it's open. Cancel the event, then remove `assaig`. Phone B returns to the login for good, and the audit keeps their history | ☐ |

## 9. Data

| # | Check | Works |
|---|---|---|
| 9.1 | On phone A, **Administració**, **Dades**: tap **Prepara l'exportació**, then each download button. The phone saves a JSON file and a CSV file. Note where it put them. If you have time, try it on the other phone too, logged in as the admin | ☐ |
| 9.2 | The CSV opens in a spreadsheet, with accents intact and one row per movement | ☐ |
| 9.3 | **Esborra-ho tot** stays dimmed until you type `ESBORRA` exactly. **Don't tap it**, and clear the field afterwards. The final wipe comes after your verdict | ☐ |

## Afterwards

- Put the roulette and game settings back as you want them for the event.
- Give the list of failures in your verdict. A fix goes in before the wipe. Anything that isn't a fix goes to the backlog.
- The final wipe, the real accounts and the lock follow the order in the [day-of guide](day-of-guide.md).
