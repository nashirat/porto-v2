export interface Position {
  x: number;
  y: number;
}

export interface PotteryItem {
  id: number;
  title: string;
  description: string;
  author: string;
  img: string;
}

export interface GridItem {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  potteryData: PotteryItem;
}
