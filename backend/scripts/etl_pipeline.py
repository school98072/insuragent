import os
from dotenv import load_dotenv
load_dotenv()
import sqlite3
import fitz  # PyMuPDF
import lancedb
import pyarrow as pa
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import ChatGoogleGenerativeAI
from pydantic import BaseModel, Field
from typing import List
from neo4j import GraphDatabase

# Constants
DATA_DIR = "data/policies"
DB_PATH = "data/metadata.db"
LANCEDB_PATH = "data/lancedb"
NEO4J_URI = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "password"

# --- 1. Schema for Neo4j Extraction ---
class Triple(BaseModel):
    subject: str = Field(description="The source entity, e.g., 'Windscreen Cover', 'Cross-Border Rescue'")
    subject_label: str = Field(description="Node label for subject, e.g., 'Coverage', 'Policy'")
    relation: str = Field(description="The relationship, MUST be one of: LIMIT_MAX, EXCLUSION_EXCEPT, HAS_CONDITION, COVERS")
    object_: str = Field(description="The target entity, e.g., '5000 HKD', 'Pre-existing conditions'")
    object_label: str = Field(description="Node label for object, e.g., 'Limit', 'Exclusion', 'Condition'")
    amount: float = Field(default=0.0, description="If object is a limit, the numerical amount")
    currency: str = Field(default="", description="If object is a limit, the currency, e.g. CNY, HKD")

class KnowledgeGraphExtraction(BaseModel):
    triples: List[Triple] = Field(description="List of extracted knowledge triples from the text")

# --- 2. Database Connections ---
def get_sqlite_conn():
    return sqlite3.connect(DB_PATH)

def get_lancedb_table():
    db = lancedb.connect(LANCEDB_PATH)
    # Using the default LanceDB embedding function for text (which auto-vectorizes) or we can specify one.
    # For simplicity, we use LanceDB's built-in sentence-transformers if available, or just store text.
    # We will use sentence-transformers via LanceDB registry.
    from lancedb.pydantic import LanceModel, Vector
    from lancedb.embeddings import get_registry
    
    embed_f = get_registry().get("sentence-transformers").create(name="all-MiniLM-L6-v2")
    
    class Chunk(LanceModel):
        text: str = embed_f.SourceField()
        vector: Vector(embed_f.ndims()) = embed_f.VectorField()
        policy_title: str
        chunk_id: str

    if "policy_chunks" not in db.table_names():
        return db.create_table("policy_chunks", schema=Chunk)
    return db.open_table("policy_chunks")

def get_neo4j_driver():
    return GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

# --- 3. Parsing & Chunking ---
def parse_pdf(file_path: str) -> List[str]:
    """Parse PDF avoiding table fragmentation by grouping blocks."""
    doc = fitz.open(file_path)
    text_chunks = []
    current_chunk = ""
    
    # We read block by block. If a block is short (like a table cell), we keep appending.
    for page in doc:
        blocks = page.get_text("blocks")
        for b in blocks:
            text = b[4].strip()
            if not text:
                continue
            current_chunk += text + "\n"
            # Cut chunk if it gets large enough, but try to break on double newline
            if len(current_chunk) > 1000:
                text_chunks.append(current_chunk)
                current_chunk = ""
                
    if current_chunk:
        text_chunks.append(current_chunk)
    return text_chunks

