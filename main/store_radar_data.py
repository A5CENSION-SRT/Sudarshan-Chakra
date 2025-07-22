import time
from pymongo import MongoClient

# 🔗 Step 1: Connect to local MongoDB
client = MongoClient("mongodb+srv://snehalreddy:S0OcbrCRXJmAZrAd@sudarshan-chakra-cluste.0hokvj0.mongodb.net/")
db = client["radarDB"]              # Database name
collection = db["scans"]            # Collection name

# 🔁 Track the last inserted line to avoid duplicates
last_line = ""

def store_data():
    global last_line

    print("⏳ Monitoring radar_data.txt for updates...")

    while True:
        try:
            # 📖 Step 2: Open and read lines from the radar data file
            with open("main/radar_data.txt", "r") as file:
                lines = file.readlines()

            # Step 3: Process the latest line
            if lines:
                latest = lines[-1].strip()

                if latest != last_line:  # Only insert if new
                    parts = latest.split(",")
                    if len(parts) == 2:
                        angle = float(parts[0])
                        distance = float(parts[1])

                        # 📦 Step 4: Create MongoDB document
                        document = {
                            "angle": angle,
                            "distance": distance,
                            "timestamp": time.time()
                        }

                        # 🧠 Step 5: Insert into MongoDB
                        collection.insert_one(document)
                        print(f"✅ Inserted: {document}")
                        last_line = latest

            time.sleep(1)  # Wait before checking again

        except Exception as e:
            print(f"❌ Error: {e}")
            time.sleep(2)

# ▶️ Start the data monitoring
store_data()