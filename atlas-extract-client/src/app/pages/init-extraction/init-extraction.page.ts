import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { AppContainer } from "../../components/app-container/app-container.component";
import { Card } from "../../ncss/cards/card/card.component";
import { Source } from '../../types/Source';
import { SourcesService } from '../../services/sources.service';
import { ActivatedRoute } from '@angular/router';
import { filter, take } from 'rxjs/operators';
import { AsyncPipe } from '@angular/common';
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
  private sourcesService = inject(SourcesService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  public extractionService = inject(ExtractionService);

  public source: Source | null = null;
  public sourceNotFound = false;
  public sourceUrl: string | null = null;
  public totalPages = 0;
  public sampleText = '';
  public sampleTextLoading = false;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
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

  // pdf.js work happens outside Angular's zone, so the page's own change
  // detector must be poked to refresh sibling components bound to this state
  public onSampleTextChange(text: string): void {
    this.sampleText = text;
    this.cdr.detectChanges();
  }

  public onSampleTextLoadingChange(loading: boolean): void {
    this.sampleTextLoading = loading;
    this.cdr.detectChanges();
  }
}
