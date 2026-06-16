import { Component, ChangeDetectorRef, DestroyRef, inject, OnInit } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { DatePipe } from "@angular/common";
import { ActivatedRoute } from "@angular/router";
import { filter, take } from "rxjs/operators";
import { ExtractionService } from "../../services/extraction.service";
import { Extraction, PageRange } from "../../types/Extraction";
import { ExtractionBatchResult } from "../../types/ExtractionJsonRes";
import { AppContainer } from "../../components/app-container/app-container.component";
import { Card } from "../../ncss/cards/card/card.component";
import { Pill } from "../../ncss/pills/pill/pill.component";
import { VirtualizedTable, VirtualizedTableProps } from "../../ncss/tables/virtualized-table/virtualized-table";
import { Button } from "../../ncss/buttons/button/button.component";



@Component({
    selector: 'app-extraction-details',
    templateUrl: './extraction-details.page.html',
    styleUrl: './extraction-details.page.css',
    imports: [AppContainer, Card, Pill, VirtualizedTable, DatePipe, Button]
})
export class ExtractionDetailsPage implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly extractionService = inject(ExtractionService);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly destroyRef = inject(DestroyRef);

    protected extraction: Extraction | null = null;
    protected isLoadingJson = false;
    protected jsonError: string | null = null;
    protected tableData: Record<string, unknown>[] = [];
    private batchResults: ExtractionBatchResult[] = [];

    protected readonly resultColumnsConfig: VirtualizedTableProps['columnsConfig'] = [
        { column: 'pages',       displayValue: 'Pages',       width: '110px' },
        { column: 's3Key',       displayValue: 'S3 Key',      width: '260px' },
        { column: 'title',       displayValue: 'Title',       width: '220px' },
        { column: 'description', displayValue: 'Description', width: '380px' },
        { column: 'category',    displayValue: 'Category',    width: '140px' },
        { column: 'tags',        displayValue: 'Tags',        width: '180px' },
    ];

    protected readonly statusStyles: Record<string, { background: string; color: string }> = {
        completed:  { background: '#1a6b3a', color: '#d4f7e0' },
        processing: { background: '#1a3f6b', color: '#d4eaf7' },
        pending:    { background: '#4a4a4a', color: '#d4d4d4' },
        failed:     { background: '#6b1a1a', color: '#f7d4d4' },
    };

    ngOnInit(): void {
        const extractionId = this.route.snapshot.paramMap.get('extractionId');
        if (!extractionId) return;

        this.extractionService.extraction$.pipe(
            filter((e): e is Extraction => !!e),
            take(1),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(extraction => {
            this.extraction = extraction;
            this.cdr.detectChanges();
            this.extractionService.getExtractionJsons(extractionId);
        });

        this.extractionService.extractionJsonsLoading$.pipe(
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(loading => {
            this.isLoadingJson = loading;
            this.cdr.detectChanges();
        });

        this.extractionService.extractionJsonsErr$.pipe(
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(err => {
            this.jsonError = err;
            this.cdr.detectChanges();
        });

        this.extractionService.extractionJsons$.pipe(
            filter((results): results is ExtractionBatchResult[] => !!results),
            take(1),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(results => {
            this.batchResults = results;
            this.tableData = results.flatMap(r => r.items.map(item => ({
                pages:       `p.${r.startPage}–${r.endPage}`,
                s3Key:       r.s3ResultKey,
                title:       item.title,
                description: item.description,
                category:    item.category,
                tags:        item.tags.join(', '),
            })));
            this.cdr.detectChanges();
        });

        this.extractionService.getExtraction(extractionId);
    }

    protected downloadJsons(): void {
        const items = this.batchResults.flatMap(r => r.items);
        const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.extraction?.friendlyName ?? 'extraction'}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    protected formatPageRanges(pages: PageRange[]): string {
        return pages
            .map(p => p.startPage === p.endPage ? `${p.startPage}` : `${p.startPage}-${p.endPage}`)
            .join(', ');
    }
}
