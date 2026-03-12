import { pgTable, varchar, timestamp, text, integer, real, uniqueIndex, index, foreignKey, doublePrecision, jsonb, date, boolean, type AnyPgColumn } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"
import { actionStatus, beastClan, biomeType, buildingType, combatSessionStatus, combatStance, combatType, consumableSourceType, dailyActionStatus, dailyActionType, diplomacyActionType, dragonBloodline, electionPhase, electionStatus, electionType, elementalType, equipSlot, foodPriority, friendStatus, hungerState, impeachmentStatus, itemRarity, itemType, lawStatus, loanStatus, logLevel, messageChannel, npcRole, petitionStatus, professionTier, professionType, questType, race, raceTier, relationStatus, resourceType, targetSelectionStrategy, travelEngagementMode, treatyStatus, treatyType, warStatus } from './enums'

// ============================================================
// AUTH
// ============================================================

export const users = pgTable("users", {
	id: text().primaryKey().notNull(),
	email: text().notNull(),
	username: text().notNull(),
	passwordHash: text("password_hash").notNull(),
	role: text().default('player').notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
	activeCharacterId: text("active_character_id"),
	lastSwitchDay: integer("last_switch_day"),
	isTestAccount: boolean("is_test_account").default(false).notNull(),
}, (table) => [
	uniqueIndex("users_email_key").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("users_is_test_account_idx").using("btree", table.isTestAccount.asc().nullsLast().op("bool_ops")),
	uniqueIndex("users_username_key").using("btree", table.username.asc().nullsLast().op("text_ops")),
]);

// ============================================================
// WORLD
// ============================================================

export const townResources = pgTable("town_resources", {
	id: text().primaryKey().notNull(),
	townId: text("town_id").notNull(),
	resourceType: resourceType("resource_type").notNull(),
	abundance: integer().default(50).notNull(),
	respawnRate: doublePrecision("respawn_rate").default(1).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
}, (table) => [
	index("town_resources_town_id_idx").using("btree", table.townId.asc().nullsLast().op("text_ops")),
	uniqueIndex("town_resources_town_id_resource_type_key").using("btree", table.townId.asc().nullsLast().op("text_ops"), table.resourceType.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.townId],
			foreignColumns: [towns.id],
			name: "town_resources_town_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const regionBorders = pgTable("region_borders", {
	id: text().primaryKey().notNull(),
	regionId1: text("region_id_1").notNull(),
	regionId2: text("region_id_2").notNull(),
	type: text().default('land').notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	uniqueIndex("region_borders_region_id_1_region_id_2_key").using("btree", table.regionId1.asc().nullsLast().op("text_ops"), table.regionId2.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.regionId1],
			foreignColumns: [regions.id],
			name: "region_borders_region_id_1_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.regionId2],
			foreignColumns: [regions.id],
			name: "region_borders_region_id_2_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const kingdoms = pgTable("kingdoms", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	rulerId: text("ruler_id").references((): AnyPgColumn => characters.id, { onUpdate: "cascade", onDelete: "set null" }),
	capitalTownId: text("capital_town_id"),
	treasury: integer().default(0).notNull(),
	laws: jsonb().default([]).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
}, (table) => [
	uniqueIndex("kingdoms_capital_town_id_key").using("btree", table.capitalTownId.asc().nullsLast().op("text_ops")),
	uniqueIndex("kingdoms_name_key").using("btree", table.name.asc().nullsLast().op("text_ops")),
	uniqueIndex("kingdoms_ruler_id_key").using("btree", table.rulerId.asc().nullsLast().op("text_ops")),
]);

export const regions = pgTable("regions", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	biome: biomeType().notNull(),
	levelMin: integer("level_min").default(1).notNull(),
	levelMax: integer("level_max").default(50).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
	kingdomId: text("kingdom_id"),
}, (table) => [
	index("regions_kingdom_id_idx").using("btree", table.kingdomId.asc().nullsLast().op("text_ops")),
	uniqueIndex("regions_name_key").using("btree", table.name.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.kingdomId],
			foreignColumns: [kingdoms.id],
			name: "regions_kingdom_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const towns = pgTable("towns", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	regionId: text("region_id").notNull(),
	population: integer().default(0).notNull(),
	biome: biomeType().notNull(),
	description: text(),
	mayorId: text("mayor_id").references((): AnyPgColumn => characters.id, { onUpdate: "cascade", onDelete: "set null" }),
	features: jsonb().default([]).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
	isReleased: boolean("is_released").default(false).notNull(),
	releasedAt: timestamp("released_at", { precision: 3, mode: 'string' }),
	releaseOrder: integer("release_order"),
	releaseNotes: text("release_notes"),
	mapX: doublePrecision("map_x"),
	mapY: doublePrecision("map_y"),
}, (table) => [
	index("towns_map_coordinates_idx").using("btree", table.mapX.asc().nullsLast().op("float8_ops"), table.mapY.asc().nullsLast().op("float8_ops")).where(sql`(map_x IS NOT NULL)`),
	index("towns_mayor_id_idx").using("btree", table.mayorId.asc().nullsLast().op("text_ops")),
	uniqueIndex("towns_name_key").using("btree", table.name.asc().nullsLast().op("text_ops")),
	index("towns_region_id_idx").using("btree", table.regionId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.regionId],
			foreignColumns: [regions.id],
			name: "towns_region_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const travelRoutes = pgTable("travel_routes", {
	id: text().primaryKey().notNull(),
	fromTownId: text("from_town_id").notNull(),
	toTownId: text("to_town_id").notNull(),
	dangerLevel: integer("danger_level").default(1).notNull(),
	terrain: text().notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
	name: text().default('').notNull(),
	description: text().default('').notNull(),
	nodeCount: integer("node_count").default(3).notNull(),
	difficulty: text().default('moderate').notNull(),
	isReleased: boolean("is_released").default(false).notNull(),
	bidirectional: boolean().default(true).notNull(),
}, (table) => [
	index("travel_routes_from_town_id_idx").using("btree", table.fromTownId.asc().nullsLast().op("text_ops")),
	uniqueIndex("travel_routes_from_town_id_to_town_id_key").using("btree", table.fromTownId.asc().nullsLast().op("text_ops"), table.toTownId.asc().nullsLast().op("text_ops")),
	index("travel_routes_is_released_idx").using("btree", table.isReleased.asc().nullsLast().op("bool_ops")),
	index("travel_routes_to_town_id_idx").using("btree", table.toTownId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.fromTownId],
			foreignColumns: [towns.id],
			name: "travel_routes_from_town_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.toTownId],
			foreignColumns: [towns.id],
			name: "travel_routes_to_town_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const exclusiveZones = pgTable("exclusive_zones", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	requiredRaces: jsonb("required_races").default([]).notNull(),
	regionId: text("region_id").notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
	availableResources: jsonb("available_resources").default([]).notNull(),
	dangerLevel: integer("danger_level").default(1).notNull(),
	entryRequirements: jsonb("entry_requirements").default([]).notNull(),
	owningRace: race("owning_race"),
	requiredLevel: integer("required_level").default(1).notNull(),
	specialMechanics: jsonb("special_mechanics").default({}).notNull(),
	zoneType: text("zone_type").default('exclusive').notNull(),
}, (table) => [
	index("exclusive_zones_region_id_idx").using("btree", table.regionId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.regionId],
			foreignColumns: [regions.id],
			name: "exclusive_zones_region_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const worldEvents = pgTable("world_events", {
	id: text().primaryKey().notNull(),
	eventType: text("event_type").notNull(),
	title: text().notNull(),
	description: text().notNull(),
	metadata: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("world_events_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("world_events_event_type_idx").using("btree", table.eventType.asc().nullsLast().op("text_ops")),
]);

