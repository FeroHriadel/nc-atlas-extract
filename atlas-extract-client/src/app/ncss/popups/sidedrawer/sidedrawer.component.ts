import { Component, Input, HostListener, OnInit, AfterViewInit, ElementRef } from '@angular/core';
import { CloseButton } from '../../buttons/close-button/close-button.component';



@Component({
  selector: 'nc-sidedrawer',
  standalone: true,
  templateUrl: './sidedrawer.component.html',
  styleUrls: ['./sidedrawer.component.css'],
  imports: [CloseButton]
})



export class SideDrawer implements OnInit, AfterViewInit {
  @Input() id: string = '';
  @Input() class: string = '';
  @Input() style: { [key: string]: string } = {};
  @Input() width: string = '260px';
  @Input() side: 'top' | 'bottom' | 'left' | 'right' = 'right';

  public isOpenState: boolean = false;
  public uniqueId: string = '';
  private previouslyFocusedElement: HTMLElement | null = null;
  private drawerElement: HTMLElement | null = null;
  private focusableElements: HTMLElement[] = [];

  constructor(private elementRef: ElementRef) {}

  ngOnInit(): void {
    // Generate unique ID if not provided
    this.uniqueId = this.id || `nc-sidedrawer-${Math.random().toString(36).substr(2, 9)}`;
  }

  ngAfterViewInit(): void {
    // Will be used for focus management when drawer opens
  }

  get drawerId(): string {
    return this.uniqueId;
  }

  get drawerLabelId(): string {
    return `${this.uniqueId}-label`;
  }

  public getState(): boolean {
    return this.isOpenState;
  }

  public open(): void {
    // Save currently focused element
    this.previouslyFocusedElement = document.activeElement as HTMLElement;
    
    this.isOpenState = true;
    
    // Focus management after drawer opens
    setTimeout(() => {
      this.setupFocusTrap();
      this.focusFirstElement();
    }, 100);
  }

  public close(): void {
    this.isOpenState = false;
    
    // Restore focus to previously focused element
    if (this.previouslyFocusedElement) {
      this.previouslyFocusedElement.focus();
      this.previouslyFocusedElement = null;
    }
  }

  private setupFocusTrap(): void {
    // Find the drawer element
    this.drawerElement = document.getElementById(this.uniqueId);
    if (!this.drawerElement) return;

    // Get all focusable elements within the drawer
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'textarea:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ];

    this.focusableElements = Array.from(
      this.drawerElement.querySelectorAll(focusableSelectors.join(','))
    ) as HTMLElement[];
  }

  private focusFirstElement(): void {
    if (this.focusableElements.length > 0) {
      this.focusableElements[0].focus();
    } else if (this.drawerElement) {
      // If no focusable elements, focus the drawer itself
      this.drawerElement.focus();
    }
  }

  public handleDrawerKeydown(event: KeyboardEvent): void {
    if (!this.isOpenState) return;

    // Tab key - trap focus within drawer
    if (event.key === 'Tab') {
      if (this.focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const firstElement = this.focusableElements[0];
      const lastElement = this.focusableElements[this.focusableElements.length - 1];

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement.focus();
        }
      }
    }
  }

  public handleTriggerKeydown(event: KeyboardEvent): void {
    // Support Enter and Space keys for keyboard accessibility
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.toggleDrawer();
    }
  }

  public toggleDrawer(): void {
    if (this.isOpenState) {
      this.close();
    } else {
      this.open();
    }
  }

  @HostListener('document:keydown.escape')
  handleEscapeKey(): void {
    this.close();
  }

  public onBackdropClick(event: MouseEvent): void {
    // Only close if clicking the backdrop itself, not the drawer
    if (event.target === event.currentTarget) {
      this.close();
    }
  }
}
