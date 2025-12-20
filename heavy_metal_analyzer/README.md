# GeoRisk Predict - Groundwater Pollution Analysis

A sophisticated Flask web application for analyzing and predicting heavy metal pollution in groundwater. This tool provides both interactive map-based predictions and bulk CSV analysis capabilities with a modern dark theme UI.

## 🚀 Features

- �️ **Interactive Map Prediction**: Click anywhere on the map to predict pollution levels
- � **Location Search**: Search for specific locations using the integrated geocoder
- � **Real-time Analysis**: Instant pollution risk assessment with HPI calculations
- � **Detailed Breakdown**: Comprehensive metal concentration analysis
- 📋 **CSV Batch Processing**: Upload and analyze multiple water samples
- 🎨 **Dark Theme UI**: Professional, modern interface optimized for data visualization
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🧪 Supported Heavy Metals

The application analyzes the following heavy metals:
- **As** (Arsenic) - Standard: 10 μg/L
- **Cd** (Cadmium) - Standard: 3 μg/L  
- **Cr** (Chromium) - Standard: 50 μg/L
- **Pb** (Lead) - Standard: 10 μg/L
- **Zn** (Zinc) - Standard: 3000 μg/L
- **Cu** (Copper) - Standard: 2000 μg/L
- **Ni** (Nickel) - Standard: 70 μg/L

## 🛠️ Installation & Setup

### Prerequisites
- Python 3.8 or higher
- conda or pip package manager

### Quick Start

1. **Clone or download the project:**
   ```bash
   cd heavy_metal_analyzer
   ```

2. **Create and activate conda environment:**
   ```bash
   conda create -n georisk python=3.11 -y
   conda activate georisk
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application:**
   ```bash
   python app.py
   ```

5. **Open your browser:**
   Navigate to `http://localhost:5000`

## 🎯 How to Use

### Interactive Prediction Mode
1. **Select Location**: Click anywhere on the map or use the search bar
2. **View Results**: Pollution risk assessment appears instantly in the sidebar
3. **Explore Details**: Click on markers for detailed popup information
4. **Analyze Different Areas**: Click multiple locations to compare pollution levels

### CSV Analysis Mode
1. **Prepare CSV**: Ensure your file has the required columns (see format below)
2. **Upload File**: Use the file upload section (if available in your interface)
3. **View Results**: Interactive map and detailed tables show all analyzed sites

## 📊 Understanding Results

### Pollution Risk Categories
- 🟢 **Low Risk**: HPI < 100 (Safe for consumption)
- 🟡 **Moderate Risk**: 100 ≤ HPI < 150 (Requires monitoring)  
- 🔴 **High Risk**: HPI ≥ 150 (Unsafe, treatment required)

### Key Metrics
- **HPI (Heavy Metal Pollution Index)**: Overall pollution score
- **Contamination Degree**: Sum of individual metal contamination factors
- **Individual Metals**: Specific concentrations in μg/L

## CSV File Format

Your CSV file must include the following columns:

| Column | Description | Unit |
|--------|-------------|------|
| Latitude | Geographic latitude | Decimal degrees |
| Longitude | Geographic longitude | Decimal degrees |
| As | Arsenic concentration | μg/L |
| Cd | Cadmium concentration | μg/L |
| Cr | Chromium concentration | μg/L |
| Pb | Lead concentration | μg/L |
| Zn | Zinc concentration | μg/L |
| Cu | Copper concentration | μg/L |
| Ni | Nickel concentration | μg/L |

### Sample Data

A sample CSV file (`sample_data.csv`) is included with the project for testing purposes.

## Pollution Classification

The application categorizes pollution levels based on HPI values:

- 🟢 **Low Pollution**: HPI < 100
- 🟡 **Moderate Pollution**: 100 ≤ HPI < 150  
- 🔴 **High Pollution**: HPI ≥ 150

## Calculations

### Heavy Metal Pollution Index (HPI)

The HPI is calculated using the following formula:

```
HPI = Σ(Wi × Qi) / ΣWi
```

Where:
- **Wi** = Relative weight = k/Si
- **Qi** = Sub-index = ((Ci - Ii)/(Si - Ii)) × 100
- **Ci** = Concentration of metal i in sample
- **Si** = Standard permissible value of metal i
- **Ii** = Ideal value of metal i (assumed to be 0)

### Contamination Degree (Cd)

```
Cd = Σ(Cfi)
```

Where:
- **Cfi** = Contamination factor = Ci/Si

## Standard Values

The application uses WHO/BIS standards for drinking water:

| Metal | Standard Value (μg/L) |
|-------|----------------------|
| As | 10 |
| Cd | 3 |
| Cr | 50 |
| Pb | 10 |
| Zn | 3000 |
| Cu | 2000 |
| Ni | 70 |

## Project Structure

```
heavy_metal_analyzer/
├── app.py                 # Flask application
├── requirements.txt       # Python dependencies
├── sample_data.csv       # Sample data for testing
├── README.md             # This file
├── templates/
│   └── index.html        # Main HTML template
└── static/
    ├── css/
    │   └── style.css     # Custom styles
    └── js/
        └── main.js       # JavaScript functionality
```

## Technologies Used

- **Backend**: Flask, Pandas, NumPy
- **Frontend**: HTML5, Tailwind CSS, JavaScript
- **Mapping**: Leaflet.js
- **Icons**: Font Awesome

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is open source and available under the MIT License.