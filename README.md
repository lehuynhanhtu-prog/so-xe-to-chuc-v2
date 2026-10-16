# Sổ Xe Tổ Chức v2

Ứng dụng V2 được phát triển độc lập từ mã nguồn Sổ Xe Tổ Chức hiện tại và sử dụng vùng dữ liệu mới, không tự đọc hoặc chuyển dữ liệu của ứng dụng cũ.

- Web V2: https://lehuynhanhtu-prog.github.io/so-xe-to-chuc-v2/
- Hướng dẫn Web V2: https://lehuynhanhtu-prog.github.io/so-xe-to-chuc-v2/setup.html
- Kho mã: https://github.com/lehuynhanhtu-prog/so-xe-to-chuc-v2

## Trạng thái triển khai

Bản Web 2.1 dùng Google Sheets làm cơ sở dữ liệu và Google Apps Script làm backend. Apps Script chạy dưới quyền tài khoản chủ Sheet; NSD chỉ đăng nhập bằng tài khoản nội bộ do Admin cấp, không thực hiện Google OAuth và không cần được chia sẻ Sheet/Drive.

- Các bảng dữ liệu: `Cau_hinh`, `Nguoi_dung`, `Xe`, `Giao_dich`, `Phan_cong`, `Nhat_ky`.
- Tệp đính kèm nằm trong thư mục Drive riêng tư do backend tạo; Sheet chỉ lưu metadata.
- NSD chỉ nhập tên tài khoản và mật khẩu; backend tự đọc bảng `Nguoi_dung`. Không chia sẻ link Sheet, không cần file đăng nhập và không cần đăng nhập Google.
- GitHub Pages là địa chỉ truy cập ổn định và mở Web App Apps Script đã cấu hình.
- Hướng dẫn triển khai backend: [`apps-script/DEPLOY.md`](apps-script/DEPLOY.md).

## Nền mã kế thừa 4.8.3

Mô hình hai Google: tài khoản thứ nhất lưu dữ liệu Admin; tài khoản TK Google lưu dữ liệu NSD lưu tài khoản, nhật ký và bản dữ liệu được xem của NSD. Hồ sơ tài khoản/mật khẩu được mã hóa cơ bản; dữ liệu nghiệp vụ lưu JSON trực tiếp để ưu tiên tốc độ. Admin tạo NSD bằng tên định danh và mật khẩu ban đầu, không cần email hoặc lời mời. NSD kết nối Google TK Google lưu dữ liệu NSD, nhập tên định danh và bắt buộc đổi mật khẩu lần đầu.

- Admin tự đồng bộ TK Google lưu dữ liệu NSD khi đăng nhập và mỗi 15 giây khi app đang mở.
- Root JSON của Admin chứa xe, NSD, phân công, giao dịch, khóa và mã file NSD.
- Tổng quan/Chi phí/Báo cáo dùng cùng danh sách chi tiết; có ODO, thông tin theo loại, người nhập và nhập hộ. Báo cáo có bộ lọc và xuất Excel.
- Admin bổ sung cần kết nối cả hai Google; vai trò chỉ xem không ghi dữ liệu.
- Không dùng Gmail/Picker trong mô hình mới, không lưu mật khẩu Google. Kết nối Google được giữ tạm trong tab đến khi token hết hạn; không lưu token trong localStorage. Mật khẩu app ít nhất 6 ký tự.
- Tất cả người đăng nhập Google TK Google lưu dữ liệu NSD đều sở hữu dữ liệu Drive TK Google lưu dữ liệu NSD: phân quyền trong app không chặn đọc/xóa file trực tiếp trên Drive. Dữ liệu nghiệp vụ không mã hóa; chỉ hồ sơ đăng nhập được bảo vệ bằng mật khẩu. Cần kiểm soát quyền Google và sao lưu thường xuyên.

Web cũ: https://lehuynhanhtu-prog.github.io/so-xe-to-chuc/
Hướng dẫn bản cũ: https://lehuynhanhtu-prog.github.io/so-xe-to-chuc/setup.html

