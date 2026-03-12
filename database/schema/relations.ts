import { relations } from "drizzle-orm/relations";
import { characters, characterActiveEffects, characterEquipment, items, inventories, professionXp, towns, townResources, regions, regionBorders, diplomacyEvents, kingdoms, buildings, buildingConstructions, itemTemplates, priceHistories, caravans, elections, electionVotes, guilds, guildMembers, questProgress, quests, combatSessions, combatLogs, combatParticipants, notifications, racialAbilityCooldowns, changelingDisguises, achievements, playerAchievements, forgebornMaintenance, playerProfessions, craftingActions, recipes, travelRoutes, auctionCycles, marketListings, friends, laws, messages, electionCandidates, impeachments, impeachmentVotes, townTreasuries, councilMembers, townPolicies, abilities, characterAbilities, npcs, characterAppearances, users, exclusiveZones, gatheringActions, resources, wars, treaties, petitions, petitionSignatures, dailyActions, serviceActions, loans, serviceReputations, lawVotes, dailyReports, travelGroups, parties, travelNodes, travelGroupMembers, characterTravelStates, combatEncounterLogs, simulationRuns, groupTravelStates, partyMembers, partyInvitations, marketBuyOrders, tradeTransactions, ownedAssets, livestock, houses, houseStorage, jobListings, monsters, droppedItems, deletionLogs, innMenu, noticeBoardPosts } from "./tables";

export const characterEquipmentRelations = relations(characterEquipment, ({one}) => ({
	character: one(characters, {
		fields: [characterEquipment.characterId],
		references: [characters.id]
	}),
	item: one(items, {
		fields: [characterEquipment.itemId],
		references: [items.id]
	}),
}));

export const charactersRelations = relations(characters, ({one, many}) => ({
	characterEquipments: many(characterEquipment),
	inventories: many(inventories),
	professionXps: many(professionXp),
	diplomacyEvents_initiatorId: many(diplomacyEvents, {
		relationName: "diplomacyEvents_initiatorId_characters_id"
	}),
	diplomacyEvents_targetId: many(diplomacyEvents, {
		relationName: "diplomacyEvents_targetId_characters_id"
	}),
	kingdoms: many(kingdoms),
	buildings: many(buildings),
	caravans: many(caravans),
	electionVotes: many(electionVotes),
	guilds: many(guilds),
	guildMembers: many(guildMembers),
	questProgresses: many(questProgress),
	combatParticipants: many(combatParticipants),
	notifications: many(notifications),
	racialAbilityCooldowns: many(racialAbilityCooldowns),
	changelingDisguises: many(changelingDisguises),
	playerAchievements: many(playerAchievements),
	forgebornMaintenances: many(forgebornMaintenance),
	playerProfessions: many(playerProfessions),
	craftingActions: many(craftingActions),
	towns: many(towns, {
		relationName: "towns_mayorId_characters_id"
	}),
	marketListings: many(marketListings),
	friends_recipientId: many(friends, {
		relationName: "friends_recipientId_characters_id"
	}),
	friends_requesterId: many(friends, {
		relationName: "friends_requesterId_characters_id"
	}),
	elections: many(elections),
	laws: many(laws),
	messages_recipientId: many(messages, {
		relationName: "messages_recipientId_characters_id"
	}),
	messages_senderId: many(messages, {
		relationName: "messages_senderId_characters_id"
	}),
	electionCandidates: many(electionCandidates),
	impeachments: many(impeachments),
	impeachmentVotes: many(impeachmentVotes),
	councilMembers_appointedById: many(councilMembers, {
		relationName: "councilMembers_appointedById_characters_id"
	}),
	councilMembers_characterId: many(councilMembers, {
		relationName: "councilMembers_characterId_characters_id"
	}),
	townPolicies: many(townPolicies),
	characterAbilities: many(characterAbilities),
	characterAppearances: many(characterAppearances),
	town_currentTownId: one(towns, {
		fields: [characters.currentTownId],
		references: [towns.id],
		relationName: "characters_currentTownId_towns_id"
	}),
	town_homeTownId: one(towns, {
		fields: [characters.homeTownId],
		references: [towns.id],
		relationName: "characters_homeTownId_towns_id"
	}),
	checkedInInn: one(buildings, {
		fields: [characters.checkedInInnId],
		references: [buildings.id],
		relationName: "characters_checkedInInnId_buildings_id"
	}),
	item: one(items, {
		fields: [characters.preferredFoodId],
		references: [items.id],
		relationName: "characters_preferredFoodId_items_id"
	}),
	user: one(users, {
		fields: [characters.userId],
		references: [users.id]
	}),
	gatheringActions: many(gatheringActions),
	items_craftedById: many(items, {
		relationName: "items_craftedById_characters_id"
	}),
	items_ownerId: many(items, {
		relationName: "items_ownerId_characters_id"
	}),
	treaties: many(treaties),
	petitions: many(petitions),
	petitionSignatures: many(petitionSignatures),
	dailyActions: many(dailyActions),
	serviceActions_clientId: many(serviceActions, {
		relationName: "serviceActions_clientId_characters_id"
	}),
	serviceActions_providerId: many(serviceActions, {
		relationName: "serviceActions_providerId_characters_id"
	}),
	loans_bankerId: many(loans, {
		relationName: "loans_bankerId_characters_id"
	}),
	loans_borrowerId: many(loans, {
		relationName: "loans_borrowerId_characters_id"
	}),
	serviceReputations: many(serviceReputations),
	lawVotes: many(lawVotes),
	dailyReports: many(dailyReports),
	travelGroups: many(travelGroups),
	travelGroupMembers: many(travelGroupMembers),
	characterTravelStates: many(characterTravelStates),
	combatEncounterLogs: many(combatEncounterLogs),
	parties: many(parties),
	partyMembers: many(partyMembers),
	partyInvitations_characterId: many(partyInvitations, {
		relationName: "partyInvitations_characterId_characters_id"
	}),
	partyInvitations_invitedById: many(partyInvitations, {
		relationName: "partyInvitations_invitedById_characters_id"
	}),
	marketBuyOrders: many(marketBuyOrders),
	tradeTransactions_buyerId: many(tradeTransactions, {
		relationName: "tradeTransactions_buyerId_characters_id"
	}),
	tradeTransactions_sellerId: many(tradeTransactions, {
		relationName: "tradeTransactions_sellerId_characters_id"
	}),
	livestocks: many(livestock),
	houses: many(houses),
	jobListings_ownerId: many(jobListings, {
		relationName: "jobListings_ownerId_characters_id"
	}),
	jobListings_workerId: many(jobListings, {
		relationName: "jobListings_workerId_characters_id"
	}),
	ownedAssets: many(ownedAssets),
	characterActiveEffects: many(characterActiveEffects),
	droppedItems: many(droppedItems),
	noticeBoardPosts_authorId: many(noticeBoardPosts, {
		relationName: "noticeBoardPosts_authorId_characters_id"
	}),
	noticeBoardPosts_bountyClaimantId: many(noticeBoardPosts, {
		relationName: "noticeBoardPosts_bountyClaimantId_characters_id"
	}),
}));

