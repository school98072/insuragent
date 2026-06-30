import React, { useState, useEffect } from 'react'
import { Card, Input, Button, List, Typography, Tag, Space, Spin, Row, Col, Empty } from 'antd'
import { SearchOutlined, FileTextOutlined, ArrowLeftOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { aiApi, KnowledgeResult } from '@/api/ai'

// ── Demo knowledge base ──────────────────────────────────────────────
interface MockDoc { title: string; text: string; source: string; tags: string[]; category: string }

const MOCK_DOCS: MockDoc[] = [
  {
    category: 'process', 
    title: 'Standard Motor Claim Procedure',
    source: 'Claims Manual v3.2',
    tags: ['Motor', 'Process'],
    text: `Standard motor claim procedure consists of five steps:\n1. Report the accident within 24 hours by calling the customer hotline. Provide the time, location, and a brief description of the damage.\n2. Cooperate with the assessor for on-site inspection. Take clear photos of the accident scene and do not move the vehicle unless required for safety.\n3. Submit required documentation: vehicle registration, driver's license, accident responsibility determination, and repair invoices.\n4. Wait for loss assessment review. The approval cycle typically takes 3 to 5 business days.\n5. Once approved, the payout will be transferred to the policyholder's bank account within 5 business days.`,
  },
  {
    category: 'process', 
    title: 'Required Health Claim Documents',
    source: 'Health Claims Guide 2024',
    tags: ['Health', 'Checklist'],
    text: `Required documents for health insurance claims include:\n① Completed Claim Application Form (provided by insurer)\n② Copy of insured person's government ID\n③ Hospital discharge summary or outpatient medical records (original)\n④ Medical expense invoices (original) and detailed itemized billing statement\n⑤ Bank account details for reimbursement transfer\n\nSpecial Notice: Outpatient claims exceeding $1,000 require a formal medical diagnosis report. Critical illness claims must include a pathology report.`,
  },
  {
    category: 'clause', 
    title: 'Third-Party Liability Clause Interpretation',
    source: 'Policy Terms Library MT-2024-001',
    tags: ['Motor', 'Liability', 'Scope'],
    text: `Third-Party Liability coverage scope:\n• Covers legal compensation liability incurred by the insured for bodily injury or property damage to third parties arising from the use of the insured vehicle.\n\nPrimary Exclusions:\n• Intentional acts by the policyholder or driver\n• Driving under the influence of alcohol or drugs\n• Driving without a valid driver's license\n• Damage caused while the vehicle was reported stolen\n• Force majeure events such as earthquakes and war\n\nLiability limits can be selected during policy purchase (ranging from $200k, $500k, $1M to $2M).`,
  },
  {
    category: 'clause', 
    title: 'Critical Illness Definitions',
    source: 'Critical Illness Standard 2020',
    tags: ['Health', 'Definitions'],
    text: `Standard critical illness definitions prescribed by the Insurance Association:\n1. Malignant Tumor (Cancer): Confirmed by pathological examination, excluding carcinoma in situ and pre-malignant skin lesions.\n2. Acute Myocardial Infarction: Requires typical clinical symptoms + characteristic ECG changes + elevated cardiac enzyme markers.\n3. Stroke Sequelae: Must result in permanent neurological deficits persisting for at least 180 days.\n4. Major Organ Transplant: Surgical transplantation of heart, lung, liver, kidney, or bone marrow.\n5. Coronary Artery Bypass Graft (CABG): Requires open-chest surgery.\n6. End-Stage Renal Disease (ESRD): Requires regular long-term dialysis treatment.`,
  },
  {
    category: 'case', 
    title: 'Case Study: Rear-End Collision Settlement',
    source: 'Precedent Library #2847',
    tags: ['Motor', 'Rear-End', 'Liability'],
    text: `Case Summary: Policyholder collided with the rear of another vehicle and was determined to be 100% at fault. The third-party repair cost was $8,500, and medical expenses for the third-party driver were $2,300.\n\nSettlement Decision:\n• Third-party vehicle repairs ($8,500) paid in full under the Policyholder's Third-Party Liability coverage.\n• Third-party medical bills ($2,300) covered under the medical expense sub-limit.\n• Policyholder's own vehicle damage paid under their Own Damage coverage, minus a $500 deductible.\n• No exclusion criteria matched. Total payout approved: $10,800.`,
  },
  {
    category: 'case', 
    title: 'Case Study: Vehicle Flood Damage Claim',
    source: 'Precedent Library #3102',
    tags: ['Motor', 'Natural Disaster', 'Flood'],
    text: `Case Summary: Insured vehicle was submerged in a heavy rainstorm, causing severe engine damage. The repair cost was estimated at $32,000.\n\nKey Audit Points:\n• Did the insured purchase the "Special Engine Damage" optional rider? → Yes, verified. ✓\n• Did the driver attempt to restart the engine after it stalled in water (which excludes liability)? → Loss inspection verified no restart was attempted. ✓\n• Is the water level consistent with regional storm records? → Yes, verified.\n\nSettlement Decision: Approved payout of $32,000, minus a $500 deductible. Final payout: $31,500.`,
  },
  {
    category: 'law', 
    title: 'Insurance Law Section 65 — Liability Rules',
    source: 'National Insurance Code',
    tags: ['Statutes', 'Liability', 'Payout'],
    text: `Section 65: With respect to liability insurance, the insurer may, in accordance with the provisions of law or the terms of the contract, make compensation payments directly to the injured third party.\n\nWhere the liability of the insured to a third party has been determined, the insurer, upon request of the insured, shall pay the insurance benefits directly to such third party. If the insured fails or refuses to make the request, the third party has the right to request payment of insurance benefits directly from the insurer.`,
  },
  {
    category: 'law', 
    title: 'Statutory Limitation Periods for Claims',
    source: 'Insurance Law Interpretations',
    tags: ['Statutes', 'Limitations', 'Timelines'],
    text: `Statutory limitation periods and processing timelines:\n• Claim Notification: The insured must notify the insurer within the contractually specified period (typically 5 to 7 days). Failure to notify in time may affect claim verification.\n• Limitation of Action: The limitation period for litigation is 5 years for life insurance contracts and 2 years for non-life insurance contracts.\n• Payment Term: The insurer must make payout within 10 business days after reaching an agreement on the compensation amount. If the claim is rejected, a written denial notice must be sent within 3 business days.\n• Assessment Period: The insurer must make a claim determination within 30 days after receiving all required documents.`,
  },
]

const CATEGORIES = [
  { key: 'process', label: 'Claim Process', icon: '📋', color: '#2563eb', bg: '#eff6ff', count: 50 },
  { key: 'clause',  label: 'Policy Terms', icon: '📄', color: '#059669', bg: '#ecfdf5', count: 182 },
  { key: 'case',    label: 'Case References', icon: '🔍', color: '#7c3aed', bg: '#f5f3ff', count: 32 },
  { key: 'law',     label: 'Regulations', icon: '⚖️', color: '#d97706', bg: '#fef3c7', count: 512 },
]

const QUICK_QUERIES = [
  'Required documents for auto claims',
  'Health insurance reimbursement process',
  'What is a policy deductible?',
  'Fraud detection standards',
]

function scoreDoc(doc: MockDoc, query: string): number {
  const q = query.toLowerCase()
  let score = 0
  if (doc.title.toLowerCase().includes(q)) score += 3
  if (doc.text.toLowerCase().includes(q)) score += 2
  if (doc.tags.some(t => t.toLowerCase().includes(q))) score += 2
  if (doc.source.toLowerCase().includes(q)) score += 1
  
  const words = q.split(/\s+/).filter(Boolean)
  for (const w of words) {
    if (w.length < 2) continue
    if (doc.title.toLowerCase().includes(w)) score += 1
    if (doc.text.toLowerCase().includes(w)) score += 0.5
  }
  return score
}

function searchDocs(query: string, categoryFilter?: string): Array<{ doc: MockDoc; score: number }> {
  const docs = categoryFilter ? MOCK_DOCS.filter(d => d.category === categoryFilter) : MOCK_DOCS
  if (!query.trim()) return docs.map(doc => ({ doc, score: 1 }))
  return docs
    .map(doc => ({ doc, score: scoreDoc(doc, query) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
}

export default function KnowledgePage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Array<{ doc: MockDoc; score: number }>>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null)

  // Pre-load mock docs on mount without triggering backend call or loading spinner
  useEffect(() => {
    const initialDocs = MOCK_DOCS.map(doc => ({ doc, score: 1 }))
    setResults(initialDocs)
  }, [])

  const doSearch = async (q: string, cat?: string | null) => {
    setLoading(true)
    setSearched(true)
    setExpandedIdx(null)
    
    try {
      // Connect to actual backend RAG API
      const res = await aiApi.searchKnowledge(q);
      if (res.data.results && res.data.results.length > 0) {
        // Map backend results to the UI display format
        const mapped = res.data.results.map((r) => {
          const lines = r.text.split('\n').map(l => l.trim()).filter(Boolean);
          const rawTitle = lines[0] || 'Policy Reference';
          // Clean title of markdown headers
          const cleanTitle = rawTitle.replace(/^[#*-\s:]+/, '').trim();
          const title = cleanTitle.length > 60 ? cleanTitle.substring(0, 60) + '...' : cleanTitle;
          
          // Map backend category to frontend tags
          const catLabel = r.category === 'process' ? 'Process' : 
                           r.category === 'clause' ? 'Clause' :
                           r.category === 'case' ? 'Case' :
                           r.category === 'law' ? 'Law' : 'Reference';
          
          return {
            doc: {
              category: r.category || 'clause',
              title,
              text: r.text,
              source: r.source || 'Knowledge Base RAG',
              tags: ['RAG', 'Verified', catLabel],
            },
            score: r.score
          };
        });
        
        // Filter by category client side if activeCategory is selected
        const filtered = cat ? mapped.filter(item => item.doc.category === cat) : mapped;
        setResults(filtered.length > 0 ? filtered : mapped);
      } else {
        // Fallback to local search if no results returned
        const found = searchDocs(q, cat ?? undefined);
        setResults(found);
      }
    } catch (err) {
      console.error('RAG search failed, falling back to local database:', err);
      const found = searchDocs(q, cat ?? undefined);
      setResults(found);
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (q?: string) => {
    const term = q ?? query
    setQuery(term)
    doSearch(term, activeCategory)
  }

  const handleCategoryClick = (key: string) => {
    const next = activeCategory === key ? null : key
    setActiveCategory(next)
    doSearch(query, next)
  }

  const handleQuickQuery = (q: string) => {
    setQuery(q)
    setActiveCategory(null)
    doSearch(q, null)
  }

  const catConfig = CATEGORIES.reduce((acc, c) => ({ ...acc, [c.key]: c }), {} as Record<string, typeof CATEGORIES[0]>)

  const maxScore = results.length > 0 ? Math.max(...results.map(r => r.score)) : 1
  const relevancePct = (score: number) => Math.min(100, Math.round((score / maxScore) * 100))

  return (
    <div>
      <Typography.Title level={4} style={{ margin: '0 0 4px', fontWeight: 700, color: '#111827' }}>
        Insurance Knowledge Base
      </Typography.Title>
      <Typography.Text style={{ color: '#6b7280', fontSize: 13 }}>
        AI-powered RAG search for policy terms, claim guidelines, and case references.
      </Typography.Text>

      {/* Search card */}
      <Card style={{ margin: '16px 0' }}>
        <Space.Compact style={{ width: '100%' }}>
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onPressEnter={() => handleSearch()}
            placeholder="Search policy terms, audit rules, reference cases..."
            size="large"
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            style={{ borderRadius: '8px 0 0 8px' }}
            allowClear
            onClear={() => { setQuery(''); setSearched(false); setResults([]); setActiveCategory(null) }}
          />
          <Button
            type="primary"
            icon={<SearchOutlined />}
            onClick={() => handleSearch()}
            size="large"
            style={{ borderRadius: '0 8px 8px 0', width: 100, fontWeight: 500 }}
          >
            Search
          </Button>
        </Space.Compact>

        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>Quick Queries:</span>
          {QUICK_QUERIES.map(q => (
            <button key={q} onClick={() => handleQuickQuery(q)} style={{
              border: `1px solid ${query === q ? '#2563eb' : '#e5e7eb'}`,
              borderRadius: 20, padding: '4px 12px', background: query === q ? '#eff6ff' : '#fff',
              cursor: 'pointer', fontSize: 12, color: query === q ? '#2563eb' : '#374151',
              display: 'flex', alignItems: 'center', gap: 4, transition: '0.15s',
            }}>
              <ThunderboltOutlined style={{ fontSize: 10 }} /> {q}
            </button>
          ))}
        </div>
      </Card>

      {/* Category filter row */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        {CATEGORIES.map(cat => {
          const active = activeCategory === cat.key
          return (
            <Col key={cat.key} xs={12} sm={6}>
              <Card
                hoverable
                onClick={() => handleCategoryClick(cat.key)}
                style={{
                  cursor: 'pointer', transition: '0.15s',
                  border: `2px solid ${active ? cat.color : '#f3f4f6'}`,
                  background: active ? cat.bg : '#fff',
                }}
                bodyStyle={{ padding: '14px 16px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 24 }}>{cat.icon}</span>
                  <div>
                    <div style={{ fontWeight: 600, color: active ? cat.color : '#374151', fontSize: 14 }}>{cat.label}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{cat.count} articles</div>
                  </div>
                  {active && <Tag style={{ marginLeft: 'auto', background: cat.bg, color: cat.color, border: 'none', fontSize: 10 }}>Filtered</Tag>}
                </div>
              </Card>
            </Col>
          )
        })}
      </Row>

      {/* State: idle / no search */}
      {!searched && (
        <Card title={<span style={{ fontSize: 14, fontWeight: 600 }}>📊 Knowledge Base Overview</span>}>
          <Row gutter={[24, 16]}>
            {[
              { label: 'Policy Documents', count: '2,847', icon: '📄' },
              { label: 'Claim Cases',     count: '15,392', icon: '📋' },
              { label: 'Regulations & Laws', count: '483',    icon: '⚖️' },
              { label: 'Medical Directory', count: '8,619',  icon: '💊' },
            ].map(item => (
              <Col key={item.label} xs={12} sm={6} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 4 }}>{item.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#111827' }}>{item.count}</div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>{item.label}</div>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
          <div style={{ color: '#9ca3af', marginTop: 12, fontSize: 13 }}>Retrieving from Knowledge Base...</div>
        </div>
      )}

      {/* No results */}
      {!loading && searched && results.length === 0 && (
        <Card>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={<span style={{ color: '#9ca3af' }}>No results found. Try different keywords.</span>} />
        </Card>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <div>
          {/* Breadcrumb / context bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#6b7280', fontSize: 13 }}>
                Found <strong style={{ color: '#111827' }}>{results.length}</strong> results
              </span>
              {activeCategory && (
                <Tag style={{ background: catConfig[activeCategory].bg, color: catConfig[activeCategory].color, border: 'none' }}>
                  {catConfig[activeCategory].icon} {catConfig[activeCategory].label}
                </Tag>
              )}
              {query && <Tag style={{ background: '#f3f4f6', color: '#374151', border: 'none' }}>"{query}"</Tag>}
            </div>
            <button onClick={() => { setSearched(false); setResults([]); setQuery(''); setActiveCategory(null) }}
              style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
              <ArrowLeftOutlined style={{ fontSize: 10 }} /> Clear Results
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {results.map(({ doc, score }, idx) => {
              const cat = catConfig[doc.category] || { bg: '#f3f4f6', color: '#6b7280', icon: '📄', label: 'Reference' }
              const pct = relevancePct(score)
              const expanded = expandedIdx === idx

              return (
                <Card
                  key={idx}
                  hoverable
                  onClick={() => setExpandedIdx(expanded ? null : idx)}
                  style={{ cursor: 'pointer', transition: '0.15s', border: expanded ? `1px solid ${cat.color}40` : '1px solid #e5e7eb' }}
                  bodyStyle={{ padding: '16px 20px' }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    {/* Icon */}
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: cat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                      {cat.icon}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* Title row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{doc.title}</span>
                        <Tag style={{ background: cat.bg, color: cat.color, border: 'none', fontSize: 11 }}>{cat.label}</Tag>
                        {doc.tags.map(t => (
                          <Tag key={t} style={{ background: '#f3f4f6', color: '#6b7280', border: 'none', fontSize: 11 }}>{t}</Tag>
                        ))}
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af', flexShrink: 0 }}>Relevance {pct}%</span>
                      </div>

                      {/* Preview / full text */}
                      <Typography.Paragraph
                        style={{ margin: 0, fontSize: 13, color: '#4b5563', lineHeight: 1.7, whiteSpace: 'pre-line' }}
                        ellipsis={expanded ? false : { rows: 2 }}
                      >
                        {doc.text}
                      </Typography.Paragraph>

                      {/* Footer */}
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>📁 {doc.source}</span>
                        <span style={{ fontSize: 12, color: cat.color, fontWeight: 500 }}>
                          {expanded ? 'Collapse ↑' : 'Expand ↓'}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
