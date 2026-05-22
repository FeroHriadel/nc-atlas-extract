import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject } from "rxjs";
import { ToastService } from "../ncss/services/toast.service";
import { environment } from "../../environments/environment";
import { Source } from "../types/Source";



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
}
