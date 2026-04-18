import { useRef } from 'react';

// Returns drag props for a reorderable list item.
// onReorder(fromIndex, toIndex) is called on drop.
export function useDragReorder(onReorder) {
  const drag = useRef(null);

  const getProps = (index) => ({
    draggable: true,
    onDragStart: (e) => {
      drag.current = index;
      e.dataTransfer.effectAllowed = 'move';
    },
    onDragOver: (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    },
    onDrop: (e) => {
      e.preventDefault();
      if (drag.current !== null && drag.current !== index) {
        onReorder(drag.current, index);
      }
      drag.current = null;
    },
    onDragEnd: () => { drag.current = null; },
    style: { cursor: 'grab' },
  });

  return getProps;
}
