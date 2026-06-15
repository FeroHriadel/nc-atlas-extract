import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
import { GpsResponse, GpsResult } from "../types/GpsResponse";
import { ExtractedItem } from "../types/ExtractedItem";



@Injectable({
    providedIn: 'root'
})

export class GpsService {
    private readonly http = inject(HttpClient);
    private readonly language = 'en';
    private readonly limit = 1;
    private readonly geocodingApiUrl = 'https://photon.komoot.io/api/?q=';
    
    public async getGpsFromTownName(townName: string, country: string): Promise<GpsResult | null> {
        try {
            const res = await firstValueFrom(this.http.get<GpsResponse>(`${this.geocodingApiUrl}${townName}-${country}&lang=${this.language}&limit=${this.limit}`));
            if (!res?.features?.length) return null;

            const { properties, geometry } = res.features[0];
            return {
                county: properties.county || '',
                state: properties.state || '',
                country: properties.country || '',
                coordinates: geometry.coordinates,
            };
        } catch (err) {
            console.error('Error fetching GPS coordinates:', err);
            return null;
        }
    }
}