import { Component, ChangeDetectorRef, OnDestroy, inject } from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { Card } from '../../ncss/cards/card/card.component';
import { AppContainer } from '../../components/app-container/app-container.component';
import { UploadIcon, BoxOpenIcon, AdjustIcon, TargetHumanIcon } from '../../ncss/icons';
import { ExtractionService } from '../../services/extraction.service';
import { StatsRes } from '../../types/Stats';

Chart.register(...registerables);

const COLORS = {
    extracted: '#3b82f6',
    images:    '#a855f7',
    failedEx:  '#ef4444',
    failedEn:  '#f97316',
};



@Component ({
  selector: 'app-home',
  imports: [Card, AppContainer, UploadIcon, BoxOpenIcon, AdjustIcon, TargetHumanIcon],
  templateUrl: './home.page.html',
  styleUrl: './home.page.css'
})
export class HomePage implements OnDestroy {
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly extractionService = inject(ExtractionService);

    protected readonly logoUrl = 'logo.png';
    protected statsLoading = true;
    protected statsError = false;
    private lineChart: Chart | null = null;
    private barChart: Chart | null = null;

    constructor() {
        this.loadStats();
    }

    ngOnDestroy(): void {
        this.lineChart?.destroy();
        this.barChart?.destroy();
    }

    private async loadStats(): Promise<void> {
        try {
            const stats = await this.extractionService.getStats();
            this.statsLoading = false;
            this.cdr.detectChanges();
            this.createCharts(stats);
        } catch {
            this.statsLoading = false;
            this.statsError = true;
            this.cdr.detectChanges();
        }
    }

    private createCharts(stats: StatsRes): void {
        this.createLineChart(stats);
        this.createBarChart(stats);
    }

    private createLineChart(stats: StatsRes): void {
        const canvas = document.getElementById('line-chart') as HTMLCanvasElement | null;
        if (!canvas) return;

        const labels = stats.thisMonth.map(d => d.date.slice(8)); // day number
        const cfg: ChartConfiguration = {
            type: 'line',
            data: {
                labels,
                datasets: [
                    { label: 'Extracted items',    data: stats.thisMonth.map(d => d.extractedItems),    borderColor: COLORS.extracted, backgroundColor: COLORS.extracted + '22', tension: 0.3, fill: true, pointRadius: 3 },
                    { label: 'Images generated',   data: stats.thisMonth.map(d => d.imagesGenerated),   borderColor: COLORS.images,    backgroundColor: COLORS.images    + '22', tension: 0.3, fill: true, pointRadius: 3 },
                    { label: 'Failed extractions', data: stats.thisMonth.map(d => d.failedExtractions), borderColor: COLORS.failedEx,  backgroundColor: COLORS.failedEx  + '22', tension: 0.3, fill: true, pointRadius: 3 },
                    { label: 'Failed enrichments', data: stats.thisMonth.map(d => d.failedEnrichments), borderColor: COLORS.failedEn,  backgroundColor: COLORS.failedEn  + '22', tension: 0.3, fill: true, pointRadius: 3 },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { color: '#e5e7eb' } },
                },
                scales: {
                    x: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
                    y: { ticks: { color: '#9ca3af', precision: 0 }, grid: { color: '#374151' }, beginAtZero: true },
                },
            },
        };

        this.lineChart?.destroy();
        this.lineChart = new Chart(canvas, cfg);
    }

    private createBarChart(stats: StatsRes): void {
        const canvas = document.getElementById('bar-chart') as HTMLCanvasElement | null;
        if (!canvas) return;

        const { overall } = stats;
        const cfg: ChartConfiguration = {
            type: 'bar',
            data: {
                labels: ['Extracted items', 'Images generated', 'Failed extractions', 'Failed enrichments'],
                datasets: [{
                    label: 'Total',
                    data: [overall.extractedItems, overall.imagesGenerated, overall.failedExtractions, overall.failedEnrichments],
                    backgroundColor: [COLORS.extracted + 'cc', COLORS.images + 'cc', COLORS.failedEx + 'cc', COLORS.failedEn + 'cc'],
                    borderColor:     [COLORS.extracted, COLORS.images, COLORS.failedEx, COLORS.failedEn],
                    borderWidth: 1,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                },
                scales: {
                    x: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
                    y: { ticks: { color: '#9ca3af', precision: 0 }, grid: { color: '#374151' }, beginAtZero: true },
                },
            },
        };

        this.barChart?.destroy();
        this.barChart = new Chart(canvas, cfg);
    }
}
