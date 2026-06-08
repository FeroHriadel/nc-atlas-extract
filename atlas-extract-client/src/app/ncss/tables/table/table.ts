import { Component, Input as NgInput, ViewChild, ElementRef, AfterViewInit, OnInit, OnDestroy, OnChanges, ChangeDetectorRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableControlBar } from './table-control-bar';
import { TableHeader } from './table-header';
import { TableBody } from './table-body';
import { TableFilterService, FilterRow, Column, FilterState } from './table-filter.service';
import { TableZoomService } from './table-zoom.service';
import { FilterPreset } from './table-filter';



// Re-export types for external use
export type { FilterPreset } from './table-filter';
export type { FilterRow, Column, FilterState } from './table-filter.service';

export interface TableProps {
  data: { [key: string]: string | number | boolean | null | undefined | [] | object | any }[];
  columnsConfig?: Column[];
  horizontalSeparators?: boolean;
  verticalSeparators?: boolean;
  striped?: { enabled: boolean; color?: string } | boolean;
  hover?: { enabled: boolean; color?: string } | boolean;
  controls?: boolean;
  filterPresets?: FilterPreset[];
  class?: string;
  style?: { [key: string]: string };
  id?: string;
  controlBarClassName?: string;
  controlBarStyle?: { [key: string]: string };
  headerClassName?: string;
  headerStyle?: { [key: string]: string };
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

@Component({
  selector: 'nc-table',
  templateUrl: './table.html',
  styleUrl: './table.css',
  imports: [CommonModule, TableControlBar, TableHeader, TableBody],
  providers: [TableFilterService, TableZoomService],
  standalone: true
})
export class Table implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('headerElement') headerElementRef!: TableHeader;
  @ViewChild('bodyElement') bodyElementRef!: TableBody;
  @ViewChild('wrapperElement') wrapperRef!: ElementRef<HTMLDivElement>;

  @NgInput() data: TableProps['data'] = [];
  @NgInput() columnsConfig?: Column[];
  @NgInput() horizontalSeparators: boolean = true;
  @NgInput() verticalSeparators: boolean = true;
  @NgInput() striped: boolean | { enabled: boolean; color?: string } = true;
  @NgInput() hover: boolean | { enabled: boolean; color?: string } = true;
  @NgInput() controls: boolean = true;
  @NgInput() filterPresets?: FilterPreset[];
  @NgInput() style?: { [key: string]: string };
  @NgInput('class') class?: string;
  @NgInput() id: string = 'ncss-table';
  @NgInput() ariaLabel?: string;
  @NgInput() ariaDescribedBy?: string;
  @NgInput() controlBarClassName?: string;
  @NgInput() controlBarStyle?: { [key: string]: string };
  @NgInput() headerClassName?: string;
  @NgInput() headerStyle?: { [key: string]: string };

  columns: Column[] = [];
  renderingHandlers: any = {};
  previousZoom: number = 1;
  prevFilteredColumnsLength: number = 0;

  constructor(
    public filterService: TableFilterService,
    public zoomService: TableZoomService,
    private cdr: ChangeDetectorRef
  ) {
    // Watch for zoom level changes
    effect(() => {
      const currentZoom = this.zoomService.zoomLevel();
      if (this.previousZoom !== currentZoom) {
        if (this.bodyElementRef?.bodyRef) {
          const scrollTop = this.bodyElementRef.bodyRef.nativeElement.scrollTop;
          const scrollLeft = this.bodyElementRef.bodyRef.nativeElement.scrollLeft;

          setTimeout(() => {
            if (this.bodyElementRef?.bodyRef) {
              this.bodyElementRef.bodyRef.nativeElement.scrollTop = scrollTop;
              this.bodyElementRef.bodyRef.nativeElement.scrollLeft = scrollLeft;
            }
          }, 300);
        }

        this.previousZoom = currentZoom;
      }
    });

    // Watch for filtered columns changes
    effect(() => {
      const filteredCols = this.filterService.filteredColumns();
      if (this.prevFilteredColumnsLength !== filteredCols.length) {
        if (this.headerElementRef?.headerRef) {
          this.headerElementRef.headerRef.nativeElement.scrollLeft = 0;
        }
        if (this.bodyElementRef?.bodyRef) {
          this.bodyElementRef.bodyRef.nativeElement.scrollLeft = 0;
          this.bodyElementRef.bodyRef.nativeElement.scrollTop = 0;
        }
        this.prevFilteredColumnsLength = filteredCols.length;
      }
    });
  }

  ngOnInit(): void {
    // Determine columns
    this.columns = this.getColumns();

    // Initialize services
    this.zoomService.initialize(1, 0.5, 1.5, 0.1);
    this.filterService.initialize(this.data, this.columns);
  }

