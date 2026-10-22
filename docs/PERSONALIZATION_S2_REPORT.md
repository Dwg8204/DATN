# S2 — Hồ sơ năng lực và band

Ngày: 22/10/2026. Nhánh: fix/personalization-s2.
Thực hiện mục S2 và Luồng nghiệp vụ mới trong bản kế hoạch sửa cá nhân hóa ở root.
Nhánh tạo từ origin/develop 4623efe; hợp nhất S1 đã nghiệm thu vì develop chưa có S1.

## Đã triển khai

- Policy chung ai-shared/ability-profile.ts: 3 bài FULL_SKILL gần nhất mỗi kỹ năng, chỉ kết quả OBJECTIVE/AI đã nộp tại hoặc trước cutoff. Reading tiếp tục dùng readingCefrEstimate.
- Band kỹ năng: NONE khi chưa có bài, PRELIMINARY khi có 1 bài, ESTIMATE khi có 2–3 bài; có sampleSize và lastAt. Chuẩn chung A1=1, A2=2, B1=3, B2=4, C=5; dữ liệu C1/C2 cũ quy về C trong thang của kế hoạch.
- Band chung lấy trung bình band của Reading, Listening, Writing, Speaking, mỗi kỹ năng có cùng trọng số. Đủ 4 là FULL; 2–3 là PARTIAL kèm missing; dưới 2 không có band chung. G&V chỉ phá hòa trong vùng 0,5 ± 0,15: đủ band trên thì lên, còn lại xuống.
- Điểm yếu dùng 20 bài có điểm gần nhất trong 60 ngày, gồm tiêu chí AI Writing/Speaking không có điểm số. Câu sai 14 ngày và chủ đề yếu GĐ10 giữ nguyên.
- Truy vấn hồ sơ độc lập mục tiêu, giới hạn full bằng row_number theo kỹ năng và lọc cutoff. Snapshot nhận band/weak từ hồ sơ; số bài và statistics theo mục tiêu/tuần giữ nguyên.
- Tạo/thay mục tiêu lưu baseline_profile trong cùng transaction và khóa user. Mục tiêu cũ NULL, không dựng ngược baseline từ dữ liệu hiện tại.
- FINAL dùng hồ sơ tại cutoff để kết luận đạt band; FINAL/MIDTERM có bandChange đầu kỳ → hiện tại. Lời AI được cung cấp cả hai mốc, validator nhận biết các band được lưu.
- Dashboard và chatbot dùng policy/truy vấn chung, không còn loại Writing khỏi band chung. Các số liệu biểu đồ Dashboard vẫn theo luồng thống kê hiện có.
- GoalProgressCard hiển thị band từng kỹ năng và mức tin cậy; báo cáo FINAL/MIDTERM có bảng đầu kỳ → hiện tại, phù hợp mobile và chuỗi Việt/Anh. Báo cáo cũ thiếu dữ liệu mới vẫn hiển thị được.

## Phiên bản và migration

- SNAPSHOT_VERSION = 3 (S1 đã dùng 2); REPORT_PROMPT_VERSION = personal-weekly-v3; FINAL_PROMPT_VERSION = personal-final-v2.
- Migration 1760000021000-AddGoalBaselineProfile thêm một cột JSONB nullable; đã áp dụng riêng migration này trên database local. Không sửa .env và không gọi AI/email thật.
- Develop có các migration Writing/Vocabulary chưa chạy ở local; đợt này không áp dụng chúng. Có migration cùng timestamp nhưng khác tên lớp/tên file; giữ nguyên các migration đã có, kiểm thử rollback đúng lớp AddGoalBaselineProfile.
- Với môi trường mới, rà soát danh sách migration trước khi dùng npm run db:migrate; lệnh đó áp dụng mọi migration đang chờ của checkout.

## Kiểm chứng

- 13 suite / 149 unit test liên quan đạt, gồm 20 ca ability-profile: 0/1/2/3/5 bài, chỉ ba bài mới nhất, band chung, G&V phá hòa, loại SIMULATED/UNASSESSED/PENDING_AI, Part, cutoff và 60 ngày.
- TypeScript và ESLint các file backend liên quan đạt; Oxlint các component frontend đạt; build frontend đạt với cảnh báo kích thước bundle hiện có.
- PostgreSQL S2: migration up/down/up trực tiếp đúng lớp, baseline mục tiêu cũ NULL, lịch sử trước mục tiêu, tiến độ vẫn 0, Part yếu có ngay trong tuần đầu, A2 → B2 tại cutoff, baseline không đổi khi tạo/thay mục tiêu; Dashboard/chatbot/snapshot cùng band.
- Hồi quy PostgreSQL snapshot GĐ3, lộ trình GĐ4/S1, báo cáo GĐ7, FINAL GĐ8, ngữ cảnh chatbot GĐ9 đạt. Fixture FINAL cập nhật giới hạn tạo mục tiêu của S1; trường hợp mục tiêu cũ vượt nhịp được seed qua repository để giữ đúng ý nghĩa kiểm thử.
- Browser desktop/mobile đạt, kiểm tra nhãn Preliminary/Estimate, Missing: Writing và bảng A2 → B2; 4 unit test frontend cá nhân hóa đạt. Browser dùng API fixture, không phải lượt chấm AI thật.

## Bàn giao

Khởi động lại backend/frontend để nhận code. Những mục tiêu tạo trước S2 không có baseline; mục tiêu tạo/thay sau S2 sẽ lưu hồ sơ lúc đó. Báo cáo READY đã lưu không được tính lại.
Dừng nghiệm thu S2 trước S3 (đánh giá đầu vào). S3–S5 và GĐ11 chưa triển khai trong đợt này.
