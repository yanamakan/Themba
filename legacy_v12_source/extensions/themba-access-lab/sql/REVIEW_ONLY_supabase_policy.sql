-- THEMBA V7 REVIEW-ONLY RLS / PAYOUT POLICY EXAMPLE.
-- DO NOT APPLY TO PRODUCTION. Does not match Yana's verified schema yet.
-- Uses an isolated schema to avoid collisions with existing public tables.
-- Requires Supabase auth.uid() and PostgreSQL pgcrypto/gen_random_uuid().
CREATE SCHEMA IF NOT EXISTS themba_review;
GRANT USAGE ON SCHEMA themba_review TO authenticated;
CREATE TABLE IF NOT EXISTS themba_review.circles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL CHECK(length(name) BETWEEN 3 AND 80),
 owner_id uuid NOT NULL REFERENCES auth.users(id), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS themba_review.memberships (
 circle_id uuid NOT NULL REFERENCES themba_review.circles(id),member_id uuid NOT NULL REFERENCES auth.users(id),
 role text NOT NULL CHECK(role IN ('member','signer')), active boolean NOT NULL DEFAULT true,
 PRIMARY KEY(circle_id,member_id)
);
CREATE TABLE IF NOT EXISTS themba_review.payout_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),circle_id uuid NOT NULL REFERENCES themba_review.circles(id),
 cycle integer NOT NULL CHECK(cycle>0),recipient_id uuid NOT NULL REFERENCES auth.users(id),
 amount_minor bigint NOT NULL CHECK(amount_minor>0),status text NOT NULL DEFAULT 'pending'
 CHECK(status IN ('pending','approved','rejected','settled')),
 created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(circle_id,cycle)
);
CREATE TABLE IF NOT EXISTS themba_review.payout_approvals (
 payout_id uuid NOT NULL REFERENCES themba_review.payout_requests(id),approver_id uuid NOT NULL REFERENCES auth.users(id),
 decision text NOT NULL CHECK(decision IN ('approve','reject')),
 created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(payout_id,approver_id)
);
CREATE TABLE IF NOT EXISTS themba_review.ledger_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),circle_id uuid NOT NULL REFERENCES themba_review.circles(id),
 account text NOT NULL CHECK(account IN ('rotation','reserve')),delta_minor bigint NOT NULL,
 evidence_ref text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(circle_id,account,evidence_ref)
);
CREATE TABLE IF NOT EXISTS themba_review.language_preferences (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id),locale text NOT NULL
 CHECK(locale IN ('en','af','zu','xh','nso','st','tn','ss','ve','ts','nr','sasl')),
 updated_at timestamptz NOT NULL DEFAULT now()
);
-- Authenticated users may READ ONLY scoped group data. No direct client financial writes.
ALTER TABLE themba_review.circles ENABLE ROW LEVEL SECURITY;
ALTER TABLE themba_review.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE themba_review.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE themba_review.payout_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE themba_review.ledger_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE themba_review.language_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY lab_circles_read ON themba_review.circles FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM themba_review.memberships m WHERE m.circle_id=id AND m.member_id=(SELECT auth.uid()) AND m.active));
CREATE POLICY lab_members_read ON themba_review.memberships FOR SELECT TO authenticated
 USING(member_id=(SELECT auth.uid()));
-- The members SELECT policy above deliberately exposes only one's own membership.
-- A carefully reviewed SECURITY DEFINER function or server read service is needed for a full roster.
CREATE POLICY lab_payout_read ON themba_review.payout_requests FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM themba_review.memberships m WHERE m.circle_id=payout_requests.circle_id AND m.member_id=(SELECT auth.uid()) AND m.active));
CREATE POLICY lab_approvals_read ON themba_review.payout_approvals FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM themba_review.payout_requests p JOIN themba_review.memberships m ON m.circle_id=p.circle_id WHERE p.id=payout_approvals.payout_id AND m.member_id=(SELECT auth.uid()) AND m.active));
CREATE POLICY lab_ledger_read ON themba_review.ledger_events FOR SELECT TO authenticated
 USING(EXISTS(SELECT 1 FROM themba_review.memberships m WHERE m.circle_id=ledger_events.circle_id AND m.member_id=(SELECT auth.uid()) AND m.active));
