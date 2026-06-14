import uvicorn
import os
import sys

# Add the parent directory to sys.path to resolve the 'backend' package namespace
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

if __name__ == "__main__":
    # Ensure database seeding on startup if not already seeded
    # We will import our seed routine dynamically to trigger it
    print("Initializing ChessMaster AI Trainer Database...")
    try:
        from backend.app.database import seed
        seed.seed_database()
        print("Database initialization complete.")
    except Exception as e:
        print(f"Database initialization warning: {str(e)}")
        
    print("Starting ChessMaster AI Trainer FastAPI Server...")
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
