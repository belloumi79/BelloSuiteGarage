-- ----------------------------------------------------------------------------
-- Function: public.next_document_number(p_garage_id uuid, p_type text)
--
-- Atomically returns the next formatted document number for a garage/type and
-- increments the sequence. Called from the documents API (POST + transition).
--
-- Types map to the garages columns:
--   'invoice'      -> invoice_prefix      / next_invoice_number
--   'quote'        -> quote_prefix        / next_quote_number
--   'repair_order' -> order_prefix        / next_order_number
--
-- The number is zero-padded to 6 digits (e.g. FA-000101). DEFAULT fallbacks
-- match the garages model defaults so it works even on legacy rows.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.next_document_number(p_garage_id uuid, p_type text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prefix text;
  v_next   int;
  v_column text;
  v_result text;
BEGIN
  -- Map the document type to its counter column.
  v_column := CASE p_type
    WHEN 'invoice'      THEN 'next_invoice_number'
    WHEN 'quote'        THEN 'next_quote_number'
    WHEN 'repair_order' THEN 'next_order_number'
    ELSE NULL
  END;

  IF v_column IS NULL THEN
    RAISE EXCEPTION 'Unknown document type: %', p_type
      USING ERRCODE = '22023'; -- invalid_parameter_value
  END IF;

  -- Lock the garage row and read the current counter + prefix atomically.
  SELECT
    CASE p_type
      WHEN 'invoice'      THEN COALESCE(invoice_prefix, 'F')
      WHEN 'quote'        THEN COALESCE(quote_prefix, 'D')
      WHEN 'repair_order' THEN COALESCE(order_prefix, 'OR')
    END,
    COALESCE(
      CASE p_type
        WHEN 'invoice'      THEN next_invoice_number
        WHEN 'quote'        THEN next_quote_number
        WHEN 'repair_order' THEN next_order_number
      END,
      1
    )
  INTO v_prefix, v_next
  FROM public.garages
  WHERE id = p_garage_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Garage not found: %', p_garage_id
      USING ERRCODE = 'P0002'; -- undefined_object
  END IF;

  v_result := v_prefix || '-' || lpad(v_next::text, 6, '0');

  -- Increment the sequence for next time. PostgreSQL cannot use a CASE
  -- expression as a SET column target, so we run a guarded UPDATE per type.
  IF p_type = 'invoice' THEN
    UPDATE public.garages
    SET next_invoice_number = v_next + 1, updated_at = now()
    WHERE id = p_garage_id;
  ELSEIF p_type = 'quote' THEN
    UPDATE public.garages
    SET next_quote_number = v_next + 1, updated_at = now()
    WHERE id = p_garage_id;
  ELSEIF p_type = 'repair_order' THEN
    UPDATE public.garages
    SET next_order_number = v_next + 1, updated_at = now()
    WHERE id = p_garage_id;
  END IF;

  RETURN v_result;
END;
$$;

-- Allow authenticated app users to call it.
GRANT EXECUTE ON FUNCTION public.next_document_number(uuid, text) TO authenticated;
