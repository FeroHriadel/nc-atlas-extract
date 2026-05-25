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
    private apiUrl = environment.apiUrl;
    private toast = inject(ToastService);
    private http = inject(HttpClient);
    private sources = new BehaviorSubject<Source[]>([]);
    public sources$ = this.sources.asObservable();


    constructor() {
        this.getSources();
    }


    getSources(): void {
        this.http.get<{sources: Source[]}>(`${this.apiUrl}/sources`).subscribe({
            next: data => this.sources.next(data.sources),
            error: (er) => {
                console.error('Error fetching sources:', er);
                this.toast.error({text: 'Failed to load sources.'});
            }
        });
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
}