export const travelNodes = pgTable("travel_nodes", {
	id: text().primaryKey().notNull(),
	routeId: text("route_id").notNull(),
	nodeIndex: integer("node_index").notNull(),
	name: text().notNull(),
	description: text().notNull(),
	terrain: text().notNull(),
	dangerLevel: integer("danger_level").default(3).notNull(),
	specialType: text("special_type"),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	offsetX: doublePrecision("offset_x").default(0).notNull(),
	offsetY: doublePrecision("offset_y").default(0).notNull(),
}, (table) => [
	index("travel_nodes_route_id_idx").using("btree", table.routeId.asc().nullsLast().op("text_ops")),
	uniqueIndex("travel_nodes_route_id_node_index_key").using("btree", table.routeId.asc().nullsLast().op("int4_ops"), table.nodeIndex.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.routeId],
			foreignColumns: [travelRoutes.id],
			name: "travel_nodes_route_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

// ============================================================
// CHARACTERS
// ============================================================

export const racialRelations = pgTable("racial_relations", {
	id: text().primaryKey().notNull(),
	race1: race().notNull(),
	race2: race().notNull(),
	status: relationStatus().default('NEUTRAL').notNull(),
	modifier: integer().default(0).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
}, (table) => [
	uniqueIndex("racial_relations_race1_race2_key").using("btree", table.race1.asc().nullsLast().op("enum_ops"), table.race2.asc().nullsLast().op("enum_ops")),
]);

export const characterEquipment = pgTable("character_equipment", {
	id: text().primaryKey().notNull(),
	characterId: text("character_id").notNull(),
	slot: equipSlot().notNull(),
	itemId: text("item_id").notNull().references((): AnyPgColumn => items.id, { onUpdate: "cascade", onDelete: "cascade" }),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
}, (table) => [
	index("character_equipment_character_id_idx").using("btree", table.characterId.asc().nullsLast().op("text_ops")),
	uniqueIndex("character_equipment_character_id_slot_key").using("btree", table.characterId.asc().nullsLast().op("text_ops"), table.slot.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.characterId],
			foreignColumns: [characters.id],
			name: "character_equipment_character_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const inventories = pgTable("inventories", {
	id: text().primaryKey().notNull(),
	characterId: text("character_id").notNull(),
	itemId: text("item_id").notNull().references((): AnyPgColumn => items.id, { onUpdate: "cascade", onDelete: "cascade" }),
	quantity: integer().default(1).notNull(),
	slotPosition: integer("slot_position"),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
}, (table) => [
	index("inventories_character_id_idx").using("btree", table.characterId.asc().nullsLast().op("text_ops")),
	uniqueIndex("inventories_character_id_item_id_key").using("btree", table.characterId.asc().nullsLast().op("text_ops"), table.itemId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.characterId],
			foreignColumns: [characters.id],
			name: "inventories_character_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const professionXp = pgTable("profession_xp", {
	id: text().primaryKey().notNull(),
	characterId: text("character_id").notNull(),
	professionType: professionType("profession_type").notNull(),
	xpGained: integer("xp_gained").notNull(),
	source: text().notNull(),
	timestamp: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("profession_xp_character_id_profession_type_idx").using("btree", table.characterId.asc().nullsLast().op("text_ops"), table.professionType.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.characterId],
			foreignColumns: [characters.id],
			name: "profession_xp_character_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const notifications = pgTable("notifications", {
	id: text().primaryKey().notNull(),
	characterId: text("character_id").notNull(),
	type: text().notNull(),
	title: text().notNull(),
	message: text().notNull(),
	read: boolean().default(false).notNull(),
	data: jsonb().default({}).notNull(),
	timestamp: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
}, (table) => [
	index("notifications_character_id_idx").using("btree", table.characterId.asc().nullsLast().op("text_ops")),
	index("notifications_character_id_read_created_at_idx").using("btree", table.characterId.asc().nullsLast().op("bool_ops"), table.read.asc().nullsLast().op("timestamp_ops"), table.createdAt.asc().nullsLast().op("bool_ops")),
	index("notifications_character_id_read_idx").using("btree", table.characterId.asc().nullsLast().op("bool_ops"), table.read.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.characterId],
			foreignColumns: [characters.id],
			name: "notifications_character_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const racialAbilityCooldowns = pgTable("racial_ability_cooldowns", {
	id: text().primaryKey().notNull(),
	characterId: text("character_id").notNull(),
	abilityName: text("ability_name").notNull(),
	lastUsed: timestamp("last_used", { precision: 3, mode: 'string' }).notNull(),
	cooldownEnds: timestamp("cooldown_ends", { precision: 3, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
}, (table) => [
	uniqueIndex("racial_ability_cooldowns_character_id_ability_name_key").using("btree", table.characterId.asc().nullsLast().op("text_ops"), table.abilityName.asc().nullsLast().op("text_ops")),
	index("racial_ability_cooldowns_character_id_idx").using("btree", table.characterId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.characterId],
			foreignColumns: [characters.id],
			name: "racial_ability_cooldowns_character_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const changelingDisguises = pgTable("changeling_disguises", {
	id: text().primaryKey().notNull(),
	characterId: text("character_id").notNull(),
	disguisedAs: text("disguised_as"),
	disguiseRace: race("disguise_race"),
	startedAt: timestamp("started_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
}, (table) => [
	uniqueIndex("changeling_disguises_character_id_key").using("btree", table.characterId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.characterId],
			foreignColumns: [characters.id],
			name: "changeling_disguises_character_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const playerAchievements = pgTable("player_achievements", {
	id: text().primaryKey().notNull(),
	characterId: text("character_id").notNull(),
	achievementId: text("achievement_id").notNull(),
	unlockedAt: timestamp("unlocked_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	uniqueIndex("player_achievements_character_id_achievement_id_key").using("btree", table.characterId.asc().nullsLast().op("text_ops"), table.achievementId.asc().nullsLast().op("text_ops")),
	index("player_achievements_character_id_idx").using("btree", table.characterId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.achievementId],
			foreignColumns: [achievements.id],
			name: "player_achievements_achievement_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.characterId],
			foreignColumns: [characters.id],
			name: "player_achievements_character_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const achievements = pgTable("achievements", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	criteria: jsonb().default({}).notNull(),
	reward: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
}, (table) => [
	uniqueIndex("achievements_name_key").using("btree", table.name.asc().nullsLast().op("text_ops")),
]);

export const forgebornMaintenance = pgTable("forgeborn_maintenance", {
	id: text().primaryKey().notNull(),
	characterId: text("character_id").notNull(),
	lastMaintenance: timestamp("last_maintenance", { precision: 3, mode: 'string' }).notNull(),
	condition: integer().default(100).notNull(),
	nextRequired: timestamp("next_required", { precision: 3, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
}, (table) => [
	uniqueIndex("forgeborn_maintenance_character_id_key").using("btree", table.characterId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.characterId],
			foreignColumns: [characters.id],
			name: "forgeborn_maintenance_character_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const characterAbilities = pgTable("character_abilities", {
	id: text().primaryKey().notNull(),
	characterId: text("character_id").notNull(),
	abilityId: text("ability_id").notNull().references((): AnyPgColumn => abilities.id, { onUpdate: "cascade", onDelete: "cascade" }),
	unlockedAt: timestamp("unlocked_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	uniqueIndex("character_abilities_character_id_ability_id_key").using("btree", table.characterId.asc().nullsLast().op("text_ops"), table.abilityId.asc().nullsLast().op("text_ops")),
	index("character_abilities_character_id_idx").using("btree", table.characterId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.characterId],
			foreignColumns: [characters.id],
			name: "character_abilities_character_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const characterAppearances = pgTable("character_appearances", {
	id: text().primaryKey().notNull(),
	characterId: text("character_id").notNull(),
	apparentRace: race("apparent_race").notNull(),
	apparentName: text("apparent_name"),
	features: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
}, (table) => [
	index("character_appearances_character_id_idx").using("btree", table.characterId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.characterId],
			foreignColumns: [characters.id],
			name: "character_appearances_character_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const characters = pgTable("characters", {
	id: text().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	name: text().notNull(),
	race: race().notNull(),
	dragonBloodline: dragonBloodline("dragon_bloodline"),
	beastClan: beastClan("beast_clan"),
	elementalType: elementalType("elemental_type"),
	level: integer().default(1).notNull(),
	xp: integer().default(0).notNull(),
	stats: jsonb().default({}).notNull(),
	currentTownId: text("current_town_id"),
	health: integer().default(100).notNull(),
	maxHealth: integer("max_health").default(100).notNull(),
	gold: integer().default(0).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
	class: text(),
	specialization: text(),
	title: text(),
	unspentStatPoints: integer("unspent_stat_points").default(0).notNull(),
	currentAppearanceRace: race("current_appearance_race"),
	raceTier: raceTier("race_tier").default('CORE').notNull(),
	subRace: jsonb("sub_race"),
	unlockedAbilities: jsonb("unlocked_abilities").default([]).notNull(),
	abilityPriorityQueue: jsonb("ability_priority_queue"),
	combatStance: combatStance("combat_stance").default('BALANCED').notNull(),
	daysSinceLastMeal: integer("days_since_last_meal").default(0).notNull(),
	foodPriority: foodPriority("food_priority").default('EXPIRING_FIRST').notNull(),
	hungerState: hungerState("hunger_state").default('FED').notNull(),
	itemUsageRules: jsonb("item_usage_rules"),
	neverRetreat: boolean("never_retreat").default(false).notNull(),
	preferredFoodId: text("preferred_food_id").references((): AnyPgColumn => items.id, { onUpdate: "cascade", onDelete: "set null" }),
	pvpLootBehavior: text("pvp_loot_behavior").default('GOLD_ONLY').notNull(),
	retreatHpThreshold: integer("retreat_hp_threshold").default(25).notNull(),
	retreatOppositionRatio: doublePrecision("retreat_opposition_ratio").default(3).notNull(),
	retreatRoundLimit: integer("retreat_round_limit"),
	soulFadeStage: integer("soul_fade_stage").default(0).notNull(),
	structuralDecayStage: integer("structural_decay_stage").default(0).notNull(),
	wellRested: boolean("well_rested").default(false).notNull(),
	travelStatus: text("travel_status").default('idle').notNull(),
	homeTownId: text("home_town_id"),
	escrowedGold: integer("escrowed_gold").default(0).notNull(),
	lastRelocationGameDay: integer("last_relocation_game_day"),
	bio: text(),
	bonusSaveProficiencies: jsonb("bonus_save_proficiencies").default([]).notNull(),
	feats: jsonb().default([]).notNull(),
	pendingFeatChoice: boolean("pending_feat_choice").default(false).notNull(),
	potionBuffUsedToday: boolean("potion_buff_used_today").default(false).notNull(),
	foodUsedToday: boolean("food_used_today").default(false).notNull(),
	scrollUsedToday: boolean("scroll_used_today").default(false).notNull(),
	healingPotionThreshold: integer("healing_potion_threshold").default(50).notNull(),
	maxHealingPotionsPerCombat: integer("max_healing_potions_per_combat").default(1).notNull(),
	travelEngagementMode: travelEngagementMode("travel_engagement_mode").default('ALWAYS_FIGHT').notNull(),
	travelFleeMaxMonsterLevel: integer("travel_flee_max_monster_level"),
	targetSelectionStrategy: targetSelectionStrategy("target_selection_strategy").default('FIRST').notNull(),
	checkedInInnId: text("checked_in_inn_id").references((): AnyPgColumn => buildings.id, { onUpdate: "cascade", onDelete: "set null" }),
}, (table) => [
	index("characters_checked_in_inn_id_idx").using("btree", table.checkedInInnId.asc().nullsLast().op("text_ops")),
	index("characters_current_town_id_idx").using("btree", table.currentTownId.asc().nullsLast().op("text_ops")),
	index("characters_race_idx").using("btree", table.race.asc().nullsLast().op("enum_ops")),
	index("characters_travel_status_idx").using("btree", table.travelStatus.asc().nullsLast().op("text_ops")),
	index("characters_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.currentTownId],
			foreignColumns: [towns.id],
			name: "characters_current_town_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.homeTownId],
			foreignColumns: [towns.id],
			name: "characters_home_town_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "characters_user_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const characterActiveEffects = pgTable("character_active_effects", {
	id: text().primaryKey().notNull(),
	characterId: text("character_id").notNull(),
	sourceType: consumableSourceType("source_type").notNull(),
	effectType: text("effect_type").notNull(),
	magnitude: integer().default(0).notNull(),
	effectType2: text("effect_type_2"),
	magnitude2: integer("magnitude_2"),
	itemName: text("item_name").notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	expiresAt: timestamp("expires_at", { precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("character_active_effects_character_id_idx").using("btree", table.characterId.asc().nullsLast().op("text_ops")),
	index("character_active_effects_expires_at_idx").using("btree", table.expiresAt.asc().nullsLast()),
	foreignKey({
			columns: [table.characterId],
			foreignColumns: [characters.id],
			name: "character_active_effects_character_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const characterTravelStates = pgTable("character_travel_states", {
	id: text().primaryKey().notNull(),
	characterId: text("character_id").notNull(),
	routeId: text("route_id").notNull(),
	currentNodeIndex: integer("current_node_index").notNull(),
	direction: text().default('forward').notNull(),
	speedModifier: real("speed_modifier").default(1).notNull(),
	startedAt: timestamp("started_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	lastTickAt: timestamp("last_tick_at", { precision: 3, mode: 'string' }),
	status: text().default('traveling').notNull(),
}, (table) => [
	uniqueIndex("character_travel_states_character_id_key").using("btree", table.characterId.asc().nullsLast().op("text_ops")),
	index("character_travel_states_route_id_current_node_index_idx").using("btree", table.routeId.asc().nullsLast().op("int4_ops"), table.currentNodeIndex.asc().nullsLast().op("int4_ops")),
	index("character_travel_states_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.characterId],
			foreignColumns: [characters.id],
			name: "character_travel_states_character_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.routeId],
			foreignColumns: [travelRoutes.id],
			name: "character_travel_states_route_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

// ============================================================
// CRAFTING & ITEMS
// ============================================================

export const resources = pgTable("resources", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	type: resourceType().notNull(),
	biome: biomeType().notNull(),
	tier: integer().default(1).notNull(),
	description: text(),
	baseGatherTime: integer("base_gather_time").default(60).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
}, (table) => [
	index("resources_biome_idx").using("btree", table.biome.asc().nullsLast().op("enum_ops")),
	uniqueIndex("resources_name_key").using("btree", table.name.asc().nullsLast().op("text_ops")),
	index("resources_type_idx").using("btree", table.type.asc().nullsLast().op("enum_ops")),
]);

export const playerProfessions = pgTable("player_professions", {
	id: text().primaryKey().notNull(),
	characterId: text("character_id").notNull(),
	professionType: professionType("profession_type").notNull(),
	tier: professionTier().default('APPRENTICE').notNull(),
	level: integer().default(1).notNull(),
	xp: integer().default(0).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
	isActive: boolean("is_active").default(true).notNull(),
	specialization: text(),
}, (table) => [
	index("player_professions_character_id_idx").using("btree", table.characterId.asc().nullsLast().op("text_ops")),
	index("player_professions_character_id_is_active_idx").using("btree", table.characterId.asc().nullsLast().op("bool_ops"), table.isActive.asc().nullsLast().op("text_ops")),
	uniqueIndex("player_professions_character_id_profession_type_key").using("btree", table.characterId.asc().nullsLast().op("text_ops"), table.professionType.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.characterId],
			foreignColumns: [characters.id],
			name: "player_professions_character_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const recipes = pgTable("recipes", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	professionType: professionType("profession_type").notNull(),
	tier: professionTier().notNull(),
	ingredients: jsonb().default([]).notNull(),
	result: text().notNull(),
	craftTime: integer("craft_time").default(60).notNull(),
	xpReward: integer("xp_reward").default(10).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
	specialization: text(),
	levelRequired: integer("level_required"),
}, (table) => [
	index("recipes_profession_type_idx").using("btree", table.professionType.asc().nullsLast().op("enum_ops")),
	index("recipes_tier_idx").using("btree", table.tier.asc().nullsLast().op("enum_ops")),
]);

export const craftingActions = pgTable("crafting_actions", {
	id: text().primaryKey().notNull(),
	characterId: text("character_id").notNull(),
	recipeId: text("recipe_id").notNull(),
	status: actionStatus().default('PENDING').notNull(),
	quality: itemRarity(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
	tickDate: timestamp("tick_date", { precision: 3, mode: 'string' }),
}, (table) => [
	index("crafting_actions_character_id_idx").using("btree", table.characterId.asc().nullsLast().op("text_ops")),
	index("crafting_actions_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.characterId],
			foreignColumns: [characters.id],
			name: "crafting_actions_character_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.recipeId],
			foreignColumns: [recipes.id],
			name: "crafting_actions_recipe_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const itemTemplates = pgTable("item_templates", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	type: itemType().notNull(),
	rarity: itemRarity().default('COMMON').notNull(),
	description: text(),
	stats: jsonb().default({}).notNull(),
	durability: integer().default(100).notNull(),
	requirements: jsonb().default({}).notNull(),
	professionRequired: professionType("profession_required"),
	levelRequired: integer("level_required").default(1).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
	foodBuff: jsonb("food_buff"),
	isBeverage: boolean("is_beverage").default(false).notNull(),
	isFood: boolean("is_food").default(false).notNull(),
	isPerishable: boolean("is_perishable").default(false).notNull(),
	shelfLifeDays: integer("shelf_life_days"),
	isPotion: boolean("is_potion").default(false).notNull(),
	baseValue: integer("base_value").default(0).notNull(),
	weight: doublePrecision().default(0).notNull(),
}, (table) => [
	index("item_templates_rarity_idx").using("btree", table.rarity.asc().nullsLast().op("enum_ops")),
	index("item_templates_type_idx").using("btree", table.type.asc().nullsLast().op("enum_ops")),
]);

export const gatheringActions = pgTable("gathering_actions", {
	id: text().primaryKey().notNull(),
	characterId: text("character_id").notNull(),
	resourceId: text("resource_id").notNull(),
	townId: text("town_id").notNull(),
	status: actionStatus().default('PENDING').notNull(),
	quantity: integer().default(1).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
	tickDate: timestamp("tick_date", { precision: 3, mode: 'string' }),
}, (table) => [
	index("gathering_actions_character_id_idx").using("btree", table.characterId.asc().nullsLast().op("text_ops")),
	index("gathering_actions_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.characterId],
			foreignColumns: [characters.id],
			name: "gathering_actions_character_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.resourceId],
			foreignColumns: [resources.id],
			name: "gathering_actions_resource_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.townId],
			foreignColumns: [towns.id],
			name: "gathering_actions_town_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const items = pgTable("items", {
	id: text().primaryKey().notNull(),
	templateId: text("template_id").notNull(),
	ownerId: text("owner_id"),
	currentDurability: integer("current_durability").default(100).notNull(),
	quality: itemRarity().default('COMMON').notNull(),
	craftedById: text("crafted_by_id"),
	enchantments: jsonb().default([]).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
	daysRemaining: integer("days_remaining"),
}, (table) => [
	index("items_crafted_by_id_idx").using("btree", table.craftedById.asc().nullsLast().op("text_ops")),
	index("items_owner_id_idx").using("btree", table.ownerId.asc().nullsLast().op("text_ops")),
	index("items_template_id_idx").using("btree", table.templateId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.craftedById],
			foreignColumns: [characters.id],
			name: "items_crafted_by_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [characters.id],
			name: "items_owner_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.templateId],
			foreignColumns: [itemTemplates.id],
			name: "items_template_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

// ============================================================
// COMBAT
// ============================================================

export const combatLogs = pgTable("combat_logs", {
	id: text().primaryKey().notNull(),
	sessionId: text("session_id").notNull(),
	round: integer().notNull(),
	actorId: text("actor_id").notNull(),
	action: text().notNull(),
	result: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("combat_logs_actor_id_idx").using("btree", table.actorId.asc().nullsLast().op("text_ops")),
	index("combat_logs_session_id_idx").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	index("combat_logs_session_id_round_idx").using("btree", table.sessionId.asc().nullsLast().op("int4_ops"), table.round.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [combatSessions.id],
			name: "combat_logs_session_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const combatParticipants = pgTable("combat_participants", {
	id: text().primaryKey().notNull(),
	sessionId: text("session_id").notNull(),
	characterId: text("character_id").notNull(),
	team: integer().default(0).notNull(),
	initiative: integer().default(0).notNull(),
	currentHp: integer("current_hp").default(100).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
}, (table) => [
	index("combat_participants_character_id_idx").using("btree", table.characterId.asc().nullsLast().op("text_ops")),
	uniqueIndex("combat_participants_session_id_character_id_key").using("btree", table.sessionId.asc().nullsLast().op("text_ops"), table.characterId.asc().nullsLast().op("text_ops")),
	index("combat_participants_session_id_idx").using("btree", table.sessionId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.characterId],
			foreignColumns: [characters.id],
			name: "combat_participants_character_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [combatSessions.id],
			name: "combat_participants_session_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const combatSessions = pgTable("combat_sessions", {
	id: text().primaryKey().notNull(),
	type: combatType().notNull(),
	status: combatSessionStatus().default('ACTIVE').notNull(),
	locationTownId: text("location_town_id"),
	startedAt: timestamp("started_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	endedAt: timestamp("ended_at", { precision: 3, mode: 'string' }),
	log: jsonb().default([]).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
	attackerParams: jsonb("attacker_params"),
	defenderParams: jsonb("defender_params"),
}, (table) => [
	index("combat_sessions_location_town_id_idx").using("btree", table.locationTownId.asc().nullsLast().op("text_ops")),
	index("combat_sessions_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.locationTownId],
			foreignColumns: [towns.id],
			name: "combat_sessions_location_town_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const abilities = pgTable("abilities", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	class: text().notNull(),
	specialization: text().notNull(),
	tier: integer().default(1).notNull(),
	effects: jsonb().default({}).notNull(),
	cooldown: integer().default(0).notNull(),
	prerequisiteAbilityId: text("prerequisite_ability_id"),
	levelRequired: integer("level_required").default(1).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
}, (table) => [
	index("abilities_class_idx").using("btree", table.class.asc().nullsLast().op("text_ops")),
	index("abilities_class_specialization_idx").using("btree", table.class.asc().nullsLast().op("text_ops"), table.specialization.asc().nullsLast().op("text_ops")),
	uniqueIndex("abilities_name_key").using("btree", table.name.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.prerequisiteAbilityId],
			foreignColumns: [table.id],
			name: "abilities_prerequisite_ability_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const combatEncounterLogs = pgTable("combat_encounter_logs", {
	id: text().primaryKey().notNull(),
	type: text().notNull(),
	sessionId: text("session_id"),
	characterId: text("character_id").notNull(),
	characterName: text("character_name").default('').notNull(),
	opponentId: text("opponent_id"),
	opponentName: text("opponent_name").default('').notNull(),
	townId: text("town_id"),
	startedAt: timestamp("started_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	endedAt: timestamp("ended_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	outcome: text().default('').notNull(),
	totalRounds: integer("total_rounds").default(0).notNull(),
	characterStartHp: integer("character_start_hp").default(0).notNull(),
	characterEndHp: integer("character_end_hp").default(0).notNull(),
	opponentStartHp: integer("opponent_start_hp").default(0).notNull(),
	opponentEndHp: integer("opponent_end_hp").default(0).notNull(),
	characterWeapon: text("character_weapon").default('').notNull(),
	opponentWeapon: text("opponent_weapon").default('').notNull(),
	xpAwarded: integer("xp_awarded").default(0).notNull(),
	goldAwarded: integer("gold_awarded").default(0).notNull(),
	lootDropped: text("loot_dropped").default('').notNull(),
	rounds: jsonb().default([]).notNull(),
	summary: text().default('').notNull(),
	simulationTick: integer("simulation_tick"),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	destinationTownId: text("destination_town_id"),
	originTownId: text("origin_town_id"),
	triggerSource: text("trigger_source").default('town_pve').notNull(),
	partyId: text("party_id"),
	simulationRunId: text("simulation_run_id"),
}, (table) => [
	index("combat_encounter_logs_character_id_started_at_idx").using("btree", table.characterId.asc().nullsLast().op("text_ops"), table.startedAt.asc().nullsLast().op("text_ops")),
	index("combat_encounter_logs_party_id_idx").using("btree", table.partyId.asc().nullsLast().op("text_ops")),
	index("combat_encounter_logs_simulation_run_id_idx").using("btree", table.simulationRunId.asc().nullsLast().op("text_ops")),
	index("combat_encounter_logs_simulation_tick_idx").using("btree", table.simulationTick.asc().nullsLast().op("int4_ops")),
	index("combat_encounter_logs_trigger_source_idx").using("btree", table.triggerSource.asc().nullsLast().op("text_ops")),
	index("combat_encounter_logs_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.characterId],
			foreignColumns: [characters.id],
			name: "combat_encounter_logs_character_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.destinationTownId],
			foreignColumns: [towns.id],
			name: "combat_encounter_logs_destination_town_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.originTownId],
			foreignColumns: [towns.id],
			name: "combat_encounter_logs_origin_town_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.partyId],
			foreignColumns: [parties.id],
			name: "combat_encounter_logs_party_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.simulationRunId],
			foreignColumns: [simulationRuns.id],
			name: "combat_encounter_logs_simulation_run_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.townId],
			foreignColumns: [towns.id],
			name: "combat_encounter_logs_town_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const monsters = pgTable("monsters", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	level: integer().default(1).notNull(),
	stats: jsonb().default({}).notNull(),
	lootTable: jsonb("loot_table").default([]).notNull(),
	regionId: text("region_id"),
	biome: biomeType().notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
	abilities: jsonb().default([]).notNull(),
	damageType: text("damage_type").default('BLUDGEONING').notNull(),
	resistances: jsonb().default([]).notNull(),
	immunities: jsonb().default([]).notNull(),
	vulnerabilities: jsonb().default([]).notNull(),
	conditionImmunities: jsonb("condition_immunities").default([]).notNull(),
	critImmunity: boolean("crit_immunity").default(false).notNull(),
	critResistance: integer("crit_resistance").default(0).notNull(),
	expandedCritRange: integer("expanded_crit_range").default(0).notNull(),
	formulaCr: doublePrecision("formula_cr"),
	simCr: doublePrecision("sim_cr"),
	encounterType: text("encounter_type").default('standard').notNull(),
	legendaryActions: integer("legendary_actions").default(0).notNull(),
	legendaryResistances: integer("legendary_resistances").default(0).notNull(),
	phaseTransitions: jsonb("phase_transitions").default([]).notNull(),
	category: text().default('beast').notNull(),
	sentient: boolean().default(false).notNull(),
	size: text().default('medium').notNull(),
	tags: jsonb().default({}).notNull(),
	family: text(),
	attackStat: text('attack_stat'),
}, (table) => [
	index("monsters_level_idx").using("btree", table.level.asc().nullsLast().op("int4_ops")),
	index("monsters_region_id_idx").using("btree", table.regionId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.regionId],
			foreignColumns: [regions.id],
			name: "monsters_region_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

// ============================================================
// ECONOMY
// ============================================================

export const priceHistories = pgTable("price_histories", {
	id: text().primaryKey().notNull(),
	itemTemplateId: text("item_template_id").notNull(),
	townId: text("town_id").notNull(),
	avgPrice: doublePrecision("avg_price").notNull(),
	volume: integer().default(0).notNull(),
	date: date().notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("price_histories_item_template_id_idx").using("btree", table.itemTemplateId.asc().nullsLast().op("text_ops")),
	uniqueIndex("price_histories_item_template_id_town_id_date_key").using("btree", table.itemTemplateId.asc().nullsLast().op("text_ops"), table.townId.asc().nullsLast().op("text_ops"), table.date.asc().nullsLast().op("text_ops")),
	index("price_histories_town_id_idx").using("btree", table.townId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.itemTemplateId],
			foreignColumns: [itemTemplates.id],
			name: "price_histories_item_template_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.townId],
			foreignColumns: [towns.id],
			name: "price_histories_town_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const caravans = pgTable("caravans", {
	id: text().primaryKey().notNull(),
	ownerId: text("owner_id").notNull(),
	fromTownId: text("from_town_id").notNull(),
	toTownId: text("to_town_id").notNull(),
	cargo: jsonb().default([]).notNull(),
	status: actionStatus().default('PENDING').notNull(),
	departedAt: timestamp("departed_at", { precision: 3, mode: 'string' }),
	arrivesAt: timestamp("arrives_at", { precision: 3, mode: 'string' }),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
}, (table) => [
	index("caravans_owner_id_idx").using("btree", table.ownerId.asc().nullsLast().op("text_ops")),
	index("caravans_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.fromTownId],
			foreignColumns: [towns.id],
			name: "caravans_from_town_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [characters.id],
			name: "caravans_owner_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.toTownId],
			foreignColumns: [towns.id],
			name: "caravans_to_town_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const marketListings = pgTable("market_listings", {
	id: text().primaryKey().notNull(),
	sellerId: text("seller_id").notNull(),
	itemId: text("item_id").notNull(),
	price: integer().notNull(),
	quantity: integer().default(1).notNull(),
	townId: text("town_id").notNull(),
	listedAt: timestamp("listed_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	expiresAt: timestamp("expires_at", { precision: 3, mode: 'string' }),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
	itemTemplateId: text("item_template_id").default('').notNull(),
	itemName: text("item_name").default('').notNull(),
	status: text().default('active').notNull(),
	auctionCycleId: text("auction_cycle_id"),
	soldAt: timestamp("sold_at", { precision: 3, mode: 'string' }),
	soldTo: text("sold_to"),
	soldPrice: integer("sold_price"),
}, (table) => [
	index("market_listings_item_id_idx").using("btree", table.itemId.asc().nullsLast().op("text_ops")),
	index("market_listings_seller_id_idx").using("btree", table.sellerId.asc().nullsLast().op("text_ops")),
	index("market_listings_status_town_id_idx").using("btree", table.status.asc().nullsLast().op("text_ops"), table.townId.asc().nullsLast().op("text_ops")),
	index("market_listings_town_id_idx").using("btree", table.townId.asc().nullsLast().op("text_ops")),
	index("market_listings_town_id_price_idx").using("btree", table.townId.asc().nullsLast().op("text_ops"), table.price.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.auctionCycleId],
			foreignColumns: [auctionCycles.id],
			name: "market_listings_auction_cycle_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.itemId],
			foreignColumns: [items.id],
			name: "market_listings_item_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.sellerId],
			foreignColumns: [characters.id],
			name: "market_listings_seller_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.townId],
			foreignColumns: [towns.id],
			name: "market_listings_town_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const loans = pgTable("loans", {
	id: text().primaryKey().notNull(),
	bankerId: text("banker_id").notNull(),
	borrowerId: text("borrower_id").notNull(),
	principal: integer().notNull(),
	interestRate: doublePrecision("interest_rate").notNull(),
	totalOwed: integer("total_owed").notNull(),
	amountRepaid: integer("amount_repaid").default(0).notNull(),
	termDays: integer("term_days").notNull(),
	startDay: integer("start_day").notNull(),
	dueDay: integer("due_day").notNull(),
	status: loanStatus().default('ACTIVE').notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("loans_banker_id_idx").using("btree", table.bankerId.asc().nullsLast().op("text_ops")),
	index("loans_borrower_id_idx").using("btree", table.borrowerId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.bankerId],
			foreignColumns: [characters.id],
			name: "loans_banker_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.borrowerId],
			foreignColumns: [characters.id],
			name: "loans_borrower_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const marketBuyOrders = pgTable("market_buy_orders", {
	id: text().primaryKey().notNull(),
	buyerId: text("buyer_id").notNull(),
	listingId: text("listing_id").notNull(),
	bidPrice: integer("bid_price").notNull(),
	status: text().default('pending').notNull(),
	priorityScore: doublePrecision("priority_score"),
	rollResult: integer("roll_result"),
	rollBreakdown: jsonb("roll_breakdown"),
	placedAt: timestamp("placed_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	resolvedAt: timestamp("resolved_at", { precision: 3, mode: 'string' }),
	auctionCycleId: text("auction_cycle_id"),
}, (table) => [
	index("market_buy_orders_buyer_id_idx").using("btree", table.buyerId.asc().nullsLast().op("text_ops")),
	uniqueIndex("market_buy_orders_buyer_id_listing_id_key").using("btree", table.buyerId.asc().nullsLast().op("text_ops"), table.listingId.asc().nullsLast().op("text_ops")),
	index("market_buy_orders_listing_id_idx").using("btree", table.listingId.asc().nullsLast().op("text_ops")),
	index("market_buy_orders_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.auctionCycleId],
			foreignColumns: [auctionCycles.id],
			name: "market_buy_orders_auction_cycle_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.buyerId],
			foreignColumns: [characters.id],
			name: "market_buy_orders_buyer_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.listingId],
			foreignColumns: [marketListings.id],
			name: "market_buy_orders_listing_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const tradeTransactions = pgTable("trade_transactions", {
	id: text().primaryKey().notNull(),
	buyerId: text("buyer_id").notNull(),
	sellerId: text("seller_id").notNull(),
	itemId: text("item_id").notNull(),
	price: integer().notNull(),
	quantity: integer().default(1).notNull(),
	townId: text("town_id").notNull(),
	timestamp: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	sellerFee: integer("seller_fee").default(0).notNull(),
	sellerNet: integer("seller_net").default(0).notNull(),
	auctionCycleId: text("auction_cycle_id"),
	numBidders: integer("num_bidders").default(1).notNull(),
	contested: boolean().default(false).notNull(),
	allBidders: jsonb("all_bidders"),
}, (table) => [
	index("trade_transactions_auction_cycle_id_idx").using("btree", table.auctionCycleId.asc().nullsLast().op("text_ops")),
	index("trade_transactions_buyer_id_created_at_idx").using("btree", table.buyerId.asc().nullsLast().op("timestamp_ops"), table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("trade_transactions_buyer_id_idx").using("btree", table.buyerId.asc().nullsLast().op("text_ops")),
	index("trade_transactions_seller_id_created_at_idx").using("btree", table.sellerId.asc().nullsLast().op("timestamp_ops"), table.createdAt.asc().nullsLast().op("text_ops")),
	index("trade_transactions_seller_id_idx").using("btree", table.sellerId.asc().nullsLast().op("text_ops")),
	index("trade_transactions_timestamp_idx").using("btree", table.timestamp.asc().nullsLast().op("timestamp_ops")),
	index("trade_transactions_town_id_idx").using("btree", table.townId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.auctionCycleId],
			foreignColumns: [auctionCycles.id],
			name: "trade_transactions_auction_cycle_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.buyerId],
			foreignColumns: [characters.id],
			name: "trade_transactions_buyer_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.itemId],
			foreignColumns: [items.id],
			name: "trade_transactions_item_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.sellerId],
			foreignColumns: [characters.id],
			name: "trade_transactions_seller_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.townId],
			foreignColumns: [towns.id],
			name: "trade_transactions_town_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const auctionCycles = pgTable("auction_cycles", {
	id: text().primaryKey().notNull(),
	townId: text("town_id").notNull(),
	cycleNumber: integer("cycle_number").notNull(),
	startedAt: timestamp("started_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	resolvedAt: timestamp("resolved_at", { precision: 3, mode: 'string' }),
	status: text().default('open').notNull(),
	ordersProcessed: integer("orders_processed").default(0).notNull(),
	transactionsCompleted: integer("transactions_completed").default(0).notNull(),
	contestedListings: integer("contested_listings").default(0).notNull(),
	merchantWins: integer("merchant_wins").default(0).notNull(),
	nonMerchantWins: integer("non_merchant_wins").default(0).notNull(),
	totalGoldTraded: integer("total_gold_traded").default(0).notNull(),
}, (table) => [
	index("auction_cycles_town_id_status_idx").using("btree", table.townId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.townId],
			foreignColumns: [towns.id],
			name: "auction_cycles_town_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

// ============================================================
// POLITICS
// ============================================================

export const diplomacyEvents = pgTable("diplomacy_events", {
	id: text().primaryKey().notNull(),
	type: diplomacyActionType().notNull(),
	initiatorId: text("initiator_id").notNull(),
	targetId: text("target_id").notNull(),
	details: jsonb().default({}).notNull(),
	timestamp: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("diplomacy_events_initiator_id_idx").using("btree", table.initiatorId.asc().nullsLast().op("text_ops")),
	index("diplomacy_events_target_id_idx").using("btree", table.targetId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.initiatorId],
			foreignColumns: [characters.id],
			name: "diplomacy_events_initiator_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.targetId],
			foreignColumns: [characters.id],
			name: "diplomacy_events_target_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const electionVotes = pgTable("election_votes", {
	id: text().primaryKey().notNull(),
	electionId: text("election_id").notNull(),
	voterId: text("voter_id").notNull(),
	candidateId: text("candidate_id").notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("election_votes_election_id_idx").using("btree", table.electionId.asc().nullsLast().op("text_ops")),
	uniqueIndex("election_votes_election_id_voter_id_key").using("btree", table.electionId.asc().nullsLast().op("text_ops"), table.voterId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.electionId],
			foreignColumns: [elections.id],
			name: "election_votes_election_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.voterId],
			foreignColumns: [characters.id],
			name: "election_votes_voter_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const elections = pgTable("elections", {
	id: text().primaryKey().notNull(),
	townId: text("town_id").notNull(),
	type: electionType().notNull(),
	status: electionStatus().default('SCHEDULED').notNull(),
	startDate: timestamp("start_date", { precision: 3, mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { precision: 3, mode: 'string' }).notNull(),
	winnerId: text("winner_id"),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
	kingdomId: text("kingdom_id"),
	phase: electionPhase().default('NOMINATIONS').notNull(),
	termNumber: integer("term_number").default(1).notNull(),
}, (table) => [
	index("elections_kingdom_id_idx").using("btree", table.kingdomId.asc().nullsLast().op("text_ops")),
	index("elections_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("elections_town_id_idx").using("btree", table.townId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.kingdomId],
			foreignColumns: [kingdoms.id],
			name: "elections_kingdom_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.townId],
			foreignColumns: [towns.id],
			name: "elections_town_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.winnerId],
			foreignColumns: [characters.id],
			name: "elections_winner_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const laws = pgTable("laws", {
	id: text().primaryKey().notNull(),
	kingdomId: text("kingdom_id").notNull(),
	title: text().notNull(),
	description: text(),
	effects: jsonb().default({}).notNull(),
	enactedById: text("enacted_by_id").notNull(),
	enactedAt: timestamp("enacted_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
	expiresAt: timestamp("expires_at", { precision: 3, mode: 'string' }),
	lawType: text("law_type").default('general').notNull(),
	proposedAt: timestamp("proposed_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	status: lawStatus().default('PROPOSED').notNull(),
	votesAgainst: integer("votes_against").default(0).notNull(),
	votesFor: integer("votes_for").default(0).notNull(),
}, (table) => [
	index("laws_kingdom_id_idx").using("btree", table.kingdomId.asc().nullsLast().op("text_ops")),
	index("laws_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.enactedById],
			foreignColumns: [characters.id],
			name: "laws_enacted_by_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.kingdomId],
			foreignColumns: [kingdoms.id],
			name: "laws_kingdom_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const electionCandidates = pgTable("election_candidates", {
	id: text().primaryKey().notNull(),
	electionId: text("election_id").notNull(),
	characterId: text("character_id").notNull(),
	platform: text().default('').notNull(),
	nominatedAt: timestamp("nominated_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("election_candidates_character_id_idx").using("btree", table.characterId.asc().nullsLast().op("text_ops")),
	uniqueIndex("election_candidates_election_id_character_id_key").using("btree", table.electionId.asc().nullsLast().op("text_ops"), table.characterId.asc().nullsLast().op("text_ops")),
	index("election_candidates_election_id_idx").using("btree", table.electionId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.characterId],
			foreignColumns: [characters.id],
			name: "election_candidates_character_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.electionId],
			foreignColumns: [elections.id],
			name: "election_candidates_election_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const impeachments = pgTable("impeachments", {
	id: text().primaryKey().notNull(),
	targetId: text("target_id").notNull(),
	townId: text("town_id"),
	kingdomId: text("kingdom_id"),
	votesFor: integer("votes_for").default(0).notNull(),
	votesAgainst: integer("votes_against").default(0).notNull(),
	status: impeachmentStatus().default('ACTIVE').notNull(),
	startedAt: timestamp("started_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	endsAt: timestamp("ends_at", { precision: 3, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
}, (table) => [
	index("impeachments_kingdom_id_idx").using("btree", table.kingdomId.asc().nullsLast().op("text_ops")),
	index("impeachments_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("impeachments_target_id_idx").using("btree", table.targetId.asc().nullsLast().op("text_ops")),
	index("impeachments_town_id_idx").using("btree", table.townId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.kingdomId],
			foreignColumns: [kingdoms.id],
			name: "impeachments_kingdom_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.targetId],
			foreignColumns: [characters.id],
			name: "impeachments_target_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.townId],
			foreignColumns: [towns.id],
			name: "impeachments_town_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const impeachmentVotes = pgTable("impeachment_votes", {
	id: text().primaryKey().notNull(),
	impeachmentId: text("impeachment_id").notNull(),
	voterId: text("voter_id").notNull(),
	support: boolean().notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("impeachment_votes_impeachment_id_idx").using("btree", table.impeachmentId.asc().nullsLast().op("text_ops")),
	uniqueIndex("impeachment_votes_impeachment_id_voter_id_key").using("btree", table.impeachmentId.asc().nullsLast().op("text_ops"), table.voterId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.impeachmentId],
			foreignColumns: [impeachments.id],
			name: "impeachment_votes_impeachment_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.voterId],
			foreignColumns: [characters.id],
			name: "impeachment_votes_voter_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const townTreasuries = pgTable("town_treasuries", {
	id: text().primaryKey().notNull(),
	townId: text("town_id").notNull(),
	balance: integer().default(0).notNull(),
	taxRate: doublePrecision("tax_rate").default(0.1).notNull(),
	lastCollectedAt: timestamp("last_collected_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
}, (table) => [
	uniqueIndex("town_treasuries_town_id_key").using("btree", table.townId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.townId],
			foreignColumns: [towns.id],
			name: "town_treasuries_town_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const councilMembers = pgTable("council_members", {
	id: text().primaryKey().notNull(),
	kingdomId: text("kingdom_id"),
	townId: text("town_id"),
	characterId: text("character_id").notNull(),
	role: text().notNull(),
	appointedAt: timestamp("appointed_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	appointedById: text("appointed_by_id").notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
}, (table) => [
	index("council_members_character_id_idx").using("btree", table.characterId.asc().nullsLast().op("text_ops")),
	index("council_members_kingdom_id_idx").using("btree", table.kingdomId.asc().nullsLast().op("text_ops")),
	index("council_members_town_id_idx").using("btree", table.townId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.appointedById],
			foreignColumns: [characters.id],
			name: "council_members_appointed_by_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.characterId],
			foreignColumns: [characters.id],
			name: "council_members_character_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.kingdomId],
			foreignColumns: [kingdoms.id],
			name: "council_members_kingdom_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.townId],
			foreignColumns: [towns.id],
			name: "council_members_town_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const townPolicies = pgTable("town_policies", {
	id: text().primaryKey().notNull(),
	townId: text("town_id").notNull(),
	taxRate: doublePrecision("tax_rate").default(0.1).notNull(),
	tradePolicy: jsonb("trade_policy").default({}).notNull(),
	buildingPermits: boolean("building_permits").default(true).notNull(),
	sheriffId: text("sheriff_id"),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
}, (table) => [
	uniqueIndex("town_policies_town_id_key").using("btree", table.townId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.sheriffId],
			foreignColumns: [characters.id],
			name: "town_policies_sheriff_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.townId],
			foreignColumns: [towns.id],
			name: "town_policies_town_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const wars = pgTable("wars", {
	id: text().primaryKey().notNull(),
	attackerKingdomId: text("attacker_kingdom_id").notNull(),
	defenderKingdomId: text("defender_kingdom_id").notNull(),
	status: warStatus().default('ACTIVE').notNull(),
	startedAt: timestamp("started_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	endedAt: timestamp("ended_at", { precision: 3, mode: 'string' }),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
	attackerScore: integer("attacker_score").default(0).notNull(),
	defenderScore: integer("defender_score").default(0).notNull(),
	reason: text(),
}, (table) => [
	index("wars_attacker_kingdom_id_idx").using("btree", table.attackerKingdomId.asc().nullsLast().op("text_ops")),
	index("wars_defender_kingdom_id_idx").using("btree", table.defenderKingdomId.asc().nullsLast().op("text_ops")),
	index("wars_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.attackerKingdomId],
			foreignColumns: [kingdoms.id],
			name: "wars_attacker_kingdom_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.defenderKingdomId],
			foreignColumns: [kingdoms.id],
			name: "wars_defender_kingdom_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const treaties = pgTable("treaties", {
	id: text().primaryKey().notNull(),
	type: treatyType().notNull(),
	proposerKingdomId: text("proposer_kingdom_id").notNull(),
	receiverKingdomId: text("receiver_kingdom_id").notNull(),
	proposedById: text("proposed_by_id").notNull(),
	status: treatyStatus().default('PENDING').notNull(),
	goldCost: integer("gold_cost").default(0).notNull(),
	requiredDays: integer("required_days").default(0).notNull(),
	startsAt: timestamp("starts_at", { precision: 3, mode: 'string' }),
	expiresAt: timestamp("expires_at", { precision: 3, mode: 'string' }),
	metadata: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
}, (table) => [
	index("treaties_proposer_kingdom_id_idx").using("btree", table.proposerKingdomId.asc().nullsLast().op("text_ops")),
	index("treaties_receiver_kingdom_id_idx").using("btree", table.receiverKingdomId.asc().nullsLast().op("text_ops")),
	index("treaties_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.proposedById],
			foreignColumns: [characters.id],
			name: "treaties_proposed_by_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.proposerKingdomId],
			foreignColumns: [kingdoms.id],
			name: "treaties_proposer_kingdom_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
	foreignKey({
			columns: [table.receiverKingdomId],
			foreignColumns: [kingdoms.id],
			name: "treaties_receiver_kingdom_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const petitions = pgTable("petitions", {
	id: text().primaryKey().notNull(),
	creatorId: text("creator_id").notNull(),
	petitionType: text("petition_type").notNull(),
	title: text().notNull(),
	description: text().notNull(),
	targetData: jsonb("target_data").default({}).notNull(),
	status: petitionStatus().default('ACTIVE').notNull(),
	signatureGoal: integer("signature_goal").default(10).notNull(),
	expiresAt: timestamp("expires_at", { precision: 3, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
}, (table) => [
	index("petitions_creator_id_idx").using("btree", table.creatorId.asc().nullsLast().op("text_ops")),
	index("petitions_expires_at_idx").using("btree", table.expiresAt.asc().nullsLast().op("timestamp_ops")),
	index("petitions_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.creatorId],
			foreignColumns: [characters.id],
			name: "petitions_creator_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const petitionSignatures = pgTable("petition_signatures", {
	id: text().primaryKey().notNull(),
	petitionId: text("petition_id").notNull(),
	characterId: text("character_id").notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("petition_signatures_character_id_idx").using("btree", table.characterId.asc().nullsLast().op("text_ops")),
	uniqueIndex("petition_signatures_petition_id_character_id_key").using("btree", table.petitionId.asc().nullsLast().op("text_ops"), table.characterId.asc().nullsLast().op("text_ops")),
	index("petition_signatures_petition_id_idx").using("btree", table.petitionId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.characterId],
			foreignColumns: [characters.id],
			name: "petition_signatures_character_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.petitionId],
			foreignColumns: [petitions.id],
			name: "petition_signatures_petition_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const lawVotes = pgTable("law_votes", {
	id: text().primaryKey().notNull(),
	lawId: text("law_id").notNull(),
	characterId: text("character_id").notNull(),
	vote: text().notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	uniqueIndex("law_votes_law_id_character_id_key").using("btree", table.lawId.asc().nullsLast().op("text_ops"), table.characterId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.characterId],
			foreignColumns: [characters.id],
			name: "law_votes_character_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.lawId],
			foreignColumns: [laws.id],
			name: "law_votes_law_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

// ============================================================
// SOCIAL
// ============================================================

export const guilds = pgTable("guilds", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	tag: text().notNull(),
	leaderId: text("leader_id"),
	level: integer().default(1).notNull(),
	treasury: integer().default(0).notNull(),
	description: text(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
}, (table) => [
	uniqueIndex("guilds_leader_id_key").using("btree", table.leaderId.asc().nullsLast().op("text_ops")),
	uniqueIndex("guilds_name_key").using("btree", table.name.asc().nullsLast().op("text_ops")),
	uniqueIndex("guilds_tag_key").using("btree", table.tag.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.leaderId],
			foreignColumns: [characters.id],
			name: "guilds_leader_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const guildMembers = pgTable("guild_members", {
	id: text().primaryKey().notNull(),
	guildId: text("guild_id").notNull(),
	characterId: text("character_id").notNull(),
	rank: text().default('member').notNull(),
	joinedAt: timestamp("joined_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
}, (table) => [
	index("guild_members_character_id_idx").using("btree", table.characterId.asc().nullsLast().op("text_ops")),
	uniqueIndex("guild_members_guild_id_character_id_key").using("btree", table.guildId.asc().nullsLast().op("text_ops"), table.characterId.asc().nullsLast().op("text_ops")),
	index("guild_members_guild_id_idx").using("btree", table.guildId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.characterId],
			foreignColumns: [characters.id],
			name: "guild_members_character_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.guildId],
			foreignColumns: [guilds.id],
			name: "guild_members_guild_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const friends = pgTable("friends", {
	id: text().primaryKey().notNull(),
	requesterId: text("requester_id").notNull(),
	recipientId: text("recipient_id").notNull(),
	status: friendStatus().default('PENDING').notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
}, (table) => [
	index("friends_recipient_id_idx").using("btree", table.recipientId.asc().nullsLast().op("text_ops")),
	index("friends_recipient_id_status_idx").using("btree", table.recipientId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("enum_ops")),
	index("friends_requester_id_idx").using("btree", table.requesterId.asc().nullsLast().op("text_ops")),
	uniqueIndex("friends_requester_id_recipient_id_key").using("btree", table.requesterId.asc().nullsLast().op("text_ops"), table.recipientId.asc().nullsLast().op("text_ops")),
	index("friends_requester_id_status_idx").using("btree", table.requesterId.asc().nullsLast().op("enum_ops"), table.status.asc().nullsLast().op("enum_ops")),
	index("friends_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.recipientId],
			foreignColumns: [characters.id],
			name: "friends_recipient_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.requesterId],
			foreignColumns: [characters.id],
			name: "friends_requester_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const messages = pgTable("messages", {
	id: text().primaryKey().notNull(),
	channelType: messageChannel("channel_type").notNull(),
	content: text().notNull(),
	senderId: text("sender_id").notNull(),
	recipientId: text("recipient_id"),
	guildId: text("guild_id"),
	townId: text("town_id"),
	timestamp: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	isRead: boolean("is_read").default(false).notNull(),
}, (table) => [
	index("messages_channel_type_town_id_timestamp_idx").using("btree", table.channelType.asc().nullsLast().op("enum_ops"), table.townId.asc().nullsLast().op("text_ops"), table.timestamp.asc().nullsLast().op("enum_ops")),
	index("messages_guild_id_idx").using("btree", table.guildId.asc().nullsLast().op("text_ops")),
	index("messages_recipient_id_idx").using("btree", table.recipientId.asc().nullsLast().op("text_ops")),
	index("messages_sender_id_idx").using("btree", table.senderId.asc().nullsLast().op("text_ops")),
	index("messages_town_id_idx").using("btree", table.townId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.guildId],
			foreignColumns: [guilds.id],
			name: "messages_guild_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.recipientId],
			foreignColumns: [characters.id],
			name: "messages_recipient_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.senderId],
			foreignColumns: [characters.id],
			name: "messages_sender_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.townId],
			foreignColumns: [towns.id],
			name: "messages_town_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const npcs = pgTable("npcs", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	townId: text("town_id").notNull(),
	role: npcRole().default('QUEST_GIVER').notNull(),
	dialog: jsonb().default({}).notNull(),
	questIds: text("quest_ids").array(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
}, (table) => [
	index("npcs_role_idx").using("btree", table.role.asc().nullsLast().op("enum_ops")),
	index("npcs_town_id_idx").using("btree", table.townId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.townId],
			foreignColumns: [towns.id],
			name: "npcs_town_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const travelGroups = pgTable("travel_groups", {
	id: text().primaryKey().notNull(),
	leaderId: text("leader_id").notNull(),
	name: text(),
	status: text().default('forming').notNull(),
	maxSize: integer("max_size").default(5).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
	partyId: text("party_id"),
}, (table) => [
	index("travel_groups_leader_id_idx").using("btree", table.leaderId.asc().nullsLast().op("text_ops")),
	index("travel_groups_party_id_idx").using("btree", table.partyId.asc().nullsLast().op("text_ops")),
	index("travel_groups_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.leaderId],
			foreignColumns: [characters.id],
			name: "travel_groups_leader_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.partyId],
			foreignColumns: [parties.id],
			name: "travel_groups_party_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const travelGroupMembers = pgTable("travel_group_members", {
	id: text().primaryKey().notNull(),
	groupId: text("group_id").notNull(),
	characterId: text("character_id").notNull(),
	role: text().default('member').notNull(),
	joinedAt: timestamp("joined_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("travel_group_members_character_id_idx").using("btree", table.characterId.asc().nullsLast().op("text_ops")),
	uniqueIndex("travel_group_members_group_id_character_id_key").using("btree", table.groupId.asc().nullsLast().op("text_ops"), table.characterId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.characterId],
			foreignColumns: [characters.id],
			name: "travel_group_members_character_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [travelGroups.id],
			name: "travel_group_members_group_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const groupTravelStates = pgTable("group_travel_states", {
	id: text().primaryKey().notNull(),
	groupId: text("group_id").notNull(),
	routeId: text("route_id").notNull(),
	currentNodeIndex: integer("current_node_index").notNull(),
	direction: text().default('forward').notNull(),
	speedModifier: real("speed_modifier").default(1).notNull(),
	startedAt: timestamp("started_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	lastTickAt: timestamp("last_tick_at", { precision: 3, mode: 'string' }),
	status: text().default('traveling').notNull(),
}, (table) => [
	uniqueIndex("group_travel_states_group_id_key").using("btree", table.groupId.asc().nullsLast().op("text_ops")),
	index("group_travel_states_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.groupId],
			foreignColumns: [travelGroups.id],
			name: "group_travel_states_group_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.routeId],
			foreignColumns: [travelRoutes.id],
			name: "group_travel_states_route_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const parties = pgTable("parties", {
	id: text().primaryKey().notNull(),
	name: text(),
	leaderId: text("leader_id").notNull(),
	townId: text("town_id").notNull(),
	status: text().default('active').notNull(),
	maxSize: integer("max_size").default(5).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	disbandedAt: timestamp("disbanded_at", { precision: 3, mode: 'string' }),
}, (table) => [
	index("parties_leader_id_idx").using("btree", table.leaderId.asc().nullsLast().op("text_ops")),
	index("parties_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("parties_town_id_idx").using("btree", table.townId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.leaderId],
			foreignColumns: [characters.id],
			name: "parties_leader_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.townId],
			foreignColumns: [towns.id],
			name: "parties_town_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

export const partyMembers = pgTable("party_members", {
	id: text().primaryKey().notNull(),
	partyId: text("party_id").notNull(),
	characterId: text("character_id").notNull(),
	role: text().default('member').notNull(),
	joinedAt: timestamp("joined_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	leftAt: timestamp("left_at", { precision: 3, mode: 'string' }),
}, (table) => [
	index("party_members_character_id_idx").using("btree", table.characterId.asc().nullsLast().op("text_ops")),
	index("party_members_character_id_left_at_idx").using("btree", table.characterId.asc().nullsLast().op("text_ops"), table.leftAt.asc().nullsLast().op("text_ops")),
	index("party_members_party_id_idx").using("btree", table.partyId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.characterId],
			foreignColumns: [characters.id],
			name: "party_members_character_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.partyId],
			foreignColumns: [parties.id],
			name: "party_members_party_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const partyInvitations = pgTable("party_invitations", {
	id: text().primaryKey().notNull(),
	partyId: text("party_id").notNull(),
	characterId: text("character_id").notNull(),
	invitedById: text("invited_by_id").notNull(),
	status: text().default('pending').notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	expiresAt: timestamp("expires_at", { precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("party_invitations_character_id_status_idx").using("btree", table.characterId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("party_invitations_party_id_idx").using("btree", table.partyId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.characterId],
			foreignColumns: [characters.id],
			name: "party_invitations_character_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.invitedById],
			foreignColumns: [characters.id],
			name: "party_invitations_invited_by_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.partyId],
			foreignColumns: [parties.id],
			name: "party_invitations_party_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

// ============================================================
// HOUSING
// ============================================================

export const buildings = pgTable("buildings", {
	id: text().primaryKey().notNull(),
	ownerId: text("owner_id").notNull(),
	townId: text("town_id").notNull(),
	type: buildingType().notNull(),
	name: text().notNull(),
	level: integer().default(1).notNull(),
	storage: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
}, (table) => [
	index("buildings_owner_id_idx").using("btree", table.ownerId.asc().nullsLast().op("text_ops")),
	index("buildings_town_id_idx").using("btree", table.townId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [characters.id],
			name: "buildings_owner_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.townId],
			foreignColumns: [towns.id],
			name: "buildings_town_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const buildingConstructions = pgTable("building_constructions", {
	id: text().primaryKey().notNull(),
	buildingId: text("building_id").notNull(),
	status: actionStatus().default('PENDING').notNull(),
	materialsUsed: jsonb("materials_used").default({}).notNull(),
	startedAt: timestamp("started_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	completesAt: timestamp("completes_at", { precision: 3, mode: 'string' }),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
}, (table) => [
	index("building_constructions_building_id_idx").using("btree", table.buildingId.asc().nullsLast().op("text_ops")),
	index("building_constructions_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.buildingId],
			foreignColumns: [buildings.id],
			name: "building_constructions_building_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const houses = pgTable("houses", {
	id: text().primaryKey().notNull(),
	characterId: text("character_id").notNull(),
	townId: text("town_id").notNull(),
	tier: integer().default(1).notNull(),
	name: text(),
	storageSlots: integer("storage_slots").default(20).notNull(),
	upgradingToTier: integer("upgrading_to_tier"),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
}, (table) => [
	index("houses_character_id_idx").using("btree", table.characterId.asc().nullsLast().op("text_ops")),
	uniqueIndex("houses_character_id_town_id_key").using("btree", table.characterId.asc().nullsLast().op("text_ops"), table.townId.asc().nullsLast().op("text_ops")),
	index("houses_town_id_idx").using("btree", table.townId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.characterId],
			foreignColumns: [characters.id],
			name: "houses_character_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.townId],
			foreignColumns: [towns.id],
			name: "houses_town_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const houseStorage = pgTable("house_storage", {
	id: text().primaryKey().notNull(),
	houseId: text("house_id").notNull(),
	itemTemplateId: text("item_template_id").notNull(),
	quantity: integer().default(0).notNull(),
}, (table) => [
	index("house_storage_house_id_idx").using("btree", table.houseId.asc().nullsLast().op("text_ops")),
	uniqueIndex("house_storage_house_id_item_template_id_key").using("btree", table.houseId.asc().nullsLast().op("text_ops"), table.itemTemplateId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.houseId],
			foreignColumns: [houses.id],
			name: "house_storage_house_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.itemTemplateId],
			foreignColumns: [itemTemplates.id],
			name: "house_storage_item_template_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

// ============================================================
// INN MENU
// ============================================================

export const innMenu = pgTable("inn_menu", {
	id: text().primaryKey().notNull(),
	buildingId: text("building_id").notNull(),
	itemTemplateId: text("item_template_id").notNull(),
	quantity: integer().default(0).notNull(),
	price: integer().notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
}, (table) => [
	index("inn_menu_building_id_idx").using("btree", table.buildingId.asc().nullsLast().op("text_ops")),
	uniqueIndex("inn_menu_building_id_item_template_id_unique").using("btree", table.buildingId.asc().nullsLast().op("text_ops"), table.itemTemplateId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.buildingId],
			foreignColumns: [buildings.id],
			name: "inn_menu_building_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.itemTemplateId],
			foreignColumns: [itemTemplates.id],
			name: "inn_menu_item_template_id_fkey"
		}).onUpdate("cascade").onDelete("restrict"),
]);

// ============================================================
// QUESTS
// ============================================================

export const questProgress = pgTable("quest_progress", {
	id: text().primaryKey().notNull(),
	characterId: text("character_id").notNull(),
	questId: text("quest_id").notNull(),
	status: actionStatus().default('PENDING').notNull(),
	progress: jsonb().default({}).notNull(),
	startedAt: timestamp("started_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	completedAt: timestamp("completed_at", { precision: 3, mode: 'string' }),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
}, (table) => [
	index("quest_progress_character_id_idx").using("btree", table.characterId.asc().nullsLast().op("text_ops")),
	uniqueIndex("quest_progress_character_id_quest_id_key").using("btree", table.characterId.asc().nullsLast().op("text_ops"), table.questId.asc().nullsLast().op("text_ops")),
	index("quest_progress_character_id_status_idx").using("btree", table.characterId.asc().nullsLast().op("enum_ops"), table.status.asc().nullsLast().op("enum_ops")),
	uniqueIndex("quest_progress_one_active_per_character").using("btree", table.characterId.asc().nullsLast().op("text_ops")).where(sql`(status = 'IN_PROGRESS'::"ActionStatus")`),
	index("quest_progress_quest_id_idx").using("btree", table.questId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.characterId],
			foreignColumns: [characters.id],
			name: "quest_progress_character_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.questId],
			foreignColumns: [quests.id],
			name: "quest_progress_quest_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const quests = pgTable("quests", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	type: questType().notNull(),
	description: text(),
	objectives: jsonb().default([]).notNull(),
	rewards: jsonb().default({}).notNull(),
	levelRequired: integer("level_required").default(1).notNull(),
	regionId: text("region_id"),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
	cooldownHours: integer("cooldown_hours"),
	isRepeatable: boolean("is_repeatable").default(false).notNull(),
	prerequisiteQuestId: text("prerequisite_quest_id"),
	slug: text(),
	sortOrder: integer("sort_order").default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
}, (table) => [
	index("quests_prerequisite_quest_id_idx").using("btree", table.prerequisiteQuestId.asc().nullsLast().op("text_ops")),
	index("quests_region_id_idx").using("btree", table.regionId.asc().nullsLast().op("text_ops")),
	uniqueIndex("quests_slug_key").using("btree", table.slug.asc().nullsLast().op("text_ops")),
	index("quests_type_idx").using("btree", table.type.asc().nullsLast().op("enum_ops")),
	foreignKey({
			columns: [table.prerequisiteQuestId],
			foreignColumns: [table.id],
			name: "quests_prerequisite_quest_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.regionId],
			foreignColumns: [regions.id],
			name: "quests_region_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

// ============================================================
// DAILY
// ============================================================

export const dailyActions = pgTable("daily_actions", {
	id: text().primaryKey().notNull(),
	characterId: text("character_id").notNull(),
	tickDate: timestamp("tick_date", { precision: 3, mode: 'string' }).notNull(),
	actionType: dailyActionType("action_type").notNull(),
	actionTarget: jsonb("action_target").notNull(),
	combatParams: jsonb("combat_params"),
	status: dailyActionStatus().default('LOCKED_IN').notNull(),
	result: jsonb(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
}, (table) => [
	index("daily_actions_character_id_idx").using("btree", table.characterId.asc().nullsLast().op("text_ops")),
	uniqueIndex("daily_actions_character_id_tick_date_key").using("btree", table.characterId.asc().nullsLast().op("text_ops"), table.tickDate.asc().nullsLast().op("timestamp_ops")),
	index("daily_actions_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
	index("daily_actions_tick_date_idx").using("btree", table.tickDate.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.characterId],
			foreignColumns: [characters.id],
			name: "daily_actions_character_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const serviceActions = pgTable("service_actions", {
	id: text().primaryKey().notNull(),
	providerId: text("provider_id").notNull(),
	clientId: text("client_id"),
	professionType: professionType("profession_type").notNull(),
	actionType: text("action_type").notNull(),
	price: integer().default(0).notNull(),
	details: jsonb(),
	gameDay: integer("game_day").notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("service_actions_client_id_idx").using("btree", table.clientId.asc().nullsLast().op("text_ops")),
	index("service_actions_game_day_idx").using("btree", table.gameDay.asc().nullsLast().op("int4_ops")),
	index("service_actions_provider_id_idx").using("btree", table.providerId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [characters.id],
			name: "service_actions_client_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
	foreignKey({
			columns: [table.providerId],
			foreignColumns: [characters.id],
			name: "service_actions_provider_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const serviceReputations = pgTable("service_reputations", {
	id: text().primaryKey().notNull(),
	characterId: text("character_id").notNull(),
	professionType: professionType("profession_type").notNull(),
	reputation: integer().default(0).notNull(),
	lastActiveDay: integer("last_active_day").notNull(),
}, (table) => [
	uniqueIndex("service_reputations_character_id_profession_type_key").using("btree", table.characterId.asc().nullsLast().op("text_ops"), table.professionType.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.characterId],
			foreignColumns: [characters.id],
			name: "service_reputations_character_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const dailyReports = pgTable("daily_reports", {
	id: text().primaryKey().notNull(),
	characterId: text("character_id").notNull(),
	tickDate: timestamp("tick_date", { precision: 3, mode: 'string' }).notNull(),
	foodConsumed: jsonb("food_consumed"),
	actionResult: jsonb("action_result"),
	goldChange: integer("gold_change").default(0).notNull(),
	xpEarned: integer("xp_earned").default(0).notNull(),
	combatLogs: jsonb("combat_logs"),
	questProgress: jsonb("quest_progress"),
	notifications: jsonb(),
	worldEvents: jsonb("world_events"),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	dismissedAt: timestamp("dismissed_at", { precision: 3, mode: 'string' }),
}, (table) => [
	index("daily_reports_character_id_idx").using("btree", table.characterId.asc().nullsLast().op("text_ops")),
	uniqueIndex("daily_reports_character_id_tick_date_key").using("btree", table.characterId.asc().nullsLast().op("text_ops"), table.tickDate.asc().nullsLast().op("text_ops")),
	index("daily_reports_tick_date_idx").using("btree", table.tickDate.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.characterId],
			foreignColumns: [characters.id],
			name: "daily_reports_character_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

// ============================================================
// FOOD & LIVESTOCK
// ============================================================

export const livestock = pgTable("livestock", {
	id: text().primaryKey().notNull(),
	buildingId: text("building_id").notNull(),
	ownerId: text("owner_id").notNull(),
	animalType: text("animal_type").notNull(),
	name: text(),
	age: integer().default(0).notNull(),
	hunger: integer().default(0).notNull(),
	health: integer().default(100).notNull(),
	lastFedAt: integer("last_fed_at"),
	lastProducedAt: integer("last_produced_at"),
	isAlive: boolean("is_alive").default(true).notNull(),
	deathCause: text("death_cause"),
	purchasedAt: integer("purchased_at").notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
}, (table) => [
	index("livestock_building_id_idx").using("btree", table.buildingId.asc().nullsLast().op("text_ops")),
	index("livestock_is_alive_idx").using("btree", table.isAlive.asc().nullsLast().op("bool_ops")),
	index("livestock_owner_id_idx").using("btree", table.ownerId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.buildingId],
			foreignColumns: [ownedAssets.id],
			name: "livestock_building_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [characters.id],
			name: "livestock_owner_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

export const jobListings = pgTable("job_listings", {
	id: text().primaryKey().notNull(),
	assetId: text("asset_id").notNull(),
	ownerId: text("owner_id").notNull(),
	townId: text("town_id").notNull(),
	wage: integer().notNull(),
	workerId: text("worker_id"),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
	jobType: varchar("job_type", { length: 50 }).default('harvest_field').notNull(),
	status: varchar({ length: 20 }).default('OPEN').notNull(),
	autoPosted: boolean("auto_posted").default(false).notNull(),
	productYield: jsonb("product_yield"),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	expiresAt: integer("expires_at"),
}, (table) => [
	index("job_listings_asset_id_idx").using("btree", table.assetId.asc().nullsLast().op("text_ops")),
	uniqueIndex("job_listings_asset_id_key").using("btree", table.assetId.asc().nullsLast().op("text_ops")),
	index("job_listings_owner_id_idx").using("btree", table.ownerId.asc().nullsLast().op("text_ops")),
	index("job_listings_town_id_status_idx").using("btree", table.townId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	index("job_listings_worker_id_idx").using("btree", table.workerId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.assetId],
			foreignColumns: [ownedAssets.id],
			name: "job_listings_asset_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [characters.id],
			name: "job_listings_owner_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.townId],
			foreignColumns: [towns.id],
			name: "job_listings_town_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.workerId],
			foreignColumns: [characters.id],
			name: "job_listings_worker_id_fkey"
		}).onUpdate("cascade").onDelete("set null"),
]);

export const ownedAssets = pgTable("owned_assets", {
	id: text().primaryKey().notNull(),
	ownerId: text("owner_id").notNull(),
	townId: text("town_id").notNull(),
	professionType: text("profession_type").notNull(),
	spotType: text("spot_type").notNull(),
	tier: integer().default(1).notNull(),
	slotNumber: integer("slot_number").notNull(),
	name: text().notNull(),
	cropState: text("crop_state").default('EMPTY').notNull(),
	plantedAt: integer("planted_at"),
	readyAt: integer("ready_at"),
	witheringAt: integer("withering_at"),
	purchasePrice: integer("purchase_price").notNull(),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
	pendingYield: integer("pending_yield").default(0).notNull(),
	pendingYieldSince: integer("pending_yield_since"),
}, (table) => [
	index("owned_assets_crop_state_idx").using("btree", table.cropState.asc().nullsLast().op("text_ops")),
	index("owned_assets_owner_id_idx").using("btree", table.ownerId.asc().nullsLast().op("text_ops")),
	uniqueIndex("owned_assets_owner_id_profession_type_tier_slot_number_key").using("btree", table.ownerId.asc().nullsLast().op("text_ops"), table.professionType.asc().nullsLast().op("text_ops"), table.tier.asc().nullsLast().op("text_ops"), table.slotNumber.asc().nullsLast().op("text_ops")),
	index("owned_assets_town_id_idx").using("btree", table.townId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.ownerId],
			foreignColumns: [characters.id],
			name: "owned_assets_owner_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
	foreignKey({
			columns: [table.townId],
			foreignColumns: [towns.id],
			name: "owned_assets_town_id_fkey"
		}).onUpdate("cascade").onDelete("cascade"),
]);

// ============================================================
// DROPPED ITEMS
// ============================================================

export const droppedItems = pgTable("dropped_items", {
	id: text().primaryKey().notNull(),
	characterId: text("character_id").notNull(),
	itemTemplateId: text("item_template_id").notNull(),
	itemTemplateName: text("item_template_name").notNull(),
	quantity: integer().default(1).notNull(),
	weight: doublePrecision().default(0).notNull(),
	droppedAt: timestamp("dropped_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	expiresAt: timestamp("expires_at", { precision: 3, mode: 'string' }).notNull(),
}, (table) => [
	index("dropped_items_character_id_idx").using("btree", table.characterId.asc().nullsLast().op("text_ops")),
	index("dropped_items_expires_at_idx").using("btree", table.expiresAt.asc().nullsLast()),
	foreignKey({
		columns: [table.characterId],
		foreignColumns: [characters.id],
		name: "dropped_items_character_id_fkey"
	}).onUpdate("cascade").onDelete("cascade"),
]);

// ============================================================
// SIMULATION
// ============================================================

export const simulationRuns = pgTable("simulation_runs", {
	id: text().primaryKey().notNull(),
	startedAt: timestamp("started_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	completedAt: timestamp("completed_at", { precision: 3, mode: 'string' }),
	tickCount: integer("tick_count").notNull(),
	ticksCompleted: integer("ticks_completed").default(0).notNull(),
	botCount: integer("bot_count").default(0).notNull(),
	config: jsonb().default({}).notNull(),
	encounterCount: integer("encounter_count").default(0).notNull(),
	status: text().default('running').notNull(),
	notes: text(),
	archived: boolean().default(false).notNull(),
}, (table) => [
	index("simulation_runs_started_at_idx").using("btree", table.startedAt.asc().nullsLast().op("timestamp_ops")),
	index("simulation_runs_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
]);

// ============================================================
// DELETION LOGS
// ============================================================

export const deletionLogs = pgTable("deletion_logs", {
	id: text().primaryKey().notNull(),
	timestamp: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	initiatedBy: text("initiated_by").notNull(),
	type: text().notNull(),
	targetCharacterIds: jsonb("target_character_ids").notNull(),
	targetCharacterNames: jsonb("target_character_names").notNull(),
	snapshot: jsonb().notNull(),
	deletedCounts: jsonb("deleted_counts").notNull(),
	totalRowsDeleted: integer("total_rows_deleted").notNull(),
	durationMs: integer("duration_ms").notNull(),
	status: text().notNull(),
	errors: jsonb(),
}, (table) => [
	index("deletion_logs_timestamp_idx").using("btree", table.timestamp.desc()),
]);

// ============================================================
// ERRORS
// ============================================================

export const errorLogs = pgTable("error_logs", {
	id: text().primaryKey().notNull(),
	timestamp: timestamp({ precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	level: logLevel().default('ERROR').notNull(),
	category: text().default('general').notNull(),
	endpoint: text().notNull(),
	statusCode: integer("status_code").notNull(),
	message: text().notNull(),
	detail: text(),
	userId: text("user_id"),
	characterId: text("character_id"),
	requestBody: jsonb("request_body"),
	userAgent: text("user_agent"),
	ip: text(),
	resolved: boolean().default(false).notNull(),
	resolvedBy: text("resolved_by"),
	resolvedAt: timestamp("resolved_at", { precision: 3, mode: 'string' }),
	notes: text(),
}, (table) => [
	index("error_logs_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
	index("error_logs_level_idx").using("btree", table.level.asc().nullsLast().op("enum_ops")),
	index("error_logs_resolved_idx").using("btree", table.resolved.asc().nullsLast().op("bool_ops")),
	index("error_logs_status_code_idx").using("btree", table.statusCode.asc().nullsLast().op("int4_ops")),
	index("error_logs_timestamp_idx").using("btree", table.timestamp.asc().nullsLast().op("timestamp_ops")),
	index("error_logs_user_id_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
]);

// ============================================================
// CONTENT
// ============================================================

export const contentReleases = pgTable("content_releases", {
	id: text().primaryKey().notNull(),
	contentType: text("content_type").notNull(),
	contentId: text("content_id").notNull(),
	contentName: text("content_name").notNull(),
	tier: text(),
	isReleased: boolean("is_released").default(false).notNull(),
	releasedAt: timestamp("released_at", { precision: 3, mode: 'string' }),
	releaseOrder: integer("release_order"),
	releaseNotes: text("release_notes"),
	createdAt: timestamp("created_at", { precision: 3, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }).notNull().$onUpdate(() => new Date().toISOString()),
}, (table) => [
	uniqueIndex("content_releases_content_type_content_id_key").using("btree", table.contentType.asc().nullsLast().op("text_ops"), table.contentId.asc().nullsLast().op("text_ops")),
	index("content_releases_content_type_idx").using("btree", table.contentType.asc().nullsLast().op("text_ops")),
	index("content_releases_is_released_idx").using("btree", table.isReleased.asc().nullsLast().op("bool_ops")),
]);

