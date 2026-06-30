from typing import TypedDict, Dict, Any, List
from langgraph.graph import StateGraph, START, END

class ClaimState(TypedDict):
    claim_id: str
    damage_report: Dict
    clause_report: Dict
    monitor_report: Dict
    final_decision: Dict

def damage_node(state: ClaimState):
    print("Damage Node")
    return {"damage_report": {"status": "ok"}}

def clause_node(state: ClaimState):
    print("Clause Node")
    return {"clause_report": {"covered": True}}

def monitor_node(state: ClaimState):
    print("Monitor Node")
    return {"monitor_report": {"fraud_risk": "low"}}

def decision_node(state: ClaimState):
    print("Decision Node", state)
    return {"final_decision": {"status": "approved"}}

builder = StateGraph(ClaimState)
builder.add_node("damage", damage_node)
builder.add_node("clause", clause_node)
builder.add_node("monitor", monitor_node)
builder.add_node("decision", decision_node)

builder.add_edge(START, "damage")
builder.add_edge(START, "clause")
builder.add_edge(START, "monitor")
builder.add_edge(["damage", "clause", "monitor"], "decision")
builder.add_edge("decision", END)

graph = builder.compile()

if __name__ == "__main__":
    result = graph.invoke({"claim_id": "123"})
    print(result)
