import asyncio
import os
import httpx
import json
from typing import Dict, Any

# 被测模型 (Player): 本地 LMStudio API
PLAYER_MODEL_URL = "http://localhost:1234/v1/chat/completions"
PLAYER_MODEL_NAME = "google/gemma-4-e2b"

# 裁判模型 (Judge): Gemini 3.1 Pro (High) 
# 在 Antigravity 2.0 中，可通过 Google SDK 或统一大模型网关调用

async def run_player_model(claim_data: Dict[str, Any]) -> str:
    """调用本地 LMStudio 运行被测模型 (Gemma) 进行理赔判定"""
    prompt = f"你是一名理赔评估员。请根据以下案件信息给出理赔决定(approve/reject)和理由：\n{json.dumps(claim_data, ensure_ascii=False)}"
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                PLAYER_MODEL_URL,
                json={
                    "model": PLAYER_MODEL_NAME,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1
                },
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
        except Exception as e:
            return f"[Player Model Error] 无法连接本地 LMStudio: {e}"

async def run_judge_model(claim_data: Dict[str, Any], player_response: str) -> Dict[str, Any]:
    """调用 Gemini 3.1 Pro 进行 LLM-as-a-Judge 多维度打分"""
    rubric = f"""
    你是一名资深的保险理赔专家，现在担任“裁判”角色。请评估 AI 理赔员(Player)针对以下案件做出的理赔决定。
    
    案件信息 (Claim Data):
    {json.dumps(claim_data, ensure_ascii=False)}
    
    AI 理赔员的回复 (Player Response):
    {player_response}
    
    请按以下维度打分 (1-5分)，并输出严格的 JSON 格式：
    1. faithfulness: 忠实度（是否严格基于给定的案件信息，无幻觉）
    2. calculation_accuracy: 计算准确度（如有金额扣减，计算是否准确）
    3. logical_consistency: 逻辑连贯性（推理过程是否严密自洽）
    
    期望的 JSON 输出格式：
    {{
        "scores": {{
            "faithfulness": 5,
            "calculation_accuracy": 5,
            "logical_consistency": 4
        }},
        "reasoning": "扣分理由或综合评价..."
    }}
    """
    
    # 模拟 Antigravity 2.0 中 Gemini 3.1 Pro 的调用逻辑
    # 实际项目中应替换为真实的 API 客户端初始化
    try:
        # 伪代码：
        # import google.generativeai as genai
        # genai.configure(api_key=os.environ["GEMINI_API_KEY"])
        # model = genai.GenerativeModel('gemini-3.1-pro-high')
        # response = await model.generate_content_async(rubric)
        # return json.loads(response.text)
        
        # 目前返回 mock 结构用于展示流水线
        return {
            "scores": {
                "faithfulness": 4,
                "calculation_accuracy": 5,
                "logical_consistency": 4
            },
            "reasoning": "[Mock Gemini 3.1 Pro Judge] 逻辑基本自洽，但未明确引用除外责任条款，Faithfulness 扣1分。"
        }
    except Exception as e:
         return {"error": f"Judge Model Error: {e}"}

async def evaluate_claim(claim_data: Dict[str, Any]):
    print(f"--- 开始评估案件: {claim_data['claim_id']} ---")
    
    print(f"1. 正在调用被测模型 ({PLAYER_MODEL_NAME} via LMStudio)...")
    player_response = await run_player_model(claim_data)
    print(f"被测模型输出:\n{player_response}\n")
    
    print("2. 正在调用裁判模型 (Gemini 3.1 Pro High)...")
    evaluation = await run_judge_model(claim_data, player_response)
    print(f"裁判打分:\n{json.dumps(evaluation, indent=2, ensure_ascii=False)}\n")
    
    return evaluation

if __name__ == "__main__":
    test_claim = {
        "claim_id": "CLM-2026-MEDICAL-001",
        "claim_type": "医疗险",
        "description": "投保人因急性肠胃炎住院3天，产生医疗费用 3500 元。保单包含 500 元免赔额，剩余 100% 赔付。",
        "claimed_amount": 3500
    }
    asyncio.run(evaluate_claim(test_claim))
