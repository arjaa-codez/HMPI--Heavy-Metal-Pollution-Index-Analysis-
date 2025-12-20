"""
Telangana Groundwater Quality ML Model Trainer
This script trains ML models on real Telangana groundwater data from 2018-2020
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor, ExtraTreesRegressor
from sklearn.neural_network import MLPRegressor
from sklearn.model_selection import train_test_split, cross_val_score, GridSearchCV
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
import joblib
import json
from datetime import datetime
import warnings
warnings.filterwarnings('ignore')
import warnings
warnings.filterwarnings('ignore')

class TelanganaGroundwaterPredictor:
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.imputers = {}
        self.label_encoders = {}
        self.feature_columns = []
        self.target_columns = []
        self.telangana_bounds = {
            'lat_min': 15.5, 'lat_max': 19.9,
            'lon_min': 77.0, 'lon_max': 81.5
        }
        
        # WHO/BIS standards for classification
        self.standards = {
            'ph_min': 6.5, 'ph_max': 8.5,
            'tds_max': 500,  # mg/L
            'fluoride_max': 1.0,  # mg/L
            'nitrate_max': 45,    # mg/L as NO3
            'chloride_max': 250,  # mg/L
            'sulfate_max': 200,   # mg/L
            'hardness_max': 300   # mg/L as CaCO3
        }
    
    def load_and_combine_data(self):
        """Load and combine all years of data"""
        dataframes = []
        
        for year in ['2018', '2019', '2020']:
            file_path = f'train_data/ground_water_quality_{year}_post.csv'
            try:
                df = pd.read_csv(file_path)
                df['year'] = int(year)
                dataframes.append(df)
                print(f"Loaded {len(df)} records from {year}")
            except Exception as e:
                print(f"Error loading {year} data: {e}")
        
        if not dataframes:
            raise ValueError("No data files found!")
        
        combined_df = pd.concat(dataframes, ignore_index=True)
        print(f"Total combined records: {len(combined_df)}")
        
        return combined_df
    
    def clean_and_prepare_data(self, df):
        """Clean and prepare the data for training"""
        print("Cleaning and preparing data...")
        print(f"Initial DataFrame shape: {df.shape}")
        print(f"Initial columns: {list(df.columns)}")
        
        # Standardize column names
        df.columns = [col.strip().lower().replace(' ', '_').replace('.', '_') for col in df.columns]
        print(f"Standardized columns: {list(df.columns)}")
        
        # Filter for Telangana coordinates
        df = df[
            (df['lat_gis'] >= self.telangana_bounds['lat_min']) & 
            (df['lat_gis'] <= self.telangana_bounds['lat_max']) &
            (df['long_gis'] >= self.telangana_bounds['lon_min']) & 
            (df['long_gis'] <= self.telangana_bounds['lon_max'])
        ]
        
        print(f"Records after filtering for Telangana: {len(df)}")
        
        # Handle duplicate columns - keep only the first occurrence
        df = df.loc[:, ~df.columns.duplicated()]
        print(f"Columns after removing duplicates: {list(df.columns)}")
        
        # Rename columns for consistency
        column_mapping = {
            'lat_gis': 'latitude',
            'long_gis': 'longitude',
            'e_c': 'ec_primary',  # Rename to avoid conflicts with any 'ec' column
            'no3_': 'nitrate',
            't_h': 'total_hardness',
            'co3': 'carbonate',
            'hco3': 'bicarbonate',
            'cl': 'chloride',
            'f': 'fluoride',
            'so4': 'sulfate',
            'na': 'sodium',
            'k': 'potassium',
            'ca': 'calcium',
            'mg': 'magnesium'
        }
        
        df.rename(columns=column_mapping, inplace=True)
        
        # Convert numeric columns
        numeric_columns = [
            'latitude', 'longitude', 'gwl', 'ph', 'ec_primary', 'tds', 'carbonate',
            'bicarbonate', 'chloride', 'fluoride', 'nitrate', 'sulfate',
            'sodium', 'potassium', 'calcium', 'magnesium', 'total_hardness', 'sar'
        ]
        
        for col in numeric_columns:
            if col in df.columns:
                try:
                    # Debug: Print column info
                    print(f"Processing column: {col}, type: {type(df[col])}, shape: {df[col].shape if hasattr(df[col], 'shape') else 'N/A'}")
                    
                    # Check if the column exists and has data
                    if not df[col].empty and isinstance(df[col], pd.Series):
                        df[col] = pd.to_numeric(df[col], errors='coerce')
                        print(f"Successfully converted {col}")
                    else:
                        print(f"Skipping {col}: empty or not a Series")
                except Exception as e:
                    print(f"Error processing column {col}: {e}")
                    continue
        
        # Remove rows with missing coordinates
        df = df.dropna(subset=['latitude', 'longitude'])
        
        # Create categorical features
        if 'district' in df.columns:
            le_district = LabelEncoder()
            df['district_encoded'] = le_district.fit_transform(df['district'].astype(str))
            self.label_encoders['district'] = le_district
        
        if 'mandal' in df.columns:
            le_mandal = LabelEncoder()
            df['mandal_encoded'] = le_mandal.fit_transform(df['mandal'].astype(str))
            self.label_encoders['mandal'] = le_mandal
        
        # Create derived features
        df['lat_lon_interaction'] = df['latitude'] * df['longitude']
        df['season_encoded'] = df['year'] % 4  # Simple seasonal encoding
        
        # Calculate water quality indices
        df = self.calculate_quality_indices(df)
        
        return df
    
    def calculate_quality_indices(self, df):
        """Calculate various water quality indices"""
        # Water Quality Index (WQI) components
        if 'ph' in df.columns:
            df['ph_quality'] = np.where(
                (df['ph'] >= self.standards['ph_min']) & (df['ph'] <= self.standards['ph_max']),
                100, 50
            )
        
        if 'tds' in df.columns:
            df['tds_quality'] = np.where(
                df['tds'] <= self.standards['tds_max'], 100,
                100 * self.standards['tds_max'] / df['tds']
            )
        
        if 'fluoride' in df.columns:
            df['fluoride_quality'] = np.where(
                df['fluoride'] <= self.standards['fluoride_max'], 100,
                100 * self.standards['fluoride_max'] / df['fluoride']
            )
        
        if 'nitrate' in df.columns:
            df['nitrate_quality'] = np.where(
                df['nitrate'] <= self.standards['nitrate_max'], 100,
                100 * self.standards['nitrate_max'] / df['nitrate']
            )
        
        # Overall WQI (simplified)
        quality_cols = [col for col in df.columns if col.endswith('_quality')]
        if quality_cols:
            df['wqi'] = df[quality_cols].mean(axis=1)
        
        # Pollution risk score
        risk_factors = []
        if 'tds' in df.columns:
            risk_factors.append(df['tds'] / self.standards['tds_max'])
        if 'fluoride' in df.columns:
            risk_factors.append(df['fluoride'] / self.standards['fluoride_max'])
        if 'nitrate' in df.columns:
            risk_factors.append(df['nitrate'] / self.standards['nitrate_max'])
        
        if risk_factors:
            df['pollution_risk'] = np.mean(risk_factors, axis=0)
        
        return df
    
    def prepare_features_and_targets(self, df):
        """Prepare feature and target variables"""
        # Feature columns
        feature_cols = [
            'latitude', 'longitude', 'gwl', 'district_encoded', 'mandal_encoded',
            'lat_lon_interaction', 'season_encoded', 'year'
        ]
        
        # Add available water quality parameters as features
        water_params = ['ph', 'ec_primary', 'carbonate', 'bicarbonate', 'sodium', 'potassium', 'calcium', 'magnesium']
        feature_cols.extend([col for col in water_params if col in df.columns])
        
        # Target columns (what we want to predict)
        target_cols = ['tds', 'chloride', 'fluoride', 'nitrate', 'sulfate', 'total_hardness', 'sar', 'wqi', 'pollution_risk']
        target_cols = [col for col in target_cols if col in df.columns]
        
        # Keep only available columns
        feature_cols = [col for col in feature_cols if col in df.columns]
        
        self.feature_columns = feature_cols
        self.target_columns = target_cols
        
        print(f"Feature columns ({len(feature_cols)}): {feature_cols}")
        print(f"Target columns ({len(target_cols)}): {target_cols}")
        
        return feature_cols, target_cols
    
    def train_models(self, df):
        """Train ML models for each target variable"""
        feature_cols, target_cols = self.prepare_features_and_targets(df)
        
        X = df[feature_cols].copy()
        
        # Handle missing values in features
        imputer = SimpleImputer(strategy='median')
        X_imputed = imputer.fit_transform(X)
        X = pd.DataFrame(X_imputed, columns=feature_cols)
        self.imputers['features'] = imputer
        
        # Scale features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        X_scaled = pd.DataFrame(X_scaled, columns=feature_cols)
        self.scalers['features'] = scaler
        
        results = {}
        
        for target in target_cols:
            print(f"\nTraining model for {target}...")
            
            # Prepare target variable
            y = df[target].copy()
            
            # Remove rows where target is missing
            mask = ~y.isna()
            X_target = X_scaled[mask]
            y_target = y[mask]
            
            if len(y_target) < 10:
                print(f"Not enough data for {target} (only {len(y_target)} samples)")
                continue
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X_target, y_target, test_size=0.2, random_state=42
            )
            
            # Train multiple models and select the best one
            models = {
                'RandomForest': RandomForestRegressor(
                    n_estimators=200,
                    max_depth=15,
                    min_samples_split=5,
                    min_samples_leaf=2,
                    random_state=42,
                    n_jobs=-1
                ),
                'GradientBoosting': GradientBoostingRegressor(
                    n_estimators=150,
                    max_depth=8,
                    learning_rate=0.1,
                    random_state=42
                ),
                'ExtraTrees': ExtraTreesRegressor(
                    n_estimators=200,
                    max_depth=15,
                    min_samples_split=5,
                    min_samples_leaf=2,
                    random_state=42,
                    n_jobs=-1
                ),
                'NeuralNetwork': MLPRegressor(
                    hidden_layer_sizes=(100, 50, 25),
                    max_iter=1000,  # This acts like epochs
                    learning_rate_init=0.001,
                    random_state=42,
                    early_stopping=True,
                    validation_fraction=0.1,
                    n_iter_no_change=10
                )
            }
            
            best_model = None
            best_score = -np.inf
            best_model_name = None
            
            # Train and evaluate each model
            for model_name, model in models.items():
                try:
                    # Train model
                    model.fit(X_train, y_train)
                    
                    # Evaluate on validation set
                    y_pred_val = model.predict(X_test)
                    r2_val = r2_score(y_test, y_pred_val)
                    
                    # Cross-validation
                    cv_scores = cross_val_score(model, X_target, y_target, cv=5, scoring='r2')
                    cv_mean = cv_scores.mean()
                    
                    print(f"  {model_name}: R² = {r2_val:.4f}, CV R² = {cv_mean:.4f}")
                    
                    # Select best model based on cross-validation score
                    if cv_mean > best_score:
                        best_score = cv_mean
                        best_model = model
                        best_model_name = model_name
                        
                except Exception as e:
                    print(f"  {model_name}: Failed to train - {e}")
                    continue
            
            if best_model is None:
                print(f"All models failed for {target}")
                continue
                
            print(f"  Best model: {best_model_name}")
            
            # Final predictions with best model
            y_pred = best_model.predict(X_test)
            
            # Final metrics with best model
            mse = mean_squared_error(y_test, y_pred)
            rmse = np.sqrt(mse)
            mae = mean_absolute_error(y_test, y_pred)
            r2 = r2_score(y_test, y_pred)
            
            # Cross-validation with best model
            cv_scores = cross_val_score(best_model, X_target, y_target, cv=5, scoring='r2')
            
            results[target] = {
                'model': best_model,
                'model_name': best_model_name,
                'rmse': rmse,
                'mae': mae,
                'r2': r2,
                'cv_mean': cv_scores.mean(),
                'cv_std': cv_scores.std(),
                'n_samples': len(y_target)
            }
            
            self.models[target] = best_model
            
            print(f"Results for {target}:")
            print(f"  RMSE: {rmse:.4f}")
            print(f"  MAE: {mae:.4f}")
            print(f"  R²: {r2:.4f}")
            print(f"  CV R² (mean±std): {cv_scores.mean():.4f}±{cv_scores.std():.4f}")
            print(f"  Samples: {len(y_target)}")
        
        return results
    
    def save_models(self):
        """Save trained models and preprocessing components"""
        model_dir = 'models'
        import os
        os.makedirs(model_dir, exist_ok=True)
        
        # Save models
        for target, model in self.models.items():
            joblib.dump(model, f'{model_dir}/{target}_model.pkl')
        
        # Save preprocessing components
        joblib.dump(self.scalers, f'{model_dir}/scalers.pkl')
        joblib.dump(self.imputers, f'{model_dir}/imputers.pkl')
        joblib.dump(self.label_encoders, f'{model_dir}/label_encoders.pkl')
        
        # Save metadata
        metadata = {
            'feature_columns': self.feature_columns,
            'target_columns': self.target_columns,
            'telangana_bounds': self.telangana_bounds,
            'standards': self.standards,
            'model_info': {target: {
                'features': len(self.feature_columns),
                'trained_on': datetime.now().isoformat()
            } for target in self.models.keys()}
        }
        
        with open(f'{model_dir}/metadata.json', 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"Models saved to {model_dir}/ directory")
    
    def predict_water_quality(self, latitude, longitude, district=None, mandal=None):
        """Predict water quality for given coordinates"""
        if not self.models:
            raise ValueError("No models trained yet!")
        
        # Prepare input features
        features = {
            'latitude': latitude,
            'longitude': longitude,
            'gwl': 5.0,  # Default groundwater level
            'district_encoded': 0,  # Default district
            'mandal_encoded': 0,   # Default mandal
            'lat_lon_interaction': latitude * longitude,
            'season_encoded': 2,   # Default season
            'year': 2023,          # Current year
            'ph': 7.5,             # Default pH
            'ec_primary': 800,     # Default EC (renamed to match training)
            'carbonate': 0,        # Default carbonate
            'bicarbonate': 200,    # Default bicarbonate
            'sodium': 50,          # Default sodium
            'potassium': 5,        # Default potassium
            'calcium': 40,         # Default calcium
            'magnesium': 30        # Default magnesium
        }
        
        # Encode categorical variables if provided
        if district and 'district' in self.label_encoders:
            try:
                features['district_encoded'] = self.label_encoders['district'].transform([district])[0]
            except ValueError:
                pass  # Use default if district not found
        
        if mandal and 'mandal' in self.label_encoders:
            try:
                features['mandal_encoded'] = self.label_encoders['mandal'].transform([mandal])[0]
            except ValueError:
                pass  # Use default if mandal not found
        
        # Create feature vector
        X = pd.DataFrame([features])
        X = X[self.feature_columns]
        
        # Apply preprocessing
        if 'features' in self.imputers:
            X = self.imputers['features'].transform(X)
        if 'features' in self.scalers:
            X = self.scalers['features'].transform(X)
        
        # Make predictions
        predictions = {}
        for target, model in self.models.items():
            pred = model.predict(X)[0]
            predictions[target] = max(0, pred)  # Ensure non-negative values
        
        # Calculate risk level
        risk_score = predictions.get('pollution_risk', 0.5)
        if risk_score < 0.5:
            risk_level = 'Low'
        elif risk_score < 1.0:
            risk_level = 'Medium'
        elif risk_score < 2.0:
            risk_level = 'High'
        else:
            risk_level = 'Very High'
        
        return {
            'predictions': predictions,
            'risk_level': risk_level,
            'risk_score': risk_score,
            'coordinates': {'latitude': latitude, 'longitude': longitude}
        }

def main():
    """Main training function"""
    print("=== Telangana Groundwater Quality ML Model Trainer ===")
    print()
    
    predictor = TelanganaGroundwaterPredictor()
    
    # Load and prepare data
    df = predictor.load_and_combine_data()
    df_clean = predictor.clean_and_prepare_data(df)
    
    print(f"\nFinal dataset shape: {df_clean.shape}")
    print("\nUnique districts in data:")
    if 'district' in df_clean.columns:
        print(df_clean['district'].value_counts())
    
    # Train models
    results = predictor.train_models(df_clean)
    
    # Save models
    predictor.save_models()
    
    print("\n=== Model Training Summary ===")
    for target, metrics in results.items():
        print(f"{target}: R² = {metrics['r2']:.3f}, RMSE = {metrics['rmse']:.3f}")
    
    # Test prediction
    print("\n=== Sample Prediction ===")
    test_lat, test_lon = 17.3850, 78.4867  # Hyderabad coordinates
    prediction = predictor.predict_water_quality(test_lat, test_lon)
    print(f"Location: {test_lat}, {test_lon}")
    print(f"Risk Level: {prediction['risk_level']}")
    print(f"Risk Score: {prediction['risk_score']:.3f}")
    
    print("\nModel training completed successfully!")

if __name__ == "__main__":
    main()