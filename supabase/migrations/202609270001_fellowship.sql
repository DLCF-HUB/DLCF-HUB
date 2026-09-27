-- Apply once to a new Supabase project. Existing Sites records require a separate transfer.
BEGIN;
CREATE TABLE "announcements" (
	"id" text PRIMARY KEY NOT NULL,
	"campus" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"audience" text NOT NULL,
	"date" text NOT NULL,
	"author" text NOT NULL
);

CREATE INDEX "announcements_campus" ON "announcements" ("campus");
CREATE TABLE "attendance" (
	"id" text PRIMARY KEY NOT NULL,
	"campus" text NOT NULL,
	"service_id" text NOT NULL,
	"men" integer NOT NULL,
	"women" integer NOT NULL,
	"visitors" integer NOT NULL,
	"converts" integer NOT NULL,
	"language" text NOT NULL,
	"notes" text NOT NULL,
	"author" text NOT NULL,
	"created_at" text NOT NULL
);

CREATE UNIQUE INDEX "attendance_service_language" ON "attendance" ("campus","service_id","language");
CREATE TABLE "audit" (
	"id" text PRIMARY KEY NOT NULL,
	"campus" text NOT NULL,
	"action" text NOT NULL,
	"record_id" text NOT NULL,
	"author" text NOT NULL,
	"created_at" text NOT NULL
);

CREATE INDEX "audit_campus_date" ON "audit" ("campus","created_at");
CREATE TABLE "campuses" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"town" text NOT NULL,
	"region" text NOT NULL
);

CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"campus" text NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"date" text NOT NULL,
	"filename" text NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"author" text NOT NULL
);

CREATE INDEX "documents_campus" ON "documents" ("campus");
CREATE TABLE "grants" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"campus" text NOT NULL,
	"role" text NOT NULL
);

CREATE UNIQUE INDEX "grants_email_campus" ON "grants" ("email","campus");
CREATE TABLE "group_members" (
	"id" text PRIMARY KEY NOT NULL,
	"campus" text NOT NULL,
	"group_id" text NOT NULL,
	"member_id" text NOT NULL
);

CREATE UNIQUE INDEX "group_member_unique" ON "group_members" ("campus","member_id");
CREATE TABLE "groups" (
	"id" text PRIMARY KEY NOT NULL,
	"campus" text NOT NULL,
	"name" text NOT NULL,
	"area" text NOT NULL,
	"leader" text NOT NULL,
	"assistant" text NOT NULL,
	"meeting" text NOT NULL
);

CREATE INDEX "groups_campus" ON "groups" ("campus");
CREATE TABLE "members" (
	"id" text PRIMARY KEY NOT NULL,
	"campus" text NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"sex" text NOT NULL,
	"status" text NOT NULL,
	"department" text NOT NULL,
	"institution" text NOT NULL,
	"programme" text NOT NULL,
	"level" text NOT NULL,
	"details" text NOT NULL,
	"created_at" text NOT NULL
);

CREATE UNIQUE INDEX "member_campus_email" ON "members" ("campus","email");
CREATE INDEX "members_user" ON "members" ("user_id");
CREATE INDEX "members_campus" ON "members" ("campus");
CREATE TABLE "services" (
	"id" text PRIMARY KEY NOT NULL,
	"campus" text NOT NULL,
	"type" text NOT NULL,
	"date" text NOT NULL,
	"time" text NOT NULL,
	"venue" text NOT NULL,
	"usher" text NOT NULL
);

CREATE UNIQUE INDEX "service_unique" ON "services" ("campus","type","date","time");
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);

CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"campus" text NOT NULL,
	"type" text NOT NULL,
	"account" text NOT NULL,
	"amount" integer NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"date" text NOT NULL,
	"vow_id" text,
	"author" text NOT NULL,
	"created_at" text NOT NULL
);

CREATE INDEX "transactions_campus_date" ON "transactions" ("campus","date");
CREATE TABLE "vows" (
	"id" text PRIMARY KEY NOT NULL,
	"campus" text NOT NULL,
	"member_id" text NOT NULL,
	"purpose" text NOT NULL,
	"amount" integer NOT NULL,
	"date" text NOT NULL
);

