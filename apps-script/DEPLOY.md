# Triển khai Sổ Xe Tổ Chức với Google Sheets

Bản 2.1 dùng Google Sheets làm cơ sở dữ liệu và Google Apps Script làm backend/giao diện. Apps Script chạy bằng tài khoản của chủ dữ liệu; người sử dụng (NSD) chỉ đăng nhập bằng tài khoản nội bộ do Admin cấp, không cần tài khoản Google và không được chia sẻ Google Sheet.

## Kiến trúc

- Google Sheet riêng tư chứa các bảng `Cau_hinh`, `Nguoi_dung`, `Xe`, `Giao_dich`, `Phan_cong`, `Nhat_ky`.
- Tệp đính kèm nằm trong một thư mục Drive riêng tư do dịch vụ tự tạo; Sheet chỉ lưu metadata và ID tệp.
- Mật khẩu được băm PBKDF2-SHA256 với salt riêng và 600.000 vòng. Phiên đăng nhập được ký, hết hạn sau 8 giờ và bị thu hồi khi đổi hoặc đặt lại mật khẩu.
- NSD không thấy link Google Sheet, không nhận quyền Drive và không thực hiện Google OAuth.

## 1. Chuẩn bị Google Sheet

1. Dùng tài khoản Google sẽ sở hữu dữ liệu để tạo một Google Sheet trống, dành riêng cho ứng dụng.
2. Không chia sẻ Sheet cho NSD. Chỉ tài khoản triển khai Apps Script cần quyền chỉnh sửa.
3. Sao chép URL dạng `https://docs.google.com/spreadsheets/d/.../edit`.

## 2. Tạo dự án Apps Script

1. Mở https://script.google.com bằng tài khoản chủ Sheet và tạo dự án **So Xe To Chuc**.
2. Dán lần lượt các file `Code.gs`, `Crypto.gs`, `Index.html` từ thư mục này.
3. Bật manifest trong **Project Settings**, rồi thay nội dung bằng `appsscript.json`.
4. Lưu dự án. Không đưa URL Sheet, mật khẩu hay khóa bí mật vào GitHub.

## 3. Khởi tạo một lần

1. Thêm tạm vào cuối `Code.gs`: `function khoiTaoLanDau() { initializeDeployment_(); }`.
2. Chạy `khoiTaoLanDau`, cấp quyền Google Sheets và Drive cho chính dự án của bạn.
3. Sao chép **Mã thiết lập một lần** trong Execution log và giữ riêng cho Admin.
4. Xóa hàm tạm rồi lưu. Không chạy lại và không xóa Script Properties.

## 4. Phát hành Web App không yêu cầu Google

1. Chọn **Deploy → New deployment → Web app**.
2. **Execute as:** Me (tài khoản chủ Sheet).
3. **Who has access:** Anyone. Không chọn “Anyone with Google account”.
4. Triển khai và sao chép URL kết thúc bằng `/exec`.
5. Mở URL bằng cửa sổ ẩn danh. Màn hình phải vào thẳng ứng dụng, không hiện đăng nhập Google.

Nếu Google Workspace không cho chọn **Anyone**, quản trị viên Workspace phải cho phép triển khai ẩn danh. Không yêu cầu NSD vượt cảnh báo quyền hoặc đăng nhập Google.

## 5. Tạo tổ chức và tài khoản

1. Mở Web App, nhập tài khoản Admin khởi tạo và mã thiết lập một lần theo màn hình.
2. Dán link Google Sheet trống, tạo mật khẩu Admin mới, nhập tên tổ chức và tên Admin.
3. Dịch vụ tạo các bảng trong Sheet và thư mục Drive riêng cho tệp đính kèm.
4. Admin tạo tài khoản NSD. Ứng dụng cấp mật khẩu lần đầu theo quy trình nội bộ; NSD bắt buộc đổi ngay.
5. Gửi URL ứng dụng, tên đăng nhập và mật khẩu lần đầu cho đúng người nhận qua kênh riêng.

Mỗi NSD chỉ nhập tên đăng nhập và mật khẩu ứng dụng. Backend tự tra tài khoản trong bảng `Nguoi_dung`. NSD không cần tài khoản Google, không cần file đăng nhập, không được biết link Sheet và không có quyền truy cập trực tiếp Sheet/Drive.

## 6. Phân quyền

- **Admin:** quản lý toàn bộ tổ chức, xe, tài khoản, phân công và giao dịch.
- **Admin chỉ xem:** xem toàn bộ dữ liệu, không sửa/xóa và không xem link Sheet.
- **Người quản lý/lái xe:** xem xe được phân công và dữ liệu được phép; chỉ sửa/xóa giao dịch do mình nhập.

Mọi thao tác ghi được khóa bằng `LockService`; trường `version` chặn ghi đè bản ghi đã bị người khác sửa.

## 7. Sao lưu và bảo quản

- Admin có thể tải bản sao mã hóa chứa dữ liệu và nội dung tệp đính kèm.
- Thiết lập trigger hằng ngày/tuần để sao chép Google Sheet sang thư mục backup riêng nếu cần.
- Giữ kín `SX_KEY` trong Script Properties. Không gửi khóa qua hội thoại và không lưu vào GitHub.
- Giữ Sheet và thư mục tệp đính kèm ở chế độ riêng tư. Quyền “Anyone” chỉ áp dụng cho URL Web App; backend vẫn kiểm tra tài khoản nội bộ, mật khẩu và vai trò.
- Google Apps Script/Sheets có hạn mức. Bản này phù hợp tổ chức nhỏ và vừa; tệp tối đa 2 MB, tối đa 5 tệp cho mỗi xe hoặc giao dịch.

## 8. Cập nhật phiên bản

Thay `Code.gs` và `Index.html`, sau đó **Deploy → Manage deployments → Edit → New version → Deploy**. Không chạy lại hàm khởi tạo, không xóa Script Properties và không tạo lại Sheet. NSD tiếp tục dùng URL và tài khoản cũ.

Trước khi dùng dữ liệu thật, hãy kiểm tra bằng cửa sổ ẩn danh: tạo hai NSD, phân công xe, nhập/sửa/xóa giao dịch, tải tệp và xác nhận NSD không gặp màn hình Google.
