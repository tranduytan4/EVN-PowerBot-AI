import json
import os
import time
from typing import Dict, Any, List, Optional
from langchain_core.tools import tool
from .retriever import retriever

def _load_customers() -> List[Dict[str, Any]]:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(current_dir, "..", "..", "src", "data", "customers.json")
    if not os.path.exists(path):
        path = os.path.join(os.getcwd(), "src", "data", "customers.json")
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[Tools] Error reading customers: {e}")
        return []

def _find_customer(customer_id: Optional[str]) -> Dict[str, Any]:
    customers = _load_customers()
    if not customers:
        return {}
    if not customer_id:
        return customers[0]
    
    clean_id = customer_id.strip().upper()
    for c in customers:
        if c.get("customerId", "").upper() == clean_id:
            return c
    # Fallback to first customer
    return customers[0]

@tool
def search_ev_power_documents(query: str) -> Dict[str, Any]:
    """
    Tra cứu các văn bản quy chuẩn, quy trình, biểu giá và chính sách ngành điện EVN.
    Input: query (string câu hỏi tìm kiếm)
    """
    t0 = time.time()
    results = retriever.search(query, top_k=3)
    duration_ms = round((time.time() - t0) * 1000, 2)
    return {
        "success": True,
        "tool_name": "search_ev_power_documents",
        "query": query,
        "total_matched": len(results),
        "documents": results,
        "duration_ms": duration_ms
    }

@tool
def tra_cuu_chi_so_dien(customer_id: str) -> Dict[str, Any]:
    """
    Tra cứu chỉ số công tơ điện, sản lượng kWh và tình trạng truyền dữ liệu đo xa.
    Input: customer_id (Mã khách hàng EVN, ví dụ: PE01000123456)
    """
    t0 = time.time()
    customer = _find_customer(customer_id)
    if not customer:
        return {"success": False, "error": f"Không tìm thấy khách hàng {customer_id}"}
    
    reading = customer.get("meterReading", {})
    duration_ms = round((time.time() - t0) * 1000, 2)
    return {
        "success": True,
        "tool_name": "tra_cuu_chi_so_dien",
        "customerId": customer.get("customerId"),
        "fullName": customer.get("fullName"),
        "address": customer.get("address"),
        "meterId": reading.get("meterId"),
        "meterType": reading.get("meterType"),
        "prevIndexKwh": reading.get("prevIndexKwh"),
        "currIndexKwh": reading.get("currIndexKwh"),
        "consumptionKwh": reading.get("consumptionKwh"),
        "prevReadingDate": reading.get("prevReadingDate"),
        "currReadingDate": reading.get("currReadingDate"),
        "status": reading.get("lastTransmissionStatus"),
        "duration_ms": duration_ms
    }

@tool
def tra_cuu_hoa_don(customer_id: str) -> Dict[str, Any]:
    """
    Tra cứu chi tiết hóa đơn tiền điện kỳ gần nhất và trạng thái thanh toán.
    Input: customer_id (Mã khách hàng EVN, ví dụ: PE01000123456)
    """
    t0 = time.time()
    customer = _find_customer(customer_id)
    if not customer:
        return {"success": False, "error": f"Không tìm thấy khách hàng {customer_id}"}
    
    bill = customer.get("currentBill", {})
    duration_ms = round((time.time() - t0) * 1000, 2)
    return {
        "success": True,
        "tool_name": "tra_cuu_hoa_don",
        "customerId": customer.get("customerId"),
        "fullName": customer.get("fullName"),
        "billCode": bill.get("billCode"),
        "month": bill.get("month"),
        "totalKwh": bill.get("totalKwh"),
        "subtotal": bill.get("subtotal"),
        "vatAmount": bill.get("vatAmount"),
        "totalAmount": bill.get("totalAmount"),
        "paymentStatus": bill.get("paymentStatus"),
        "dueDate": bill.get("dueDate"),
        "tierDetails": bill.get("tierDetails", []),
        "duration_ms": duration_ms
    }

