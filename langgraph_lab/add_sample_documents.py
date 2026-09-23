import os
import sys
import json
from pathlib import Path
from dotenv import load_dotenv

current_dir = Path(__file__).resolve().parent
env_path = current_dir / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

import psycopg2
from psycopg2.extras import execute_values
from app.semantic_cache import compute_text_embedding

NEW_DOCUMENTS = [
    {
        "id": "doc-09",
        "docCode": "QĐ-09/2026/ĐMT-EVN",
        "title": "Chính sách Khuyến khích & Hướng dẫn Lắp đặt Điện mặt trời Mái nhà Tự sản Tự tiêu 2026",
        "department": "Ban Năng lượng Tái tạo EVN",
        "effectiveDate": "01/03/2026",
        "docType": "Chính sách khuyến khích",
        "category": "Năng lượng tái tạo",
        "summary": "Quy định về đăng ký, lắp đặt hệ thống điện mặt trời mái nhà tự sản tự tiêu, thủ tục đấu nối công tơ 2 chiều miễn phí và miễn giấy phép cho hộ dưới 100kW.",
        "content": "Quyết định số 09/2026/QĐ-ĐMT ban hành ngày 01/03/2026 của Tập đoàn Điện lực Việt Nam về cơ chế khuyến khích phát triển điện mặt trời mái nhà tự sản, tự tiêu. Điều 1: Hộ gia đình lắp đặt công suất dưới 100kW được miễn trừ giấy phép hoạt động điện lực và thủ tục quy hoạch. Điều 2: Điện lực địa phương có trách nhiệm lắp đặt miễn phí công tơ đo đếm điện năng 2 chiều trong vòng 03 ngày làm việc sau khi nhận hồ sơ nghiệm thu.",
        "sections": [
            {
                "heading": "Điều 1: Điều kiện miễn trừ giấy phép và đăng ký lắp đặt điện mặt trời mái nhà",
                "text": "Hộ gia đình và cơ quan công sở lắp đặt hệ thống điện mặt trời mái nhà công suất dưới 100kW chỉ cần gửi thông báo đến Điện lực quận/huyện trực thuộc, được miễn toàn bộ thủ tục xin cấp giấy phép hoạt động điện lực và quy hoạch điện lực cấp tỉnh."
            },
            {
                "heading": "Điều 2: Lắp đặt công tơ đo đếm 2 chiều miễn phí trong 3 ngày",
                "text": "Trong thời hạn tối đa 03 ngày làm việc kể từ khi nghiệm thu kỹ thuật an toàn, Công ty Điện lực có trách nhiệm lắp đặt miễn phí công tơ 2 chiều để phục vụ đo đếm sản lượng tiêu thụ và phát ngược lên lưới."
            }
        ]
    },
    {
        "id": "doc-10",
        "docCode": "TT-10/2026/TT-BCT",
        "title": "Thông tư Quy định Tiêu chuẩn Trạm Sạc Xe điện & Biểu giá Điện Ưu đãi 2026",
        "department": "Bộ Công Thương & EVN",
        "effectiveDate": "01/05/2026",
        "docType": "Thông tư liên tịch",
        "category": "Trạm sạc xe điện",
        "summary": "Quy định đấu nối trạm sạc xe điện vào lưới điện hạ thế/trung thế, giá điện ưu đãi giờ thấp điểm 1.450 đ/kWh cho trạm sạc công cộng.",
        "content": "Thông tư số 10/2026/TT-BCT ngày 01/05/2026 của Bộ Công Thương quy định kỹ thuật và giá điện phục vụ hạ tầng trạm sạc xe điện tại Việt Nam. Điều 1: Trạm sạc nhanh DC công suất từ 60kW trở lên bắt buộc phải đấu nối vào lưới trung thế 22kV có trạm biến áp riêng biệt. Điều 2: Biểu giá điện trạm sạc công cộng áp dụng mức giá ưu đãi giờ thấp điểm là 1.450 đ/kWh từ 22h00 đến 04h00 sáng.",
        "sections": [
            {
                "heading": "Điều 1: Quy chuẩn đấu nối trạm sạc nhanh DC xe điện từ 60kW",
                "text": "Trạm sạc nhanh DC xe điện có công suất từ 60kW trở lên phải được cấp điện từ đường dây trung thế 22kV qua trạm biến áp chuyên dùng của chủ đầu tư, trang bị thiết bị chống sét lan truyền Type 1+2 và nút ngắt khẩn cấp Emergency Stop."
            },
            {
                "heading": "Điều 2: Biểu giá điện ưu đãi trạm sạc xe điện theo 3 khung giờ",
                "text": "Giá bán lẻ điện cho trạm sạc xe điện công cộng áp dụng 3 mức giá: Giờ thấp điểm (từ 22h00 đến 04h00) là 1.450 đ/kWh; giờ bình thường là 1.980 đ/kWh; giờ cao điểm (09h30 - 11h30 và 17h00 - 20h00) là 3.420 đ/kWh."
            },
            {
                "heading": "Điều 3: Thời gian giải quyết thỏa thuận đấu nối trạm sạc",
                "text": "Điện lực khu vực có trách nhiệm hoàn tất khảo sát và ký thỏa thuận đấu nối trạm sạc xe điện trong vòng tối đa 05 ngày làm việc đối với lưới hạ thế và 10 ngày làm việc đối với lưới trung thế."
            }
        ]
    },
    {
        "id": "doc-11",
        "docCode": "QĐ-11/2026/TBA-EVN",
        "title": "Quy chuẩn Kỹ thuật Đấu nối Trạm biến áp Chuyên dùng & Cấp điện Doanh nghiệp 2026",
        "department": "Ban Kỹ thuật Lưới điện EVN",
        "effectiveDate": "15/06/2026",
        "docType": "Quy chuẩn kỹ thuật",
        "category": "Cấp điện doanh nghiệp",
        "summary": "Quy định điều kiện đấu nối trạm biến áp phân phối từ 100kVA đến 2500kVA vào lưới điện trung thế 22kV, thời hạn nghiệm thu đóng điện trong vòng 05 ngày làm việc và yêu cầu hệ số công suất Cos phi >= 0.90.",
        "content": "Quyết định số 11/2026/QĐ-TBA ngày 15/06/2026 của Tập đoàn Điện lực Việt Nam quy định về thỏa thuận đấu nối và nghiệm thu đóng điện trạm biến áp chuyên dùng của khách hàng. Điều 1: Khách hàng sử dụng điện có công suất đăng ký từ 80kW trở lên hoặc tổng dung lượng máy biến áp từ 100kVA bắt buộc phải xây dựng trạm biến áp riêng biệt đấu nối vào lưới trung thế 22kV. Điều 2: Hệ số công suất (Cos phi) tại điểm đo đếm phải duy trì từ 0.90 trở lên. Trường hợp Cos phi < 0.90, khách hàng phải mua công suất phản kháng theo quy định. Điều 3: Thời gian kiểm tra nghiệm thu kỹ thuật an toàn và ký biên bản đóng điện trạm biến áp tối đa 05 ngày làm việc kể từ khi nhận đủ hồ sơ hoàn công.",
        "sections": [
            {
                "heading": "Điều 1: Tiêu chuẩn công suất và cấp điện áp đấu nối trạm biến áp chuyên dùng",
                "text": "Doanh nghiệp, cơ sở sản xuất có nhu cầu sử dụng công suất cực đại từ 80kW trở lên hoặc lắp máy biến áp từ 100kVA đến 2500kVA phải đấu nối vào lưới trung thế 22kV hoặc 35kV. Khách hàng chịu trách nhiệm đầu tư đường dây nhánh, máy biến áp và tủ phân phối hạ thế tổng."
            },
            {
                "heading": "Điều 2: Quy định về bù công suất phản kháng và hệ số Cos phi",
                "text": "Tất cả trạm biến áp chuyên dùng phải lắp đặt tủ tụ bù tự động đảm bảo hệ số công suất Cos φ đạt tối thiểu 0.90 trong mọi chu kỳ phụ tải. Nếu hệ số Cos φ trung bình tháng dưới 0.90, hệ thống tính tiền mua công suất phản kháng theo biểu giá hiện hành của EVN."
            },
            {
                "heading": "Điều 3: Thời hạn khảo sát và nghiệm thu đóng điện trạm biến áp",
                "text": "Thời hạn khảo sát phương án cấp điện trong vòng 03 ngày làm việc. Thời gian kiểm tra nghiệm thu hiện trường và hoàn tất thủ tục đóng điện vận hành không quá 05 ngày làm việc kể từ ngày tiếp nhận văn bản đề nghị đóng điện cùng biên bản thí nghiệm thiết bị đạt chuẩn."
            }
        ]
    },
    {
        "id": "doc-12",
        "docCode": "QĐ-12/2026/AMI-EVN",
        "title": "Quy định Lắp đặt Hệ thống Công tơ Thông minh AMI & Đo đếm Dữ liệu Từ xa 2026",
        "department": "Ban Viễn thông & CNTT EVN",
        "effectiveDate": "01/08/2026",
        "docType": "Quy định công nghệ",
        "category": "Đo đếm thông minh",
        "summary": "Quy định lộ trình thay thế 100% sang công tơ điện tử thông minh AMI có kết nối RF-Mesh/4G, tự động chốt chỉ số 30 phút/lần và cảnh báo mất điện tức thời qua Last Gasp.",
        "content": "Quyết định số 12/2026/QĐ-AMI ngày 01/08/2026 về hiện đại hóa hệ thống đo đếm điện năng tự động AMI (Advanced Metering Infrastructure). Điều 1: Toàn bộ công tơ bán lẻ điện sinh hoạt và sản xuất được thay thế miễn phí sang công tơ điện tử thông minh tích hợp công nghệ RF-Mesh và NB-IoT/4G. Điều 2: Tần suất thu thập dữ liệu chỉ số điện tự động truyền về trung tâm dữ liệu chu kỳ 30 phút/lần, cho phép khách hàng theo dõi biểu đồ sản lượng tiêu thụ theo thời gian thực trên App EVN CSKH. Điều 3: Tính năng cảnh báo sự cố Last Gasp tự động phát tín hiệu báo mất điện về hệ thống giám sát OMS trong vòng 05 giây ngay khi mất nguồn, giúp điện lực chủ động điều động xử lý mà khách hàng không cần gọi điện báo sự cố.",
        "sections": [
            {
                "heading": "Điều 1: Tiêu chuẩn công nghệ công tơ điện tử thông minh AMI",
                "text": "Công tơ thông minh thế hệ mới tích hợp chuẩn truyền thông không dây kép RF-Mesh tần số 433/470MHz và mô-đun 4G LTE/NB-IoT, cho phép tự động gửi dữ liệu chỉ số, điện áp, dòng điện, hệ số công suất và phát hiện hành vi gian lận tác động từ trường ngoại vi."
            },
            {
                "heading": "Điều 2: Thu thập chỉ số 30 phút/lần và giám sát tức thời trên App EVN",
                "text": "Hệ thống tự động chốt và đồng bộ sản lượng điện tiêu thụ 30 phút/lần về máy chủ EVN. Người dùng có thể theo dõi đồ thị phụ tải hàng giờ, thiết lập ngưỡng cảnh báo tiền điện vượt hạn mức (ví dụ: cảnh báo khi tiêu thụ vượt 30kWh/ngày) trực tiếp trên điện thoại."
            },
            {
                "heading": "Điều 3: Tự động cảnh báo mất điện Last Gasp không cần gọi tổng đài",
                "text": "Khi xảy ra mất điện, công tơ sử dụng năng lượng siêu tụ điện dự phòng (Supercapacitor) để gửi bản tin khẩn cấp 'Last Gasp' về trung tâm điều độ trong vòng 5 giây. Hệ thống OMS tự động khoanh vùng khu vực mất điện và cử kỹ thuật viên xử lý mà không phụ thuộc vào cuộc gọi phản ánh của khách hàng."
            }
        ]
    }
]

