CREATE OR REPLACE FUNCTION public.is_order_buyer(_order_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.orders WHERE id = _order_id AND buyer_id = _user_id) $$;

CREATE OR REPLACE FUNCTION public.is_order_vendor(_order_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.order_items oi JOIN public.products p ON p.id = oi.product_id WHERE oi.order_id = _order_id AND p.vendor_id = _user_id) $$;

DROP POLICY IF EXISTS "orders read" ON public.orders;
CREATE POLICY "orders read" ON public.orders FOR SELECT TO authenticated
USING (auth.uid() = buyer_id OR public.has_role(auth.uid(), 'admin') OR public.is_order_vendor(id, auth.uid()));

DROP POLICY IF EXISTS "items read" ON public.order_items;
CREATE POLICY "items read" ON public.order_items FOR SELECT TO authenticated
USING (public.is_order_buyer(order_id, auth.uid()) OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (SELECT 1 FROM public.products p WHERE p.id = order_items.product_id AND p.vendor_id = auth.uid()));

DROP POLICY IF EXISTS "items insert" ON public.order_items;
CREATE POLICY "items insert" ON public.order_items FOR INSERT TO authenticated
WITH CHECK (public.is_order_buyer(order_id, auth.uid()));