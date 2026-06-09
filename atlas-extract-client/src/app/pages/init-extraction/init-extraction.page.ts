import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { filter, take } from 'rxjs/operators';
import { AppContainer } from "../../components/app-container/app-container.component";
import { Card } from "../../ncss/cards/card/card.component";
import { Source } from '../../types/Source';
import { SourcesService } from '../../services/sources.service';
import { ExtractionService } from '../../services/extraction.service';
import { PdfPreviewComponent } from '../../components/pdf-preview/pdf-preview.component';
import { SamplePagesFormComponent } from '../../components/sample-pages-form/sample-pages-form.component';
import { DescribeStructureFormComponent } from '../../components/describe-structure-form/describe-structure-form.component';
import { SampleTextOutputComponent } from '../../components/sample-text-output/sample-text-output.component';
import { SampleExtractionOutputComponent } from '../../components/sample-extraction-output/sample-extraction-output.component';
import { InitExtractionFormComponent } from '../../components/init-extraction-form/init-extraction-form.component';

@Component({
  selector: 'app-init-extraction',
  imports: [
    AppContainer, Card, AsyncPipe,
    PdfPreviewComponent, SamplePagesFormComponent, DescribeStructureFormComponent,
    SampleTextOutputComponent, SampleExtractionOutputComponent, InitExtractionFormComponent,
  ],
  templateUrl: './init-extraction.page.html',
  styleUrl: './init-extraction.page.css',
})
export class InitExtractionPage implements OnInit {
  private readonly sourcesService = inject(SourcesService);
  private readonly route = inject(ActivatedRoute);
  private readonly cdr = inject(ChangeDetectorRef);
  protected readonly extractionService = inject(ExtractionService);

  protected source: Source | null = null;
  protected sourceNotFound = false;
  protected sourceUrl: string | null = null;
  protected totalPages = 0;
  protected sampleText = '';
  protected sampleTextLoading = false;
  protected skipped = false;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.sourcesService.sources$.pipe(
      filter(sources => sources.length > 0),
      take(1)
    ).subscribe(sources => {
      this.source = sources.find(s => s.id === id) ?? null;
      if (!this.source) { this.sourceNotFound = true; return; }
      if (this.source.type === 'pdf') {
        this.sourcesService.getSourceUrl(this.source.id)
          .then(url => { this.sourceUrl = url; this.cdr.detectChanges(); })
          .catch(() => { this.sourceUrl = null; this.cdr.detectChanges(); });
      }
    });
  }

  // pdf.js callbacks run outside Angular's zone — manual detectChanges required
  protected onSampleTextChange(text: string): void {
    this.sampleText = text;
    this.cdr.detectChanges();
  }

  protected onSampleTextLoadingChange(loading: boolean): void {
    this.sampleTextLoading = loading;
    this.cdr.detectChanges();
  }

  protected onSkip(): void {
    this.skipped = true;
  }
}
