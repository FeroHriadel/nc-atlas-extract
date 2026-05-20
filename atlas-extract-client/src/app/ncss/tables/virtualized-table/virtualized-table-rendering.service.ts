import { Injectable, ElementRef } from '@angular/core';

export interface VirtualItem {
  index: number;
  start: number;
  size: number;
  key: number;
}

@Injectable()
export class VirtualizedTableRenderingService {
  // Virtualization state
  private estimatedRowHeight = 41;
  private overscanCount = 5;
  private scrollOffset = 0;
  private rowHeights: number[] = [];
  private measurementCache = new Map<number, number>();
  private forceUpdateCallback: (() => void) | null = null;

  // Drag scrolling state
  private isDraggingTable = false;
  private lastMousePosition = { x: 0, y: 0 };
  private mouseMoveListener: ((e: MouseEvent) => void) | null = null;
  private mouseUpListener: (() => void) | null = null;

  initialize(dataLength: number, onUpdate: () => void) {
    this.rowHeights = new Array(dataLength).fill(this.estimatedRowHeight);
    this.measurementCache.clear();
    this.scrollOffset = 0;
    this.forceUpdateCallback = onUpdate;
  }

  updateDataLength(dataLength: number) {
    if (this.rowHeights.length !== dataLength) {
      this.rowHeights = new Array(dataLength).fill(this.estimatedRowHeight);
      this.measurementCache.clear();
      if (this.forceUpdateCallback) {
        this.forceUpdateCallback();
      }
    }
  }

  resetMeasurements(zoomLevel: number) {
    const scaledEstimate = Math.max(20, Math.ceil(this.estimatedRowHeight * zoomLevel));
    this.rowHeights = new Array(this.rowHeights.length).fill(scaledEstimate);
    this.measurementCache.clear();
    setTimeout(() => {
      if (this.forceUpdateCallback) {
        this.forceUpdateCallback();
      }
    }, 250);
  }

  getTotalSize(): number {
    return this.rowHeights.reduce((sum, height) => sum + height, 0);
  }

  getRowOffset(index: number): number {
    return this.rowHeights.slice(0, index).reduce((sum, height) => sum + height, 0);
  }

  private findRowAtScrollPosition(scrollTop: number): number {
    let accumulatedHeight = 0;
    for (let i = 0; i < this.rowHeights.length; i++) {
      if (accumulatedHeight + this.rowHeights[i] > scrollTop) {
        return i;
      }
      accumulatedHeight += this.rowHeights[i];
    }
    return 0;
  }

  private calculateVisibleRows(containerHeight: number): { startWithOverscan: number; endWithOverscan: number } {
    const startIndex = this.findRowAtScrollPosition(this.scrollOffset);
    
    let endIndex = startIndex;
    let visibleHeight = 0;
    for (let i = startIndex; i < this.rowHeights.length; i++) {
      visibleHeight += this.rowHeights[i];
      endIndex = i;
      if (visibleHeight >= containerHeight + (this.overscanCount * this.estimatedRowHeight)) {
        break;
      }
    }
    
    const startWithOverscan = Math.max(0, startIndex - this.overscanCount);
    const endWithOverscan = Math.min(this.rowHeights.length - 1, endIndex + this.overscanCount);
    
    return { startWithOverscan, endWithOverscan };
  }

  getVirtualItems(containerHeight: number): VirtualItem[] {
    const { startWithOverscan, endWithOverscan } = this.calculateVisibleRows(containerHeight);
    const virtualItems: VirtualItem[] = [];
    
    for (let i = startWithOverscan; i <= endWithOverscan; i++) {
      virtualItems.push({
        index: i,
        start: this.getRowOffset(i),
        size: this.rowHeights[i],
        key: i,
      });
    }
    
    return virtualItems;
  }

  measureElement(element: HTMLElement | null, index: number): void {
    if (!element) return;
    
    const measuredHeight = element.getBoundingClientRect().height;
    
    if (measuredHeight > 0 && this.rowHeights[index] !== measuredHeight) {
      this.rowHeights[index] = measuredHeight;
      this.measurementCache.set(index, measuredHeight);
      if (this.forceUpdateCallback) {
        this.forceUpdateCallback();
      }
    }
  }

  setupDragScrolling(
    bodyRef: ElementRef<HTMLDivElement>,
    headerRef: ElementRef<HTMLDivElement>,
    zoomIn?: () => void,
    zoomOut?: () => void
  ) {
    return {
      handleBodyScroll: (e: Event) => this.handleBodyScroll(e, headerRef, bodyRef),
      handleHeaderScroll: (e: Event) => this.handleHeaderScroll(e, bodyRef),
      handleWheelEvent: (e: WheelEvent) => this.handleWheelEvent(e, zoomIn, zoomOut),
      handleTableMouseDown: (e: MouseEvent) => this.handleTableMouseDown(e, bodyRef, headerRef),
      handleTableMouseLeave: () => this.handleTableMouseLeave(),
      handleKeyDown: (e: KeyboardEvent) => this.handleKeyDown(e, bodyRef, zoomIn, zoomOut),
    };
  }


