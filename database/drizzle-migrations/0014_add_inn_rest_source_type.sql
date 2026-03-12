-- Add INN_REST to ConsumableSourceType enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'INN_REST'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ConsumableSourceType')
  ) THEN
    ALTER TYPE "ConsumableSourceType" ADD VALUE 'INN_REST';
  END IF;
END
$$;
