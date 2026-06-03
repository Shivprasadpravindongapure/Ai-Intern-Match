import sys
from app.database import Base, engine

# Make sure all models are imported so Base knows about them
import app.models.user
import app.models.resume
import app.models.job
import app.models.match_result
import app.models.application
import app.models.user_profile
import app.models.profile_analysis
import app.models.discovered_job
import app.models.notification

def reset_db():
    print("Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("Creating all tables with new schema...")
    Base.metadata.create_all(bind=engine)
    print("Database reset successfully.")

if __name__ == "__main__":
    reset_db()
