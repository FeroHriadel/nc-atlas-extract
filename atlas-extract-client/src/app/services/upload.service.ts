import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../environments/environment";
import { InitUploadReq } from "../types/InitUploadReq";
import { InitUploadRes } from "../types/InitUploadRes";
import { ToastService } from "../ncss/services/toast.service";
import { BehaviorSubject, Observable } from "rxjs";



@Injectable({
    providedIn: 'root'
})



export class UploadService {
    private http = inject(HttpClient);
    private toastService = inject(ToastService);
    private apiUrl = environment.apiUrl;
    public isUploading = new BehaviorSubject<boolean>(false);
    public initUploadResponse = new BehaviorSubject<InitUploadRes | null>(null);
    public messages = new BehaviorSubject<string[]>([]);



    public initUpload(file: File) {
        // check if isUploading
        if (this.isUploading.value) {
            this.toastService.error({ text: "An upload is already in progress. Please wait for it to finish before starting a new one." });
            return;
        }
        this.isUploading.next(true);
        this.messages.next([...this.messages.value, "Initializing upload..."]);

        // get uploadID and objectKey from backend
        const req: InitUploadReq = {
            fileName: file.name,
            contentType: file.type
        };
        this.http.post<InitUploadRes>(`${this.apiUrl}/sources/init-upload`, req).subscribe({
            next: (res) => {
                this.initUploadResponse.next(res);
                this.messages.next([...this.messages.value, "Upload initialized. Please wait while we upload your file..."]);
            },
            error: (err) => {
                console.error("Failed to initialize upload", err);
                this.toastService.error({ text: "Failed to initialize upload." });
            }
        });
    }

}