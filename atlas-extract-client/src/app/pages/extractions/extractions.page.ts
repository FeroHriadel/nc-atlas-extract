import { Component, inject, OnInit, AfterViewInit, ViewChild, TemplateRef, ChangeDetectorRef } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { map } from 'rxjs/operators';
import { Card } from '../../ncss/cards/card/card.component';
import { AppContainer } from '../../components/app-container/app-container.component';
import { Pill } from '../../ncss/pills/pill/pill.component';
import { VirtualizedTable, VirtualizedTableProps } from '../../ncss/tables/virtualized-table/virtualized-table';
import { ExtractionService } from '../../services/extraction.service';
import { Extraction } from '../../types/Extraction';



@Component({
  selector: 'app-extractions',
  templateUrl: './extractions.page.html',
  styleUrls: ['./extractions.page.css'],
  imports: [AppContainer, Card, AsyncPipe, VirtualizedTable, Pill]
})
export class ExtractionsPage implements OnInit, AfterViewInit {
    @ViewChild('statusCell') private statusCellTpl!: TemplateRef<any>;

    private readonly extractionService = inject(ExtractionService);
    private readonly cdr = inject(ChangeDetectorRef);

    protected columnsConfig: VirtualizedTableProps['columnsConfig'] = [];

    protected readonly tableData$ = this.extractionService.extractionList$.pipe(
        map((list: Extraction[] | null) => (list ?? []).map(e => ({
            name:        e.friendlyName,
            status:      e.status,
            batches:     `${e.completedBatches}/${e.totalBatches} completed` + (e.failedBatches > 0 ? `, ${e.failedBatches} failed` : ''),
            created:     new Date(e.createdAt).toLocaleDateString(),
            completedAt: e.completedAt ? new Date(e.completedAt).toLocaleDateString() : '—',
        })))
    );

    protected readonly statusStyles: Record<string, { background: string; color: string }> = {
        completed:  { background: '#1a6b3a', color: '#d4f7e0' },
        processing: { background: '#1a3f6b', color: '#d4eaf7' },
        pending:    { background: '#4a4a4a', color: '#d4d4d4' },
        failed:     { background: '#6b1a1a', color: '#f7d4d4' },
    };

    ngOnInit(): void {
        this.extractionService.getExtractionList();
    }

    ngAfterViewInit(): void {
        this.columnsConfig = [
            { column: 'name',        displayValue: 'Name',         width: '300px' },
            { column: 'status',      displayValue: 'Status',       width: '150px', template: this.statusCellTpl },
            { column: 'batches',     displayValue: 'Batches',      width: '200px' },
            { column: 'created',     displayValue: 'Created',      width: '150px' },
            { column: 'completedAt', displayValue: 'Completed At', width: '150px' },
        ];
        this.cdr.detectChanges();
    }
}
