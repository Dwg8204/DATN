# RAG R7 — Đánh giá và đối chiếu



Trạng thái: **REVIEW_REQUIRED**. Không gọi provider; dùng vector hiện có và truy vấn DB. Bộ R0 có 0/60 mẫu đủ điều kiện chính thức. Không biến nhãn AI thành gold giáo viên.



## Truy xuất (chẩn đoán phát triển, chưa phải nghiệm thu độc lập)

Recall = số relevant truy xuất / tổng relevant đã gán nhãn; không gọi hit-rate là Recall cho nhiều relevant. MRR vector/keyword theo toàn thứ hạng khả dụng; RRF chỉ hợp nhất top50 mỗi nhánh. Đơn vị knowledge là document (loại chunk trùng); questions là question. Loại đề nguồn; nhãn câu hỏi chưa đầy đủ, unlabelled không được coi là sai. Listening chưa xác minh audio. Writing/Speaking không có mẫu R0 => N/A.

| Kho | Cách | Kỹ năng | N | Official N | R@1 | R@3 | R@5 | MRR |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| knowledge | keyword | ALL | 60 | 0 | 0 | 0 | 0 | 0 |
| knowledge | keyword | GRAMMAR_VOCAB | 20 | 0 | 0 | 0 | 0 | 0 |
| knowledge | keyword | READING | 20 | 0 | 0 | 0 | 0 | 0 |
| knowledge | keyword | LISTENING | 20 | 0 | 0 | 0 | 0 | 0 |
| knowledge | keyword | WRITING | 0 | 0 | N/A | N/A | N/A | N/A |
| knowledge | keyword | SPEAKING | 0 | 0 | N/A | N/A | N/A | N/A |
| knowledge | vector | ALL | 60 | 0 | 0.8667 | 0.9333 | 1 | 0.9094 |
| knowledge | vector | GRAMMAR_VOCAB | 20 | 0 | 0.95 | 1 | 1 | 0.975 |
| knowledge | vector | READING | 20 | 0 | 0.95 | 0.95 | 1 | 0.96 |
| knowledge | vector | LISTENING | 20 | 0 | 0.7 | 0.85 | 1 | 0.7933 |
| knowledge | vector | WRITING | 0 | 0 | N/A | N/A | N/A | N/A |
| knowledge | vector | SPEAKING | 0 | 0 | N/A | N/A | N/A | N/A |
| knowledge | rrf | ALL | 60 | 0 | 0.8667 | 0.9333 | 1 | 0.9094 |
| knowledge | rrf | GRAMMAR_VOCAB | 20 | 0 | 0.95 | 1 | 1 | 0.975 |
| knowledge | rrf | READING | 20 | 0 | 0.95 | 0.95 | 1 | 0.96 |
| knowledge | rrf | LISTENING | 20 | 0 | 0.7 | 0.85 | 1 | 0.7933 |
| knowledge | rrf | WRITING | 0 | 0 | N/A | N/A | N/A | N/A |
| knowledge | rrf | SPEAKING | 0 | 0 | N/A | N/A | N/A | N/A |
| questions | keyword | ALL | 37 | 0 | 0.1068 | 0.1068 | 0.1068 | 0.2162 |
| questions | keyword | GRAMMAR_VOCAB | 15 | 0 | 0.0633 | 0.0633 | 0.0633 | 0.2667 |
| questions | keyword | READING | 14 | 0 | 0 | 0 | 0 | 0 |
| questions | keyword | LISTENING | 8 | 0 | 0.375 | 0.375 | 0.375 | 0.5 |
| questions | keyword | WRITING | 0 | 0 | N/A | N/A | N/A | N/A |
| questions | keyword | SPEAKING | 0 | 0 | N/A | N/A | N/A | N/A |
| questions | vector | ALL | 37 | 0 | 0.1676 | 0.2446 | 0.3054 | 0.4225 |
| questions | vector | GRAMMAR_VOCAB | 15 | 0 | 0.2133 | 0.3033 | 0.3533 | 0.5994 |
| questions | vector | READING | 14 | 0 | 0 | 0 | 0.1071 | 0.1053 |
| questions | vector | LISTENING | 8 | 0 | 0.375 | 0.5625 | 0.5625 | 0.6458 |
| questions | vector | WRITING | 0 | 0 | N/A | N/A | N/A | N/A |
| questions | vector | SPEAKING | 0 | 0 | N/A | N/A | N/A | N/A |
| questions | rrf | ALL | 37 | 0 | 0.1676 | 0.2446 | 0.3054 | 0.4223 |
| questions | rrf | GRAMMAR_VOCAB | 15 | 0 | 0.2133 | 0.3033 | 0.3533 | 0.5994 |
| questions | rrf | READING | 14 | 0 | 0 | 0 | 0.1071 | 0.1047 |
| questions | rrf | LISTENING | 8 | 0 | 0.375 | 0.5625 | 0.5625 | 0.6458 |
| questions | rrf | WRITING | 0 | 0 | N/A | N/A | N/A | N/A |
| questions | rrf | SPEAKING | 0 | 0 | N/A | N/A | N/A | N/A |


## Quét ngưỡng (top10 vector mỗi query)

### knowledge

