import { Component, Input as NgInput, ElementRef, ViewChild, OnInit, OnDestroy, AfterViewInit, TemplateRef } from '@angular/core';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Column } from './table-filter.service';


interface CopyNotification {
  x: number;
  y: number;
  text: string;
}

@Component({
  selector: 'nc-table-body',
  templateUrl: './table-body.html',
  styleUrl: './table-body.css',
  imports: [CommonModule, NgTemplateOutlet],
  standalone: true
})
export class TableBody implements OnInit, OnDestroy, AfterViewInit {
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

  tableScrollWidth = 0;
  hoveredRowIndex: number | null = null;
  copyNotification: CopyNotification | null = null;

  constructor(
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    // No initialization needed for non-virtualized table
  }

  ngAfterViewInit(): void {
    this.measureTable();
    this.attachEventHandlers();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
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

  getRowBackgroundClass(rowIndex: number): string {
    if (!this.striped) return 'table-row-bg table-row-bg-white';
    const stripedEnabled = typeof this.striped === 'boolean' ? this.striped : this.striped.enabled;
    if (!stripedEnabled) return 'table-row-bg table-row-bg-white';
    return rowIndex % 2 === 1 ? 'table-row-bg table-row-bg-striped' : 'table-row-bg table-row-bg-white';
  }

  isHoverEnabled(): boolean {
    if (!this.hover) return false;
    const hoverEnabled = typeof this.hover === 'boolean' ? this.hover : this.hover.enabled;
    return hoverEnabled;
  }

  getRowClass(rowIndex: number): string {
    const classes = ['table-body-row', this.getRowBackgroundClass(rowIndex)];
    if (this.isHoverEnabled() && this.hoveredRowIndex === rowIndex) {
      classes.push('table-row-hovered');
    }
    return classes.join(' ');
  }

  private isDateLike(value: unknown): boolean {
    if (value instanceof Date) return true;
    if (typeof value === 'string') return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value) && !isNaN(Date.parse(value));
    return false;
  }

  private formatDateValue(value: unknown): string {
    const d = value instanceof Date ? value : new Date(value as string);
    if (isNaN(d.getTime())) return String(value);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const day = d.getDate().toString().padStart(2, '0');
    const hrs = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${d.getFullYear()} ${months[d.getMonth()]} ${day} ${hrs}:${mins}`;
  }

  renderCellValue(cellValue: unknown): string {
    if (this.isDateLike(cellValue)) return this.formatDateValue(cellValue);
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
    if (this.isDateLike(cellValue)) return this.formatDateValue(cellValue);
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
    if (target.tagName === 'BUTTON') {
      const onclickCode = target.getAttribute('data-onclick');
      if (onclickCode) {
        try {
          const func = new Function(onclickCode);
          func.call(target);
        } catch (error) {
          console.error('Error executing button click:', error);
        }
      }
    }
  }

  onBodyScroll(e: Event): void {
    if (this.handleBodyScroll) {
      this.handleBodyScroll(e);
    }
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
