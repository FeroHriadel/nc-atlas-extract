import { Component, Input as NgInput, Output, EventEmitter, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Button } from '../../buttons/button/button.component';
import { Select, SelectOption } from '../../inputs/select/select.component';
import { Pill } from '../../pills/pill/pill.component';
import { CloseButton } from '../../buttons/close-button/close-button.component';
import { FilterRow, Column } from './table-filter.service';
import './table-filter.css';

export interface FilterPreset {
  name: string;
  filters: Omit<FilterRow, 'id'>[];
}

@Component({
  selector: 'nc-table-filter',
  templateUrl: './table-filter.html',
  styleUrl: './table-filter.css',
  imports: [CommonModule, Button, Select, Pill, CloseButton],
  standalone: true
})
export class TableFilter implements OnChanges {
  @NgInput() columns: Column[] = [];
  @NgInput() closeModal!: () => void;
  @NgInput() filterConditions: FilterRow[] = [];
  @NgInput() setFilterConditions!: (conditions: FilterRow[]) => void;
  @NgInput() data: any[] = [];
  @NgInput() filterPresets?: FilterPreset[];

  @ViewChild('presetSelect') presetSelectRef?: Select;

  filterRows: FilterRow[] = [];

  columnsSelectOptions: SelectOption[] = [];
  conditionSelectOptions: SelectOption[] = [
    {value: 'equals', label: 'equals'},
    {value: 'not_equals', label: 'does not equal'},
    {value: 'contains', label: 'contains'},
    {value: 'not_contains', label: 'does not contain'},
    {value: 'greater_than', label: 'is greater than'},
    {value: 'less_than', label: 'is less than'},
    {value: 'starts_with', label: 'starts with'},
    {value: 'ends_with', label: 'ends with'},
    {value: 'is_between', label: 'is between'},
  ];
  operatorSelectOptions: SelectOption[] = [
    {value: 'and', label: 'AND'},
    {value: 'or', label: 'OR'},
  ];

  ngOnInit(): void {
    this.columnsSelectOptions = this.columns.map(col => ({
      value: col.column,
      label: col.displayValue
    }));

    if (this.filterConditions && this.filterConditions.length > 0) {
      this.filterRows = [...this.filterConditions];
    } else {
      this.filterRows = [{ id: Date.now(), column: null, condition: null, value: '', operator: null }];
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['columns']) {
      this.columnsSelectOptions = this.columns.map(col => ({
        value: col.column,
        label: col.displayValue
      }));
    }
    if (changes['filterConditions'] && !changes['filterConditions'].firstChange) {
      if (this.filterConditions && this.filterConditions.length > 0) {
        this.filterRows = [...this.filterConditions];
      } else {
        this.filterRows = [{ id: Date.now(), column: null, condition: null, value: '', operator: null }];
      }
    }
  }

  get presetOptions(): SelectOption[] {
    return this.filterPresets 
      ? this.filterPresets.map(preset => ({
          value: preset.name,
          label: preset.name
        }))
      : [];
  }

  get presetPlaceholder(): string {
    return this.filterPresets && this.filterPresets.length > 0
      ? 'Filter Presets'
      : 'No presets available';
  }

  get hasValidFilters(): boolean {
    return this.filterRows.some(row =>
      row.column !== null &&
      row.condition !== null &&
      row.value.trim() !== ''
    );
  }

  inferColumnType(columnName: string): 'number' | 'string' | 'boolean' | 'array' | 'object' | 'html' | 'unknown' {
    if (!this.data || this.data.length === 0) return 'unknown';
    
    const sampleValue = this.data.find(row => row[columnName] != null)?.[columnName];
    if (sampleValue === undefined || sampleValue === null) return 'unknown';
    
    if (typeof sampleValue === 'number') return 'number';
    if (typeof sampleValue === 'boolean') return 'boolean';
    if (Array.isArray(sampleValue)) return 'array';
    if (typeof sampleValue === 'object') return 'object';
    if (typeof sampleValue === 'string') return 'string';
    
    return 'unknown';
  }

  getConditionsForColumn(columnName: string | null): SelectOption[] {
    if (!columnName) return this.conditionSelectOptions;
    
    const columnType = this.inferColumnType(columnName);
    
    switch (columnType) {
      case 'number':
        return this.conditionSelectOptions.filter(opt =>
          ['equals', 'not_equals', 'greater_than', 'less_than', 'is_between'].includes(opt.value)
        );
      case 'string':
        return this.conditionSelectOptions.filter(opt =>
          ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with'].includes(opt.value)
        );
      case 'boolean':
        return this.conditionSelectOptions.filter(opt =>
          ['equals', 'not_equals'].includes(opt.value)
        );
      case 'html':
        return this.conditionSelectOptions.filter(opt =>
          ['contains', 'not_contains', 'starts_with', 'ends_with'].includes(opt.value)
        );
      case 'array':
      case 'object':
        return this.conditionSelectOptions.filter(opt =>
          ['contains', 'not_contains'].includes(opt.value)
        );
      default:
        return this.conditionSelectOptions;
    }
  }

