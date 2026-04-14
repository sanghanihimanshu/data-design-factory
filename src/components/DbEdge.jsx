import { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow } from '@xyflow/react';
import { CONN_TYPES } from '../constants';
import { deleteEdge, setState } from '../store';

export const DbEdge = memo(({ id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, selected }) => {
  const ct = CONN_TYPES.find(c => c.id === data?.connType) || CONN_TYPES[1];
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const label = [data?.cardinality, data?.label].filter(Boolean).join(' · ');

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{ stroke: ct.c, strokeWidth: selected ? 2.5 : 1.5, strokeDasharray: data?.connType === 'ref' ? '6,3' : undefined }}
        markerEnd={`url(#arrow-${ct.id})`}
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%,-50%) translate(${labelX}px,${labelY}px)`,
              background: 'var(--node-bg)',
              border: `1px solid ${ct.c}`,
              borderRadius: 12,
              padding: '2px 8px',
              fontSize: 10,
              fontWeight: 600,
              color: ct.c,
              pointerEvents: 'all',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 4px rgba(0,0,0,.1)',
            }}
            onClick={() => setState({ selId: id })}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

// SVG arrow markers for all connection types
export function EdgeMarkers() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        {CONN_TYPES.map(ct => (
          <marker key={ct.id} id={`arrow-${ct.id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M1,2L8,5L1,8Z" fill={ct.c} />
          </marker>
        ))}
      </defs>
    </svg>
  );
}
