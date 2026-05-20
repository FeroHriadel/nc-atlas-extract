import { Component, Input as NgInput, ElementRef, ViewChild, OnInit, OnDestroy, AfterViewInit, AfterViewChecked, OnChanges, TemplateRef, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Column } from './virtualized-table-filter.service';
import { VirtualizedTableRenderingService, VirtualItem } from './virtualized-table-rendering.service';


interface CopyNotification {
  x: number;
  y: number;
  text: string;
}

@Component({
  selector: 'nc-table-body',
  templateUrl: './virtualized-table-body.html',
  styleUrl: './virtualized-table-body.css',
  imports: [CommonModule, NgTemplateOutlet],
  standalone: true
})
export class TableBody implements OnInit, OnDestroy, AfterViewInit, AfterViewChecked, OnChanges {
  @ViewChild('bodyElement') bodyRef!: ElementRef<HTMLDivElement>;
  @ViewChild('tableElement') tableRef!: ElementRef<HTMLDivElement>;

  @NgInput() data: any[] = [];
  @NgInput() columns: Column[] = [];
  @NgInput() verticalSeparators: boolean = true;
  @NgInput() horizontalSeparators: boolean = true;
  @NgInput() zoomLevel: number = 1;
  @NgInput() getColumnStyle!: (col: Column) => { [key: string]: string };
  @NgInput() handleTableMouseDown!: (e: MouseEvent) => void;
  @NgInput() handleTableMouseLeave!: () => void;
  @NgInput() handleWheelEvent!: (e: WheelEvent) => void;
  @NgInput() handleBodyScroll!: (e: Event) => void;
  @NgInput() striped: boolean | { enabled: boolean; color?: string } = true;
  @NgInput() hover: boolean | { enabled: boolean; color?: string } = true;
  @NgInput() renderingService!: VirtualizedTableRenderingService;
  @NgInput() updateCounter: number = 0;

  tableScrollWidth = 0;
  hoveredRowIndex: number | null = null;
  copyNotification: CopyNotification | null = null;
  virtualItems = signal<VirtualItem[]>([]);
  totalSize = signal(0);

  private resizeObserver?: ResizeObserver;

  constructor(
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Defer to avoid change detection errors during initialization
    setTimeout(() => this.updateVirtualItems(), 0);
  }

