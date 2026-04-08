"""
ETL Pipeline: Download FEMA Disaster Declarations CSV, clean/normalize, and load into PostgreSQL.

Usage:
    1. Copy ../.env.example to ../.env and fill in your Supabase/PostgreSQL credentials
    2. pip install -r requirements.txt
    3. python load_fema_data.py
Author: Tanmay, Aditya
"""

import os
import sys
import requests
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

FEMA_CSV_URL = (
    "https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries.csv"
)
LOCAL_CSV = Path(__file__).resolve().parent / "fema_disasters_raw.csv"

STATE_FIPS = {
    "01": ("AL", "Alabama"), "02": ("AK", "Alaska"), "04": ("AZ", "Arizona"),
    "05": ("AR", "Arkansas"), "06": ("CA", "California"), "08": ("CO", "Colorado"),
    "09": ("CT", "Connecticut"), "10": ("DE", "Delaware"), "11": ("DC", "District of Columbia"),
    "12": ("FL", "Florida"), "13": ("GA", "Georgia"), "15": ("HI", "Hawaii"),
    "16": ("ID", "Idaho"), "17": ("IL", "Illinois"), "18": ("IN", "Indiana"),
    "19": ("IA", "Iowa"), "20": ("KS", "Kansas"), "21": ("KY", "Kentucky"),
    "22": ("LA", "Louisiana"), "23": ("ME", "Maine"), "24": ("MD", "Maryland"),
    "25": ("MA", "Massachusetts"), "26": ("MI", "Michigan"), "27": ("MN", "Minnesota"),
    "28": ("MS", "Mississippi"), "29": ("MO", "Missouri"), "30": ("MT", "Montana"),
    "31": ("NE", "Nebraska"), "32": ("NV", "Nevada"), "33": ("NH", "New Hampshire"),
    "34": ("NJ", "New Jersey"), "35": ("NM", "New Mexico"), "36": ("NY", "New York"),
    "37": ("NC", "North Carolina"), "38": ("ND", "North Dakota"), "39": ("OH", "Ohio"),
    "40": ("OK", "Oklahoma"), "41": ("OR", "Oregon"), "42": ("PA", "Pennsylvania"),
    "44": ("RI", "Rhode Island"), "45": ("SC", "South Carolina"), "46": ("SD", "South Dakota"),
    "47": ("TN", "Tennessee"), "48": ("TX", "Texas"), "49": ("UT", "Utah"),
    "50": ("VT", "Vermont"), "51": ("VA", "Virginia"), "53": ("WA", "Washington"),
    "54": ("WV", "West Virginia"), "55": ("WI", "Wisconsin"), "56": ("WY", "Wyoming"),
    "60": ("AS", "American Samoa"), "66": ("GU", "Guam"),
    "69": ("MP", "Northern Mariana Islands"), "72": ("PR", "Puerto Rico"),
    "78": ("VI", "Virgin Islands"),
}

ABBREV_TO_FIPS = {v[0]: k for k, v in STATE_FIPS.items()}

INCIDENT_CATEGORIES = {
    "Hurricane": "Weather", "Typhoon": "Weather", "Tornado": "Weather",
    "Severe Storm": "Weather", "Severe Storm(s)": "Weather",
    "Coastal Storm": "Weather", "Snowstorm": "Weather", "Ice Storm": "Weather",
    "Freezing": "Weather", "Severe Ice Storm": "Weather",
    "Flood": "Weather", "Dam/Levee Break": "Weather",
    "Fire": "Fire", "Wildfire": "Fire",
    "Earthquake": "Geological", "Volcano": "Geological",
    "Landslide": "Geological", "Mudslide": "Geological",
    "Tsunami": "Geological",
    "Drought": "Climate", "Extreme Heat": "Climate",
    "Toxic Substances": "Human-Caused", "Chemical": "Human-Caused",
    "Terrorist": "Human-Caused", "Explosion": "Human-Caused",
    "Biological": "Health", "Pandemic": "Health",
    "Other": "Other",
}


def get_db_connection():
    return psycopg2.connect(
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT", "5432"),
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
    )


