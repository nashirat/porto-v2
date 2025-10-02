import { createContext, useContext } from 'react';

interface DragContextType {
  hasDragStopped: boolean;
  isDragging: boolean;
}

export const DragContext = createContext<DragContextType>({
  hasDragStopped: false,
  isDragging: false
});

export const useDragContext = () => useContext(DragContext);
