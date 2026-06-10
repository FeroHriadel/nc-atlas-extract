import { Component, inject, OnInit, AfterViewInit, ViewChild, TemplateRef, ChangeDetectorRef } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { map } from 'rxjs/operators';
import { Card } from '../../ncss/cards/card/card.component';
import { AppContainer } from '../../components/app-container/app-container.component';
import { Pill } from '../../ncss/pills/pill/pill.component';
import { Button } from '../../ncss/buttons/button/button.component';
import { VirtualizedTable, VirtualizedTableProps } from '../../ncss/tables/virtualized-table/virtualized-table';
import { ExtractionService } from '../../services/extraction.service';
import { Extraction, PageRange } from '../../types/Extraction';



@Component({
  selector: 'app-extractions',
  templateUrl: './extractions.page.html',
  styleUrls: ['./extractions.page.css'],
  imports: [AppContainer, Card, AsyncPipe, VirtualizedTable, Pill, Button, RouterLink]
})
export class ExtractionsPage implements OnInit, AfterViewInit {
    @ViewChild('statusCell')   private statusCellTpl!:   TemplateRef<any>;
    @ViewChild('viewDataCell') private viewDataCellTpl!: TemplateRef<any>;

    private readonly extractionService = inject(ExtractionService);
    private readonly cdr = inject(ChangeDetectorRef);

    protected columnsConfig: VirtualizedTableProps['columnsConfig'] = [];

    protected readonly tableData$ = this.extractionService.extractionList$.pipe(
        map((list: Extraction[] | null) => (list ?? []).map(e => ({
            id:          e.id,
            name:        e.friendlyName,
            pages:       this.formatPageRanges(e.pages),
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

    private formatPageRanges(pages: PageRange[]): string {
        return pages
            .map(p => p.startPage === p.endPage ? `${p.startPage}` : `${p.startPage}-${p.endPage}`)
            .join(', ');
    }

    protected async onDeleteExtraction(id: string): Promise<void> {
        if (!confirm('Delete this extraction and all its S3 result files? This cannot be undone.')) return;
        try {
            await this.extractionService.deleteExtraction(id);
        } catch {
            // service handles rollback and error toast
        }
    }

    ngAfterViewInit(): void {
        this.columnsConfig = [
            { column: 'name',        displayValue: 'Name',         width: '300px' },
            { column: 'pages',       displayValue: 'Pages',        width: '150px' },
            { column: 'status',      displayValue: 'Status',       width: '150px', template: this.statusCellTpl },
            { column: 'batches',     displayValue: 'Batches',      width: '200px' },
            { column: 'created',     displayValue: 'Created',      width: '150px' },
            { column: 'completedAt', displayValue: 'Completed At', width: '150px' },
            { column: 'actions',     displayValue: 'Actions',    width: '200px', template: this.viewDataCellTpl },
        ];
        this.cdr.detectChanges();
    }
}
