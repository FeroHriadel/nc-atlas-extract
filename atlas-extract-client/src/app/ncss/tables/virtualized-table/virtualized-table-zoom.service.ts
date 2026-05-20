import { Injectable, signal } from '@angular/core';

@Injectable()
export class VirtualizedTableZoomService {
  private zoomLevelSignal = signal<number>(1);
  private minZoomSignal = signal<number>(0.5);
  private maxZoomSignal = signal<number>(1.5);
  private zoomStepSignal = signal<number>(0.1);

  zoomLevel = this.zoomLevelSignal.asReadonly();
  minZoom = this.minZoomSignal.asReadonly();
  maxZoom = this.maxZoomSignal.asReadonly();
  zoomStep = this.zoomStepSignal.asReadonly();

  initialize(initialZoom: number = 1, minZoom: number = 0.5, maxZoom: number = 1.5, zoomStep: number = 0.1): void {
    this.zoomLevelSignal.set(initialZoom);
    this.minZoomSignal.set(minZoom);
    this.maxZoomSignal.set(maxZoom);
    this.zoomStepSignal.set(zoomStep);
  }

  handleZoomIn(): void {
    this.zoomLevelSignal.update(prev => Math.min(this.maxZoomSignal(), prev + this.zoomStepSignal()));
  }

  handleZoomOut(): void {
    this.zoomLevelSignal.update(prev => Math.max(this.minZoomSignal(), prev - this.zoomStepSignal()));
  }

  setZoomLevel(zoom: number): void {
    this.zoomLevelSignal.set(zoom);
  }
}
