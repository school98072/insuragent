import os
import json
import asyncio
from typing import List, Dict, Any
from pydantic import BaseModel, Field

# Ensure correct sys path to load app modules
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.ai.dialog import DialogEngine
from app.services.ai.llm_factory import get_structured_llm
from app.core.config import settings
from langchain_core.messages import SystemMessage, HumanMessage

# ---------------------------------------------------------------------------
# Pydantic Schemas for Evaluation
# ---------------------------------------------------------------------------

class JudgeEvaluation(BaseModel):
    accuracy: int = Field(ge=1, le=5, description="Score from 1 to 5 for factual accuracy compared to standard answer.")
    citation_compliance: int = Field(ge=1, le=5, description="Score from 1 to 5 for citing correct sections/documents.")
    logical_deductibility: int = Field(ge=1, le=5, description="Score from 1 to 5 for reasoning clarity and logical derivation.")
    reasons: str = Field(description="Specific feedback and reasons explaining the scoring or any deductions.")

# ---------------------------------------------------------------------------
# Evaluator Script
# ---------------------------------------------------------------------------

async def evaluate_case(
    engine: DialogEngine,
    case: Dict[str, Any],
    judge_llm: Any,
    sem: asyncio.Semaphore
) -> Dict[str, Any]:
    async with sem:
        query = case["query"]
        standard_answer = case["standard_answer"]
        cited_section = case["cited_section"]
        
        # 1. Process message through DialogEngine
        try:
            res = await engine.process_message(
                message=query,
                history=[],
                collected_data={},
                session_state={},
                is_filing_allowed=False
            )
            bot_reply = res["reply"]
        except Exception as e:
            return {
                "case": case,
                "bot_reply": f"ERROR: {e}",
                "evaluation": {
                    "accuracy": 1,
                    "citation_compliance": 1,
                    "logical_deductibility": 1,
                    "reasons": f"Agent execution crashed: {e}"
                },
                "success": False
            }
            
        # 2. Score output using LLM-as-a-judge
        prompt = (
            f"You are an insurance quality audit supervisor. Compare the Chatbot's response against the standard reference answer.\n\n"
            f"User Query: {query}\n"
            f"Standard Reference Answer: {standard_answer} (Cited: {cited_section})\n"
            f"Chatbot Response: {bot_reply}\n\n"
            f"Evaluate the Chatbot response on three dimensions (1-5 scale, where 5 is perfect):\n"
            f"1. Accuracy: Does it factually agree with the reference answer?\n"
            f"2. Citation Compliance: Does it cite the correct sections/documents or warn properly?\n"
            f"3. Logical Deductibility: Is the response reasoning clear, professional, and well-deduced?\n\n"
            f"Provide scores and specific reasons."
        )
        
        try:
            eval_result: JudgeEvaluation = await judge_llm.ainvoke([
                SystemMessage(content="You are a strict insurance quality judge. Return Pydantic structured output only."),
                HumanMessage(content=prompt)
            ])
            avg_score = (eval_result.accuracy + eval_result.citation_compliance + eval_result.logical_deductibility) / 3.0
            is_success = (eval_result.accuracy >= 4 and eval_result.citation_compliance >= 4 and eval_result.logical_deductibility >= 4)
            
            return {
                "case": case,
                "bot_reply": bot_reply,
                "evaluation": {
                    "accuracy": eval_result.accuracy,
                    "citation_compliance": eval_result.citation_compliance,
                    "logical_deductibility": eval_result.logical_deductibility,
                    "reasons": eval_result.reasons
                },
                "avg_score": round(avg_score, 2),
                "success": is_success
            }
        except Exception as e:
            return {
                "case": case,
                "bot_reply": bot_reply,
                "evaluation": {
                    "accuracy": 1,
                    "citation_compliance": 1,
                    "logical_deductibility": 1,
                    "reasons": f"Judge scoring failed: {e}"
                },
                "avg_score": 1.0,
                "success": False
            }

