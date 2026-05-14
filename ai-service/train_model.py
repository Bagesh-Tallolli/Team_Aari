"""
Model Training: RandomForest Classifier for Malnutrition Prediction
Includes cross-validation, feature importance, and model evaluation
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score, cross_validate
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
import pickle
import os
import json

def load_dataset(filename='dataset.csv'):
    """Load the generated dataset"""
    filepath = os.path.join(os.path.dirname(__file__), filename)
    df = pd.read_csv(filepath)
    print(f"✓ Dataset loaded: {len(df)} records")
    return df

def prepare_features(df):
    """Prepare features and labels for training"""
    # Features: all except status
    feature_columns = ['age', 'gender', 'height', 'weight', 'bmi', 
                       'avg_weekly_calories', 'required_calories', 'calorie_ratio']
    
    X = df[feature_columns]
    y = df['status']  # Target: 0=Healthy, 1=At Risk, 2=Underweight
    
    return X, y, feature_columns

def train_model(X_train, y_train):
    """Train RandomForest classifier"""
    print("\n🤖 TRAINING RANDOMFOREST CLASSIFIER...")
    print("-" * 60)
    
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
        class_weight='balanced'  # Handle class imbalance
    )
    
    model.fit(X_train, y_train)
    print(f"✓ Model trained on {len(X_train)} samples")
    
    return model

def evaluate_model(model, X_train, y_train, X_test, y_test):
    """Evaluate model on train and test sets"""
    print("\n📊 MODEL EVALUATION")
    print("=" * 60)
    
    # Training accuracy
    y_train_pred = model.predict(X_train)
    train_acc = accuracy_score(y_train, y_train_pred)
    print(f"\n📈 TRAINING SET:")
    print(f"   Accuracy: {train_acc:.4f}")
    
    # Test accuracy
    y_test_pred = model.predict(X_test)
    test_acc = accuracy_score(y_test, y_test_pred)
    print(f"\n📈 TEST SET:")
    print(f"   Accuracy: {test_acc:.4f}")
    
    # Classification report
    print(f"\n📋 CLASSIFICATION REPORT (Test Set):")
    print("-" * 60)
    status_names = {0: 'Healthy', 1: 'At Risk', 2: 'Underweight'}
    report = classification_report(
        y_test, y_test_pred,
        target_names=[status_names[i] for i in sorted(status_names.keys())],
        digits=4
    )
    print(report)
    
    # Confusion matrix
    print("\n🔲 CONFUSION MATRIX (Test Set):")
    print("-" * 60)
    cm = confusion_matrix(y_test, y_test_pred)
    print("        Predicted")
    print("        Healthy  AtRisk  UnderWt")
    labels = ['Healthy   ', 'At Risk   ', 'UnderWt   ']
    for i, label in enumerate(labels):
        print(f"Actual {label} {cm[i]}")
    
    return train_acc, test_acc

def cross_validation(model, X, y):
    """Perform 5-fold cross-validation"""
    print("\n🔄 CROSS-VALIDATION (5-Fold):")
    print("-" * 60)
    
    scoring = {
        'accuracy': 'accuracy',
        'precision_weighted': 'precision_weighted',
        'recall_weighted': 'recall_weighted',
        'f1_weighted': 'f1_weighted'
    }
    
    cv_results = cross_validate(model, X, y, cv=5, scoring=scoring, n_jobs=-1)
    
    print(f"   Accuracy         : {cv_results['test_accuracy'].mean():.4f} (+/- {cv_results['test_accuracy'].std():.4f})")
    print(f"   Precision        : {cv_results['test_precision_weighted'].mean():.4f} (+/- {cv_results['test_precision_weighted'].std():.4f})")
    print(f"   Recall           : {cv_results['test_recall_weighted'].mean():.4f} (+/- {cv_results['test_recall_weighted'].std():.4f})")
    print(f"   F1-Score         : {cv_results['test_f1_weighted'].mean():.4f} (+/- {cv_results['test_f1_weighted'].std():.4f})")
    
    return cv_results

def feature_importance(model, feature_columns):
    """Display feature importance"""
    print("\n🎯 FEATURE IMPORTANCE:")
    print("-" * 60)
    
    importances = model.feature_importances_
    indices = np.argsort(importances)[::-1]
    
    for i, idx in enumerate(indices):
        print(f"   {i+1}. {feature_columns[idx]:25} : {importances[idx]:.4f}")
    
    return dict(zip(feature_columns, importances))

def save_model(model, filename='model.pkl'):
    """Save trained model to pickle file"""
    filepath = os.path.join(os.path.dirname(__file__), filename)
    with open(filepath, 'wb') as f:
        pickle.dump(model, f)
    print(f"\n✓ Model saved: {filename}")
    return filepath

def save_model_metadata(feature_columns, class_map, filename='model_metadata.json'):
    """Save model metadata for inference"""
    metadata = {
        'feature_columns': feature_columns,
        'class_map': class_map,
        'model_version': '1.0',
        'description': 'RandomForest classifier for malnutrition prediction'
    }
    
    filepath = os.path.join(os.path.dirname(__file__), filename)
    with open(filepath, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"✓ Model metadata saved: {filename}")
    return filepath

def main():
    """Main training pipeline"""
    print("\n" + "="*60)
    print("MALNUTRITION PREDICTION MODEL TRAINING PIPELINE")
    print("="*60)
    
    # Load dataset
    df = load_dataset('dataset.csv')
    
    # Prepare features and labels
    X, y, feature_columns = prepare_features(df)
    print(f"✓ Features prepared: {len(feature_columns)} features")
    
    # Train-test split (80/20)
    print(f"\n🔀 TRAIN-TEST SPLIT:")
    print(f"   Train: 80% ({int(len(df)*0.8)} samples)")
    print(f"   Test : 20% ({int(len(df)*0.2)} samples)")
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Train model
    model = train_model(X_train, y_train)
    
    # Evaluate model
    train_acc, test_acc = evaluate_model(model, X_train, y_train, X_test, y_test)
    
    # Cross-validation
    cv_results = cross_validation(model, X_train, y_train)
    
    # Feature importance
    feature_imp = feature_importance(model, feature_columns)
    
    # Check performance criteria
    print("\n" + "="*60)
    print("✅ PERFORMANCE CHECK:")
    print("-" * 60)
    print(f"   Test Accuracy: {test_acc:.4f}")
    if test_acc > 0.80:
        print(f"   ✓ Accuracy > 80%: PASSED")
    else:
        print(f"   ✗ Accuracy > 80%: FAILED")
    
    cv_acc = cv_results['test_accuracy'].mean()
    print(f"   CV Accuracy: {cv_acc:.4f}")
    if cv_acc > 0.80:
        print(f"   ✓ CV Accuracy > 80%: PASSED")
    
    # Save model and metadata
    class_map = {0: 'Healthy', 1: 'At Risk', 2: 'Underweight'}
    save_model(model, 'model.pkl')
    save_model_metadata(feature_columns, class_map, 'model_metadata.json')
    
    print("\n" + "="*60)
    print("✅ MODEL TRAINING COMPLETE!")
    print("="*60)
    print(f"\n📦 Output files generated:")
    print(f"   - model.pkl (trained model)")
    print(f"   - model_metadata.json (feature columns & class mapping)")
    print(f"\n🚀 Ready for production deployment!")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
print(f"  - Classes: Healthy (0), At Risk (1), Underweight (2)")
print("✓ Model saved to: model.pkl")
print("✓ Scaler saved to: scaler.pkl")

# Test the model
print("\nTesting model predictions:")
test_samples = [
    [12, 20, 1800, 50],  # Should be Healthy (0)
    [12, 17, 1400, 35],  # Should be At Risk (1)
    [12, 14, 1100, 22],  # Should be Underweight (2)
]

classes = {0: "Healthy", 1: "At Risk", 2: "Underweight"}

for sample in test_samples:
    X_test = np.array([sample])
    X_test_scaled = scaler.transform(X_test)
    prediction = model.predict(X_test_scaled)[0]
    confidence = model.predict_proba(X_test_scaled)[0]
    
    print(f"  Input: age={sample[0]}, bmi={sample[1]}, calories={sample[2]}, protein={sample[3]}")
    print(f"  Prediction: {classes[prediction]} (confidence: {max(confidence):.2%})")
