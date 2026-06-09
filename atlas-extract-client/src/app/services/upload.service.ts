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
    private readonly http = inject(HttpClient);
    private readonly toastService = inject(ToastService);
    private readonly apiUrl = environment.apiUrl;
    private readonly CHUNK_SIZE = 5 * 1024 * 1024; // 5MB — S3 minimum part size

    private readonly _isUploading = new BehaviorSubject<boolean>(false);
    private readonly _uploadProgress = new BehaviorSubject<{ uploaded: number; total: number }>({ uploaded: 0, total: 0 });
    private readonly _messages = new BehaviorSubject<string[]>([]);

    public readonly isUploading$ = this._isUploading.asObservable();
    public readonly uploadProgress$ = this._uploadProgress.asObservable();
    public readonly messages$ = this._messages.asObservable();

    private activeUploadId: string | null = null;
    private activeObjectKey: string | null = null;

    get isUploadingNow(): boolean {
        return this._isUploading.value;
    }


    public async initUpload(file: File): Promise<InitUploadRes> {
        if (this._isUploading.value) {
            this.toastService.error({ text: "An upload is already in progress. Please wait for it to finish before starting a new one." });
            throw new Error("Upload already in progress");
        }
        this._isUploading.next(true);
        this._messages.next([...this._messages.value, "Initializing upload..."]);

        const req: InitUploadReq = { fileName: file.name, contentType: file.type };

        try {
            const res = await firstValueFrom(
                this.http.post<InitUploadRes>(`${this.apiUrl}/sources/init-upload`, req)
            );
            this.activeUploadId = res.uploadId;
            this.activeObjectKey = res.objectKey;
            this._messages.next([...this._messages.value, "Upload initialized. Uploading file parts..."]);
            return res;
        } catch (err) {
            this.toastService.error({ text: "Failed to initialize upload." });
            this._isUploading.next(false);
            throw err;
        }
    }


    private chunkFile(file: File): Blob[] {
        const chunks: Blob[] = [];
        let start = 0;
        while (start < file.size) {
            chunks.push(file.slice(start, start + this.CHUNK_SIZE));
            start += this.CHUNK_SIZE;
        }
        return chunks;
    }

    private async getPresignedUrl(uploadId: string, objectKey: string, partNumber: number): Promise<string> {
        const params = new URLSearchParams({ uploadId, objectKey, partNumber: String(partNumber) });
        const res = await firstValueFrom(
            this.http.get<{ url: string }>(`${this.apiUrl}/sources/presigned-url?${params}`)
        );
        return res.url;
    }

    private async uploadChunk(presignedUrl: string, chunk: Blob, partNumber: number): Promise<UploadPart> {
        const response = await fetch(presignedUrl, { method: 'PUT', body: chunk });
        if (!response.ok) throw new Error(`Part ${partNumber} upload failed: ${response.statusText}`);
        const eTag = response.headers.get('ETag');
        if (!eTag) throw new Error(`Part ${partNumber}: ETag missing. Add "ETag" to ExposeHeaders in the S3 bucket CORS policy.`);
        return { partNumber, eTag };
    }


    public async uploadParts(file: File, uploadId: string, objectKey: string): Promise<UploadPart[]> {
        const chunks = this.chunkFile(file);
        const total = chunks.length;
        let uploadedCount = 0;
        this._uploadProgress.next({ uploaded: 0, total });

        const parts = await Promise.all(
            chunks.map(async (chunk, i) => {
                const partNumber = i + 1;
                const presignedUrl = await this.getPresignedUrl(uploadId, objectKey, partNumber);
                const part = await this.uploadChunk(presignedUrl, chunk, partNumber);
                uploadedCount++;
                this._uploadProgress.next({ uploaded: uploadedCount, total });
                const pct = Math.round((uploadedCount / total) * 100);
                this._messages.next([...this._messages.value, `Uploaded ${pct}%`]);
                return part;
            })
        );

        return parts.sort((a, b) => a.partNumber - b.partNumber);
    }


    public async completeUpload(uploadId: string, objectKey: string, parts: UploadPart[]): Promise<void> {
        this._messages.next([...this._messages.value, "Completing upload..."]);
        try {
            await firstValueFrom(
                this.http.post(`${this.apiUrl}/sources/complete-upload`, { uploadId, objectKey, parts })
            );
            this._messages.next([...this._messages.value, "Upload complete!"]);
        } catch (err) {
            this.toastService.error({ text: "Failed to complete upload." });
            throw err;
        } finally {
            this._isUploading.next(false);
            this.activeUploadId = null;
            this.activeObjectKey = null;
        }
    }


    public async tryAbort(): Promise<void> {
        if (this.activeUploadId && this.activeObjectKey) {
            await this.abortUpload(this.activeUploadId, this.activeObjectKey);
        } else {
            this.reset();
        }
    }

    private async abortUpload(uploadId: string, objectKey: string): Promise<void> {
        try {
            const params = new URLSearchParams({ uploadId, objectKey });
            await firstValueFrom(
                this.http.delete(`${this.apiUrl}/sources/abort-upload?${params}`)
            );
        } catch {
            // best-effort — swallow silently; S3 lifecycle rules will clean up stale uploads
        } finally {
            this.reset();
        }
    }

    public reset(): void {
        this._isUploading.next(false);
        this._uploadProgress.next({ uploaded: 0, total: 0 });
        this._messages.next([]);
        this.activeUploadId = null;
        this.activeObjectKey = null;
    }
}
