import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { ExtractSampleReq } from '../types/ExtractSampleReq';
import { ExtractSampleRes } from '../types/ExtractSampleRes';
import { ToastService } from '../ncss/services/toast.service';
import { ExtractStartReq } from '../types/ExtractionStartReq';
import { ExtractStartRes } from '../types/ExtractionStartRes';
import { Extraction } from '../types/Extraction';
import { ExtractionJsonRes } from '../types/ExtractionJsonRes';




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

    private extractionJsonLoading: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
    public extractionJsonLoading$ = this.extractionJsonLoading.asObservable();
    private extractionJson: BehaviorSubject<ExtractionJsonRes | null> = new BehaviorSubject<ExtractionJsonRes | null>(null);
    public extractionJson$ = this.extractionJson.asObservable();




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

    public getExtractionJson(extractionId: string): void {
        this.extractionJson.next(null);
        this.extractionJsonLoading.next(true);
        this.http.get<ExtractionJsonRes>(`${this.apiUrl}/extraction/${extractionId}/json`)
            .subscribe({
                next: (res: ExtractionJsonRes) => {
                    this.extractionJson.next(res);
                },
                error: (err) => {
                    this.toastService.error({ text: 'Failed to get extraction results', duration: 3000 });
                    console.error('Error getting extraction JSON:', err);
                },
                complete: () => {
                    this.extractionJsonLoading.next(false);
                }
            });
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