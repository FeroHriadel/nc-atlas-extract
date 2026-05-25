import { inject, Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { environment } from "../../environments/environment";
import { InitUploadReq } from "../types/InitUploadReq";
import { InitUploadRes } from "../types/InitUploadRes";
import { ToastService } from "../ncss/services/toast.service";
import { BehaviorSubject, firstValueFrom } from "rxjs";



export interface UploadPart {
    partNumber: number;
    eTag: string;
}



@Injectable({
    providedIn: 'root'
})



export class UploadService {
    private http = inject(HttpClient);
    private toastService = inject(ToastService);
    private apiUrl = environment.apiUrl;
    private readonly CHUNK_SIZE = 5 * 1024 * 1024; // 5MB — S3 minimum part size

    public isUploading = new BehaviorSubject<boolean>(false);
    public uploadProgress = new BehaviorSubject<{ uploaded: number; total: number }>({ uploaded: 0, total: 0 });
    public messages = new BehaviorSubject<string[]>([]);



    public async initUpload(file: File): Promise<InitUploadRes> {
        if (this.isUploading.value) {
            this.toastService.error({ text: "An upload is already in progress. Please wait for it to finish before starting a new one." });
            throw new Error("Upload already in progress");
        }
        this.isUploading.next(true);
        this.messages.next([...this.messages.value, "Initializing upload..."]);

        const req: InitUploadReq = { fileName: file.name, contentType: file.type };

        try {
            const res = await firstValueFrom(
                this.http.post<InitUploadRes>(`${this.apiUrl}/sources/init-upload`, req)
            );
            this.messages.next([...this.messages.value, "Upload initialized. Uploading file parts..."]);
            return res;
        } catch (err) {
            this.toastService.error({ text: "Failed to initialize upload." });
            this.isUploading.next(false);
            throw err;
        }
    }


    // Split file into CHUNK_SIZE blobs
    private chunkFile(file: File): Blob[] {
        const chunks: Blob[] = [];
        let start = 0;
        while (start < file.size) {
            chunks.push(file.slice(start, start + this.CHUNK_SIZE));
            start += this.CHUNK_SIZE;
        }
        return chunks;
    }

    // Fetch a presigned S3 URL for one part from BE
    private async getPresignedUrl(uploadId: string, objectKey: string, partNumber: number): Promise<string> {
        const params = new URLSearchParams({ uploadId, objectKey, partNumber: String(partNumber) });
        const res = await firstValueFrom(
            this.http.get<{ url: string }>(`${this.apiUrl}/sources/presigned-url?${params}`)
        );
        return res.url;
    }


    // PUT one chunk directly to S3 via presigned URL, return its ETag
    private async uploadChunk(presignedUrl: string, chunk: Blob, partNumber: number): Promise<UploadPart> {
        const response = await fetch(presignedUrl, { method: 'PUT', body: chunk });
        if (!response.ok) throw new Error(`Part ${partNumber} upload failed: ${response.statusText}`);
        const eTag = response.headers.get('ETag');
        if (!eTag) throw new Error(`Part ${partNumber}: ETag missing. Add "ETag" to ExposeHeaders in the S3 bucket CORS policy.`);
        return { partNumber, eTag };
    }


    // Upload all parts in parallel, updating progress as each one completes
    public async uploadParts(file: File, uploadId: string, objectKey: string): Promise<UploadPart[]> {
        const chunks = this.chunkFile(file);
        this.uploadProgress.next({ uploaded: 0, total: chunks.length });

        const parts = await Promise.all(
            chunks.map(async (chunk, i) => {
                const partNumber = i + 1;
                const presignedUrl = await this.getPresignedUrl(uploadId, objectKey, partNumber);
                const part = await this.uploadChunk(presignedUrl, chunk, partNumber);
                const uploaded = this.uploadProgress.value.uploaded + 1;
                this.uploadProgress.next({ uploaded, total: chunks.length });
                const pct = Math.round((uploaded / chunks.length) * 100);
                this.messages.next([...this.messages.value, `Uploaded ${pct}%`]);
                return part;
            })
        );

        return parts.sort((a, b) => a.partNumber - b.partNumber);
    }



    public async completeUpload(uploadId: string, objectKey: string, parts: UploadPart[]): Promise<void> {
        this.messages.next([...this.messages.value, "Completing upload..."]);

        try {
            await firstValueFrom(
                this.http.post(`${this.apiUrl}/sources/complete-upload`, { uploadId, objectKey, parts })
            );
            this.messages.next([...this.messages.value, "Upload complete!"]);
        } catch (err) {
            this.toastService.error({ text: "Failed to complete upload." });
            throw err;
        } finally {
            this.isUploading.next(false);
        }
    }



}