export const characterActiveEffectsRelations = relations(characterActiveEffects, ({one}) => ({
	character: one(characters, {
		fields: [characterActiveEffects.characterId],
		references: [characters.id]
	}),
}));

export const itemsRelations = relations(items, ({one, many}) => ({
	characterEquipments: many(characterEquipment),
	inventories: many(inventories),
	marketListings: many(marketListings),
	characters: many(characters, {
		relationName: "characters_preferredFoodId_items_id"
	}),
	character_craftedById: one(characters, {
		fields: [items.craftedById],
		references: [characters.id],
		relationName: "items_craftedById_characters_id"
	}),
	character_ownerId: one(characters, {
		fields: [items.ownerId],
		references: [characters.id],
		relationName: "items_ownerId_characters_id"
	}),
	itemTemplate: one(itemTemplates, {
		fields: [items.templateId],
		references: [itemTemplates.id]
	}),
	tradeTransactions: many(tradeTransactions),
}));

export const inventoriesRelations = relations(inventories, ({one}) => ({
	character: one(characters, {
		fields: [inventories.characterId],
		references: [characters.id]
	}),
	item: one(items, {
		fields: [inventories.itemId],
		references: [items.id]
	}),
}));

export const professionXpRelations = relations(professionXp, ({one}) => ({
	character: one(characters, {
		fields: [professionXp.characterId],
		references: [characters.id]
	}),
}));

export const townResourcesRelations = relations(townResources, ({one}) => ({
	town: one(towns, {
		fields: [townResources.townId],
		references: [towns.id]
	}),
}));

