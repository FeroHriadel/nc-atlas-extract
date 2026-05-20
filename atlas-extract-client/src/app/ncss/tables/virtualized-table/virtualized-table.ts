import { Component, Input as NgInput, ViewChild, ElementRef, AfterViewInit, OnInit, OnDestroy, OnChanges, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { VirtualizedTableControlBar } from './virtualized-table-control-bar';
import { VirtualizedTableHeader } from './virtualized-table-header';
import { TableBody } from './virtualized-table-body';
import { VirtualizedTableFilterService, FilterRow, Column, FilterState } from './virtualized-table-filter.service';
import { VirtualizedTableZoomService } from './virtualized-table-zoom.service';
import { VirtualizedTableRenderingService } from './virtualized-table-rendering.service';
import { FilterPreset } from './virtualized-table-filter';



// Re-export types for external use
export type { FilterPreset } from './virtualized-table-filter';
export type { FilterRow, Column, FilterState } from './virtualized-table-filter.service';

export interface VirtualizedTableProps {
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
  selector: 'nc-virtualized-table',
  templateUrl: './virtualized-table.html',
  styleUrl: './virtualized-table.css',
  imports: [CommonModule, VirtualizedTableControlBar, VirtualizedTableHeader, TableBody],
  providers: [VirtualizedTableFilterService, VirtualizedTableZoomService, VirtualizedTableRenderingService],
  standalone: true
})
export class VirtualizedTable implements OnInit, AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('headerElement') headerElementRef!: VirtualizedTableHeader;
  @ViewChild('bodyElement') bodyElementRef!: TableBody;
  @ViewChild('wrapperElement') wrapperRef!: ElementRef<HTMLDivElement>;

  @NgInput() data: VirtualizedTableProps['data'] = [];
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
  updateCounter = signal(0);

  constructor(
    public filterService: VirtualizedTableFilterService,
    public zoomService: VirtualizedTableZoomService,
    public renderingService: VirtualizedTableRenderingService
  ) {
    // Watch for zoom level changes
    effect(() => {
      const currentZoom = this.zoomService.zoomLevel();
      if (this.previousZoom !== currentZoom) {
        // Reset measurements when zoom changes
        this.renderingService.resetMeasurements(currentZoom);
        
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

    // Watch for filtered data changes to update virtualization
    effect(() => {
      const filteredData = this.filterService.filteredData();
      // Defer the update to avoid change detection errors
      setTimeout(() => {
        this.renderingService.updateDataLength(filteredData.length);
      }, 0);
    });
  }

  ngOnInit(): void {
    // Determine columns
    this.columns = this.getColumns();

    // Initialize services
    this.zoomService.initialize(1, 0.5, 1.5, 0.1);
    this.filterService.initialize(this.data, this.columns);
    
    // Initialize rendering service with data length and update callback
    this.renderingService.initialize(
      this.filteredData.length,
      () => {
        this.updateCounter.update(val => val + 1);
      }
    );
  }

  ngAfterViewInit(): void {
    // Setup rendering handlers
    this.renderingHandlers = this.renderingService.setupDragScrolling(
      this.bodyElementRef.bodyRef,
      this.headerElementRef.headerRef,
      () => this.zoomService.handleZoomIn(),
      () => this.zoomService.handleZoomOut()
    );
  }

  ngOnDestroy(): void {
    this.renderingService.ngOnDestroy();
  }

  ngOnChanges(): void {
    if (this.data || this.columnsConfig) {
      this.columns = this.getColumns();
      // Defer service updates to avoid change detection errors
      setTimeout(() => {
        this.filterService.updateData(this.data);
        this.filterService.updateColumns(this.columns);
        
        // Update rendering service with new data length
        this.renderingService.updateDataLength(this.filteredData.length);
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