  getPlaceholderForCondition(columnName: string | null, condition: string | null): string {
    if (!columnName || !condition) return 'Enter value';
    
    const columnType = this.inferColumnType(columnName);
    
    if (condition === 'is_between') {
      return columnType === 'number'
        ? 'Enter comma separated numbers: e.g., 20, 55'
        : 'Enter comma separated values: e.g., value1, value2';
    }
    
    switch (columnType) {
      case 'number':
        return 'Enter a number';
      case 'boolean':
        return 'Enter true or false';
      case 'array':
      case 'object':
      case 'html':
        return 'Enter text';
      default:
        return 'Enter value';
    }
  }

  validateFilterValue(columnName: string | null, condition: string | null, value: string): boolean {
    if (!columnName || !condition || !value.trim()) return true;
    
    const columnType = this.inferColumnType(columnName);
    
    if (['array', 'object', 'html'].includes(columnType)) return true;
    
    if (columnType === 'number') {
      if (condition === 'is_between') {
        const parts = value.split(',').map(v => v.trim());
        if (parts.length !== 2) {
          console.warn(`Column '${columnName}' is a number. For 'is between', please enter exactly two comma-separated numbers (e.g., "20, 55").`);
          return false;
        }
        if (parts.some(p => isNaN(parseFloat(p)))) {
          console.warn(`Column '${columnName}' is a number but '${value}' contains non-numeric values. Please enter valid numbers.`);
          return false;
        }
      } else {
        if (isNaN(parseFloat(value))) {
          console.warn(`Column '${columnName}' is a number but '${value}' is not a valid number. Please enter a number.`);
          return false;
        }
      }
    }
    
    if (columnType === 'boolean') {
      const lowerValue = value.toLowerCase();
      if (!['true', 'false', '1', '0'].includes(lowerValue)) {
        console.warn(`Column '${columnName}' is a boolean but '${value}' is not a valid boolean. Please enter 'true' or 'false'.`);
        return false;
      }
    }
    
    return true;
  }

  isRowValid(row: FilterRow): boolean {
    return row.column !== null &&
           row.condition !== null &&
           row.value.trim() !== '' &&
           row.operator !== null;
  }

  handleClearFilters(): void {
    this.filterRows = [{ id: Date.now(), column: null, condition: null, value: '', operator: null }];
    if (this.presetSelectRef) {
      this.presetSelectRef.clear();
    }
  }

  removeRow(id: number): void {
    if (this.filterRows.length === 1) {
      this.filterRows = [{ id: Date.now(), column: null, condition: null, value: '', operator: null }];
      return;
    }
    this.filterRows = this.filterRows.filter(row => row.id !== id);
  }

  updateRow(id: number, field: keyof FilterRow, value: string | null): void {
    const updatedRows = this.filterRows.map(row => {
      if (row.id !== id) return row;
      
      if (field === 'column' && value !== null) {
        return {
          ...row,
          column: value,
          condition: null,
          value: '',
          operator: null
        };
      }
      
      if (field === 'condition' && value !== null) {
        return {
          ...row,
          condition: value,
          value: '',
          operator: null
        };
      }
      
      if (field === 'value' && (!value || value.trim() === '')) {
        return {
          ...row,
          value: value || '',
          operator: null
        };
      }
      
      return { ...row, [field]: value };
    });
    
    if (field === 'operator' && value !== null) {
      const updatedRow = updatedRows.find(r => r.id === id);
      if (updatedRow && this.isRowValid(updatedRow)) {
        const newRow: FilterRow = {
          id: Date.now(),
          column: null,
          condition: null,
          value: '',
          operator: null
        };
        this.filterRows = [...updatedRows, newRow];
        return;
      }
    }
    
    this.filterRows = updatedRows;
  }

  handleInputChange(event: Event, rowId: number): void {
    const target = event.target as HTMLInputElement;
    if (target) {
      this.updateRow(rowId, 'value', target.value);
    }
  }

  handleApplyFilters(): void {
    const validRows = this.filterRows.filter(row =>
      row.column !== null && row.condition !== null && row.value.trim() !== ''
    );
    
    const allValid = validRows.every(row =>
      this.validateFilterValue(row.column, row.condition, row.value)
    );
    
    if (!allValid) {
      console.warn('Some filter values are invalid. Please check the warnings above.');
      return;
    }
    
    this.setFilterConditions(validRows);
    this.closeModal();
  }

  handlePresetChange(presetName: string | null): void {
    if (!presetName || !this.filterPresets) return;
    
    const preset = this.filterPresets.find(p => p.name === presetName);
    if (!preset) return;
    
    const newRows: FilterRow[] = preset.filters.map((filter, index) => ({
      ...filter,
      id: Date.now() + index,
      // Set operator to null for the last filter
      operator: index === preset.filters.length - 1 ? null : filter.operator
    }));
    
    this.filterRows = newRows;
  }

  // Wrapper methods for Select onChange callbacks
  updateRowCallback(id: number, field: keyof FilterRow, value: string | string[]): void {
    const stringValue = Array.isArray(value) ? value[0] : value;
    this.updateRow(id, field, stringValue);
  }

  handlePresetChangeCallback(value: string | string[]): void {
    const presetName = Array.isArray(value) ? value[0] : value;
    this.handlePresetChange(presetName);
  }
}
