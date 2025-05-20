export interface DataAsset {
    name: string;
    description: string;
    relationships?: DataAsset[];
}