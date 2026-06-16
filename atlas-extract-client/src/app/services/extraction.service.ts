import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { ExtractSampleReq } from '../types/ExtractSampleReq';
import { ExtractSampleRes } from '../types/ExtractSampleRes';
import { ToastService } from '../ncss/services/toast.service';
import { ExtractStartReq } from '../types/ExtractionStartReq';
import { ExtractStartRes } from '../types/ExtractionStartRes';
import { Extraction } from '../types/Extraction';
import { ExtractionJsonRes, ExtractionBatchResult } from '../types/ExtractionJsonRes';
import { ExtractedItem } from '../types/ExtractedItem';
import { Enrichment, EnrichedItem, EnrichmentStartReq } from '../types/Enrichment';




@Injectable({
  providedIn: 'root'
})



export class ExtractionService {
    private apiUrl = environment.apiUrl;
    private extractSampleRes: BehaviorSubject<ExtractSampleRes | null> = new BehaviorSubject<ExtractSampleRes | null>(null);
    public extractSampleRes$ = this.extractSampleRes.asObservable();
    private extractSampleErr: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);
    public extractSampleErr$ = this.extractSampleErr.asObservable();
    
    private extractionStartRes: BehaviorSubject<{extractionId: string} | null> = new BehaviorSubject<{extractionId: string} | null>(null);
    private extractionStartLoading: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public extractionStartLoading$ = this.extractionStartLoading.asObservable();
    public extractionStartRes$ = this.extractionStartRes.asObservable();
    private extractionStartErr: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);
    public extractionStartErr$ = this.extractionStartErr.asObservable();

    private extractionLoading: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public extractionLoading$ = this.extractionLoading.asObservable()
    private extraction: BehaviorSubject<Extraction | null> = new BehaviorSubject<Extraction | null>(null);
    public extraction$ = this.extraction.asObservable()

    private extractionListLoading: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public extractionListLoading$ = this.extractionListLoading.asObservable();
    private extractionList: BehaviorSubject<Extraction[] | null> = new BehaviorSubject<Extraction[] | null>(null);
    public extractionList$ = this.extractionList.asObservable();

    private extractionJsonsLoading: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public extractionJsonsLoading$ = this.extractionJsonsLoading.asObservable();
    private extractionJsonsErr: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);
    public extractionJsonsErr$ = this.extractionJsonsErr.asObservable();
    private extractionJsons: BehaviorSubject<ExtractionBatchResult[] | null> = new BehaviorSubject<ExtractionBatchResult[] | null>(null);
    public extractionJsons$ = this.extractionJsons.asObservable();




    constructor(
        private http: HttpClient,
        private toastService: ToastService
    ) {}


    public extractSample(req: ExtractSampleReq): void {
        this.extractSampleRes.next(null);
        this.extractSampleErr.next(null);
        this.http.post<ExtractSampleRes>(`${this.apiUrl}/extraction/sample`, req)
            .subscribe({
                next: (res: ExtractSampleRes) => {
                    this.extractSampleRes.next(res);
                },
                error: (err) => {
                    this.toastService.error({text: 'Failed to extract sample', duration: 3000});
                    this.extractSampleErr.next(err.error ? err.error : 'An error occurred while extracting the sample');
                    console.error('Error extracting sample:', err);
                }
            });
    }

    public startExtraction(req: ExtractStartReq): void {
        this.extractionStartLoading.next(true);
        this.extractionStartRes.next(null);
        this.extractionStartErr.next(null);
        this.http.post<ExtractStartRes>(`${this.apiUrl}/extraction/start`, req)
            .subscribe({
                next: (res: ExtractStartRes) => {
                    this.extractionStartRes.next(res);
                },
                error: (err) => {
                    this.toastService.error({text: 'Failed to start extraction', duration: 3000});
                    this.extractionStartErr.next(err.error ? err.error : 'An error occurred while starting the extraction');
                    console.error('Error starting extraction:', err);
                },
                complete: () => {
                    this.extractionStartLoading.next(false);
                }
            });
    }

    public getExtraction(extractionId: string): void{
        this.extraction.next(null);
        this.extractionLoading.next(true);
        this.http.get<Extraction>(`${this.apiUrl}/extraction/${extractionId}`)
            .subscribe({
                next: (res: Extraction) => {
                    this.extraction.next(res);
                },
                error: (err) => {
                    this.toastService.error({text: 'Failed to get extraction', duration: 3000});
                    console.error('Error getting extraction:', err);
                },
                complete: () => {
                    this.extractionLoading.next(false);
                }
            });
    }

    async deleteExtraction(id: string): Promise<void> {
        const previous = this.extractionList.getValue();
        this.extractionList.next((previous ?? []).filter(e => e.id !== id));
        try {
            await firstValueFrom(this.http.delete(`${this.apiUrl}/extraction/${id}`));
        } catch (err) {
            this.extractionList.next(previous);
            this.toastService.error({ text: 'Failed to delete extraction', duration: 3000 });
            throw err;
        }
    }

    public async getExtractionJsons(extractionId: string): Promise<void> {
        this.extractionJsons.next(null);
        this.extractionJsonsErr.next(null);
        this.extractionJsonsLoading.next(true);
        try {
            const res = await firstValueFrom(this.http.get<ExtractionJsonRes>(`${this.apiUrl}/extraction/${extractionId}/json`));
            const extraction = this.extraction.getValue();

            const results: ExtractionBatchResult[] = [];
            for (const batch of res.batches) {
                const response = await fetch(batch.url);
                const { summary: items }: { summary: ExtractedItem[] } = await response.json();
                results.push({
                    batchIndex:  batch.batchIndex,
                    startPage:   batch.startPage,
                    endPage:     batch.endPage,
                    s3ResultKey: extraction?.batches[batch.batchIndex]?.s3ResultKey ?? `batch ${batch.batchIndex}`,
                    items,
                });
            }
            this.extractionJsons.next(results);
        } catch (err) {
            this.toastService.error({ text: 'Failed to get extraction results', duration: 3000 });
            this.extractionJsonsErr.next('Failed to load extraction results');
            console.error('Error getting extraction JSON:', err);
        } finally {
            this.extractionJsonsLoading.next(false);
        }
    }

    public async startEnrichment(extractionId: string, req: EnrichmentStartReq): Promise<Enrichment> {
        return firstValueFrom(
            this.http.post<Enrichment>(`${this.apiUrl}/extraction/${extractionId}/enrich`, req)
        );
    }

    public async getEnrichmentStatus(extractionId: string): Promise<Enrichment | null> {
        return firstValueFrom(
            this.http.get<Enrichment | null>(`${this.apiUrl}/extraction/${extractionId}/enrichment-status`)
        );
    }

    public async getEnrichedItems(extractionId: string): Promise<EnrichedItem[]> {
        return firstValueFrom(
            this.http.get<EnrichedItem[]>(`${this.apiUrl}/extraction/${extractionId}/enriched-items`)
        );
    }

    public getExtractionList(): void {
        this.extractionListLoading.next(true);
        this.http.get<Extraction[]>(`${this.apiUrl}/extraction/extractions`)
            .subscribe({
                next: (res: Extraction[]) => {
                    this.extractionList.next(res);
                },
                error: (err) => {
                    this.toastService.error({text: 'Failed to get extraction list', duration: 3000});
                    console.error('Error getting extraction list:', err);
                },
                complete: () => {
                    this.extractionListLoading.next(false);
                }
            });
    }

    
}