export const townsRelations = relations(towns, ({one, many}) => ({
	townResources: many(townResources),
	buildings: many(buildings),
	priceHistories: many(priceHistories),
	caravans_fromTownId: many(caravans, {
		relationName: "caravans_fromTownId_towns_id"
	}),
	caravans_toTownId: many(caravans, {
		relationName: "caravans_toTownId_towns_id"
	}),
	combatSessions: many(combatSessions),
	character: one(characters, {
		fields: [towns.mayorId],
		references: [characters.id],
		relationName: "towns_mayorId_characters_id"
	}),
	region: one(regions, {
		fields: [towns.regionId],
		references: [regions.id]
	}),
	travelRoutes_fromTownId: many(travelRoutes, {
		relationName: "travelRoutes_fromTownId_towns_id"
	}),
	travelRoutes_toTownId: many(travelRoutes, {
		relationName: "travelRoutes_toTownId_towns_id"
	}),
	marketListings: many(marketListings),
	elections: many(elections),
	messages: many(messages),
	impeachments: many(impeachments),
	townTreasuries: many(townTreasuries),
	councilMembers: many(councilMembers),
	townPolicies: many(townPolicies),
	npcs: many(npcs),
	characters_currentTownId: many(characters, {
		relationName: "characters_currentTownId_towns_id"
	}),
	characters_homeTownId: many(characters, {
		relationName: "characters_homeTownId_towns_id"
	}),
	gatheringActions: many(gatheringActions),
	combatEncounterLogs_destinationTownId: many(combatEncounterLogs, {
		relationName: "combatEncounterLogs_destinationTownId_towns_id"
	}),
	combatEncounterLogs_originTownId: many(combatEncounterLogs, {
		relationName: "combatEncounterLogs_originTownId_towns_id"
	}),
	combatEncounterLogs_townId: many(combatEncounterLogs, {
		relationName: "combatEncounterLogs_townId_towns_id"
	}),
	parties: many(parties),
	tradeTransactions: many(tradeTransactions),
	auctionCycles: many(auctionCycles),
	houses: many(houses),
	jobListings: many(jobListings),
	ownedAssets: many(ownedAssets),
	noticeBoardPosts: many(noticeBoardPosts),
}));

export const regionBordersRelations = relations(regionBorders, ({one}) => ({
	region_regionId1: one(regions, {
		fields: [regionBorders.regionId1],
		references: [regions.id],
		relationName: "regionBorders_regionId1_regions_id"
	}),
	region_regionId2: one(regions, {
		fields: [regionBorders.regionId2],
		references: [regions.id],
		relationName: "regionBorders_regionId2_regions_id"
	}),
}));

export const regionsRelations = relations(regions, ({one, many}) => ({
	regionBorders_regionId1: many(regionBorders, {
		relationName: "regionBorders_regionId1_regions_id"
	}),
	regionBorders_regionId2: many(regionBorders, {
		relationName: "regionBorders_regionId2_regions_id"
	}),
	kingdom: one(kingdoms, {
		fields: [regions.kingdomId],
		references: [kingdoms.id]
	}),
	towns: many(towns),
	quests: many(quests),
	exclusiveZones: many(exclusiveZones),
	monsters: many(monsters),
}));

export const diplomacyEventsRelations = relations(diplomacyEvents, ({one}) => ({
	character_initiatorId: one(characters, {
		fields: [diplomacyEvents.initiatorId],
		references: [characters.id],
		relationName: "diplomacyEvents_initiatorId_characters_id"
	}),
	character_targetId: one(characters, {
		fields: [diplomacyEvents.targetId],
		references: [characters.id],
		relationName: "diplomacyEvents_targetId_characters_id"
	}),
}));

export const kingdomsRelations = relations(kingdoms, ({one, many}) => ({
	character: one(characters, {
		fields: [kingdoms.rulerId],
		references: [characters.id]
	}),
	regions: many(regions),
	elections: many(elections),
	laws: many(laws),
	impeachments: many(impeachments),
	councilMembers: many(councilMembers),
	wars_attackerKingdomId: many(wars, {
		relationName: "wars_attackerKingdomId_kingdoms_id"
	}),
	wars_defenderKingdomId: many(wars, {
		relationName: "wars_defenderKingdomId_kingdoms_id"
	}),
	treaties_proposerKingdomId: many(treaties, {
		relationName: "treaties_proposerKingdomId_kingdoms_id"
	}),
	treaties_receiverKingdomId: many(treaties, {
		relationName: "treaties_receiverKingdomId_kingdoms_id"
	}),
}));

export const buildingsRelations = relations(buildings, ({one, many}) => ({
	character: one(characters, {
		fields: [buildings.ownerId],
		references: [characters.id]
	}),
	town: one(towns, {
		fields: [buildings.townId],
		references: [towns.id]
	}),
	buildingConstructions: many(buildingConstructions),
	innMenuItems: many(innMenu),
	checkedInPatrons: many(characters, {
		relationName: "characters_checkedInInnId_buildings_id"
	}),
}));

export const innMenuRelations = relations(innMenu, ({one}) => ({
	building: one(buildings, {
		fields: [innMenu.buildingId],
		references: [buildings.id]
	}),
	itemTemplate: one(itemTemplates, {
		fields: [innMenu.itemTemplateId],
		references: [itemTemplates.id]
	}),
}));

export const buildingConstructionsRelations = relations(buildingConstructions, ({one}) => ({
	building: one(buildings, {
		fields: [buildingConstructions.buildingId],
		references: [buildings.id]
	}),
}));