  ngAfterViewInit(): void {
    this.measureTable();
    // Defer to avoid change detection errors
    setTimeout(() => this.updateVirtualItems(), 0);
    
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => {
        this.measureTable();
        // Defer to avoid change detection errors
        setTimeout(() => this.updateVirtualItems(), 0);
      });
      if (this.tableRef?.nativeElement) {
        this.resizeObserver.observe(this.tableRef.nativeElement);
      }
      if (this.bodyRef?.nativeElement) {
        this.resizeObserver.observe(this.bodyRef.nativeElement);
      }
    }
  }

  ngAfterViewChecked(): void {
    this.attachEventHandlers();
    this.measureVisibleRows();
  }

  ngOnChanges(changes: any): void {
    if (changes.data || changes.updateCounter) {
      // Defer to next change detection cycle
      setTimeout(() => this.updateVirtualItems(), 0);
    }
  }

  private updateVirtualItems(): void {
    if (!this.renderingService || !this.bodyRef?.nativeElement) {
      this.virtualItems.set([]);
      this.totalSize.set(0);
      return;
    }

    const containerHeight = this.bodyRef.nativeElement.clientHeight || 500;
    this.virtualItems.set(this.renderingService.getVirtualItems(containerHeight));
    this.totalSize.set(this.renderingService.getTotalSize());
    // Removed cdr.detectChanges() as it's no longer needed
  }

  private measureVisibleRows(): void {
    if (!this.renderingService || !this.tableRef?.nativeElement) return;

    const container = this.tableRef.nativeElement.querySelector('.virtualized-table-virtual-container');
    if (!container) return;

    const rows = container.querySelectorAll('[data-index]');
    rows.forEach((row: Element) => {
      const htmlRow = row as HTMLElement;
      const index = parseInt(htmlRow.getAttribute('data-index') || '-1', 10);
      if (index >= 0) {
        this.renderingService.measureElement(htmlRow as any, index);
      }
    });
  }

  trackRow(index: number, item: VirtualItem): number {
    return item.key;
  }

  private attachEventHandlers(): void {
    if (!this.tableRef?.nativeElement) return;

    const buttons = this.tableRef.nativeElement.querySelectorAll('button[data-onclick]');
    buttons.forEach((button: Element) => {
      const htmlButton = button as HTMLButtonElement;
      const onclickAttr = htmlButton.getAttribute('data-onclick');
      
      if (onclickAttr && !htmlButton.hasAttribute('data-handler-attached')) {
        htmlButton.setAttribute('data-handler-attached', 'true');
        
        htmlButton.addEventListener('click', (e) => {
          e.stopPropagation();
          try {
            // Execute the onclick code
            const func = new Function(onclickAttr);
            func.call(htmlButton);
          } catch (error) {
            console.error('Error executing button click handler:', error);
          }
        });
      }
    });
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  getRowBackgroundClass(rowIndex: number): string {
    if (!this.striped) return 'virtualized-table-row-bg virtualized-table-row-bg-white';
    const stripedEnabled = typeof this.striped === 'boolean' ? this.striped : this.striped.enabled;
    if (!stripedEnabled) return 'virtualized-table-row-bg virtualized-table-row-bg-white';
    return rowIndex % 2 === 1 ? 'virtualized-table-row-bg virtualized-table-row-bg-striped' : 'virtualized-table-row-bg virtualized-table-row-bg-white';
  }

  isHoverEnabled(): boolean {
    if (!this.hover) return false;
    const hoverEnabled = typeof this.hover === 'boolean' ? this.hover : this.hover.enabled;
    return hoverEnabled;
  }

  getRowClass(rowIndex: number): string {
    const classes = ['virtualized-table-body-row', this.getRowBackgroundClass(rowIndex)];
    if (this.isHoverEnabled() && this.hoveredRowIndex === rowIndex) {
      classes.push('virtualized-table-row-hovered');
    }
    return classes.join(' ');
  }

  renderCellValue(cellValue: unknown): string {
    if (typeof cellValue !== 'string') return JSON.stringify(cellValue);
    return String(cellValue);
  }

  isHtmlContent(cellValue: unknown): boolean {
    if (typeof cellValue !== 'string') return false;
    const htmlPattern = /<[a-z][\s\S]*>/i;
    return htmlPattern.test(cellValue);
  }

  sanitizeHtml(cellValue: unknown): SafeHtml {
    if (typeof cellValue === 'string') {
      return this.sanitizer.bypassSecurityTrustHtml(cellValue);
    }
    return '';
  }

  getColumnTemplate(col: Column): TemplateRef<any> | undefined {
    return col.template;
  }

  extractTextFromCell(cellValue: unknown): string {
    if (typeof cellValue === 'string') return cellValue;
    if (typeof cellValue === 'number') return String(cellValue);
    if (typeof cellValue === 'boolean') return String(cellValue);
    if (cellValue === null) return 'null';
    if (cellValue === undefined) return 'undefined';
    if (Array.isArray(cellValue)) return cellValue.join(', ');
    return JSON.stringify(cellValue);
  }

  getCellStyle(col: Column, isLastColumn: boolean): { [key: string]: string } {
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
    
    // Horizontal separators are now applied to the row container instead of cells
    // This ensures they extend the full width of the table
    
    if (this.verticalSeparators && !isLastColumn) {
      style['borderRight'] = '1px solid var(--nc-border-color)';
    }
    return style;
  }

  handleCellDoubleClick(event: MouseEvent, cellValue: unknown): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.tagName === 'INPUT') {
      return;
    }

    const textContent = this.extractTextFromCell(cellValue);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(textContent)
        .then(() => {
          this.copyNotification = {
            x: event.clientX,
            y: event.clientY,
            text: 'Copied!'
          };
          setTimeout(() => {
            this.copyNotification = null;
          }, 1000);
        })
        .catch((err) => {
          console.error('Failed to copy to clipboard:', err);
        });
    }
  }

  handleCellClick(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault();
    const target = event.target as HTMLElement;
    console.log('Cell clicked, target:', target.tagName, target);
    if (target.tagName === 'BUTTON') {
      console.log('Button clicked!');
      const onclickCode = target.getAttribute('data-onclick');
      console.log('data-onclick attribute:', onclickCode);
      if (onclickCode) {
        try {
          console.log('Executing code:', onclickCode);
          const func = new Function(onclickCode);
          func.call(target);
        } catch (error) {
          console.error('Error executing button click:', error);
        }
      } else {
        console.log('No data-onclick attribute found on button');
      }
    }
  }

  onBodyScroll(e: Event): void {
    if (this.handleBodyScroll) {
      this.handleBodyScroll(e);
    }
    this.measureTable();
    this.updateVirtualItems();
  }

  onMouseDown(e: MouseEvent): void {
    if (this.handleTableMouseDown) {
      this.handleTableMouseDown(e);
    }
  }

  onMouseLeave(): void {
    if (this.handleTableMouseLeave) {
      this.handleTableMouseLeave();
    }
  }

  onWheel(e: WheelEvent): void {
    if (this.handleWheelEvent) {
      this.handleWheelEvent(e);
    }
  }

  onRowMouseEnter(index: number): void {
    this.hoveredRowIndex = index;
  }

  onRowMouseLeave(): void {
    this.hoveredRowIndex = null;
  }

  private measureTable(): void {
    if (this.tableRef?.nativeElement) {
      this.tableScrollWidth = this.tableRef.nativeElement.scrollWidth;
    }
  }
}
