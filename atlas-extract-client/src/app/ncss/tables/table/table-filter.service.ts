import { Injectable, signal, computed, TemplateRef } from '@angular/core';

export interface FilterRow {
  id: number;
  column: string | null;
  condition: string | null;
  value: string;
  operator: 'and' | 'or' | null;
}

export interface FilterState {
  columnsFilter: string[];
  columnOrder: string[];
  conditions: FilterRow[];
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc' | null;
}

export interface Column {
  column: string;
  displayValue: string;
  width?: string;
  template?: TemplateRef<any>;
}

type ColumnType = 'number' | 'string' | 'boolean' | 'array' | 'object' | 'html' | 'date' | 'unknown';

@Injectable()
export class TableFilterService {
  private filterStateSignal = signal<FilterState>({
    columnsFilter: [],
    columnOrder: [],
    conditions: [],
    sortColumn: null,
    sortDirection: null,
  });

  private isSortingSignal = signal<boolean>(false);
  private dataSignal = signal<any[]>([]);
  private columnsSignal = signal<Column[]>([]);

  filterState = this.filterStateSignal.asReadonly();
  isSorting = this.isSortingSignal.asReadonly();

  // Computed values
  filteredData = computed(() => {
    const data = this.dataSignal();
    const state = this.filterStateSignal();
    
    let result = data
      .filter(row => this.evaluateAllConditions(row, state.conditions))
      .map(row => {
        const filteredRow: any = {};
        state.columnsFilter.forEach(columnKey => {
          if (columnKey in row) {
            filteredRow[columnKey] = row[columnKey];
          }
        });
        return filteredRow;
      });

    // Apply sorting
    if (state.sortColumn && state.sortDirection) {
      result = [...result].sort((a, b) => {
        const valueA = a[state.sortColumn!];
        const valueB = b[state.sortColumn!];
        const comparison = this.sortComparator(valueA, valueB);
        return state.sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  });

  filteredColumns = computed(() => {
    const columns = this.columnsSignal();
    const state = this.filterStateSignal();
    
    const orderedColumns = state.columnOrder
      .map(colKey => columns.find(col => col.column === colKey))
      .filter((col): col is Column => col !== undefined);
    
    return orderedColumns.filter(col => state.columnsFilter.includes(col.column));
  });

  initialize(data: any[], columns: Column[]): void {
    this.dataSignal.set(data);
    this.columnsSignal.set(columns);
    this.filterStateSignal.set({
      columnsFilter: columns.map(col => col.column),
      columnOrder: columns.map(col => col.column),
      conditions: [],
      sortColumn: null,
      sortDirection: null,
    });
  }

  updateData(data: any[]): void {
    const currentData = this.dataSignal();
    // Only set sorting state if data reference actually changed
    if (currentData !== data) {
      // Defer the signal updates to avoid change detection errors
      setTimeout(() => {
        this.dataSignal.set(data);
        this.isSortingSignal.set(true);
        setTimeout(() => this.isSortingSignal.set(false), 100);
      }, 0);
    }
  }

  updateColumns(columns: Column[]): void {
    const currentColumns = this.columnsSignal();
    const newColumnKeys = columns.map(col => col.column);
    const currentColumnKeys = currentColumns.map(col => col.column);
    
    // Check if columns actually changed
    const columnsChanged = 
      newColumnKeys.length !== currentColumnKeys.length ||
      newColumnKeys.some((key, idx) => key !== currentColumnKeys[idx]);
    
    this.columnsSignal.set(columns);
    
    if (columnsChanged) {
      // Only update columnsFilter if columns actually changed
      this.filterStateSignal.update(prev => {
        // Preserve existing columnsFilter, only add new columns and remove deleted ones
        const updatedColumnsFilter = prev.columnsFilter
          .filter(col => newColumnKeys.includes(col))  // Remove deleted columns
          .concat(newColumnKeys.filter(col => !prev.columnsFilter.includes(col)));  // Add new columns
        
        return {
          ...prev,
          columnsFilter: updatedColumnsFilter,
          columnOrder: newColumnKeys,
        };
      });
    } else {
      // Columns didn't change, only update columnOrder if needed
      this.filterStateSignal.update(prev => ({
        ...prev,
        columnOrder: newColumnKeys,
      }));
    }
  }

  setColumnsFilter(selectedColumns: string[]): void {
    this.filterStateSignal.update(prev => ({...prev, columnsFilter: selectedColumns}));
  }

  setColumnOrder(newOrder: string[]): void {
    this.filterStateSignal.update(prev => ({...prev, columnOrder: newOrder}));
  }

  setFilterConditions(conditions: FilterRow[]): void {
    this.filterStateSignal.update(prev => ({...prev, conditions}));
    this.isSortingSignal.set(true);
    setTimeout(() => this.isSortingSignal.set(false), 100);
  }

  setSortColumn(column: string): void {
    this.filterStateSignal.update(prev => {
      if (prev.sortColumn === column) {
        if (prev.sortDirection === 'asc') {
          return { ...prev, sortDirection: 'desc' };
        } else if (prev.sortDirection === 'desc') {
          return { ...prev, sortColumn: null, sortDirection: null };
        }
      }
      return { ...prev, sortColumn: column, sortDirection: 'asc' };
    });
    this.isSortingSignal.set(true);
    setTimeout(() => this.isSortingSignal.set(false), 100);
  }

  resetFilters(): void {
    const columns = this.columnsSignal();
    this.filterStateSignal.set({
      columnsFilter: columns.map(col => col.column),
      columnOrder: columns.map(col => col.column),
      conditions: [],
      sortColumn: null,
      sortDirection: null,
    });
  }

  // Helper methods
  private isISODateString(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value) && !isNaN(Date.parse(value));
  }

  private parseToDate(value: unknown): Date | null {
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    if (typeof value === 'string') { const d = new Date(value); return isNaN(d.getTime()) ? null : d; }
    return null;
  }

  private parseDateInput(input: string): Date | null {
    const parts = input.trim().split('/');
    if (parts.length !== 3) return null;
    const [year, month, day] = parts.map(p => parseInt(p, 10));
    if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
    const d = new Date(year, month - 1, day);
    return isNaN(d.getTime()) ? null : d;
  }

  private normalizeValue(value: unknown): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') return value;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return String(value);
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  private evaluateCondition(row: any, condition: FilterRow): boolean {
    if (!condition.column || !condition.condition || !condition.value) return true;
    
    const cellValue = row[condition.column];
    const normalizedCellValue = this.normalizeValue(cellValue).toLowerCase();
    const normalizedFilterValue = condition.value.toLowerCase();

    switch (condition.condition) {
      case 'equals':
        return normalizedCellValue === normalizedFilterValue;
      case 'not_equals':
        return normalizedCellValue !== normalizedFilterValue;
      case 'contains':
        return normalizedCellValue.includes(normalizedFilterValue);
      case 'not_contains':
        return !normalizedCellValue.includes(normalizedFilterValue);
      case 'starts_with':
        return normalizedCellValue.startsWith(normalizedFilterValue);
      case 'ends_with':
        return normalizedCellValue.endsWith(normalizedFilterValue);
      case 'greater_than': {
        const cellNum = parseFloat(normalizedCellValue);
        const filterNum = parseFloat(normalizedFilterValue);
        if (isNaN(cellNum) || isNaN(filterNum)) return false;
        return cellNum > filterNum;
      }
      case 'less_than': {
        const cellNum = parseFloat(normalizedCellValue);
        const filterNum = parseFloat(normalizedFilterValue);
        if (isNaN(cellNum) || isNaN(filterNum)) return false;
        return cellNum < filterNum;
      }
      case 'is_between': {
        const [min, max] = normalizedFilterValue.split(',').map(v => parseFloat(v.trim()));
        const cellNum = parseFloat(normalizedCellValue);
        if (isNaN(cellNum) || isNaN(min) || isNaN(max)) return false;
        return cellNum >= min && cellNum <= max;
      }
      case 'date_on':
      case 'date_after':
      case 'date_before': {
        const cellDate = this.parseToDate(cellValue);
        if (!cellDate) return false;
        const filterDate = this.parseDateInput(condition.value);
        if (!filterDate) return false;
        const cellDay = new Date(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate()).getTime();
        const filterDay = filterDate.getTime();
        if (condition.condition === 'date_on') return cellDay === filterDay;
        if (condition.condition === 'date_after') return cellDay > filterDay;
        return cellDay < filterDay;
      }
      default:
        return true;
    }
  }

  private evaluateAllConditions(row: any, conditions: FilterRow[]): boolean {
    if (conditions.length === 0) return true;
    
    let result = true;
    let currentOperator: 'and' | 'or' | null = null;

    for (const condition of conditions) {
      if (!condition.column || !condition.condition || !condition.value.trim()) {
        continue;
      }

      const conditionResult = this.evaluateCondition(row, condition);

      if (currentOperator === null) {
        result = conditionResult;
      } else if (currentOperator === 'and') {
        result = result && conditionResult;
      } else if (currentOperator === 'or') {
        result = result || conditionResult;
      }

      currentOperator = condition.operator as 'and' | 'or' | null;
    }

    return result;
  }

  private getValueType(value: unknown): 'number' | 'string' | 'null' | 'boolean' | 'array' | 'object' | 'date' {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (value instanceof Date) return 'date';
    if (typeof value === 'string' && this.isISODateString(value)) return 'date';
    if (typeof value === 'string') return 'string';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'object';
    return 'string';
  }

  private sortComparator(a: unknown, b: unknown): number {
    const typeA = this.getValueType(a);
    const typeB = this.getValueType(b);

    if (typeA === 'null' && typeB === 'null') return 0;
    if (typeA === 'null') return 1;
    if (typeB === 'null') return -1;

    if (typeA !== typeB) {
      return this.normalizeValue(a).localeCompare(this.normalizeValue(b));
    }

    switch (typeA) {
      case 'number':
        return (a as number) - (b as number);
      case 'boolean':
        return a === b ? 0 : a ? 1 : -1;
      case 'date': {
        const dateA = this.parseToDate(a);
        const dateB = this.parseToDate(b);
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA.getTime() - dateB.getTime();
      }
      case 'string':
        return (a as string).localeCompare(b as string);
      case 'array':
      case 'object': {
        const strA = JSON.stringify(a);
        const strB = JSON.stringify(b);
        return strA.localeCompare(strB);
      }
      default:
        return this.normalizeValue(a).localeCompare(this.normalizeValue(b));
    }
  }

  // Type inference helpers for filter component
  inferColumnType(columnName: string): ColumnType {
    const data = this.dataSignal();
    if (!data || data.length === 0) return 'unknown';

    const sampleValue = data.find(row => row[columnName] != null)?.[columnName];
    if (sampleValue === undefined || sampleValue === null) return 'unknown';

    if (typeof sampleValue === 'number') return 'number';
    if (typeof sampleValue === 'boolean') return 'boolean';
    if (sampleValue instanceof Date) return 'date';
    if (Array.isArray(sampleValue)) return 'array';
    if (typeof sampleValue === 'object') return 'object';
    if (typeof sampleValue === 'string' && this.isISODateString(sampleValue)) return 'date';
    if (typeof sampleValue === 'string') return 'string';

    return 'unknown';
  }
}
