declare module 'react-window' {
  import { Component, CSSProperties, ReactNode } from 'react';

  export interface ListProps {
    className?: string;
    height: number | string;
    initialScrollOffset?: number;
    innerRef?: any;
    innerElementType?: React.ElementType;
    itemCount: number;
    itemData?: any;
    itemKey?: (index: number, data: any) => any;
    itemSize: number;
    onItemsRendered?: (props: {
      overscanStartIndex: number;
      overscanStopIndex: number;
      visibleStartIndex: number;
      visibleStopIndex: number;
    }) => void;
    onScroll?: (props: {
      scrollDirection: 'forward' | 'backward';
      scrollOffset: number;
      scrollUpdateWasRequested: boolean;
    }) => void;
    overscanCount?: number;
    style?: CSSProperties;
    useIsScrolling?: boolean;
    width: number | string;
    children: (props: {
      index: number;
      style: CSSProperties;
      data: any;
      isScrolling?: boolean;
    }) => ReactNode;
  }

  export interface FixedSizeListProps extends ListProps {}
  export class FixedSizeList extends Component<FixedSizeListProps> {}

  export interface VariableSizeListProps extends ListProps {
    estimatedItemSize?: number;
  }
  export class VariableSizeList extends Component<VariableSizeListProps> {}

  export interface GridProps {
    className?: string;
    columnCount: number;
    columnWidth: number | ((index: number) => number);
    height: number | string;
    initialScrollLeft?: number;
    initialScrollTop?: number;
    innerRef?: any;
    innerElementType?: React.ElementType;
    itemCount: number;
    itemData?: any;
    itemKey?: (params: { columnIndex: number; rowIndex: number; data: any }) => any;
    onItemsRendered?: (props: {
      overscanColumnStartIndex: number;
      overscanColumnStopIndex: number;
      overscanRowStartIndex: number;
      overscanRowStopIndex: number;
      visibleColumnStartIndex: number;
      visibleColumnStopIndex: number;
      visibleRowStartIndex: number;
      visibleRowStopIndex: number;
    }) => void;
    onScroll?: (props: {
      horizontalScrollDirection: 'forward' | 'backward';
      scrollLeft: number;
      scrollTop: number;
      scrollUpdateWasRequested: boolean;
      verticalScrollDirection: 'forward' | 'backward';
    }) => void;
    overscanColumnCount?: number;
    overscanRowCount?: number;
    rowCount: number;
    rowHeight: number | ((index: number) => number);
    style?: CSSProperties;
    useIsScrolling?: boolean;
    width: number | string;
    children: (props: {
      columnIndex: number;
      rowIndex: number;
      style: CSSProperties;
      data: any;
      isScrolling?: boolean;
    }) => ReactNode;
  }

  export interface FixedSizeGridProps extends GridProps {
    columnWidth: number;
    rowHeight: number;
  }
  export class FixedSizeGrid extends Component<FixedSizeGridProps> {}

  export interface VariableSizeGridProps extends GridProps {
    estimatedColumnWidth?: number;
    estimatedRowHeight?: number;
  }
  export class VariableSizeGrid extends Component<VariableSizeGridProps> {}
}
