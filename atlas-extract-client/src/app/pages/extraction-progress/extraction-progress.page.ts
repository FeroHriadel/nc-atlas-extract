import { Component, ChangeDetectorRef, DestroyRef, inject, OnInit } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { ActivatedRoute } from "@angular/router";
import { Subject, timer } from "rxjs";
import { takeUntil, filter, take } from "rxjs/operators";
import { ExtractionService } from "../../services/extraction.service";
import { Extraction } from "../../types/Extraction";
import { Table, TableProps } from "../../ncss/tables/table/table";
import { Card } from "../../ncss/cards/card/card.component";
import { AppContainer } from "../../components/app-container/app-container.component";



@Component({
  selector: 'app-extraction-progress',
  templateUrl: './extraction-progress.page.html',
  imports: [Table, Card, AppContainer]
})
export class ExtractionProgressPage implements OnInit {
    private readonly extractionService = inject(ExtractionService);
    private readonly route = inject(ActivatedRoute);
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly destroyRef = inject(DestroyRef);
    private readonly stopPolling$ = new Subject<void>();

    protected extractionId: string | null = null;
    protected extractionFriendlyName = '';
    protected readonly columnsConfig: TableProps['columnsConfig'] = [
        { column: 'startPage',    displayValue: 'Start Page' },
        { column: 'endPage',      displayValue: 'End Page' },
        { column: 'status',       displayValue: 'Status' },
        { column: 'errorMessage', displayValue: 'Error Message' },
        { column: 's3ResultKey',  displayValue: 'S3 Key' },
    ];
    protected tableData: TableProps['data'] = [];

    ngOnInit(): void {
        this.route.paramMap.pipe(take(1)).subscribe(params => {
            const extractionId = params.get('extractionId');
            if (extractionId) {
                this.extractionId = extractionId;
                this.startPolling(extractionId);
            }
        });

        this.extractionService.extraction$.pipe(
            filter((extraction): extraction is Extraction => !!extraction),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(extraction => {
            this.extractionFriendlyName = extraction.friendlyName;
            this.tableData = extraction.batches.map(batch => ({
                startPage:    batch.startPage,
                endPage:      batch.endPage,
                status:       batch.status,
                errorMessage: batch.errorMessage ?? '',
                s3ResultKey:  batch.s3ResultKey ?? '',
            }));
            this.cdr.detectChanges();
            if (extraction.status === 'completed' || extraction.status === 'failed') {
                this.stopPolling$.next();
            }
        });
    }

    private startPolling(extractionId: string): void {
        timer(0, 5000).pipe(
            takeUntil(this.stopPolling$),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(() => this.extractionService.getExtraction(extractionId));
    }
}