| Ngưỡng | Retrieved | Judged | Unknown | Precision trên judged | Đủ điều kiện chốt |
| --- | --- | --- | --- | --- | --- |
| 0.5 | 600 | 60 | 540 | 1 | false |
| 0.55 | 600 | 60 | 540 | 1 | false |
| 0.6 | 546 | 60 | 486 | 1 | false |
| 0.65 | 193 | 54 | 139 | 1 | false |
| 0.7 | 44 | 28 | 16 | 1 | false |
| 0.75 | 5 | 5 | 0 | 1 | false |
| 0.8 | 0 | 0 | 0 | N/A | false |
| 0.85 | 0 | 0 | 0 | N/A | false |
| 0.9 | 0 | 0 | 0 | N/A | false |


### questions

| Ngưỡng | Retrieved | Judged | Unknown | Precision trên judged | Đủ điều kiện chốt |
| --- | --- | --- | --- | --- | --- |
| 0.5 | 600 | 50 | 550 | 0.9 | false |
| 0.55 | 600 | 50 | 550 | 0.9 | false |
| 0.6 | 600 | 50 | 550 | 0.9 | false |
| 0.65 | 600 | 50 | 550 | 0.9 | false |
| 0.7 | 600 | 50 | 550 | 0.9 | false |
| 0.75 | 600 | 50 | 550 | 0.9 | false |
| 0.8 | 600 | 50 | 550 | 0.9 | false |
| 0.85 | 591 | 50 | 541 | 0.9 | false |
| 0.9 | 529 | 45 | 484 | 0.9556 | false |


Chỉ chốt khi nhãn người duyệt hợp lệ và toàn bộ kết quả tại ngưỡng được đánh giá. Không dùng precision trên một phần judged để tự nâng chất lượng. Đề xuất: {"knowledge":null,"questions":null}. .env.example hiện tại: {"questions":0.75,"knowledge":0.7}. Nếu không có ngưỡng đủ điều kiện, giữ cấu hình cũ; không tuyên bố đó là tối ưu.

## Chọn đề R3 so với cách cũ (20 seed)

Cùng luồng R3 với nguồn + 4 lỗi cùng kỹ năng; bảng tách central source và toàn nhóm. Nhãn NEAR_DUPLICATE/STRATEGY_RELEVANT chỉ là chẩn đoán; bỏ REJECTED/AUDIO_UNVERIFIED. Không khẳng định RAG tốt hơn nếu kết quả không cho thấy điều đó.

| Đơn vị | RAG | Cách cũ |
| --- | --- | --- |
| Nguồn trung tâm | 0.0167 | 0.0267 |
| Toàn nhóm | 0.1667 | 0.1117 |


## Sinh văn bản — từ ai_requests

COMPLETED chỉ là provider thành công, không phải validator pass. Validation mới ghi attempt=1/2 cho lượt đầu/sửa trong một chu kỳ sinh; retry worker ở chu kỳ sau tính riêng. Request cũ không có metadata giữ UNKNOWN, không hồi tố. Tỷ lệ sau đây chỉ tính initial đã có kết quả validation; lỗi provider được phản ánh riêng qua requests/provider_completed.

| Purpose | Requests | Provider completed | Validation unknown | Initial validated | Initial passed | Pass rate |
| --- | --- | --- | --- | --- | --- | --- |
| PERSONAL_FINAL | 4 | 4 | 4 | 0 | 0 | N/A |
| PERSONAL_WEEKLY | 34 | 32 | 34 | 0 | 0 | N/A |


## Chấm tay 30 giải thích + 10 báo cáo (thang 1–5)

Bộ rà soát: rag-r7-human-review.json. Đã chấm 0/40; humanReviewed=false. Chưa có điểm giáo viên thì để N/A, không quy đổi tự động điểm AI 0–2 của R2.

| Loại | Cần | Đã chấm | Đúng kiến thức | Bám nguồn | Dễ hiểu |
| --- | --- | --- | --- | --- | --- |
| EXPLANATION | 30 | 0 | N/A | N/A | N/A |
| REPORT | 10 | 0 | N/A | N/A | N/A |


## Vận hành (quan sát, không có đối chứng)

| Tier | Items | Completed | Completion rate |
| --- | --- | --- | --- |
| 1 | 0 | 0 | N/A |
| 3 | 0 | 0 | N/A |


Chưa ghi tổng số lượt retrieval nên không thể suy ra gap/request rate. Bảng dùng events/submissions làm proxy công khai, có thể >100%; không phải xác suất truy xuất thất bại. Retention chỉ giữ khoảng 180 ngày.

| Tuần UTC | Gap events | Learners | Submissions | Events/submission |
| --- | --- | --- | --- | --- |



## Phần cần hoàn tất để nghiệm thu R7

- Duyệt bộ nhãn độc lập (đặc biệt các cặp câu và audio), bổ sung judgement cho kết quả trả về và chấm 40 mẫu 1–5.
- Chạy lại rag:eval, chỉ cập nhật ngưỡng khi có precision >=0.8 trên tập đủ điều kiện.
- Kết quả chức năng R0–R6 nằm trong PERSONALIZATION_RAG_R0_R7_CHECK.md.
