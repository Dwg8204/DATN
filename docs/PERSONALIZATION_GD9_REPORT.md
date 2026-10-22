# GĐ9 — Hỏi AptiMate về báo cáo

Ngày triển khai: 21/10/2026. Đối chiếu mục 7.7, 9.1, 9.4 và hàng GĐ9 trong [kế hoạch bản 2](PERSONALIZATION_IMPLEMENTATION_PLAN_V2.md).

## Thay đổi

- `CreateChatDto` nhận `insightId` UUID. Một phiên chọn ngữ cảnh báo cáo hoặc kết quả bài; gửi cả hai bị từ chối. Phiên chat thông thường và câu hỏi theo attempt/questionKey giữ hành vi cũ.
- Backend kiểm tra báo cáo WEEKLY/MIDTERM/FINAL thuộc tài khoản đăng nhập trước khi tạo phiên. Báo cáo chưa chuẩn bị snapshot, không tồn tại hoặc không thuộc sở hữu trả `CHAT_INSIGHT_UNAVAILABLE`.
- `context_insight_id` được lưu và trả trong danh sách phiên. Tạo lại cùng session ID/cùng ngữ cảnh là idempotent; đổi ngữ cảnh trên ID cũ trả conflict. Khi mở lại phiên, backend dùng ngữ cảnh đã lưu.
- Mỗi lượt gửi/thử lại đều đọc lại báo cáo theo chủ sở hữu trước khi gọi provider. Nếu báo cáo không còn đọc được, lượt trả lời thất bại và không gọi provider cho lượt đó.
- `InsightContextService` là service chỉ đọc do PersonalizationModule export. ChatbotModule đã phụ thuộc PersonalizationModule từ GĐ3, nên không thêm vòng phụ thuộc. Đọc ngữ cảnh không đổi `read_at`, không sửa insight/goal/plan.
- Nạp sẵn snapshot số liệu, kỳ báo cáo, nguồn AI/RULE, outcome FINAL và content.report. Không gửi ứng viên, test IDs, question keys, plan nội bộ hoặc generationKey. Mỗi nhóm chỉ giữ tối đa 5 mẫu điểm, vẫn giữ sampleSize và mọi tổng số chính xác; nếu ngữ cảnh quá dài thì bỏ thống kê chi tiết, giữ tiến độ và lời báo cáo kèm ghi chú giới hạn.
- Prompt phân biệt số liệu tuần, lũy kế, band đích/band ước lượng, đạt số bài/đạt band, số liệu báo cáo lịch sử/thống kê hiện tại. Không tính lại điểm/CEFR hoặc thực thi chỉ dẫn trong nội dung báo cáo.
- Metadata của câu trả lời ghi `insightId` và `insightInputHash` để nhận biết snapshot được dùng; không ghi toàn bộ báo cáo vào metadata.
- Thêm `OPEN_STUDY_PLAN` → `/profile/dashboard` và `OPEN_MISTAKE_REVIEW` → `/profile/mistakes`. Server chỉ giữ action code, bỏ URL/goalId/itemId do model đưa ra; frontend ánh xạ route cố định. Trang ôn câu sai tiếp tục để người dùng chọn việc, không tự đánh dấu đã ôn.

## Giao diện

Trang chi tiết báo cáo có nút **Hỏi AptiMate về báo cáo này**. Nút mở chat mới theo báo cáo; phiên được tạo khi gửi câu hỏi đầu tiên, giống luồng hỏi kết quả bài hiện có. Có nhãn ngữ cảnh, liên kết xem báo cáo và hai câu hỏi gợi ý bằng Anh/Việt.

Khi chuyển giữa hai báo cáo, khóa widget chứa cả đường dẫn để không gửi tiếp vào phiên của báo cáo trước. Bấm lại nút hỏi tạo một lượt mở chat mới. Khi chọn lịch sử chat, nhãn/liên kết báo cáo lấy từ phiên đã chọn, không lấy từ trang đang đứng.

