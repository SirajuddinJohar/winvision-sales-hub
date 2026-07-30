-- Pharmacies: readable by any authenticated staff member
DROP POLICY IF EXISTS "Users view assigned pharmacies or admins all" ON public.pharmacies;
CREATE POLICY "Authenticated staff can view pharmacies"
ON public.pharmacies FOR SELECT TO authenticated USING (true);

-- Distributors: remove stale copied policies and owner-only read
DROP POLICY IF EXISTS "Users view own distributors or admins all" ON public."Distributors";
DROP POLICY IF EXISTS "Admins can view all pharmacies" ON public."Distributors";
DROP POLICY IF EXISTS "MRs can view assigned pharmacies" ON public."Distributors";
DROP POLICY IF EXISTS "Admins can manage pharmacies" ON public."Distributors";
CREATE POLICY "Authenticated staff can view distributors"
ON public."Distributors" FOR SELECT TO authenticated USING (true);

-- Distributor products: readable by any authenticated staff member
DROP POLICY IF EXISTS "Users view own distributor products or admins all" ON public.distributor_products;
CREATE POLICY "Authenticated staff can view distributor products"
ON public.distributor_products FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.pharmacies TO authenticated;
GRANT SELECT ON public."Distributors" TO authenticated;
GRANT SELECT ON public.distributor_products TO authenticated;