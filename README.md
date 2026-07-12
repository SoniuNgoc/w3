# Ngọc Writing Review Lab — Gemini

Website riêng chứa 7 bộ đề Writing VSTEP mới tháng 7/2026.

## AI đang dùng

- Gemini API
- SDK: `@google/genai`
- Mô hình mặc định: `gemini-3.5-flash`
- Biến môi trường:
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL` — có thể bỏ qua để dùng mô hình mặc định

## Đưa lên GitHub

1. Tạo repository mới.
2. Giải nén ZIP.
3. Tải toàn bộ file và thư mục lên **thư mục gốc** của repository.
4. Trang gốc phải thấy:
   - `index.html`
   - `app.js`
   - `data.js`
   - `package.json`
   - `vercel.json`
   - thư mục `api`
   - thư mục `assets`
5. Commit changes.

## Đưa lên Vercel

1. Chọn **Add New → Project**.
2. Import repository.
3. Framework Preset: **Other**.
4. Root Directory: để mặc định.
5. Build Command: để trống.
6. Output Directory: để trống.
7. Bấm Deploy.

Web vẫn chấm offline dù chưa thêm khóa Gemini.

## Lấy Gemini API key

1. Mở Google AI Studio.
2. Vào phần API keys.
3. Chọn Create API key.
4. Sao chép khóa và chỉ lưu ở Vercel.

Không đưa khóa vào GitHub hoặc mã nguồn.

## Thêm khóa trên Vercel

Vào **Project → Settings → Environment Variables**, thêm:

```text
GEMINI_API_KEY = khóa Gemini của bạn
GEMINI_MODEL = gemini-3.5-flash
```

Áp dụng ít nhất cho Production. Có thể chọn thêm Preview và Development.

Sau khi lưu, cần Redeploy vì biến môi trường mới không áp dụng cho deployment cũ.

## Kiểm tra

1. Mở web.
2. Vào một bộ đề.
3. Viết ít nhất 20 từ.
4. Bấm **Nộp bài và xem sửa lỗi**.
5. Chấm offline hiện trước.
6. Khi Gemini hoạt động, kết quả được cập nhật bằng phần sửa AI.

## Khi gặp lỗi

- `Chưa có GEMINI_API_KEY`: chưa thêm biến hoặc chưa Redeploy.
- `model not found`: kiểm tra `GEMINI_MODEL`; khuyên dùng `gemini-3.5-flash`.
- `429` hoặc rate limit: chờ hạn mức được làm mới hoặc kiểm tra gói API.
- Web vẫn giữ kết quả offline khi Gemini lỗi.