CREATE POLICY lab_language_read ON themba_review.language_preferences FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE POLICY lab_language_insert ON themba_review.language_preferences FOR INSERT TO authenticated WITH CHECK(user_id=(SELECT auth.uid()));
CREATE POLICY lab_language_update ON themba_review.language_preferences FOR UPDATE TO authenticated USING(user_id=(SELECT auth.uid())) WITH CHECK(user_id=(SELECT auth.uid()));
-- Append-only application ledger. DB owners can still bypass triggers: not mathematically immutable.
CREATE OR REPLACE FUNCTION themba_review.no_ledger_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Themba ledger entries must be reversed by new entries, not edited'; END;
$$;
DROP TRIGGER IF EXISTS lab_no_ledger_update ON themba_review.ledger_events;
CREATE TRIGGER lab_no_ledger_update BEFORE UPDATE OR DELETE ON themba_review.ledger_events
 FOR EACH ROW EXECUTE FUNCTION themba_review.no_ledger_change();
REVOKE ALL ON ALL TABLES IN SCHEMA themba_review FROM anon;
GRANT SELECT ON themba_review.circles,themba_review.memberships,themba_review.payout_requests,
 themba_review.payout_approvals,themba_review.ledger_events TO authenticated;
GRANT SELECT,INSERT,UPDATE ON themba_review.language_preferences TO authenticated;
-- No direct INSERT/UPDATE permission on payout_requests/approvals or financial ledger.
-- The only reviewed write example is the following server-identity-bound approval RPC.
CREATE OR REPLACE FUNCTION themba_review.review_payout(p_payout uuid,p_decision text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_actor uuid := auth.uid();v_request themba_review.payout_requests%ROWTYPE;v_count integer;
BEGIN
 IF v_actor IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
 IF p_decision NOT IN ('approve','reject') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
 SELECT * INTO v_request FROM themba_review.payout_requests WHERE id=p_payout FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Payout not found'; END IF;
 IF v_request.status<>'pending' THEN RAISE EXCEPTION 'Payout not pending'; END IF;
 IF v_request.recipient_id=v_actor THEN RAISE EXCEPTION 'Requester cannot approve'; END IF;
 IF NOT EXISTS(SELECT 1 FROM themba_review.memberships WHERE circle_id=v_request.circle_id AND member_id=v_actor AND active=true AND role='signer') THEN
    RAISE EXCEPTION 'Not an eligible signer';
 END IF;
 IF EXISTS(SELECT 1 FROM themba_review.payout_approvals WHERE payout_id=p_payout AND approver_id=v_actor) THEN RAISE EXCEPTION 'Duplicate decision';END IF;
 INSERT INTO themba_review.payout_approvals(payout_id,approver_id,decision) VALUES(p_payout,v_actor,p_decision);
 IF p_decision='reject' THEN
    UPDATE themba_review.payout_requests SET status='rejected' WHERE id=p_payout;
    RETURN 'rejected';
 END IF;
 SELECT count(*) INTO v_count FROM themba_review.payout_approvals WHERE payout_id=p_payout AND decision='approve' AND approver_id<>v_request.recipient_id;
 IF v_count>=2 THEN UPDATE themba_review.payout_requests SET status='approved' WHERE id=p_payout;RETURN 'approved';END IF;
 RETURN 'pending';
END;
$$;
REVOKE ALL ON FUNCTION themba_review.review_payout(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION themba_review.review_payout(uuid,text) TO authenticated;
-- IMPORTANT: This RPC makes only an approval decision. It DOES NOT settle funds.
-- All custody, payment webhook verification, source-of-truth balances, invitations,
-- account recovery, notification opt-in, phone-number binding, and contract guards still require integration.
