# Product vision

MarcOna is a mobile-first website, entirely in Catalan, for tracking casino-style play chips called marcones among a group of friends during a single event, also called MarcOna. It should feel like a modern, fancy casino.

## Problem

The group needs one place to see who holds what and why, and to play for marcones during the event. Hidden-choice games only work if nobody can peek or cheat, and the site is static, so anyone can call the database directly. The server has to be what decides and records every result.

## Who it's for

- **Players:** the friends at the event, each on their own phone, often one-handed in a dim room.
- **The admin:** the organiser, who is also a player, and who manages users, marcones and game settings, and is the only one who can create games.

## What success looks like

- On the day, every player can log in on their phone at the public URL.
- Every marcona is accounted for: the ledger explains each balance, and no balance goes below 0.
- Classic events pay out correctly and exactly, down to rounding.
- Nobody can cheat from the browser, or see a secret choice before it's revealed.
- It looks premium, and recognisably belongs to the "Casino Tokens" artifact.
- The site is rehearsed on real phones and ready at least a day before the event.

## Out of scope

- Real money. Marcones are play chips.
- Public sign-ups, more than one admin, and self-service password changes.
- More than one MarcOna event, or use after it.
- Native apps. Home screen install is as far as it goes.
- A desktop-first design. Desktop just needs to work.
- The names, art or text of Another Door, which only inspired the games.
