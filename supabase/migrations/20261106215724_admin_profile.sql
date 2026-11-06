-- The admin account was created by hand in the dashboard (docs/setup.md, step 7).
insert into public.profiles (user_id, username, role)
select id, 'marccompta', 'admin'
from auth.users
where email = 'marccompta@marcona.invalid';
