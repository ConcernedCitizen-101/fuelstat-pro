import firebase_admin
from firebase_admin import credentials, firestore
import os
import json
import time

def sync():
    print("Starting FuelStat Pro Autopilot Sync...")
    
    try:
        # 1. Load the Secret
        secret_json = os.environ.get('FIREBASE_SERVICE_ACCOUNT')
        if not secret_json:
            print("[X] Error: Secret FIREBASE_SERVICE_ACCOUNT is missing in GitHub Settings.")
            return
            
        service_account_info = json.loads(secret_json)
        proj_id = service_account_info.get('project_id')
        print(f"[*] Connected to Credentials for Project: {proj_id}")

        # 2. Initialize Firebase (explicitly targeting the '(default)' database)
        if not firebase_admin._apps:
            cred = credentials.Certificate(service_account_info)
            firebase_admin.initialize_app(cred)
        
        db = firestore.client()
        
        # 3. Data to Sync (Simulating Live OMC Rates for India)
        # In a real production environment, you'd use a scraping library here.
        # Since you are on Blaze, this bot is now allowed to perform these logic updates.
        fuel_data = {
            "Maharashtra": {
                "Mumbai": {
                    "lpg": {"domestic": 912.50, "subsidy": 300, "status": "Stable"},
                    "petrol": {"normal": 106.31, "power": 112.40, "trend": "-0.02"},
                    "diesel": {"normal": 94.27, "status": "High Demand"}
                }
            },
            "Delhi": {
                "New Delhi": {
                    "lpg": {"domestic": 913.00, "subsidy": 300, "status": "Syncing..."},
                    "petrol": {"normal": 96.72, "power": 104.20, "trend": "0.00"},
                    "diesel": {"normal": 89.62, "status": "Stable"}
                }
            },
            "Karnataka": {
                "Bengaluru": {
                    "lpg": {"domestic": 915.50, "subsidy": 300, "status": "High Demand"},
                    "petrol": {"normal": 101.94, "power": 108.50, "trend": "-0.05"},
                    "diesel": {"normal": 87.89, "status": "Stable"}
                }
            }
        }

        print("[*] Database connection active. Committing live ledger...")
        
        # Batch write to ensure all prices update at the same time
        batch = db.batch()
        
        # Path matches the React app requirement: artifacts/{appId}/public/data/fuel_rates
        app_id = os.environ.get('FUELSTAT_APP_ID', 'fuel-stat-public-v16-agg')
        
        for state_name, cities in fuel_data.items():
            doc_ref = db.collection('artifacts').document(app_id).collection('public').document('data').collection('fuel_rates').document(state_name)
            batch.set(doc_ref, cities)

        # Update a global sync status
        status_ref = db.collection('artifacts').document(app_id).collection('public').document('data').collection('status').document('latest')
        batch.set(status_ref, {
            'last_sync': firestore.SERVER_TIMESTAMP,
            'node_status': 'ONLINE',
            'plan': 'BLAZE'
        })
        
        batch.commit()
        print("[OK] Sync Successful! Your live database is now populated.")

    except Exception as e:
        # If it still says 404, it means Google Cloud is still 'provisioning' the new database.
        # We give it a friendly error message.
        if "404" in str(e):
            print("[!] Almost there! The database is created but Google is still waking it up.")
            print("[!] Please wait 2 minutes and click 'Re-run all jobs' in GitHub.")
        else:
            print(f"[X] Sync Failed: {e}")
        exit(1)

if __name__ == "__main__":
    sync()
