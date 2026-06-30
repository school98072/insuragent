/**
 * Mock data for frontend demo mode (backend not required).
 * Covers all claim types, statuses, and realistic scenarios.
 */
import { Claim, ClaimDocument, ClaimListResponse } from './claims'

const now = new Date()
const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString()
const hoursAgo = (n: number) => new Date(now.getTime() - n * 3600000).toISOString()

const doc = (
  id: string, claimId: string, type: string, name: string, sizeKb: number
): ClaimDocument => ({
  id, claim_id: claimId, doc_type: type, file_name: name,
  file_size: sizeKb * 1024, mime_type: name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg',
  created_at: daysAgo(Math.floor(Math.random() * 5) + 1),
})

export const MOCK_CLAIMS: Claim[] = [
  // ── Approved auto claim ──────────────────────────────────────────────────
  {
    id: 'mock-001',
    claim_number: 'CLM-2024-001234',
    policy_number: 'POL-2024-000888',
    claim_type: 'auto',
    status: 'approved',
    claimed_amount: 28500,
    approved_amount: 26800,
    incident_date: daysAgo(15),
    incident_location: '上海市浦东新区张杨路与世纪大道交叉口',
    incident_description:
      '2024年4月15日下午3时，本人驾驶车辆（沪A12345）在张杨路行驶时，遭遇追尾事故，肇事方车牌沪B67890，已报警处理。车辆后保险杠、尾灯损坏，经4S店估损约28,500元，已提供行车记录仪视频及交通事故认定书。',
    ai_decision: 'approve',
    ai_confidence: 0.94,
    ai_reasoning:
      '经 AI 系统分析，本次事故责任明确（对方全责），行车记录仪视频清晰，交通事故认定书完整有效。维修报价来自授权4S店，金额与车型、损伤程度相符（略有折扣）。建议批准修理费用 ¥26,800。',
    created_at: daysAgo(14),
    updated_at: daysAgo(8),
    submitted_at: daysAgo(14),
    resolved_at: daysAgo(8),
    documents: [
      doc('d001', 'mock-001', 'photo', '事故现场照片_01.jpg', 2048),
      doc('d002', 'mock-001', 'photo', '事故现场照片_02.jpg', 1860),
      doc('d003', 'mock-001', 'report', '交通事故认定书.pdf', 512),
      doc('d004', 'mock-001', 'invoice', '维修报价单_广汽丰田.pdf', 320),
      doc('d005', 'mock-001', 'other', '行车记录仪截图.jpg', 1500),
    ],
  } as any,

  // ── Human review health claim ────────────────────────────────────────────
  {
    id: 'mock-002',
    claim_number: 'CLM-2024-001235',
    policy_number: 'POL-2023-007712',
    claim_type: 'health',
    status: 'human_review',
    claimed_amount: 45200,
    incident_date: daysAgo(7),
    incident_location: '北京市东城区协和医院',
    incident_description:
      '因急性阑尾炎于协和医院接受急诊手术，住院治疗7天（2024/4/8-4/15），手术费18,000元，住院费27,200元，合计45,200元。已附医院发票、病历及出院小结。',
    ai_decision: 'human_review',
    ai_confidence: 0.71,
    ai_reasoning:
      '申请金额超过阈值（¥45,000），且包含多项医疗费用分项，建议人工核实医院发票真实性及费用明细是否符合健康险责任范围。',
    created_at: daysAgo(6),
    updated_at: daysAgo(2),
    submitted_at: daysAgo(6),
    documents: [
      doc('d010', 'mock-002', 'medical', '住院病历.pdf', 1024),
      doc('d011', 'mock-002', 'medical', '出院小结.pdf', 480),
      doc('d012', 'mock-002', 'invoice', '医疗费发票_01.pdf', 768),
      doc('d013', 'mock-002', 'invoice', '医疗费发票_02.pdf', 512),
      doc('d014', 'mock-002', 'id', '身份证正面.jpg', 860),
    ],
  } as any,

  // ── AI processing auto claim ─────────────────────────────────────────────
  {
    id: 'mock-003',
    claim_number: 'CLM-2024-001236',
    policy_number: 'POL-2024-003345',
    claim_type: 'auto',
    status: 'ai_processing',
    claimed_amount: 12000,
    incident_date: daysAgo(3),
    incident_location: '广州市天河区天河路',
    incident_description:
      '停车场内车辆刮擦，对方未留联系方式，损伤为左侧车门及后视镜，至路虎授权服务商估损12,000元。',
    created_at: daysAgo(2),
    updated_at: hoursAgo(3),
    submitted_at: daysAgo(2),
    documents: [
      doc('d020', 'mock-003', 'photo', '停车场监控截图.jpg', 1200),
      doc('d021', 'mock-003', 'invoice', '维修估价单.pdf', 280),
    ],
  } as any,

  // ── Rejected property claim ──────────────────────────────────────────────
  {
    id: 'mock-004',
    claim_number: 'CLM-2024-001237',
    policy_number: 'POL-2022-009901',
    claim_type: 'property',
    status: 'rejected',
    claimed_amount: 8800,
    incident_date: daysAgo(30),
    incident_location: '深圳市南山区科技园',
    incident_description:
      '办公室水管破裂，导致地板及部分家具受损，申请财产险理赔8,800元。',
    ai_decision: 'reject',
    ai_confidence: 0.87,
    ai_reasoning:
      '经核实，事故发生前房东已多次通知租户管道老化需维修，租户未及时处理导致损失，属于"维护不当"免责条款，不在财产险承保范围内。建议拒绝理赔。',
    created_at: daysAgo(28),
    updated_at: daysAgo(20),
    submitted_at: daysAgo(28),
    resolved_at: daysAgo(20),
    documents: [
      doc('d030', 'mock-004', 'photo', '受损现场照片.jpg', 1800),
      doc('d031', 'mock-004', 'report', '房东通知记录.pdf', 200),
    ],
  } as any,

  // ── Submitted life claim ─────────────────────────────────────────────────
  {
    id: 'mock-005',
    claim_number: 'CLM-2024-001238',
    policy_number: 'POL-2021-001122',
    claim_type: 'life',
    status: 'submitted',
    claimed_amount: 500000,
    incident_date: daysAgo(10),
    incident_location: '成都市锦江区',
    incident_description:
      '被保险人因突发心肌梗死不幸离世，家属申请身故保险金50万元，提供医院死亡证明及户籍注销证明。',
    created_at: daysAgo(9),
    updated_at: daysAgo(9),
    submitted_at: daysAgo(9),
    documents: [
      doc('d040', 'mock-005', 'medical', '医院死亡证明.pdf', 400),
      doc('d041', 'mock-005', 'id', '被保险人身份证.jpg', 920),
      doc('d042', 'mock-005', 'other', '户籍注销证明.pdf', 280),
      doc('d043', 'mock-005', 'other', '受益人银行卡.jpg', 640),
    ],
  } as any,

  // ── Under review health claim ────────────────────────────────────────────
  {
    id: 'mock-006',
    claim_number: 'CLM-2024-001239',
    policy_number: 'POL-2023-005588',
    claim_type: 'health',
    status: 'under_review',
    claimed_amount: 6800,
    incident_date: daysAgo(5),
    incident_location: '杭州市西湖区邵逸夫医院',
    incident_description:
      '因腰椎间盘突出症入院保守治疗3天，医疗费6,800元，提供门诊及住院记录。',
    ai_decision: 'approve',
    ai_confidence: 0.83,
    ai_reasoning:
      '金额合理，材料齐全，诊断与费用相符，可批准赔付。',
    created_at: daysAgo(4),
    updated_at: hoursAgo(5),
    submitted_at: daysAgo(4),
    documents: [
      doc('d050', 'mock-006', 'medical', '门诊病历.pdf', 380),
      doc('d051', 'mock-006', 'invoice', '住院收费票据.pdf', 560),
    ],
  } as any,

  // ── Approved auto (fast track) ───────────────────────────────────────────
  {
    id: 'mock-007',
    claim_number: 'CLM-2024-001240',
    policy_number: 'POL-2024-002267',
    claim_type: 'auto',
    status: 'approved',
    claimed_amount: 3200,
    approved_amount: 3200,
    incident_date: daysAgo(20),
    incident_location: '南京市鼓楼区中央路',
    incident_description:
      '路面坑洼导致轮胎爆裂并损伤轮辋，更换费用3,200元。',
    ai_decision: 'approve',
    ai_confidence: 0.97,
    ai_reasoning:
      '小额标准案件，损失清晰，材料完备，置信度极高，自动批准全额赔付。',
    created_at: daysAgo(19),
    updated_at: daysAgo(17),
    submitted_at: daysAgo(19),
    resolved_at: daysAgo(17),
    documents: [
      doc('d060', 'mock-007', 'photo', '轮胎损坏照片.jpg', 1100),
      doc('d061', 'mock-007', 'invoice', '轮胎更换发票.pdf', 180),
    ],
  } as any,

  // ── Draft property claim ─────────────────────────────────────────────────
  {
    id: 'mock-008',
    claim_number: 'CLM-2024-001241',
    policy_number: 'POL-2024-004499',
    claim_type: 'property',
    status: 'draft',
    claimed_amount: 15000,
    incident_date: daysAgo(2),
    incident_location: '武汉市洪山区',
    incident_description: '暴雨导致家中进水，地板受损…',
    created_at: hoursAgo(6),
    updated_at: hoursAgo(6),
    documents: [],
  } as any,

  // ── Closed health claim ──────────────────────────────────────────────────
  {
    id: 'mock-009',
    claim_number: 'CLM-2024-001242',
    policy_number: 'POL-2022-011334',
    claim_type: 'health',
    status: 'closed',
    claimed_amount: 22000,
    approved_amount: 19800,
    incident_date: daysAgo(45),
    incident_location: '西安市雁塔区唐都医院',
    incident_description:
      '因胆囊炎手术住院5天，总费用22,000元，扣除免赔额2,200元后批准赔付19,800元，已结案。',
    ai_decision: 'approve',
    ai_confidence: 0.91,
    ai_reasoning: '材料齐全，手术费用合理，扣除免赔额后批准赔付。',
    created_at: daysAgo(44),
    updated_at: daysAgo(30),
    submitted_at: daysAgo(44),
    resolved_at: daysAgo(30),
    documents: [
      doc('d080', 'mock-009', 'medical', '手术记录.pdf', 620),
      doc('d081', 'mock-009', 'invoice', '住院费发票.pdf', 440),
    ],
  } as any,

  // ── Human review auto claim (high amount) ────────────────────────────────
  {
    id: 'mock-010',
    claim_number: 'CLM-2024-001243',
    policy_number: 'POL-2023-006677',
    claim_type: 'auto',
    status: 'human_review',
    claimed_amount: 98000,
    incident_date: daysAgo(8),
    incident_location: '北京市朝阳区机场高速',
    incident_description:
      '高速行驶时与大货车发生碰撞，车辆严重受损，预估维修费98,000元，本人轻微受伤，已住院检查。大货车司机负全责。',
    ai_decision: 'human_review',
    ai_confidence: 0.61,
    ai_reasoning:
      '损失金额较大（¥98,000），且涉及人身伤害，需人工核实事故报告、医院诊断及维修报价的真实性。',
    created_at: daysAgo(7),
    updated_at: daysAgo(1),
    submitted_at: daysAgo(7),
    documents: [
      doc('d090', 'mock-010', 'photo', '车辆损毁全貌.jpg', 3200),
      doc('d091', 'mock-010', 'photo', '事故现场全景.jpg', 2800),
      doc('d092', 'mock-010', 'report', '交警事故认定书.pdf', 620),
      doc('d093', 'mock-010', 'medical', '急诊诊断报告.pdf', 380),
      doc('d094', 'mock-010', 'invoice', '4S店维修报价.pdf', 450),
    ],
  } as any,

  // ── Submitted auto (recent) ──────────────────────────────────────────────
  {
    id: 'mock-011',
    claim_number: 'CLM-2024-001244',
    policy_number: 'POL-2024-007893',
    claim_type: 'auto',
    status: 'submitted',
    claimed_amount: 5500,
    incident_date: hoursAgo(20),
    incident_location: '上海市静安区南京西路停车场',
    incident_description:
      '停车场内被不明车辆剐蹭，右侧车门有明显划痕及凹陷，停车场无监控覆盖，估损5,500元。',
    created_at: hoursAgo(18),
    updated_at: hoursAgo(18),
    submitted_at: hoursAgo(18),
    documents: [
      doc('d100', 'mock-011', 'photo', '剐蹭部位特写.jpg', 980),
      doc('d101', 'mock-011', 'invoice', '定损报告.pdf', 220),
    ],
  } as any,

  // ── Approved life (accidental) ───────────────────────────────────────────
  {
    id: 'mock-012',
    claim_number: 'CLM-2024-001245',
    policy_number: 'POL-2020-003300',
    claim_type: 'life',
    status: 'approved',
    claimed_amount: 200000,
    approved_amount: 200000,
    incident_date: daysAgo(60),
    incident_location: '杭州市余杭区',
    incident_description: '意外事故导致全残，申请全残保险金20万元。',
    ai_decision: 'approve',
    ai_confidence: 0.89,
    ai_reasoning: '材料完备，残疾鉴定等级符合全残标准，批准全额赔付。',
    created_at: daysAgo(58),
    updated_at: daysAgo(40),
    submitted_at: daysAgo(58),
    resolved_at: daysAgo(40),
    documents: [
      doc('d110', 'mock-012', 'medical', '残疾鉴定报告.pdf', 800),
      doc('d111', 'mock-012', 'id', '身份证复印件.jpg', 720),
    ],
  } as any,
]

