import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject } from "rxjs";
import { ToastService } from "../ncss/services/toast.service";



@Injectable({
  providedIn: 'root'
})



export class SourcesService {
    private toast = inject(ToastService);
    private http = inject(HttpClient);
    private _sources = new BehaviorSubject<string[]>([]);
    public sources$ = this._sources.asObservable();

    getSources(): void {
        this.http.get<string[]>('/api/sources').subscribe({
            next: data => this._sources.next(data),
            error: () => {
                this.toast.error({text: 'Failed to load sources.'});
            }
        });
    }
}
