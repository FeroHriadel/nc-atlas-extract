import { Component, Input as NgInput, Output, EventEmitter, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SquareButton } from '../../buttons/square-button/square-button.component';
import { Select, SelectOption } from '../../inputs/select/select.component';
import { Modal } from '../../popups/modal/modal.component';
import { Button } from '../../buttons/button/button.component';
import { Pill } from '../../pills/pill/pill.component';
import { FilterIcon, ZoominIcon, ZoomoutIcon } from '../../icons';
import { VirtualizedTableFilter, FilterPreset } from './virtualized-table-filter';
import { FilterRow, FilterState, Column } from './virtualized-table-filter.service';



@Component({
  selector: 'nc-table-control-bar',
  templateUrl: './virtualized-table-control-bar.html',
  styleUrl: './virtualized-table-control-bar.css',
  imports: [CommonModule, SquareButton, Select, Modal, Pill, VirtualizedTableFilter, FilterIcon, ZoominIcon, ZoomoutIcon],
  standalone: true
})
export class VirtualizedTableControlBar {
  @NgInput() zoomLevel: number = 1;
  @NgInput() minZoom: number = 0.5;
  @NgInput() maxZoom: number = 1.5;
  @NgInput() handleZoomIn!: () => void;
  @NgInput() handleZoomOut!: () => void;
  @NgInput() columns: Column[] = [];
  @NgInput() setColumnsFilter!: (selectedColumns: string[]) => void;
  @NgInput() filterState!: FilterState;
  @NgInput() setFilterConditions!: (conditions: FilterRow[]) => void;
  @NgInput() data: any[] = [];
  @NgInput() resetFilters!: () => void;
  @NgInput() resultCount: number = 0;
  @NgInput() filterPresets?: FilterPreset[];
  @NgInput() controlBarClassName?: string;
  @NgInput() controlBarStyle?: { [key: string]: string };
  @NgInput() isSorting: boolean = false;

  @ViewChild(Modal) filterModal?: Modal;

  modalOpen = false;

  get columnOptions(): SelectOption[] {
    return this.columns.map(col => ({ value: col.column, label: col.displayValue }));
  }

  get preselectedOptions(): string[] {
    return this.columns.map(col => col.column);
  }

  get zoomInDisabled(): boolean {
    return this.zoomLevel >= this.maxZoom;
  }

  get zoomOutDisabled(): boolean {
    return this.zoomLevel <= this.minZoom;
  }

  get zoomPercentage(): string {
    return Math.round(this.zoomLevel * 100) + '%';
  }

  // Inline SVG icons
  get zoomInIcon(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <path d="m21 21-4.35-4.35"></path>
      <line x1="11" y1="8" x2="11" y2="14"></line>
      <line x1="8" y1="11" x2="14" y2="11"></line>
    </svg>`;
  }

  get zoomOutIcon(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <path d="m21 21-4.35-4.35"></path>
      <line x1="8" y1="11" x2="14" y2="11"></line>
    </svg>`;
  }

  get viewColumnIcon(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="3" y="3" width="7" height="18"></rect>
      <rect x="14" y="3" width="7" height="18"></rect>
    </svg>`;
  }

  get filterIcon(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
    </svg>`;
  }

  get refreshIcon(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
    </svg>`;
  }

  handleColumnsChange(selectedColumns: string | string[]): void {
    const columns = Array.isArray(selectedColumns) ? selectedColumns : [selectedColumns];
    this.setColumnsFilter(columns);
  }

  closeModal(): void {
    this.filterModal?.closeModal();
    this.modalOpen = false;
  }

  openModal(): void {
    this.filterModal?.openModal();
    this.modalOpen = true;
  }

  getConditionLabel(condition: string | null): string {
    const conditionMap: Record<string, string> = {
      'equals': 'equals',
      'not_equals': 'does not equal',
      'contains': 'contains',
      'not_contains': 'does not contain',
      'greater_than': 'is greater than',
      'less_than': 'is less than',
      'starts_with': 'starts with',
      'ends_with': 'ends with',
      'is_between': 'is between',
    };
    return condition ? conditionMap[condition] || condition : '';
  }

  getColumnDisplayName(columnKey: string | null): string {
    if (!columnKey) return '';
    const column = this.columns.find(col => col.column === columnKey);
    return column ? column.displayValue : columnKey;
  }

  formatFilterCondition(filter: FilterRow): string {
    const columnName = this.getColumnDisplayName(filter.column);
    const conditionLabel = this.getConditionLabel(filter.condition);
    return `${columnName} ${conditionLabel} ${filter.value}`;
  }

  removeFilterCondition(filterId: number): void {
    const updatedConditions = this.filterState.conditions.filter(condition => condition.id !== filterId);
    this.setFilterConditions(updatedConditions);
  }
}
