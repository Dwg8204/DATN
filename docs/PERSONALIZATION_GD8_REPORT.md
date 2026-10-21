# GĐ8 — Tổng kết mục tiêu và lịch sử báo cáo

Ngày triển khai: 20/10/2026.

Đối chiếu [kế hoạch cá nhân hóa bản 2](PERSONALIZATION_IMPLEMENTATION_PLAN_V2.md), mục 3.1–3.3, 4, 6.1, 7.1–7.6, 9 và hàng GĐ8.

## Phạm vi đã triển khai

- FINAL cho COMPLETED (hết hạn hoặc kết thúc sớm), EXPIRED, REPLACED từ ngày thứ ba của mục tiêu. CANCELLED không có FINAL.
- Ngày mục tiêu tính theo lịch trong múi giờ đã cố định, bao gồm ngày bắt đầu: thay vào ngày thứ hai không có tổng kết, ngày thứ ba có. Đây là cùng quy tắc `elapsedDays`, không phải chờ đủ 72 giờ từ lúc nhấn tạo.
- Đủ số bài trước hạn vẫn ACTIVE; không tạo FINAL khi chỉ ghi `target_reached_at`. Kết thúc sớm tiếp tục dùng API có kiểm tra đủ bài, khóa người dùng, đối soát và xác nhận trên giao diện của GĐ2/GĐ4.
- Tổng kết phân biệt **đạt số bài** và **đạt band ước lượng**; có ngày đạt số bài. Band thiếu dữ liệu không được coi là đạt/chưa đạt; Writing không tham gia band chung, giữ chính sách snapshot hiện có.
- Trang Báo cáo trong ProfileSidebar trên desktop/mobile, lọc mục tiêu, phân trang báo cáo, tải thêm lịch sử mục tiêu, trạng thái trống/lỗi/tải lại. Có liên kết từ Dashboard và từ chi tiết về danh sách của đúng mục tiêu.
- Chi tiết FINAL có số liệu toàn mục tiêu, trạng thái kết thúc, headline/narrative/achievements và form mục tiêu gợi ý. Người học xem/chỉnh band, số bài, thời hạn rồi xác nhận. Có mục tiêu đang chạy thì hiển thị xác nhận thay mục tiêu và tính lại từ hôm nay; dùng `goalId` hiện tại để chống ghi đè khi mục tiêu thay đổi ở phiên khác.

## Hàng đợi và ranh giới dữ liệu

`queueFinalReport()` ghi một insight FINAL với `period_key=FINAL` ngay trong transaction kết thúc/thay mục tiêu. Lỗi transaction rollback cả mục tiêu lẫn yêu cầu báo cáo. Unique index hiện có và `ON CONFLICT` chống trùng.

Insight ban đầu là yêu cầu chờ snapshot, chưa đưa vào danh sách người học hoặc gửi cho AI. Worker chuẩn bị snapshot sau khi transaction đã commit; tránh vòng phụ thuộc giữa GoalsService và SnapshotService. Tối đa 50 mục tiêu mỗi lượt, khóa người dùng và insight; kỳ bị SKIP LOCKED sẽ được xử lý lượt sau. Worker cũng tạo bù cho mục tiêu đã kết thúc trước khi triển khai GĐ8 hoặc trong thời gian dừng worker.

Hết hạn: cutoff là thời điểm trước nửa đêm sau ngày cuối trong múi giờ mục tiêu. Kết thúc sớm/thay mục tiêu: cutoff là `ended_at`. Không lấy bài/thẻ phát sinh sau cutoff. Số bài tính từ toàn bộ metadata trong kỳ; mẫu kết quả giới hạn 200 bài như kế hoạch. Số ngày có học, lượt ôn thẻ và tỷ lệ hoàn thành lộ trình của FINAL tính toàn mục tiêu, không chỉ tuần cuối.

FINAL không có ứng viên và không sinh/thay lộ trình. Lộ trình mới chỉ xuất hiện khi người học xác nhận tạo/thay mục tiêu gợi ý qua API mục tiêu hiện có.

## AI và gửi báo cáo

- Prompt/schema riêng `personal-final-v1`, purpose `PERSONAL_FINAL`; một lần gọi thông thường, dùng chung recorder/quota 6 lần/người/ngày/RPM của GĐ6–GĐ7.
- Prompt chỉ chứa snapshot số liệu và kết quả mục tiêu do code tính. Không chứa tên/email/ID người học, đề, bài làm hoặc question keys.
- Validator kiểm tra schema, headline 160 ký tự, narrative 120 từ, tối đa 3 achievements; kiểm tra số/band/HTML/link/cam kết điểm bằng hợp đồng dùng chung, thêm kiểm tra một số lời trái kết quả mục tiêu.
- `nextGoalSuggestion`: band A1/A2/B1/B2/C, số bài nguyên 1–500, thời hạn nguyên 3–180; không thêm trường khác. Giá trị đề xuất tương lai không bị kiểm tra như số liệu lịch sử.
- Một lần sửa đầu ra ngay khi sai, sau đó dùng lịch retry chung 15 phút/1 giờ/4 giờ. FINAL cũng tham gia cache, FALLBACK, phục hồi khi bật AI hoặc đổi cấu hình như GĐ7.
- Khi AI tắt/lỗi, báo cáo có số liệu và lời mẫu; không bịa mục tiêu gợi ý. Khi đã có nội dung, API trả ngay; thông báo web/email đến hạn 08:00 sớm nhất chưa qua theo múi giờ tài khoản.
- Tái sử dụng gộp email, dedupe, kiểm tra tùy chọn nhận email và marker giao thành công của GĐ7. Email FINAL đổi nhãn số bài thành “trong mục tiêu”.

