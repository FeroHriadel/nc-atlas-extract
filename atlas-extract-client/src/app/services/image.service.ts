import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreateImageReq } from '../types/CreateImageReq';
import { ImageJobStatusRes } from '../types/ImageJobStatusRes';



@Injectable({
  providedIn: 'root'
})



export class ImageService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) {}

    public createImage(req: CreateImageReq): Promise<{ jobId: string }> {
        return firstValueFrom(this.http.post<{ jobId: string }>(`${this.apiUrl}/images/create`, req));
    }

    public getImageJobStatus(jobId: string): Promise<ImageJobStatusRes> {
        return firstValueFrom(this.http.get<ImageJobStatusRes>(`${this.apiUrl}/images/${jobId}/status`));
    }
}
