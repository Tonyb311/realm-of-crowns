/**
 * Supply Chain Data Model — derives an interactive graph from shared game data.
 *
 * ABSOLUTE RULE: Every node and edge is derived from imported shared data.
 * Zero hardcoded item names or profession-to-item mappings.
 */

import { ALL_PROFESSIONS } from '@shared/data/professions';
import { GATHER_SPOT_PROFESSION_MAP, RESOURCE_MAP } from '@shared/data/gathering';
import {
  PROFESSION_ASSET_TYPES,
  LIVESTOCK_DEFINITIONS,
  BUILDING_ANIMAL_MAP,
} from '@shared/data/assets';
import {
  ALL_PROCESSING_RECIPES,
  ALL_COOK_RECIPES,
  ALL_ACCESSORY_RECIPES,
  ALL_FINISHED_GOODS_RECIPES,
  ALL_CONSUMABLE_RECIPES,
} from '@shared/data/recipes';

// ============================================================
// Types
// ============================================================

export type NodeType = 'gathering' | 'processing' | 'crafting' | 'service' | 'resource' | 'product';

export interface SupplyNode {
  id: string;
  label: string;
  type: NodeType;
  category?: string;
  assetBased?: boolean;
}

export interface SupplyEdge {
  source: string;
  target: string;
  label?: string;
  quantity?: number;
  edgeType: 'produces' | 'consumes' | 'processes' | 'feeds';
}

export interface SupplyChainGraph {
  nodes: SupplyNode[];
  edges: SupplyEdge[];
}

export interface NodeDetail {
  node: SupplyNode;
  produces: { item: string; quantity?: number; recipe?: string }[];
  consumes: { item: string; quantity?: number; recipe?: string }[];
  dependsOn: string[];   // profession labels
  suppliesTo: string[];  // profession labels
}

// ============================================================
// Helpers
// ============================================================

// Derive which professions are processors from actual recipe data
const processingProfessionSet = new Set(
  ALL_PROCESSING_RECIPES.map(r => r.professionRequired),
);

// Derive which professions own assets
const assetProfessionSet = new Set(Object.keys(PROFESSION_ASSET_TYPES));

function getProfessionNodeType(category: string, profType: string): NodeType {
  if (category === 'GATHERING') return 'gathering';
  if (category === 'SERVICE') return 'service';
  if (processingProfessionSet.has(profType as never)) return 'processing';
  return 'crafting';
}

// ============================================================
// Graph Builder
// ============================================================

