import sys
import os
import uuid
from datetime import datetime, timedelta

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.utils.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.models.claim import Claim, ClaimStatus, ClaimType, ClaimDocument

def seed_realistic_claims():
    db = SessionLocal()
    
    # 1. Fetch user IDs
    broker = db.query(User).filter(User.role == UserRole.ROLE_BROKER).first()
    adjuster = db.query(User).filter(User.role == UserRole.ROLE_ADJUSTER).first()
    
    if not broker or not adjuster:
        print("Error: Please run seed_demo_users.py first to create broker and adjuster accounts.")
        db.close()
        return
        
    broker_id = broker.id
    adjuster_id = adjuster.id
    
    # 2. Clear old claims and documents to remove the dummy mock entries
    print("Clearing existing claims and documents...")
    db.query(ClaimDocument).delete()
    db.query(Claim).delete()
    db.commit()
    
    # 3. Define the list of claims to insert
    now = datetime.utcnow()
    
    claims_data = [
        # --- 1. Approved Auto Claim ---
        {
            "claim_number": "CLM-20260628-AUT01",
            "policy_number": "POL-2026-8899A",
            "claimant_id": broker_id,
            "broker_id": broker_id,
            "adjuster_id": adjuster_id,
            "claim_type": ClaimType.auto,
            "status": ClaimStatus.approved,
            "incident_date": now - timedelta(days=6),
            "incident_location": "北京市朝阳区建国门外大街停车场",
            "incident_description": "车辆在停车场静止状态下被一辆倒车的车辆擦撞，造成右侧车门凹陷及漆面刮伤。对方车辆负全责，已出具交通事故快速处理協議書。",
            "claimed_amount": 5800.0,
            "approved_amount": 5500.0,
            "ai_decision": "approve",
            "ai_confidence": 0.95,
            "ai_reasoning": (
                "[RAG Retrieval] Matching policy clause: Section A.2 Motor Property Damage (Third-Party Liability Cover).\n"
                "[OCR Processing] Invoice verified. Right door repair and repainting: ¥5,500. Deductible of ¥300 applied as per Policy Schedule.\n"
                "[Damage Assessment] Vehicle damage is consistent with low-speed parking lot collision. Damage severity: Low.\n"
                "[Policy Coverage] Verified that Policy POL-2026-8899A has active Own Damage coverage.\n"
                "[Decision] Claim is approved for ¥5,500 after applying the ¥300 policy deductible."
            ),
            "ai_metadata": {
                "anomalies": [],
                "damage_assessment": {
                    "estimated_amount": 5800.0,
                    "damage_severity": "low",
                    "notes": "Cost estimate aligns with standard market rate for minor scratch repair on mid-size SUV.",
                    "red_flags": []
                },
                "policy_coverage": {
                    "is_covered": True,
                    "policy_limit": 50000.0,
                    "deductible": 300.0,
                    "applicable_clauses": ["Section A.2 Motor Property Damage"],
                    "exclusions_checked": ["DUI", "Intentional Acts", "Commercial Use Exclusions"]
                }
            },
            "documents": [
                {"doc_type": "photo", "file_name": "事故右侧车门刮擦.jpg", "file_path": "uploads/auto_door_scratch.jpg", "file_size": 184520},
                {"doc_type": "report", "file_name": "交通事故快速处理协议书.pdf", "file_path": "uploads/accident_agreement.pdf", "file_size": 425100},
                {"doc_type": "invoice", "file_name": "定损与维修发票_BMW_4S.pdf", "file_path": "uploads/bmw_invoice.pdf", "file_size": 284100}
            ]
        },
        # --- 2. Rejected Property Claim ---
        {
            "claim_number": "CLM-20260628-PRO02",
            "policy_number": "POL-2024-5512B",
            "claimant_id": broker_id,
            "broker_id": broker_id,
            "adjuster_id": adjuster_id,
            "claim_type": ClaimType.property,
            "status": ClaimStatus.rejected,
            "incident_date": now - timedelta(days=12),
            "incident_location": "上海市浦东新区张江路88号地下室",
            "incident_description": "地下室因老旧水管長期滲水，導致木地板及牆角霉變損壞，需更換受損地板並重新粉刷。",
            "claimed_amount": 15000.0,
            "approved_amount": 0.0,
            "ai_decision": "reject",
            "ai_confidence": 0.91,
            "ai_reasoning": (
                "[RAG Retrieval] Matching policy clause: Homeowners Policy Exclusion Section B.4 (Wear and Tear / Gradual Deterioration).\n"
                "[OCR Processing] Inspection report states: 'Damage caused by slow water seepage persisting for over 3 months due to lack of maintenance.'\n"
                "[Damage Assessment] Chronic moisture damage, not a sudden or accidental pipe burst event.\n"
                "[Policy Coverage] Section B.4 explicitly excludes coverage for gradual deterioration, mold, or wear and tear resulting from maintenance neglect.\n"
                "[Decision] Claim is rejected because the cause of loss falls directly under the maintenance neglect exclusion clause."
            ),
            "ai_metadata": {
                "anomalies": [
                    {
                        "title": "Exclusion Triggered: Wear and Tear",
                        "description": "The damage is diagnosed as chronic/gradual mold and deterioration, which is a standard exclusion under Policy Section B.4."
                    }
                ],
                "damage_assessment": {
                    "estimated_amount": 0.0,
                    "damage_severity": "medium",
                    "notes": "Assessment confirms leakage was pre-existing and unresolved for a prolonged period.",
                    "red_flags": ["Chronic maintenance failure"]
                },
                "policy_coverage": {
                    "is_covered": False,
                    "policy_limit": 100000.0,
                    "deductible": 500.0,
                    "applicable_clauses": ["Exclusion Section B.4 (Wear & Tear)"],
                    "exclusions_checked": ["Gradual Deterioration", "Sudden Water Escape"]
                }
            },
            "documents": [
                {"doc_type": "photo", "file_name": "地下室发霉地板.jpg", "file_path": "uploads/basement_mold.jpg", "file_size": 250410},
                {"doc_type": "report", "file_name": "第三方房屋鉴定报告.pdf", "file_path": "uploads/house_inspection.pdf", "file_size": 512000}
            ]
        },
        # --- 3. Human Review Health Claim ---
        {
            "claim_number": "CLM-20260628-HEA03",
            "policy_number": "POL-2025-1123H",
            "claimant_id": broker_id,
            "broker_id": broker_id,
            "adjuster_id": adjuster_id,
            "claim_type": ClaimType.health,
            "status": ClaimStatus.human_review,
            "incident_date": now - timedelta(days=8),
            "incident_location": "廣州市第一人民醫院",
            "incident_description": "因急性膽囊炎住院接受微創切除手術，住院6天。申請医疗費用報銷。",
            "claimed_amount": 45000.0,
            "approved_amount": 0.0,
            "ai_decision": "human_review",
            "ai_confidence": 0.74,
            "ai_reasoning": (
                "[RAG Retrieval] Matching policy clause: Group Health Cover - Surgical Reimbursement (Clause C.12).\n"
                "[OCR Processing] Hospital bills total ¥45,000. Under itemized billing, ¥8,000 for VIP private ward room charge is detected.\n"
                "[Damage Assessment] Medical expenses are valid, but VIP ward rates exceed the standard policy limits (maximum ¥500/day).\n"
                "[Policy Coverage] Clause C.12 limits ward accommodation. VIP surcharge needs manual verification and partial deduction.\n"
                "[Decision] Claim is routed to Human Review for final verification of VIP ward deductions and medical necessity of specific non-standard prescriptions."
            ),
            "ai_metadata": {
                "anomalies": [
                    {
                        "title": "VIP Ward Surcharge Detected",
                        "description": "Hospital invoice includes VIP private room charge of ¥8,000, which exceeds the standard ward limit of ¥500/day."
                    }
                ],
                "damage_assessment": {
                    "estimated_amount": 37000.0,
                    "damage_severity": "high",
                    "notes": "Medical cost itemization matches surgical profiles, except for ward class accommodation.",
                    "red_flags": ["Excessive accommodation tier"]
                },
                "policy_coverage": {
                    "is_covered": True,
                    "policy_limit": 50000.0,
                    "deductible": 1000.0,
                    "applicable_clauses": ["Clause C.12 Ward Surcharges"],
                    "exclusions_checked": ["Pre-existing Conditions", "Cosmetic Treatments"]
                }
            },
            "documents": [
                {"doc_type": "medical_record", "file_name": "出院小结与手术记录.pdf", "file_path": "uploads/discharge_summary.pdf", "file_size": 612800},
                {"doc_type": "invoice", "file_name": "住院医疗费用明细发票.pdf", "file_path": "uploads/hospital_invoice.pdf", "file_size": 395400}
            ]
        },
        # --- 4. Unscanned Submitted Auto Claim (Ready for Demo Scan) ---
        {
            "claim_number": "CLM-20260628-AUT04",
            "policy_number": "POL-2026-8899A",
            "claimant_id": broker_id,
            "broker_id": broker_id,
            "adjuster_id": None,
            "claim_type": ClaimType.auto,
            "status": ClaimStatus.submitted,
            "incident_date": now - timedelta(days=2),
            "incident_location": "上海市杨浦区五角场环岛",
            "incident_description": "雨天路面湿滑，车辆在转弯时失控撞击路边护栏，造成前保险杠受损严重，水箱漏水。已报交警，无人员受伤。",
            "claimed_amount": 12500.0,
            "approved_amount": 0.0,
            "ai_decision": None,
            "ai_confidence": None,
            "ai_reasoning": None,
            "ai_metadata": None,
            "documents": [
                {"doc_type": "photo", "file_name": "前保险杠撞击破损照片.jpg", "file_path": "uploads/bumper_damage.jpg", "file_size": 320500},
                {"doc_type": "report", "file_name": "交警简易程序事故认定书.pdf", "file_path": "uploads/police_report.pdf", "file_size": 215400},
                {"doc_type": "invoice", "file_name": "维修厂估损单与报价明细.pdf", "file_path": "uploads/repair_estimate.pdf", "file_size": 185200}
            ]
        },
        # --- 5. Fresh Draft Property Claim ---
        {
            "claim_number": "CLM-20260628-PRO05",
            "policy_number": "POL-2024-5512B",
            "claimant_id": broker_id,
            "broker_id": broker_id,
            "adjuster_id": None,
            "claim_type": ClaimType.property,
            "status": ClaimStatus.draft,
            "incident_date": now - timedelta(days=1),
            "incident_location": "北京市海淀区中关村大街15号",
            "incident_description": "因楼上住户装修漏水，导致卧室吊顶天花板大面积水渍和石膏板变形，预估修复费用3,500元。目前正在搜集装修报价和物业证明材料。",
            "claimed_amount": 3500.0,
            "approved_amount": 0.0,
            "ai_decision": None,
            "ai_confidence": None,
            "ai_reasoning": None,
            "ai_metadata": None,
            "documents": [
                {"doc_type": "photo", "file_name": "吊顶漏水水渍照片.jpg", "file_path": "uploads/ceiling_leak.jpg", "file_size": 142100}
            ]
        },
        # --- 6. Under Review Property Claim (With Arson check) ---
        {
            "claim_number": "CLM-20260628-PRO06",
            "policy_number": "POL-2024-9988X",
            "claimant_id": broker_id,
            "broker_id": broker_id,
            "adjuster_id": adjuster_id,
            "claim_type": ClaimType.property,
            "status": ClaimStatus.under_review,
            "incident_date": now - timedelta(days=9),
            "incident_location": "深圳市南山区南山大道",
            "incident_description": "厨房电线老化引起火灾，导致厨柜烧毁，部分厨房家电损坏，无人员伤亡。",
            "claimed_amount": 32000.0,
            "approved_amount": 0.0,
            "ai_decision": "human_review",
            "ai_confidence": 0.68,
            "ai_reasoning": (
                "[RAG Retrieval] Matching policy clause: Fire and Perils Clause (Section F.2).\n"
                "[OCR Processing] Invoice verified: Fire damage repair of kitchen area - ¥32,000.\n"
                "[Damage Assessment] Damage is consistent with electrical fire. Severity: High.\n"
                "[Policy Coverage] Coverage verified. However, fire department report is missing. Exclusions check: Arson check pending.\n"
                "[Decision] Routed to Human Review to upload and verify the official Fire Department Investigation Report."
            ),
            "ai_metadata": {
                "anomalies": [
                    {
                        "title": "Missing Fire Department Report",
                        "description": "An official incident report from the fire department is required to rule out negligence/arson exclusions."
                    }
                ],
                "damage_assessment": {
                    "estimated_amount": 32000.0,
                    "damage_severity": "high",
                    "notes": "Contractor estimate matches scope of kitchen cabinet and wiring replacement.",
                    "red_flags": ["Missing public authority report"]
                },
                "policy_coverage": {
                    "is_covered": True,
                    "policy_limit": 200000.0,
                    "deductible": 1000.0,
                    "applicable_clauses": ["Fire and Perils Cover"],
                    "exclusions_checked": ["Intentional Arson", "Gross Negligence"]
                }
            },
            "documents": [
                {"doc_type": "photo", "file_name": "厨房火灾现场照片.jpg", "file_path": "uploads/kitchen_fire.jpg", "file_size": 420300},
                {"doc_type": "invoice", "file_name": "厨柜与家电重置报价单.pdf", "file_path": "uploads/kitchen_estimate.pdf", "file_size": 220100}
            ]
        }
    ]
    
    # 4. Insert claims and documents
    for claim_item in claims_data:
        docs = claim_item.pop("documents", [])
        new_claim = Claim(
            id=uuid.uuid4(),
            **claim_item
        )
        db.add(new_claim)
        
        for d in docs:
            # Build correct upload folder structure matching API uploads
            file_dir = f"uploads/{new_claim.id}"
            os.makedirs(file_dir, exist_ok=True)
            file_path = f"{file_dir}/{d['file_name']}"
            
            # Write a small placeholder file content
            with open(file_path, "wb") as f:
                if d['file_name'].lower().endswith('.pdf'):
                    # Dummy PDF header
                    f.write(b"%PDF-1.4\n%Demo PDF Content for Claim " + new_claim.claim_number.encode() + b"\n")
                else:
                    # Dummy text for image
                    f.write(b"Demo Image/File Content for Claim " + new_claim.claim_number.encode() + b"\n")
            
            new_doc = ClaimDocument(
                id=uuid.uuid4(),
                claim_id=new_claim.id,
                doc_type=d["doc_type"],
                file_name=d["file_name"],
                file_path=file_path,
                file_size=os.path.getsize(file_path),
                mime_type="application/pdf" if d['file_name'].lower().endswith('.pdf') else "image/jpeg"
            )
            db.add(new_doc)
            
        print(f"Seeded claim: {new_claim.claim_number}")
        
    db.commit()
    db.close()
    print("Database seeding of realistic claims successfully completed.")

if __name__ == "__main__":
    seed_realistic_claims()