export const priceHistoriesRelations = relations(priceHistories, ({one}) => ({
	itemTemplate: one(itemTemplates, {
		fields: [priceHistories.itemTemplateId],
		references: [itemTemplates.id]
	}),
	town: one(towns, {
		fields: [priceHistories.townId],
		references: [towns.id]
	}),
}));

export const itemTemplatesRelations = relations(itemTemplates, ({many}) => ({
	priceHistories: many(priceHistories),
	items: many(items),
	houseStorages: many(houseStorage),
}));

export const caravansRelations = relations(caravans, ({one}) => ({
	town_fromTownId: one(towns, {
		fields: [caravans.fromTownId],
		references: [towns.id],
		relationName: "caravans_fromTownId_towns_id"
	}),
	character: one(characters, {
		fields: [caravans.ownerId],
		references: [characters.id]
	}),
	town_toTownId: one(towns, {
		fields: [caravans.toTownId],
		references: [towns.id],
		relationName: "caravans_toTownId_towns_id"
	}),
}));

export const electionVotesRelations = relations(electionVotes, ({one}) => ({
	election: one(elections, {
		fields: [electionVotes.electionId],
		references: [elections.id]
	}),
	character: one(characters, {
		fields: [electionVotes.voterId],
		references: [characters.id]
	}),
}));

export const electionsRelations = relations(elections, ({one, many}) => ({
	electionVotes: many(electionVotes),
	kingdom: one(kingdoms, {
		fields: [elections.kingdomId],
		references: [kingdoms.id]
	}),
	town: one(towns, {
		fields: [elections.townId],
		references: [towns.id]
	}),
	character: one(characters, {
		fields: [elections.winnerId],
		references: [characters.id]
	}),
	electionCandidates: many(electionCandidates),
}));

export const guildsRelations = relations(guilds, ({one, many}) => ({
	character: one(characters, {
		fields: [guilds.leaderId],
		references: [characters.id]
	}),
	guildMembers: many(guildMembers),
	messages: many(messages),
}));

export const guildMembersRelations = relations(guildMembers, ({one}) => ({
	character: one(characters, {
		fields: [guildMembers.characterId],
		references: [characters.id]
	}),
	guild: one(guilds, {
		fields: [guildMembers.guildId],
		references: [guilds.id]
	}),
}));

export const questProgressRelations = relations(questProgress, ({one}) => ({
	character: one(characters, {
		fields: [questProgress.characterId],
		references: [characters.id]
	}),
	quest: one(quests, {
		fields: [questProgress.questId],
		references: [quests.id]
	}),
}));

export const questsRelations = relations(quests, ({one, many}) => ({
	questProgresses: many(questProgress),
	quest: one(quests, {
		fields: [quests.prerequisiteQuestId],
		references: [quests.id],
		relationName: "quests_prerequisiteQuestId_quests_id"
	}),
	quests: many(quests, {
		relationName: "quests_prerequisiteQuestId_quests_id"
	}),
	region: one(regions, {
		fields: [quests.regionId],
		references: [regions.id]
	}),
}));

export const combatLogsRelations = relations(combatLogs, ({one}) => ({
	combatSession: one(combatSessions, {
		fields: [combatLogs.sessionId],
		references: [combatSessions.id]
	}),
}));

export const combatSessionsRelations = relations(combatSessions, ({one, many}) => ({
	combatLogs: many(combatLogs),
	combatParticipants: many(combatParticipants),
	town: one(towns, {
		fields: [combatSessions.locationTownId],
		references: [towns.id]
	}),
}));

