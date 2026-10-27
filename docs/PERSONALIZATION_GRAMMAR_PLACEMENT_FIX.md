# Sửa ghi nhận đánh giá đầu vào Grammar & Vocabulary

Nguyên nhân: bộ chấm G&V hiện trả điểm OBJECTIVE nhưng estimated_cefr=NULL. Hồ sơ và ứng viên đánh giá dùng band để kết luận đã đánh giá, nên bài full đã nộp vẫn bị coi là thiếu.

Bổ sung assessmentComplete độc lập band. G&V FULL_SKILL đã nộp, chấm OBJECTIVE, điểm hợp lệ trong 0..max_score và max_score>0 được ghi nhận; 0 điểm vẫn hoàn thành đánh giá. Không tự quy đổi điểm thành CEFR vì chưa có policy G&V. Các kỹ năng khác giữ hành vi cũ. Truy vấn hồ sơ lấy cả G&V full không band ngoài cửa sổ 60 ngày; không sửa lịch sử hoặc yêu cầu làm lại.

API hồ sơ, điều kiện create/replace và ứng viên PLACEMENT cùng nhận trạng thái mới. Thẻ đánh giá có nhãn đã đánh giá/chưa có band nếu còn kỹ năng khác thiếu; ẩn khi đủ ba kỹ năng bắt buộc. Lộ trình đã lưu không bị viết lại tự động.

SNAPSHOT_VERSION tăng 4 → 5 do bổ sung thông tin hồ sơ. Không cần migration. Khởi động lại backend nếu chưa tự reload rồi tải lại Dashboard.

Kiểm thử: 26 unit tests hồ sơ/placement; PostgreSQL S3 gồm lịch sử G&V không CEFR, 0 điểm, không xếp lại PLACEMENT và hoàn thành ba kỹ năng; 2 browser tests desktop/mobile (thẻ đánh giá và admin); TypeScript và lint.
