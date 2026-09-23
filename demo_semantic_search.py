import chromadb
from sentence_transformers import SentenceTransformer

# 1. Tải mô hình Embedding để chuyển chữ thành Vector
model = SentenceTransformer("all-MiniLM-L6-v2")

# 2. Khởi tạo ChromaDB Client (chạy in-memory trong RAM)
client = chromadb.Client()

# 3. Tạo một Collection (tương tự như một Table trong Database truyền thống)
col = client.create_collection("demo")

# 4. Chuẩn bị tập dữ liệu mẫu (Knowledge Base / Documents)
docs = [
    "Khi mất điện, gọi tổng đài 19001909 để báo sự cố.",
    "Không tự ý sửa đường dây điện bị đứt, giữ khoảng cách an toàn.",
    "Giá điện sinh hoạt tính theo bậc thang lũy tiến."
]

# 5. Lưu tài liệu vào ChromaDB (ChromaDB sẽ tự động gọi embedding ngầm định để vector hoá tài liệu)
col.add(
    documents=docs, 
    ids=["1", "2", "3"]
)

# 6. Thực hiện truy vấn ngữ nghĩa
query = "Trụ điện bị cháy nổ tại đường Hoàng Diệu, tôi nên làm gì ngay bây giờ?"
results = col.query(
    query_texts=[query], 
    n_results=2
)

# 7. In kết quả tìm kiếm
print("\n--- KẾT QUẢ TÌM KIẾM ---")
print("Câu hỏi:", query)
print("Các đoạn văn bản phù hợp nhất:")
for i, doc in enumerate(results["documents"][0], 1):
    print(f"Top {i}: {doc}")
