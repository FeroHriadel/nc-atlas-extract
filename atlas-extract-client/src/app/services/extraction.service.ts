import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { ExtractSampleReq } from '../types/ExtractSampleReq';
import { ExtractSampleRes } from '../types/ExtractSampleRes';
import { ToastService } from '../ncss/services/toast.service';



@Injectable({
  providedIn: 'root'
})



export class ExtractionService {
  private apiUrl = environment.apiUrl;
  private extractSampleRes: BehaviorSubject<ExtractSampleRes | null> = new BehaviorSubject<ExtractSampleRes | null>(null);
  public extractSampleRes$ = this.extractSampleRes.asObservable();
  private extractSampleErr: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);
  public extractSampleErr$ = this.extractSampleErr.asObservable();


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
    }