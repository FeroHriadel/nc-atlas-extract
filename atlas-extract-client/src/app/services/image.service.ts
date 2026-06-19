import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { CreateImageReq } from '../types/CreateImageReq';
import { CreateImageRes } from '../types/CreateImageRes';



@Injectable({
  providedIn: 'root'
})



export class ImageService {
    private apiUrl = environment.apiUrl;

    constructor(private http: HttpClient) {}

    public createImage(req: CreateImageReq): Promise<CreateImageRes> {
        return firstValueFrom(this.http.post<CreateImageRes>(`${this.apiUrl}/images/create`, req));
    }
}
