
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('chairperson','treasurer','member');
CREATE TYPE public.chama_frequency AS ENUM ('daily','every_two_days','weekly','monthly','custom');
CREATE TYPE public.investment_profile AS ENUM ('conservative','moderate','aggressive');
CREATE TYPE public.voting_rule AS ENUM ('simple_majority','two_thirds','custom');
CREATE TYPE public.penalty_type AS ENUM ('fixed','percentage','custom');
CREATE TYPE public.contribution_type AS ENUM ('regular','emergency','investment');
CREATE TYPE public.contribution_source AS ENUM ('mpesa','manual');
CREATE TYPE public.withdrawal_status AS ENUM ('pending','treasurer_reviewed','approved','rejected','released');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  national_id TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CHAMAS
CREATE TABLE public.chamas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  contribution_amount NUMERIC NOT NULL DEFAULT 0,
  frequency public.chama_frequency NOT NULL DEFAULT 'monthly',
  custom_frequency TEXT NOT NULL DEFAULT '',
  investment_profile public.investment_profile NOT NULL DEFAULT 'conservative',
  voting_rule public.voting_rule NOT NULL DEFAULT 'simple_majority',
  voting_custom_percent INT NOT NULL DEFAULT 50,
  penalty_type public.penalty_type NOT NULL DEFAULT 'fixed',
  penalty_value NUMERIC NOT NULL DEFAULT 0,
  grace_period_days INT NOT NULL DEFAULT 3,
  created_by UUID NOT NULL REFERENCES auth.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MEMBERSHIPS
CREATE TABLE public.memberships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users,
  chama_id UUID NOT NULL REFERENCES public.chamas ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, chama_id)
);

-- INVITATIONS
CREATE TABLE public.invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chama_id UUID NOT NULL REFERENCES public.chamas ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  role public.app_role NOT NULL DEFAULT 'member',
  token TEXT NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text,'-',''),
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by UUID NOT NULL REFERENCES auth.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CONTRIBUTIONS
CREATE TABLE public.contributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chama_id UUID NOT NULL REFERENCES public.chamas ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users,
  amount NUMERIC NOT NULL,
  type public.contribution_type NOT NULL DEFAULT 'regular',
  source public.contribution_source NOT NULL DEFAULT 'manual',
  note TEXT NOT NULL DEFAULT '',
  recorded_by UUID NOT NULL REFERENCES auth.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- WITHDRAWALS
CREATE TABLE public.withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chama_id UUID NOT NULL REFERENCES public.chamas ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users,
  amount NUMERIC NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  fund_type public.contribution_type NOT NULL DEFAULT 'regular',
  status public.withdrawal_status NOT NULL DEFAULT 'pending',
  treasurer_id UUID REFERENCES auth.users,
  treasurer_note TEXT NOT NULL DEFAULT '',
  chairperson_id UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PROPOSALS
CREATE TABLE public.proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chama_id UUID NOT NULL REFERENCES public.chamas ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'governance',
  rule public.voting_rule NOT NULL DEFAULT 'simple_majority',
  custom_percent INT NOT NULL DEFAULT 50,
  status TEXT NOT NULL DEFAULT 'open',
  created_by UUID NOT NULL REFERENCES auth.users,
  closes_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- VOTES
CREATE TABLE public.votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id UUID NOT NULL REFERENCES public.proposals ON DELETE CASCADE,
  chama_id UUID NOT NULL REFERENCES public.chamas ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users,
  choice TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (proposal_id, user_id)
);

-- AUDIT LOGS (immutable)
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chama_id UUID NOT NULL REFERENCES public.chamas ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users,
  action_type TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RISK SCORES
CREATE TABLE public.risk_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chama_id UUID NOT NULL REFERENCES public.chamas ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users,
  score INT NOT NULL DEFAULT 0,
  explanation TEXT NOT NULL DEFAULT '',
  factors JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chamas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contributions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.withdrawals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.votes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.risk_scores TO authenticated;
GRANT ALL ON public.profiles, public.chamas, public.memberships, public.invitations, public.contributions, public.withdrawals, public.proposals, public.votes, public.audit_logs, public.risk_scores TO service_role;

-- SECURITY DEFINER HELPERS
CREATE OR REPLACE FUNCTION public.is_chama_member(_user UUID, _chama UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.memberships WHERE user_id = _user AND chama_id = _chama);
$$;

CREATE OR REPLACE FUNCTION public.has_chama_role(_user UUID, _chama UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.memberships WHERE user_id = _user AND chama_id = _chama AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.shares_chama(_other UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.memberships m1
    JOIN public.memberships m2 ON m1.chama_id = m2.chama_id
    WHERE m1.user_id = auth.uid() AND m2.user_id = _other
  );
$$;

-- PROFILE AUTO-CREATE
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, national_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'national_id', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_withdrawals_updated_at BEFORE UPDATE ON public.withdrawals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ENABLE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chamas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_scores ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "View own or co-member profiles" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.shares_chama(id));
CREATE POLICY "Update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Insert own profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- CHAMAS POLICIES
CREATE POLICY "Members view chama" ON public.chamas FOR SELECT TO authenticated
  USING (public.is_chama_member(auth.uid(), id));