async def main():
    golden_path = "data/golden_rag_dataset.json"
    failed_cases_path = "data/failed_cases.json"
    few_shot_path = "data/few_shot_examples.py"
    
    if not os.path.exists(golden_path):
        print(f"[Evaluator] Error: {golden_path} does not exist. Please run generate_synthetic_data.py first.")
        return
        
    with open(golden_path, "r", encoding="utf-8") as f:
        cases = json.load(f)
        
    print(f"[Evaluator] Starting evaluation of {len(cases)} cases...")
    engine = DialogEngine()
    
    # Instantiate Gemini judge model
    judge_llm, provider = get_structured_llm(JudgeEvaluation, settings.DIALOG_AGENT_MODEL)
    print(f"[Evaluator] Judge model loaded: {provider}")
    
    # Cap concurrent requests to avoid rate limits
    sem = asyncio.Semaphore(5)
    
    tasks = [evaluate_case(engine, case, judge_llm, sem) for case in cases]
    results = await asyncio.gather(*tasks)
    
    # Calculate statistics
    total_cases = len(results)
    passed_cases = sum(1 for r in results if r["success"])
    pass_rate = (passed_cases / total_cases) * 100 if total_cases > 0 else 0.0
    
    sum_accuracy = sum(r["evaluation"]["accuracy"] for r in results)
    sum_citation = sum(r["evaluation"]["citation_compliance"] for r in results)
    sum_logic = sum(r["evaluation"]["logical_deductibility"] for r in results)
    
    avg_accuracy = sum_accuracy / total_cases
    avg_citation = sum_citation / total_cases
    avg_logic = sum_logic / total_cases
    avg_total = (avg_accuracy + avg_citation + avg_logic) / 3.0
    
    print("\n" + "="*50)
    print("                EVALUATION REPORT")
    print("="*50)
    print(f"Total Cases:     {total_cases}")
    print(f"Passed Cases:    {passed_cases}")
    print(f"Pass Rate:       {pass_rate:.2f}%")
    print(f"Avg Accuracy:    {avg_accuracy:.2f}/5.0")
    print(f"Avg Citation:    {avg_citation:.2f}/5.0")
    print(f"Avg Logic:       {avg_logic:.2f}/5.0")
    print(f"Overall Score:   {avg_total:.2f}/5.0")
    print("="*50 + "\n")
    
    # Process failed cases
    failed_list = [r for r in results if not r["success"]]
    with open(failed_cases_path, "w", encoding="utf-8") as f:
        json.dump(failed_list, f, indent=2, ensure_ascii=False)
    print(f"[Evaluator] Saved {len(failed_list)} failed cases to {failed_cases_path}")
    
    # Extract perfect cases for few-shot learning
    perfect_cases = [
        r for r in results
        if r["evaluation"]["accuracy"] == 5 
        and r["evaluation"]["citation_compliance"] == 5 
        and r["evaluation"]["logical_deductibility"] == 5
    ]
    
    # Select 3 to 5 perfect examples
    few_shot_pool = perfect_cases[:5]
    if len(few_shot_pool) < 3:
        # Fallback to highest scoring ones if not enough perfect cases
        sorted_results = sorted(results, key=lambda x: x.get("avg_score", 0), reverse=True)
        few_shot_pool = sorted_results[:3]
        
    few_shot_data = []
    for r in few_shot_pool:
        few_shot_data.append({
            "user": r["case"]["query"],
            "assistant": r["bot_reply"]
        })
        
    # Save to data/few_shot_examples.py
    with open(few_shot_path, "w", encoding="utf-8") as f:
        f.write("# Auto-generated few-shot examples for DialogEngine\n\n")
        f.write("FEW_SHOT_EXAMPLES = ")
        f.write(json.dumps(few_shot_data, indent=2, ensure_ascii=False))
        f.write("\n")
        
    print(f"[Evaluator] Successfully extracted and saved {len(few_shot_data)} few-shot examples to {few_shot_path}")

if __name__ == "__main__":
    asyncio.run(main())
