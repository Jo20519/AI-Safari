DROP POLICY IF EXISTS "Members view chama" ON public.chamas;
CREATE POLICY "Members view chama"
ON public.chamas
FOR SELECT
TO authenticated
USING (is_chama_member(auth.uid(), id) OR created_by = auth.uid());