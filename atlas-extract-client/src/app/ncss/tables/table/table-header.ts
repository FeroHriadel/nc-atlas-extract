import { Component, Input as NgInput, ElementRef, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Column } from './table-filter.service';



interface GhostElement {
  x: number;
  y: number;
  text: string;
  width: string;
  padding: string;
}

@Component({
  selector: 'nc-table-header',
  templateUrl: './table-header.html',
  styleUrl: './table-header.css',
  imports: [CommonModule],
  standalone: true
})
export class TableHeader implements OnInit, OnDestroy {
  @ViewChild('headerElement') headerRef!: ElementRef<HTMLDivElement>;

  @NgInput() visibleColumns: Column[] = [];
  @NgInput() getColumnStyle!: (col: Column) => { [key: string]: string };
  @NgInput() zoomLevel: number = 1;
  @NgInput() verticalSeparators: boolean = true;
  @NgInput() handleHeaderScroll!: (e: Event) => void;
  @NgInput() setColumnOrder!: (newOrder: string[]) => void;
  @NgInput() sortColumn: string | null = null;
  @NgInput() sortDirection: 'asc' | 'desc' | null = null;
  @NgInput() setSortColumn!: (column: string) => void;
  @NgInput() headerClassName?: string;
  @NgInput() headerStyle?: { [key: string]: string };

  draggedColumn: string | null = null;
  dragOverColumn: string | null = null;
  ghostElement: GhostElement | null = null;
  private mouseMoveListener: ((e: MouseEvent) => void) | null = null;
  private mouseUpListener: (() => void) | null = null;
  private ghostDiv: HTMLDivElement | null = null;

  ngOnInit(): void {
    // Create ghost element container
    this.ghostDiv = document.createElement('div');
    this.ghostDiv.style.position = 'fixed';
    this.ghostDiv.style.top = '0';
    this.ghostDiv.style.left = '0';
    this.ghostDiv.style.width = '100%';
    this.ghostDiv.style.height = '100%';
    this.ghostDiv.style.pointerEvents = 'none';
    this.ghostDiv.style.zIndex = '9999';
    document.body.appendChild(this.ghostDiv);
  }

  ngOnDestroy(): void {
    this.cleanup();
    if (this.ghostDiv) {
      document.body.removeChild(this.ghostDiv);
    }
  }

  getSortIconClass(col: Column): string {
    const baseClass = 'header-sort-icon';
    if (this.sortColumn === col.column && this.sortDirection === 'desc') {
      return `${baseClass} header-sort-desc`;
    }
    return baseClass;
  }

  getSortIconOpacity(col: Column): number {
    return this.sortColumn === col.column ? 1 : 0.6;
  }

  getAriaSort(col: Column): 'ascending' | 'descending' | 'none' {
    if (this.sortColumn === col.column) {
      return this.sortDirection === 'asc' ? 'ascending' : 'descending';
    }
    return 'none';
  }

  isVerticalSeparator(col: Column): boolean {
    return this.verticalSeparators && col.column !== this.visibleColumns[this.visibleColumns.length - 1]?.column;
  }

  getThClass(col: Column): string {
    const classes = ['table-header-th'];
    if (this.draggedColumn === col.column) classes.push('table-header-dragged');
    if (this.dragOverColumn === col.column) classes.push('table-header-drag-over');
    if (this.isVerticalSeparator(col)) classes.push('table-header-vertical-separator');
    return classes.join(' ');
  }

  getThStyle(col: Column): { [key: string]: string } {
    const style = { ...this.getColumnStyle(col) };
    
    // For flexbox, we need to use flex-basis and prevent shrinking
    if (col.width) {
      style['flexBasis'] = col.width;
      style['flexGrow'] = '0';
      style['flexShrink'] = '0';
    } else {
      style['flexGrow'] = '1';
      style['flexShrink'] = '1';
      style['flexBasis'] = '0';
    }
    
    return style;
  }

  onHeaderScroll(e: Event): void {
    if (this.handleHeaderScroll) {
      this.handleHeaderScroll(e);
    }
  }

  handleMouseDown(e: MouseEvent, column: string, displayValue: string, col: Column): void {
    e.preventDefault();
    this.draggedColumn = column;
    const columnStyle = this.getColumnStyle(col);
    const width = columnStyle['width'] as string || 'auto';
    const padding = `${this.zoomLevel * 0.5}rem ${this.zoomLevel * 1}rem`;

    this.ghostElement = {
      x: e.clientX,
      y: e.clientY,
      text: displayValue,
      width: width,
      padding: padding,
    };

    this.updateGhostElement();

    this.mouseMoveListener = (moveEvent: MouseEvent) => {
      if (this.ghostElement) {
        this.ghostElement = {
          ...this.ghostElement,
          x: moveEvent.clientX,
          y: moveEvent.clientY,
        };
        this.updateGhostElement();
      }
    };

    this.mouseUpListener = () => {
      if (this.draggedColumn && this.dragOverColumn && this.draggedColumn !== this.dragOverColumn) {
        const currentOrder = this.visibleColumns.map(c => c.column);
        const draggedIndex = currentOrder.indexOf(this.draggedColumn);
        const dragOverIndex = currentOrder.indexOf(this.dragOverColumn);

        const newOrder = [...currentOrder];
        newOrder.splice(draggedIndex, 1);
        newOrder.splice(dragOverIndex, 0, this.draggedColumn);

        this.setColumnOrder(newOrder);
      }

      this.draggedColumn = null;
      this.dragOverColumn = null;
      this.ghostElement = null;
      this.updateGhostElement();
      this.cleanup();
    };

    document.addEventListener('mousemove', this.mouseMoveListener);
    document.addEventListener('mouseup', this.mouseUpListener);
  }

  handleMouseEnter(column: string): void {
    if (this.draggedColumn) {
      this.dragOverColumn = column;
    }
  }

  handleMouseLeave(): void {
    this.dragOverColumn = null;
  }

  handleSortClick(e: MouseEvent, column: string): void {
    e.stopPropagation();
    this.setSortColumn(column);
  }

  handleSortKeyDown(e: KeyboardEvent, column: string): void {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.setSortColumn(column);
    }
  }

  private updateGhostElement(): void {
    if (!this.ghostDiv) return;

    if (this.ghostElement) {
      this.ghostDiv.innerHTML = `
        <div class="table-header-ghost" style="
          position: fixed;
          left: ${this.ghostElement.x}px;
          top: ${this.ghostElement.y}px;
          width: ${this.ghostElement.width};
          padding: ${this.ghostElement.padding};
          transform: translate(10px, 10px);
          pointer-events: none;
          z-index: 9999;
          background-color: var(--nc-input-bg);
          border: 1px solid var(--nc-border-color);
          border-radius: 0.25rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          font-weight: 600;
          color: var(--nc-text-color-strong);
          cursor: grabbing;
          opacity: 0.9;
        ">
          ${this.ghostElement.text}
        </div>
      `;
    } else {
      this.ghostDiv.innerHTML = '';
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
}
