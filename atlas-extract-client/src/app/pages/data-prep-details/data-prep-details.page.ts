import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ExtractionService } from '../../services/extraction.service';
import { FormService } from '../../ncss/services/form.service';
import { ToastService } from '../../ncss/services/toast.service';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Card } from '../../ncss/cards/card/card.component';
import { AppContainer } from '../../components/app-container/app-container.component';
import { Button } from '../../ncss/buttons/button/button.component';
import { Checkbox } from '../../ncss/inputs/checkbox/checkbox.component';
import { Enrichment, EnrichedItem } from '../../types/Enrichment';



@Component({
  selector: 'app-data-prep-details',
  templateUrl: './data-prep-details.page.html',
  styleUrl: './data-prep-details.page.css',
  imports: [AppContainer, Card, Button, Checkbox, DecimalPipe]
})
export class DataPrepDetailsPage implements OnInit, OnDestroy {
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly route = inject(ActivatedRoute);
    private readonly formService = inject(FormService);
    private readonly toastService = inject(ToastService);
    private readonly extractionService = inject(ExtractionService);
    private extractionId: string | null = null;
    public gpsChecked = false;
    public imagesChecked = false;
    public readonly formId = 'data-prep-form';
    public enrichment: Enrichment | null = null;
    public enrichedItems: EnrichedItem[] | null = null;
    public submitting = false;
    private pollInterval: ReturnType<typeof setInterval> | null = null;

    get isProcessing(): boolean {
        return this.enrichment?.status === 'processing';
    }

    ngOnInit(): void {
        this.extractionId = this.route.snapshot.paramMap.get('extractionId');
        if (!this.extractionId) return;
        this.loadEnrichmentStatus();
    }

    ngOnDestroy(): void {
        this.stopPolling();
    }

    private async loadEnrichmentStatus(): Promise<void> {
        if (!this.extractionId) return;
        try {
            this.enrichment = await this.extractionService.getEnrichmentStatus(this.extractionId);
            this.cdr.detectChanges();
            if (this.isProcessing) this.startPolling();
            else if (this.enrichment?.status === 'completed') await this.loadEnrichedItems();
        } catch {
            // no enrichment yet — that's fine
        }
    }

    private async loadEnrichedItems(): Promise<void> {
        if (!this.extractionId) return;
        try {
            this.enrichedItems = await this.extractionService.getEnrichedItems(this.extractionId);
            this.cdr.detectChanges();
        } catch {
            this.toastService.error({ text: 'Failed to load enriched items.' });
        }
    }

    private startPolling(): void {
        if (this.pollInterval) return;
        this.pollInterval = setInterval(async () => {
            if (!this.extractionId) return;
            try {
                this.enrichment = await this.extractionService.getEnrichmentStatus(this.extractionId);
                this.cdr.detectChanges();
                if (!this.isProcessing) {
                    this.stopPolling();
                    if (this.enrichment?.status === 'completed') await this.loadEnrichedItems();
                }
            } catch {
                this.stopPolling();
            }
        }, 3000);
    }

    private stopPolling(): void {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    private isFormValid(): boolean {
        if (!this.gpsChecked && !this.imagesChecked) {
            this.toastService.error({ text: 'Please select at least one option (GPS or Generate Images).' });
            return false;
        }
        if (this.gpsChecked) {
            const formValues = this.formService.getFormValues(this.formId);
            if (!formValues['country']) {
                this.toastService.error({ text: 'Country is required when Add GPS Coordinates is checked.' });
                return false;
            }
        }
        return true;
    }

    public downloadEnrichedItems(): void {
        if (!this.enrichedItems) return;
        const data = this.enrichedItems
            .filter(item => item.status === 'completed')
            .map(({ title, description, category, tags, location, image350S3Key, image1024S3Key }) => ({
                title, description, category, tags, location, image350S3Key, image1024S3Key,
            }));
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `enrichment-${this.extractionId}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    public async onEnrichSubmit(e: Event): Promise<void> {
        e.preventDefault();
        if (this.submitting || this.isProcessing) return;
        if (!this.isFormValid()) return;
        if (!this.extractionId) return;

        const formValues = this.formService.getFormValues(this.formId);
        this.submitting = true;
        this.cdr.detectChanges();

        try {
            this.enrichment = await this.extractionService.startEnrichment(this.extractionId, {
                gpsEnabled: this.gpsChecked,
                imagesEnabled: this.imagesChecked,
                country: this.gpsChecked ? (formValues['country'] as string) : undefined,
            });
            this.startPolling();
        } catch (err: any) {
            const msg = err?.error?.message ?? 'Failed to start enrichment.';
            this.toastService.error({ text: msg });
        } finally {
            this.submitting = false;
            this.cdr.detectChanges();
        }
    }
}
