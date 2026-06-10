import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { ExtractionService } from '../../services/extraction.service';
import { FormService } from '../../ncss/services/form.service';
import { ToastService } from '../../ncss/services/toast.service';
import { GpsService } from '../../services/gps.service';
import { AsyncPipe, JsonPipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { filter, take } from 'rxjs/operators';
import { Card } from '../../ncss/cards/card/card.component';
import { AppContainer } from '../../components/app-container/app-container.component';
import { Button } from '../../ncss/buttons/button/button.component';
import { Checkbox } from '../../ncss/inputs/checkbox/checkbox.component';
import { ExtractionBatchResult } from '../../types/ExtractionJsonRes';
import { ExtractedItem } from '../../types/ExtractedItem';




@Component({
  selector: 'app-data-prep-details',
  templateUrl: './data-prep-details.page.html',
  styleUrl: './data-prep-details.page.css',
  imports: [AppContainer, Card, Button, Checkbox, AsyncPipe, JsonPipe]
})
export class DataPrepDetailsPage implements OnInit {
    private readonly cdr = inject(ChangeDetectorRef);
    private readonly route = inject(ActivatedRoute);
    private readonly formService = inject(FormService);
    private readonly toastService = inject(ToastService);
    private readonly gpsService = inject(GpsService);
    private readonly extractionService = inject(ExtractionService);
    public readonly extractionJsons$ = this.extractionService.extractionJsons$;
    public readonly isLoading$ = this.extractionService.extractionJsonsLoading$;
    private extractionId: string | null = null;
    public gpsChecked = true;
    public readonly formId = 'data-prep-form';
    public editableJsons: ExtractionBatchResult[] | null = null;
    public loading = false;

    ngOnInit(): void {
        this.extractionId = this.getExtractionIdFromRoute();
        if (!this.extractionId) return;
        this.extractionService.getExtractionJsons(this.extractionId);
    }

    private getExtractionIdFromRoute(): string | null {
        return this.route.snapshot.paramMap.get('extractionId');
    }

    private isFormValid(formValues: { [key: string]: any }): boolean {
        let isValid = true;
        if (!formValues['gps']) {
            isValid = false;
            this.toastService.error({text: 'GPS coordinates are required.'});
        }
        if (formValues['gps'] && !formValues['country']) {
            isValid = false;
            this.toastService.error({text: 'Country is required when GPS coordinates are checked.'});
        }
        return isValid;
    }

    private async cloneExtractionJsons(): Promise<ExtractionBatchResult[] | null> {
        const snapshot = await firstValueFrom(
            this.extractionService.extractionJsons$.pipe(
                filter((jsons): jsons is ExtractionBatchResult[] => !!jsons),
                take(1)
            )
        );
        return structuredClone(snapshot);
    }

    private async addGpsToItem(item: ExtractionBatchResult['items'][0], country: string): Promise<ExtractionBatchResult['items'][0]> {
        const gpsData = await this.gpsService.getGpsFromTownName(item.title, country);
        if (gpsData) item.gps = gpsData;
        return item;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private scrollToItem(itemId: string): void {
        const element = document.getElementById(itemId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    public async onEnrichSubmit(e: Event) {
        // va;lidate, set loading, etc...
        e.preventDefault();
        if (this.loading) return;
        const formValues = this.formService.getFormValues(this.formId);
        if (!this.isFormValid(formValues)) return;
        this.loading = true;

        // deep clone to avoid mutating original data before enrichment is done
        this.editableJsons = await this.cloneExtractionJsons();
        this.cdr.detectChanges();
        if (!this.editableJsons) {
            this.loading = false;
            return;
        }

        // for demo purposes, we will only enrich the first 3 items
        const country = formValues['country'] as string;
        const maxItems = 3;
        let processed = 0;
        for (const batch of this.editableJsons) {
            for (const item of batch.items) {
                if (processed >= maxItems) break;
                if (processed > 0) await this.delay(750);

                await this.addGpsToItem(item, country);
                this.cdr.detectChanges();
                processed++;
                this.scrollToItem(item.title);
            }
            if (processed >= maxItems) break;
        }

        this.loading = false;
        this.cdr.detectChanges();
    }
    
}