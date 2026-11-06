# Slice 006 design

## Approach

Add `profiles`, `ledger`, `events` and `event_participants` to the Realtime publication. When a change arrives, the app refetches the screen's data through the normal reads, so Row Level Security still applies, and the message's content is never trusted. It also refetches when the phone wakes or reconnects.

The QR code is generated at build time from the site's URL and shown as an SVG. Home screen install uses a web manifest, icons and the Apple meta tags, all scoped to `/marcona-app/`.

## Affected components

| Component | Change |
|---|---|
| `supabase/migrations/` | Realtime publication |
| `src/` | Live refresh hook, QR screen |
| `public/` | Manifest and icons |
| `index.html` | Install metadata, in Catalan |

## Data changes

None to the schema. Four tables join the Realtime publication. `private.choices` doesn't.

## Decisions

- Refetching on change keeps the code small, and it's cheap for a group this size.
- The free plan's 200 peak Realtime connections is far more than the group needs.
- No service worker unless real phones show that install needs one.

## Tooling needed

The `qrcode` npm package, as a build-time dependency, to generate the SVG.

## Risks

| Risk | Mitigation |
|---|---|
| A phone sleeps and misses updates | Refetch on wake and on reconnect |
| A Realtime message exposes something secret | A test subscribes as a player during a game. Choices aren't in any published table, and a lock-in changes no published table |
| iPhone home screen apps keep their own login | Expected: players log in once more. The review and the day-of guide say so |

## How this will be reviewed

On the phone plus a second session: change a balance and watch it update, scan the QR code, then add the site to the home screen. It should take 5 minutes.
