import { ChangeDetectorRef, Component, ElementRef, HostListener, Input, OnInit, ViewChild } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { ChevronDownIcon, CheckIcon, TimesIcon } from '../../icons';



export interface SelectOption {
  value: string;
  label: string;
}




@Component({
  selector: 'nc-select',
  standalone: true,
  imports: [ChevronDownIcon, CheckIcon, TimesIcon, JsonPipe],
  templateUrl: './select.component.html',
  styleUrl: './select.component.css',
})



export class Select implements OnInit {
  @ViewChild('customTriggerWrap') customTriggerWrap?: ElementRef;
  @ViewChild('defaultTrigger') defaultTrigger?: ElementRef;
  @ViewChild('optionsContainer') optionsContainer?: ElementRef;
  @Input() customTrigger?: boolean = false;
  @Input() placeholder?: string = '';
  @Input() options?: SelectOption[] = [];
  @Input() width?: string = '';
  @Input() optionsWidth?: string = '';
  @Input() multiple?: boolean = false;
  @Input() disabled?: boolean = false;
  @Input() defaultValue?: string | string[] = '';
  @Input() onChange?: (value: string | string[]) => void = () => {};
  @Input() class?: string = '';
  @Input() style?: { [key: string]: string } = {};
  @Input() inputClass?: string = '';
  @Input() inputStyle?: { [key: string]: string } = {};
  @Input() optionsStyle?: { [key: string]: string } = {};
  @Input() name?: string = '';
  @Input() id?: string = '';
  @Input() ariaLabel?: string = this.name || 'Select an option';
  @Input() searchable?: boolean = false;
  @Input() label?: string = '';
  @Input() forceDirection?: 'up' | 'down';



  public value: string | string[] = '';
  public triggerText: string = '';
  public isOpen: boolean = false;
  public direction: 'up' | 'down' = 'down';
  public xAlignment: 'left' | 'right' = 'left';
  public searchTerm: string = '';
  public shownOptions: SelectOption[] | undefined = [];
  public highlightedIndex: number = -1;



  constructor(private elementRef: ElementRef, private cdr: ChangeDetectorRef) {}



