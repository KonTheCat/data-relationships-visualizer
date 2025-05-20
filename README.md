# Data Relationships Visualizer

This project is a frontend application built with React and TypeScript, designed to explore and visualize data relationships among various data assets. Each data asset consists of a name, description, and an optional list of other data assets that were used in its creation.

## Features

- **Add New Data Assets**: Users can input new data assets through a form, specifying the name, description, and any related assets.
- **View Data Assets**: A list of existing data assets is displayed, allowing users to view details of each asset.
- **Visualize Relationships**: The application provides a visual representation of the relationships between data assets.

## Project Structure

```
data-relationships-visualizer
├── public
│   ├── index.html
│   └── favicon.ico
├── src
│   ├── components
│   │   ├── AddDataAssetForm.tsx
│   │   ├── DataAssetList.tsx
│   │   ├── DataAssetDetail.tsx
│   │   ├── RelationshipVisualizer.tsx
│   │   └── Header.tsx
│   ├── models
│   │   └── DataAsset.ts
│   ├── data
│   │   └── sampleData.ts
│   ├── hooks
│   │   └── useDataAssets.ts
│   ├── utils
│   │   └── visualizationHelpers.ts
│   ├── App.tsx
│   ├── index.tsx
│   └── styles.css
├── package.json
├── tsconfig.json
├── .gitignore
└── README.md
```

## Getting Started

To get started with the project, follow these steps:

1. **Clone the Repository**:
   ```
   git clone https://github.com/yourusername/data-relationships-visualizer.git
   ```

2. **Navigate to the Project Directory**:
   ```
   cd data-relationships-visualizer
   ```

3. **Install Dependencies**:
   ```
   npm install
   ```

4. **Run the Application**:
   ```
   npm start
   ```

5. **Open in Browser**:
   Visit `http://localhost:3000` to view the application.

## Usage

- Use the form to add new data assets.
- Click on a data asset in the list to view its details.
- Explore the visual representation of relationships between data assets.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.