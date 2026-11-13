"""
Model Training: RandomForest Classifier for Child Nutrition Risk Screening
Version: 3.0 (Pediatric WHO & PM POSHAN Aligned)

DISCLAIMER:
This model is trained on a synthetic benchmark dataset for educational and software
engineering experimentation within the Mid-Day Meal scheme framework. It serves as an
assistive pattern recognition tool and does NOT provide clinically validated medical
or malnutrition diagnoses.
"""

import os
import json
import pickle
from datetime import datetime
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split, cross_validate, StratifiedKFold
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_recall_fscore_support,
    classification_report,
    confusion_matrix
)

FEATURE_COLUMNS = [
    'age',
    'gender',
    'height_cm',
    'weight_kg',
    'bmi',
    'pediatric_z_score_category',
    'full_day_calories_required',
    'full_day_protein_required',
    'school_meal_calories_target',
    'school_meal_protein_target',
    'actual_school_calories_served',
    'actual_school_protein_served',
    'school_meal_calorie_fulfillment_pct',
    'school_meal_protein_fulfillment_pct',
    'seven_day_avg_daily_calories',
    'seven_day_avg_daily_protein',
    'recorded_school_days_count'
]

CLASS_MAP = {
    0: 'Healthy',
    1: 'At Risk',
    2: 'Underweight'
}

def load_and_validate_dataset(filepath):
    """Load and validate dataset format and missing values"""
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Dataset file not found at: {filepath}")

    df = pd.read_csv(filepath)
    print(f"✓ Dataset loaded: {len(df)} records from {os.path.basename(filepath)}")

    # Check for missing values
    missing_count = df.isnull().sum().sum()
    if missing_count > 0:
        print(f"⚠️ Warning: Found {missing_count} missing values; imputing or dropping...")
        df = df.dropna()

    # Validate feature columns exist
    missing_cols = [c for c in FEATURE_COLUMNS + ['status'] if c not in df.columns]
    if missing_cols:
        raise ValueError(f"Missing required columns in dataset: {missing_cols}")

    return df