def add_documents_to_db():
    db_url = os.getenv("DATABASE_URL", "postgresql://postgres:123456@localhost:5432/evn_powerbot_db")
    print(f"[AddDocs] Connecting to PostgreSQL at: {db_url}")

    try:
        conn = psycopg2.connect(db_url)
        cursor = conn.cursor()
        print("[AddDocs] Connected successfully!")
    except Exception as e:
        print(f"[AddDocs] Error connecting to PostgreSQL: {e}")
        return

    doc_rows = []
    chunk_rows = []

    date_mapping = {
        "doc-09": "2026-03-01",
        "doc-10": "2026-05-01",
        "doc-11": "2026-06-15",
        "doc-12": "2026-08-01"
    }

    for doc in NEW_DOCUMENTS:
        doc_id = doc["id"]
        doc_code = doc["docCode"]
        title = doc["title"]
        category = doc["category"]
        effective_date = date_mapping.get(doc_id, "2026-01-01")
        summary = doc.get("summary", "")
        content = doc.get("content", "")

        doc_rows.append((
            doc_id, doc_code, title, category, effective_date, summary, content
        ))

        sections = doc.get("sections", [])
        for idx, sec in enumerate(sections):
            chunk_id = f"{doc_id}-sec-{idx+1}"
            heading = sec.get("heading", "")
            text = sec.get("text", "")
            combined_text = f"{title} - {heading}: {text}"
            embedding_vec = compute_text_embedding(combined_text)

            chunk_rows.append((
                chunk_id,
                doc_id,
                doc_code,
                title,
                category,
                effective_date,
                idx + 1,
                len(sections),
                heading,
                text,
                len(text.split()),
                embedding_vec,
                json.dumps({"section_index": idx + 1, "department": doc.get("department", "")})
            ))

    # 1. Insert into evn_documents
    doc_insert_sql = """
        INSERT INTO evn_documents (id, doc_code, title, category, effective_date, summary, content)
        VALUES %s
        ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            category = EXCLUDED.category,
            effective_date = EXCLUDED.effective_date,
            summary = EXCLUDED.summary,
            content = EXCLUDED.content;
    """
    execute_values(cursor, doc_insert_sql, doc_rows)

    # 2. Insert into evn_document_chunks
    chunk_insert_sql = """
        INSERT INTO evn_document_chunks (
            id, doc_id, doc_code, doc_title, category, effective_date,
            chunk_index, total_chunks, section_heading, content, token_count,
            embedding, metadata
        )
        VALUES %s
        ON CONFLICT (id) DO UPDATE SET
            section_heading = EXCLUDED.section_heading,
            content = EXCLUDED.content,
            token_count = EXCLUDED.token_count,
            embedding = EXCLUDED.embedding;
    """
    execute_values(cursor, chunk_insert_sql, chunk_rows)

    conn.commit()

    # Query count check
    cursor.execute("SELECT COUNT(*) FROM evn_documents;")
    total_docs = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM evn_document_chunks;")
    total_chunks = cursor.fetchone()[0]

    cursor.close()
    conn.close()

    print(f"[AddDocs] Done! Total documents: {total_docs}, Total chunks: {total_chunks}")

if __name__ == "__main__":
    add_documents_to_db()
