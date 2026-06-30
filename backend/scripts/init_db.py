import sqlite3
import os
import time
from neo4j import GraphDatabase, exceptions

# Constants
DB_PATH = "data/metadata.db"
NEO4J_URI = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "password"

def init_sqlite_metadata():
    """Initialize the SQLite metadata lock database."""
    print(f"Initializing SQLite metadata DB at {DB_PATH}...")
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create the policies table for the "物理边界" metadata lock
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS policies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT UNIQUE NOT NULL,
            policy_title TEXT NOT NULL,
            jurisdiction TEXT,
            insurance_category TEXT,
            extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()
    print("SQLite metadata DB initialized successfully.")

def init_neo4j_constraints():
    """Initialize Graph Schema and Constraints to prevent topology fragmentation."""
    print(f"Connecting to Neo4j at {NEO4J_URI}...")
    
    # Wait for Neo4j to be available
    driver = None
    max_retries = 30
    for i in range(max_retries):
        try:
            driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
            driver.verify_connectivity()
            break
        except Exception as e:
            if i == max_retries - 1:
                print(f"Failed to connect to Neo4j after {max_retries} attempts.")
                raise e
            print("Waiting for Neo4j to start...")
            time.sleep(2)
            
    if driver is None:
        return

    print("Connected to Neo4j. Creating constraints...")
    
    # Create constraints using Cypher
    # Note: Neo4j 5 syntax for constraints
    queries = [
        "CREATE CONSTRAINT policy_title_unique IF NOT EXISTS FOR (p:Policy) REQUIRE p.title IS UNIQUE",
        "CREATE CONSTRAINT limit_name_unique IF NOT EXISTS FOR (l:Limit) REQUIRE l.name IS UNIQUE",
        "CREATE CONSTRAINT exclusion_name_unique IF NOT EXISTS FOR (e:Exclusion) REQUIRE e.name IS UNIQUE"
    ]
    
    with driver.session() as session:
        for q in queries:
            try:
                session.run(q)
                print(f"Executed: {q}")
            except exceptions.ClientError as ce:
                print(f"Skipped/Error on constraint: {ce}")
                
    driver.close()
    print("Neo4j Constraints initialized successfully.")

if __name__ == "__main__":
    init_sqlite_metadata()
    init_neo4j_constraints()