## Kiểm thử

- Unit: UUID/field giả mạo; từ chối ngữ cảnh kép; không tạo phiên khi không có quyền; action chỉ dùng route cố định; projection giữ tổng số và loại dữ liệu nội bộ; loại insight chưa chuẩn bị hoặc không phải báo cáo.
- PostgreSQL `_test`: WEEKLY/MIDTERM/FINAL, fallback RULE, ownership khi tạo/gửi, session replay/conflict, phục hồi phiên, kiểm tra lại lúc retry, metadata, read-only và FK khi xóa insight. Provider giả lập kiểm tra ngữ cảnh nhận đúng 7 bài tuần và 12/40 bài mục tiêu, không có dữ liệu nội bộ.
- Browser: mở hỏi từ trang báo cáo thật; gửi đúng insightId, không kèm attemptId; chuyển báo cáo A/B tạo phiên khác nhau; lịch sử giữ báo cáo A; hai action đi đúng trang; hồi quy phiên chat, feedback/retry/rename, câu sai và ẩn chat khi thi.
- Kết quả 21/10/2026: typecheck backend đạt; 13 suite/138 test chatbot và cá nhân hóa đạt; PostgreSQL GĐ9 và bộ chatbot database cũ đạt; frontend chính 95/95, chatbot 6/6 và browser cá nhân hóa 1/1 đạt. Build backend/frontend, ESLint backend các file GĐ9 và `git diff --check` đạt. Oxlint frontend không lỗi, còn hai cảnh báo có sẵn trong widget (`set-state-in-effect`, `exhaustive-deps`).
- Hai lần đầu bộ browser cá nhân hóa dừng do selector Close trùng và chat tự mở lại sau reload URL có `chat=1`; đã chỉnh thao tác test và chạy lại toàn bộ kịch bản đạt. Database từng dừng vì Docker chưa chạy, sau đó xung đột extension khi hai bộ chạy song song; chạy lại tuần tự đạt. Các lỗi này không bị bỏ qua hoặc đổi thành test skip.

Lệnh chạy:

```powershell
# Backend; DB integration chỉ dùng TEST_DATABASE_URL có tên kết thúc _test
npm run typecheck
npx jest --runInBand --testPathPattern 'chatbot|personalization'
npx ts-node test/integration/personalization-chatbot.ts
npm run test:chatbot:db
npm run build

# Frontend
npm run test:chatbot
npm run test:personalization:ui
npm test
npm run build
```

`npm run test:personalization:db` cũng đã thêm GĐ9 vào runner tổng GĐ1–GĐ9. Chạy các bộ database tuần tự trên cùng database `_test`, vì extension PostgreSQL dùng chung ở cấp database.

## Vận hành và giới hạn

Không có migration/env mới; cột `context_insight_id` đã có ở GĐ1. Cần khởi động lại backend và `CHATBOT_ENABLED=true` cùng cấu hình provider chatbot hiện có để trả lời thực tế. Báo cáo RULE vẫn hỏi được khi AI cá nhân hóa tắt; các câu trả lời dùng quota/chat recorder hiện có, không tính như lần sinh báo cáo.

Kiểm thử dùng dữ liệu tổng hợp và provider giả lập, không gọi AI hoặc SMTP thật. Test xác nhận dữ liệu được truyền đúng, bảo toàn quyền và lưu đúng phản hồi fixture; không chứng minh mọi câu trả lời của model thực tế luôn đúng. Kiểm định ngữ nghĩa/rubric vẫn thuộc GĐ11.

Khi insight bị xóa, FK đặt context_insight_id về NULL; phiên và lịch sử chat đã lưu vẫn theo cơ chế chatbot hiện có. Không có tool để chatbot tự thay mục tiêu hoặc cập nhật tiến độ.

GĐ8 và GĐ9 chưa commit/push. Dừng tại GĐ9 để người dùng nghiệm thu, chưa triển khai GĐ10/GĐ11.
