import { Component, Input, ViewChild, ElementRef, HostListener, OnDestroy } from '@angular/core';
import { Card } from '../../cards/card/card.component';



@Component({
  selector: 'nc-popover',
  standalone: true,
  templateUrl: './popover.component.html',
  styleUrls: ['./popover.component.css'],
  imports: [Card]
})



export class Popover implements OnDestroy {
  @Input() id: string = '';
  @Input() class: string = '';
  @Input() style: { [key: string]: string } = {};
  @Input() popoverStyle: { [key: string]: string } = {};
  @Input() popoverClass: string = '';
  @Input() forceDirection?: 'up' | 'down';
  
  @ViewChild('trigger') triggerRef!: ElementRef<HTMLElement>;
  @ViewChild('popoverContent') popoverRef!: ElementRef<HTMLElement>;

  public isOpenState: boolean = false;
  private clickOutsideListener?: (event: Event) => void;

  ngOnDestroy(): void {
    if (this.clickOutsideListener) {
      document.removeEventListener('click', this.clickOutsideListener);
    }
  }

  public getState(): boolean {
    return this.isOpenState;
  }

  public open(): void {
    if (this.isOpenState) return;
    
    this.isOpenState = true;
    
    // Wait for the popover to render, then position it
    setTimeout(() => {
      this.positionPopover();
      this.setupClickOutsideListener();
    }, 0);
  }

  public close(): void {
    if (!this.isOpenState) return;
    
    this.isOpenState = false;
    
    if (this.clickOutsideListener) {
      document.removeEventListener('click', this.clickOutsideListener);
      this.clickOutsideListener = undefined;
    }
  }

  public togglePopover(): void {
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

  private setupClickOutsideListener(): void {
    // Small timeout to avoid the current click event from closing immediately
    setTimeout(() => {
      this.clickOutsideListener = (event: Event) => {
        const popoverElement = this.popoverRef?.nativeElement;
        const triggerElement = this.triggerRef?.nativeElement;
        
        if (!popoverElement || !triggerElement) return;
        
        const target = event.target as Node;
        
        // Close if click is outside both popover and trigger
        if (!popoverElement.contains(target) && !triggerElement.contains(target)) {
          this.close();
        }
      };
      
      document.addEventListener('click', this.clickOutsideListener);
    }, 0);
  }

  private positionPopover(): void {
    const triggerElement = this.triggerRef?.nativeElement;
    const popoverElement = this.popoverRef?.nativeElement;
    
    if (!triggerElement || !popoverElement) return;

    const triggerRect = triggerElement.getBoundingClientRect();
    const popoverRect = popoverElement.getBoundingClientRect();
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const gap = 8; // Gap between trigger and popover
    
    // Calculate vertical position
    let top: number;
    let shouldOpenUpward = false;
    
    if (this.forceDirection === 'down') {
      // Force downward
      top = triggerRect.bottom + gap;
    } else if (this.forceDirection === 'up') {
      // Force upward
      top = triggerRect.top - popoverRect.height - gap;
      shouldOpenUpward = true;
    } else {
      // Auto-calculate best position
      const spaceBelow = viewportHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      
      // Try to open below first
      if (spaceBelow >= popoverRect.height + gap) {
        top = triggerRect.bottom + gap;
      } else if (spaceAbove >= popoverRect.height + gap) {
        // Not enough space below, open above
        top = triggerRect.top - popoverRect.height - gap;
        shouldOpenUpward = true;
      } else {
        // Not enough space either way, default to below
        top = triggerRect.bottom + gap;
      }
    }
    
    // Calculate horizontal position
    let left = triggerRect.left;
    
    // Check if popover fits within viewport horizontally
    if (left + popoverRect.width > viewportWidth) {
      // Move left to fit
      left = viewportWidth - popoverRect.width - gap;
      
      // Ensure it doesn't go off the left side
      if (left < gap) {
        left = gap;
      }
    }
    
    // Ensure left is at least the gap from the edge
    if (left < gap) {
      left = gap;
    }
    
    // Apply the calculated position
    popoverElement.style.top = `${top}px`;
    popoverElement.style.left = `${left}px`;
  }
}
