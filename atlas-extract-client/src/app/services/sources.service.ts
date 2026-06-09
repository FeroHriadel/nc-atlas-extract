import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, firstValueFrom } from "rxjs";
import { ToastService } from "../ncss/services/toast.service";
import { environment } from "../../environments/environment";
import { Source } from "../types/Source";
import { CreateSourceReq } from "../types/CreateSourceReq";



@Injectable({
  providedIn: 'root'
})



export class SourcesService {
    private readonly apiUrl = environment.apiUrl;
    private toast = inject(ToastService);
    private http = inject(HttpClient);
    private readonly sources = new BehaviorSubject<Source[]>([]);
    public sources$ = this.sources.asObservable();


    constructor() {
        this.getSources();
    }


    getSources(): void {
        this.http.get<{sources: Source[]}>(`${this.apiUrl}/sources`).subscribe({
            next: data => this.sources.next(data.sources),
            error: err => {
                console.error('Error fetching sources:', err);
                this.toast.error({text: 'Failed to load sources.'});
            }
        });
    }

    findSourceById(id: string): Source | undefined {
        const source = this.sources.getValue().find(s => s.id === id);
        if (!source) this.toast.error({ text: 'Source not found.' });
        return source;
    }

    async createSource(req: CreateSourceReq): Promise<Source> {
        try {
            const res = await firstValueFrom(
                this.http.post<{ source: Source }>(`${this.apiUrl}/sources`, req)
            );
            return res.source;
        } catch (err) {
            this.toast.error({ text: 'Failed to save source record.' });
            throw err;
        }
    }

    async updateSource(id: string, req: Partial<CreateSourceReq>): Promise<Source> {
        const previous = this.sources.getValue();
        const merged = { ...previous.find(s => s.id === id)!, ...req };
        this.sources.next(previous.map(s => s.id === id ? merged : s));
        try {
            const res = await firstValueFrom(
                this.http.put<{ source: Source }>(`${this.apiUrl}/sources/${id}`, merged)
            );
            return res.source;
        } catch (err) {
            this.sources.next(previous);
            this.toast.error({ text: 'Failed to update source record.' });
            throw err;
        }
    }

    async deleteSource(id: string): Promise<void> {
        const previous = this.sources.getValue();
        this.sources.next(previous.filter(s => s.id !== id));
        try {
            await firstValueFrom(this.http.delete(`${this.apiUrl}/sources/${id}`));
        } catch (err) {
            this.sources.next(previous);
            this.toast.error({ text: 'Failed to delete source.' });
            throw err;
        }
    }

    async getSourceUrl(id: string): Promise<string> {
        try {
            const res = await firstValueFrom(
                this.http.get<{ url: string }>(`${this.apiUrl}/sources/download-url/${id}`)
            );
            return res.url;
        } catch (err) {
            this.toast.error({ text: 'Failed to get download URL.' });
            throw err;
        }
    }
}
