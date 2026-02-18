import { useState, useMemo, useCallback } from 'react';
import { Search, RotateCcw, X } from 'lucide-react';
import {
  buildSupplyChainGraph,
  getConnectedIds,
  getSearchMatchIds,
  getNodeDetail,
  getProfessionEdges,
  type SupplyNode,
  type SupplyEdge,
  type NodeType,
  type NodeDetail,
} from './supply-chain-data';

// ============================================================
// Constants
// ============================================================

const SVG_W = 1100;
const COL_X = { gathering: 130, items: 520, crafting: 910 };
const PROF_W = 160;
const PROF_H = 36;
const PROF_GAP = 8;
const ITEM_W = 140;
const ITEM_H = 22;
const ITEM_GAP = 3;
const HEADER_Y = 30;
const START_Y = 56;

const NODE_STYLE: Record<NodeType, { fill: string; stroke: string; text: string; dim: string }> = {
  gathering:  { fill: 'rgba(16,185,129,0.12)',  stroke: '#10b981', text: '#6ee7b7', dim: '#10b981' },
  processing: { fill: 'rgba(59,130,246,0.12)',  stroke: '#3b82f6', text: '#93c5fd', dim: '#3b82f6' },
  crafting:   { fill: 'rgba(245,158,11,0.12)',  stroke: '#f59e0b', text: '#fcd34d', dim: '#f59e0b' },
  service:    { fill: 'rgba(168,85,247,0.12)',   stroke: '#a855f7', text: '#c4b5fd', dim: '#a855f7' },
  resource:   { fill: 'rgba(107,114,128,0.08)', stroke: '#4b5563', text: '#9ca3af', dim: '#4b5563' },
  product:    { fill: 'rgba(75,85,99,0.06)',    stroke: '#374151', text: '#6b7280', dim: '#374151' },
};

const EDGE_COLORS: Record<string, string> = {
  gathering: '#10b98180', processing: '#3b82f680', crafting: '#f59e0b80',
  service: '#a855f780', resource: '#4b556380', product: '#37415180',
  feeds: '#f9731680',
};

interface Filters {
  gathering: boolean;
  processing: boolean;
  crafting: boolean;
  service: boolean;
  showItems: boolean;
  showEndProducts: boolean;
}

const FILTER_DEFS: { key: keyof Filters; label: string; color: string }[] = [
  { key: 'gathering',  label: 'Gathering',  color: '#10b981' },
  { key: 'processing', label: 'Processing', color: '#3b82f6' },
  { key: 'crafting',   label: 'Crafting',   color: '#f59e0b' },
  { key: 'service',    label: 'Service',    color: '#a855f7' },
  { key: 'showItems',  label: 'Items',      color: '#6b7280' },
  { key: 'showEndProducts', label: 'End Products', color: '#4b5563' },
];

// ============================================================
// Layout helpers
// ============================================================

interface LayoutNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  node: SupplyNode;
}

interface LayoutEdge {
  path: string;
  edge: SupplyEdge;
  color: string;
}

function bezier(x1: number, y1: number, x2: number, y2: number): string {
  const dx = x2 - x1;
  return `M${x1},${y1} C${x1 + dx * 0.4},${y1} ${x2 - dx * 0.4},${y2} ${x2},${y2}`;
}

function edgeColor(sourceType: NodeType, edgeType: string): string {
  if (edgeType === 'feeds') return EDGE_COLORS.feeds;
  return EDGE_COLORS[sourceType] || EDGE_COLORS.resource;
}

function stackNodes(
  nodes: SupplyNode[],
  cx: number,
  w: number,
  h: number,
  gap: number,
  startY: number,
): LayoutNode[] {
  return nodes.map((node, i) => ({
    id: node.id,
    x: cx - w / 2,
    y: startY + i * (h + gap),
    w,
    h,
    node,
  }));
}