## Kiểm chứng

- Hợp đồng FINAL: giá trị gợi ý hợp lệ, biên số bài/thời hạn/band, schema thừa/thiếu, độ dài, số liệu bịa, HTML, cam kết điểm, mâu thuẫn kết quả.
- Snapshot FINAL: ngày học/thẻ/lộ trình xuyên các tuần, loại dữ liệu sau kết thúc.
- PostgreSQL trên `aptimate_chatbot_test`, schema riêng tự tạo/dọn: mục tiêu 3/10/14/30 ngày; đạt số bài ngày 20/30; hết hạn và kết thúc sớm; thay ngày 2/ngày 3; hủy; rollback; ownership; 205 bài/200 mẫu điểm; provider HTTP giả lập, sửa gợi ý sai, cache, token recorder, 08:00 và dedupe web/email.
- Browser: lọc mục tiêu, phân trang, FINAL, kết quả số bài/band tách biệt, chỉnh gợi ý, xác nhận thay/tạo mục tiêu, phản hồi 409 không ghi đè, mobile không tràn ngang; giữ các luồng cá nhân hóa trước đó.
- Kết quả: toàn bộ backend 78 suite/538 test đạt; sau khi thêm ca FINAL toàn kỳ, chạy riêng snapshot 25/25 test đạt (tổng mã kiểm thử hiện có 539 ca). Typecheck backend đạt.
- Runner PostgreSQL GĐ1–GĐ8 đạt, gồm ca FINAL qua đổi giờ mùa đông tại America/New_York: kết thúc đúng ngày mục tiêu và gửi đến hạn 08:00 địa phương.
- Frontend 95/95 test và browser cá nhân hóa mở rộng đạt. Build backend/frontend đạt; frontend còn cảnh báo chunk lớn hơn 500 kB.
- ESLint TypeScript và Oxlint các file giao diện thay đổi đạt. Đã bỏ reset state trực tiếp trong effect của trang chi tiết; đổi ID báo cáo remount nội dung để không hiện nhầm báo cáo trước. `git diff --check` đạt.

Lệnh (backend/frontend chạy trong thư mục tương ứng):

```powershell
# Backend: TEST_DATABASE_URL bắt buộc là database riêng kết thúc _test
npm run typecheck
npm run test:personalization
npm run test:personalization:db
npm test -- --runInBand
npm run build

# Frontend
npm run test:personalization:ui
npm test
npm run build
```

Runner DB tắt worker/AI tự chạy; các ca AI bật cấu hình fixture và thay HTTP bằng mock. Không gọi AI/SMTP thật hoặc dùng dữ liệu học viên thật trong kiểm thử GĐ8.

## Vận hành, giới hạn và bước tiếp theo

Không có migration hoặc biến môi trường mới, không sửa `.env`. Khởi động lại backend để nạp mã mới; dùng các cờ worker/AI và cấu hình SMTP/frontend origin đang có. Worker cá nhân hóa chạy chu kỳ 60 giây: “tổng kết khi kết thúc sớm” là ghi yêu cầu ngay trong transaction, sau đó xử lý ở lượt worker; nội dung chưa xuất hiện ngay trong phản hồi nút kết thúc.

08:00 là mốc đến hạn; giao thực tế phụ thuộc lượt worker và SMTP. Giữ giới hạn gửi của GĐ7: dedupe ngăn xếp hàng trùng, không cam kết SMTP exactly-once khi tiến trình chết giữa gửi và ghi DB. AI xử lý tuần tự, mục tiêu cũ tạo bù dùng chung quota; việc tạo bù có thể mất nhiều lượt/ngày khi tồn đọng lớn.

Kiểm định chất lượng diễn đạt và đúng ngữ nghĩa toàn diện thuộc GĐ11. Không coi validator biểu thức chính quy là bằng chứng mọi lời AI đều chính xác. Các mục tiêu đã kết thúc vẫn có thể nhận kết quả chấm muộn; snapshot FINAL được cố định khi worker chuẩn bị, không tự cập nhật sau khi đã READY.

GĐ9 (hỏi chatbot theo insight), GĐ10 và GĐ11 chưa triển khai. GĐ7 đã commit riêng (`0a877ca`, `d9b1a66`, `568c802`), chưa push. GĐ8 để ở workspace chờ người dùng nghiệm thu.
