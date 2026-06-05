
-- 1. Membership privilege escalation: restrict self-insert to chama creators only.
DROP POLICY IF EXISTS "Insert own membership" ON public.memberships;
CREATE POLICY "Creator self-membership"
ON public.memberships
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.chamas c WHERE c.id = chama_id AND c.created_by = auth.uid())
);

-- Secure join via invitation token (SECURITY DEFINER bypasses RLS safely).
CREATE OR REPLACE FUNCTION public.join_chama_with_token(_token text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO inv FROM public.invitations
  WHERE token = _token AND status = 'pending'
  LIMIT 1;

  IF inv IS NULL THEN
    RAISE EXCEPTION 'Invitation not found or already used';
  END IF;

  IF EXISTS (SELECT 1 FROM public.memberships WHERE user_id = auth.uid() AND chama_id = inv.chama_id) THEN
    RAISE EXCEPTION 'You are already a member';
  END IF;

  INSERT INTO public.memberships (user_id, chama_id, role)
  VALUES (auth.uid(), inv.chama_id, inv.role);

  UPDATE public.invitations SET status = 'accepted' WHERE id = inv.id;

  INSERT INTO public.audit_logs (chama_id, user_id, action_type, description, metadata)
  VALUES (inv.chama_id, auth.uid(), 'member_joined', 'A new member joined via invitation', jsonb_build_object('role', inv.role));

  RETURN inv.chama_id;
END;
$$;

REVOKE ALL ON FUNCTION public.join_chama_with_token(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.join_chama_with_token(text) TO authenticated;

-- 2. Invitation tokens: leaders only for SELECT and UPDATE.
DROP POLICY IF EXISTS "Members view invitations" ON public.invitations;
CREATE POLICY "Leaders view invitations"
ON public.invitations
FOR SELECT
TO authenticated
USING (
  has_chama_role(auth.uid(), chama_id, 'chairperson'::app_role)
  OR has_chama_role(auth.uid(), chama_id, 'treasurer'::app_role)
);

DROP POLICY IF EXISTS "Leaders update invitations" ON public.invitations;
CREATE POLICY "Leaders update invitations"
ON public.invitations
FOR UPDATE
TO authenticated
USING (
  has_chama_role(auth.uid(), chama_id, 'chairperson'::app_role)
  OR has_chama_role(auth.uid(), chama_id, 'treasurer'::app_role)
)
WITH CHECK (
  has_chama_role(auth.uid(), chama_id, 'chairperson'::app_role)
  OR has_chama_role(auth.uid(), chama_id, 'treasurer'::app_role)
);

-- 3. Risk scores: leaders only for SELECT and INSERT.
DROP POLICY IF EXISTS "Members view risk scores" ON public.risk_scores;
CREATE POLICY "Leaders view risk scores"
ON public.risk_scores
FOR SELECT
TO authenticated
USING (
  has_chama_role(auth.uid(), chama_id, 'chairperson'::app_role)
  OR has_chama_role(auth.uid(), chama_id, 'treasurer'::app_role)
);

DROP POLICY IF EXISTS "Members write risk scores" ON public.risk_scores;
CREATE POLICY "Leaders write risk scores"
ON public.risk_scores
FOR INSERT
TO authenticated
WITH CHECK (
  (has_chama_role(auth.uid(), chama_id, 'chairperson'::app_role)
   OR has_chama_role(auth.uid(), chama_id, 'treasurer'::app_role))
  AND is_chama_member(user_id, chama_id)
);

-- 4. Withdrawals: enforce emergency fund eligibility at insert.
DROP POLICY IF EXISTS "Request own withdrawal" ON public.withdrawals;
CREATE POLICY "Request own withdrawal"
ON public.withdrawals
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND is_chama_member(auth.uid(), chama_id)
  AND (
    fund_type <> 'emergency'::contribution_type
    OR EXISTS (
      SELECT 1 FROM public.contributions
      WHERE user_id = auth.uid() AND chama_id = withdrawals.chama_id AND type = 'emergency'::contribution_type
    )
  )
);

-- 5. Withdrawals: enforce approval state machine.
CREATE OR REPLACE FUNCTION public.enforce_withdrawal_workflow()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
    (OLD.status = 'pending'::withdrawal_status AND NEW.status IN ('treasurer_reviewed'::withdrawal_status, 'rejected'::withdrawal_status))
    OR (OLD.status = 'treasurer_reviewed'::withdrawal_status AND NEW.status IN ('approved'::withdrawal_status, 'rejected'::withdrawal_status))
    OR (OLD.status = 'approved'::withdrawal_status AND NEW.status = 'released'::withdrawal_status)
  ) THEN
    RAISE EXCEPTION 'Invalid withdrawal status transition from % to %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_withdrawal_workflow ON public.withdrawals;
CREATE TRIGGER trg_enforce_withdrawal_workflow
BEFORE UPDATE ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.enforce_withdrawal_workflow();

-- 6. Audit logs: members may only write entries under their own identity.
DROP POLICY IF EXISTS "Members write audit logs" ON public.audit_logs;
CREATE POLICY "Members write own audit logs"
ON public.audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  is_chama_member(auth.uid(), chama_id)
  AND user_id = auth.uid()
);

-- 7. Lock down internal helper functions from direct API execution.
REVOKE ALL ON FUNCTION public.is_chama_member(uuid, uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_chama_role(uuid, uuid, app_role) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.shares_chama(uuid) FROM public, anon, authenticated;
