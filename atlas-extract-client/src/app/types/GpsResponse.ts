export interface GpsResult {
    county: string;
    state: string;
    country: string;
    coordinates: [number, number];
}

export interface GpsResponse {
    type: string;
    features: {
        type: string;
        properties: {
            osm_type: string;
            osm_id: number;
            osm_key: string;
            osm_value: string;
            type: string;
            housenumber?: string;
            name?: string;
            street?: string;
            district?: string;
            city?: string;
            county?: string;
            state?: string;
            country?: string;
            postcode?: string;
            countrycode?: string;
            extent: number[];
        };
        geometry: {
            type: string;
            coordinates: [number, number];
        };
    }[];
}


/*
    "type": "FeatureCollection",
    "features": [
        {
            "type": "Feature",
            "properties": {
                "osm_type": "R",
                "osm_id": 2149938,
                "osm_key": "building",
                "osm_value": "yes",
                "type": "house",
                "housenumber": "116",
                "name": "Kaštieľ Orlové",
                "street": "Orlové",
                "district": "Orlové",
                "city": "Považská Bystrica",
                "county": "District of Považská Bystrica",
                "state": "Region of Trenčín",
                "country": "Slovakia",
                "postcode": "01701",
                "countrycode": "SK",
                "extent": [
                    18.4241724,
                    49.1310786,
                    18.42514,
                    49.1304311
                ]
            },
            "geometry": {
                "type": "Point",
                "coordinates": [
                    18.4249771,
                    49.130776
                ]
            }
        }
    ]
*/