Có chức năng chuyển tổ chức từ mô hình mỗi NSD dùng Google riêng sang TK Google lưu dữ liệu NSD, giữ file cũ. Bản cũ nằm ở `web/legacy-drive-v3.html` và `docs/legacy-drive-v3.html`. Không nhập tiếp ở bản cũ sau khi chuyển.

## Phát triển

`npm ci`, `npm test`, `npm run check`, `npm run test:ui`.
Backend và giao diện nghiệp vụ nằm trong `apps-script/`. Trang vào ứng dụng nằm ở `web/sheets-launcher.html`; `npm run build` tạo bản GitHub Pages trong `docs/`. Có thể đặt secret GitHub `APPS_SCRIPT_WEB_APP_URL` để workflow tự cấu hình URL backend khi triển khai.

## Lịch sử bản 3.1 và Apps Script

# Sổ Xe Tổ Chức — Web 3.0

Bản web dùng Google Drive API trực tiếp, lời mời mã hóa và chia sẻ từng file cho tài khoản Google của mỗi người.

- [Mở ứng dụng](https://lehuynhanhtu-prog.github.io/so-xe-to-chuc/)
- [Thiết lập Google Cloud dùng chung với Sổ Xe cá nhân](https://lehuynhanhtu-prog.github.io/so-xe-to-chuc/setup.html)

OAuth Client ID và project number dùng chung đã điền trong `web/google-config.js`. Picker API key cần được thêm trong giao diện cấu hình từ cùng dự án. Không đưa Client Secret vào bản web.

## Hoạt động

Admin tạo tổ chức, tài khoản và lời mời bằng đúng email Google. Admin cấp quyền Gmail để tự gửi lời mời JSON mã hóa. NSD dùng nút nhận lời mời qua email, cấp quyền Gmail readonly, nhập mật khẩu Admin gửi qua kênh riêng, chọn file được chia sẻ qua Picker, đặt mật khẩu mã hóa riêng. Cấu hình Google công khai được kèm trong lời mời.

Tổ chức và các bản dữ liệu được xem thuộc Drive Admin tạo chúng. Nhật ký và file tài khoản của NSD thuộc Drive NSD. Admin chọn nhật ký NSD qua Picker một lần. Các thay đổi NSD nằm trong nhật ký đến khi Admin mở app và đồng bộ để phát bản dữ liệu mới; app không có máy chủ chạy nền. Admin bổ sung cần chọn các nhật ký và file được xem qua Picker.

Hồ sơ tài khoản dùng AES-256-GCM với PBKDF2-SHA256 10.000 vòng để ưu tiên tốc độ đăng nhập. Dữ liệu tổ chức, nhật ký và bản xem NSD là JSON không mã hóa; app vẫn đọc dữ liệu AES cũ và chuyển sang JSON sau lần đăng nhập thành công. ETag/If-Match ngăn ghi đè đồng thời; operation ID ngăn lặp giao dịch. Driver nhận bản dữ liệu đã lọc và chỉ sửa giao dịch mình nhập. Viewer chỉ xem.

## Build và kiểm tra

```sh
npm ci
npm test
npm run check
npx playwright install --with-deps chromium --only-shell
npm run test:ui
```

`web/` là mã nguồn hiện tại; `npm run build` tạo bản tĩnh trong `docs/`. GitHub Pages phát hành `docs/`. Kiểm tra tích hợp mô phỏng quyền Drive, chia sẻ, ETag và dữ liệu mã hóa; kiểm tra Chromium chạy luồng Admin/NSD thực với transport Google mô phỏng. Chưa có kiểm tra end-to-end bằng tài khoản Google thực trong môi trường build này.

## Chuyển từ bản cũ

Bản Apps Script được giữ để tham khảo và duy trì dữ liệu cũ. Không tự động chuyển file hoặc mật khẩu sang mô hình v3. Sao lưu trước khi chuyển. Bản mới có xuất sao lưu mã hóa; chưa có giao diện phục hồi hoặc đặt lại mật khẩu bị quên.

<details><summary>Tài liệu phiên bản Apps Script cũ</summary>

# Sổ Xe Tổ Chức — Web dùng Google Drive

Bản web mới nằm trong `apps-script/`: giao diện và dịch vụ Google Apps Script chạy dưới tài khoản chủ thư mục, mọi dữ liệu nghiệp vụ và tệp đính kèm nằm trong một file mã hóa AES-256-GCM tại folder Drive do Admin chọn. Người quản lý/lái xe không cần tài khoản Google. Không dùng Supabase.

**Cần triển khai Apps Script một lần trước khi có URL web hoạt động.** Mã nguồn hoặc trang GitHub Pages tự nó không cấp quyền ghi Drive.

## Thiết lập

Đọc [hướng dẫn triển khai đầy đủ](apps-script/DEPLOY.md), hoặc tải [gói web Drive](docs/downloads/so-xe-drive-web.zip).

Luồng Admin: mã thiết lập chủ dịch vụ → lưu link Drive → tạo mật khẩu Admin → nhập tên tổ chức → thêm người dùng với mật khẩu ban đầu do Admin chọn → gửi URL web app và file thông tin đăng nhập mã hóa → nhập xe → phân công xe.

Mã thiết lập một lần giúp ngăn chiếm Admin bằng mật khẩu công khai. Mọi tài khoản được cấp phải đổi mật khẩu mặc định trước khi dùng. File đăng nhập được mã hóa bằng khóa chỉ dịch vụ giữ, không chứa khóa dữ liệu; Admin gửi file riêng cho người nhận.

## Phân quyền phía dịch vụ

- Admin: mọi dữ liệu, quản lý xe/tài khoản/phân công/cấu hình Drive.
- Admin chỉ xem: xem toàn bộ dữ liệu, không sửa/xóa, không xem link Drive.
- Người quản lý/lái xe: xem giao dịch mình nhập và mọi giao dịch của xe hiện được phân công; chỉ sửa/xóa giao dịch mình nhập. Có thể nhập hộ xe khác.
- Không xóa tài khoản đang đăng nhập, đã được phân công xe hoặc có giao dịch/hoạt động liên quan.
- Sửa/xóa tổ chức chỉ dành cho Admin. Xóa yêu cầu tên tổ chức và mật khẩu; chỉ đưa file app vào Trash, không đụng các file khác trong folder.

## Lưu trữ và giới hạn

Tài khoản, phân công, giao dịch và tệp nằm trong `so-xe-to-chuc-v2.enc.json`. Không lưu dữ liệu hay tên đăng nhập trong trình duyệt. Script Properties giữ khóa mã hóa và các ID cấu hình, không chứa dữ liệu nghiệp vụ. Mật khẩu được băm PBKDF2-SHA256 với salt riêng, 600.000 vòng. Phiên có chữ ký, hết hạn sau 8 giờ và bị thu hồi khi đổi mật khẩu/cấp lại file. Khóa tách theo mục đích mã hóa file đăng nhập và ký phiên.

Dịch vụ khóa thao tác đọc/sửa/ghi, kiểm tra phiên bản từng bản ghi và chặn ghi đè từ bản cũ. Giới hạn bản đầu: 2 MB/tệp, 5 tệp/bản ghi và tổng file mã hóa 15 MB; yêu cầu Internet, không có hàng đợi ngoại tuyến. Google Apps Script có hạn mức của Google.

Bản web mới chưa có đầy đủ nhắc hạn/bàn giao của bản cũ. File dữ liệu v1 không tương thích, không tự di trú. Bản v1 trong lịch sử git dùng Google OAuth trên trình duyệt; không dùng nó cho yêu cầu lái xe không có Google. Trang `docs/index.html` của bản mới chỉ mở URL dịch vụ đã triển khai.

## Phát triển và kiểm thử

```sh
npm ci
npm test
npm run check
npx playwright install chromium --only-shell
npm run test:ui
python tools/package.py
```

`npm run build` đóng gói thư viện mã hóa MIT từ @noble/ciphers và @noble/hashes vào `Crypto.gs`. Test dùng dịch vụ Drive/Apps Script mô phỏng, kiểm tra mật khẩu, file đăng nhập, vai trò, tệp, xung đột và xóa. Cần kiểm tra riêng quyền Google, triển khai ẩn danh và hoạt động trên Drive thật theo hướng dẫn.

Dự án Sổ Xe cá nhân ở `so-xe-android` không thay đổi.

</details>

### Bản 3.1 — lời mời Gmail và thư mục Drive
Bật thêm Gmail API; cấu hình gmail.send và gmail.readonly trong Google Auth Platform → Data Access. Quyền gửi là nhạy cảm, quyền đọc là hạn chế và có thể yêu cầu xác minh Google khi phát hành rộng rãi. Admin lưu file JSON mã hóa tại “Sổ xe tổ chức”; NSD tại “NSD-Sổ xe tổ chức”. App chỉ chia sẻ từng file. Xem hướng dẫn đầy đủ tại docs/setup.html.

## Bản 4.1
Chọn ADMIN/NSD trước Google; NSD gõ tên đăng nhập. Đăng xuất app giữ phiên Google trong bộ nhớ. Admin sửa họ tên/tên đăng nhập NSD mà không đổi mật khẩu hoặc lịch sử. Giao dịch theo hàng ngang. Không tạo lời mời ở TK Google lưu dữ liệu NSD; hồ sơ đăng nhập dùng dẫn xuất khóa nhẹ, dữ liệu JSON không mã hóa, cache theo từng thao tác và ETag chống ghi đè; phát bản dữ liệu song song theo nhóm bốn file.

## Bản 4.2

Màn hình NSD sau kết nối TK Google lưu dữ liệu NSD chỉ còn biểu mẫu đăng nhập; Admin bổ sung vào từ màn hình ADMIN sau kết nối cả hai Google. Tổng quan và Xe hiển thị bảo hiểm TNDS, đăng kiểm, phí đường bộ (cảnh báo trước 45 ngày), bảo dưỡng/phụ tùng theo chu kỳ km hoặc tháng. Hạn trong 5 ngày và ODO đã đến/vượt được nhấn mạnh. Bấm cảnh báo để xem giao dịch. Tính toán chỉ dùng dữ liệu được phép xem, không phát sinh thêm yêu cầu Drive.

Tổng quan kế thừa Sổ xe cá nhân: chi tháng này, năng lượng/bảo dưỡng, bảng tổng hợp xe, biểu đồ sáu tháng, nhóm nhắc bảo dưỡng/bảo hiểm/đăng kiểm-phí đường bộ và giao dịch gần đây. Xe của tôi có động cơ, năm, ODO, người quản lý, thời hạn và giấy xe. Tiền xăng giữ tổng tiền, tính số lít từ đơn giá hoặc tính đơn giá từ số lít. Admin tự nhập mật khẩu khởi tạo NSD; không điền sẵn mật khẩu công khai, tài khoản cũ giữ nguyên.

## Bản 4.3

Ẩn cấu hình Google ở màn hình đăng nhập. Admin đã có tổ chức chỉ thấy nút Đăng nhập; chưa có tổ chức đi thẳng sang khởi tạo. Kho `two-google-v2` bắt đầu dữ liệu mới, không tự đọc kho 4.2. File JSON dùng AES native với khóa phiên tái sử dụng; file tài khoản mới dẫn xuất khóa 100.000 vòng, không dẫn xuất mật khẩu mỗi lần lưu giao dịch. Ngày nhập/hiển thị theo dd/mm/yyyy, dữ liệu nội bộ vẫn dùng ISO để lọc/sắp xếp đúng. Admin có thể đặt lại mật khẩu NSD trong Sửa; phiên cũ bị thu hồi và NSD phải đổi mật khẩu lần tiếp theo. Mật khẩu khởi tạo công khai theo yêu cầu là `000000`, bắt buộc đổi trước khi dùng.

## Bản 4.4

NSD chỉ sửa giao dịch do chính mình nhập (kể cả nhập hộ); Admin sửa tất cả, Admin chỉ xem không sửa. Nhập chi phí mặc định chọn xe đang quản lý đầu tiên; bật Nhập hộ để chọn xe khác. Cảnh báo Tổng quan/Xe kèm người quản lý/lái xe hiện tại; NSD nhận đầy đủ cảnh báo của xe đang quản lý giống Admin nhưng không được xem/sửa/xóa giao dịch của người khác. Mọi ô ngày có lịch chọn ngày, tháng, năm và vẫn hiển thị dd/mm/yyyy. Lưu tiếp tục dùng AES native với khóa phiên, không dẫn xuất mật khẩu khi lưu; không ghi lại bản dữ liệu NSD có nội dung không thay đổi, kể cả sau lần đăng nhập Admin mới. Giữ nguyên kho dữ liệu 4.3.

## Bản 4.4.1

Tải lại cùng tab giữ kết nối Google còn hiệu lực, mở thẳng form đăng nhập ADMIN/NSD đã chọn. Không giữ mật khẩu app, tên đăng nhập NSD hay khóa giải mã. Google Admin và Google dữ liệu NSD được lưu tách biệt trong sessionStorage theo app/client/loại tài khoản; token hết hạn được bỏ, chỉ giữ email gợi ý để xin lại quyền trên đúng tài khoản. Đăng xuất app giữ kết nối Google; ngắt kết nối Google xóa phiên của cả hai tài khoản.

## Bản 4.5

- Bàn giao xe giữa hai người quản lý/lái xe: người giao/nhận có thể nhập bàn giao mình tham gia, Admin nhập mọi bàn giao. Lưu ngày giờ, ODO, ghi chú và người nhập; chỉ người nhập hoặc Admin sửa/xóa. Bàn giao chuyển người quản lý; nhật ký NSD được Admin đồng bộ như chi phí.
- Lịch sử phân công cũ được giữ lại và dùng tính thời gian. Sửa/xóa bàn giao tính lại các giai đoạn; nếu làm sai chuỗi bàn giao sau đó, thao tác bị từ chối, giữ dữ liệu cũ.
- Báo cáo có thời gian quản lý từng/tất cả NSD, lọc xe và ngày, giai đoạn đang quản lý, tổng thời gian theo từng xe, xuất Excel. Metadata phân công được cung cấp cho báo cáo; giao dịch chi phí vẫn lọc theo quyền cũ.
- Khi đã kết nối Google trước đó, chỉ nhập tên user và mật khẩu; phiên Google hết hạn được xin lại trên tài khoản đã kết nối khi bấm Đăng nhập; không chọn tài khoản app trong danh sách. Tên đăng nhập xác định vai trò. Nhiều tổ chức cùng tên user được phân biệt bằng mật khẩu; nếu trùng cả hai, cần dùng mật khẩu riêng cho từng tổ chức.
- Tổng quan có danh sách giao dịch gọn; nhấp để xem chi tiết, sửa/xóa theo quyền. Bàn giao cũng xuất hiện trong giao dịch gần đây.
- Tạo/sửa/đăng nhập dùng chung cách chuẩn hóa tên: chữ có dấu được chấp nhận, khoảng trắng thành gạch dưới, bỏ ký tự vô hình khi sao chép. Form tạo hiển thị tên sẽ lưu; Admin bổ sung dùng cùng quy tắc NSD. Mật khẩu NSD mới vẫn 000000 và bắt buộc đổi lần đầu.

Giữ nguyên kho dữ liệu 4.3/4.4; không cần khởi tạo lại.

Gợi ý email Google và loại đăng nhập được giữ trên thiết bị để mở lại app chỉ thấy form user/mật khẩu. Token chỉ ở phiên tab, không lưu lâu dài; mật khẩu app, tên user NSD và khóa giải mã không lưu theo thiết bị. Ngắt kết nối Google xóa cả gợi ý và token. Google có thể yêu cầu xác nhận quyền khi Đăng nhập xin lại token đã hết hạn.

## Bản đa nền tảng 4.6.0

[Tải ứng dụng](https://lehuynhanhtu-prog.github.io/so-xe-to-chuc/downloads.html).

- Android: APK `vn.soxe.organization`, Android 7+, mở toàn bộ bản Web trong trình duyệt hệ thống giống APK 4.7. Google OAuth chạy trực tiếp trong phiên Web, không cần OAuth Android riêng.
- Windows Portable: EXE/BAT mở cùng Web HTTPS; không chạy máy chủ localhost, không yêu cầu thêm origin localhost.
- iOS: hồ sơ Web Clip hoặc Safari → Thêm vào Màn hình chính, tương tự Sổ Xe cá nhân. Không phải IPA native.
- Web: bản trực tuyến và gói ZIP cho tự host. Cần HTTPS và cấu hình OAuth origin nếu đổi nơi host.

Tất cả dùng cùng dữ liệu Drive và chức năng 4.5. Cần mạng để đăng nhập và đồng bộ. Gợi ý Google lưu theo trình duyệt; không lưu tên đăng nhập/mật khẩu app. Bản Web mới tự áp dụng khi mở ứng dụng.

Build Android unsigned: Gradle 8.9, JDK 17, SDK 35, `cd android && gradle :app:assembleRelease :app:lintRelease`. APK phát hành được ký riêng ngoài repo; không đưa khóa riêng vào git. Giữ khóa ký để cập nhật cài đè; không thay bằng debug key. CI cung cấp APK unsigned và apksigner.jar để ký. Workflow Windows xuất ZIP, iOS, Web và APK đã ký nếu có vào release `platform-v4.6.0`.

Gói Web: `npm run package:web`. Kiểm tra: `npm test`, `npm run check`, `npm run test:ui`.

Ký APK tải từ artifact Android với khóa riêng đã sao lưu:

```sh
python3 tools/sign-android.py --apk app-release-unsigned.apk --apksigner-jar apksigner.jar --keystore /private/so-xe-to-chuc-release.jks --password-file /private/password.txt --output docs/downloads/So-Xe-To-Chuc-Android-4.8.3.apk
```

Không đặt khóa hoặc mật khẩu trong repo. Bản 4.8.3 phải dùng đúng khóa đã ký APK 4.7 (SHA-1 chứng thư `23:5B:9D:D6:4A:92:6C:F7:FC:F7:8F:79:1D:33:C7:38:E9:F7:CC:E7`). Trước khi phát hành, kiểm tra package/version bằng aapt và chữ ký bằng apksigner. APK đã ký được workflow Windows đính kèm vào release chung.

Đăng nhập Admin trên máy đã nhớ Google của NSD: nhập `admin` hoặc tên Admin bổ sung. Khi chưa có gợi ý Google Admin trên thiết bị, ứng dụng chuyển sang kết nối Google Admin, rồi xác nhận Google lưu dữ liệu NSD (hoặc chọn Google khác). Sau đó nhập lại tên và mật khẩu app; mật khẩu không được giữ qua bước kết nối. Những lần sau chỉ hiện form tên đăng nhập/mật khẩu.

Đăng nhập Admin bổ sung / Admin chỉ xem: ứng dụng xác định vai trò từ file tài khoản đã giải mã bằng mật khẩu, không dựa vào trường vai trò phụ của file Drive. Admin bổ sung kết nối đúng Google Admin của tổ chức và Google lưu dữ liệu NSD; khi Google Admin đang nhớ thuộc tổ chức khác, bước kết nối yêu cầu chọn đúng tài khoản. Admin chỉ xem đăng nhập bằng Google lưu dữ liệu NSD, độc lập với kết nối Google Admin đang nhớ, và giữ quyền chỉ xem.

Bản sửa đăng nhập trên máy NSD: đăng xuất mở ngay form đăng nhập, không chờ truy vấn Drive. Phản hồi lấy danh sách tài khoản cũ không được thay thế màn hình kết nối mới; khi chuyển sang Admin, phiên app cũ và vòng đồng bộ được đóng. Số tiền nhập hiển thị dấu phân cách hàng nghìn (1.234.567 đồng), đơn giá xăng hỗ trợ phần thập phân theo định dạng Việt Nam; dữ liệu lưu vẫn là số.

Khi phiên Google Admin hết hạn, màn hình kết nối được giữ lại để cấp lại quyền bằng nút kết nối. Thư viện Google được chuẩn bị trước khi bật nút, giúp thao tác mở cửa sổ Google diễn ra từ lần bấm của người dùng. Google đã nhớ vẫn được dùng làm gợi ý kết nối.

## Sao lưu, phục hồi và tệp đính kèm

Admin mở **Tổ chức → Sao lưu & Phục hồi** để tải ZIP đầy đủ có mật khẩu bảo vệ. Gói chứa dữ liệu xe, NSD, phân công, bàn giao, giao dịch, tài khoản và cả giấy chủ quyền/tệp đính kèm.

Chọn ZIP (hoặc JSON mã hóa cũ), nhập mật khẩu bản sao, kiểm tra số xe/giao dịch/tệp rồi xác nhận bằng tên tổ chức và mật khẩu Admin hiện tại. Phục hồi vào đúng tổ chức và hai Google đã đăng ký. ZIP đầy đủ đưa tài khoản/mật khẩu về thời điểm sao lưu; JSON cũ giữ thông tin đăng nhập hiện tại. File tài khoản và nhật ký cần còn trên Drive hoặc trong thùng rác. Tệp đính kèm được tải lại từ bản sao kể cả khi file gốc đã xóa vĩnh viễn.

Tệp mới lưu riêng trong **NSD-Sổ xe tổ chức**, JSON giữ thông tin tham chiếu. Có nút **Xem**, **Tải** và **Xóa** khi sửa bản ghi. Khi lưu việc bỏ tệp, xóa giao dịch hoặc xóa xe, app chuyển các tệp liên quan vào thùng rác Drive. Bản ghi cũ có tệp nằm trong JSON vẫn đọc và sao lưu được. Quyền sửa/xóa giữ nguyên: Admin hoặc người nhập giao dịch.

Tên tệp đính kèm tự động theo `_Biển số_Loại_YYYYMMDD.ext`, ví dụ `_51A-12345_Đổ xăng_20261007.jpg`. Tên trùng thêm `_2`, `_3` trước phần mở rộng. Giấy chủ quyền dùng loại `Giấy chủ quyền` và ngày tải tệp; ngày này giữ nguyên khi sửa thông tin xe. Tên trên Drive, trong dữ liệu, khi tải xuống và khi phục hồi được đồng bộ.

### Sửa đăng nhập và giảm lượt đọc Drive

Admin chỉ nhập tên và mật khẩu một lần. Nếu cần cấp lại quyền Google hoặc kết nối Google Admin trên máy NSD, app tiếp tục lần đăng nhập đang dở sau khi kết nối, bỏ bảng tài khoản NSD khi kết nối đó còn hiệu lực. Thông tin đăng nhập đang dở chỉ giữ trong bộ nhớ và xóa khi hủy/đăng xuất; không ghi mật khẩu vào bộ nhớ trình duyệt.

NSD mở ngay form đăng nhập khi đã có gợi ý Google, chỉ liệt kê file tài khoản thay vì toàn bộ file giao dịch/đính kèm. File tài khoản được đọc và giải mã một lần; kiểm tra lại ETag trước khi dùng kết quả. Dữ liệu được xem và nhật ký đọc song song; bỏ lượt đọc nhật ký và ghi danh sách chia sẻ dư thừa trong mô hình hai Google. Kiểm tra thu hồi, vai trò mã hóa và lần đặt lại mật khẩu vẫn được giữ.

### Quyền giao dịch và báo cáo

Admin chính và Admin bổ sung có toàn quyền quản lý dữ liệu; xóa tổ chức phải xác nhận tên và mật khẩu của Admin đang đăng nhập. Admin chỉ xem xem được toàn bộ dữ liệu/báo cáo và xuất báo cáo, không thêm/sửa/xóa dữ liệu hoặc phục hồi.

NSD thấy giao dịch do mình nhập (kể cả nhập hộ xe khác) và giao dịch của xe đang quản lý. Chỉ sửa/xóa giao dịch do mình nhập; giao dịch người khác nhập hộ xe mình chỉ xem. Báo cáo chi phí và Excel dùng cùng phạm vi này. Báo cáo thời gian quản lý và Excel chỉ có giai đoạn quản lý của chính NSD, kể cả các giai đoạn đã kết thúc; không có lựa chọn tất cả NSD. API trả về NSD chỉ chứa các giai đoạn của mình; lịch phân công đầy đủ được xử lý nội bộ để kiểm tra bàn giao.

### 4.8.0 — Android native và đăng nhập sinh trắc học

Điện thoại dùng thanh điều hướng dưới, menu Cài đặt, form nhập gọn và danh sách chi phí dạng thẻ. Tổng quan phân màu riêng cho bảo hiểm TNDS, đăng kiểm, phí đường bộ và bảo dưỡng. Nút Thoát và phím Back đều hỏi xác nhận trước khi đóng ứng dụng. Mọi ô mật khẩu có Hiện/Ẩn, mặc định ẩn.

Đăng nhập bằng mật khẩu trước, mở Cài đặt → Vân tay, xác thực mật khẩu hiện tại và bật bằng hộp thoại hệ thống. WebAuthn PRF + HKDF/AES-GCM bảo vệ thông tin đăng nhập lưu cục bộ; không lưu mật khẩu/khóa mở dạng rõ. Đăng nhập sinh trắc học vẫn xác thực mật khẩu hiện tại qua Drive và giữ nguyên phân quyền. Thiết bị/trình duyệt cần hỗ trợ authenticator nền tảng + PRF. Hệ thống có thể cho dùng vân tay, khuôn mặt hoặc khóa màn hình tùy thiết bị; app không thu thập ảnh vân tay. Mật khẩu luôn dùng được thay thế. Sau đổi/đặt lại mật khẩu, bật lại vân tay. Tắt trong Cài đặt → Vân tay sẽ xóa bản mã cục bộ, không xóa passkey trong trình quản lý mật khẩu của hệ điều hành. Google vẫn có thể yêu cầu cấp lại quyền khi phiên hết hạn.

Android 4.8.0 là ứng dụng native, dùng OAuth Google Drive và hỗ trợ sinh trắc học trên thiết bị tương thích. Windows Portable, iOS Web App và Web dùng chung chức năng, dữ liệu Drive và số phiên bản 4.8.0.

## 4.8.3 — Phục hồi sang hai Google mới

Web và Android có **Tổ chức → Sao lưu & Phục hồi → Phục hồi từ hai Google cũ**. Admin đang đăng nhập tạo bản sao lưu đầy đủ, mở chức năng này, sau đó ứng dụng kết thúc phiên hiện tại và yêu cầu chọn lại Google lưu dữ liệu Admin mới rồi Google lưu dữ liệu NSD mới. Nếu đã có tổ chức trên Google đích, mở dữ liệu hiện có; không ghi đè tổ chức đó qua luồng chuyển này.

1. Trên hai Google cũ, đăng nhập Admin và tạo bản sao lưu **đầy đủ** trong Cài đặt. Đợi đồng bộ hoàn tất trước khi sao lưu.
2. Ngay trong **Tổ chức → Sao lưu & Phục hồi**, chọn **Phục hồi từ hai Google cũ**. Ứng dụng kết thúc phiên hiện tại và yêu cầu chọn lại Google Admin mới, sau đó Google NSD mới.
3. Mở ZIP/JSON, nhập mật khẩu sao lưu, kiểm tra tổ chức, số xe/giao dịch/tệp và hai tài khoản đích.
4. Nhập tên tổ chức để xác nhận. Sau khi hoàn tất, đăng nhập bằng tên và mật khẩu tại thời điểm sao lưu. NSD kết nối Google NSD mới trước khi đăng nhập.

Bản sao lưu mang theo dữ liệu của hai tài khoản cũ; không cần cấp quyền cho hai Google cũ trong lúc ghi sang Google mới. Dữ liệu nguồn được giữ nguyên. Tệp đính kèm được tạo lại với ID mới; các tham chiếu được đổi trong dữ liệu mới. Hồ sơ tài khoản giữ phần kiểm tra mật khẩu gốc và ánh xạ nơi lưu mới được mã hóa/xác thực bằng AES-GCM. Đổi mật khẩu sau chuyển sẽ ghi hồ sơ tài khoản chuẩn ở nơi lưu mới. Nếu chuyển bị lỗi, ứng dụng dọn các tệp đích đã tạo; nếu dọn chưa xong, hiển thị thông báo để xử lý trước khi thử lại.

Cấu hình phiên bản Android và đóng gói Web lấy cùng phiên bản 4.8.3. Workflow Windows đóng gói APK đã ký từ docs/downloads, Web ZIP, Windows và hồ sơ iOS, tạo release và SHA-256 chung.
