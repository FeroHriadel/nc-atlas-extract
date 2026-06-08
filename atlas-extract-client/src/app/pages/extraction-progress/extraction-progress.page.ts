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
import { AsyncPipe } from "@angular/common";



@Component({  
  selector: 'app-extraction-progress',
  templateUrl: './extraction-progress.page.html',
  standalone: true,
  imports: [Table, Card, AppContainer, AsyncPipe]
})



export class ExtractionProgressPage implements OnInit {
    private extractionService = inject(ExtractionService);
    private route = inject(ActivatedRoute);
    public extractionId: string | null = null;
    public extractionFriendlyName: string = '';
    private cdr = inject(ChangeDetectorRef);
    private destroyRef = inject(DestroyRef);
    private stopPolling$ = new Subject<void>();
    public columnsConfig: TableProps['columnsConfig'] = [
        {column: 'startPage', displayValue: 'Start Page'},
        {column: 'endPage', displayValue: 'End Page'},
        {column: 'status', displayValue: 'Status'},
        {column: 'errorMessage', displayValue: 'Error Message'},
        {column: 's3ResultKey', displayValue: 'S3 Key'},
    ]
    public tableData: TableProps['data'] = [];


    ngOnInit(): void {
        // Get extractionId from route & start polling for extraction updates
        this.route.paramMap.pipe(
            take(1),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(params => {
            const extractionId = params.get('extractionId');
            if (extractionId) {
                this.extractionId = extractionId;
                this.startPolling(extractionId);
            }
        });

        // Subscribe to extraction updates
        this.extractionService.extraction$.pipe(
            filter((extraction): extraction is Extraction => !!extraction),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe(extraction => {
            this.extractionFriendlyName = extraction.friendlyName || '';
            this.tableData = this.mapExtractionToTableData(extraction);
            this.cdr.markForCheck();
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

    private mapExtractionToTableData(extraction: Extraction): TableProps['data'] {
        return extraction.batches.map(batch => ({
            startPage: batch.startPage,
            endPage: batch.endPage,
            status: batch.status,
            errorMessage: batch.errorMessage || '',
            s3ResultKey: batch.s3ResultKey || '',
        }));
    }


}