export function buildSupplyChainGraph(): SupplyChainGraph {
  const nodes: SupplyNode[] = [];
  const edges: SupplyEdge[] = [];
  const nodeIds = new Set<string>();
  const edgeKeys = new Set<string>();

  function addNode(node: SupplyNode) {
    if (!nodeIds.has(node.id)) {
      nodes.push(node);
      nodeIds.add(node.id);
    }
  }

  function addEdge(edge: SupplyEdge) {
    const key = `${edge.source}|${edge.target}|${edge.edgeType}`;
    if (!edgeKeys.has(key)) {
      edges.push(edge);
      edgeKeys.add(key);
    }
  }

  // ── 1. Profession nodes ─────────────────────────────────
  for (const prof of ALL_PROFESSIONS) {
    addNode({
      id: `prof:${prof.type}`,
      label: prof.name,
      type: getProfessionNodeType(prof.category, prof.type),
      category: prof.category,
      assetBased: assetProfessionSet.has(prof.type),
    });
  }

  // ── 2. Gathering profession → item edges ────────────────
  const gatheringOutputs = new Set<string>();
  const profGatherItems: Record<string, Set<string>> = {};

  function trackGather(profType: string, itemName: string) {
    if (!profGatherItems[profType]) profGatherItems[profType] = new Set();
    profGatherItems[profType].add(itemName);
    gatheringOutputs.add(itemName);
  }

  // 2a. From GATHER_SPOT_PROFESSION_MAP + RESOURCE_MAP
  for (const [spotType, profType] of Object.entries(GATHER_SPOT_PROFESSION_MAP)) {
    const mapping = RESOURCE_MAP[spotType];
    if (mapping) trackGather(profType, mapping.item.templateName);
  }

  // 2b. From PROFESSION_ASSET_TYPES + RESOURCE_MAP (captures spots not in GATHER_SPOT_PROFESSION_MAP)
  for (const [profType, assetDefs] of Object.entries(PROFESSION_ASSET_TYPES)) {
    for (const asset of assetDefs) {
      const mapping = RESOURCE_MAP[asset.spotType];
      if (mapping) trackGather(profType, mapping.item.templateName);
    }
  }

  // 2c. From LIVESTOCK_DEFINITIONS (product field)
  for (const def of Object.values(LIVESTOCK_DEFINITIONS)) {
    trackGather(
      // Derive which profession owns the building for this animal
      Object.entries(PROFESSION_ASSET_TYPES).find(([, assets]) =>
        assets.some(a => a.id === def.buildingType),
      )?.[0] ?? '',
      def.product,
    );
  }

  // Create item nodes + edges for gathering outputs
  for (const [profType, items] of Object.entries(profGatherItems)) {
    if (!profType) continue;
    for (const itemName of items) {
      addNode({ id: `item:${itemName}`, label: itemName, type: 'resource' });
      addEdge({
        source: `prof:${profType}`,
        target: `item:${itemName}`,
        label: itemName,
        edgeType: 'produces',
      });
    }
  }

  // ── 3. Recipe edges ─────────────────────────────────────

  // 3a. Processing + Cook + Accessory recipes (RecipeDefinition: has .outputs[])
  for (const recipe of [...ALL_PROCESSING_RECIPES, ...ALL_COOK_RECIPES, ...ALL_ACCESSORY_RECIPES]) {
    const profId = `prof:${recipe.professionRequired}`;
    for (const out of recipe.outputs) {
      const itemId = `item:${out.itemName}`;
      addNode({
        id: itemId,
        label: out.itemName as string,
        type: gatheringOutputs.has(out.itemName as string) ? 'resource' : 'product',
      });
      addEdge({ source: profId, target: itemId, label: out.itemName as string, quantity: out.quantity, edgeType: 'produces' });
    }
    for (const inp of recipe.inputs) {
      const itemId = `item:${inp.itemName}`;
      addNode({
        id: itemId,
        label: inp.itemName as string,
        type: gatheringOutputs.has(inp.itemName as string) ? 'resource' : 'product',
      });
      addEdge({ source: itemId, target: profId, label: inp.itemName as string, quantity: inp.quantity, edgeType: 'consumes' });
    }
  }

  // 3b. Finished goods recipes (FinishedGoodsRecipe: has .outputs[])
  for (const recipe of ALL_FINISHED_GOODS_RECIPES) {
    const profId = `prof:${recipe.professionRequired}`;
    for (const out of recipe.outputs) {
      const itemId = `item:${out.itemName}`;
      addNode({ id: itemId, label: out.itemName as string, type: 'product' });
      addEdge({ source: profId, target: itemId, label: out.itemName as string, quantity: out.quantity, edgeType: 'produces' });
    }
    for (const inp of recipe.inputs) {
      const itemId = `item:${inp.itemName}`;
      addNode({
        id: itemId,
        label: inp.itemName as string,
        type: gatheringOutputs.has(inp.itemName as string) ? 'resource' : 'product',
      });
      addEdge({ source: itemId, target: profId, label: inp.itemName as string, quantity: inp.quantity, edgeType: 'consumes' });
    }
  }

  // 3c. Consumable recipes (ConsumableRecipe: has singular .output)
  for (const recipe of ALL_CONSUMABLE_RECIPES) {
    const profId = `prof:${recipe.professionRequired}`;
    const out = recipe.output;
    const itemId = `item:${out.itemName}`;
    addNode({ id: itemId, label: out.itemName as string, type: 'product' });
    addEdge({ source: profId, target: itemId, label: out.itemName as string, quantity: out.quantity, edgeType: 'produces' });
    for (const inp of recipe.inputs) {
      const inputId = `item:${inp.itemName}`;
      addNode({
        id: inputId,
        label: inp.itemName as string,
        type: gatheringOutputs.has(inp.itemName as string) ? 'resource' : 'product',
      });
      addEdge({ source: inputId, target: profId, label: inp.itemName as string, quantity: inp.quantity, edgeType: 'consumes' });
    }
  }

  // ── 4. Livestock feed dependency (FARMER → Grain → RANCHER) ──
  // Derived: if any livestock has feedCost > 0, link the grain item to the rancher profession
  const feedItem = RESOURCE_MAP.grain_field?.item?.templateName;
  if (feedItem && Object.values(LIVESTOCK_DEFINITIONS).some(d => d.feedCost > 0)) {
    for (const [profType, assets] of Object.entries(PROFESSION_ASSET_TYPES)) {
      const ownsLivestock = assets.some(a =>
        (BUILDING_ANIMAL_MAP[a.id]?.length ?? 0) > 0,
      );
      if (ownsLivestock) {
        addEdge({
          source: `item:${feedItem}`,
          target: `prof:${profType}`,
          label: feedItem,
          edgeType: 'feeds',
        });
      }
    }
  }

  return { nodes, edges };
}