CREATE INDEX "vows_campus" ON "vows" ("campus");
CREATE TABLE auth_accounts (
 id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 email text NOT NULL UNIQUE CHECK (email=lower(email)),
 name text NOT NULL,
 is_owner integer UNIQUE CHECK (is_owner=1 OR is_owner IS NULL),
 created_at text NOT NULL
);
CREATE TABLE auth_attempts (key text PRIMARY KEY,period bigint NOT NULL,count integer NOT NULL);
CREATE TABLE auth_invites (
 token_hash text PRIMARY KEY,email text NOT NULL,campus text NOT NULL REFERENCES campuses(id),
 expires_at bigint NOT NULL,used_by uuid REFERENCES auth_accounts(id),created_by uuid NOT NULL REFERENCES auth_accounts(id)
);
CREATE INDEX auth_invites_email ON auth_invites(email);
CREATE TABLE pending_uploads (
 id text PRIMARY KEY,campus text NOT NULL REFERENCES campuses(id),account_id uuid NOT NULL REFERENCES auth_accounts(id),
 title text NOT NULL,category text NOT NULL,filename text NOT NULL,mime text NOT NULL,size integer NOT NULL CHECK(size>0 AND size<=10485760),expires_at bigint NOT NULL
);

-- Enforce campus references even if a future route omits its own check.
ALTER TABLE members ADD UNIQUE(id,campus);
ALTER TABLE groups ADD UNIQUE(id,campus);
ALTER TABLE services ADD UNIQUE(id,campus);
ALTER TABLE vows ADD UNIQUE(id,campus);
ALTER TABLE group_members ADD FOREIGN KEY(group_id,campus) REFERENCES groups(id,campus);
ALTER TABLE group_members ADD FOREIGN KEY(member_id,campus) REFERENCES members(id,campus);
ALTER TABLE attendance ADD FOREIGN KEY(service_id,campus) REFERENCES services(id,campus);
ALTER TABLE vows ADD FOREIGN KEY(member_id,campus) REFERENCES members(id,campus);
ALTER TABLE transactions ADD FOREIGN KEY(vow_id,campus) REFERENCES vows(id,campus);
ALTER TABLE transactions ADD CHECK(amount>0);
ALTER TABLE transactions ADD CHECK(type IN ('Income','Expense','Cash to bank','Bank to cash','Opening balance'));
ALTER TABLE transactions ADD CHECK(account IN ('Cash','Bank'));
ALTER TABLE transactions ADD CHECK(vow_id IS NULL OR type='Income');
ALTER TABLE vows ADD CHECK(amount>0);
ALTER TABLE attendance ADD CHECK(men>=0 AND women>=0 AND visitors>=0 AND converts>=0 AND visitors<=men+women);
ALTER TABLE attendance ADD CHECK(language IN ('English','French'));

-- Locks serialize assignments and payments, including simultaneous requests.
CREATE FUNCTION enforce_group_capacity() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 PERFORM 1 FROM groups WHERE id=NEW.group_id AND campus=NEW.campus FOR UPDATE;
 IF (SELECT count(*) FROM group_members WHERE group_id=NEW.group_id AND id<>NEW.id)>=10 THEN
  RAISE EXCEPTION 'This group has reached its limit of 10 members.' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER group_capacity BEFORE INSERT OR UPDATE ON group_members FOR EACH ROW EXECUTE FUNCTION enforce_group_capacity();
CREATE FUNCTION enforce_vow_balance() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE target integer; paid bigint;
BEGIN
 IF NEW.vow_id IS NOT NULL THEN
  SELECT amount INTO target FROM vows WHERE id=NEW.vow_id AND campus=NEW.campus FOR UPDATE;
  SELECT coalesce(sum(amount),0) INTO paid FROM transactions WHERE vow_id=NEW.vow_id AND campus=NEW.campus AND id<>NEW.id;
  IF target IS NULL OR paid+NEW.amount>target THEN
   RAISE EXCEPTION 'The payment exceeds the outstanding vow balance.' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER vow_balance BEFORE INSERT OR UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION enforce_vow_balance();

-- Browser clients cannot read or mutate records through the Supabase Data API.
-- Next.js validates identity/campus permissions before server-only SQL access.
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['settings','campuses','grants','members','groups','group_members','services','attendance','vows','transactions','announcements','documents','audit','auth_accounts','auth_attempts','auth_invites','pending_uploads'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated',t);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION enforce_group_capacity() FROM PUBLIC;
REVOKE ALL ON FUNCTION enforce_vow_balance() FROM PUBLIC;

INSERT INTO campuses(id,name,town,region) VALUES
 ('dirty-south','Dirty South Campus','Buea','Southwest'),('bonduma','Bonduma Campus','Buea','Southwest');
-- A dedicated private bucket. Downloads require short-lived signed URLs.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES('fellowship-documents','fellowship-documents',false,10485760,ARRAY['application/pdf','image/jpeg','image/png']);
COMMIT;
