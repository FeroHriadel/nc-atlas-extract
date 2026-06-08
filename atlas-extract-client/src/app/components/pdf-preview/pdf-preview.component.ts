import { ChangeDetectorRef, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { PDFDocumentProxy } from 'pdfjs-dist';
import { GlobalWorkerOptions } from 'pdfjs-dist';
import { Card } from '../../ncss/cards/card/card.component';
import { Button } from '../../ncss/buttons/button/button.component';
import { SquareButton } from '../../ncss/buttons/square-button/square-button.component';
GlobalWorkerOptions.workerSrc = 'assets/pdf.worker.mjs';

interface RawOutlineItem {
  title: string;
  dest: any[] | string | null;
  items: RawOutlineItem[];
}

export interface TocItem {
  title: string;
  page: number;
  depth: number;
}

@Component({
  selector: 'app-pdf-preview',
  imports: [Card, PdfViewerModule, Button, SquareButton],
  templateUrl: './pdf-preview.component.html',
  styleUrl: './pdf-preview.component.css',
})
export class PdfPreviewComponent {
  private cdr = inject(ChangeDetectorRef);

  @Input() sourceUrl!: string;
  @Output() totalPagesLoaded = new EventEmitter<number>();

  public currentPage = 1;
  public totalPages = 0;
  public zoom = 1;
  public pdfPreviewOpen = true;
  public outline: TocItem[] = [];
  public pdfLoading = true;

  public onPdfLoaded(pdf: PDFDocumentProxy): void {
    this.pdfLoading = false;
    this.totalPages = pdf.numPages;
    this.totalPagesLoaded.emit(pdf.numPages);
    this.loadOutline(pdf);
  }

  private async loadOutline(pdf: PDFDocumentProxy): Promise<void> {
    const raw: RawOutlineItem[] | null = await pdf.getOutline();
    this.outline = raw?.length ? await this.flattenOutline(pdf, raw, 0) : [];
    this.cdr.detectChanges();
  }

  private async flattenOutline(pdf: PDFDocumentProxy, items: RawOutlineItem[], depth: number): Promise<TocItem[]> {
    const result: TocItem[] = [];
    for (const item of items) {
      const page = await this.resolveDest(pdf, item.dest);
      result.push({ title: item.title, page, depth });
      if (item.items?.length) {
        result.push(...await this.flattenOutline(pdf, item.items, depth + 1));
      }
    }
    return result;
  }

  private async resolveDest(pdf: PDFDocumentProxy, dest: any[] | string | null): Promise<number> {
    if (!dest) return 1;
    try {
      const arr = typeof dest === 'string' ? await pdf.getDestination(dest) : dest;
      if (!arr) return 1;
      const pageIndex = await pdf.getPageIndex(arr[0]);
      return pageIndex + 1;
    } catch {
      return 1;
    }
  }

  public goToPage(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (value >= 1 && value <= this.totalPages) this.currentPage = value;
  }

  public zoomIn(): void  { this.zoom = Math.min(3, +(this.zoom + 0.25).toFixed(2)); }
  public zoomOut(): void { this.zoom = Math.max(0.25, +(this.zoom - 0.25).toFixed(2)); }
}
