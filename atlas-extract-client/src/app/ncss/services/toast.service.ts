import { Injectable } from '@angular/core';



export interface ToastOptions {
  text: string;
  duration?: number;
}

interface ActiveToast {
  element: HTMLDivElement;
  timeoutId: number;
}



@Injectable({
  providedIn: 'root'
})

export class ToastService {
  private activeToasts: ActiveToast[] = [];
  private readonly defaultDuration = 2500;
  private readonly toastSpacing = 16; // Gap between stacked toasts

  constructor() {}

  toast(options: ToastOptions): void {
    this.showToast(options, 'toast');
  }

  error(options: ToastOptions): void {
    this.showToast(options, 'error');
  }

  private showToast(options: ToastOptions, type: 'toast' | 'error'): void {
    const duration = options.duration ?? this.defaultDuration;
    
    // Create toast element
    const toastElement = document.createElement('div');
    toastElement.textContent = options.text;
    
    // Apply base styles
    this.applyBaseStyles(toastElement);
    
    // Apply type-specific styles
    if (type === 'toast') {
      toastElement.style.border = '1px solid var(--nc-toast-border)';
      toastElement.style.backgroundColor = 'var(--nc-toast-bg)';
    } else {
      toastElement.style.border = '1px solid var(--nc-error-toast-border)';
      toastElement.style.backgroundColor = 'var(--nc-error-toast-bg)';
    }
    
    // Calculate position based on existing toasts
    const bottomPosition = this.calculateBottomPosition();
    toastElement.style.bottom = `${bottomPosition}px`;
    
    // Add to DOM
    document.body.appendChild(toastElement);
    
    // Trigger animation after a brief delay (for CSS transition)
    setTimeout(() => {
      toastElement.style.opacity = '0.8';
      toastElement.style.transform = 'translateX(0)';
    }, 10);
    
    // Set up auto-removal
    const timeoutId = window.setTimeout(() => {
      this.removeToast(toastElement);
    }, duration);
    
    // Track this toast
    this.activeToasts.push({ element: toastElement, timeoutId });
  }

  private applyBaseStyles(element: HTMLDivElement): void {
    element.style.position = 'fixed';
    element.style.right = '20px';
    element.style.padding = '12px 20px';
    element.style.borderRadius = 'var(--nc-border-radius)';
    element.style.color = 'var(--nc-white-900)';
    element.style.fontSize = '16px';
    element.style.fontWeight = '500';
    element.style.boxShadow = 'var(--nc-box-shadow)';
    element.style.zIndex = '9999';
    element.style.minWidth = '260px';
    element.style.maxWidth = '260px';
    element.style.minHeight = '100px';
    element.style.wordWrap = 'break-word';
    element.style.display = 'flex';
    element.style.justifyContent = 'center';
    element.style.alignItems = 'center';
    element.style.textAlign = 'center';
    element.style.transition = 'all 0.3s ease-in-out';
    element.style.opacity = '0';
    element.style.transform = 'translateX(100px)';
    element.style.pointerEvents = 'auto';
    element.style.cursor = 'pointer';
    
    // Allow click to dismiss
    element.addEventListener('click', () => {
      this.removeToast(element);
    });
  }

  private calculateBottomPosition(): number {
    let totalHeight = 20; // Initial bottom margin
    
    this.activeToasts.forEach(toast => {
      totalHeight += toast.element.offsetHeight + this.toastSpacing;
    });
    
    return totalHeight;
  }

  private removeToast(element: HTMLDivElement): void {
    // Find the toast in our tracking array
    const index = this.activeToasts.findIndex(t => t.element === element);
    
    if (index === -1) return;
    
    // Clear the timeout
    clearTimeout(this.activeToasts[index].timeoutId);
    
    // Fade out animation
    element.style.opacity = '0';
    element.style.transform = 'translateX(100px)';
    
    // Remove from DOM after animation
    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
      
      // Remove from tracking array
      this.activeToasts.splice(index, 1);
      
      // Reposition remaining toasts
      this.repositionToasts();
    }, 300);
  }

  private repositionToasts(): void {
    let currentBottom = 20;
    
    this.activeToasts.forEach(toast => {
      toast.element.style.bottom = `${currentBottom}px`;
      currentBottom += toast.element.offsetHeight + this.toastSpacing;
    });
  }
}
