import { Component, ChangeDetectorRef, DestroyRef, inject, OnInit } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { DatePipe } from "@angular/common";
import { ActivatedRoute } from "@angular/router";
import { filter, take } from "rxjs/operators";
import { ExtractionService } from "../../services/extraction.service";
import { Extraction } from "../../types/Extraction";
import { ExtractedItem } from "../../types/ExtractedItem";
import { ExtractionJsonRes } from "../../types/ExtractionJsonRes";
import { AppContainer } from "../../components/app-container/app-container.component";
import { Card } from "../../ncss/cards/card/card.component";
import { Pill } from "../../ncss/pills/pill/pill.component";
import { VirtualizedTable, VirtualizedTableProps } from "../../ncss/tables/virtualized-table/virtualized-table";



@Component({
    selector: 'app-extraction-details',
    templateUrl: './extraction-details.page.html',
    styleUrl: './extraction-details.page.css',
    imports: [AppContainer, Card, Pill, VirtualizedTable, DatePipe]
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

    protected readonly columnsConfig: VirtualizedTableProps['columnsConfig'] = [
        { column: 'batch',       displayValue: 'Batch',       width: '110px' },
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
        });

        this.extractionService.extractionJson$.pipe(
            filter((res): res is ExtractionJsonRes => !!res),
            take(1),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(async res => {
            this.isLoadingJson = true;
            this.cdr.detectChanges();
            try {
                const rows: Record<string, unknown>[] = [];
                for (const batch of res.batches) {
                    const response = await fetch(batch.url);
                    const { summary: items }: { summary: ExtractedItem[] } = await response.json();
                    const batchLabel = `p.${batch.startPage}–${batch.endPage}`;
                    for (const item of items) {
                        rows.push({
                            batch:       batchLabel,
                            title:       item.title,
                            description: item.description,
                            category:    item.category,
                            tags:        item.tags.join(', '),
                        });
                    }
                }
                this.tableData = rows;
            } catch (err) {
                console.error('Failed to load extraction results:', err);
                this.jsonError = 'Failed to load extraction results';
            } finally {
                this.isLoadingJson = false;
                this.cdr.detectChanges();
            }
        });

        this.extractionService.getExtraction(extractionId);
        this.extractionService.getExtractionJson(extractionId);
    }
}
