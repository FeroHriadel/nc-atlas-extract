import { Component, Input, OnInit, ViewChild, ElementRef } from '@angular/core';

@Component({
  selector: 'nc-collapsible',
  standalone: true,
  templateUrl: './collapsible.component.html',
  styleUrls: ['./collapsible.component.css'],
  imports: []
})

export class Collapsible implements OnInit {
  @Input() id: string = '';
  @Input() class: string = '';
  @Input() style: { [key: string]: string } = {};
  @Input() onOpen: () => void = () => {};
  @Input() onClose: () => void = () => {};
  @ViewChild('triggerElement') triggerElement!: ElementRef<HTMLDivElement>;

  private isOpenState: boolean = false;
  public uniqueId: string = '';

  constructor() {}

  ngOnInit(): void {
    // Generate unique ID if not provided
    this.uniqueId = this.id || `nc-collapsible-${Math.random().toString(36).substr(2, 9)}`;
  }

  get triggerId(): string {
    return `${this.uniqueId}-trigger`;
  }

  get contentId(): string {
    return `${this.uniqueId}-content`;
  }

  public open(): void {
    this.isOpenState = true;
    if (this.onOpen) this.onOpen();
  }

  public close(): void {
    this.isOpenState = false;
    if (this.onClose) this.onClose();
  }

  public getOpen(): { open: boolean } {
    return { open: this.isOpenState };
  }

  public toggle(): void {
    if (this.isOpenState) {
      this.close();
    } else {
      this.open();
    }
  }

  public handleKeydown(event: KeyboardEvent): void {
    // Support Enter and Space keys for keyboard accessibility
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggle();
    }
    // Support Escape key to close
    else if (event.key === 'Escape' && this.isOpenState) {
      event.preventDefault();
      this.close();
      // Return focus to trigger
      this.triggerElement?.nativeElement?.focus();
    }
    // Support Arrow Down to open, Arrow Up to close
    else if (event.key === 'ArrowDown' && !this.isOpenState) {
      event.preventDefault();
      this.open();
    }
    else if (event.key === 'ArrowUp' && this.isOpenState) {
      event.preventDefault();
      this.close();
    }
  }

  public handleContentKeydown(event: KeyboardEvent): void {
    // Allow Escape to close from within content
    if (event.key === 'Escape' && this.isOpenState) {
      event.preventDefault();
      this.close();
      // Return focus to trigger
      this.triggerElement?.nativeElement?.focus();
    }
  }

  get isOpen(): boolean {
    return this.isOpenState;
  }
}
