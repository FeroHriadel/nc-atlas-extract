import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { AppContainer } from "../../components/app-container/app-container.component";
import { Card } from "../../ncss/cards/card/card.component";
import { Source } from '../../types/Source';
import { SourcesService } from '../../services/sources.service';
import { ActivatedRoute } from '@angular/router';
import { filter, take } from 'rxjs/operators';
import { PdfViewerModule } from 'ng2-pdf-viewer';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import { SquareButton } from '../../ncss/buttons/square-button/square-button.component';
import { Button } from '../../ncss/buttons/button/button.component';
import { ToastService } from '../../ncss/services/toast.service';
GlobalWorkerOptions.workerSrc = 'assets/pdf.worker.mjs';



/*
HOW TO ADD PDF VIEWER (ng2-pdf-viewer v10 + pdfjs-dist v4):

1. Install the package:
      npm install ng2-pdf-viewer

2. Serve the PDF.js worker as a static asset — in angular.json, under "assets":
      { "glob": "pdf.worker.mjs", "input": "node_modules/pdfjs-dist/build/", "output": "assets/" }

3. Tell PDF.js where the worker is (top-level in this file, outside the class):
      import { GlobalWorkerOptions } from 'pdfjs-dist';
      GlobalWorkerOptions.workerSrc = 'assets/pdf.worker.mjs';

4. Import PdfViewerModule in the component:
      import { PdfViewerModule } from 'ng2-pdf-viewer';
      // add PdfViewerModule to @Component imports: [...]

5. Load the PDF URL from the backend and store it in a component property:
      public sourceUrl: string | null = null;
      // then call your API and assign: this.sourceUrl = url;

6. Use the component in the template:
      <pdf-viewer [src]="sourceUrl" [render-text]="true" [original-size]="false" style="width:100%; height:600px;" />

7. Restart ng serve after changing angular.json (assets require a full rebuild).
*/




@Component({
  selector: 'app-init-extraction',
  imports: [AppContainer, Card, PdfViewerModule, SquareButton, Button],
  templateUrl: './init-extraction.page.html',
  styleUrl: './init-extraction.page.css',
})



export class InitExtractionPage implements OnInit {
  private sourcesService = inject(SourcesService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private toast = inject(ToastService);
  public source: Source | null = null;
  public sourceNotFound = false;
  public sourceUrl: string | null = null;
  public currentPage = 1;
  public totalPages = 0;
  public zoom = 1;


  ngOnInit(): void { this.init(); }


  private init(): void {
    const id = this.getSourceIdFromRoute();
    if (!id) return;
    this.loadSource(id);
  }

  private getSourceIdFromRoute(): string | null {
    return this.route.snapshot.paramMap.get('id');
  }

  public onPdfLoaded(pdf: { numPages: number }): void {
    this.totalPages = pdf.numPages;
  }

  public goToPage(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (value >= 1 && value <= this.totalPages) this.currentPage = value;
  }

  public zoomIn(): void  { this.zoom = Math.min(3, +(this.zoom + 0.25).toFixed(2)); }
  public zoomOut(): void { this.zoom = Math.max(0.25, +(this.zoom - 0.25).toFixed(2)); }

  public async runSampleExtraction(startVal: string, endVal: string): Promise<void> {
    const start = parseInt(startVal);
    const end   = parseInt(endVal);

    if (!start || !end || start < 1 || end < start) {
      this.toast.error({ text: 'Please enter a valid page range.' });
      return;
    }
    if (end - start + 1 > 50) {
      this.toast.error({ text: 'Page range cannot exceed 50 pages.' });
      return;
    }

    const pdf = await getDocument(this.sourceUrl!).promise;
    let result = '';
    for (let pageNum = start; pageNum <= end; pageNum++) {
      const page    = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const text    = content.items
        .map((item: any) => ('str' in item ? item.str : ''))
        .join(' ');
      result += `\n--- Page ${pageNum} ---\n${text}`;
    }

    console.log(result);
  }

  private loadSource(id: string): void {
    this.sourcesService.sources$.pipe(
      filter(sources => sources.length > 0),
      take(1)
    ).subscribe(sources => {
      this.source = sources.find(s => s.id === id) ?? null;
      if (this.source?.type === 'pdf') {
        this.sourcesService.getSourceUrl(this.source.id)
          .then(url => { this.sourceUrl = url; this.cdr.detectChanges(); })
          .catch(() => { this.sourceUrl = null; this.cdr.detectChanges(); });
      }
      if (!this.source) this.sourceNotFound = true;
    });
  }

  


}