import firebase_admin
from firebase_admin import credentials, firestore
import os
import json

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
        print(f"[*] Attempting to connect to Project: {proj_id}")

        # 2. Initialize Firebase
        cred = credentials.Certificate(service_account_info)
        # We explicitly tell it which project to use
        firebase_admin.initialize_app(cred, {
            'projectId': proj_id,
        })
        
        db = firestore.client()
        
        # 3. Test Write (Check if database is alive)
        print("[*] Database connection initiated. Testing write...")
        test_ref = db.collection('artifacts').document('status')
        test_ref.set({'last_sync': firestore.SERVER_TIMESTAMP, 'online': True})
        
        print("[OK] Sync Successful! Database is online and updated.")

    except Exception as e:
        print(f"[X] Sync Failed: {e}")
        exit(1) # This tells GitHub the run failed

if __name__ == "__main__":
    sync()
