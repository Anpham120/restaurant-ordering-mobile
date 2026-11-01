-- V5: lock an account after repeated wrong passwords, whatever IP the attempts come from (stored in the database so a
-- restart or a deploy does not reset it). A successful login or a password reset clears both columns.
alter table users add column failed_logins integer not null default 0;
alter table users add column locked_until timestamp(6);
alter table users add constraint ck_users_failed_logins check (failed_logins >= 0);