// ── List response builder ────────────────────────────────────────────────────

export function mockClaimsList(params?: {
  page?: number; page_size?: number; status?: string; claim_type?: string
}): ClaimListResponse {
  let items = [...MOCK_CLAIMS]
  if (params?.status) items = items.filter(c => c.status === params.status)
  if (params?.claim_type) items = items.filter(c => c.claim_type === params.claim_type)
  const page = params?.page ?? 1
  const size = params?.page_size ?? 10
  const start = (page - 1) * size
  return { items: items.slice(start, start + size), total: items.length, page, page_size: size }
}

export function mockClaimById(id: string): Claim | undefined {
  return MOCK_CLAIMS.find(c => c.id === id)
}

// ── Audit queue (claims awaiting human decision) ─────────────────────────────

export const MOCK_TRIAGE_INBOX: Claim[] = MOCK_CLAIMS.filter(c =>
  ['human_review', 'under_review', 'submitted'].includes(c.status)
)

// ── AI chat mock responses ────────────────────────────────────────────────────

interface MockReply { keywords: string[]; response: string; en_keywords?: string[]; en_response?: string }

const MOCK_REPLIES: MockReply[] = [
  {
    keywords: ['车险', '车辆', '汽车', '交通', '追尾', '剐蹭'],
    en_keywords: ['auto', 'car', 'vehicle', 'accident', 'crash', 'collision', 'driving'],
    response:
      '**车险理赔流程**\n\n1. **第一时间报案** — 事故发生后24小时内拨打保险公司电话或通过本平台提交报案\n2. **保留现场证据** — 拍摄事故现场照片/视频，记录对方车牌及联系方式\n3. **出警/定损** — 人伤事故需报警，财损事故可协商后由4S店或授权修理厂定损\n4. **提交材料** — 上传事故认定书、维修报价单、发票等\n5. **AI 审核** — 平台 AI 在30分钟内完成初审，小额案件自动批准\n\n**常用材料清单：**\n• 驾驶证 & 行驶证\n• 事故现场照片（建议10张以上）\n• 交警事故认定书（人伤必备）\n• 修理厂定损报告 & 维修发票\n\n如需进一步帮助，请告诉我您的具体情况 🚗',
    en_response:
      '**Auto Insurance Claims Process**\n\n1. **Report Incident** — Call the insurance company or submit a claim via this platform within 24 hours of the accident.\n2. **Preserve Evidence** — Take photos/videos of the scene, record the other party\'s license plate and contact info.\n3. **Police/Estimate** — Call the police for injury accidents. For property damage, you can negotiate and get an estimate from an authorized repair shop.\n4. **Submit Documents** — Upload police report, repair estimate, invoices, etc.\n5. **AI Review** — Platform AI completes initial review within 30 mins.\n\n**Common Documents Needed:**\n• Driver\'s License & Vehicle Registration\n• Scene Photos (recommend 10+)\n• Police Report (mandatory for injuries)\n• Repair Estimate & Invoice\n\nTell me your specific situation if you need more help 🚗',
  },
  {
    keywords: ['健康险', '医疗', '住院', '手术', '门诊', '报销'],
    en_keywords: ['health', 'medical', 'hospital', 'surgery', 'clinic', 'reimbursement'],
    response:
      '**健康险报销指引**\n\n**可报销的费用：**\n• 住院费（床位费、护理费、治疗费）\n• 手术费\n• 检查化验费（CT、MRI等）\n• 处方药费（须在医保目录内）\n\n**通常不报销：**\n• 美容/整形手术\n• 体检费用\n• 营养补品\n• 自愿放弃住院的情况\n\n**申请所需材料：**\n1. 住院/出院小结（加盖医院印章）\n2. 全部医疗费用发票原件\n3. 费用明细清单\n4. 身份证复印件\n5. 银行卡信息（赔款账户）\n\n一般情况下，提交材料后3-5个工作日完成审核 🏥',
    en_response:
      '**Health Insurance Reimbursement Guide**\n\n**Covered Expenses:**\n• Hospitalization (bed, nursing, treatment)\n• Surgery\n• Tests (CT, MRI, etc.)\n• Prescription drugs (within the medical insurance catalog)\n\n**Usually Not Covered:**\n• Cosmetic surgery\n• Health checkups\n• Supplements\n• Voluntary discharge\n\n**Required Documents:**\n1. Admission/Discharge summary (stamped)\n2. Original medical invoices\n3. Detailed expense list\n4. ID copy\n5. Bank account info\n\nProcessing typically takes 3-5 business days 🏥',
  },
  {
    keywords: ['财产险', '房屋', '家财', '水管', '火灾', '盗窃'],
    en_keywords: ['property', 'house', 'home', 'water', 'fire', 'theft'],
    response:
      '**财产险理赔说明**\n\n**承保范围：**\n• 火灾、爆炸造成的房屋及家财损失\n• 自然灾害（暴风雨、洪水等）\n• 盗窃（须有报案记录）\n• 意外事故（水管爆裂等）\n\n**常见免责条款：**\n⚠ 维护不当导致的损坏（如长期漏水未修）\n⚠ 战争、核辐射\n⚠ 故意损坏\n⚠ 正常磨损\n\n**申请材料：**\n• 损失现场照片（越多越好）\n• 物品购买凭证或估价单\n• 公安报案记录（盗窃案件）\n• 物业/消防部门事故证明\n\n遇到紧急情况请先保护人员安全，再采取必要的止损措施 🏠',
    en_response:
      '**Property Insurance Claims**\n\n**Coverage:**\n• Fire, explosion damage\n• Natural disasters (storms, floods)\n• Theft (requires police report)\n• Accidents (burst pipes)\n\n**Common Exclusions:**\n⚠ Damage from poor maintenance (e.g., long-term leaks)\n⚠ War, nuclear radiation\n⚠ Intentional damage\n⚠ Normal wear and tear\n\n**Required Documents:**\n• Scene photos (as many as possible)\n• Purchase receipts or estimates\n• Police report (for theft)\n• Property management/fire department report\n\nPlease ensure personal safety first before taking loss mitigation measures 🏠',
  },
  {
    keywords: ['人寿险', '身故', '全残', '死亡', '受益人'],
    en_keywords: ['life', 'death', 'disability', 'beneficiary'],
    response:
      '**人寿险理赔说明**\n\n人寿险理赔通常分为两类：\n\n**身故理赔：**\n• 身故受益人（或法定继承人）提出申请\n• 理赔金额 = 保险金额（含保额增值）\n• 受益人填写理赔申请书\n\n**全残理赔：**\n• 需提供二级以上医院出具的残疾鉴定报告\n• 须符合保险合同约定的全残标准\n\n**所需材料（身故）：**\n• 死亡证明书（医院或公安）\n• 户籍注销证明\n• 受益人身份证 & 银行卡\n• 保险合同原件\n• 受益人与被保险人关系证明\n\n一般审核周期为5-10个工作日，复杂案件可能延至30天。如您需要协助填写理赔表格，请告知 ❤️',
    en_response:
      '**Life Insurance Claims**\n\n**Death Claim:**\n• Filed by beneficiary (or legal heir)\n• Payout = Insurance amount\n• Beneficiary fills out the claim application\n\n**Total Disability Claim:**\n• Requires disability report from a level 2+ hospital\n• Must meet policy definition of total disability\n\n**Required Documents (Death):**\n• Death certificate\n• Household registration cancellation\n• Beneficiary ID & bank card\n• Original policy contract\n• Proof of relationship\n\nReview takes 5-10 business days (up to 30 days for complex cases) ❤️',
  },
  {
    keywords: ['材料', '单据', '需要什么', '准备', '文件'],
    en_keywords: ['documents', 'materials', 'receipts', 'need', 'prepare', 'files', 'upload'],
    response:
      '**理赔材料通用清单**\n\n以下材料在各类理赔中均需提供：\n\n📋 **基础材料**\n• 保险合同或保单号\n• 被保险人身份证（正反面）\n• 银行卡（赔款打款账户）\n• 理赔申请书（平台可在线填写）\n\n🚗 **车险专属**\n→ 驾驶证、行驶证、事故照片、维修发票\n\n🏥 **健康险专属**\n→ 病历、诊断书、医疗发票、出院小结\n\n🏠 **财产险专属**\n→ 损失照片、购物凭证、公安/物业证明\n\n❤️ **寿险专属**\n→ 死亡/残疾证明、受益人资料\n\n材料越完整，AI 审核速度越快，建议一次性提交所有材料以避免补件延误。',
    en_response:
      '**General Required Documents**\n\nThese are needed for all claims:\n\n📋 **Basics**\n• Policy number/contract\n• Insured\'s ID (front/back)\n• Bank card (for payout)\n• Claim application (can be filled online)\n\n🚗 **Auto**\n→ License, registration, scene photos, repair invoice\n\n🏥 **Health**\n→ Medical records, diagnosis, invoices, discharge summary\n\n🏠 **Property**\n→ Damage photos, receipts, police/management reports\n\n❤️ **Life**\n→ Death/disability certificate, beneficiary info\n\nComplete documents speed up the AI review process!',
  },
  {
    keywords: ['人工审核', '为什么', '转人工', '原因'],
    en_keywords: ['human', 'review', 'why', 'reason', 'manual'],
    response:
      '**案件转人工审核的原因**\n\nAI 系统在以下情况会自动将案件转入人工审核：\n\n1. **金额超过阈值** — 通常为¥30,000以上的案件\n2. **材料不完整** — 缺少关键证明文件\n3. **AI 置信度偏低** — 系统对决策不够确定（通常低于75%）\n4. **复杂情形** — 涉及多方责任、人身伤亡\n5. **历史异常** — 该保单近期有频繁理赔记录\n\n**人工审核流程：**\n• 审核员会在1个工作日内接案\n• 如需补充材料，会通过平台通知您\n• 一般在3-5个工作日内完成\n\n您可以在"案件详情"页面实时查看审核进度 ✅',
    en_response:
      '**Reasons for Human Review**\n\nThe AI system automatically escalates cases when:\n\n1. **High Amount** — Usually over ¥30,000\n2. **Incomplete Documents** — Missing key proofs\n3. **Low AI Confidence** — System certainty < 75%\n4. **Complex Scenarios** — Multiple liabilities, personal injuries\n5. **Historical Anomalies** — Frequent recent claims on the policy\n\n**Human Review Process:**\n• An adjuster will take the case within 1 business day\n• You will be notified if more documents are needed\n• Usually completed in 3-5 business days ✅',
  },
  {
    keywords: ['金额', '如何计算', '赔多少', '赔付比例', '免赔额'],
    en_keywords: ['amount', 'calculate', 'how much', 'ratio', 'deductible', 'payout'],
    response:
      '**理赔金额计算说明**\n\n**核心公式：**\n```\n实际赔付金额 = MIN(损失金额, 保险金额) × 赔付比例 - 免赔额\n```\n\n**关键概念：**\n\n📌 **保险金额** — 保单约定的最高赔付上限\n\n📌 **免赔额** — 您需自行承担的部分（通常为损失的10-20%）\n\n📌 **赔付比例** — 保险合同约定的比例（部分险种为100%）\n\n**举例（车险）：**\n• 实际损失：¥20,000\n• 绝对免赔额：¥2,000\n• 赔付：¥20,000 - ¥2,000 = **¥18,000**\n\n**注意：** 健康险中，门诊和住院的赔付比例可能不同，建议查看保单条款。如需我帮您估算，请提供损失金额和保单类型。',
    en_response:
      '**Claim Status Inquiry**\n\nYou can track status in the "Claims" list:\n\n| Status | Description | Estimated Time |\n|--------|-------------|----------------|\n| Draft | Filling out, not submitted | — |\n| Submitted | Waiting for AI analysis | ~30 mins |\n| AI Processing | System analyzing | 30 mins~2 hrs |\n| Under Review | In human queue | 1 business day |\n| Human Review | Adjuster processing | 3-5 business days |\n| Approved | Payment processing | 1-3 business days |\n| Rejected | Can appeal | — |\n\nIf it takes longer than expected, use the "Expedite" function.',
  },
  {
    keywords: ['状态', '进度', '查询', '多久', '等待'],
    en_keywords: ['status', 'progress', 'check', 'how long', 'wait', 'time'],
    response:
      '**理赔进度查询**\n\n您可以在"理赔案件"列表中实时查看案件状态：\n\n| 状态 | 说明 | 预计时长 |\n|------|------|---------|\n| 草稿 | 填写中，未提交 | — |\n| 已提交 | 等待 AI 分析 | ~30分钟 |\n| AI处理 | 系统分析中 | 30分钟~2小时 |\n| 审核中 | 进入人工队列 | 1个工作日 |\n| 人工审核 | 审核员处理中 | 3-5个工作日 |\n| 已批准 | 赔款打款中 | 1-3个工作日到账 |\n| 已拒绝 | 可申请复议 | — |\n\n如果等待时间超出预期，可以在案件详情页联系客服或点击"催单"功能。',
    en_response:
      '**Claim Status Inquiry**\n\nYou can track status in the "Claims" list:\n\n| Status | Description | Estimated Time |\n|--------|-------------|----------------|\n| Draft | Filling out, not submitted | — |\n| Submitted | Waiting for AI analysis | ~30 mins |\n| AI Processing | System analyzing | 30 mins~2 hrs |\n| Under Review | In human queue | 1 business day |\n| Human Review | Adjuster processing | 3-5 business days |\n| Approved | Payment processing | 1-3 business days |\n| Rejected | Can appeal | — |\n\nIf it takes longer than expected, use the "Expedite" function.',
  },
  {
    keywords: ['欺诈', '作假', '反欺诈', '疑点', '异常'],
    en_keywords: ['fraud', 'fake', 'anomaly', 'suspicious', 'exif'],
    response:
      '**[Adjuster Protocol] 反欺诈与异常检测指引**\n\nAI 标记异常时，理赔员请核实以下核心信息：\n1. **地理位置校验**：比对照片 EXIF GPS 数据与报案地点。相差 > 2km 视为高危。\n2. **时间戳校验**：检查照片修改时间，是否存在人为篡改痕迹。\n3. **多头理赔查询**：查询历史理赔记录，识别同一伤者/财物在多家保险公司的重复索赔。\n4. **人伤合理性**：核对医院发票是否包含与事故无关的慢性病治疗费。\n\n**建议操作**：点击 "Request new photos" 要求补充实时带时间戳的水印照片，或转交特别调查组(SIU)。',
    en_response:
      '**[Adjuster Protocol] Fraud & Anomaly Detection Guide**\n\nWhen AI flags an anomaly, please verify:\n1. **Location Check**: Compare photo EXIF GPS with reported location. > 2km difference is high risk.\n2. **Timestamp Check**: Check photo modification time for tampering.\n3. **Duplicate Claims**: Query history for multiple claims on same damage/injury across carriers.\n4. **Injury Rationality**: Ensure hospital invoices do not include unrelated chronic diseases.\n\n**Recommended Action**: Click "Request new photos" to demand real-time watermarked photos, or escalate to Special Investigation Unit (SIU).',
  },
  {
    keywords: ['合规', '日志', '监管', '审计', '规则'],
    en_keywords: ['compliance', 'logs', 'audit', 'regulation', 'rules'],
    response:
      '**[Admin Protocol] 合规与审计查询**\n\n系统所有操作均受合规监控记录。\n\n1. **理赔员决定审计**：理赔员拒绝或批准案件时，必须填写 `Adjuster Notes` 作为合法审计依据。此字段永久不可修改。\n2. **AI 黑箱透明化**：AI 做出的每个决定均附带推理日志（Reasoning Logs），确保监管层审查可溯源。\n3. **数据隐私脱敏**：系统级总览仪表盘自动将敏感客户信息(PII)替换为 `***`，仅在具有独立授权的案件视图中可见。\n\n如有合规漏洞，请前往 Reporting 页生成完整的合规流水报告。',
    en_response:
      '**[Admin Protocol] Compliance & Audit Query**\n\nAll system operations are monitored for compliance.\n\n1. **Adjuster Decision Audit**: Approving/Rejecting claims mandates `Adjuster Notes` for legal auditability. These notes are permanently immutable.\n2. **AI Transparency**: Every AI decision includes Reasoning Logs, ensuring traceability for regulatory review.\n3. **PII Masking**: Dashboards automatically mask sensitive Personally Identifiable Information (PII) with `***`, only visible within isolated authorized claim views.\n\nFor compliance gaps, generate a full audit trail report in the Reporting module.',
  },
]