function computeLayout(
  graph: ReturnType<typeof buildSupplyChainGraph>,
  filters: Filters,
  endProductIds: Set<string>,
) {
  // Determine visible node types
  const visibleTypes = new Set<NodeType>();
  if (filters.gathering) visibleTypes.add('gathering');
  if (filters.processing) visibleTypes.add('processing');
  if (filters.crafting) visibleTypes.add('crafting');
  if (filters.service) visibleTypes.add('service');
  if (filters.showItems) {
    visibleTypes.add('resource');
    visibleTypes.add('product');
  }

  // Filter nodes
  const visible = graph.nodes.filter(n => {
    if (!visibleTypes.has(n.type)) return false;
    if (!filters.showEndProducts && endProductIds.has(n.id)) return false;
    return true;
  });

  const visibleIds = new Set(visible.map(n => n.id));

  // Partition into columns
  const gatherCol = visible.filter(n => n.type === 'gathering')
    .sort((a, b) => a.label.localeCompare(b.label));
  const itemCol = visible.filter(n => n.type === 'resource' || n.type === 'product')
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'resource' ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
  const craftCol = visible.filter(n => ['processing', 'crafting', 'service'].includes(n.type))
    .sort((a, b) => {
      const ord: Record<string, number> = { processing: 0, crafting: 1, service: 2 };
      const d = (ord[a.type] ?? 1) - (ord[b.type] ?? 1);
      return d !== 0 ? d : a.label.localeCompare(b.label);
    });

  // Position nodes
  const gatherLayout = stackNodes(gatherCol, COL_X.gathering, PROF_W, PROF_H, PROF_GAP, START_Y);
  const itemLayout = stackNodes(itemCol, COL_X.items, ITEM_W, ITEM_H, ITEM_GAP, START_Y);
  const craftLayout = stackNodes(craftCol, COL_X.crafting, PROF_W, PROF_H, PROF_GAP, START_Y);

  const allLayout = [...gatherLayout, ...itemLayout, ...craftLayout];
  const layoutMap = new Map(allLayout.map(ln => [ln.id, ln]));

  // Determine edges to render
  let edgesToRender: SupplyEdge[];
  if (filters.showItems) {
    edgesToRender = graph.edges.filter(e => visibleIds.has(e.source) && visibleIds.has(e.target));
  } else {
    // Items hidden — show direct profession-to-profession edges
    edgesToRender = getProfessionEdges(graph).filter(e => visibleIds.has(e.source) && visibleIds.has(e.target));
  }

  // Compute edge paths
  const layoutEdges: LayoutEdge[] = [];
  for (const edge of edgesToRender) {
    const s = layoutMap.get(edge.source);
    const t = layoutMap.get(edge.target);
    if (!s || !t) continue;

    const sCx = s.x + s.w / 2;
    const tCx = t.x + t.w / 2;
    let x1: number, x2: number;
    if (sCx <= tCx) {
      x1 = s.x + s.w;
      x2 = t.x;
    } else {
      x1 = s.x;
      x2 = t.x + t.w;
    }
    const y1 = s.y + s.h / 2;
    const y2 = t.y + t.h / 2;

    layoutEdges.push({
      path: bezier(x1, y1, x2, y2),
      edge,
      color: edgeColor(s.node.type, edge.edgeType),
    });
  }

  const heights = [gatherLayout, itemLayout, craftLayout].map(col =>
    col.length > 0 ? col[col.length - 1].y + col[col.length - 1].h : START_Y,
  );
  const svgH = Math.max(...heights, 200) + 40;

  return { layoutNodes: allLayout, layoutEdges, svgH, layoutMap };
}

// ============================================================
// Component
// ============================================================

