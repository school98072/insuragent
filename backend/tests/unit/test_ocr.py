"""
Tests for app.services.ai.ocr — OCRService

Covers:
- Raw text extraction routing (medical, vehicle, unknown)
- Medical bill structured extraction (hospital, patient, amounts, line items)
- Vehicle damage structured extraction (damage type, parts, costs)
- Unknown file type fallback behavior
"""
import pytest
from app.services.ai.ocr import OCRService


@pytest.fixture
def ocr_service():
    return OCRService()


# ===========================================================================
# Raw text extraction routing
# ===========================================================================

class TestExtractText:
    """Verify file path keywords route to correct mock OCR output."""

    async def test_should_extract_medical_text_when_invoice_in_path(self, ocr_service):
        result = await ocr_service.extract_text("/uploads/medical_invoice_001.jpg")
        assert result["source"] == "mock_medical_ocr"
        assert result["confidence"] == 0.95
        assert "张三" in result["text"]
        assert "靶向药" in result["text"]

    async def test_should_extract_medical_text_when_medical_in_path(self, ocr_service):
        result = await ocr_service.extract_text("/uploads/medical_receipt.pdf")
        assert result["source"] == "mock_medical_ocr"
        assert "人民医院" in result["text"]

    async def test_should_extract_vehicle_text_when_car_in_path(self, ocr_service):
        result = await ocr_service.extract_text("/uploads/car_photo_front.jpg")
        assert result["source"] == "mock_vehicle_vision"
        assert result["confidence"] == 0.92
        assert "碰撞" in result["text"]

    async def test_should_extract_vehicle_text_when_damage_in_path(self, ocr_service):
        result = await ocr_service.extract_text("/uploads/damage_report.pdf")
        assert result["source"] == "mock_vehicle_vision"
        assert "保险杠" in result["text"]

    async def test_should_return_fallback_when_unknown_file_type(self, ocr_service):
        result = await ocr_service.extract_text("/uploads/random_document.pdf")
        assert result["confidence"] == 0.5
        assert result["source"] == "mock"
        assert "未识别" in result["text"]


# ===========================================================================
# Medical bill structured extraction
# ===========================================================================

class TestExtractMedicalBill:
    """Verify structured data extraction from medical bills."""

    async def test_should_extract_hospital_name(self, ocr_service):
        result = await ocr_service.extract_medical_bill("/uploads/medical_invoice.jpg")
        data = result["structured_data"]
        assert data["hospital_name"] == "XX市第一人民医院"

    async def test_should_extract_patient_name(self, ocr_service):
        result = await ocr_service.extract_medical_bill("/uploads/medical_invoice.jpg")
        data = result["structured_data"]
        assert data["patient_name"] == "张三"

    async def test_should_extract_correct_total_amount(self, ocr_service):
        result = await ocr_service.extract_medical_bill("/uploads/medical_invoice.jpg")
        data = result["structured_data"]
        assert data["total_amount"] == 10000.0

    async def test_should_separate_medicare_and_self_paid(self, ocr_service):
        result = await ocr_service.extract_medical_bill("/uploads/medical_invoice.jpg")
        data = result["structured_data"]
        assert data["medicare_covered"] == 1000.0
        assert data["self_paid"] == 9000.0
        # Verify the accounting identity
        assert data["medicare_covered"] + data["self_paid"] == data["total_amount"]

    async def test_should_extract_line_items_with_types(self, ocr_service):
        result = await ocr_service.extract_medical_bill("/uploads/medical_invoice.jpg")
        items = result["structured_data"]["items"]
        assert len(items) == 3
        # Check each item has required fields
        for item in items:
            assert "name" in item
            assert "amount" in item
            assert "type" in item
            assert isinstance(item["amount"], float)
        # Verify self-pay item
        self_pay_items = [i for i in items if i["type"] == "自费"]
        assert len(self_pay_items) == 1
        assert self_pay_items[0]["name"] == "靶向药"

    async def test_should_include_raw_text_alongside_structured_data(self, ocr_service):
        result = await ocr_service.extract_medical_bill("/uploads/medical_invoice.jpg")
        assert "raw_text" in result
        assert "structured_data" in result
        assert len(result["raw_text"]) > 0


# ===========================================================================
# Vehicle damage structured extraction
# ===========================================================================

class TestExtractVehicleDamage:
    """Verify structured data extraction from vehicle damage documents."""

    async def test_should_identify_damage_type(self, ocr_service):
        result = await ocr_service.extract_vehicle_damage("/uploads/car_damage_front.jpg")
        data = result["structured_data"]
        assert data["damage_type"] == "前方碰撞"

    async def test_should_list_damaged_parts_with_severity(self, ocr_service):
        result = await ocr_service.extract_vehicle_damage("/uploads/car_damage_front.jpg")
        items = result["structured_data"]["damage_items"]
        assert len(items) == 3
        for item in items:
            assert "part" in item
            assert "severity" in item
            assert "action" in item
            assert "estimated_cost" in item
            assert isinstance(item["estimated_cost"], float)

    async def test_should_calculate_total_estimated_cost(self, ocr_service):
        result = await ocr_service.extract_vehicle_damage("/uploads/car_damage_front.jpg")
        data = result["structured_data"]
        assert data["total_estimated_cost"] == 4200.0
        # Verify total matches sum of parts
        parts_total = sum(item["estimated_cost"] for item in data["damage_items"])
        assert parts_total == data["total_estimated_cost"]

    async def test_should_include_bumper_replacement_recommendation(self, ocr_service):
        result = await ocr_service.extract_vehicle_damage("/uploads/car_damage_front.jpg")
        items = result["structured_data"]["damage_items"]
        bumper = [i for i in items if i["part"] == "前保险杠"][0]
        assert bumper["severity"] == "严重碎裂"
        assert "更换" in bumper["action"]
        assert bumper["estimated_cost"] == 2500.0

    async def test_should_include_raw_text_alongside_structured_data(self, ocr_service):
        result = await ocr_service.extract_vehicle_damage("/uploads/car_damage_front.jpg")
        assert "raw_text" in result
        assert "structured_data" in result
        assert "碰撞" in result["raw_text"]
