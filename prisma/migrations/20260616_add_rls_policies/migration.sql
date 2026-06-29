-- Enable RLS on all public tables
ALTER TABLE public.garages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treasury_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.garage_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's garage_id
CREATE OR REPLACE FUNCTION public.get_user_garage_id()
RETURNS uuid AS $$
DECLARE
  garage_id uuid;
BEGIN
  SELECT gm.garage_id INTO garage_id
  FROM public.garage_members gm
  JOIN auth.users u ON u.id = gm.user_id
  WHERE u.id = auth.uid()
    AND gm.active = true
  LIMIT 1;
  
  RETURN garage_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is garage owner
CREATE OR REPLACE FUNCTION public.is_garage_owner(p_garage_id uuid)
RETURNS boolean AS $$
DECLARE
  is_owner boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.garage_members gm
    WHERE gm.garage_id = p_garage_id
      AND gm.user_id = auth.uid()
      AND gm.role = 'owner'
      AND gm.active = true
  ) INTO is_owner;
  
  RETURN is_owner;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user has access to garage
CREATE OR REPLACE FUNCTION public.has_garage_access(p_garage_id uuid)
RETURNS boolean AS $$
DECLARE
  has_access boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.garage_members gm
    WHERE gm.garage_id = p_garage_id
      AND gm.user_id = auth.uid()
      AND gm.active = true
  ) INTO has_access;
  
  RETURN has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- GARAGES: Users can only see garages they are members of
CREATE POLICY "Users can view their garages" ON public.garages
  FOR SELECT USING (
    id IN (
      SELECT garage_id FROM public.garage_members
      WHERE user_id = auth.uid() AND active = true
    )
  );

CREATE POLICY "Owners can update their garage" ON public.garages
  FOR UPDATE USING (
    public.is_garage_owner(id)
  );

-- GARAGE_MEMBERS: Users can view members of their garages
CREATE POLICY "Users can view garage members" ON public.garage_members
  FOR SELECT USING (
    garage_id IN (
      SELECT garage_id FROM public.garage_members
      WHERE user_id = auth.uid() AND active = true
    )
  );

-- Owners can manage garage members
CREATE POLICY "Owners can insert garage members" ON public.garage_members
  FOR INSERT WITH CHECK (
    public.is_garage_owner(garage_id)
  );

CREATE POLICY "Owners can update garage members" ON public.garage_members
  FOR UPDATE USING (
    public.is_garage_owner(garage_id)
  );

CREATE POLICY "Owners can delete garage members" ON public.garage_members
  FOR DELETE USING (
    public.is_garage_owner(garage_id)
  );

-- CLIENTS: Users can only access clients in their garage
CREATE POLICY "Users can view clients in their garage" ON public.clients
  FOR SELECT USING (
    garage_id = public.get_user_garage_id()
  );

CREATE POLICY "Users can insert clients in their garage" ON public.clients
  FOR INSERT WITH CHECK (
    garage_id = public.get_user_garage_id()
  );

CREATE POLICY "Users can update clients in their garage" ON public.clients
  FOR UPDATE USING (
    garage_id = public.get_user_garage_id()
  );

CREATE POLICY "Users can delete clients in their garage" ON public.clients
  FOR DELETE USING (
    garage_id = public.get_user_garage_id()
  );

-- VEHICLES: Users can only access vehicles in their garage
CREATE POLICY "Users can view vehicles in their garage" ON public.vehicles
  FOR SELECT USING (
    garage_id = public.get_user_garage_id()
  );

CREATE POLICY "Users can insert vehicles in their garage" ON public.vehicles
  FOR INSERT WITH CHECK (
    garage_id = public.get_user_garage_id()
  );

CREATE POLICY "Users can update vehicles in their garage" ON public.vehicles
  FOR UPDATE USING (
    garage_id = public.get_user_garage_id()
  );

CREATE POLICY "Users can delete vehicles in their garage" ON public.vehicles
  FOR DELETE USING (
    garage_id = public.get_user_garage_id()
  );

-- ITEMS: Users can only access items in their garage
CREATE POLICY "Users can view items in their garage" ON public.items
  FOR SELECT USING (
    garage_id = public.get_user_garage_id()
  );

CREATE POLICY "Users can insert items in their garage" ON public.items
  FOR INSERT WITH CHECK (
    garage_id = public.get_user_garage_id()
  );

CREATE POLICY "Users can update items in their garage" ON public.items
  FOR UPDATE USING (
    garage_id = public.get_user_garage_id()
  );

CREATE POLICY "Users can delete items in their garage" ON public.items
  FOR DELETE USING (
    garage_id = public.get_user_garage_id()
  );

-- ITEM_CATEGORIES: Users can only access categories in their garage
CREATE POLICY "Users can view categories in their garage" ON public.item_categories
  FOR SELECT USING (
    garage_id = public.get_user_garage_id()
  );

CREATE POLICY "Users can insert categories in their garage" ON public.item_categories
  FOR INSERT WITH CHECK (
    garage_id = public.get_user_garage_id()
  );

CREATE POLICY "Users can update categories in their garage" ON public.item_categories
  FOR UPDATE USING (
    garage_id = public.get_user_garage_id()
  );

CREATE POLICY "Users can delete categories in their garage" ON public.item_categories
  FOR DELETE USING (
    garage_id = public.get_user_garage_id()
  );

-- DOCUMENTS: Users can only access documents in their garage
CREATE POLICY "Users can view documents in their garage" ON public.documents
  FOR SELECT USING (
    garage_id = public.get_user_garage_id()
  );