export const combatParticipantsRelations = relations(combatParticipants, ({one}) => ({
	character: one(characters, {
		fields: [combatParticipants.characterId],
		references: [characters.id]
	}),
	combatSession: one(combatSessions, {
		fields: [combatParticipants.sessionId],
		references: [combatSessions.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	character: one(characters, {
		fields: [notifications.characterId],
		references: [characters.id]
	}),
}));

export const racialAbilityCooldownsRelations = relations(racialAbilityCooldowns, ({one}) => ({
	character: one(characters, {
		fields: [racialAbilityCooldowns.characterId],
		references: [characters.id]
	}),
}));

export const changelingDisguisesRelations = relations(changelingDisguises, ({one}) => ({
	character: one(characters, {
		fields: [changelingDisguises.characterId],
		references: [characters.id]
	}),
}));

export const playerAchievementsRelations = relations(playerAchievements, ({one}) => ({
	achievement: one(achievements, {
		fields: [playerAchievements.achievementId],
		references: [achievements.id]
	}),
	character: one(characters, {
		fields: [playerAchievements.characterId],
		references: [characters.id]
	}),
}));

export const achievementsRelations = relations(achievements, ({many}) => ({
	playerAchievements: many(playerAchievements),
}));

export const forgebornMaintenanceRelations = relations(forgebornMaintenance, ({one}) => ({
	character: one(characters, {
		fields: [forgebornMaintenance.characterId],
		references: [characters.id]
	}),
}));

export const playerProfessionsRelations = relations(playerProfessions, ({one}) => ({
	character: one(characters, {
		fields: [playerProfessions.characterId],
		references: [characters.id]
	}),
}));

export const craftingActionsRelations = relations(craftingActions, ({one}) => ({
	character: one(characters, {
		fields: [craftingActions.characterId],
		references: [characters.id]
	}),
	recipe: one(recipes, {
		fields: [craftingActions.recipeId],
		references: [recipes.id]
	}),
}));

export const recipesRelations = relations(recipes, ({many}) => ({
	craftingActions: many(craftingActions),
}));

export const travelRoutesRelations = relations(travelRoutes, ({one, many}) => ({
	town_fromTownId: one(towns, {
		fields: [travelRoutes.fromTownId],
		references: [towns.id],
		relationName: "travelRoutes_fromTownId_towns_id"
	}),
	town_toTownId: one(towns, {
		fields: [travelRoutes.toTownId],
		references: [towns.id],
		relationName: "travelRoutes_toTownId_towns_id"
	}),
	travelNodes: many(travelNodes),
	characterTravelStates: many(characterTravelStates),
	groupTravelStates: many(groupTravelStates),
}));

export const marketListingsRelations = relations(marketListings, ({one, many}) => ({
	auctionCycle: one(auctionCycles, {
		fields: [marketListings.auctionCycleId],
		references: [auctionCycles.id]
	}),
	item: one(items, {
		fields: [marketListings.itemId],
		references: [items.id]
	}),
	character: one(characters, {
		fields: [marketListings.sellerId],
		references: [characters.id]
	}),
	town: one(towns, {
		fields: [marketListings.townId],
		references: [towns.id]
	}),
	marketBuyOrders: many(marketBuyOrders),
}));

export const auctionCyclesRelations = relations(auctionCycles, ({one, many}) => ({
	marketListings: many(marketListings),
	marketBuyOrders: many(marketBuyOrders),
	tradeTransactions: many(tradeTransactions),
	town: one(towns, {
		fields: [auctionCycles.townId],
		references: [towns.id]
	}),
}));

export const friendsRelations = relations(friends, ({one}) => ({
	character_recipientId: one(characters, {
		fields: [friends.recipientId],
		references: [characters.id],
		relationName: "friends_recipientId_characters_id"
	}),
	character_requesterId: one(characters, {
		fields: [friends.requesterId],
		references: [characters.id],
		relationName: "friends_requesterId_characters_id"
	}),
}));

export const lawsRelations = relations(laws, ({one, many}) => ({
	character: one(characters, {
		fields: [laws.enactedById],
		references: [characters.id]
	}),
	kingdom: one(kingdoms, {
		fields: [laws.kingdomId],
		references: [kingdoms.id]
	}),
	lawVotes: many(lawVotes),
}));

export const messagesRelations = relations(messages, ({one}) => ({
	guild: one(guilds, {
		fields: [messages.guildId],
		references: [guilds.id]
	}),
	character_recipientId: one(characters, {
		fields: [messages.recipientId],
		references: [characters.id],
		relationName: "messages_recipientId_characters_id"
	}),
	character_senderId: one(characters, {
		fields: [messages.senderId],
		references: [characters.id],
		relationName: "messages_senderId_characters_id"
	}),
	town: one(towns, {
		fields: [messages.townId],
		references: [towns.id]
	}),
}));

export const electionCandidatesRelations = relations(electionCandidates, ({one}) => ({
	character: one(characters, {
		fields: [electionCandidates.characterId],
		references: [characters.id]
	}),
	election: one(elections, {
		fields: [electionCandidates.electionId],
		references: [elections.id]
	}),
}));

export const impeachmentsRelations = relations(impeachments, ({one, many}) => ({
	kingdom: one(kingdoms, {
		fields: [impeachments.kingdomId],
		references: [kingdoms.id]
	}),
	character: one(characters, {
		fields: [impeachments.targetId],
		references: [characters.id]
	}),
	town: one(towns, {
		fields: [impeachments.townId],
		references: [towns.id]
	}),
	impeachmentVotes: many(impeachmentVotes),
}));

export const impeachmentVotesRelations = relations(impeachmentVotes, ({one}) => ({
	impeachment: one(impeachments, {
		fields: [impeachmentVotes.impeachmentId],
		references: [impeachments.id]
	}),
	character: one(characters, {
		fields: [impeachmentVotes.voterId],
		references: [characters.id]
	}),
}));

export const townTreasuriesRelations = relations(townTreasuries, ({one}) => ({
	town: one(towns, {
		fields: [townTreasuries.townId],
		references: [towns.id]
	}),
}));

export const councilMembersRelations = relations(councilMembers, ({one}) => ({
	character_appointedById: one(characters, {
		fields: [councilMembers.appointedById],
		references: [characters.id],
		relationName: "councilMembers_appointedById_characters_id"
	}),
	character_characterId: one(characters, {
		fields: [councilMembers.characterId],
		references: [characters.id],
		relationName: "councilMembers_characterId_characters_id"
	}),
	kingdom: one(kingdoms, {
		fields: [councilMembers.kingdomId],
		references: [kingdoms.id]
	}),
	town: one(towns, {
		fields: [councilMembers.townId],
		references: [towns.id]
	}),
}));

export const townPoliciesRelations = relations(townPolicies, ({one}) => ({
	character: one(characters, {
		fields: [townPolicies.sheriffId],
		references: [characters.id]
	}),
	town: one(towns, {
		fields: [townPolicies.townId],
		references: [towns.id]
	}),
}));

export const abilitiesRelations = relations(abilities, ({one, many}) => ({
	ability: one(abilities, {
		fields: [abilities.prerequisiteAbilityId],
		references: [abilities.id],
		relationName: "abilities_prerequisiteAbilityId_abilities_id"
	}),
	abilities: many(abilities, {
		relationName: "abilities_prerequisiteAbilityId_abilities_id"
	}),
	characterAbilities: many(characterAbilities),
}));

export const characterAbilitiesRelations = relations(characterAbilities, ({one}) => ({
	ability: one(abilities, {
		fields: [characterAbilities.abilityId],
		references: [abilities.id]
	}),
	character: one(characters, {
		fields: [characterAbilities.characterId],
		references: [characters.id]
	}),
}));

export const npcsRelations = relations(npcs, ({one}) => ({
	town: one(towns, {
		fields: [npcs.townId],
		references: [towns.id]
	}),
}));

export const characterAppearancesRelations = relations(characterAppearances, ({one}) => ({
	character: one(characters, {
		fields: [characterAppearances.characterId],
		references: [characters.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	characters: many(characters),
}));

export const exclusiveZonesRelations = relations(exclusiveZones, ({one}) => ({
	region: one(regions, {
		fields: [exclusiveZones.regionId],
		references: [regions.id]
	}),
}));

export const gatheringActionsRelations = relations(gatheringActions, ({one}) => ({
	character: one(characters, {
		fields: [gatheringActions.characterId],
		references: [characters.id]
	}),
	resource: one(resources, {
		fields: [gatheringActions.resourceId],
		references: [resources.id]
	}),
	town: one(towns, {
		fields: [gatheringActions.townId],
		references: [towns.id]
	}),
}));

export const resourcesRelations = relations(resources, ({many}) => ({
	gatheringActions: many(gatheringActions),
}));

export const warsRelations = relations(wars, ({one}) => ({
	kingdom_attackerKingdomId: one(kingdoms, {
		fields: [wars.attackerKingdomId],
		references: [kingdoms.id],
		relationName: "wars_attackerKingdomId_kingdoms_id"
	}),
	kingdom_defenderKingdomId: one(kingdoms, {
		fields: [wars.defenderKingdomId],
		references: [kingdoms.id],
		relationName: "wars_defenderKingdomId_kingdoms_id"
	}),
}));

export const treatiesRelations = relations(treaties, ({one}) => ({
	character: one(characters, {
		fields: [treaties.proposedById],
		references: [characters.id]
	}),
	kingdom_proposerKingdomId: one(kingdoms, {
		fields: [treaties.proposerKingdomId],
		references: [kingdoms.id],
		relationName: "treaties_proposerKingdomId_kingdoms_id"
	}),
	kingdom_receiverKingdomId: one(kingdoms, {
		fields: [treaties.receiverKingdomId],
		references: [kingdoms.id],
		relationName: "treaties_receiverKingdomId_kingdoms_id"
	}),
}));

export const petitionsRelations = relations(petitions, ({one, many}) => ({
	character: one(characters, {
		fields: [petitions.creatorId],
		references: [characters.id]
	}),
	petitionSignatures: many(petitionSignatures),
}));

export const petitionSignaturesRelations = relations(petitionSignatures, ({one}) => ({
	character: one(characters, {
		fields: [petitionSignatures.characterId],
		references: [characters.id]
	}),
	petition: one(petitions, {
		fields: [petitionSignatures.petitionId],
		references: [petitions.id]
	}),
}));

export const dailyActionsRelations = relations(dailyActions, ({one}) => ({
	character: one(characters, {
		fields: [dailyActions.characterId],
		references: [characters.id]
	}),
}));

export const serviceActionsRelations = relations(serviceActions, ({one}) => ({
	character_clientId: one(characters, {
		fields: [serviceActions.clientId],
		references: [characters.id],
		relationName: "serviceActions_clientId_characters_id"
	}),
	character_providerId: one(characters, {
		fields: [serviceActions.providerId],
		references: [characters.id],
		relationName: "serviceActions_providerId_characters_id"
	}),
}));

export const loansRelations = relations(loans, ({one}) => ({
	character_bankerId: one(characters, {
		fields: [loans.bankerId],
		references: [characters.id],
		relationName: "loans_bankerId_characters_id"
	}),
	character_borrowerId: one(characters, {
		fields: [loans.borrowerId],
		references: [characters.id],
		relationName: "loans_borrowerId_characters_id"
	}),
}));

export const serviceReputationsRelations = relations(serviceReputations, ({one}) => ({
	character: one(characters, {
		fields: [serviceReputations.characterId],
		references: [characters.id]
	}),
}));

export const lawVotesRelations = relations(lawVotes, ({one}) => ({
	character: one(characters, {
		fields: [lawVotes.characterId],
		references: [characters.id]
	}),
	law: one(laws, {
		fields: [lawVotes.lawId],
		references: [laws.id]
	}),
}));

export const dailyReportsRelations = relations(dailyReports, ({one}) => ({
	character: one(characters, {
		fields: [dailyReports.characterId],
		references: [characters.id]
	}),
}));

export const travelGroupsRelations = relations(travelGroups, ({one, many}) => ({
	character: one(characters, {
		fields: [travelGroups.leaderId],
		references: [characters.id]
	}),
	party: one(parties, {
		fields: [travelGroups.partyId],
		references: [parties.id]
	}),
	travelGroupMembers: many(travelGroupMembers),
	groupTravelStates: many(groupTravelStates),
}));

export const partiesRelations = relations(parties, ({one, many}) => ({
	travelGroups: many(travelGroups),
	combatEncounterLogs: many(combatEncounterLogs),
	character: one(characters, {
		fields: [parties.leaderId],
		references: [characters.id]
	}),
	town: one(towns, {
		fields: [parties.townId],
		references: [towns.id]
	}),
	partyMembers: many(partyMembers),
	partyInvitations: many(partyInvitations),
}));

export const travelNodesRelations = relations(travelNodes, ({one}) => ({
	travelRoute: one(travelRoutes, {
		fields: [travelNodes.routeId],
		references: [travelRoutes.id]
	}),
}));

export const travelGroupMembersRelations = relations(travelGroupMembers, ({one}) => ({
	character: one(characters, {
		fields: [travelGroupMembers.characterId],
		references: [characters.id]
	}),
	travelGroup: one(travelGroups, {
		fields: [travelGroupMembers.groupId],
		references: [travelGroups.id]
	}),
}));

export const characterTravelStatesRelations = relations(characterTravelStates, ({one}) => ({
	character: one(characters, {
		fields: [characterTravelStates.characterId],
		references: [characters.id]
	}),
	travelRoute: one(travelRoutes, {
		fields: [characterTravelStates.routeId],
		references: [travelRoutes.id]
	}),
}));

export const combatEncounterLogsRelations = relations(combatEncounterLogs, ({one}) => ({
	character: one(characters, {
		fields: [combatEncounterLogs.characterId],
		references: [characters.id]
	}),
	town_destinationTownId: one(towns, {
		fields: [combatEncounterLogs.destinationTownId],
		references: [towns.id],
		relationName: "combatEncounterLogs_destinationTownId_towns_id"
	}),
	town_originTownId: one(towns, {
		fields: [combatEncounterLogs.originTownId],
		references: [towns.id],
		relationName: "combatEncounterLogs_originTownId_towns_id"
	}),
	party: one(parties, {
		fields: [combatEncounterLogs.partyId],
		references: [parties.id]
	}),
	simulationRun: one(simulationRuns, {
		fields: [combatEncounterLogs.simulationRunId],
		references: [simulationRuns.id]
	}),
	town_townId: one(towns, {
		fields: [combatEncounterLogs.townId],
		references: [towns.id],
		relationName: "combatEncounterLogs_townId_towns_id"
	}),
}));

export const simulationRunsRelations = relations(simulationRuns, ({many}) => ({
	combatEncounterLogs: many(combatEncounterLogs),
}));

export const groupTravelStatesRelations = relations(groupTravelStates, ({one}) => ({
	travelGroup: one(travelGroups, {
		fields: [groupTravelStates.groupId],
		references: [travelGroups.id]
	}),
	travelRoute: one(travelRoutes, {
		fields: [groupTravelStates.routeId],
		references: [travelRoutes.id]
	}),
}));

export const partyMembersRelations = relations(partyMembers, ({one}) => ({
	character: one(characters, {
		fields: [partyMembers.characterId],
		references: [characters.id]
	}),
	party: one(parties, {
		fields: [partyMembers.partyId],
		references: [parties.id]
	}),
}));

export const partyInvitationsRelations = relations(partyInvitations, ({one}) => ({
	character_characterId: one(characters, {
		fields: [partyInvitations.characterId],
		references: [characters.id],
		relationName: "partyInvitations_characterId_characters_id"
	}),
	character_invitedById: one(characters, {
		fields: [partyInvitations.invitedById],
		references: [characters.id],
		relationName: "partyInvitations_invitedById_characters_id"
	}),
	party: one(parties, {
		fields: [partyInvitations.partyId],
		references: [parties.id]
	}),
}));

export const marketBuyOrdersRelations = relations(marketBuyOrders, ({one}) => ({
	auctionCycle: one(auctionCycles, {
		fields: [marketBuyOrders.auctionCycleId],
		references: [auctionCycles.id]
	}),
	character: one(characters, {
		fields: [marketBuyOrders.buyerId],
		references: [characters.id]
	}),
	marketListing: one(marketListings, {
		fields: [marketBuyOrders.listingId],
		references: [marketListings.id]
	}),
}));

export const tradeTransactionsRelations = relations(tradeTransactions, ({one}) => ({
	auctionCycle: one(auctionCycles, {
		fields: [tradeTransactions.auctionCycleId],
		references: [auctionCycles.id]
	}),
	character_buyerId: one(characters, {
		fields: [tradeTransactions.buyerId],
		references: [characters.id],
		relationName: "tradeTransactions_buyerId_characters_id"
	}),
	item: one(items, {
		fields: [tradeTransactions.itemId],
		references: [items.id]
	}),
	character_sellerId: one(characters, {
		fields: [tradeTransactions.sellerId],
		references: [characters.id],
		relationName: "tradeTransactions_sellerId_characters_id"
	}),
	town: one(towns, {
		fields: [tradeTransactions.townId],
		references: [towns.id]
	}),
}));

export const livestockRelations = relations(livestock, ({one}) => ({
	ownedAsset: one(ownedAssets, {
		fields: [livestock.buildingId],
		references: [ownedAssets.id]
	}),
	character: one(characters, {
		fields: [livestock.ownerId],
		references: [characters.id]
	}),
}));

export const ownedAssetsRelations = relations(ownedAssets, ({one, many}) => ({
	livestocks: many(livestock),
	jobListings: many(jobListings),
	character: one(characters, {
		fields: [ownedAssets.ownerId],
		references: [characters.id]
	}),
	town: one(towns, {
		fields: [ownedAssets.townId],
		references: [towns.id]
	}),
}));

export const housesRelations = relations(houses, ({one, many}) => ({
	character: one(characters, {
		fields: [houses.characterId],
		references: [characters.id]
	}),
	town: one(towns, {
		fields: [houses.townId],
		references: [towns.id]
	}),
	houseStorages: many(houseStorage),
}));

export const houseStorageRelations = relations(houseStorage, ({one}) => ({
	house: one(houses, {
		fields: [houseStorage.houseId],
		references: [houses.id]
	}),
	itemTemplate: one(itemTemplates, {
		fields: [houseStorage.itemTemplateId],
		references: [itemTemplates.id]
	}),
}));

export const jobListingsRelations = relations(jobListings, ({one}) => ({
	ownedAsset: one(ownedAssets, {
		fields: [jobListings.assetId],
		references: [ownedAssets.id]
	}),
	character_ownerId: one(characters, {
		fields: [jobListings.ownerId],
		references: [characters.id],
		relationName: "jobListings_ownerId_characters_id"
	}),
	town: one(towns, {
		fields: [jobListings.townId],
		references: [towns.id]
	}),
	character_workerId: one(characters, {
		fields: [jobListings.workerId],
		references: [characters.id],
		relationName: "jobListings_workerId_characters_id"
	}),
}));

export const monstersRelations = relations(monsters, ({one}) => ({
	region: one(regions, {
		fields: [monsters.regionId],
		references: [regions.id]
	}),
}));

export const droppedItemsRelations = relations(droppedItems, ({one}) => ({
	character: one(characters, {
		fields: [droppedItems.characterId],
		references: [characters.id]
	}),
}));

// deletionLogs — standalone audit table (relations definition needed for db.query)
export const deletionLogsRelations = relations(deletionLogs, () => ({}));

export const noticeBoardPostsRelations = relations(noticeBoardPosts, ({one}) => ({
	town: one(towns, {
		fields: [noticeBoardPosts.townId],
		references: [towns.id]
	}),
	author: one(characters, {
		fields: [noticeBoardPosts.authorId],
		references: [characters.id],
		relationName: "noticeBoardPosts_authorId_characters_id"
	}),
	claimant: one(characters, {
		fields: [noticeBoardPosts.bountyClaimantId],
		references: [characters.id],
		relationName: "noticeBoardPosts_bountyClaimantId_characters_id"
	}),
}));