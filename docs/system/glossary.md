# Glossary

Domain terms, used the same way in specs, code and conversation. Specs, code and history are in English. The interface uses the Catalan column.

## Product terms

| Term | Catalan | Meaning |
|---|---|---|
| MarcOna | MarcOna | The website, and the real-world gathering it's built for. |
| The gathering | | The real-world MarcOna day. Used in specs so it isn't confused with an in-app event. |
| Marcona, marcones | marcona, marcones | The play chips tracked by the site. Not AI tokens, and not real money. |
| Admin | Administració | The one organiser, who is also a player. |
| Player | Jugador | Any active user, including the admin. |
| Removed user | | A soft-deleted user: can't log in, not in the ranking, history kept in the audit. |
| Test account | | An account made by automated tests. It only sees other test accounts, and real users never see it. |
| Demo user | | An ordinary account used in reviews. The wipe deletes it. |
| Client request ID | | The ID a phone sends with a money action, so a repeat applies only once. |
| Ledger | | The append-only record of every change to a balance. Each row stores the balance after it. |
| Movement | Moviment | One ledger row. |
| Live update | | A screen reading its data again because Realtime said a published table changed, with no reload. |
| Balance | Saldo | A user's current marcones. |
| Concept | Concepte | The required reason on an admin adjustment. |
| Ranking | Classificació | Active users by balance, highest first. |
| Audit | Auditoria | The global timeline of movements, newest first. |
| Event | Esdeveniment | An in-app event: classic or a game. Not the gathering. |
| Classic event | | An event whose winners the creator picks by hand. |
| Game | Joc | An event type resolved by the server from secret choices. Only the admin can create one. |
| Creator | | The user who created an event. Any user for a classic event, where they're always a participant. Only the admin for a game, where they may or may not play. |
| Invitee | | A user invited to an event who hasn't answered yet. |
| Participant | Participant | A user who has accepted an event and paid the buy-in, or whom the admin forced in. |
| Forced participation | Participació obligatòria | An option only the admin has: every invitee joins and pays at once, without accepting. |
| Buy-in | Entrada | What each participant pays to join an event. |
| Pot | Pot | Buy-in times accepted participants. Wording flagged, see below. |
| Lapse | Caducada | What happens to a pending invitation when its event moves on. No one is charged. |
| Secret choice | | A player's hidden pick in a game. |
| Lock in | | To submit a secret choice. In La minoria it can't then be changed. In a duel, each tap replaces it until both players have picked. |
| Choice panel | Tria en privat | The private panel in a game where a player chooses. In a duel, one tap saves, and it looks the same whether or not they've chosen. In La minoria, a player confirms a choice, after which it only shows that choice. |
| Start | Comença el joc | The creator's step that moves La minoria from inviting to choosing, once at least 3 have paid. |
| Smaller side | Bàndol més petit | In La minoria, the option fewer people picked, which splits the pot. |
| Remainder | Residu | What's left of La minoria's pot after the equal split, for whoever on the smaller side locked in first. |
| Phase | | Where a game is: inviting, choosing or revealed. An event's status says whether it's open, and its phase says how far a game has got. |
| Organiser | Organitza | The admin, when they run a game without playing in it. |
| Reveal | | The moment a game shows every choice and payout. |
| The house | La banca | Covers or keeps any difference in roulette and duels. It has no account or balance. |
| Confia o traeix | Confia o traeix | The two-player duel. Choices: Confia (trust) and Traeix (betray). |
| La minoria | La minoria | The group game for 3 or more. Default choices: Blanc and Negre. |
| Roulette | Ruleta | The red, black and white wheel in its own tab. |
| Red, black, white | Vermell, Negre, Blanc | The roulette colours. White always loses. |
| Spin | | One roulette bet and its result. One spin is one movement. |
| Maximum bet | Aposta màxima | The most a player can bet now: a percentage of their balance, rounded down and never below 1. |
| The table | La taula | Roulette as the admin opens or closes it. |
| Feature freeze | | From 24 hours before the gathering, only fixes are made. |
| Wipe | | The admin's confirmed deletion of test data before the gathering. |

## Wording to check

- **Pot:** kept from the starter glossary, but in everyday Catalan "pot" also means a jar, and "pot" is a form of "poder". It should read clearly in context, but it's the one term flagged for the human to check.
- **Gendered nouns:** Catalan words like "creador" and "guanyador" are gendered, and so is "jugador". Screens should use neutral phrasing, such as "Qui l'ha creat", where that reads naturally.
