import { DataAsset } from "../../models/DataAsset";

/**
 * Formats a data asset for display.
 * @param dataAsset The data asset to format
 * @returns A formatted representation of the data asset
 */
export const formatDataAsset = (dataAsset: {
  name: string;
  description: string;
  relationships?: DataAsset[];
}) => {
  return {
    title: dataAsset.name,
    content: dataAsset.description,
    relatedAssets: dataAsset.relationships || [],
  };
};

/**
 * Creates a map of relationships between data assets.
 * @param dataAssets The array of data assets to calculate relationships for
 * @returns A record mapping asset names to their related assets
 */
export const calculateRelationships = (dataAssets: DataAsset[]) => {
  const relationshipMap: Record<string, DataAsset[]> = {};

  dataAssets.forEach((asset) => {
    relationshipMap[asset.name] = asset.relationships || [];
  });

  return relationshipMap;
};

/**
 * Legacy function for backward compatibility.
 * Returns simple JSX elements representing the relationships.
 * @param dataAssets The array of data assets to visualize
 * @returns An array of JSX elements
 */
export const visualizeRelationships = (
  dataAssets: DataAsset[]
): JSX.Element[] => {
  return dataAssets.map((asset) => (
    <div key={asset.name}>
      <strong>{asset.name}</strong> is related to:{" "}
      {asset.relationships && asset.relationships.length > 0
        ? asset.relationships.map((rel) => rel.name).join(", ")
        : "None"}
    </div>
  ));
};