const DEFAULT_RESPONSE =
  'Thank you for your question! I am the AI Claims Assistant. I can help you with:\n\n• **Claims Process** — How to submit a claim, required documents\n• **Policy Terms** — Coverage, exclusions\n• **Settlement Calculation** — How the claim amount is calculated\n• **Status Inquiry** — Explanation of case status\n\nPlease tell me what you need help with, and I will be happy to assist you 😊'

export function mockAiChat(message: string): string {
  const lower = message.toLowerCase()
  const isEnglish = !/[\u4e00-\u9fa5]/.test(message)

  if (isEnglish) {
    if (lower.includes('what should i do')) {
      return '[Knowledge Base] According to the insurance policy: Please report the incident within 48 hours.\n\nIf you need to file a claim, please tell me "I want to file a claim".'
    }
  }

  for (const reply of MOCK_REPLIES) {
    if (isEnglish && reply.en_keywords) {
      if (reply.en_keywords.some(k => lower.includes(k))) {
        return reply.en_response || reply.response
      }
    } else {
      if (reply.keywords.some(k => lower.includes(k))) {
        return reply.response
      }
    }
  }

  if (isEnglish) {
    return DEFAULT_RESPONSE
  }
  return '感谢您的提问！我是您的理赔专属 AI 助手。我能为您解答理赔进度、条款、计算规则和应备材料。\n\n请告诉我您需要什么帮助 😊'
}
