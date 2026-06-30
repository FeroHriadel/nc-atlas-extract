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
import JSZip from 'jszip';



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

    public async downloadEnrichedItems(): Promise<void> {
        if (!this.enrichedItems?.length) {
            this.toastService.error({ text: 'No enriched items found to download.' });
            return;
        }

        const completedItems = this.enrichedItems.filter(item => item.status === 'completed');
        if (!completedItems.length) {
            this.toastService.error({ text: 'No completed enriched items found to download.' });
            return;
        }

        const data = completedItems.map(({ title, description, category, tags, location, image350S3Key, image1024S3Key }) => ({
            title, description, category, tags, location, image350S3Key, image1024S3Key,
        }));

        const extractionId = this.extractionId ?? 'enrichment';
        const zip = new JSZip();
        const root = zip.folder(`enrichment-${extractionId}`);
        const imagesFolder = root?.folder('images');

        root?.file(`enrichment-${extractionId}.json`, JSON.stringify(data, null, 2));

        await Promise.all(completedItems.map(async (item, index) => {
            if (!imagesFolder) return;
            const safeTitle = this.toSafeFilename(item.title || `item-${index + 1}`);
            await this.addImageToZip(imagesFolder, item.image350Url, item.image350S3Key, `${safeTitle}-image350`);
            await this.addImageToZip(imagesFolder, item.image1024Url, item.image1024S3Key, `${safeTitle}-image1024`);
        }));

        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `enrichment-${extractionId}.zip`;
        a.click();
        URL.revokeObjectURL(url);
    }

    private async addImageToZip(
        folder: JSZip,
        imageUrl: string | undefined,
        imageS3Key: string | undefined,
        baseName: string
    ): Promise<void> {
        const directBlob = await this.fetchImageBlob(imageUrl);
        if (directBlob) {
            const extension = this.resolveImageExtension(imageUrl ?? imageS3Key ?? '', directBlob.type);
            folder.file(`${baseName}.${extension}`, directBlob);
            return;
        }

        if (!imageS3Key) return;

        try {
            const signedUrl = await this.extractionService.getDownloadUrlByObjectKey(imageS3Key);
            const fallbackBlob = await this.fetchImageBlob(signedUrl);
            if (!fallbackBlob) return;

            const extension = this.resolveImageExtension(imageS3Key, fallbackBlob.type);
            folder.file(`${baseName}.${extension}`, fallbackBlob);
        } catch {
            // Skip unavailable image files and continue building the archive.
        }
    }

    private async fetchImageBlob(url: string | undefined): Promise<Blob | null> {
        if (!url) return null;

        try {
            const response = await fetch(url);
            if (!response.ok) return null;
            return await response.blob();
        } catch {
            return null;
        }
    }

    private resolveImageExtension(imageUrl: string, mimeType?: string): string {
        if (mimeType?.includes('png')) return 'png';
        if (mimeType?.includes('jpeg') || mimeType?.includes('jpg')) return 'jpg';
        if (mimeType?.includes('webp')) return 'webp';

        const pathname = (() => {
            try {
                return new URL(imageUrl).pathname;
            } catch {
                return imageUrl;
            }
        })();

        const match = pathname.match(/\.([a-zA-Z0-9]+)$/);
        return match?.[1]?.toLowerCase() || 'png';
    }

    private toSafeFilename(value: string): string {
        return value
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 64) || 'item';
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
