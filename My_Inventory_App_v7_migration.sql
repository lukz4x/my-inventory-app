-- ============================================================================
-- My_Inventory_App — Supabase SQL Migration v7 (web-pivot lock)
-- ============================================================================
-- Run against a fresh Supabase project (Postgres 15+).
--
-- v7 changes (vs v6):
--   - system_config table for global toggles (AI kill switch, budget tracking)
--   - admin_grant_credits() and admin_set_credits() helper functions
--   - admin_users table for hardcoded admin allowlist
--   - cost-tracking integration in commit_credits
--
-- v6 changes (vs v5) — kept:
--   - REVOKE EXECUTE on credit functions (callable only via service_role)
--   - reserve_credits validation (amount > 0, valid reason)
--   - commit_credits writes reservation_id as reference_id
--
-- v1-v5 — kept (see prior version headers)
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- ----------------------------------------------------------------------------

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";
create extension if not exists "unaccent";
create extension if not exists "vector";


-- ----------------------------------------------------------------------------
-- 2. TABLES
-- ----------------------------------------------------------------------------

create table public.households (
    id              uuid primary key default uuid_generate_v4(),
    owner_user_id   uuid not null references auth.users(id) on delete cascade,
    name            text not null,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create table public.household_members (
    id              uuid primary key default uuid_generate_v4(),
    household_id    uuid not null references public.households(id) on delete cascade,
    user_id         uuid not null references auth.users(id) on delete cascade,
    role            text not null default 'owner' check (role in ('owner','member')),
    created_at      timestamptz not null default now(),
    unique (household_id, user_id)
);

create table public.locations (
    id                      uuid primary key default uuid_generate_v4(),
    household_id            uuid not null references public.households(id) on delete cascade,
    parent_location_id      uuid references public.locations(id) on delete cascade,
    name                    text not null,
    icon                    text,
    background_photo_url    text,
    color_tint              text,
    sort_order              integer not null default 0,
    created_at              timestamptz not null default now(),
    updated_at              timestamptz not null default now()
);

create table public.categories (
    id                  uuid primary key default uuid_generate_v4(),
    name                text not null,
    parent_category_id  uuid references public.categories(id) on delete set null,
    embedding           vector(1536),
    usage_count         integer not null default 0,
    canonical_name      text,
    is_canonical        boolean not null default false,
    created_at          timestamptz not null default now()
);

create table public.user_categories (
    id              uuid primary key default uuid_generate_v4(),
    household_id    uuid not null references public.households(id) on delete cascade,
    name            text not null,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    unique (household_id, name)
);

create table public.items (
    id                          uuid primary key default uuid_generate_v4(),
    household_id                uuid not null references public.households(id) on delete cascade,
    location_id                 uuid not null references public.locations(id) on delete cascade,
    name                        text not null default '',
    ai_suggested_name           text,
    ai_confidence               real,
    ai_source                   text check (ai_source in ('vision_local','vision_cloud','text_only')),
    ai_last_classified_at       timestamptz,
    category_id                 uuid references public.categories(id) on delete set null,
    user_category_id            uuid references public.user_categories(id) on delete set null,
    user_category_name_cache    text,
    quantity                    integer not null default 1 check (quantity >= 1),
    use_count                   integer not null default 0,
    last_used_at                timestamptz,
    notes                       text,
    acquired_at                 timestamptz,
    last_seen_at                timestamptz not null default now(),
    created_at                  timestamptz not null default now(),
    updated_at                  timestamptz not null default now(),
    search_vector               tsvector  -- maintained by trigger (FIX v3 #1)
);

create table public.item_photos (
    id              uuid primary key default uuid_generate_v4(),
    item_id         uuid not null references public.items(id) on delete cascade,
    photo_url       text not null,
    is_primary      boolean not null default false,
    photo_type      text,
    created_at      timestamptz not null default now()
);

create table public.usage_events (
    id              uuid primary key default uuid_generate_v4(),
    household_id    uuid not null references public.households(id) on delete cascade,
    user_id         uuid not null references auth.users(id) on delete cascade,
    event_type      text not null,
    session_id      uuid,
    metadata        jsonb not null default '{}'::jsonb,
    created_at      timestamptz not null default now()
);

-- monetization: user_subscriptions (one row per user) ------------------------

create table public.user_subscriptions (
    id                              uuid primary key default uuid_generate_v4(),
    user_id                         uuid not null unique references auth.users(id) on delete cascade,
    tier                            text not null default 'free' check (tier in ('free','pro_monthly','pro_annual')),
    status                          text not null default 'active' check (status in ('active','expired','cancelled','in_grace_period')),
    credits_balance                 integer not null default 20 check (credits_balance >= 0),
    credits_reserved                integer not null default 0 check (credits_reserved >= 0),
    credits_lifetime_used           integer not null default 0,
    current_period_started_at       timestamptz,
    current_period_ends_at          timestamptz,
    apple_transaction_id            text,
    apple_original_transaction_id   text,
    created_at                      timestamptz not null default now(),
    updated_at                      timestamptz not null default now()
);

-- monetization: credit_reservations (two-phase commit) -----------------------

create table public.credit_reservations (
    id              uuid primary key default uuid_generate_v4(),
    user_id         uuid not null references auth.users(id) on delete cascade,
    amount          integer not null check (amount > 0),
    reason          text not null check (reason in ('cloud_vision','text_classify','embedding')),
    status          text not null default 'reserved' check (status in ('reserved','committed','released')),
    expires_at      timestamptz not null default (now() + interval '60 seconds'),
    created_at      timestamptz not null default now()
);

-- monetization: credit_transactions (append-only ledger) ---------------------

create table public.credit_transactions (
    id                  uuid primary key default uuid_generate_v4(),
    user_id             uuid not null references auth.users(id) on delete cascade,
    amount              integer not null,
    transaction_type    text not null check (transaction_type in (
                            'signup_grant',
                            'subscription_refill',
                            'pack_purchase',
                            'ai_scan',
                            'release_reservation',
                            'subscription_started',
                            'subscription_expired',
                            'admin_adjustment'
                        )),
    reference_id        text,
    balance_after       integer not null,
    created_at          timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- 3. INDEXES
-- ----------------------------------------------------------------------------

create index idx_locations_household on public.locations(household_id);
create index idx_locations_parent on public.locations(parent_location_id);

create index idx_categories_parent on public.categories(parent_category_id);
create index idx_categories_usage on public.categories(usage_count desc);
create index idx_categories_embedding on public.categories
    using hnsw (embedding vector_cosine_ops);

create index idx_user_categories_household on public.user_categories(household_id);

create index idx_items_household on public.items(household_id);
create index idx_items_location on public.items(location_id);
create index idx_items_household_use_count on public.items(household_id, use_count desc, last_used_at desc, created_at desc);
create index idx_items_search_vector on public.items using gin(search_vector);
create index idx_items_name_trgm on public.items using gin(name gin_trgm_ops);
create index idx_items_ai_name_trgm on public.items using gin(ai_suggested_name gin_trgm_ops);

create index idx_item_photos_item on public.item_photos(item_id);
create unique index idx_item_photos_one_primary
    on public.item_photos(item_id) where is_primary = true;

create index idx_usage_events_household_created on public.usage_events(household_id, created_at desc);
create index idx_usage_events_user_created on public.usage_events(user_id, created_at desc);
create index idx_usage_events_type_created on public.usage_events(event_type, created_at desc);
create index idx_usage_events_session on public.usage_events(session_id);
create index idx_usage_events_metadata on public.usage_events using gin(metadata);

-- monetization indexes
create index idx_credit_reservations_user_status on public.credit_reservations(user_id, status);
create index idx_credit_reservations_expires on public.credit_reservations(expires_at) where status = 'reserved';
create index idx_credit_transactions_user_created on public.credit_transactions(user_id, created_at desc);
create index idx_credit_transactions_type on public.credit_transactions(transaction_type);


-- ----------------------------------------------------------------------------
-- 4. TRIGGERS — UPDATED_AT
-- ----------------------------------------------------------------------------

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger trg_households_touch        before update on public.households       for each row execute function public.touch_updated_at();
create trigger trg_locations_touch         before update on public.locations        for each row execute function public.touch_updated_at();
create trigger trg_user_categories_touch   before update on public.user_categories  for each row execute function public.touch_updated_at();
create trigger trg_items_touch             before update on public.items            for each row execute function public.touch_updated_at();


-- ----------------------------------------------------------------------------
-- 5. TRIGGERS — items field maintenance (combined, FIX v4)
-- ----------------------------------------------------------------------------
-- Single BEFORE trigger that:
--   1. Syncs user_category_name_cache when user_category_id changes
--   2. Recomputes search_vector from the row's current state
-- Combined to eliminate trigger-ordering ambiguity (Postgres fires
-- same-timing triggers alphabetically by name).

create or replace function public.items_before_write()
returns trigger language plpgsql as $$
begin
    -- Step 1: sync user_category_name_cache
    if new.user_category_id is null then
        new.user_category_name_cache := null;
    elsif tg_op = 'INSERT' or new.user_category_id is distinct from old.user_category_id then
        select name into new.user_category_name_cache
            from public.user_categories
            where id = new.user_category_id;
    end if;

    -- Step 2: recompute search_vector from current NEW state
    new.search_vector :=
        setweight(to_tsvector('simple', unaccent(coalesce(new.name, ''))), 'A') ||
        setweight(to_tsvector('simple', unaccent(coalesce(new.ai_suggested_name, ''))), 'B') ||
        setweight(to_tsvector('simple', unaccent(coalesce(new.user_category_name_cache, ''))), 'C') ||
        setweight(to_tsvector('simple', unaccent(coalesce(new.notes, ''))), 'D');

    return new;
end;
$$;

create trigger trg_items_before_write
    before insert or update of name, ai_suggested_name, notes, user_category_id, user_category_name_cache on public.items
    for each row execute function public.items_before_write();


-- ----------------------------------------------------------------------------
-- 6. TRIGGERS — auto-create household on signup
-- ----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
    new_household_id uuid;
begin
    insert into public.households (owner_user_id, name)
    values (new.id, 'My Home')
    returning id into new_household_id;

    insert into public.household_members (household_id, user_id, role)
    values (new_household_id, new.id, 'owner');

    insert into public.locations (household_id, name, icon)
    values (new_household_id, 'Unsorted', 'tray');

    -- Web v1: 20 free image AI Captures lifetime (not 500 — that was iOS plan).
    -- Manual entry, photos, search, and text classification are unlimited.
    insert into public.user_subscriptions (user_id, tier, status, credits_balance)
    values (new.id, 'free', 'active', 20);

    insert into public.credit_transactions (user_id, amount, transaction_type, balance_after)
    values (new.id, 20, 'signup_grant', 20);

    return new;
end;
$$;

create trigger trg_on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();


-- ----------------------------------------------------------------------------
-- 7. TRIGGERS — category usage_count chain
-- ----------------------------------------------------------------------------

create or replace function public._increment_category_chain(cat uuid)
returns void language plpgsql as $$
declare
    cur_cat uuid := cat;
begin
    while cur_cat is not null loop
        update public.categories
            set usage_count = usage_count + 1
            where id = cur_cat;
        select parent_category_id into cur_cat
            from public.categories where id = cur_cat;
    end loop;
end;
$$;

create or replace function public._decrement_category_chain(cat uuid)
returns void language plpgsql as $$
declare
    cur_cat uuid := cat;
begin
    while cur_cat is not null loop
        update public.categories
            set usage_count = greatest(usage_count - 1, 0)
            where id = cur_cat;
        select parent_category_id into cur_cat
            from public.categories where id = cur_cat;
    end loop;
end;
$$;

create or replace function public.items_category_insert()
returns trigger language plpgsql as $$
begin
    if new.category_id is not null then
        perform public._increment_category_chain(new.category_id);
    end if;
    return new;
end;
$$;

create or replace function public.items_category_update()
returns trigger language plpgsql as $$
begin
    if new.category_id is distinct from old.category_id then
        if old.category_id is not null then
            perform public._decrement_category_chain(old.category_id);
        end if;
        if new.category_id is not null then
            perform public._increment_category_chain(new.category_id);
        end if;
    end if;
    return new;
end;
$$;

create trigger trg_items_category_insert
    after insert on public.items
    for each row execute function public.items_category_insert();

create trigger trg_items_category_update
    after update of category_id on public.items
    for each row execute function public.items_category_update();


-- ----------------------------------------------------------------------------
-- 8. TRIGGERS — user_category rename propagation
-- ----------------------------------------------------------------------------
-- Note: cache sync on items.user_category_id changes is handled by
-- trg_items_before_write (section 5). This trigger only handles the
-- reverse direction: when a user_category is renamed, propagate to
-- all items that reference it.

create or replace function public.user_categories_propagate_rename()
returns trigger language plpgsql as $$
begin
    if new.name is distinct from old.name then
        update public.items
            set user_category_name_cache = new.name
            where user_category_id = new.id;
    end if;
    return new;
end;
$$;

create trigger trg_user_categories_rename
    after update of name on public.user_categories
    for each row execute function public.user_categories_propagate_rename();


-- ----------------------------------------------------------------------------
-- 9. TRIGGERS — location cycle prevention
-- ----------------------------------------------------------------------------

create or replace function public.locations_check_no_cycle()
returns trigger language plpgsql as $$
declare
    ancestor uuid := new.parent_location_id;
    visited int := 0;
begin
    if new.parent_location_id is null then
        return new;
    end if;

    if new.parent_location_id = new.id then
        raise exception 'Location cannot be its own parent';
    end if;

    while ancestor is not null loop
        if ancestor = new.id then
            raise exception 'Location hierarchy would create a cycle';
        end if;

        select parent_location_id into ancestor
            from public.locations where id = ancestor;

        visited := visited + 1;
        if visited > 100 then
            raise exception 'Location ancestor walk exceeded 100 levels';
        end if;
    end loop;

    return new;
end;
$$;

create trigger trg_locations_check_cycle
    before insert or update of parent_location_id on public.locations
    for each row execute function public.locations_check_no_cycle();


-- ----------------------------------------------------------------------------
-- 10. TRIGGERS — same-household integrity (FIX v3 #2)
-- ----------------------------------------------------------------------------

-- A location's parent must belong to the same household.
create or replace function public.locations_check_parent_household()
returns trigger language plpgsql as $$
declare
    parent_household uuid;
begin
    if new.parent_location_id is null then
        return new;
    end if;

    select household_id into parent_household
        from public.locations
        where id = new.parent_location_id;

    if parent_household is null then
        raise exception 'Parent location does not exist';
    end if;

    if parent_household <> new.household_id then
        raise exception 'Parent location belongs to a different household';
    end if;

    return new;
end;
$$;

create trigger trg_locations_check_parent_household
    before insert or update of parent_location_id, household_id on public.locations
    for each row execute function public.locations_check_parent_household();


-- An item's location must belong to the same household.
create or replace function public.items_check_location_household()
returns trigger language plpgsql as $$
declare
    loc_household uuid;
begin
    select household_id into loc_household
        from public.locations
        where id = new.location_id;

    if loc_household is null then
        raise exception 'Location does not exist';
    end if;

    if loc_household <> new.household_id then
        raise exception 'Location belongs to a different household';
    end if;

    return new;
end;
$$;

create trigger trg_items_check_location_household
    before insert or update of location_id, household_id on public.items
    for each row execute function public.items_check_location_household();


-- An item's user_category must belong to the same household.
create or replace function public.items_check_user_category_household()
returns trigger language plpgsql as $$
declare
    uc_household uuid;
begin
    if new.user_category_id is null then
        return new;
    end if;

    select household_id into uc_household
        from public.user_categories
        where id = new.user_category_id;

    if uc_household is null then
        raise exception 'User category does not exist';
    end if;

    if uc_household <> new.household_id then
        raise exception 'User category belongs to a different household';
    end if;

    return new;
end;
$$;

create trigger trg_items_check_user_category_household
    before insert or update of user_category_id, household_id on public.items
    for each row execute function public.items_check_user_category_household();


-- ----------------------------------------------------------------------------
-- 11. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

alter table public.households        enable row level security;
alter table public.household_members enable row level security;
alter table public.locations         enable row level security;
alter table public.user_categories   enable row level security;
alter table public.items             enable row level security;
alter table public.item_photos       enable row level security;
alter table public.usage_events      enable row level security;
alter table public.categories        enable row level security;

create or replace function public.is_household_member(h_id uuid)
returns boolean language sql security definer stable
set search_path = public as $$
    select exists (
        select 1 from public.household_members
        where household_id = h_id and user_id = auth.uid()
    );
$$;

-- households
create policy households_select on public.households
    for select using (public.is_household_member(id));
create policy households_insert on public.households
    for insert with check (owner_user_id = auth.uid());
create policy households_update on public.households
    for update using (owner_user_id = auth.uid());
create policy households_delete on public.households
    for delete using (owner_user_id = auth.uid());

-- household_members (owner-only insert/delete)
create policy household_members_select on public.household_members
    for select using (public.is_household_member(household_id));
create policy household_members_insert on public.household_members
    for insert with check (
        exists (select 1 from public.households
                where id = household_id and owner_user_id = auth.uid())
    );
create policy household_members_delete on public.household_members
    for delete using (
        exists (select 1 from public.households
                where id = household_id and owner_user_id = auth.uid())
    );

-- locations
create policy locations_all on public.locations
    for all using (public.is_household_member(household_id))
    with check (public.is_household_member(household_id));

-- user_categories
create policy user_categories_all on public.user_categories
    for all using (public.is_household_member(household_id))
    with check (public.is_household_member(household_id));

-- items
create policy items_all on public.items
    for all using (public.is_household_member(household_id))
    with check (public.is_household_member(household_id));

-- item_photos (via item ownership)
create policy item_photos_all on public.item_photos
    for all using (
        exists (select 1 from public.items
                where items.id = item_photos.item_id
                  and public.is_household_member(items.household_id))
    )
    with check (
        exists (select 1 from public.items
                where items.id = item_photos.item_id
                  and public.is_household_member(items.household_id))
    );

-- usage_events
create policy usage_events_select on public.usage_events
    for select using (public.is_household_member(household_id));
create policy usage_events_insert on public.usage_events
    for insert with check (
        public.is_household_member(household_id) and user_id = auth.uid()
    );

-- categories (read-only for users; writes via service_role)
create policy categories_select on public.categories
    for select using (auth.uid() is not null);

-- monetization tables RLS ----------------------------------------------------
alter table public.user_subscriptions enable row level security;
alter table public.credit_reservations enable row level security;
alter table public.credit_transactions enable row level security;

create policy user_subscriptions_select on public.user_subscriptions
    for select using (user_id = auth.uid());
-- Inserts/updates via service_role (Edge Functions); no client write policies.

create policy credit_reservations_select on public.credit_reservations
    for select using (user_id = auth.uid());
-- Inserts/updates via service_role only.

create policy credit_transactions_select on public.credit_transactions
    for select using (user_id = auth.uid());
-- Inserts via service_role only; transactions are append-only audit log.


-- ----------------------------------------------------------------------------
-- 11.5. MONETIZATION FUNCTIONS (called from Edge Functions, run as service_role)
-- ----------------------------------------------------------------------------

-- Reserve credits atomically. Returns reservation_id if success, null if insufficient.
create or replace function public.reserve_credits(
    p_user_id uuid,
    p_amount integer,
    p_reason text
)
returns uuid language plpgsql as $$
declare
    new_reservation_id uuid;
    rows_affected integer;
begin
    -- Defensive validation (FIX v6 #3)
    if p_amount is null or p_amount <= 0 then
        raise exception 'reserve_credits: amount must be positive (got %)', p_amount;
    end if;

    if p_reason is null or p_reason not in ('cloud_vision','text_classify','embedding') then
        raise exception 'reserve_credits: invalid reason (got %)', p_reason;
    end if;

    if p_user_id is null then
        raise exception 'reserve_credits: user_id is required';
    end if;

    update public.user_subscriptions
        set credits_balance = credits_balance - p_amount,
            credits_reserved = credits_reserved + p_amount
        where user_id = p_user_id
          and credits_balance >= p_amount;

    get diagnostics rows_affected = row_count;
    if rows_affected = 0 then
        return null; -- insufficient balance
    end if;

    insert into public.credit_reservations (user_id, amount, reason, status)
    values (p_user_id, p_amount, p_reason, 'reserved')
    returning id into new_reservation_id;

    return new_reservation_id;
end;
$$;

-- Commit a reservation (AI call succeeded).
create or replace function public.commit_credits(p_reservation_id uuid)
returns void language plpgsql as $$
declare
    r record;
    new_balance integer;
begin
    select * into r from public.credit_reservations
        where id = p_reservation_id and status = 'reserved'
        for update;

    if not found then
        return; -- already processed or doesn't exist
    end if;

    update public.user_subscriptions
        set credits_reserved = credits_reserved - r.amount,
            credits_lifetime_used = credits_lifetime_used + r.amount
        where user_id = r.user_id
        returning credits_balance into new_balance;

    update public.credit_reservations
        set status = 'committed'
        where id = p_reservation_id;

    -- FIX v6 #4: reference_id is the reservation UUID for traceability
    insert into public.credit_transactions (user_id, amount, transaction_type, reference_id, balance_after)
    values (r.user_id, -r.amount, 'ai_scan', p_reservation_id::text, new_balance);
end;
$$;

-- Release a reservation (AI call failed).
create or replace function public.release_credits(p_reservation_id uuid)
returns void language plpgsql as $$
declare
    r record;
begin
    select * into r from public.credit_reservations
        where id = p_reservation_id and status = 'reserved'
        for update;

    if not found then
        return;
    end if;

    update public.user_subscriptions
        set credits_balance = credits_balance + r.amount,
            credits_reserved = credits_reserved - r.amount
        where user_id = r.user_id;

    update public.credit_reservations
        set status = 'released'
        where id = p_reservation_id;
end;
$$;

-- Cleanup expired reservations (run periodically via Supabase pg_cron).
create or replace function public.cleanup_expired_reservations()
returns integer language plpgsql as $$
declare
    expired_count integer := 0;
    r record;
begin
    for r in
        select id from public.credit_reservations
        where status = 'reserved' and expires_at < now()
        for update skip locked
    loop
        perform public.release_credits(r.id);
        expired_count := expired_count + 1;
    end loop;

    return expired_count;
end;
$$;

-- Schedule cleanup every 60 seconds (requires pg_cron extension; enable in Supabase dashboard):
-- select cron.schedule('cleanup-expired-reservations', '*/1 * * * *', 'select public.cleanup_expired_reservations()');


-- ----------------------------------------------------------------------------
-- 11.5.5. ADMIN INFRASTRUCTURE (v7)
-- ----------------------------------------------------------------------------

-- system_config: global toggles and counters (kill switch, budget tracking)
create table public.system_config (
    key             text primary key,
    value           jsonb not null,
    updated_at      timestamptz not null default now(),
    updated_by      uuid references auth.users(id)
);

-- Seed initial values
insert into public.system_config (key, value) values
    ('ai_globally_enabled',      'true'::jsonb),
    ('monthly_budget_cap_usd',   '1200'::jsonb),
    ('current_month_spend_usd',  '0'::jsonb),
    ('current_month_period',     to_jsonb(to_char(now(), 'YYYY-MM'))),
    ('alert_thresholds_pct',     '[50, 75, 90]'::jsonb),
    ('alerts_fired_this_month',  '[]'::jsonb);

-- admin_users: hardcoded allowlist of who can run admin functions
create table public.admin_users (
    user_id     uuid primary key references auth.users(id) on delete cascade,
    added_at    timestamptz not null default now(),
    notes       text
);

-- After running this migration, add yourself as admin:
--   insert into public.admin_users (user_id, notes)
--   values ((select id from auth.users where email = 'YOUR_EMAIL'), 'founder');

-- RLS for system_config and admin_users
alter table public.system_config enable row level security;
alter table public.admin_users   enable row level security;

-- All authenticated users can read system_config (for AI kill switch checks
-- in the app); only service_role can write.
create policy system_config_select on public.system_config
    for select using (auth.uid() is not null);

-- admin_users is read-only for admins themselves (so the app can check
-- "am I an admin"); service_role manages it.
create policy admin_users_select_self on public.admin_users
    for select using (user_id = auth.uid());

-- Helper: is the current user an admin?
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
    select exists (
        select 1 from public.admin_users where user_id = auth.uid()
    );
$$;


-- Admin: grant credits (additive — for comps, refunds, beta testers)
create or replace function public.admin_grant_credits(
    p_user_email text,
    p_amount integer,
    p_reason text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    target_user_id uuid;
    new_balance integer;
begin
    if not public.is_admin() then
        raise exception 'Only admins can call admin_grant_credits';
    end if;

    if p_amount is null or p_amount <= 0 then
        raise exception 'admin_grant_credits: amount must be positive (got %)', p_amount;
    end if;

    if p_reason is null or length(trim(p_reason)) = 0 then
        raise exception 'admin_grant_credits: reason is required';
    end if;

    select id into target_user_id from auth.users where email = p_user_email;
    if target_user_id is null then
        raise exception 'User not found: %', p_user_email;
    end if;

    update public.user_subscriptions
        set credits_balance = credits_balance + p_amount
        where user_id = target_user_id
        returning credits_balance into new_balance;

    if new_balance is null then
        raise exception 'No subscription row for user: %', p_user_email;
    end if;

    insert into public.credit_transactions
        (user_id, amount, transaction_type, reference_id, balance_after)
    values
        (target_user_id, p_amount, 'admin_adjustment', p_reason, new_balance);

    return new_balance;
end;
$$;


-- Admin: set credits to a specific value (for resets, bug fixes, enforcement)
create or replace function public.admin_set_credits(
    p_user_email text,
    p_new_balance integer,
    p_reason text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
    target_user_id uuid;
    old_balance integer;
    delta integer;
begin
    if not public.is_admin() then
        raise exception 'Only admins can call admin_set_credits';
    end if;

    if p_new_balance is null or p_new_balance < 0 then
        raise exception 'admin_set_credits: new_balance must be non-negative (got %)', p_new_balance;
    end if;

    if p_reason is null or length(trim(p_reason)) = 0 then
        raise exception 'admin_set_credits: reason is required';
    end if;

    select id into target_user_id from auth.users where email = p_user_email;
    if target_user_id is null then
        raise exception 'User not found: %', p_user_email;
    end if;

    select credits_balance into old_balance
        from public.user_subscriptions where user_id = target_user_id;

    if old_balance is null then
        raise exception 'No subscription row for user: %', p_user_email;
    end if;

    delta := p_new_balance - old_balance;

    update public.user_subscriptions
        set credits_balance = p_new_balance
        where user_id = target_user_id;

    insert into public.credit_transactions
        (user_id, amount, transaction_type, reference_id, balance_after)
    values
        (target_user_id, delta, 'admin_adjustment', p_reason, p_new_balance);

    return p_new_balance;
end;
$$;


-- Admin: AI kill switch toggle
create or replace function public.admin_set_ai_enabled(
    p_enabled boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    if not public.is_admin() then
        raise exception 'Only admins can toggle AI';
    end if;

    update public.system_config
        set value = to_jsonb(p_enabled),
            updated_at = now(),
            updated_by = auth.uid()
        where key = 'ai_globally_enabled';
end;
$$;


-- Helper: AI cost tracker. Edge Functions call this after each successful AI call.
-- Increments the running monthly spend and returns whether we're still under cap.
-- If month rolls over, resets the counter automatically.
create or replace function public.record_ai_spend(p_amount_usd numeric)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
    current_period text;
    stored_period text;
    current_spend numeric;
    cap numeric;
begin
    current_period := to_char(now(), 'YYYY-MM');

    select value::text into stored_period
        from public.system_config where key = 'current_month_period';
    -- Strip JSON quotes
    stored_period := trim(both '"' from stored_period);

    -- New month? Reset.
    if stored_period <> current_period then
        update public.system_config
            set value = to_jsonb(current_period)
            where key = 'current_month_period';
        update public.system_config
            set value = '0'::jsonb
            where key = 'current_month_spend_usd';
        update public.system_config
            set value = '[]'::jsonb
            where key = 'alerts_fired_this_month';
    end if;

    -- Increment spend
    update public.system_config
        set value = to_jsonb(((value::text)::numeric + p_amount_usd))
        where key = 'current_month_spend_usd'
        returning (value::text)::numeric into current_spend;

    -- Get cap
    select (value::text)::numeric into cap
        from public.system_config where key = 'monthly_budget_cap_usd';

    return current_spend < cap;
end;
$$;


-- ----------------------------------------------------------------------------
-- LOCK DOWN ADMIN FUNCTIONS (callable only by service_role; checks is_admin internally)
-- ----------------------------------------------------------------------------

revoke execute on function public.admin_grant_credits(text, integer, text) from public;
revoke execute on function public.admin_grant_credits(text, integer, text) from authenticated;

revoke execute on function public.admin_set_credits(text, integer, text) from public;
revoke execute on function public.admin_set_credits(text, integer, text) from authenticated;

revoke execute on function public.admin_set_ai_enabled(boolean) from public;
revoke execute on function public.admin_set_ai_enabled(boolean) from authenticated;

revoke execute on function public.record_ai_spend(numeric) from public;
revoke execute on function public.record_ai_spend(numeric) from authenticated;

-- ----------------------------------------------------------------------------
-- 11.6. LOCK DOWN MONETIZATION FUNCTIONS (FIX v6 #2)
-- ----------------------------------------------------------------------------
-- These functions must NOT be callable by regular clients via PostgREST.
-- Only Supabase Edge Functions running with service_role should invoke them.
-- Without these REVOKE statements, an authenticated user could call
-- reserve_credits() directly via the API and game the credit system.

revoke execute on function public.reserve_credits(uuid, integer, text) from public;
revoke execute on function public.reserve_credits(uuid, integer, text) from authenticated;

revoke execute on function public.commit_credits(uuid) from public;
revoke execute on function public.commit_credits(uuid) from authenticated;

revoke execute on function public.release_credits(uuid) from public;
revoke execute on function public.release_credits(uuid) from authenticated;

revoke execute on function public.cleanup_expired_reservations() from public;
revoke execute on function public.cleanup_expired_reservations() from authenticated;

-- service_role retains EXECUTE by default (it bypasses these grants).
-- Verify post-migration:
--   select has_function_privilege('authenticated', 'public.reserve_credits(uuid,integer,text)', 'execute');
--   -- should return false


-- ----------------------------------------------------------------------------
-- 12. STORAGE BUCKETS (apply via dashboard or CLI)
-- ----------------------------------------------------------------------------

-- Bucket: 'item-photos', private, signed URLs only.
-- Path layout: <household_id>/<item_id>/<photo_id>.<ext>
--
-- create policy "household_can_read_own_photos" on storage.objects
--     for select using (
--         bucket_id = 'item-photos'
--         and public.is_household_member((storage.foldername(name))[1]::uuid)
--     );
--
-- create policy "household_can_write_own_photos" on storage.objects
--     for insert with check (
--         bucket_id = 'item-photos'
--         and public.is_household_member((storage.foldername(name))[1]::uuid)
--     );


-- ----------------------------------------------------------------------------
-- 13. UTILITY FUNCTIONS
-- ----------------------------------------------------------------------------

create or replace function public.top_categories(limit_count int default 30)
returns table (
    id uuid,
    name text,
    parent_category_id uuid,
    usage_count int,
    full_path text
)
language sql stable as $$
    with recursive cat_paths as (
        select c.id, c.name, c.parent_category_id, c.usage_count,
               c.name as full_path, 1 as depth
          from public.categories c
         where c.parent_category_id is null
        union all
        select c.id, c.name, c.parent_category_id, c.usage_count,
               cp.full_path || ' > ' || c.name, cp.depth + 1
          from public.categories c
          join cat_paths cp on c.parent_category_id = cp.id
    )
    select id, name, parent_category_id, usage_count, full_path
      from cat_paths
     order by usage_count desc
     limit limit_count;
$$;


-- ----------------------------------------------------------------------------
-- POST-MIGRATION VERIFICATION CHECKLIST
-- ----------------------------------------------------------------------------
-- After running this migration, verify each behavior:
--
--   1. is_household_member() works without recursion:
--        select public.is_household_member('<some uuid>');
--
--   2. handle_new_user() trigger fires:
--        Create test auth user; confirm rows exist in households,
--        household_members, and locations (Unsorted).
--
--   3. search_vector populates on INSERT (via trg_items_before_write):
--        Insert an item with name='hammer'; search_vector should be non-null
--        and contain "hammer" lexeme.
--
--   4. search_vector + cache update together when user_category_id is set:
--        Set item's user_category_id; in the same trigger pass,
--        user_category_name_cache populates AND search_vector reflects it.
--        No race, no ordering bug.
--
--   5. Category usage_count cascades on insert and update:
--        Insert item with category_id; check chain incremented.
--        Change item's category_id; check old chain decremented, new incremented.
--
--   6. Location cycle rejected:
--        Try to make a location its own ancestor; trigger raises exception.
--
--   7. Same-household integrity rejected on mismatch:
--        Try to insert item where location_id belongs to different household;
--        trigger raises exception.
--
--   8. household_members insert blocked for non-owner:
--        As non-owner user, attempt insert; RLS blocks.
--
--   9. user_category rename propagates via trg_user_categories_rename:
--        Update user_categories.name; items.user_category_name_cache reflects;
--        AND items.search_vector is also updated (cascading via trg_items_before_write
--        firing on the cascading UPDATE).
--
--  10. Search vector matches against user category name:
--        Set item's user_category to "Workshop Stuff"; ts_query for "workshop"
--        against search_vector should match.
--
--  11. New user signup creates user_subscriptions with 500 free scans:
--        Create test auth user; verify user_subscriptions row exists with
--        tier='free', credits_balance=500, and a signup_grant transaction.
--
--  12. reserve_credits() succeeds for sufficient balance:
--        select public.reserve_credits('<user_id>', 5, 'cloud_vision');
--        Returns a UUID. Check user_subscriptions: balance=495, reserved=5.
--
--  13. reserve_credits() returns null for insufficient balance:
--        Set balance to 0; reserve_credits should return null, no row inserted.
--
--  14. commit_credits() finalizes the deduction:
--        select public.commit_credits('<reservation_id>');
--        Reservation status='committed', user_subscriptions reserved drops by amount,
--        a credit_transactions row exists with type='ai_scan' and balance_after.
--
--  15. release_credits() restores balance on failure:
--        Reserve 5 credits; release; balance returns to original, reserved=0,
--        reservation status='released'.
--
--  16. cleanup_expired_reservations() releases stale holds:
--        Insert a reservation with expires_at in the past;
--        run cleanup_expired_reservations(); reservation should be released.
--
--  17. RLS prevents users from reading other users' credit data:
--        As user A, query credit_reservations where user_id=B; should return 0 rows.
--
--  18. Credit functions are not callable by authenticated role (FIX v6 #2):
--        select has_function_privilege('authenticated', 'public.reserve_credits(uuid,integer,text)', 'execute');
--        Should return false. Same for commit_credits, release_credits.
--
--  19. reserve_credits rejects invalid input (FIX v6 #3):
--        Calling with amount=0 or negative should raise an exception.
--        Calling with reason='hacking' should raise an exception.
--
--  20. commit_credits writes reservation_id as reference_id (FIX v6 #4):
--        Reserve, commit; then query credit_transactions for that user.
--        The most recent ai_scan row should have reference_id matching the
--        reservation UUID, NOT the reason text ('cloud_vision' etc.).
--
--  21. system_config seeded correctly (v7):
--        select * from public.system_config order by key;
--        Should show ai_globally_enabled=true, monthly_budget_cap_usd=1200, etc.
--
--  22. New users get 20 free image AI Captures (v7, web pivot):
--        Create test auth user; verify user_subscriptions.credits_balance = 20.
--
--  23. Admin functions reject non-admins (v7):
--        As a regular authenticated user, attempt to call admin_grant_credits.
--        Should raise 'Only admins can call admin_grant_credits'.
--
--  24. Admin functions work for admins (v7):
--        Add yourself to admin_users:
--          insert into public.admin_users (user_id) values
--            ((select id from auth.users where email = 'YOUR_EMAIL'));
--        Then call admin_grant_credits('test@test.com', 100, 'beta tester');
--        Should return new balance and create a credit_transactions row.
--
--  25. AI kill switch toggles (v7):
--        select public.admin_set_ai_enabled(false);
--        select value from public.system_config where key = 'ai_globally_enabled';
--        Should return 'false'. Toggle back: admin_set_ai_enabled(true).
--
--  26. record_ai_spend increments monthly counter (v7):
--        select public.record_ai_spend(0.05);
--        select value from public.system_config where key = 'current_month_spend_usd';
--        Should reflect the increment.
--
--  27. record_ai_spend returns false when over cap (v7):
--        update public.system_config set value = '0.01'::jsonb where key = 'monthly_budget_cap_usd';
--        select public.record_ai_spend(0.05);  -- should return false
--        Don't forget to set the cap back to 1200 after testing!
-- ----------------------------------------------------------------------------

-- END OF MIGRATION