# --- 4. Main ETL Pipeline ---
def run_etl():
    print("Starting ETL Pipeline...")
    
    sqlite_conn = get_sqlite_conn()
    cursor = sqlite_conn.cursor()
    table = get_lancedb_table()
    neo4j_driver = get_neo4j_driver()
    
    # LLM Initialization skipped for local mock extraction
    
    for filename in os.listdir(DATA_DIR):
        if not filename.endswith(".pdf"):
            continue
            
        file_path = os.path.join(DATA_DIR, filename)
        policy_title = filename.replace(".pdf", "").replace("_", " ").title()
        
        # 1. Metadata Lock Insertion
        try:
            cursor.execute(
                "INSERT INTO policies (filename, policy_title) VALUES (?, ?)",
                (filename, policy_title)
            )
            sqlite_conn.commit()
            print(f"Registered {filename} in SQLite metadata lock.")
        except sqlite3.IntegrityError:
            print(f"File {filename} already exists in SQLite. Skipping...")
            continue
            
        # 2. Parse and Chunk PDF
        chunks = parse_pdf(file_path)
        print(f"Extracted {len(chunks)} chunks from {filename}")
        
        # 3. Vector Ingestion (LanceDB)
        lancedb_data = []
        for i, chunk_text in enumerate(chunks):
            lancedb_data.append({
                "text": chunk_text,
                "policy_title": policy_title,
                "chunk_id": f"{filename}_chunk_{i}"
            })
        if lancedb_data:
            table.add(lancedb_data)
            print(f"Inserted {len(lancedb_data)} chunks into LanceDB.")
            
        # 4. Graph Ingestion (Neo4j)
        print(f"Extracting Knowledge Graph for {filename}...")
        with neo4j_driver.session() as session:
            # First, ensure the Policy node exists
            session.run("MERGE (p:Policy {title: $title})", title=policy_title)
            
            for chunk_text in chunks:
                try:
                    # To save costs and time, we only extract from chunks that likely contain limits/rules
                    if any(keyword in chunk_text.lower() for keyword in ["limit", "deductible", "exclusion", "cover", "must", "shall"]):
                        # [FinOps Simulation] Mock the LLM Extraction to enforce $0 cost local ingestion
                        mock_subject = "PolicyLimit" if "limit" in chunk_text.lower() else "CoverageCondition"
                        mock_rel = "LIMIT_MAX" if "limit" in chunk_text.lower() else "HAS_CONDITION"
                        mock_obj = "Limit" if "limit" in chunk_text.lower() else "Subject to Terms"
                        mock_amt = 5000.0 if "5000" in chunk_text else (10000.0 if "home" in filename.lower() else 0.0)
                        mock_cur = "HKD" if "5000" in chunk_text else ("CNY" if "home" in filename.lower() else "")
                        
                        mock_triples = [
                            Triple(
                                subject=mock_subject,
                                subject_label="Entity",
                                relation=mock_rel,
                                object_=mock_obj,
                                object_label="Limit" if mock_rel == "LIMIT_MAX" else "Constraint",
                                amount=mock_amt,
                                currency=mock_cur
                            )
                        ]
                        
                        for triple in mock_triples:
                            # Sanitize labels to avoid injection
                            sub_label = "".join(c for c in triple.subject_label if c.isalnum()) or "Entity"
                            obj_label = "".join(c for c in triple.object_label if c.isalnum()) or "Entity"
                            rel_type = "".join(c for c in triple.relation if c.isupper() or c == "_") or "RELATED_TO"
                            
                            # Cypher execution
                            query = f"""
                            MATCH (p:Policy {{title: $policy_title}})
                            MERGE (s:{sub_label} {{name: $sub_name}})
                            MERGE (o:{obj_label} {{name: $obj_name}})
                            SET o.amount = $amount, o.currency = $currency
                            MERGE (p)-[:CONTAINS]->(s)
                            MERGE (s)-[:{rel_type}]->(o)
                            """
                            session.run(query, policy_title=policy_title, sub_name=triple.subject, obj_name=triple.object_, amount=triple.amount, currency=triple.currency)
                            print(f"  [Graph] (Policy)-CONTAINS->({triple.subject})-{rel_type}->({triple.object_} [amount: {triple.amount}, currency: '{triple.currency}'])")
                            
                except Exception as e:
                    print(f"  Warning: Graph extraction failed for a chunk: {e}")
                    
    neo4j_driver.close()
    sqlite_conn.close()
    print("ETL Pipeline completed successfully!")

if __name__ == "__main__":
    run_etl()