  // close dropdown on outside click
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    if (!clickedInside && this.isOpen) this.closeDropdown();
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent) {
    if (this.handleEscapeKey(event)) return;
    if (this.handleTriggerToggle(event)) return;
    if (this.isOpen && this.shownOptions && this.shownOptions.length > 0) {
      this.handleArrowDownNavigation(event);
      this.handleArrowUpNavigation(event);
      this.handleHighlightedOptionSelection(event);
    }
  }

  @HostListener('nc-clear')
  onClear() {
    this.clear();
  }

  @HostListener('nc-set-value', ['$event'])
  onSetValue(event: Event) {
    const customEvent = event as CustomEvent;
    if (customEvent.detail && 'value' in customEvent.detail) {
      this.setValue(customEvent.detail.value);
    }
  }

  private handleEscapeKey(event: KeyboardEvent): boolean {
    if (event.key === 'Escape' && this.isOpen) {
      this.closeDropdown();
      return true;
    }
    return false;
  }

  private handleTriggerToggle(event: KeyboardEvent): boolean {
    const triggerElement = this.customTriggerWrap?.nativeElement || this.defaultTrigger?.nativeElement;
    if ((event.key === 'Enter' || event.key === ' ') && document.activeElement === triggerElement && !this.isOpen) {
      event.preventDefault(); // prevent scrolling when space is pressed
      this.toggleDropdown();
      return true;
    }
    return false;
  }

  private handleArrowDownNavigation(event: KeyboardEvent): void {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.highlightedIndex = (this.highlightedIndex + 1) % this.shownOptions!.length;
      this.scrollToHighlightedOption();
    }
  }

  private handleArrowUpNavigation(event: KeyboardEvent): void {
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightedIndex = this.highlightedIndex <= 0 
        ? this.shownOptions!.length - 1 
        : this.highlightedIndex - 1;
      this.scrollToHighlightedOption();
    }
  }

  private scrollToHighlightedOption(): void {
    if (!this.optionsContainer || this.highlightedIndex < 0) return;
    
    const container = this.optionsContainer.nativeElement;
    const options = container.querySelectorAll('.nc-select-option');
    const highlightedOption = options[this.highlightedIndex] as HTMLElement;
    
    if (highlightedOption) {
      highlightedOption.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  private handleHighlightedOptionSelection(event: KeyboardEvent): void {
    if ((event.key === 'Enter' || event.key === ' ') && this.highlightedIndex >= 0) {
      event.preventDefault();
      const highlightedOption = this.shownOptions![this.highlightedIndex];
      if (highlightedOption) {
        this.handleOptionClick(highlightedOption);
      }
    }
  }



  // populate default value on init & ensure multiple value is always an array
  ngOnInit(): void {
    this.populateDefaultValue();
    this.checkMultipleValue();
    this.populateShownOptions();
  }



  checkMultipleValue() {
    if (this.multiple && !Array.isArray(this.value)) {
      this.value = [];
    }
  }

  populateShownOptions() {
    this.shownOptions = this.options;
  }

  populateDefaultValue() {
    if (this.multiple && Array.isArray(this.defaultValue)) {
      this.value = this.defaultValue;
    } else if (!this.multiple && typeof this.defaultValue === 'string') {
      this.value = this.defaultValue;
    }
  }

  onSearchTermChange(term: string) {
    this.searchTerm = term;
    this.filterShownOptions();
  }

  canShowClearSearch() {
    return this.searchable && this.searchTerm.length > 0;
  }

  clearSearchTerm() {
    this.searchTerm = '';
    this.filterShownOptions();
  }

  filterShownOptions() {
    if (!this.options) return;
    if (!this.searchTerm) {
      this.shownOptions = this.options;
      this.highlightedIndex = -1;
      return;
    }
    const term = this.searchTerm.toLowerCase();
    this.shownOptions = this.options.filter(opt => opt.label.toLowerCase().includes(term));
    this.highlightedIndex = -1;
  }

  toggleDropdown() {
    if (this.disabled) return;
    if (!this.isOpen) {
      this.getOptionsDirection();
      this.xAlignment = 'left';
      this.highlightedIndex = -1;
    }
    this.isOpen = !this.isOpen;
    this.clearSearchTerm();
    if (this.isOpen) {
      this.cdr.detectChanges();
      this.fixHorizontalOverflow();
    }
  }

  closeDropdown() {
    this.isOpen = false;
    this.highlightedIndex = -1;
    this.clearSearchTerm();
  }

  isHighlighted(index: number): boolean {
    return this.highlightedIndex === index;
  }

  handleOptionClick(option: SelectOption) {
    if (this.disabled) return;
    // for multiselect toggle selected option & keep dropdown open
    if (this.multiple) {
      const index = (this.value as string[]).indexOf(option.value);
      if (index > -1) (this.value as string[]).splice(index, 1)
      else (this.value as string[]).push(option.value);
    // for single select set value & close dropdown
    } else {
      this.value = option.value;
      this.toggleDropdown();
    }
    this.onChange?.(this.value);
  }

  isSelected(option: SelectOption): boolean {
    if (this.multiple) {
      return (this.value as string[]).includes(option.value);
    } else {
      return this.value === option.value;
    }
  }

  getTriggerText() {
    if (this.multiple && this.value.length) {
      return `${this.value.length} selected`;
    } else if (!this.multiple && this.value) {
      const selectedOption = this.options?.find(opt => opt.value === this.value);
      return selectedOption ? selectedOption.label : '';
    } else {
      return '';
    }
  }

  getOptionsDirection(): void {
    // If forceDirection is set, use it instead of calculating
    if (this.forceDirection) {
      this.direction = this.forceDirection;
      return;
    }
    
    const triggerElement = this.customTriggerWrap?.nativeElement || this.defaultTrigger?.nativeElement;
    if (!triggerElement) throw new Error('Trigger element not found, cannot open select options');
    const triggerRect = triggerElement.getBoundingClientRect();
    const margin = 8; // ensure dropdown doesn't touch the edge of the viewport
    const optionsCount = this.options?.length || 0;
    const optionHeight = 40; // from CSS => 2.5rem
    const maxOptionsShown = 6; // maxHeight from CSS => calc(6 * 2.5rem)
    const optionsHeight = Math.min(optionsCount, maxOptionsShown) * optionHeight;
    const hasSpaceBelow = triggerRect.bottom + optionsHeight + margin < window.innerHeight;
    const hasSpaceAbove = triggerRect.top - optionsHeight - margin > 0;
    this.direction = hasSpaceBelow ? 'down' : hasSpaceAbove ? 'up' : 'down';
  }

  private fixHorizontalOverflow(): void {
    if (!this.optionsContainer) return;
    const rect = this.optionsContainer.nativeElement.getBoundingClientRect();
    const margin = 8;
    if (rect.right + margin <= window.innerWidth) return; // fits, nothing to do
    const triggerEl = this.customTriggerWrap?.nativeElement || this.defaultTrigger?.nativeElement;
    const triggerRight = triggerEl?.getBoundingClientRect().right ?? 0;
    const wouldOverflowLeft = triggerRight - rect.width - margin < 0;
    if (!wouldOverflowLeft) this.xAlignment = 'right';
    // else: options wider than viewport — do nothing
  }

  public getValue() {
    return this.value;
  }

  public setValue(value: string | string[]) {
    this.value = value;
    this.onChange?.(this.value);
  }

  public clear() {
    this.value = this.multiple ? [] : '';
    this.onChange?.(this.value);
  }

  public getOpen() {
    return this.isOpen;
  }

  public open() {
    if (!this.isOpen) {
      this.getOptionsDirection();
      this.xAlignment = 'left';
      this.isOpen = true;
      this.cdr.detectChanges();
      this.fixHorizontalOverflow();
    }
  }
  
  public close() {
    if (this.isOpen) this.isOpen = false;
    this.clearSearchTerm();
  }

  public toggle() {
    if (this.isOpen) { 
      this.close(); this.clearSearchTerm();
    }
    else this.open();
  }

}