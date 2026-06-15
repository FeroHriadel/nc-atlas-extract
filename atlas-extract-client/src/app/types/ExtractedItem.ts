export interface ExtractedItemLocation {
    country: string;
    county: string;
    state: string;
    coordinates: [number, number];
}

export interface ExtractedItem {
    title: string;
    description: string;
    category: string;
    tags: string[];
    location?: ExtractedItemLocation;
}