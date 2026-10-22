# Nghiệm thu cá nhân hóa S4 — API chỉ đọc và hiệu năng

Ngày 23/10/2026. Nhánh `fix/personalization-s4` kế thừa S3 đã hoàn thành (`bf4c584`). S3 chưa được push/merge trong phiên này nên giữ nguyên chuỗi phụ thuộc, không tạo nhánh từ bản develop local cũ. Phạm vi bám mục S4 trong `Kế hoạch sửa cá nhân hóa AptiMate.md`; chưa triển khai S5 hoặc GĐ11.

## Kết quả

- Migration `AddPlanProgressFinalizedAt1760000023000` thêm `study_plans.progress_finalized_at` và index cho các tuần chưa chốt. Đồng bộ chỉ chọn tuần chưa chốt; sau lần đồng bộ đầu tiên khi ngày hiện tại đã qua `ends_on`, tuần được chốt. Kể cả gọi trực tiếp `syncPlan`, tuần đã chốt cũng không bị tính lại. Chỉ đọc liên kết chủ đề của bài làm khi tuần có việc `TOPIC_REVIEW`.
- Snapshot nhận `EntityManager` của transaction từ PlanService và ReportJobsService. Các truy vấn snapshot chạy tuần tự trên connection đó, tránh phát nhiều truy vấn đồng thời trên cùng PostgreSQL client. Truy vấn nguồn lỗi gần đây cũng nhận manager; việc đọc chi tiết bài vẫn tái sử dụng dịch vụ bài thi/luyện tập hiện có.
- `GET /me/personalization/overview` trả `{goal, progress, profile, plan, today, comment, recentReports, needsSync}`. `progress` chứa snapshot tiến độ/band/thói quen để giữ giao diện hiện có. `profile` gồm hồ sơ và placement S3. Recent reports giới hạn 3.
- `needsSync` bật khi thiếu lộ trình tuần hiện tại, mục tiêu ACTIVE đã quá hạn hoặc có kết quả chấm mới đủ điều kiện tạo nhận xét. Quy tắc tối đa một nhận xét/ngày vẫn giữ từ GĐ6. Mục tiêu chưa được xử lý quá hạn trả `effectiveStatus: ENDING`.
- `POST /me/personalization/sync` khóa user trong transaction, reconcile mục tiêu/tiến độ, bảo đảm lộ trình và xếp nhận xét. Hai lời gọi đồng thời không tạo trùng plan/nhận xét. Các endpoint chỉ phục vụ STUDENT và luôn lấy user từ session.
- GET mục tiêu, lộ trình hiện tại và nhận xét chỉ đọc, không còn tự reconcile/ensure/queue. Tạo mục tiêu vẫn bảo đảm lộ trình qua luồng ghi riêng. Hook sau học và worker giữ vai trò cập nhật.
- Dashboard tải một overview rồi truyền dữ liệu cho năm thẻ cá nhân hóa. Chỉ gọi sync khi cần, sau đó tải lại overview. Poll nhận xét PENDING dùng overview mỗi 15 giây, dừng khi READY/HIDDEN. Chia sẻ request đang chạy để tránh React StrictMode gọi trùng. API biểu đồ/thống kê tổng, session và thông báo ngoài cá nhân hóa vẫn hoạt động riêng như trước.
- Đã thực hiện phần worker tùy chọn: chọn mục tiêu quá hạn, thiếu tuần hiện tại, có tuần cũ cần chốt hoặc đã đến giờ nhắc mà chưa xử lý hôm nay. Lập lịch báo cáo, chấm nhận xét và gửi thông báo vẫn chạy như trước.

## Kiểm chứng

- 133 unit test / 12 suite cá nhân hóa đạt.
- PostgreSQL S4 trên schema cách ly: migration xuống/lên; GET không phát INSERT/UPDATE/DELETE/FOR UPDATE và số bản ghi không đổi; phân quyền; concurrent sync chỉ có một plan; tuần 20 chỉ đồng bộ tối đa hai tuần chưa chốt; số query overview bằng tuần 1; tuần đã chốt không đổi khi thêm bài nộp muộn; ENDING rồi sync kết thúc mục tiêu.
- Hồi quy PostgreSQL S1/GĐ4/GĐ6/GĐ7 đạt: bài làm/ôn thẻ, worker đồng thời, báo cáo, lịch sử cutoff, cache/quota và nhận xét. Test GĐ6/GĐ7 chuyển thao tác yêu cầu ghi sang sync thay vì dựa vào GET ghi dữ liệu.
- Browser S4 đạt: một overview, chuỗi overview–sync–overview khi cần, polling và mobile. Hồi quy giao diện cá nhân hóa/placement và công tắc admin được kiểm tra.
- TypeScript, ESLint phần backend thay đổi, oxlint thẻ cá nhân hóa/Dashboard và build frontend đạt. Build vẫn có cảnh báo chunk lớn đã có trước.

## Migration local và vận hành

Đã chạy riêng migration S4 trên database local, xác minh cột là `timestamp with time zone`. Không chạy các migration Writing/Vocabulary không thuộc S4 đang chờ, không sửa `.env` hoặc xóa dữ liệu. Docker/PostgreSQL local đã được khởi động để thực hiện kiểm thử và migration.

Tuần cũ hiện có vẫn NULL sau migration: lần đồng bộ đầu tiên xử lý/chốt chúng một lần; các lần sau chỉ còn tuần hiện tại và tuần vừa kết thúc. Không tự sửa lộ trình hoặc số liệu các tuần đã chốt.

Lệnh kiểm thử:

```powershell
cd backend
npm run test:personalization:s4:db
# TEST_DATABASE_URL phải là database riêng kết thúc _test
cd ../frontend
npm run test:personalization:s4:ui
```

Cần khởi động lại ứng dụng để nhận backend/frontend mới. Commit theo task trên nhánh S4; chưa push/merge. S5 là bước tiếp theo sau nghiệm thu.
