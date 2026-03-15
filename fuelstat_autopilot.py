import os
import json
import firebase_admin
from firebase_admin import credentials, firestore

# The APP_ID used for public ledger storage
APP_ID = os.getenv('FUELSTAT_APP_ID', 'fuel-stat-public-v16-agg')

def initialize_firebase():
    # Looks for the secret we set in GitHub
    cred_json = os.getenv('FIREBASE_SERVICE_ACCOUNT')
    if not cred_json:
        raise ValueError("CRITICAL: FIREBASE_SERVICE_ACCOUNT secret is missing in GitHub Settings.")
    
    cred_dict = json.loads(cred_json)
    cred = credentials.Certificate(cred_dict)
    
    if not firebase_admin._apps:
        firebase_admin.initialize_app(cred)
    return firestore.client()

def fetch_latest_fuel_rates():
    """
    Simulated API Call to Oil Marketing Companies (OMC).
    In production, this would use 'requests' to pull real-time data.
    """
    return {
        "Maharashtra": {
            "Mumbai": { 
                "lpg": { "domestic": 912.50, "subsidy": 300, "status": "Stable" },
                "petrol": { "power": 112.40, "normal": 106.31, "trend": "+0.12" },
                "diesel": { "normal": 94.27, "status": "Stable" }
            },
            "Pune": { 
                "lpg": { "domestic": 916.00, "subsidy": 300, "status": "Tight" },
                "petrol": { "power": 111.80, "normal": 105.90, "trend": "0.00" },
                "diesel": { "normal": 93.50, "status": "Critical" }
            }
        },
        "Delhi": {
            "New Delhi": { 
                "lpg": { "domestic": 913.00, "subsidy": 300, "status": "High Demand" },
                "petrol": { "power": 104.20, "normal": 96.72, "trend": "+0.15" },
                "diesel": { "normal": 89.62, "status": "Stable" }
            }
        }
    }

def sync_to_public_ledger(db, rates_data):
    # Path follows Rule 1: /artifacts/{appId}/public/data/{collectionName}
    collection_path = f"artifacts/{APP_ID}/public/data/fuel_rates"
    rates_ref = db.collection(collection_path)
    
    batch = db.batch()
    for state, cities_data in rates_data.items():
        doc_ref = rates_ref.document(state)
        # Merge ensures we don't overwrite other cities if we only update one
        batch.set(doc_ref, cities_data, merge=True)
    
    batch.commit()
    print(f"[✓] Successfully updated public ledger for {len(rates_data)} states.")

if __name__ == "__main__":
    print("Starting FuelStat Pro Autopilot Sync...")
    try:
        client = initialize_firebase()
        rates = fetch_latest_fuel_rates()
        sync_to_public_ledger(client, rates)
    except Exception as e:
        print(f"[X] Sync Failed: {str(e)}")
        exit(1)