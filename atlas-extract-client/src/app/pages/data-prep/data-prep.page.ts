import { ChangeDetectorRef, Component, inject, OnInit } from "@angular/core";
import { AsyncPipe, DatePipe } from "@angular/common";
import { filter, map, take } from "rxjs";
import { ExtractionService } from "../../services/extraction.service";
import { Extraction, PageRange } from "../../types/Extraction";
import { AppContainer } from "../../components/app-container/app-container.component";
import { Card } from "../../ncss/cards/card/card.component";
import { Button } from "../../ncss/buttons/button/button.component";
import { RouterLink } from "@angular/router";



@Component({
  selector: "app-data-prep",
  templateUrl: "./data-prep.page.html",
  styleUrl: "./data-prep.page.css",
  imports: [AppContainer, Card, Button, AsyncPipe, DatePipe, RouterLink]
})
export class DataPrepPage implements OnInit {
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly extractionService = inject(ExtractionService);
    public readonly extractionList$ = this.extractionService.extractionList$.pipe(
        map(extractions => extractions?.filter(e => e.status === 'completed') ?? null)
    );
    public enrichmentStatuses: Record<string, string> = {};

    ngOnInit(): void {
        this.extractionService.getExtractionList();
        this.extractionService.extractionList$.pipe(
            filter(list => !!list),
            take(1),
        ).subscribe(list => {
            this.loadEnrichmentStatuses(list!.filter(e => e.status === 'completed'));
        });
    }

    private async loadEnrichmentStatuses(extractions: Extraction[]): Promise<void> {
        const results = await Promise.allSettled(
            extractions.map(e => this.extractionService.getEnrichmentStatus(e.id))
        );
        results.forEach((result, i) => {
            if (result.status === 'fulfilled' && result.value) {
                this.enrichmentStatuses[extractions[i].id] = result.value.status;
            }
        });
        this.cdr.detectChanges();
    }

    protected formatPageRanges(pages: PageRange[]): string {
        return pages
            .map(p => p.startPage === p.endPage ? `${p.startPage}` : `${p.startPage}-${p.endPage}`)
            .join(', ');
    }
}