  ngAfterViewInit(): void {
    // Setup rendering handlers for drag scrolling
    this.renderingHandlers = this.setupDragScrolling(
      this.bodyElementRef.bodyRef,
      this.headerElementRef.headerRef
    );
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    // Cleanup
    if (this.renderingHandlers.cleanup) {
      this.renderingHandlers.cleanup();
    }
  }

  ngOnChanges(): void {
    if (this.data || this.columnsConfig) {
      this.columns = this.getColumns();
      // Defer filter service updates to avoid change detection errors
      setTimeout(() => {
        this.filterService.updateData(this.data);
        this.filterService.updateColumns(this.columns);
      }, 0);
    }
  }

  private getColumns(): Column[] {
    if (this.columnsConfig && this.columnsConfig.length > 0) {
      return this.columnsConfig;
    }
    if (this.data.length > 0) {
      return Object.keys(this.data[0]).map(key => ({ column: key, displayValue: key }));
    }
    return [];
  }

  getColumnStyle(columnObj: Column): { [key: string]: string } {
    if (columnObj.width) {
      return { 
        width: columnObj.width,
        minWidth: columnObj.width,
        maxWidth: columnObj.width
      };
    }
    return {};
  }

  private setupDragScrolling(
    bodyRef: ElementRef<HTMLDivElement>,
    headerRef: ElementRef<HTMLDivElement>
  ) {
    let isDragging = false;
    let lastMousePosition = { x: 0, y: 0 };
    let mouseMoveListener: ((e: MouseEvent) => void) | null = null;
    let mouseUpListener: (() => void) | null = null;

    const handleBodyScroll = (e: Event) => {
      const target = e.currentTarget as HTMLElement;
      if (headerRef?.nativeElement) {
        headerRef.nativeElement.scrollLeft = target.scrollLeft;
      }
    };

    const handleHeaderScroll = (e: Event) => {
      const target = e.currentTarget as HTMLElement;
      if (bodyRef?.nativeElement) {
        bodyRef.nativeElement.scrollLeft = target.scrollLeft;
      }
    };

    const handleWheelEvent = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          this.zoomService.handleZoomIn();
        } else {
          this.zoomService.handleZoomOut();
        }
      }
    };

    const handleTableMouseDown = (e: MouseEvent) => {
      isDragging = true;
      lastMousePosition = { x: e.clientX, y: e.clientY };
      e.preventDefault();

      mouseMoveListener = (moveEvent: MouseEvent) => {
        if (isDragging && bodyRef.nativeElement) {
          const container = bodyRef.nativeElement;
          const deltaX = moveEvent.clientX - lastMousePosition.x;
          const deltaY = moveEvent.clientY - lastMousePosition.y;
          
          container.scrollLeft -= deltaX;
          container.scrollTop -= deltaY;
          
          if (headerRef?.nativeElement) {
            headerRef.nativeElement.scrollLeft = container.scrollLeft;
          }
          
          lastMousePosition = { x: moveEvent.clientX, y: moveEvent.clientY };
        }
      };

      mouseUpListener = () => {
        isDragging = false;
        cleanup();
      };

      document.addEventListener('mousemove', mouseMoveListener);
      document.addEventListener('mouseup', mouseUpListener);
    };

    const handleTableMouseLeave = () => {
      // Optional: could stop dragging on leave
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          this.zoomService.handleZoomIn();
        } else if (e.key === '-' || e.key === '_') {
          e.preventDefault();
          this.zoomService.handleZoomOut();
        }
      }
    };

    const cleanup = () => {
      if (mouseMoveListener) {
        document.removeEventListener('mousemove', mouseMoveListener);
      }
      if (mouseUpListener) {
        document.removeEventListener('mouseup', mouseUpListener);
      }
    };

    return {
      handleBodyScroll,
      handleHeaderScroll,
      handleWheelEvent,
      handleTableMouseDown,
      handleTableMouseLeave,
      handleKeyDown,
      cleanup
    };
  }

  handleKeyDown(e: KeyboardEvent): void {
    if (this.renderingHandlers.handleKeyDown) {
      this.renderingHandlers.handleKeyDown(e);
    }
  }

  focusWrapper(): void {
    this.wrapperRef?.nativeElement?.focus();
  }

  get wrapperStyle(): { [key: string]: string } {
    return {
      willChange: 'contents',
      ...this.style
    };
  }

  get resultCount(): number {
    return this.filterService.filteredData().length;
  }

  get filteredData(): any[] {
    return this.filterService.filteredData();
  }

  get filteredColumns(): Column[] {
    return this.filterService.filteredColumns();
  }

  get filterState(): FilterState {
    return this.filterService.filterState();
  }

  get isSorting(): boolean {
    return this.filterService.isSorting();
  }

  get zoomLevel(): number {
    return this.zoomService.zoomLevel();
  }

  get minZoom(): number {
    return this.zoomService.minZoom();
  }

  get maxZoom(): number {
    return this.zoomService.maxZoom();
  }
}
