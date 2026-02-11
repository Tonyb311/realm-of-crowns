-- Map Coordinates Migration
-- Adds mapX/mapY to towns and offsetX/offsetY to travel_nodes
-- Populates town coordinates from existing features JSON field
-- Generates curve offsets for travel nodes

-- ============================================================
-- Step 1: Add columns
-- ============================================================

ALTER TABLE "towns" ADD COLUMN "map_x" DOUBLE PRECISION;
ALTER TABLE "towns" ADD COLUMN "map_y" DOUBLE PRECISION;

ALTER TABLE "travel_nodes" ADD COLUMN "offset_x" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "travel_nodes" ADD COLUMN "offset_y" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- ============================================================
-- Step 2: Populate town coordinates from features JSON
-- ============================================================

UPDATE "towns"
SET "map_x" = (features::jsonb ->> 'x')::double precision,
    "map_y" = (features::jsonb ->> 'y')::double precision
WHERE features::jsonb ->> 'x' IS NOT NULL;

-- ============================================================
-- Step 3: Generate curve offsets for travel nodes
-- Uses a deterministic formula based on node position within route
-- to create organic-looking curved paths between towns.
-- Nodes near the middle of routes get larger offsets.
-- ============================================================

-- Create a function to generate deterministic offsets
CREATE OR REPLACE FUNCTION generate_node_offsets() RETURNS void AS $$
DECLARE
  node_rec RECORD;
  route_rec RECORD;
  from_town RECORD;
  to_town RECORD;
  t FLOAT;
  mid_factor FLOAT;
  dx FLOAT;
  dy FLOAT;
  perp_x FLOAT;
  perp_y FLOAT;
  perp_len FLOAT;
  hash_val INT;
  offset_magnitude FLOAT;
  ox FLOAT;
  oy FLOAT;
BEGIN
  FOR node_rec IN
    SELECT tn.id, tn.route_id, tn.node_index, tn.name
    FROM travel_nodes tn
  LOOP
    -- Get route info
    SELECT tr.*, t1.map_x as from_x, t1.map_y as from_y,
           t2.map_x as to_x, t2.map_y as to_y, tr.node_count
    INTO route_rec
    FROM travel_routes tr
    JOIN towns t1 ON tr.from_town_id = t1.id
    JOIN towns t2 ON tr.to_town_id = t2.id
    WHERE tr.id = node_rec.route_id;

    IF route_rec.from_x IS NULL OR route_rec.to_x IS NULL THEN
      CONTINUE;
    END IF;

    -- Calculate direction vector
    dx := route_rec.to_x - route_rec.from_x;
    dy := route_rec.to_y - route_rec.from_y;

    -- Perpendicular vector (rotated 90 degrees)
    perp_x := -dy;
    perp_y := dx;

    -- Normalize perpendicular
    perp_len := sqrt(perp_x * perp_x + perp_y * perp_y);
    IF perp_len > 0 THEN
      perp_x := perp_x / perp_len;
      perp_y := perp_y / perp_len;
    END IF;

    -- t = position along route (0 to 1)
    t := node_rec.node_index::float / (route_rec.node_count + 1)::float;

    -- mid_factor peaks at 0.5 (middle of route), zero at endpoints
    mid_factor := 4.0 * t * (1.0 - t);

    -- Deterministic hash from route_id and node_index for variation
    hash_val := abs(hashtext(node_rec.route_id || '-' || node_rec.node_index::text));

    -- Offset magnitude: 15-40 pixels perpendicular, scaled by mid_factor
    offset_magnitude := (15.0 + (hash_val % 26)) * mid_factor;

    -- Alternate direction based on hash (some curve left, some right)
    IF (hash_val % 2) = 0 THEN
      offset_magnitude := -offset_magnitude;
    END IF;

    -- Add some along-route jitter too (smaller, +-8 pixels)
    ox := perp_x * offset_magnitude + (((hash_val / 7) % 17) - 8.0) * mid_factor * 0.5;
    oy := perp_y * offset_magnitude + (((hash_val / 11) % 17) - 8.0) * mid_factor * 0.5;

    -- Clamp offsets to reasonable range
    ox := GREATEST(-50, LEAST(50, ox));
    oy := GREATEST(-50, LEAST(50, oy));

    UPDATE travel_nodes SET offset_x = ox, offset_y = oy WHERE id = node_rec.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT generate_node_offsets();
DROP FUNCTION generate_node_offsets();

-- ============================================================
-- Step 4: Index for map queries
-- ============================================================

CREATE INDEX "towns_map_coordinates_idx" ON "towns"("map_x", "map_y") WHERE "map_x" IS NOT NULL;
