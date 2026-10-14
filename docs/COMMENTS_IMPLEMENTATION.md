# Comment theo kỹ năng

## Nghiệp vụ

- Mỗi kỹ năng có một khu vực bình luận chung trên trang danh sách đề: `grammar-vocab`, `writing`, `reading`, `listening`, `speaking`. Tests và Practice của cùng kỹ năng dùng chung cuộc thảo luận; không tách theo đề hoặc Part.
- Chỉ có hai cấp: comment gốc và danh sách reply. Trả lời một reply vẫn thuộc comment gốc, không tạo cấp thứ ba.
- `replyToId` xác định comment được trả lời; server tìm comment gốc và người được nhắc tên. Đầu reply hiển thị `@tên người được trả lời` nếu hai tài khoản khác nhau. So sánh bằng user ID; hai người trùng tên vẫn là hai tài khoản khác nhau.
- Đọc công khai; đăng nhập mới được gửi/trả lời. Người dùng chỉ xóa được comment của chính mình. Xóa mềm và giữ chỗ trống để không mất các reply đang có.
- Nội dung là văn bản thuần, giới hạn 2.000 ký tự sau khi trim; không render HTML. Frontend chặn gửi trùng khi đang xử lý; server giới hạn 10 lượt gửi/phút theo throttler hiện có.

## API và lưu trữ

- `GET /api/v1/comments?skill=writing&page=1`: 20 comment gốc/trang, từ mới đến cũ, kèm các reply từ cũ đến mới; trả `comments`, `total` (không tính comment đã xóa), `page`, `hasMore`.
- `POST /api/v1/comments`: `{ skill, content, replyToId? }`; danh tính lấy từ phiên đăng nhập. Không nhận `authorId`, `parentId`, `mention` từ client.
- `DELETE /api/v1/comments/:id?skill=writing`: kiểm tra cùng kỹ năng và quyền sở hữu.
- Bảng `skill_comments`: author, skill, content, parent, reply target, thời điểm tạo/xóa. Index riêng cho comment gốc theo skill và reply theo parent.
- Migration `1760000013000-AddSkillComments.ts` có constraint/trigger bảo vệ quy tắc hai cấp và ngăn liên kết chéo kỹ năng; cấu trúc thread/danh tính/skill không được thay đổi sau khi tạo.
- Đã chạy migration trên PostgreSQL local đang cấu hình. Máy khác chạy `cd backend` rồi `npm run db:migrate`; không cần thêm biến môi trường.

## Giao diện

- Thay toàn bộ comment mẫu bằng API thật tại các trang danh sách đề chung và các trang Reading/Listening/Speaking cũ.
- Đổi kỹ năng hoặc tài khoản tạo state mới, hủy request cũ; không để comment hoặc draft của kỹ năng cũ hiện ở kỹ năng mới.
- Có loading, trạng thái trống, thử tải lại, lỗi gửi, nút xem thêm, hủy reply; giữ draft khi gửi lỗi. `Ctrl+Enter`/`Cmd+Enter` gửi; Enter thường xuống dòng.
- Nhắc tên hiển thị riêng ở đầu nội dung, không chèn vào textarea nên không bị thêm hai lần tự động.
- Dùng tên, vai trò, avatar thật; avatar thiếu dùng chữ cái đầu. Giao diện Anh/Việt, mobile và dark mode theo component chung hiện có. Thêm 24 khóa `comments` vào mỗi JSON ngôn ngữ.
- Phần bình luận cập nhật khi tải trang, gửi, xóa hoặc xem thêm; chưa có cập nhật realtime cho bình luận từ người khác.

- Các nút Gửi, Trả lời và Xóa dùng icon máy bay giấy, mũi tên trả lời và thùng rác; giữ tooltip/aria-label Anh–Việt và trạng thái khóa khi đang xử lý. Hai lần đổi icon có commit riêng.

## Kiểm tra

- `npm run test:comments` (backend): 7 test DTO, chuẩn hóa cấp reply, API công khai/xác thực, chặn giả danh/parent/mention.
- `npm run test:comments:db` (backend): PostgreSQL thật trong transaction rollback, kiểm tra tách skill, mention/self reply, SQL không cho cấp 3 hoặc liên kết chéo skill, quyền xóa, giữ reply sau xóa và phân trang; không lưu dữ liệu test.
- `npm run test:comments:ui` (frontend): browser test mobile dùng API fixture, kiểm tra reply đúng người, tự trả lời, giữ draft khi lỗi, chuyển skill kể cả request cũ đang tải, tải lại dữ liệu, xóa comment của mình và khách chưa đăng nhập.
- 90 test frontend hồi quy; build frontend/backend thành công.
- Đã commit theo từng task; chưa push.
