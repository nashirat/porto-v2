import { createContext, useContext } from 'react';

interface DragContextType {
  gridStopped: boolean;
  isDragging: boolean;
  clickedItemId: string | null;
  setClickedItemId: (id: string | null) => void;
}

export const DragContext = createContext<DragContextType>({
  gridStopped: false,
  isDragging: false,
  clickedItemId: null,
  setClickedItemId: () => {}
});

export const useDragContext = () => useContext(DragContext);