CREATE POLICY "Users can insert documents in their garage" ON public.documents
  FOR INSERT WITH CHECK (
    garage_id = public.get_user_garage_id()
  );

CREATE POLICY "Users can update documents in their garage" ON public.documents
  FOR UPDATE USING (
    garage_id = public.get_user_garage_id()
  );

CREATE POLICY "Users can delete documents in their garage" ON public.documents
  FOR DELETE USING (
    garage_id = public.get_user_garage_id()
  );

-- DOCUMENT_LINES: Users can only access lines of documents in their garage
CREATE POLICY "Users can view document lines in their garage" ON public.document_lines
  FOR SELECT USING (
    garage_id = public.get_user_garage_id()
  );

CREATE POLICY "Users can insert document lines in their garage" ON public.document_lines
  FOR INSERT WITH CHECK (
    garage_id = public.get_user_garage_id()
  );

CREATE POLICY "Users can update document lines in their garage" ON public.document_lines
  FOR UPDATE USING (
    garage_id = public.get_user_garage_id()
  );

CREATE POLICY "Users can delete document lines in their garage" ON public.document_lines
  FOR DELETE USING (
    garage_id = public.get_user_garage_id()
  );

-- PAYMENTS: Users can only access payments in their garage
CREATE POLICY "Users can view payments in their garage" ON public.payments
  FOR SELECT USING (
    garage_id = public.get_user_garage_id()
  );

CREATE POLICY "Users can insert payments in their garage" ON public.payments
  FOR INSERT WITH CHECK (
    garage_id = public.get_user_garage_id()
  );

CREATE POLICY "Users can update payments in their garage" ON public.payments
  FOR UPDATE USING (
    garage_id = public.get_user_garage_id()
  );

CREATE POLICY "Users can delete payments in their garage" ON public.payments
  FOR DELETE USING (
    garage_id = public.get_user_garage_id()
  );

-- STOCK_MOVEMENTS: Users can only access stock movements in their garage
CREATE POLICY "Users can view stock movements in their garage" ON public.stock_movements
  FOR SELECT USING (
    garage_id = public.get_user_garage_id()
  );

CREATE POLICY "Users can insert stock movements in their garage" ON public.stock_movements
  FOR INSERT WITH CHECK (
    garage_id = public.get_user_garage_id()
  );

CREATE POLICY "Users can update stock movements in their garage" ON public.stock_movements
  FOR UPDATE USING (
    garage_id = public.get_user_garage_id()
  );

CREATE POLICY "Users can delete stock movements in their garage" ON public.stock_movements
  FOR DELETE USING (
    garage_id = public.get_user_garage_id()
  );

-- SUPPLIERS: Users can only access suppliers in their garage
CREATE POLICY "Users can view suppliers in their garage" ON public.suppliers
  FOR SELECT USING (
    garage_id = public.get_user_garage_id()
  );

CREATE POLICY "Users can insert suppliers in their garage" ON public.suppliers
  FOR INSERT WITH CHECK (
    garage_id = public.get_user_garage_id()
  );

CREATE POLICY "Users can update suppliers in their garage" ON public.suppliers
  FOR UPDATE USING (
    garage_id = public.get_user_garage_id()
  );

CREATE POLICY "Users can delete suppliers in their garage" ON public.suppliers
  FOR DELETE USING (
    garage_id = public.get_user_garage_id()
  );

-- TREASURY_ENTRIES: Users can only access treasury entries in their garage
CREATE POLICY "Users can view treasury entries in their garage" ON public.treasury_entries
  FOR SELECT USING (
    garage_id = public.get_user_garage_id()
  );

CREATE POLICY "Users can insert treasury entries in their garage" ON public.treasury_entries
  FOR INSERT WITH CHECK (
    garage_id = public.get_user_garage_id()
  );

CREATE POLICY "Users can update treasury entries in their garage" ON public.treasury_entries
  FOR UPDATE USING (
    garage_id = public.get_user_garage_id()
  );

CREATE POLICY "Users can delete treasury entries in their garage" ON public.treasury_entries
  FOR DELETE USING (
    garage_id = public.get_user_garage_id()
  );

-- AGENDA_EVENTS: Users can only access agenda events in their garage
CREATE POLICY "Users can view agenda events in their garage" ON public.agenda_events
  FOR SELECT USING (
    garage_id = public.get_user_garage_id()
  );

CREATE POLICY "Users can insert agenda events in their garage" ON public.agenda_events
  FOR INSERT WITH CHECK (
    garage_id = public.get_user_garage_id()
  );

CREATE POLICY "Users can update agenda events in their garage" ON public.agenda_events
  FOR UPDATE USING (
    garage_id = public.get_user_garage_id()
  );

CREATE POLICY "Users can delete agenda events in their garage" ON public.agenda_events
  FOR DELETE USING (
    garage_id = public.get_user_garage_id()
  );

-- PROFILES: Users can view their own profile and profiles of users in their garage
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (
    id = auth.uid()
  );

CREATE POLICY "Users can view profiles in their garage" ON public.profiles
  FOR SELECT USING (
    id IN (
      SELECT user_id FROM public.garage_members
      WHERE garage_id = public.get_user_garage_id() AND active = true
    )
  );

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (
    id = auth.uid()
  );

-- AUDIT_LOG: Users can only view audit logs in their garage
CREATE POLICY "Users can view audit logs in their garage" ON public.audit_log
  FOR SELECT USING (
    garage_id = public.get_user_garage_id()
  );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;