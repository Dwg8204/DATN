# Cá nhân hóa P0 — Speaking theo Part

Ngày hoàn thành triển khai: 19/10/2026. Nhánh `feat/learning-personalization`, tạo mới và cập nhật `origin/develop` bằng fast-forward tới `3e7fae0` trước khi sửa code. Chờ người dùng nghiệm thu P0; chưa triển khai GĐ1.

## Hành vi

- Speaking `PART`: trường `estimatedCefr` ở summary và `result.speaking.estimatedCefr` trả `null`. Lịch sử không trả band của bài Part. Cả luồng Exam và Practice đều bảo vệ kết quả cũ trước khi migration được chạy.
- Điểm luyện tập /50, bốn tiêu chí, phản hồi từng câu/Part, bản ghi âm và transcript được giữ nguyên. Lý do CEFR và thông báo chấm được thay bằng giải thích rằng một Part chưa đủ để ước lượng trình độ toàn kỹ năng.
- Prompt `speaking-rubric-v5` yêu cầu bài Part không sinh CEFR. Code vẫn loại bỏ band nếu provider trả về; bản chấm cache theo phiên bản prompt cũ không được tái sử dụng cho lượt chấm mới.
- Speaking `FULL_SKILL` giữ cách ước lượng CEFR và tính điểm hiện có, kể cả khi mở tab xem một Part trong bài toàn kỹ năng. P0 không thay đổi ngưỡng bằng chứng của bài toàn kỹ năng.
- Trang tổng quan và chi tiết Speaking chỉ hiện band khi `scope === FULL_SKILL`. Bài Part hiện nhãn đánh giá luyện tập và giải thích bằng tiếng Việt/Anh. Kết quả mô phỏng cũ vẫn có thông báo chưa được AI phân tích.
- Dashboard vốn chỉ lấy bài Exam toàn kỹ năng; đã kiểm chứng bằng truy vấn repository thật. Chatbot đọc qua các service kết quả đã được bảo vệ; công cụ thống kê không đưa band của bài Part vào context.

## Migration và dữ liệu local

`1760000016000-RemoveSpeakingPartCefr.ts`:

1. Đặt cột `estimated_cefr` và JSON `speaking.estimatedCefr` của Speaking Part về null; thay `cefrReason`/`gradingNotice` có liên quan.
2. Chỉ tăng `assessment_revision` cho dòng thực sự thay đổi để các màn hình đọc lại kết quả.
3. Thêm CHECK `speaking_part_cefr_ck`, ngăn ghi lại band vào cả cột và JSON của bài Part.

Rollback bỏ CHECK, không khôi phục band sai đã xóa. Điểm và phản hồi chi tiết không được chấm lại. Khi triển khai môi trường khác, cập nhật code và khởi động lại Speaking worker cùng đợt migration để worker cũ không ghi kết quả trái CHECK.

Đã chạy migration trên database **local** sau khi kiểm thử PostgreSQL ở database `_test`. Local có 5 bài Speaking toàn kỹ năng, không có bài Speaking Part tại thời điểm chạy. Đối chiếu trước/sau xác nhận dữ liệu chấm, điểm và revision của cả 5 bài toàn kỹ năng không đổi; không còn migration chờ. Dữ liệu Speaking Part cũ được kiểm chứng bằng fixture riêng trên `_test`.

Số migration `1760000016000` đã dùng. Hai migration GĐ1 trong kế hoạch cần bắt đầu từ số mới, ví dụ `1760000017000` và `1760000018000` nếu chưa có task khác dùng.

## Kiểm chứng

| Kiểm tra | Kết quả |
| --- | --- |
| Backend `npm test` | 67 suite, 417 test đạt |
| Backend typecheck và build | Đạt |
| ESLint các file backend thay đổi | Đạt |
| Speaking UI và i18n unit tests | 20/20 đạt |
| Browser `tests/writingAssessment.browser.test.mjs` | 3/3 đạt; có 16 tổ hợp Speaking: summary/detail × Part/full × vi/en × desktop/mobile |
| Lint các file frontend thay đổi | Đạt |
| Frontend build | Đạt; còn cảnh báo bundle lớn hơn 500 kB có sẵn |
| PostgreSQL integration | Đạt: up → down → up, dữ liệu cũ, null/pending, giữ full/khác kỹ năng, ràng buộc, history/dashboard |

Lệnh tái chạy từ `backend`: `npm run test:speaking:cefr:db`, với `TEST_DATABASE_URL` trỏ database có tên kết thúc `_test` và khác database ứng dụng. Test tạo schema riêng trong transaction rồi rollback; không dùng dữ liệu học viên.

Không gọi Gemini/Groq thật trong đợt kiểm thử. Test provider dùng HTTP mock; browser dùng API fixture. Vì vậy kết quả trên xác nhận quy tắc hệ thống và hồi quy giao diện, không xác nhận chất lượng chấm của model với audio thật.

## Nghiệm thu thủ công

1. Khởi động backend/frontend với code mới. Trên máy khác, chạy `npm run db:migrate` trong backend trước khi test; local hiện tại đã chạy xong.
2. Nộp bài luyện Speaking Part và chờ chấm: chỉ có điểm /50, bốn tiêu chí và phản hồi; không có band trong summary, chi tiết và lịch sử. Nếu chưa bật AI, kiểm tra trạng thái chờ vẫn hiển thị.
3. Mở bài Speaking toàn kỹ năng đã chấm: band và giải thích vẫn hiện; chuyển tab Part vẫn giữ CEFR của cả bài.
4. Mở chatbot từ kết quả bài Part và xem dashboard: không sử dụng band của bài Part làm trình độ toàn kỹ năng.
5. Kiểm tra tiếng Việt/Anh và màn hình mobile. Xác nhận P0 trước khi tiếp tục GĐ1.