def train_and_evaluate():
    print("=" * 65)
    print("RANDOM FOREST NUTRITION SCREENING MODEL TRAINING PIPELINE")
    print("=" * 65)

    base_dir = os.path.dirname(__file__)
    dataset_path = os.path.join(base_dir, 'dataset.csv')
    df = load_and_validate_dataset(dataset_path)

    X = df[FEATURE_COLUMNS]
    y = df['status']

    print(f"\nFeatures ({len(FEATURE_COLUMNS)} columns):")
    for i, col in enumerate(FEATURE_COLUMNS, 1):
        print(f"  {i:2d}. {col}")

    # Stratified Train/Test Split (80% train, 20% test)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=0.20,
        random_state=42,
        stratify=y
    )

    print(f"\nDataset Split:")
    print(f"  Training samples: {len(X_train)} (80%)")
    print(f"  Testing samples : {len(X_test)} (20%)")

    # Initialize RandomForest with robust hyperparameters to prevent overfitting
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=8,
        min_samples_split=4,
        min_samples_leaf=2,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1
    )

    print("\nTraining RandomForestClassifier...")
    model.fit(X_train, y_train)
    print("✓ Model training completed successfully")

    # Evaluate on held-out test data
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)

    test_acc = accuracy_score(y_test, y_pred)
    precision, recall, f1, support = precision_recall_fscore_support(
        y_test, y_pred, average='weighted', zero_division=0
    )
    macro_prec, macro_rec, macro_f1, _ = precision_recall_fscore_support(
        y_test, y_pred, average='macro', zero_division=0
    )

    cm = confusion_matrix(y_test, y_pred)

    print("\n" + "=" * 65)
    print("HELD-OUT TEST SET EVALUATION (20% Unseen Data)")
    print("=" * 65)
    print(f"Accuracy         : {test_acc:.4f} ({test_acc*100:.2f}%)")
    print(f"Weighted F1      : {f1:.4f}")
    print(f"Weighted Precision: {precision:.4f}")
    print(f"Weighted Recall  : {recall:.4f}")
    print(f"Macro F1         : {macro_f1:.4f}")

    print("\nClassification Report:")
    report_dict = classification_report(
        y_test, y_pred,
        target_names=[CLASS_MAP[i] for i in sorted(CLASS_MAP.keys())],
        digits=4,
        output_dict=True
    )
    print(classification_report(
        y_test, y_pred,
        target_names=[CLASS_MAP[i] for i in sorted(CLASS_MAP.keys())],
        digits=4
    ))

    print("Confusion Matrix:")
    print(f"{'':15} Predicted Healthy | At Risk | Underweight")
    for i, label in CLASS_MAP.items():
        print(f"Actual {label:<10} : {cm[i][0]:15d} | {cm[i][1]:7d} | {cm[i][2]:11d}")

    # 5-fold cross validation on training data
    print("\n" + "=" * 65)
    print("5-FOLD STRATIFIED CROSS-VALIDATION (Training Set)")
    print("=" * 65)
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_res = cross_validate(
        model, X_train, y_train,
        cv=cv,
        scoring=['accuracy', 'precision_weighted', 'recall_weighted', 'f1_weighted'],
        n_jobs=-1
    )
    print(f"CV Accuracy : {cv_res['test_accuracy'].mean():.4f} (+/- {cv_res['test_accuracy'].std():.4f})")
    print(f"CV F1-Score : {cv_res['test_f1_weighted'].mean():.4f} (+/- {cv_res['test_f1_weighted'].std():.4f})")

    # Feature Importances
    print("\nTop Contributing Features:")
    importances = model.feature_importances_
    sorted_indices = np.argsort(importances)[::-1]
    feature_importance_dict = {}
    for rank, idx in enumerate(sorted_indices, 1):
        feat = FEATURE_COLUMNS[idx]
        imp = float(importances[idx])
        feature_importance_dict[feat] = imp
        print(f"  {rank:2d}. {feat:<38} : {imp:.4f} ({imp*100:.1f}%)")

    # Save artifacts
    model_save_path = os.path.join(base_dir, 'model.pkl')
    with open(model_save_path, 'wb') as f:
        pickle.dump(model, f)
    print(f"\n✓ Saved model artifact to: {model_save_path}")

    # Save comprehensive metadata
    metadata = {
        'model_name': 'RandomForestClassifier',
        'model_version': '3.0.0',
        'training_timestamp': datetime.now().isoformat(),
        'feature_columns': FEATURE_COLUMNS,
        'feature_count': len(FEATURE_COLUMNS),
        'class_map': {str(k): v for k, v in CLASS_MAP.items()},
        'hyperparameters': {
            'n_estimators': 100,
            'max_depth': 8,
            'min_samples_split': 4,
            'min_samples_leaf': 2,
            'class_weight': 'balanced',
            'random_state': 42
        },
        'evaluation': {
            'test_accuracy': float(round(test_acc, 4)),
            'test_weighted_f1': float(round(f1, 4)),
            'test_macro_f1': float(round(macro_f1, 4)),
            'test_precision': float(round(precision, 4)),
            'test_recall': float(round(recall, 4)),
            'confusion_matrix': cm.tolist(),
            'per_class': {
                'Healthy': {
                    'precision': float(round(report_dict['Healthy']['precision'], 4)),
                    'recall': float(round(report_dict['Healthy']['recall'], 4)),
                    'f1_score': float(round(report_dict['Healthy']['f1-score'], 4)),
                    'support': int(report_dict['Healthy']['support'])
                },
                'At Risk': {
                    'precision': float(round(report_dict['At Risk']['precision'], 4)),
                    'recall': float(round(report_dict['At Risk']['recall'], 4)),
                    'f1_score': float(round(report_dict['At Risk']['f1-score'], 4)),
                    'support': int(report_dict['At Risk']['support'])
                },
                'Underweight': {
                    'precision': float(round(report_dict['Underweight']['precision'], 4)),
                    'recall': float(round(report_dict['Underweight']['recall'], 4)),
                    'f1_score': float(round(report_dict['Underweight']['f1-score'], 4)),
                    'support': int(report_dict['Underweight']['support'])
                }
            },
            'cv_mean_accuracy': float(round(cv_res['test_accuracy'].mean(), 4)),
            'cv_std_accuracy': float(round(cv_res['test_accuracy'].std(), 4))
        },
        'feature_importances': feature_importance_dict,
        'dataset_info': {
            'type': 'synthetic',
            'total_samples': len(df),
            'train_samples': len(X_train),
            'test_samples': len(X_test),
            'source_standards': 'WHO Pediatric Growth Reference 5-19 & PM POSHAN 2021 Norms'
        },
        'disclaimer': (
            'AI-assisted screening tool for research/educational prototyping in the '
            'Mid-Day Meal scheme. NOT clinically validated and NOT a substitute for professional medical diagnosis.'
        )
    }

    metadata_save_path = os.path.join(base_dir, 'model_metadata.json')
    with open(metadata_save_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"✓ Saved metadata to: {metadata_save_path}")

    print("\n" + "=" * 65)
    print("PIPELINE EXECUTION COMPLETE & VERIFIED")
    print("=" * 65)

if __name__ == '__main__':
    train_and_evaluate()
