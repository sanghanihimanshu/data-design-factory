import { NODE_WIDTH } from './constants';
import { snapshot, schedSave, setState } from './store';

function commitNodes(rf, nextNodes) {
  snapshot();
  rf.setNodes(nextNodes);
  setState({ rfNodes: nextNodes });
  schedSave();
}

function updateNodePositions(rf, mutateFn) {
  const all = rf.getNodes();
  const selected = all.filter((n) => n.selected);
  const working = selected.length >= 2 ? selected : all;
  if (working.length < 2) return false;

  const byId = new Map(working.map((n) => [n.id, n]));
  const mutated = mutateFn(working.map((n) => ({ ...n, position: { ...n.position } })));
  mutated.forEach((n) => byId.set(n.id, n));

  const next = all.map((n) => {
    const m = byId.get(n.id);
    return m ? { ...n, position: m.position } : n;
  });

  commitNodes(rf, next);
  return true;
}

export function alignNodes(rf, axis) {
  return updateNodePositions(rf, (nodes) => {
    if (axis === 'left') {
      const minX = Math.min(...nodes.map((n) => n.position.x));
      return nodes.map((n) => ({ ...n, position: { ...n.position, x: minX } }));
    }
    if (axis === 'center') {
      const center = nodes.reduce((sum, n) => sum + n.position.x + NODE_WIDTH / 2, 0) / nodes.length;
      return nodes.map((n) => ({ ...n, position: { ...n.position, x: Math.round(center - NODE_WIDTH / 2) } }));
    }
    if (axis === 'right') {
      const right = Math.max(...nodes.map((n) => n.position.x + NODE_WIDTH));
      return nodes.map((n) => ({ ...n, position: { ...n.position, x: right - NODE_WIDTH } }));
    }
    if (axis === 'top') {
      const minY = Math.min(...nodes.map((n) => n.position.y));
      return nodes.map((n) => ({ ...n, position: { ...n.position, y: minY } }));
    }
    if (axis === 'middle') {
      const middle = nodes.reduce((sum, n) => sum + n.position.y, 0) / nodes.length;
      return nodes.map((n) => ({ ...n, position: { ...n.position, y: Math.round(middle) } }));
    }
    const maxY = Math.max(...nodes.map((n) => n.position.y));
    return nodes.map((n) => ({ ...n, position: { ...n.position, y: maxY } }));
  });
}

export function distributeNodes(rf, axis) {
  return updateNodePositions(rf, (nodes) => {
    const sorted = [...nodes].sort((a, b) => (axis === 'x' ? a.position.x - b.position.x : a.position.y - b.position.y));
    if (sorted.length < 3) return nodes;

    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const start = axis === 'x' ? first.position.x : first.position.y;
    const end = axis === 'x' ? last.position.x : last.position.y;
    const step = (end - start) / (sorted.length - 1);

    return sorted.map((n, i) => ({
      ...n,
      position: {
        ...n.position,
        [axis === 'x' ? 'x' : 'y']: Math.round(start + step * i),
      },
    }));
  });
}

function fallbackGrid(nodes) {
  const sorted = [...nodes].sort((a, b) => (a.position.y - b.position.y) || (a.position.x - b.position.x));
  const minX = Math.min(...sorted.map((n) => n.position.x));
  const minY = Math.min(...sorted.map((n) => n.position.y));
  const cols = Math.max(2, Math.ceil(Math.sqrt(sorted.length)));
  const gapX = NODE_WIDTH + 64;
  const gapY = 220;

  return sorted.map((n, i) => ({
    ...n,
    position: {
      x: Math.round(minX + (i % cols) * gapX),
      y: Math.round(minY + Math.floor(i / cols) * gapY),
    },
  }));
}

export function autoLayoutByDepth(rf) {
  return updateNodePositions(rf, (nodes) => {
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = rf.getEdges().filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
    if (!edges.length) return fallbackGrid(nodes);

    const byId = new Map(nodes.map((n) => [n.id, n]));
    const outgoing = new Map(nodes.map((n) => [n.id, []]));
    const incoming = new Map(nodes.map((n) => [n.id, []]));
    const neighbors = new Map(nodes.map((n) => [n.id, new Set()]));

    edges.forEach((e) => {
      outgoing.get(e.source)?.push(e.target);
      incoming.get(e.target)?.push(e.source);
      neighbors.get(e.source)?.add(e.target);
      neighbors.get(e.target)?.add(e.source);
    });

    const visited = new Set();
    const components = [];
    for (const id of nodeIds) {
      if (visited.has(id)) continue;
      const queue = [id];
      const comp = [];
      visited.add(id);
      while (queue.length) {
        const cur = queue.shift();
        comp.push(cur);
        neighbors.get(cur)?.forEach((nxt) => {
          if (!visited.has(nxt)) {
            visited.add(nxt);
            queue.push(nxt);
          }
        });
      }
      components.push(comp);
    }

    let cursorX = Math.min(...nodes.map((n) => n.position.x));
    const startY = Math.min(...nodes.map((n) => n.position.y));
    const laidOut = [];

    components.forEach((compIds) => {
      const indeg = new Map(compIds.map((id) => [id, incoming.get(id)?.filter((s) => compIds.includes(s)).length || 0]));
      const depth = new Map();
      const queue = [];

      const roots = compIds
        .filter((id) => indeg.get(id) === 0)
        .sort((a, b) => (byId.get(a)?.position.y || 0) - (byId.get(b)?.position.y || 0));

      const seed = roots.length ? roots : [compIds[0]];
      seed.forEach((id) => {
        depth.set(id, 0);
        queue.push(id);
      });

      while (queue.length) {
        const cur = queue.shift();
        const d = depth.get(cur) || 0;
        const nextNodes = outgoing.get(cur) || [];
        nextNodes.forEach((nxt) => {
          if (!compIds.includes(nxt)) return;
          const nextDepth = d + 1;
          if (!depth.has(nxt) || (depth.get(nxt) || 0) < nextDepth) {
            depth.set(nxt, nextDepth);
            queue.push(nxt);
          }
        });
      }

      compIds.forEach((id) => {
        if (!depth.has(id)) {
          const maxDepth = Math.max(0, ...depth.values());
          depth.set(id, maxDepth + 1);
        }
      });

      const buckets = new Map();
      compIds.forEach((id) => {
        const d = depth.get(id) || 0;
        if (!buckets.has(d)) buckets.set(d, []);
        buckets.get(d).push(id);
      });

      [...buckets.values()].forEach((arr) => {
        arr.sort((a, b) => (byId.get(a)?.position.y || 0) - (byId.get(b)?.position.y || 0));
      });

      const depthLevels = [...buckets.keys()].sort((a, b) => a - b);
      const xGap = NODE_WIDTH + 110;
      const yGap = 210;
      const maxRows = Math.max(...depthLevels.map((d) => buckets.get(d).length));

      depthLevels.forEach((d) => {
        const idsAtDepth = buckets.get(d);
        idsAtDepth.forEach((id, row) => {
          const node = byId.get(id);
          laidOut.push({
            ...node,
            position: {
              x: Math.round(cursorX + d * xGap),
              y: Math.round(startY + row * yGap),
            },
          });
        });
      });

      const compWidth = (Math.max(...depthLevels) + 1) * xGap;
      const compHeight = Math.max(1, maxRows) * yGap;
      cursorX += Math.max(compWidth + 120, NODE_WIDTH + 120 + Math.floor(compHeight * 0.15));
    });

    return laidOut;
  });
}