// ============================================================
// Query helpers (used by detail panel and highlighting)
// ============================================================

/** Get all node IDs connected to the given node (inclusive). */
export function getConnectedIds(graph: SupplyChainGraph, nodeId: string): Set<string> {
  const ids = new Set<string>([nodeId]);
  for (const e of graph.edges) {
    if (e.source === nodeId || e.target === nodeId) {
      ids.add(e.source);
      ids.add(e.target);
    }
  }
  return ids;
}

/** Get all node IDs whose label matches the search term (case-insensitive), plus their neighbors. */
export function getSearchMatchIds(graph: SupplyChainGraph, term: string): Set<string> {
  const lower = term.toLowerCase();
  const matched = graph.nodes.filter(n => n.label.toLowerCase().includes(lower));
  if (matched.length === 0) return new Set<string>();
  const ids = new Set<string>();
  for (const m of matched) {
    ids.add(m.id);
    for (const e of graph.edges) {
      if (e.source === m.id || e.target === m.id) {
        ids.add(e.source);
        ids.add(e.target);
      }
    }
  }
  return ids;
}

/** Build detail info for a selected node. */
export function getNodeDetail(graph: SupplyChainGraph, nodeId: string): NodeDetail | null {
  const node = graph.nodes.find(n => n.id === nodeId);
  if (!node) return null;

  const produces: NodeDetail['produces'] = [];
  const consumes: NodeDetail['consumes'] = [];
  const dependsOnSet = new Set<string>();
  const suppliesToSet = new Set<string>();

  const nodeMap = new Map(graph.nodes.map(n => [n.id, n]));

  for (const e of graph.edges) {
    if (e.source === nodeId) {
      // This node → target
      const target = nodeMap.get(e.target);
      if (target) {
        if (e.edgeType === 'produces') {
          produces.push({ item: target.label, quantity: e.quantity });
          // Who consumes what this node produces?
          for (const e2 of graph.edges) {
            if (e2.source === e.target && e2.edgeType === 'consumes') {
              const consumer = nodeMap.get(e2.target);
              if (consumer && consumer.id !== nodeId) suppliesToSet.add(consumer.label);
            }
          }
        } else if (e.edgeType === 'consumes') {
          // This item is consumed by a profession
          consumes.push({ item: target.label, quantity: e.quantity });
        }
      }
    }
    if (e.target === nodeId) {
      // Source → this node
      const source = nodeMap.get(e.source);
      if (source) {
        if (e.edgeType === 'consumes' || e.edgeType === 'feeds') {
          consumes.push({ item: source.label, quantity: e.quantity });
          // Who produces what this node consumes?
          for (const e2 of graph.edges) {
            if (e2.target === e.source && e2.edgeType === 'produces') {
              const producer = nodeMap.get(e2.source);
              if (producer && producer.id !== nodeId) dependsOnSet.add(producer.label);
            }
          }
        } else if (e.edgeType === 'produces') {
          // A profession produces this item
          produces.push({ item: source.label, quantity: e.quantity });
        }
      }
    }
  }

  return {
    node,
    produces,
    consumes,
    dependsOn: [...dependsOnSet],
    suppliesTo: [...suppliesToSet],
  };
}

/** Compute direct profession-to-profession edges (for "hide items" mode). */
export function getProfessionEdges(graph: SupplyChainGraph): SupplyEdge[] {
  // For each item node, find producers and consumers, then link them directly
  const profEdges: SupplyEdge[] = [];
  const edgeSet = new Set<string>();
  const itemNodes = new Set(graph.nodes.filter(n => n.type === 'resource' || n.type === 'product').map(n => n.id));

  for (const itemId of itemNodes) {
    const producers: string[] = [];
    const consumers: string[] = [];
    for (const e of graph.edges) {
      if (e.target === itemId && e.edgeType === 'produces') producers.push(e.source);
      if (e.source === itemId && (e.edgeType === 'consumes' || e.edgeType === 'feeds')) consumers.push(e.target);
    }
    for (const prod of producers) {
      for (const cons of consumers) {
        if (prod !== cons) {
          const key = `${prod}|${cons}`;
          if (!edgeSet.has(key)) {
            edgeSet.add(key);
            const itemLabel = graph.nodes.find(n => n.id === itemId)?.label;
            profEdges.push({
              source: prod,
              target: cons,
              label: itemLabel,
              edgeType: 'processes',
            });
          }
        }
      }
    }
  }
  return profEdges;
}