  private handleBodyScroll(e: Event, headerRef: ElementRef<HTMLDivElement>, bodyRef: ElementRef<HTMLDivElement>): void {
    const target = e.currentTarget as HTMLElement;
    
    // Update scroll offset for virtualization
    this.scrollOffset = target.scrollTop;
    if (this.forceUpdateCallback) {
      this.forceUpdateCallback();
    }
    
    // Sync header horizontal scroll
    if (headerRef?.nativeElement) {
      headerRef.nativeElement.scrollLeft = target.scrollLeft;
    }
  }

  private handleHeaderScroll(e: Event, bodyRef: ElementRef<HTMLDivElement>): void {
    const target = e.currentTarget as HTMLElement;
    if (bodyRef?.nativeElement) {
      bodyRef.nativeElement.scrollLeft = target.scrollLeft;
    }
  }

  private handleWheelEvent(e: WheelEvent, zoomIn?: () => void, zoomOut?: () => void): void {
    if (e.ctrlKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        if (zoomIn) zoomIn();
      } else {
        if (zoomOut) zoomOut();
      }
    }
  }

  private handleTableMouseDown(e: MouseEvent, bodyRef: ElementRef<HTMLDivElement>, headerRef: ElementRef<HTMLDivElement>): void {
    this.isDraggingTable = true;
    this.lastMousePosition = { x: e.clientX, y: e.clientY };
    e.preventDefault();

    // Setup mouse listeners
    this.mouseMoveListener = (moveEvent: MouseEvent) => {
      if (this.isDraggingTable && bodyRef.nativeElement) {
        const container = bodyRef.nativeElement;
        const deltaX = moveEvent.clientX - this.lastMousePosition.x;
        const deltaY = moveEvent.clientY - this.lastMousePosition.y;
        
        container.scrollLeft -= deltaX;
        container.scrollTop -= deltaY;
        
        // Explicitly sync header
        if (headerRef?.nativeElement) {
          headerRef.nativeElement.scrollLeft = container.scrollLeft;
        }
        
        this.lastMousePosition = { x: moveEvent.clientX, y: moveEvent.clientY };
      }
    };

    this.mouseUpListener = () => {
      this.isDraggingTable = false;
      this.cleanup();
    };

    document.addEventListener('mousemove', this.mouseMoveListener);
    document.addEventListener('mouseup', this.mouseUpListener);
  }

  private handleTableMouseLeave(): void {
    this.isDraggingTable = false;
  }

  private handleKeyDown(
    e: KeyboardEvent,
    bodyRef: ElementRef<HTMLDivElement>,
    zoomIn?: () => void,
    zoomOut?: () => void
  ): void {
    if (!bodyRef.nativeElement) return;

    const container = bodyRef.nativeElement;
    const containerHeight = container.clientHeight;
    const containerWidth = container.clientWidth;
    const scrollTop = container.scrollTop;
    const scrollLeft = container.scrollLeft;
    const scrollHeight = container.scrollHeight;
    const scrollWidth = container.scrollWidth;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        e.stopPropagation();
        container.scrollTop = scrollTop + this.estimatedRowHeight;
        break;
      case 'ArrowUp':
        e.preventDefault();
        e.stopPropagation();
        container.scrollTop = Math.max(0, scrollTop - this.estimatedRowHeight);
        break;
      case 'ArrowRight':
        e.preventDefault();
        e.stopPropagation();
        container.scrollLeft = Math.min(scrollWidth - containerWidth, scrollLeft + 100);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        e.stopPropagation();
        container.scrollLeft = Math.max(0, scrollLeft - 100);
        break;
      case 'PageDown':
        e.preventDefault();
        e.stopPropagation();
        container.scrollTop = Math.min(scrollHeight - containerHeight, scrollTop + containerHeight);
        break;
      case 'PageUp':
        e.preventDefault();
        e.stopPropagation();
        container.scrollTop = Math.max(0, scrollTop - containerHeight);
        break;
      case 'Home':
        e.preventDefault();
        e.stopPropagation();
        container.scrollTop = 0;
        break;
      case 'End':
        e.preventDefault();
        e.stopPropagation();
        container.scrollTop = scrollHeight - containerHeight;
        break;
      case '+':
      case '=':
        e.preventDefault();
        e.stopPropagation();
        if (zoomIn) zoomIn();
        break;
      case '-':
      case '_':
        e.preventDefault();
        e.stopPropagation();
        if (zoomOut) zoomOut();
        break;
    }
  }

  private cleanup(): void {
    if (this.mouseMoveListener) {
      document.removeEventListener('mousemove', this.mouseMoveListener);
      this.mouseMoveListener = null;
    }
    if (this.mouseUpListener) {
      document.removeEventListener('mouseup', this.mouseUpListener);
      this.mouseUpListener = null;
    }
  }

  ngOnDestroy(): void {
    this.cleanup();
  }
}
