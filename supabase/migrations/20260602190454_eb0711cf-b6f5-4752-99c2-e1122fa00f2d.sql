
-- 1) reward_campaigns
CREATE TABLE public.reward_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  product_id uuid NOT NULL,
  target_quantity integer NOT NULL CHECK (target_quantity > 0),
  reward_description text NOT NULL,
  reward_image_url text,
  beneficiary_type text NOT NULL CHECK (beneficiary_type IN ('pharmacy','doctor')),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.reward_campaigns TO authenticated;
GRANT ALL ON public.reward_campaigns TO service_role;

ALTER TABLE public.reward_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage campaigns" ON public.reward_campaigns
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Authenticated can view campaigns" ON public.reward_campaigns
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- 2) reward_claims
CREATE TABLE public.reward_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.reward_campaigns(id) ON DELETE CASCADE,
  beneficiary_type text NOT NULL CHECK (beneficiary_type IN ('pharmacy','doctor')),
  pharmacy_id uuid,
  doctor_id uuid,
  mr_id uuid,
  achieved_quantity integer NOT NULL DEFAULT 0,
  achieved_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','delivered')),
  approved_by uuid,
  approved_at timestamptz,
  admin_notes text,
  delivered_at timestamptz,
  delivery_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uniq_active_claim_pharmacy
  ON public.reward_claims(campaign_id, pharmacy_id)
  WHERE pharmacy_id IS NOT NULL AND status <> 'rejected';

CREATE UNIQUE INDEX uniq_active_claim_doctor
  ON public.reward_claims(campaign_id, doctor_id)
  WHERE doctor_id IS NOT NULL AND status <> 'rejected';

GRANT SELECT, INSERT, UPDATE ON public.reward_claims TO authenticated;
GRANT ALL ON public.reward_claims TO service_role;

ALTER TABLE public.reward_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage claims" ON public.reward_claims
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "MRs view own claims" ON public.reward_claims
  FOR SELECT USING (
    mr_id = auth.uid()
    OR EXISTS (SELECT 1 FROM doctors d WHERE d.id = reward_claims.doctor_id AND d.assigned_mr_id = auth.uid())
  );

-- 3) reward_claim_orders (audit)
CREATE TABLE public.reward_claim_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id uuid NOT NULL REFERENCES public.reward_claims(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL,
  quantity_counted integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.reward_claim_orders TO authenticated;
GRANT ALL ON public.reward_claim_orders TO service_role;

ALTER TABLE public.reward_claim_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage claim orders" ON public.reward_claim_orders
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Users view related claim orders" ON public.reward_claim_orders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM reward_claims rc
      WHERE rc.id = reward_claim_orders.claim_id
      AND (rc.mr_id = auth.uid() OR is_admin())
    )
  );

-- 4) updated_at triggers
CREATE TRIGGER trg_reward_campaigns_updated
  BEFORE UPDATE ON public.reward_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_reward_claims_updated
  BEFORE UPDATE ON public.reward_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Auto-detect claims when order_items inserted
CREATE OR REPLACE FUNCTION public.check_reward_claims()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_campaign RECORD;
  v_total integer;
  v_beneficiary_id uuid;
  v_claim_id uuid;
BEGIN
  SELECT o.id, o.pharmacy_id, o.doctor_id, o.mr_id, o.order_date
    INTO v_order
  FROM orders o WHERE o.id = NEW.order_id;

  IF v_order.id IS NULL THEN
    RETURN NEW;
  END IF;

  FOR v_campaign IN
    SELECT * FROM reward_campaigns
    WHERE product_id = NEW.product_id
      AND is_active = true
      AND start_date <= v_order.order_date
      AND (end_date IS NULL OR end_date >= v_order.order_date)
  LOOP
    -- determine beneficiary
    IF v_campaign.beneficiary_type = 'pharmacy' THEN
      v_beneficiary_id := v_order.pharmacy_id;
    ELSE
      v_beneficiary_id := v_order.doctor_id;
    END IF;

    IF v_beneficiary_id IS NULL THEN
      CONTINUE;
    END IF;

    -- sum qty for this beneficiary in this campaign window
    IF v_campaign.beneficiary_type = 'pharmacy' THEN
      SELECT COALESCE(SUM(oi.quantity),0) INTO v_total
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.product_id = v_campaign.product_id
        AND o.pharmacy_id = v_beneficiary_id
        AND o.order_date >= v_campaign.start_date
        AND (v_campaign.end_date IS NULL OR o.order_date <= v_campaign.end_date);
    ELSE
      SELECT COALESCE(SUM(oi.quantity),0) INTO v_total
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.product_id = v_campaign.product_id
        AND o.doctor_id = v_beneficiary_id
        AND o.order_date >= v_campaign.start_date
        AND (v_campaign.end_date IS NULL OR o.order_date <= v_campaign.end_date);
    END IF;

    IF v_total >= v_campaign.target_quantity THEN
      -- create claim if none active
      IF v_campaign.beneficiary_type = 'pharmacy' THEN
        SELECT id INTO v_claim_id FROM reward_claims
        WHERE campaign_id = v_campaign.id
          AND pharmacy_id = v_beneficiary_id
          AND status <> 'rejected'
        LIMIT 1;

        IF v_claim_id IS NULL THEN
          INSERT INTO reward_claims (campaign_id, beneficiary_type, pharmacy_id, mr_id, achieved_quantity)
          VALUES (v_campaign.id, 'pharmacy', v_beneficiary_id, v_order.mr_id, v_total);
        END IF;
      ELSE
        SELECT id INTO v_claim_id FROM reward_claims
        WHERE campaign_id = v_campaign.id
          AND doctor_id = v_beneficiary_id
          AND status <> 'rejected'
        LIMIT 1;

        IF v_claim_id IS NULL THEN
          INSERT INTO reward_claims (campaign_id, beneficiary_type, doctor_id, mr_id, achieved_quantity)
          VALUES (v_campaign.id, 'doctor', v_beneficiary_id, v_order.mr_id, v_total);
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_check_reward_claims
  AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.check_reward_claims();
