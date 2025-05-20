import React from 'react';
import { DataAsset } from '../models/DataAsset';

interface DataAssetDetailProps {
    asset: DataAsset;
}

const DataAssetDetail: React.FC<DataAssetDetailProps> = ({ asset }) => {
    return (
        <div>
            <h2>{asset.name}</h2>
            <p>{asset.description}</p>
            {asset.relationships && asset.relationships.length > 0 && (
                <div>
                    <h3>Relationships:</h3>
                    <ul>
                        {asset.relationships.map((relationship, index) => (
                            <li key={index}>{relationship.name}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default DataAssetDetail;