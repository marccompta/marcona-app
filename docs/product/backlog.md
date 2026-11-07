# Backlog

Every requirement has a permanent ID. Raw input is kept in `docs/product/intake/`.

**Status:** `proposed`, `planned`, `active` (shipped), `superseded by REQ-NNN`, or `dropped`.
**Verification:** `test` (a test must cite the ID) or `manual` (checked at human review only).

## Requirements

| ID | Requirement | Status | Slice | Verification |
|---|---|---|---|---|
| REQ-001 | The system shall be served as a static site from GitHub Pages at `https://marccompta.github.io/marcona-app/`, with every asset loaded under the `/marcona-app/` base path. | active | 001 | test |
| REQ-002 | The system shall use hash-based routes, so that reloading a screen or opening a link to it at the public URL shows that screen. | active | 001 | test |
| REQ-003 | When a person submits a correct username and password, the system shall start a Supabase Auth session and show the ranking. | active | 001 | test |
| REQ-004 | The system shall ask people only for a username and a password, and shall map each username to a hidden placeholder email that never appears in the interface. | active | 001 | test |
| REQ-005 | If a login attempt fails, then the system shall show a Catalan error and keep the person on the login screen. | active | 001 | test |
| REQ-006 | While a session is valid, the system shall keep the user logged in across page reloads. | active | 001 | test |
| REQ-007 | When a user logs out, the system shall end their session and show the login screen. | active | 001 | test |
| REQ-008 | If a request has no logged-in session, then the system shall return no data from any table. | active | 001 | test |
| REQ-009 | The system shall have Row Level Security enabled on every table. | active | 001 | test |
| REQ-010 | If anyone tries to sign up through the public Auth API, then the system shall reject the request. | active | 001 | test |
| REQ-011 | While no other players exist, the system shall show the ranking screen with a styled Catalan empty state. | active | 001 | test |
| REQ-012 | While a user is logged in, the system shall show a fixed bottom tab bar. | active | 001 | test |
| REQ-013 | The system shall show the Administració tab only to the admin. | active | 001 | test |
| REQ-014 | The system shall show every visible word in natural Catalan, including errors, empty states, confirmations, the page title and metadata. | active | 001 | manual |
| REQ-015 | The system shall set `lang="ca"` on the document. | active | 001 | test |
| REQ-016 | The system shall format dates and numbers with `Intl` using the `ca-ES` locale and the `Europe/Madrid` time zone. | active | 001 | test |
| REQ-017 | The system shall use the correct Catalan singular and plural forms for amounts, such as 1 marcona and 2 marcones. | active | 001 | test |
| REQ-018 | The system shall keep all interface text in one place in the code. | active | 001 | manual |
| REQ-019 | If Supabase returns an error, then the system shall show a Catalan message and never the raw English text. | active | 001 | test |
| REQ-020 | The system shall keep the identity of the "Casino Tokens" artifact: felt greens `#073b2b`, `#0d5439` and `#116a49` with a soft radial glow, gold `#f0c24b`, ivory text `#f6f1dc`, sage secondary text `#9cc7b1`, serif headings, an italic gold logo with a ♠, rounded cards with fine borders, and pill status tags. | active | 001 | manual |
| REQ-021 | The system shall look premium rather than like a template, using felt texture, gold foil detail and refined transitions. | active | 001 | manual |
| REQ-022 | The system shall load all fonts from the site itself, with no requests to third-party font services. | active | 001 | test |
| REQ-023 | The system shall fit screens from 360px wide without horizontal scrolling. | active | 001 | test |
| REQ-024 | The system shall give every tappable control a tap target of at least 44px. | active | 001 | test |
| REQ-025 | The system shall respect device safe areas, such as the iPhone notch and home bar. | active | 001 | manual |
| REQ-026 | The system shall keep text contrast high enough to read comfortably in a dim room. | active | 001 | manual |
| REQ-027 | Where the site is opened in a desktop browser, the system shall remain usable. | active | 001 | manual |
| REQ-028 | When slice 001 is reviewed, the project shall show 2 or 3 rendered phone-sized visual directions from the "Casino Tokens" family, so the human can choose one before later screens are built. | active | 001 | manual |
| REQ-029 | The project shall record each installed tool and its job in `docs/tooling.md`, after checking its install command against official docs. | active | 001 | manual |
| REQ-030 | The project shall provide `docs/setup.md` with exact steps for everything the human must do: making the repo public, creating the Supabase project in an EU region, Auth settings, GitHub Pages and Actions settings, authorising MCP servers, installing plugins, and creating the admin account. | active | 001 | manual |
| REQ-031 | The repository shall contain no Supabase credential other than the project URL and publishable key, and no real password. | active | 001 | test |
| REQ-032 | The project shall keep migrations in `supabase/migrations/` and apply them to the hosted project, without relying on Docker or the local Supabase stack. | active | 001 | manual |
| REQ-033 | When a slice is under review, the project shall deploy that slice's branch to the public site. | active | 001 | manual |
| REQ-034 | The project shall scope the Supabase MCP server to this one project, with manual approval kept on. | superseded by REQ-206 | 001 | manual |
| REQ-035 | When the admin submits a valid new username and password, the system shall create the user with 0 marcones. | active | 002 | test |
| REQ-036 | If a new username isn't 3 to 20 characters of lowercase `[a-z0-9_-]`, then the system shall reject it. | active | 002 | test |
| REQ-037 | If a new username matches an existing user, including a removed one, then the system shall reject it. | active | 002 | test |
| REQ-038 | If a new password is shorter than Supabase's minimum length, then the system shall reject it. | active | 002 | test |
| REQ-039 | When the admin adds marcones to a user with a Concept, the system shall raise that user's balance and record a ledger movement. | active | 002 | test |
| REQ-040 | When the admin removes marcones from a user with a Concept, the system shall lower that user's balance and record a ledger movement. | active | 002 | test |
| REQ-041 | If an admin adjustment has no Concept, then the system shall reject it. | active | 002 | test |
| REQ-042 | If an admin adjustment isn't a whole number of at least 1, then the system shall reject it. | active | 002 | test |
| REQ-043 | If an admin removal would take a balance below 0, then the system shall reject it and change nothing. | active | 002 | test |
| REQ-044 | When the admin resets a user's password, the system shall set the new password. | active | 002 | test |
| REQ-045 | When the admin resets a user's password, the system shall end that user's sessions. | active | 002 | test |
| REQ-046 | The system shall offer password changes only to the admin. | active | 002 | test |
| REQ-047 | When the admin starts removing a user, the system shall ask for a second confirmation before acting. | active | 002 | test |
| REQ-048 | When the admin confirms a removal, the system shall soft-delete the user and block their login. | active | 002 | test |
| REQ-049 | When a user is removed, the system shall revoke their sessions. | active | 002 | test |
| REQ-050 | When a user is removed, the system shall take them out of the ranking. | active | 002 | test |
| REQ-051 | When a user is removed, the system shall keep their history in the audit. | active | 002 | test |
| REQ-052 | If the admin tries to remove themselves, then the system shall reject it. | active | 002 | test |
| REQ-053 | While a user is removed, every function and policy shall reject them, even if their access token hasn't expired. | active | 002 | test |
| REQ-054 | The system shall create, remove and reset users only through Edge Functions, with the secret key stored only in Supabase. | active | 002 | manual |
| REQ-055 | If anyone other than the active admin calls an admin function, then the system shall reject the request. | active | 002 | test |
| REQ-056 | The system shall allow exactly one admin. | active | 002 | test |
| REQ-057 | The system shall make every change to marcones in a single Postgres function, in one transaction, with row locks. | active | 002 | test |
| REQ-058 | If a client writes directly to any table with the public key, then the system shall reject the write. | active | 002 | test |
| REQ-059 | If anyone tries to update or delete a ledger row, then the system shall reject it. | active | 002 | test |
| REQ-060 | The system shall store the balance after each movement on its ledger row. | active | 002 | test |
| REQ-061 | If a movement would take a balance below 0, then a database constraint shall stop it. | active | 002 | test |
| REQ-062 | When a money action is submitted again with the same client request ID, the system shall return the first result and apply the action only once. | active | 002 | test |
| REQ-063 | When a user opens the ranking, the system shall list active users and their balances, highest first. | active | 002 | test |
| REQ-064 | While two users have the same balance, the system shall order them alphabetically in the ranking. | active | 002 | test |
| REQ-065 | The system shall show medals for the top three places in the ranking. | active | 002 | test |
| REQ-066 | When a user taps someone in the ranking, the system shall show that person's balance and every movement involving them. | active | 002 | test |
| REQ-067 | When a user opens the audit, the system shall show all movements in one timeline, newest first. | active | 002 | test |
| REQ-068 | When a user picks a person in the audit filter, the system shall show only that person's movements. | active | 002 | test |
| REQ-069 | The system shall show who, the amount, the concept or event, the balance after, and the timestamp on each audit row. | active | 002 | test |
| REQ-070 | The system shall show balances as chip stacks with count-up numbers. | active | 002 | manual |
| REQ-071 | When a user submits a valid classic event with a name, buy-in, invitees, and payout percentages for 1st, 2nd and 3rd, the system shall create it as open. | active | 003 | test |
| REQ-072 | When a classic event is created, the system shall make the creator an accepted participant and charge them the buy-in. | active | 003 | test |
| REQ-073 | The system shall default the payout percentages to 50, 30 and 20. | active | 003 | test |
| REQ-074 | If the payout percentages don't sum to 100, then the system shall reject the event. A place may be 0%. | active | 003 | test |
| REQ-075 | If a buy-in isn't a whole number of at least 1, then the system shall reject the event. | active | 003 | test |
| REQ-076 | If the creator's balance is below the buy-in, then the system shall reject the event. | active | 003 | test |
| REQ-077 | If an event has no invitees, then the system shall reject it. | active | 003 | test |
| REQ-078 | The system shall let the creator invite only other active users. | active | 003 | test |
| REQ-079 | When an invited user accepts, the system shall charge the buy-in immediately and make them an accepted participant. | active | 003 | test |
| REQ-080 | If an invited user's balance is below the buy-in when they accept, then the system shall reject the acceptance and leave them invited. | active | 003 | test |
| REQ-081 | When an invited user declines, the system shall record the decline without charging them. | active | 003 | test |
| REQ-082 | If a user answers an invitation that's no longer pending, then the system shall reject the answer. | active | 003 | test |
| REQ-083 | The system shall hold every event in one of three states, open, completed or cancelled, and shall allow only open to change. | active | 003 | test |
| REQ-084 | When the creator cancels an open event, the system shall cancel it and refund every accepted participant. | active | 003 | test |
| REQ-085 | When the admin cancels any open event, the system shall cancel it and refund every accepted participant. | active | 003 | test |
| REQ-086 | If anyone else tries to cancel an event, then the system shall reject it. | active | 003 | test |
| REQ-087 | If a participant who has paid tries to withdraw, then the system shall reject it. | active | 003 | test |
| REQ-088 | While a classic event is open with at least 2 accepted participants, counting the creator, the system shall let the creator complete it. | active | 003 | test |
| REQ-089 | If anyone else tries to complete an event, or fewer than 2 people have accepted, then the system shall reject it. | active | 003 | test |
| REQ-090 | The system shall calculate the pot as the buy-in times the number of accepted participants. | active | 003 | test |
| REQ-091 | When the creator completes a classic event with exactly 2 accepted participants, the system shall have them pick a winner and pay that person the whole pot. | active | 003 | test |
| REQ-092 | When the creator completes a classic event with 3 or more accepted participants, the system shall require a different participant for each place with a percentage above 0. | active | 003 | test |
| REQ-093 | When a classic event with 3 or more participants is paid out, the system shall round each share down and give the remainder to the first paid place, so the total equals the pot. | active | 003 | test |
| REQ-094 | When an event completes or is cancelled, the system shall lapse its pending invitations. | active | 003 | test |
| REQ-095 | When a user is removed, the system shall decline their pending invitations. | active | 003 | test |
| REQ-096 | If a user has accepted an open event, then the system shall block their removal. | active | 003 | test |
| REQ-097 | When a user opens Esdeveniments, the system shall group events into invitations for them, open events and past events. | active | 003 | test |
| REQ-098 | When a user opens an event, the system shall show its buy-in, pot, payout rule, participants and status, with a crown on the creator and a pill status tag. | active | 003 | test |
| REQ-099 | The system shall record every buy-in, refund and payout as a ledger movement linked to its event. | active | 003 | test |
| REQ-100 | The project shall include a smoke test of the main flows on a phone-sized screen, extended by each later slice. | active | 003 | test |
| REQ-101 | The system shall offer roulette from its own tab. | planned | 004 | test |
| REQ-102 | When a user chooses red or black and a valid bet and spins, the system shall resolve the spin on the server. | planned | 004 | test |
| REQ-103 | The system shall decide every spin with a secure random source on the server. | planned | 004 | test |
| REQ-104 | The system shall default the odds to red 18 in 37, black 18 in 37 and white 1 in 37. | planned | 004 | test |
| REQ-105 | When the result matches the chosen colour, the system shall double the bet, a net gain equal to the bet. | planned | 004 | test |
| REQ-106 | When the result is the other colour or white, the system shall take the bet. | planned | 004 | test |
| REQ-107 | If a bet isn't a whole number of at least 1, then the system shall reject it. | planned | 004 | test |
| REQ-108 | The system shall set the maximum bet to the configured percentage of the player's current balance, 5% by default, rounded down and never below 1. | planned | 004 | test |
| REQ-109 | The system shall show the player's current maximum bet on the roulette screen. | planned | 004 | test |
| REQ-110 | If a bet exceeds the maximum or the player's balance, then the server shall reject it. | planned | 004 | test |
| REQ-111 | When a spin resolves, the system shall record one ledger movement that shows the choice and the result in the audit. | planned | 004 | test |
| REQ-112 | The system shall animate only the result it receives from the server. | planned | 004 | test |
| REQ-113 | The system shall show a satisfying wheel or chip animation for each spin. | planned | 004 | manual |
| REQ-114 | Where the device asks for reduced motion, the system shall show the result without the spin animation. | planned | 004 | test |
| REQ-115 | When the admin changes the white chance, the system shall use it for later spins. | planned | 004 | test |
| REQ-116 | When the admin changes the maximum bet percentage, the system shall use it for later spins. | planned | 004 | test |
| REQ-117 | When the admin turns roulette off or on, the system shall apply it to later spins. | planned | 004 | test |
| REQ-118 | While roulette is off, the system shall reject spins. | planned | 004 | test |
| REQ-119 | If the admin enters invalid roulette settings, then the system shall reject them. | planned | 004 | test |
| REQ-120 | When a user creates an event, the system shall let them choose classic or any game that's turned on. | superseded by REQ-175 | 005 | test |
| REQ-121 | If a user creates an event for a game that's turned off, then the system shall reject it. | planned | 005 | test |
| REQ-122 | When a game event is created, the system shall store a copy of that game's current settings with the event. | planned | 005 | test |
| REQ-123 | The system shall take a game's buy-in from the creator and its rules from the settings stored with the event. | planned | 005 | test |
| REQ-124 | If anyone tries to pick a game's winners by hand, then the system shall reject it. | planned | 005 | test |
| REQ-125 | While a game is waiting for choices, the system shall let each accepted participant lock in one secret choice. | planned | 005 | test |
| REQ-126 | If a player tries to change a locked-in choice, then the system shall reject it. | superseded by REQ-205 | 005 | test |
| REQ-127 | When the last player locks in, the system shall reveal all choices and pay out in the same transaction. | planned | 005 | test |
| REQ-128 | While a game is unrevealed, the system shall let nobody read a secret choice, including through the API or Realtime. | planned | 005 | test |
| REQ-129 | When a user opens a game event, the system shall explain the game's rules and payoffs in full. | planned | 005 | test |
| REQ-130 | While a game is unrevealed, the system shall show who has locked in. | superseded by REQ-197 | 005 | test |
| REQ-131 | While a game is unrevealed, the system shall never hint at anyone's choice. | planned | 005 | test |
| REQ-132 | After a game is revealed, the system shall show every choice and payout. | planned | 005 | test |
| REQ-133 | When a game is revealed, the system shall play a dramatic reveal that respects reduced motion. | planned | 005 | manual |
| REQ-134 | While a player is waiting for a reveal, the system shall show it without a manual reload, whether or not live updates are built. | planned | 005 | test |
| REQ-135 | When the creator or admin cancels an unrevealed game, the system shall refund every accepted participant. | planned | 005 | test |
| REQ-136 | The system shall run Confia o traeix as a duel between the creator and exactly one invited opponent. | superseded by REQ-182 | 005 | test |
| REQ-137 | When the opponent declines a duel, the system shall cancel the event and refund the creator. | superseded by REQ-183 | 005 | test |
| REQ-138 | When the invited opponent of a duel is removed, the system shall cancel the event and refund the creator. | superseded by REQ-184 | 005 | test |
| REQ-139 | When a duel has both players, the system shall let each secretly choose Confia or Traeix. | planned | 005 | test |
| REQ-140 | When both players choose Confia, the system shall pay each the both-trust percentage of the buy-in, 150% by default. | planned | 005 | test |
| REQ-141 | When exactly one player chooses Traeix, the system shall pay that player the betrayer percentage, 250% by default, and the other the betrayed percentage, 0% by default. | planned | 005 | test |
| REQ-142 | When both players choose Traeix, the system shall pay each the both-betray percentage, 50% by default. | planned | 005 | test |
| REQ-143 | The system shall round each duel payout down to a whole number. | planned | 005 | test |
| REQ-144 | If duel settings don't satisfy betrayer > both trust > both betray ≥ betrayed, then the system shall reject them. | planned | 005 | test |
| REQ-145 | The system shall show duel payouts as normal ledger movements, with the house covering or keeping any difference. | planned | 005 | test |
| REQ-146 | When the admin turns a game on or off, the system shall apply it to new events. | planned | 005 | test |
| REQ-147 | When the admin edits a game's Catalan description or numbers, the system shall save them for new events. | planned | 005 | test |
| REQ-148 | While the admin edits a game's numbers, the system shall show a worked example that updates as they change. | planned | 005 | test |
| REQ-149 | When admin settings change, the system shall leave existing events unchanged. | planned | 005 | test |
| REQ-150 | When a balance changes, the system shall refresh the ranking on every logged-in phone without a reload. | planned | 006 | test |
| REQ-151 | When a movement is recorded, the system shall refresh the audit on every logged-in phone without a reload. | planned | 006 | test |
| REQ-152 | When an event changes, the system shall refresh events on every logged-in phone without a reload. | planned | 006 | test |
| REQ-153 | The system shall show a QR code on an admin screen that links to the site. | planned | 006 | test |
| REQ-154 | When a user adds the site to their home screen, the system shall open full screen like an app. | planned | 006 | manual |
| REQ-155 | The system shall run La minoria as a group game for 3 or more players. | planned | 007 | test |
| REQ-156 | While at least 3 people have accepted a La minoria event, the system shall let the creator start it. | planned | 007 | test |
| REQ-157 | If anyone else tries to start La minoria, or fewer than 3 have accepted, then the system shall reject it. | planned | 007 | test |
| REQ-158 | When the creator starts La minoria, the system shall lapse its pending invitations. | planned | 007 | test |
| REQ-159 | When La minoria has started, the system shall let each player secretly pick one of two options, labelled Cara and Creu by default. | superseded by REQ-193 | 007 | test |
| REQ-160 | When the admin edits the option labels, the system shall use them for new events. | planned | 007 | test |
| REQ-161 | When both options are chosen and one side is smaller, the system shall split the whole pot equally among that side, rounded down. | planned | 007 | test |
| REQ-162 | When a La minoria split leaves a remainder, the system shall give it to whoever on the smaller side locked in first. | planned | 007 | test |
| REQ-163 | If the sides tie, or everyone picks the same option, then the system shall refund everyone. | planned | 007 | test |
| REQ-164 | When the admin requests an export, the system shall download all users, events and ledger movements. | planned | 008 | test |
| REQ-165 | When the admin confirms a wipe, the system shall delete the test data. This is the only operation allowed to delete ledger rows. | planned | 008 | test |
| REQ-166 | If a wipe isn't explicitly confirmed, then the system shall change nothing. | planned | 008 | test |
| REQ-167 | If anyone other than the admin requests an export or a wipe, then the system shall reject it. | planned | 008 | test |
| REQ-168 | When the admin locks the wipe for the live event, the system shall reject every later wipe. | planned | 008 | test |
| REQ-169 | Before the feature freeze, the project shall complete a rehearsal on real phones, including iPhone and Android if available, with a checklist of every money flow. | planned | 008 | manual |
| REQ-170 | The project shall provide a one-page day-of guide in `docs/` covering a locked-out player, a stuck game and the site going down. | planned | 008 | manual |
| REQ-171 | The day before the event, the project shall confirm that the Supabase project is awake. | planned | 008 | manual |
| REQ-172 | Before the event, the project shall make `main` what's live on the public site. | planned | 008 | manual |
| REQ-173 | From the feature freeze, the project shall accept only fixes. | planned | 008 | manual |
| REQ-174 | From the feature freeze, the project shall switch the Supabase MCP server to `read_only=true`. | planned | 008 | manual |
| REQ-175 | When the admin creates an event, the system shall let them choose classic or any game that's turned on. | planned | 005 | test |
| REQ-176 | If anyone other than the admin tries to create a game event, then the system shall reject it. | planned | 005 | test |
| REQ-177 | The system shall offer only classic events to users other than the admin. | planned | 005 | test |
| REQ-178 | When the admin creates a game event, the system shall let them choose whether to play in it. | planned | 005 | test |
| REQ-179 | When the admin creates a game event as a player, the system shall make them an accepted participant and charge them the buy-in. | planned | 005 | test |
| REQ-180 | If the admin creates a game event as a player and their balance is below the buy-in, then the system shall reject the event. | planned | 005 | test |
| REQ-181 | When the admin creates a game event without playing, the system shall charge them nothing and leave them out of the players. | planned | 005 | test |
| REQ-182 | The system shall run Confia o traeix as a duel between exactly two players: the admin and one invited opponent, or two invited players. | planned | 005 | test |
| REQ-183 | When an invited player declines a duel, the system shall cancel the event and refund anyone who has paid. | planned | 005 | test |
| REQ-184 | When an invited player of a duel is removed, the system shall cancel the event and refund anyone who has paid. | planned | 005 | test |
| REQ-185 | The system shall count the admin towards La minoria's 3 players only if they're playing. | planned | 007 | test |
| REQ-186 | The system shall offer the option to force participation to the admin on every new event, and to nobody else. | active | 003 | test |
| REQ-187 | If anyone other than the admin asks to force participation, then the system shall reject it. | active | 003 | test |
| REQ-188 | When the admin creates a classic event with forced participation, the system shall make every invitee an accepted participant and charge them the buy-in at once, without waiting for them to accept. | active | 003 | test |
| REQ-189 | If any forced player's balance is below the buy-in, then the system shall reject the event, name those players, and charge nobody. | active | 003 | test |
| REQ-190 | The system shall show each forced buy-in in the audit as made by the admin. | active | 003 | test |
| REQ-191 | When the admin creates a duel with forced participation, the system shall charge every player and go straight to choosing. | planned | 005 | test |
| REQ-192 | When the admin creates a La minoria event with forced participation, the system shall charge every player and start it at once. | planned | 007 | test |
| REQ-193 | When La minoria has started, the system shall let each player secretly pick one of two options, labelled Blanc and Negre by default. | planned | 007 | test |
| REQ-194 | While a duel is unrevealed, the system shall tell nobody whether another player has locked in, through any screen, the API or Realtime. | planned | 005 | test |
| REQ-195 | While a duel is unrevealed, the system shall show a player the same resting screen whether or not they've locked in, so a glance at their phone reveals nothing. | planned | 005 | test |
| REQ-196 | When a player opens the private choice panel in a duel, the system shall show the choice buttons, or their own choice if they've locked in. | superseded by REQ-198 | 005 | test |
| REQ-197 | While a La minoria game is unrevealed, the system shall show who has locked in. | planned | 007 | test |
| REQ-198 | When a player opens the private choice panel in a duel, the system shall show both choice buttons, looking the same whether or not they've locked in. | planned | 005 | test |
| REQ-199 | When a player who hasn't locked in taps a choice button in a duel, the system shall lock that choice in at once, with no confirmation step. | superseded by REQ-202 | 005 | test |
| REQ-200 | When a duel choice is locked in, the system shall make that button glow clearly, once and briefly, and shall give no other feedback. | superseded by REQ-203 | 005 | test |
| REQ-201 | If a player taps a choice button in a duel after locking in, then the system shall keep their first choice and show no reaction at all. | superseded by REQ-204 | 005 | test |
| REQ-202 | When a player taps a choice button in a duel, the system shall save that choice at once, with no confirmation step, replacing any earlier choice of theirs. | planned | 005 | test |
| REQ-203 | When a duel tap is saved, the system shall make that button glow clearly for two seconds, and shall give no other feedback. | planned | 005 | test |
| REQ-204 | If a duel tap arrives after both players have picked, then the system shall leave the choices as they were and show the reveal. | planned | 005 | test |
| REQ-205 | If a player tries to change a locked-in choice in La minoria, then the system shall reject it. | planned | 007 | test |
| REQ-206 | The project shall scope the Supabase MCP server to this one project. Auto mode may stay on, and migrations don't need the human's manual approval. The other Supabase tools that can change something keep their `ask` rules. | active | 001 | test |
| REQ-207 | If a call to a Postgres function fails because the connection was lost, then the system shall show the no-connection message, not the general one. Seen in slice 004: every function call shows the general one. | proposed | - | test |
| REQ-208 | If two money actions for one user arrive together, then the system shall apply both with no deadlock error. Found reading the code in slice 004 and not reproduced: functions other than `spin()` claim a request before locking the user. No money is at risk, as one action would fail and roll back. | proposed | - | test |