export default function SupplyChainView() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({
    gathering: true,
    processing: true,
    crafting: true,
    service: false,
    showItems: true,
    showEndProducts: false,
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Build graph once
  const graph = useMemo(() => buildSupplyChainGraph(), []);

  // Identify end-product items (produced but never consumed)
  const endProductIds = useMemo(() => {
    const consumed = new Set(
      graph.edges
        .filter(e => e.edgeType === 'consumes' || e.edgeType === 'feeds')
        .map(e => e.source),
    );
    return new Set(
      graph.nodes
        .filter(n => (n.type === 'resource' || n.type === 'product') && !consumed.has(n.id))
        .map(n => n.id),
    );
  }, [graph]);

  // Layout
  const { layoutNodes, layoutEdges, svgH } = useMemo(
    () => computeLayout(graph, filters, endProductIds),
    [graph, filters, endProductIds],
  );

  // Highlighting
  const highlightedIds = useMemo(() => {
    if (selectedNode) return getConnectedIds(graph, selectedNode);
    if (searchTerm.length >= 2) return getSearchMatchIds(graph, searchTerm);
    return null;
  }, [graph, selectedNode, searchTerm]);

  // Detail data
  const detail: NodeDetail | null = useMemo(
    () => (selectedNode ? getNodeDetail(graph, selectedNode) : null),
    [graph, selectedNode],
  );

  const reset = useCallback(() => {
    setSelectedNode(null);
    setSearchTerm('');
  }, []);

  const toggleFilter = useCallback((key: keyof Filters) => {
    setFilters(f => ({ ...f, [key]: !f[key] }));
  }, []);

  const handleNodeClick = useCallback(
    (id: string) => setSelectedNode(prev => (prev === id ? null : id)),
    [],
  );

  // Stats
  const profCount = graph.nodes.filter(n => !['resource', 'product'].includes(n.type)).length;
  const itemCount = graph.nodes.filter(n => n.type === 'resource' || n.type === 'product').length;

  return (
    <div>
      {/* Stats bar */}
      <div className="flex items-center gap-4 mb-3 text-xs text-realm-text-muted">
        <span>{profCount} professions</span>
        <span>{itemCount} items</span>
        <span>{graph.edges.length} connections</span>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {FILTER_DEFS.map(fd => {
          const active = filters[fd.key];
          return (
            <button
              key={fd.key}
              onClick={() => toggleFilter(fd.key)}
              className="px-3 py-1 rounded text-xs font-display border transition-all"
              style={{
                borderColor: active ? fd.color : 'rgba(168,154,128,0.15)',
                color: active ? fd.color : 'rgba(168,154,128,0.35)',
                backgroundColor: active ? `${fd.color}12` : 'transparent',
              }}
            >
              {fd.label}
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-realm-text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setSelectedNode(null); }}
              placeholder="Search items..."
              className="pl-8 pr-3 py-1 rounded bg-realm-bg-800 border border-realm-border text-xs text-realm-text-primary placeholder:text-realm-text-muted/40 w-44 focus:outline-none focus:border-realm-gold-500/50"
            />
          </div>
          <button
            onClick={reset}
            className="p-1.5 rounded border border-realm-border text-realm-text-muted hover:text-realm-text-secondary transition-colors"
            title="Reset"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main area: graph + detail panel */}
      <div className="flex gap-4">
        {/* SVG container */}
        <div
          className="flex-1 min-w-0 bg-realm-bg-800 border border-realm-border rounded-lg overflow-auto"
          style={{ maxHeight: 'calc(100vh - 300px)' }}
        >
          <svg width={SVG_W} height={svgH} className="select-none">
            {/* Column headers */}
            <text x={COL_X.gathering} y={HEADER_Y} textAnchor="middle" fill="#A89A80" fontSize={11} fontFamily="Cinzel, serif">
              Gathering
            </text>
            {filters.showItems && (
              <text x={COL_X.items} y={HEADER_Y} textAnchor="middle" fill="#A89A80" fontSize={11} fontFamily="Cinzel, serif">
                Resources &amp; Materials
              </text>
            )}
            <text x={COL_X.crafting} y={HEADER_Y} textAnchor="middle" fill="#A89A80" fontSize={11} fontFamily="Cinzel, serif">
              Crafting &amp; Processing
            </text>

            {/* Edges (behind nodes) */}
            <g>
              {layoutEdges.map((le, i) => {
                const active =
                  !highlightedIds ||
                  (highlightedIds.has(le.edge.source) && highlightedIds.has(le.edge.target));
                return (
                  <path
                    key={i}
                    d={le.path}
                    fill="none"
                    stroke={le.color}
                    strokeWidth={active ? 1.5 : 1}
                    opacity={active ? 0.6 : 0.06}
                    style={{ transition: 'opacity 0.2s' }}
                  />
                );
              })}
            </g>

            {/* Nodes */}
            <g>
              {layoutNodes.map(ln => {
                const style = NODE_STYLE[ln.node.type];
                const isItem = ln.node.type === 'resource' || ln.node.type === 'product';
                const active = !highlightedIds || highlightedIds.has(ln.id);
                const isSelected = selectedNode === ln.id;
                const rx = isItem ? 11 : 6;
                const fontSize = isItem ? 9.5 : 11;

                // Count connections for tooltip
                const conns = graph.edges.filter(e => e.source === ln.id || e.target === ln.id).length;

                return (
                  <g
                    key={ln.id}
                    transform={`translate(${ln.x},${ln.y})`}
                    onClick={() => handleNodeClick(ln.id)}
                    style={{
                      cursor: 'pointer',
                      opacity: active ? 1 : 0.15,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <rect
                      width={ln.w}
                      height={ln.h}
                      rx={rx}
                      fill={isSelected ? style.stroke + '30' : style.fill}
                      stroke={isSelected ? style.text : style.stroke}
                      strokeWidth={isSelected ? 2 : 1}
                    />
                    {/* Asset icon */}
                    {ln.node.assetBased && ln.node.type === 'gathering' && (
                      <text x={8} y={ln.h / 2 + 1} fontSize={10} dominantBaseline="central" fill={style.text}>
                        {ln.node.label === 'Farmer' ? '\uD83C\uDF3E' : ln.node.label === 'Rancher' ? '\uD83D\uDC04' : ''}
                      </text>
                    )}
                    <text
                      x={ln.w / 2}
                      y={ln.h / 2}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={style.text}
                      fontSize={fontSize}
                      fontFamily="Inter, sans-serif"
                    >
                      {ln.node.label.length > 18 ? ln.node.label.slice(0, 17) + '\u2026' : ln.node.label}
                    </text>
                    <title>{`${ln.node.label} (${ln.node.type}) \u2014 ${conns} connections`}</title>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Detail panel */}
        {detail && (
          <div
            className="w-72 shrink-0 bg-realm-bg-700 border border-realm-border rounded-lg p-4 overflow-y-auto self-start"
            style={{ maxHeight: 'calc(100vh - 300px)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-realm-text-primary text-sm truncate pr-2">
                {detail.node.label}
              </h3>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-realm-text-muted hover:text-realm-text-secondary shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <span
              className="inline-block px-2 py-0.5 rounded text-[10px] font-display uppercase mb-4"
              style={{
                color: NODE_STYLE[detail.node.type].text,
                backgroundColor: NODE_STYLE[detail.node.type].fill,
                borderWidth: 1,
                borderColor: NODE_STYLE[detail.node.type].stroke,
              }}
            >
              {detail.node.type}
            </span>

            {detail.produces.length > 0 && (
              <DetailSection
                title="PRODUCES"
                items={detail.produces}
                color="#10b981"
              />
            )}

            {detail.consumes.length > 0 && (
              <DetailSection
                title="CONSUMES"
                items={detail.consumes}
                color="#f59e0b"
              />
            )}

            {detail.dependsOn.length > 0 && (
              <div className="mt-4">
                <h4 className="text-[10px] font-display text-realm-text-muted mb-1.5">DEPENDS ON</h4>
                <div className="flex flex-wrap gap-1">
                  {detail.dependsOn.map(name => (
                    <span
                      key={name}
                      className="px-2 py-0.5 rounded text-[10px] bg-realm-bg-800 border border-realm-border text-realm-text-secondary"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {detail.suppliesTo.length > 0 && (
              <div className="mt-4">
                <h4 className="text-[10px] font-display text-realm-text-muted mb-1.5">SUPPLIES TO</h4>
                <div className="flex flex-wrap gap-1">
                  {detail.suppliesTo.map(name => (
                    <span
                      key={name}
                      className="px-2 py-0.5 rounded text-[10px] bg-realm-bg-800 border border-realm-border text-realm-text-secondary"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Detail section sub-component
// ============================================================

function DetailSection({
  title,
  items,
  color,
}: {
  title: string;
  items: { item: string; quantity?: number; recipe?: string }[];
  color: string;
}) {
  // Deduplicate items by name, summing quantities
  const deduped = new Map<string, number>();
  for (const it of items) {
    const prev = deduped.get(it.item) ?? 0;
    deduped.set(it.item, Math.max(prev, it.quantity ?? 0));
  }

  return (
    <div className="mt-4">
      <h4 className="text-[10px] font-display mb-1.5" style={{ color }}>{title}</h4>
      <div className="space-y-0.5">
        {[...deduped.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([name, qty]) => (
          <div key={name} className="text-xs text-realm-text-secondary flex items-center justify-between">
            <span className="truncate pr-2">{name}</span>
            {qty > 0 && <span className="text-realm-text-muted shrink-0">x{qty}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
