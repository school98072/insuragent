import os
import json
import asyncio
from typing import List, Dict, Any
from pydantic import BaseModel, Field

# Ensure correct sys path to load app modules
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from langchain_core.messages import SystemMessage, HumanMessage
from app.services.ai.llm_factory import get_structured_llm
from app.core.config import settings

# ---------------------------------------------------------------------------
# Pydantic Schemas for Generation
# ---------------------------------------------------------------------------

class GoldenCase(BaseModel):
    query: str = Field(description="A realistic, colloquial, or ambiguous user query related to the insurance clause.")
    standard_answer: str = Field(description="The standard, precise reference answer derived strictly from the clause.")
    cited_section: str = Field(description="The exact clause number or section citation from the text.")

class GoldenDataset(BaseModel):
    cases: List[GoldenCase]

class NoisyCase(BaseModel):
    clean_text: str = Field(description="The original clean receipt or medical text.")
    noisy_text: str = Field(description="The simulated corrupted version containing typos, OCR errors, missing info, or formatting issues.")
    error_type: str = Field(description="Description of the injected noise (e.g., OCR character replacement, missing total amount, date mismatch).")

class NoisyDataset(BaseModel):
    cases: List[NoisyCase]

# ---------------------------------------------------------------------------
# Synthetic Data Generator
# ---------------------------------------------------------------------------

async def generate_golden_dataset(clauses_text: str) -> List[Dict[str, Any]]:
    print("[Pipeline] Generating 50 golden RAG test cases...")
    
    # Using get_structured_llm with GoldenDataset schema
    llm, provider = get_structured_llm(GoldenDataset, settings.DIALOG_AGENT_MODEL)
    print(f"[Pipeline] Connected to model provider: {provider}")
    
    all_cases = []
    # We generate in 5 batches of 10 to guarantee quality and avoid output length overflow
    for batch_idx in range(5):
        print(f"  - Generating batch {batch_idx + 1}/5...")
        prompt = (
            f"You are an insurance actuarial testing system. We need to build a benchmark test set.\n"
            f"Based on the following raw policy clauses, generate exactly 10 diverse, realistic user queries.\n"
            f"Queries should mimic real broker or adjuster questions: some should be colloquial, some vague, some containing irrelevant distractions, "
            f"and others asking about specific exclusions. Provide the standard answer based ONLY on the clauses, and cite the section.\n\n"
            f"=== Raw Policy Clauses ===\n{clauses_text}\n\n"
            f"Generate exactly 10 distinct cases for this batch."
        )
        try:
            result: GoldenDataset = await llm.ainvoke([
                SystemMessage(content="You are a data synthesis pipeline. Return Pydantic structured output only."),
                HumanMessage(content=prompt)
            ])
            for case in result.cases:
                all_cases.append({
                    "query": case.query,
                    "standard_answer": case.standard_answer,
                    "cited_section": case.cited_section
                })
        except Exception as e:
            print(f"  [Error] Batch {batch_idx + 1} generation failed: {e}. Retrying in 2 seconds...")
            await asyncio.sleep(2)
            # Simple retry
            result: GoldenDataset = await llm.ainvoke([
                SystemMessage(content="You are a data synthesis pipeline. Return Pydantic structured output only."),
                HumanMessage(content=prompt)
            ])
            for case in result.cases:
                all_cases.append({
                    "query": case.query,
                    "standard_answer": case.standard_answer,
                    "cited_section": case.cited_section
                })
                
    return all_cases[:50]

async def generate_noisy_dataset() -> List[Dict[str, Any]]:
    print("[Pipeline] Generating noisy document OCR datasets...")
    
    clean_receipt_texts = [
        "Insurant: John Doe. Date: 2026-06-15. Invoice No: INV-9910A. Hospital: San Jose Clinic. Treatment: Fracture Cast. Total Paid: $1,250 USD.",
        "Patient: Alice Smith. Collision Date: 2026-06-20. Garage: Tokyo Auto Body. Repair: Rear Bumper Replacement. Parts: $4,500. Labor: $1,500. Total: $6,000 HKD.",
        "Insured: Bob Martin. Flight No: SQ-809. Date: 2026-06-25. Original Departure: 14:00. Actual Departure: 23:30. Delay: 9.5 hours. Carrier: Singapore Airlines."
    ]
    
    llm, provider = get_structured_llm(NoisyDataset, settings.DIALOG_AGENT_MODEL)
    
    all_noisy = []
    for doc in clean_receipt_texts:
        prompt = (
            f"Based on the following clean structured claim text, generate 4 different corrupted versions of it "
            f"to simulate real OCR failures. Introduce error types like:\n"
            f"1. Typical OCR typos (e.g. replacing '1' with 'l', '0' with 'O', adding typo glyphs).\n"
            f"2. Formatting chaos (messy spacing, table structural corruption).\n"
            f"3. Crucial info omission (removing total amount or patient name).\n"
            f"4. Conflicting dates or amounts.\n\n"
            f"=== Clean Text ===\n{doc}"
        )
        try:
            result: NoisyDataset = await llm.ainvoke([
                SystemMessage(content="You are an adversarial testing pipeline. Return Pydantic structured output only."),
                HumanMessage(content=prompt)
            ])
            for case in result.cases:
                all_noisy.append({
                    "clean_text": case.clean_text,
                    "noisy_text": case.noisy_text,
                    "error_type": case.error_type
                })
        except Exception as e:
            print(f"  [Error] Noisy generation failed for doc: {e}")
            
    return all_noisy

async def main():
    raw_clauses_path = "data/raw_clauses.txt"
    golden_output_path = "data/golden_rag_dataset.json"
    noisy_output_path = "data/noisy_doc_dataset.json"
    
    os.makedirs("data", exist_ok=True)
    
    if not os.path.exists(raw_clauses_path):
        print(f"[Pipeline] Error: {raw_clauses_path} not found. Seeding default text...")
        with open(raw_clauses_path, "w", encoding="utf-8") as f:
            f.write("Homeowners Exclusion Section B.4: Wear and tear, gradual seepage is excluded.\n")
            
    with open(raw_clauses_path, "r", encoding="utf-8") as f:
        clauses_text = f.read()
        
    try:
        # 1. Generate Golden Set
        golden_cases = await generate_golden_dataset(clauses_text)
        with open(golden_output_path, "w", encoding="utf-8") as f:
            json.dump(golden_cases, f, indent=2, ensure_ascii=False)
        print(f"[Pipeline] Successfully saved {len(golden_cases)} cases to {golden_output_path}")
        
        # 2. Generate Noisy Set
        noisy_cases = await generate_noisy_dataset()
        with open(noisy_output_path, "w", encoding="utf-8") as f:
            json.dump(noisy_cases, f, indent=2, ensure_ascii=False)
        print(f"[Pipeline] Successfully saved {len(noisy_cases)} cases to {noisy_output_path}")
        
    except Exception as e:
        print(f"[Pipeline] Critical execution failure: {e}")

if __name__ == "__main__":
    asyncio.run(main())
