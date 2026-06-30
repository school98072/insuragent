import os
import fitz

# Define output path
OUTPUT_PATH = "/Users/benjaminchung/Desktop/Insuragent/Benjamin_Zhong_Resume.pdf"
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)

def create_resume_pdf():
    print("[PDF Generator] Creating Benjamin Zhong's PDF resume...")
    
    # Initialize A4 document (595 x 842 points)
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)
    
    # Define styles
    font_bold = "helvetica-bold"
    font_regular = "helvetica"
    font_italic = "helvetica-oblique"
    
    # Starting vertical position
    y = 50
    margin_left = 50
    margin_right = 545
    page_width = 595
    
    # ---------------------------------------------------------------------------
    # HEADER (Name & Contacts)
    # ---------------------------------------------------------------------------
    # Name
    rect_name = fitz.Rect(margin_left, y, margin_right, y + 30)
    page.insert_textbox(rect_name, "Benjamin Zhong", fontsize=22, fontname=font_bold, align=1) # align=1 is centered
    y += 28
    
    # Contacts
    contact_text = "Phone: +86 13264390228  |  Email: benjamin98072@163.com  |  Location: Beijing"
    rect_contact = fitz.Rect(margin_left, y, margin_right, y + 15)
    page.insert_textbox(rect_contact, contact_text, fontsize=9, fontname=font_regular, align=1)
    y += 25
    
    # Top divider line
    page.draw_line(fitz.Point(margin_left, y), fitz.Point(margin_right, y), color=(0.1, 0.2, 0.4), width=1.5)
    y += 15
    
    # Helper to draw Section Headings
    def draw_section_heading(title: str, current_y: float) -> float:
        rect = fitz.Rect(margin_left, current_y, margin_right, current_y + 18)
        page.insert_textbox(rect, title, fontsize=11, fontname=font_bold, color=(0.1, 0.2, 0.4))
        current_y += 14
        page.draw_line(fitz.Point(margin_left, current_y), fitz.Point(margin_right, current_y), color=(0.6, 0.6, 0.6), width=0.5)
        current_y += 8
        return current_y

    # Helper to draw a single bullet point
    def draw_bullet(text: str, current_y: float, bullet_char: str = "•") -> float:
        # We use a rect to allow auto-wrapping of bullet text
        rect = fitz.Rect(margin_left + 15, current_y, margin_right, current_y + 40)
        # Check text length to estimate rect height
        text_len = len(text)
        num_lines = 1 + (text_len // 95)
        rect_height = num_lines * 12
        
        # Draw bullet symbol
        page.insert_text(fitz.Point(margin_left + 5, current_y + 8), bullet_char, fontsize=8, fontname=font_regular)
        # Draw text
        page.insert_textbox(rect, text, fontsize=8.5, fontname=font_regular, lineheight=11)
        current_y += rect_height + 1
        return current_y

    # ---------------------------------------------------------------------------
    # 1. PROFESSIONAL SUMMARY
    # ---------------------------------------------------------------------------
    y = draw_section_heading("PROFESSIONAL SUMMARY", y)
    summary_text = (
        "Finance & Performance Specialist with 3+ years of experience across enterprise digital transformation, "
        "corporate finance, and system integration. Adept at diagnosing operational bottlenecks, designing structured "
        "workflows, and translating complex accounting regulations into enterprise solutions (SAP FICO). Proven "
        "record in leading cross-functional alignment (Business, Risk, IT) to deliver regulatory-compliant, "
        "automated process workflows that drive profitability and efficiency."
    )
    rect_summary = fitz.Rect(margin_left, y, margin_right, y + 45)
    page.insert_textbox(rect_summary, summary_text, fontsize=8.5, fontname=font_regular, lineheight=11)
    y += 42
    
    # ---------------------------------------------------------------------------
    # 2. PROFESSIONAL EXPERIENCE
    # ---------------------------------------------------------------------------
    y = draw_section_heading("PROFESSIONAL EXPERIENCE", y)
    
    # --- NETSOL ---
    # Title & Date
    page.insert_text(fitz.Point(margin_left, y + 10), "NETSOL Technologies Inc. | Beijing", fontsize=10, fontname=font_bold)
    page.insert_text(fitz.Point(margin_right - 90, y + 10), "Jun 2024 - Jan 2026", fontsize=9, fontname=font_bold)
    y += 12
    # Subtitle
    page.insert_text(fitz.Point(margin_left, y + 10), "Business Analyst / Proxy Product Manager (Auto & Wholesale Finance)", fontsize=9, fontname=font_italic)
    y += 14
    
    # Bullets
    y = draw_bullet(
        "Finance Process Re-engineering: Spearheaded business requirement definitions for core commercial lending modules; "
        "mapped complex credit and cash allocation workflows to align with PBOC regulatory reporting and KYC compliance standards.", y
    )
    y = draw_bullet(
        "Accounting & ERP System Integration: Led the functional design of Sale-Leaseback financing products; "
        "translated complex leasing accounting standards, treasury fund flows, and daily ledger settlement logic into actionable system specifications (SAP FICO).", y
    )
    y = draw_bullet(
        "Zero-Touch Operations Design: Designed and implemented an automated post-lending write-off and collection workflow, "
        "replacing manual 90/180-day intervention processes with a robust automated model that reduced transaction cycle times by 40%.", y
    )
    y = draw_bullet(
        "Cross-functional Collaboration: Partnered seamlessly with Legal, Risk, and IT stakeholders to roll out the Wholesale Financing System (WFS) "
        "across a 50+ dealer network, ensuring all commercial financing scenarios and vehicle release conditions met stringent compliance requirements.", y
    )
    y += 4
    
    # --- HSBC ---
    # Title & Date
    page.insert_text(fitz.Point(margin_left, y + 10), "HSBC Bank | London", fontsize=10, fontname=font_bold)
    page.insert_text(fitz.Point(margin_right - 90, y + 10), "Oct 2023 - Jan 2024", fontsize=9, fontname=font_bold)
    y += 12
    # Subtitle
    page.insert_text(fitz.Point(margin_left, y + 10), "Commercial Banking Sustainable Finance Projects (ESG)", fontsize=9, fontname=font_italic)
    y += 14
    
    # Bullets
    y = draw_bullet(
        "E&S Risk & Sustainable Financing: Developed a comprehensive carbon footprint tracking framework for the automotive supply chain, "
        "directly supporting the bank's sustainable financing and positive impact transaction initiatives.", y
    )
    y = draw_bullet(
        "ESG Integration: Transformed complex multi-level emission data into actionable climate risk indicators based on UN PRI and industry "
        "ESG standards, achieving 95% data coverage for portfolio analysis.", y
    )
    y = draw_bullet(
        "Senior Management Pitching: Delivered a high-profile Sustainable Finance Solutions demonstration to senior management, "
        "successfully showcasing advanced ESG integration and climate risk analysis capabilities adopted into departmental credit practices.", y
    )
    y += 4

    # --- PwC IT ---
    # Title & Date
    page.insert_text(fitz.Point(margin_left, y + 10), "PwC IT | Shanghai", fontsize=10, fontname=font_bold)
    page.insert_text(fitz.Point(margin_right - 90, y + 10), "Mar 2021 - Jun 2022", fontsize=9, fontname=font_bold)
    y += 12
    # Subtitle
    page.insert_text(fitz.Point(margin_left, y + 10), "PMO Strategy Delivery Specialist", fontsize=9, fontname=font_italic)
    y += 14
    
    # Bullets
    y = draw_bullet(
        "Finance-Driven Project PMO: Headed the PMO office for a large-scale enterprise digital transformation project; "
        "established unified cost-tracking dashboards and milestone verification protocols, accelerating implementation by 3 months and achieving CNY 10 million in cost savings.", y
    )
    y = draw_bullet(
        "Data Governance & Compliance: Formulated cross-border data governance SOPs, aligning internal transfer pricing data flows "
        "and financial reporting workflows with international regulatory and compliance standards.", y
    )
    y += 4

    # --- SHANGHAI COMMERCIAL ---
    # Title & Date
    page.insert_text(fitz.Point(margin_left, y + 10), "Shanghai Commercial & Savings Bank | Taipei", fontsize=10, fontname=font_bold)
    page.insert_text(fitz.Point(margin_right - 90, y + 10), "Jan 2020 - Jan 2021", fontsize=9, fontname=font_bold)
    y += 12
    # Subtitle
    page.insert_text(fitz.Point(margin_left, y + 10), "Corporate Relationship Manager / Business Development", fontsize=9, fontname=font_italic)
    y += 14
    
    # Bullets
    y = draw_bullet(
        "Client Acquisition & Relationship Management: Proactively originated and developed corporate client relationships, conducting "
        "in-depth financial research and requirements gathering for over 100 enterprise prospects.", y
    )
    y = draw_bullet(
        "Business Growth: Onboarded 30+ new corporate clients by pitching suitable commercial banking solutions, consistently exceeding "
        "performance metrics and achieving 120% of the annual sales quota.", y
    )
    y += 4

    # ---------------------------------------------------------------------------
    # 3. EDUCATION
    # ---------------------------------------------------------------------------
    y = draw_section_heading("EDUCATION", y)
    
    # Edinburgh
    page.insert_text(fitz.Point(margin_left, y + 10), "University of Edinburgh", fontsize=9.5, fontname=font_bold)
    page.insert_text(fitz.Point(margin_right - 90, y + 10), "Sep 2022 - Dec 2023", fontsize=8.5, fontname=font_bold)
    page.insert_text(fitz.Point(margin_left, y + 21), "Master of Science in Finance (Risk Management & Quantitative Modeling Focus)", fontsize=8.5, fontname=font_italic)
    y += 26
    
    # NTUB
    page.insert_text(fitz.Point(margin_left, y + 10), "National Taipei University of Business", fontsize=9.5, fontname=font_bold)
    page.insert_text(fitz.Point(margin_right - 90, y + 10), "Sep 2016 - Jun 2020", fontsize=8.5, fontname=font_bold)
    page.insert_text(fitz.Point(margin_left, y + 21), "Bachelor of Science in Business Administration", fontsize=8.5, fontname=font_italic)
    y += 28

    # ---------------------------------------------------------------------------
    # 4. SKILLS & EXPERTISE
    # ---------------------------------------------------------------------------
    y = draw_section_heading("SKILLS & EXPERTISE", y)
    
    skills_text = (
        "• Banking & Risk Management: Corporate Relationship Management, Credit Application & E&S Memos, KYC & Onboarding, Commercial Lending, NPL Management, PBOC Compliance.\n"
        "• ESG & Strategy: Sustainable Financing, Climate Risk Analysis, UN PRI Standards, Corporate Governance.\n"
        "• Technical Tools: SQL, Python (Monte Carlo simulation, automated data processing), Excel, Tableau, SAP FICO.\n"
        "• Language: Native Mandarin Chinese, Fluent English (Academic/Business)."
    )
    rect_skills = fitz.Rect(margin_left, y, margin_right, y + 55)
    page.insert_textbox(rect_skills, skills_text, fontsize=8.5, fontname=font_regular, lineheight=11)
    
    # Save PDF
    doc.save(OUTPUT_PATH)
    doc.close()
    print(f"[PDF Generator] Successfully generated resume PDF at: {OUTPUT_PATH}")
    print(f"File size: {os.path.getsize(OUTPUT_PATH)} bytes")

if __name__ == "__main__":
    create_resume_pdf()
