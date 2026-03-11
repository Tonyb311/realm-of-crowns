-- Convert speedModifier from integer to real to support fractional speed bonuses (e.g., 1.15 from Swift Stride feat)
ALTER TABLE "character_travel_states" ALTER COLUMN "speed_modifier" TYPE real USING "speed_modifier"::real;
ALTER TABLE "group_travel_states" ALTER COLUMN "speed_modifier" TYPE real USING "speed_modifier"::real;
