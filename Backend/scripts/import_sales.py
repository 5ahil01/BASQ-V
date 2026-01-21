import pandas as pd
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get Database URL
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL not found in .env file")

# Patch localhost to 127.0.0.1 to avoid Windows DNS issues
if "@localhost" in DATABASE_URL:
    print("Replacing 'localhost' with '127.0.0.1' in DATABASE_URL...")
    DATABASE_URL = DATABASE_URL.replace("@localhost", "@127.0.0.1")

print(f"Connecting to database...")
engine = create_engine(DATABASE_URL)

excel_file = "Sales.xlsx"

if not os.path.exists(excel_file):
    raise FileNotFoundError(f"{excel_file} not found in the current directory.")

print(f"Reading {excel_file}...")
try:
    # Read the Excel file
    df = pd.read_excel(excel_file)
    
    print(f"Importing {len(df)} rows to table 'sales'...")
    
    # Store in PostgreSQL
    df.to_sql('sales', engine, if_exists='replace', index=False)
    
    print("Data imported successfully!")

except Exception as e:
    print(f"An error occurred: {e}")