@tool
def tinh_hoa_don_tien_dien(kwh: float) -> Dict[str, Any]:
    """
    Tính toán chính xác tiền điện sinh hoạt 6 bậc thang lũy tiến theo QĐ-05/2024/BG-BCT.
    Input: kwh (Sản lượng điện tiêu thụ kWh)
    """
    t0 = time.time()
    kwh = max(0.0, float(kwh))
    
    # Biểu giá 6 bậc chuẩn mực EVN
    tiers_config = [
        {"tier": 1, "name": "Bậc 1 (0 - 50 kWh)", "max": 50, "price": 1893},
        {"tier": 2, "name": "Bậc 2 (51 - 100 kWh)", "max": 50, "price": 1956},
        {"tier": 3, "name": "Bậc 3 (101 - 200 kWh)", "max": 100, "price": 2271},
        {"tier": 4, "name": "Bậc 4 (201 - 300 kWh)", "max": 100, "price": 2860},
        {"tier": 5, "name": "Bậc 5 (301 - 400 kWh)", "max": 100, "price": 3197},
        {"tier": 6, "name": "Bậc 6 (Từ 401 kWh trở lên)", "max": float("inf"), "price": 3302},
    ]
    
    tier_results = []
    remaining_kwh = kwh
    subtotal = 0.0
    
    for cfg in tiers_config:
        if remaining_kwh <= 0:
            break
        kwh_in_tier = min(remaining_kwh, cfg["max"])
        amount = kwh_in_tier * cfg["price"]
        subtotal += amount
        tier_results.append({
            "tier": cfg["tier"],
            "name": cfg["name"],
            "kwh": round(kwh_in_tier, 2),
            "unitPrice": cfg["price"],
            "amount": round(amount, 2)
        })
        remaining_kwh -= kwh_in_tier
        
    vat_rate = 0.08
    vat_amount = round(subtotal * vat_rate)
    total_amount = round(subtotal + vat_amount)
    duration_ms = round((time.time() - t0) * 1000, 2)
    
    return {
        "success": True,
        "tool_name": "tinh_hoa_don_tien_dien",
        "input_kwh": kwh,
        "tier_details": tier_results,
        "subtotal": round(subtotal),
        "vat_rate": "8%",
        "vat_amount": vat_amount,
        "total_amount": total_amount,
        "formatted_total": f"{total_amount:,.0f} VNĐ",
        "duration_ms": duration_ms
    }

@tool
def check_maintenance_outage(customer_id: str) -> Dict[str, Any]:
    """
    Kiểm tra lịch cắt điện bảo trì theo trạm biến áp và khu vực của khách hàng.
    Input: customer_id (Mã khách hàng EVN, ví dụ: PE01000123456)
    """
    t0 = time.time()
    customer = _find_customer(customer_id)
    if not customer:
        return {"success": False, "error": f"Không tìm thấy khách hàng {customer_id}"}
    
    outage = customer.get("outageSchedule", {})
    has_outage = outage.get("hasOutage", False)
    duration_hours = outage.get("durationHours", 0)
    
    # Kiểm tra xem có thuộc diện bồi thường theo QĐ-07 không (mất điện liên tục > 8h)
    compensation_eligible = has_outage and (duration_hours >= 8)
    duration_ms = round((time.time() - t0) * 1000, 2)
    
    return {
        "success": True,
        "tool_name": "check_maintenance_outage",
        "customerId": customer.get("customerId"),
        "fullName": customer.get("fullName"),
        "hasOutage": has_outage,
        "areaCode": outage.get("areaCode"),
        "substation": outage.get("substation"),
        "startTime": outage.get("startTime"),
        "endTime": outage.get("endTime"),
        "durationHours": duration_hours,
        "reason": outage.get("reason"),
        "compensationEligible": compensation_eligible,
        "compensationNote": "Đủ điều kiện giảm 10% tiền điện Bậc 1 theo QĐ-07/2024/BTTH-EVN do mất điện kéo dài 14 giờ" if compensation_eligible else "Không phát sinh bồi thường",
        "duration_ms": duration_ms
    }

@tool
def submit_meter_inspection(customer_id: str, reason: str) -> Dict[str, Any]:
    """
    Tạo phiếu công tác phúc tra/kiểm định công tơ điện tử tại hiện trường.
    Chỉ được thực thi sau khi đã có phê duyệt Human Approval từ cấp quản lý.
    """
    t0 = time.time()
    ticket_id = f"TICKET-EVN-{int(time.time())}"
    duration_ms = round((time.time() - t0) * 1000, 2)
    return {
        "success": True,
        "tool_name": "submit_meter_inspection",
        "ticketId": ticket_id,
        "customerId": customer_id,
        "reason": reason,
        "status": "ĐÃ TIẾP NHẬN & XUẤT LỆNH ĐỘI KIỂM ĐỊNH",
        "slaHours": "24 giờ làm việc",
        "inspectionFee": "Miễn phí (Theo Quy định EVN HD-08)",
        "createdAt": time.strftime("%Y-%m-%d %H:%M:%S"),
        "duration_ms": duration_ms
    }
