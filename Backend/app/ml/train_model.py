"""
Trains the disaster-occurrence classifier used by /api/predict.

This preserves the original pipeline from the DTMS project (RandomForest on
Rainfall/Temperature/Humidity predicting `Occurred`) — the intended
functionality is unchanged, only the file location moved under app/ml/ so
it sits next to the model artifact it produces.

Run from the Backend/ directory:
    python -m app.ml.train_model
"""
from pathlib import Path

import pandas as pd
import pickle
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score

DATA_DIR = Path(__file__).resolve().parent

data = pd.read_csv(DATA_DIR / "india_disaster_dataset.csv")

le = LabelEncoder()
data["Disaster_Type_Encoded"] = le.fit_transform(data["Disaster_Type"])

X = data[["Rainfall", "Temperature", "Humidity"]]
y = data["Occurred"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = RandomForestClassifier(n_estimators=100)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
accuracy = accuracy_score(y_test, y_pred)
print("Model Accuracy:", accuracy)

with open(DATA_DIR / "disaster_model.pkl", "wb") as f:
    pickle.dump(model, f)

print("Model saved successfully to", DATA_DIR / "disaster_model.pkl")