def download_csv():
    if LOCAL_CSV.exists():
        print(f"  Using cached CSV: {LOCAL_CSV}")
        return
    print(f"  Downloading FEMA CSV from {FEMA_CSV_URL} ...")
    resp = requests.get(FEMA_CSV_URL, stream=True, timeout=300)
    resp.raise_for_status()
    with open(LOCAL_CSV, "wb") as f:
        for chunk in resp.iter_content(chunk_size=8192):
            f.write(chunk)
    print(f"  Saved to {LOCAL_CSV}")


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Standardize column names, parse dates, normalize types."""
    date_cols = [
        "declarationDate", "incidentBeginDate", "incidentEndDate",
        "disasterCloseoutDate",
    ]
    for col in date_cols:
        if col in df.columns:
            df[col] = pd.to_datetime(df[col], errors="coerce", utc=True)
            df[col] = df[col].dt.date

    bool_cols = [
        "ihProgramDeclared", "iaProgramDeclared",
        "paProgramDeclared", "hmProgramDeclared",
    ]
    for col in bool_cols:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip().str.lower().map(
                {"true": True, "1": True, "yes": True}
            ).fillna(False)

    df["incidentType"] = df["incidentType"].str.strip()
    df["incidentType"] = df["incidentType"].replace(
        {"Severe Storm(s)": "Severe Storm", "Mud/Landslide": "Mudslide"}
    )

    df["fipsStateCode"] = df["fipsStateCode"].astype(str).str.zfill(2)
    df["fipsCountyCode"] = df["fipsCountyCode"].astype(str).str.zfill(3)
    df["state"] = df["state"].str.strip().str.upper()

    return df


def load_states(cur):
    print("  Loading states ...")
    rows = [(code, abbr, name) for code, (abbr, name) in STATE_FIPS.items()]
    execute_values(
        cur,
        "INSERT INTO states (state_code, state_abbrev, state_name) VALUES %s ON CONFLICT DO NOTHING",
        rows,
    )
    print(f"    {len(rows)} states/territories loaded")


def load_declaration_types(cur):
    print("  Loading declaration types ...")
    cur.execute("""
        INSERT INTO declaration_types (type_code, type_name, description) VALUES
        ('DR', 'Major Disaster', 'A Major Disaster Declaration provides a wide range of federal assistance programs for individuals and public infrastructure.'),
        ('EM', 'Emergency', 'An Emergency Declaration is more limited in scope and does not include long-term federal recovery programs.'),
        ('FM', 'Fire Management', 'Fire Management Assistance provides grants to states, tribes, and local governments for the mitigation, management, and control of fires.')
        ON CONFLICT DO NOTHING
    """)


def load_incident_types(cur, df: pd.DataFrame):
    print("  Loading incident types ...")
    unique_types = df["incidentType"].dropna().unique()
    rows = []
    for t in sorted(unique_types):
        cat = INCIDENT_CATEGORIES.get(t, "Other")
        rows.append((t, cat))
    execute_values(
        cur,
        "INSERT INTO incident_types (incident_type_name, category) VALUES %s ON CONFLICT DO NOTHING",
        rows,
    )
    print(f"    {len(rows)} incident types loaded")

    cur.execute("SELECT incident_type_id, incident_type_name FROM incident_types")
    return {name: tid for tid, name in cur.fetchall()}


def safe_date(val):
    """Convert pandas date to Python date or None."""
    if pd.isna(val):
        return None
    return val


def load_disasters(cur, df: pd.DataFrame, type_map: dict):
    print("  Loading disasters ...")
    disaster_df = df.drop_duplicates(subset=["disasterNumber"]).copy()
    rows = []
    skipped = 0
    for _, r in disaster_df.iterrows():
        itype = r.get("incidentType")
        if itype not in type_map:
            skipped += 1
            continue
        rows.append((
            int(r["disasterNumber"]),
            str(r["declarationType"]).strip(),
            type_map[itype],
            str(r.get("declarationTitle", ""))[:255],
            safe_date(r.get("declarationDate")),
            safe_date(r.get("incidentBeginDate")),
            safe_date(r.get("incidentEndDate")),
            safe_date(r.get("disasterCloseoutDate")),
            bool(r.get("ihProgramDeclared", False)),
            bool(r.get("iaProgramDeclared", False)),
            bool(r.get("paProgramDeclared", False)),
            bool(r.get("hmProgramDeclared", False)),
        ))
    execute_values(
        cur,
        """INSERT INTO disasters (
            disaster_number, declaration_type, incident_type_id, declaration_title,
            declaration_date, incident_begin_date, incident_end_date, closeout_date,
            ih_program, ia_program, pa_program, hm_program
        ) VALUES %s ON CONFLICT (disaster_number) DO NOTHING""",
        rows,
    )
    print(f"    {len(rows)} disasters loaded, {skipped} skipped")


def load_disaster_areas(cur, df: pd.DataFrame):
    print("  Loading disaster areas ...")
    areas = df[["disasterNumber", "state", "fipsCountyCode", "designatedArea", "placeCode"]].copy()
    areas = areas.drop_duplicates(subset=["disasterNumber", "state", "placeCode"])

    rows = []
    for _, r in areas.iterrows():
        state_abbrev = str(r["state"]).strip().upper()
        state_code = ABBREV_TO_FIPS.get(state_abbrev)
        if not state_code:
            continue
        rows.append((
            int(r["disasterNumber"]),
            state_code,
            str(r.get("fipsCountyCode", ""))[:5],
            str(r.get("designatedArea", ""))[:255],
            str(r.get("placeCode", ""))[:10],
        ))

    batch_size = 5000
    total = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i : i + batch_size]
        execute_values(
            cur,
            """INSERT INTO disaster_areas (
                disaster_number, state_code, fips_county_code, designated_area, place_code
            ) VALUES %s ON CONFLICT DO NOTHING""",
            batch,
        )
        total += len(batch)
        print(f"    ... {total}/{len(rows)} area records inserted")

    print(f"    {len(rows)} area records loaded")


def main():
    print("=" * 60)
    print("FEMA Disaster Declarations ETL Pipeline")
    print("=" * 60)

    print("\n[1/6] Downloading CSV ...")
    download_csv()

    print("\n[2/6] Reading & cleaning data ...")
    df = pd.read_csv(LOCAL_CSV, low_memory=False)
    print(f"    Raw rows: {len(df)}")
    df = clean_dataframe(df)
    print(f"    Cleaned rows: {len(df)}")
    print(f"    Unique disasters: {df['disasterNumber'].nunique()}")
    print(f"    Date range: {df['declarationDate'].min()} to {df['declarationDate'].max()}")

    print("\n[3/6] Connecting to database ...")
    conn = get_db_connection()
    conn.autocommit = False
    cur = conn.cursor()

    try:
        print("\n[4/6] Loading reference data ...")
        load_states(cur)
        load_declaration_types(cur)
        type_map = load_incident_types(cur, df)

        print("\n[5/6] Loading disasters ...")
        load_disasters(cur, df, type_map)

        print("\n[6/6] Loading disaster areas ...")
        load_disaster_areas(cur, df)

        conn.commit()
        print("\n" + "=" * 60)
        print("ETL COMPLETE - All data loaded successfully!")
        print("=" * 60)

    except Exception as e:
        conn.rollback()
        print(f"\nERROR: {e}")
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    main()