## Slice roadmap

| Slice | Goal | Requirements | Status |
|---|---|---|---|
| 001 | Foundation: the stack and tools are in place, and the admin can log in on a phone at the public URL and see a styled, empty Catalan ranking. Includes the visual directions. | REQ-001 to REQ-033, REQ-206 | closed |
| 002 | Users and marcones: the admin manages users and marcones, and everyone sees the ranking, user details and audit. | REQ-035 to REQ-070 | closed |
| 003 | Classic events: the full event lifecycle, including payouts, refunds and rounding. | REQ-071 to REQ-100, REQ-186 to REQ-190 | closed |
| 004 | Roulette: spin, payout, audit and admin settings. | REQ-101 to REQ-119 | planned |
| 005 | Confia o traeix: the secret-choice engine, the first game, and admin game settings. | REQ-120 to REQ-149, REQ-175 to REQ-184, REQ-191, REQ-194 to REQ-196, REQ-198 to REQ-204 | planned |
| 006 | Extras: live updates, QR code and home screen install, in that order. Each can be dropped on its own. | REQ-150 to REQ-154 | planned |
| 007 | La minoria: the second game, on the same engine. | REQ-155 to REQ-163, REQ-185, REQ-192, REQ-193, REQ-197, REQ-205 | planned |
| 008 | Event readiness: export, data wipe, rehearsal and day-of guide. This slice can't be cut. | REQ-164 to REQ-174 | planned |

## Delivery plan

As soon as possible, with no target date. The human works from home and is available for reviews and approvals, so each slice starts as soon as the previous one is approved.

| Step | Build | Human |
|---|---|---|
| 1 | All specs | Approve them once |
| 2 | 001, starting with the visual directions | Setup walkthrough, pick a direction, review |
| 3 to 8 | 002, 003, 004, 005, 006, 007, in order | Review each slice |
| 9 | 008 | Review, rehearse on real phones, wipe, create the real accounts |

**The feature freeze** is 24 hours before the event. The date isn't needed until slice 008.

**If time runs short:** the cut order is 007 first, then 006 from the bottom (install, QR code, live updates), then 005, then 004. Slices 001, 002, 003 and 008 can't be cut, and 008 moves ahead of anything not yet built. Tell the human as soon as a cut looks likely.
