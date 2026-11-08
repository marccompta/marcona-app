-- REQ-150 to REQ-152: phones hear that a balance, a movement or an event changed,
-- and read the data again through the normal API, so Row Level Security still
-- decides what each person sees. Realtime checks each message against the same
-- policies before sending it.
--
-- REQ-128: private.choices is never published, and a lock-in writes no public
-- row before the reveal, so nothing here can hint at a choice or who has picked.
alter publication supabase_realtime
  add table public.profiles, public.ledger, public.events, public.event_participants;