CREATE POLICY "Create chama" ON public.chamas FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Chairperson updates chama" ON public.chamas FOR UPDATE TO authenticated
  USING (public.has_chama_role(auth.uid(), id, 'chairperson'))
  WITH CHECK (public.has_chama_role(auth.uid(), id, 'chairperson'));

-- MEMBERSHIPS POLICIES
CREATE POLICY "Members view memberships" ON public.memberships FOR SELECT TO authenticated
  USING (public.is_chama_member(auth.uid(), chama_id));
CREATE POLICY "Insert own membership" ON public.memberships FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- INVITATIONS POLICIES
CREATE POLICY "Members view invitations" ON public.invitations FOR SELECT TO authenticated
  USING (public.is_chama_member(auth.uid(), chama_id));
CREATE POLICY "Leaders create invitations" ON public.invitations FOR INSERT TO authenticated
  WITH CHECK (
    invited_by = auth.uid() AND (
      public.has_chama_role(auth.uid(), chama_id, 'chairperson') OR
      public.has_chama_role(auth.uid(), chama_id, 'treasurer')
    )
  );
CREATE POLICY "Leaders update invitations" ON public.invitations FOR UPDATE TO authenticated
  USING (public.is_chama_member(auth.uid(), chama_id))
  WITH CHECK (public.is_chama_member(auth.uid(), chama_id));

-- CONTRIBUTIONS POLICIES
CREATE POLICY "Members view contributions" ON public.contributions FOR SELECT TO authenticated
  USING (public.is_chama_member(auth.uid(), chama_id));
CREATE POLICY "Record contributions" ON public.contributions FOR INSERT TO authenticated
  WITH CHECK (
    recorded_by = auth.uid() AND public.is_chama_member(auth.uid(), chama_id) AND (
      user_id = auth.uid() OR
      public.has_chama_role(auth.uid(), chama_id, 'treasurer') OR
      public.has_chama_role(auth.uid(), chama_id, 'chairperson')
    )
  );
CREATE POLICY "Leaders edit contributions" ON public.contributions FOR UPDATE TO authenticated
  USING (public.has_chama_role(auth.uid(), chama_id, 'treasurer') OR public.has_chama_role(auth.uid(), chama_id, 'chairperson'))
  WITH CHECK (public.has_chama_role(auth.uid(), chama_id, 'treasurer') OR public.has_chama_role(auth.uid(), chama_id, 'chairperson'));

-- WITHDRAWALS POLICIES
CREATE POLICY "Members view withdrawals" ON public.withdrawals FOR SELECT TO authenticated
  USING (public.is_chama_member(auth.uid(), chama_id));
CREATE POLICY "Request own withdrawal" ON public.withdrawals FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_chama_member(auth.uid(), chama_id));
CREATE POLICY "Leaders process withdrawals" ON public.withdrawals FOR UPDATE TO authenticated
  USING (public.has_chama_role(auth.uid(), chama_id, 'treasurer') OR public.has_chama_role(auth.uid(), chama_id, 'chairperson'))
  WITH CHECK (public.has_chama_role(auth.uid(), chama_id, 'treasurer') OR public.has_chama_role(auth.uid(), chama_id, 'chairperson'));

-- PROPOSALS POLICIES
CREATE POLICY "Members view proposals" ON public.proposals FOR SELECT TO authenticated
  USING (public.is_chama_member(auth.uid(), chama_id));
CREATE POLICY "Members create proposals" ON public.proposals FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.is_chama_member(auth.uid(), chama_id));
CREATE POLICY "Leaders update proposals" ON public.proposals FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.has_chama_role(auth.uid(), chama_id, 'chairperson'))
  WITH CHECK (created_by = auth.uid() OR public.has_chama_role(auth.uid(), chama_id, 'chairperson'));

-- VOTES POLICIES
CREATE POLICY "Members view votes" ON public.votes FOR SELECT TO authenticated
  USING (public.is_chama_member(auth.uid(), chama_id));
CREATE POLICY "Cast own vote" ON public.votes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_chama_member(auth.uid(), chama_id));

-- AUDIT LOGS POLICIES (immutable: no update/delete)
CREATE POLICY "Members view audit logs" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.is_chama_member(auth.uid(), chama_id));
CREATE POLICY "Members write audit logs" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (public.is_chama_member(auth.uid(), chama_id));

-- RISK SCORES POLICIES
CREATE POLICY "Members view risk scores" ON public.risk_scores FOR SELECT TO authenticated
  USING (public.is_chama_member(auth.uid(), chama_id));
CREATE POLICY "Members write risk scores" ON public.risk_scores FOR INSERT TO authenticated
  WITH CHECK (public.is_chama_member(auth.uid(), chama_id));
