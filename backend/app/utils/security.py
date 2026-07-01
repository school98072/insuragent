import re

class SecurityGuardrails:
    def __init__(self):
        # Patterns to mask PII (Personal Identifiable Information)
        self.pii_patterns = {
            "ssn": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
            "email": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
        }
        # Keywords suggesting potential prompt injection attacks
        self.injection_keywords = [
            "ignore previous instructions", 
            "system prompt", 
            "become admin", 
            "bypass system rules"
        ]

    def sanitize_input(self, text: str) -> str:
        """
        Sanitize input text:
        1. Strip outer whitespaces.
        2. Scan for prompt injection keywords.
        3. Mask PII information (email, SSN).
        """
        if not text:
            return ""
            
        cleaned_text = text.strip()
        
        # 1. Prompt Injection Scanning
        for keyword in self.injection_keywords:
            if keyword in cleaned_text.lower():
                raise PermissionError("Security alert: Prompt injection threat blocked.")
                
        # 2. PII Masking
        for pii_type, pattern in self.pii_patterns.items():
            cleaned_text = pattern.sub(f"[MASKED_{pii_type.upper()}]", cleaned_text)
            
        return cleaned_text
