# Kế hoạch sửa cá nhân hóa AptiMate

Oct 22, 2026 · @VMMS

## Tóm tắt

Kế hoạch gồm 5 đợt sửa, khoảng 11 ngày công. Mục tiêu: cá nhân hóa đúng ngay từ tuần đầu, band phản ánh tiến bộ thật, lộ trình khớp với việc người học thực sự làm, và Dashboard nhẹ hơn.

- **Phạm vi:** module `personalization`, `topics`, `ai-shared`, `student-dashboard`, `chatbot.context.ts` và các thẻ cá nhân hóa trên Dashboard/Profile.
- **Căn cứ:** review nhánh `develop` tại `3112208` ngày 22/10/2026, cùng các quyết định người dùng chốt trong hội thoại.
- **Ngoài phạm vi:** GĐ11 (rubric đánh giá lời AI) làm sau khi plan này xong, vì rubric phải chấm trên hành vi cuối cùng.
- Mỗi đợt là một nhánh từ `develop`, commit tiếng Việt theo task, dừng sau mỗi đợt để nghiệm thu như quy tắc trong `SESSION_HANDOFF.md`.

## Quyết định đã chốt

Các dòng đánh dấu *(mặc định)* là giá trị plan tự chọn để đủ chi tiết, có thể đổi trước khi sửa.

| Chủ đề | Hiện trạng trong code | Quyết định |
| --- | --- | --- |
| Hồ sơ năng lực | Band và điểm yếu chỉ lấy bài từ `start_date` của mục tiêu | Lấy từ lịch sử, không phụ thuộc mục tiêu; tiến độ số bài vẫn tính theo mục tiêu |
| Người dùng mới | Không có đánh giá đầu vào | Khuyến khích mạnh, không chặn cứng; bắt buộc 3 kỹ năng chấm tự động (G&V, Reading, Listening); Writing/Speaking tùy chọn |
| Độ tin cậy band | Cần ≥ 2 bài full mỗi kỹ năng | 1 bài = band sơ bộ; ≥ 2 bài = band ước lượng |
| Band theo kỹ năng | Trung bình mọi bài full trong mục tiêu | Trung bình 3 bài full gần nhất |
| Band chung | 4 kỹ năng trừ Writing, có tính G&V | Reading, Listening, Writing, Speaking; G&V chỉ quyết khi điểm trung bình nằm giữa hai band |
| Band đầu kỳ | Không lưu | Lưu lúc tạo/thay mục tiêu; FINAL so sánh đầu kỳ với cuối kỳ |
| Đơn vị “bài” | 1 attempt = 1 bài; việc full khớp cả bài Part | Giữ 1 attempt = 1 bài; việc full chỉ khớp bài full |
| Việc TEST | Khớp đề bất kỳ cùng kỹ năng; gộp `targetCount` = nhịp | Chỉ khớp đúng đề gợi ý; 2–3 bài/ngày tách thành nhiều việc với các đề khác nhau |
| Làm trước trong tuần | Bài làm trước ngày lên lịch không được tính | Được tính cho việc trong cùng tuần; việc hôm nay đã làm trước thì coi là xong và không nhắc |
| API | GET có ghi dữ liệu và khóa user | GET chỉ đọc; thêm endpoint gộp cho Dashboard |
| Nhịp tối đa | Không giới hạn (VD 100 bài/10 ngày = 10 bài/ngày) | *(mặc định)* `target_test_count ≤ 3 × duration_days`, vì mỗi ngày tối đa 3 việc và mỗi việc là một đề |
| Bài đánh giá trong mục tiêu | — | *(mặc định)* Bài đánh giá nộp sau khi đã đặt mục tiêu vẫn tính vào số bài, theo cách (a) |

## Luồng nghiệp vụ mới

Người học có một **hồ sơ năng lực** sống lâu hơn mọi mục tiêu. Mục tiêu chỉ còn lo số bài, nhịp học và báo cáo.

### 1. Hồ sơ năng lực

- **Nguồn:** `test_attempts` đã nộp của người học, không lọc theo mục tiêu. Chỉ dùng `result.method` OBJECTIVE hoặc AI.
- **Band từng kỹ năng:** 3 bài FULL\_SKILL gần nhất có `estimated_cefr`. Trạng thái: `NONE` (0 bài), `PRELIMINARY` (1 bài), `ESTIMATE` (2–3 bài). Reading vẫn qua `readingCefrEstimate`.
- **Điểm yếu:** Part yếu, tiêu chí Writing/Speaking lấy từ *(mặc định)* 20 bài có điểm gần nhất trong 60 ngày. Câu sai vẫn là 14 ngày. Chủ đề yếu vẫn theo ngưỡng GĐ10.
- **Band chung:** là mức trung bình của 4 kỹ năng (A1=1 … C=5).
  - Đủ 4 kỹ năng thì ghi `FULL`. Có 2–3 kỹ năng thì ghi `PARTIAL` kèm danh sách còn thiếu. Dưới 2 kỹ năng thì không có band chung.
  - G&V phá hòa: nếu phần lẻ của trung bình nằm trong 0,5 ± 0,15 và có band G&V, thì G&V ≥ band trên cho làm tròn lên, ngược lại làm tròn xuống. Ngoài vùng đó thì làm tròn thường.

```latex
\bar{b} = \frac{1}{n}\sum_{k \in \{R, L, W, S\}} b_k, \qquad \text{biên} \iff \left| (\bar{b} - \lfloor \bar{b} \rfloor) - 0.5 \right| \le 0.15
```

### 2. Đánh giá đầu vào

1. Người học mở Dashboard. Nếu G&V, Reading hoặc Listening còn `NONE`, thẻ “Đánh giá năng lực” hiện đầu trang. Thẻ gợi ý 1 đề đánh giá cho mỗi kỹ năng còn thiếu, Writing/Speaking ghi “tùy chọn”.
2. Bài full bất kỳ đều làm kỹ năng đó có dữ liệu. Người đã có lịch sử sẽ không thấy thẻ này.
3. Form đặt mục tiêu hiện band hiện tại và gợi ý band đích = band chung + 1 bậc (tối đa C).
4. Chưa đánh giá xong vẫn đặt mục tiêu được, nhưng có cảnh báo. Khi đó các ngày đầu của lộ trình tuần 1 là bài đánh giá còn thiếu (reason `PLACEMENT`, mỗi ngày 1 kỹ năng).
5. Đề đánh giá được admin đánh dấu `is_placement` và không bao giờ vào ứng viên luyện tập thường.

### 3. Mục tiêu và band đầu kỳ

- Tạo hoặc thay mục tiêu thì lưu hồ sơ lúc đó vào `learning_goals.baseline_profile`.
- Chặn `target_test_count > 3 × duration_days`.
- FINAL và MIDTERM hiện band đầu kỳ → band hiện tại theo từng kỹ năng. “Đạt band” so hồ sơ tại thời điểm kết thúc với band đích.

### 4. Lộ trình và tính tiến độ

- Mỗi việc TEST là **một đề cụ thể**, `targetCount = 1`. Nhịp 2–3 bài/ngày thì tạo 2–3 việc với đề khác nhau.
- Mỗi ngày vẫn tối đa 3 việc. Ưu tiên: TEST theo nhịp → ôn câu sai hoặc chủ đề → ôn thẻ.
- Việc ôn thẻ chỉ có khi người học có ≥ 10 thẻ chưa lưu trữ. `targetCount` = min(20, số thẻ), làm tròn xuống 10/20.
- Một bài nộp, một lượt ôn thẻ hoặc một lần bấm “Đã ôn xong” chỉ được tính cho một việc. Việc đó có thể thuộc bất kỳ ngày nào trong cùng tuần, làm trước hay làm bù đều được, và ưu tiên việc có ngày sớm nhất.
- Nhắc nhở chỉ gửi khi còn việc của hôm nay chưa xong, sau khi đã tính cả việc làm trước.

## Các đợt sửa

Đường dẫn backend tính từ `backend/src/features/`, frontend từ `frontend/src/features/`. Đợt nào đổi cách tính snapshot thì tăng `SNAPSHOT_VERSION` để cache AI cũ không bị dùng nhầm.

### S1 — Sửa lộ trình và tính tiến độ (2 ngày, không migration)

- [ ] **Part yếu thật sự được ưu tiên.** `personalization/services/plan-candidates.service.ts`: đưa danh sách Part yếu (component, part) vào SQL làm tham số và xếp `row_number()` theo `is_weak DESC, used, random_seed`, thay cho `ORDER BY used, id`. `random_seed` = hash(userId, weekIndex, testId) để ổn định trong tuần. Nâng `rank<=5` lên đủ cho nhịp 3 bài × 7 ngày.
- [ ] **Loại đề đánh giá khỏi ứng viên** (sau khi S3 có cột): thêm `AND NOT t.is_placement`. Cách làm: để sẵn điều kiện qua một hằng SQL.
- [ ] **Ôn thẻ có điều kiện.** Chỉ đẩy VOCAB\_REVIEW khi số thẻ chưa lưu trữ ≥ 10. Snapshot cần thêm `vocab.activeCount`; `learningCount` giữ nguyên. `policies/rule-plan.ts` dùng phương án lớn nhất ≤ số thẻ (10 hoặc 20) thay cho cố định 20.
- [ ] **TEST = một đề, tách theo nhịp.** Viết lại vòng ngày trong `buildRulePlan`: mỗi ngày tạo `min(pace, 3)` việc TEST, mỗi việc `targetCount: 1`. Xoay vòng kỹ năng và đề khác nhau, không lặp đề trong tuần khi còn đề chưa dùng. Slot còn lại dành cho câu sai/chủ đề, rồi ôn thẻ.
- [ ] **Khớp đúng đề và cho làm trước.** `policies/plan-progress.ts`:
  - TEST và TOPIC\_REVIEW khớp theo `attempt.test_id === item.test_id`, bỏ so `component`/`part_number`.
  - Cửa sổ là cả tuần `[plan.starts_on, plan.ends_on]`, không còn `>= scheduled_on`.
  - VOCAB\_REVIEW dùng chung một pool lượt ôn của tuần, phân bổ theo thứ tự ngày.
  - Đổi chữ ký hàm: thêm `startsOn`.
- [ ] **Đánh dấu ôn câu sai sớm.** `services/plan.service.ts` (`markReviewed`, `review.canMarkDone`): cho từ `plan.starts_on` thay cho `scheduled_on`.
- [ ] **Hợp đồng AI.** `ai/report.contract.ts`: sửa prompt và validator. TEST bắt buộc `targetCount=1`; một ứng viên TEST không lặp trong tuần trừ khi hết ứng viên; kiểm tra nhịp đếm theo số việc TEST. Tăng `REPORT_PROMPT_VERSION`.
- [ ] **Chặn nhịp quá cao.** `dto/learning-goal.dto.ts` và `goals.service.ts` (create/replace) từ chối `target_test_count > 3 × duration_days` với mã `GOAL_PACE_TOO_HIGH`. Form trong `personalization/components/LearningGoalSettings.jsx` báo lỗi tương ứng (vi/en). Mục tiêu cũ vượt ngưỡng thì giữ nguyên, lộ trình chỉ phủ tối đa 3 bài/ngày.
- [ ] **Dọn code.** Chạy prettier cho `rule-plan.ts` và `plan-candidates.service.ts`. Gộp truy vấn TOPIC\_REVIEW N+1 thành một truy vấn `DISTINCT ON (topic_id)`.

**Test:** unit `rule-plan.spec`: nhịp 1/2/3, thiếu đề, không có thẻ, tuần lẻ. `plan-progress.spec`: làm trước 1 ngày, làm bù, sai đề, bài Part không hoàn thành việc full. DB `personalization-plan`: 30 đề/kỹ năng, Part yếu phải xuất hiện trong tuần.

**Xong khi:** người không có thẻ không nhận việc ôn thẻ; đề thuộc Part yếu có trong lộ trình; làm việc thứ Ba vào thứ Hai thì việc đó được đánh dấu xong; không còn việc `targetCount > 1` cho TEST.

### S2 — Hồ sơ năng lực và band (2,5 ngày, 1 migration)

- [ ] **Policy chung.** Tạo `ai-shared/ability-profile.ts`, hàm thuần `buildAbilityProfile(rows, asOf)` theo mục “Luồng nghiệp vụ mới”. Trả về `{ bySkill[{skill, band, status, sampleSize, lastAt}], overall{band, status, missing[], tieBreak}, weak{parts, writingCriteria, speakingCriteria} }`. Gom một hằng `CEFR_LEVELS` dùng chung, xóa 3 bản `BANDS` trong `learner-snapshot.ts`, `report-jobs.service.ts` và `test-attempts/services/student-dashboard.service.ts`.
- [ ] **Truy vấn hồ sơ.** `personalization/services/snapshot.service.ts`: thêm truy vấn không lọc mục tiêu, chỉ có `submitted_at <= end`. Lấy 3 bài full mỗi kỹ năng bằng `row_number() OVER (PARTITION BY component)` và 20 bài có điểm trong 60 ngày. Các truy vấn trong mục tiêu vẫn dùng cho số bài và thống kê tuần.
- [ ] **Snapshot.** `policies/learner-snapshot.ts`: `band` và `weak` lấy từ hồ sơ; thêm `baseline`. Khối `statistics` của tuần/kỳ giữ nguyên để báo cáo nói về tuần đó. `SNAPSHOT_VERSION = 2`.
- [ ] **Migration** `1760000021000-AddGoalBaselineProfile`: `ALTER TABLE learning_goals ADD COLUMN baseline_profile jsonb`. Mục tiêu cũ để NULL. `goals.service.ts` ghi hồ sơ vào cột này trong transaction create/replace.
- [ ] **FINAL.** `report-jobs.service.ts` (`scheduleFinalBatch`): `bandTargetStatus` dùng `overall` của hồ sơ tại cutoff. Thêm `bandChange` (đầu kỳ → cuối kỳ từng kỹ năng). `ai/final.contract.ts` ghi rõ “đầu kỳ”/“hiện tại” để validator chấp nhận hai band đó. Tăng `FINAL_PROMPT_VERSION`.
- [ ] **Nơi khác dùng band.** `test-attempts/services/student-dashboard.service.ts` bỏ quy tắc loại Writing, gọi `buildAbilityProfile`. `chatbot/chatbot.context.ts` đọc band từ hồ sơ để chatbot và Dashboard nói cùng một số.
- [ ] **Giao diện.** `personalization/components/GoalProgressCard.jsx` hiện band theo kỹ năng kèm nhãn “sơ bộ”/“ước lượng” và band chung kèm “thiếu: Writing”. `WeeklyReportPage.jsx` (FINAL) có bảng đầu kỳ → cuối kỳ. Thêm chuỗi vi/en.

**Test:** unit `ability-profile.spec` ≥ 12 ca: 0/1/2/3/5 bài; chỉ 3 bài mới nhất; band chung 4/3/1 kỹ năng; phá hòa G&V lên/xuống; ngoài biên bỏ qua G\&V; loại SIMULATED/UNASSESSED/PENDING\_AI. Cập nhật các ca snapshot đang kỳ vọng `INSUFFICIENT_DATA` lúc mới tạo mục tiêu. DB: tạo mục tiêu khi đã có lịch sử thì tuần 1 có Part yếu và `baseline_profile` được ghi. Migration up/down/up.

**Xong khi:** mục tiêu mới của người có lịch sử có ngay band và Part yếu; A2 → B2 trong kỳ thì FINAL báo B2; Dashboard, chatbot và báo cáo cùng một band.

### S3 — Đánh giá đầu vào (3 ngày, 1 migration)

- [ ] **Migration** `1760000022000-AddPlacementTests`: `ALTER TABLE tests ADD COLUMN is_placement boolean NOT NULL DEFAULT false`, kèm partial index `(component) WHERE is_placement AND status='PUBLISHED'`. Chỉ đề FULL\_SKILL mới được bật, ràng bằng bằng CHECK.
- [ ] **Admin.** API sửa đề của 5 kỹ năng nhận `isPlacement`, có audit. Trang danh sách/sửa đề trong `admin/` có công tắc “Đề đánh giá đầu vào” và cảnh báo khi một kỹ năng bắt buộc chưa có đề đánh giá.
- [ ] **API hồ sơ.** `GET /me/ability-profile` (controller mới trong `personalization/controllers/`) trả về hồ sơ, `placement: { required: [G&V, READING, LISTENING], missing[], complete, tests: [{skill, testId, title, purpose}] }` và `suggestedTargetCefr`. Chỉ đọc.
- [ ] **Tạo mục tiêu.** Response của create/replace thêm `placementComplete`, không từ chối.
- [ ] **Lộ trình tuần 1.** `plan-candidates.service.ts` sinh ứng viên TEST `purpose: 'PLACEMENT'` cho kỹ năng bắt buộc còn thiếu. `rule-plan.ts` xếp mỗi ngày 1 ứng viên như vậy từ ngày 1, reason `PLACEMENT`. Prompt PLAN\_START: bắt buộc giữ các ứng viên PLACEMENT ở đầu tuần; validator kiểm tra.
- [ ] **Giao diện.** Thẻ mới `personalization/components/AbilityAssessmentCard.jsx` đặt đầu `profile/pages/DashboardPage.jsx`, hiện 3 kỹ năng bắt buộc và 2 tùy chọn, nút vào đề. `LearningGoalSettings.jsx` hiện band hiện tại, điền sẵn band gợi ý và cảnh báo khi chưa đánh giá xong. Chuỗi vi/en.

**Test:** DB: người mới có `missing` = 3 kỹ năng; nộp Reading full thì còn 2; đề `is_placement` không vào ứng viên thường; đặt mục tiêu trước thì tuần 1 có việc PLACEMENT ngày 1–3. Browser: thẻ đánh giá hiện/ẩn, form điền band gợi ý, mobile.

**Xong khi:** người mới được dẫn làm 3 bài đánh giá trước khi đặt mục tiêu, hoặc ngay trong tuần 1; người có lịch sử không bị hỏi lại.

### S4 — API chỉ đọc và hiệu năng (2,5 ngày, 1 migration)

- [ ] **Chỉ đồng bộ tuần chưa chốt.**
  - Migration `1760000023000-AddPlanProgressFinalizedAt`: `study_plans.progress_finalized_at timestamptz`.
  - `repositories/plan-progress.repository.ts` (`syncGoal`) chỉ sync plan có `progress_finalized_at IS NULL`. Sau lần sync đầu tiên khi hôm nay > `ends_on` thì ghi cột này.
  - Subquery `topic_ids` chỉ chạy khi plan có việc TOPIC\_REVIEW.
- [ ] **Snapshot cùng connection.** `SnapshotService.build(actor, goal, window, asOf, manager?)`: mọi `this.db.query` đổi sang `(manager ?? this.db.manager).query`. Truyền `manager` từ `plan.service.ts` (`ensureLocked`) và `report-jobs.service.ts`.
- [ ] **Endpoint gộp, chỉ đọc.** `GET /me/personalization/overview` trả về `{ goal, progress, profile, plan, today, comment, recentReports, needsSync }`. Không khóa user, không ghi.
  - `needsSync` = thiếu plan tuần hiện tại, mục tiêu đã qua hạn mà còn ACTIVE, hoặc có kết quả chấm mới chưa có nhận xét.
  - Mục tiêu qua hạn chưa xử lý thì trả `effectiveStatus: 'ENDING'`.
- [ ] **POST đồng bộ.** `POST /me/personalization/sync` (idempotent, khóa user) gom việc ghi đang nằm trong các GET: `reconcile`, `ensureLocked`, xếp COMMENT (chuyển từ `comments.service.ts`). Frontend chỉ gọi khi `needsSync`, rồi tải lại overview.
- [ ] **GET cũ chỉ đọc.** `GET /me/learning-goal`, `/me/study-plan/current`, `/me/insights/comment`: bỏ `lockUser`/`reconcile`, đọc dữ liệu đã có. Hook `afterLearning` (nộp/chấm/ôn thẻ) và worker giữ nguyên vai trò ghi.
- [ ] **Frontend.** `profile/pages/DashboardPage.jsx` gọi overview một lần và truyền props cho `GoalProgressCard`, `StudyPlanCard`, `PersonalCommentCard`, `WeeklyReportsCard`, `AbilityAssessmentCard`. Polling nhận xét gọi overview. Thêm hàm mới trong `services/personalizationApi.js`.
- [ ] *(Tùy quy mô, xem Câu hỏi còn mở)* **Worker theo việc cần làm.** `workers/personalization.worker.ts` chỉ chọn người cần xử lý: thiếu plan tuần, qua hạn, hoặc đã qua giờ nhắc mà `last_reminded_on <> hôm nay`. Thay cho việc quét mọi mục tiêu ACTIVE theo `updated_at`.

**Test:** DB: overview không tạo bản ghi nào (đếm bảng trước/sau); sync gọi 2 lần song song chỉ tạo 1 plan; mục tiêu 180 ngày ở tuần 20 chỉ sync 1–2 plan; tuần đã chốt không đổi sau khi nộp bài mới. Browser: Dashboard chỉ gọi 1 request (cộng sync khi cần), các thẻ hiển thị như cũ.

**Xong khi:** mở Dashboard không còn khóa user; số truy vấn mỗi lần mở không tăng theo số tuần của mục tiêu.

### S5 — Hai lỗi còn mở từ GĐ6 (1 ngày)

- [ ] **Validator hiểu trạng thái.** Schema COMMENT/WEEKLY/FINAL thêm trường bắt buộc `statusEcho` (AHEAD/ON\_TRACK/BEHIND) và `bandClaim` (NONE/CURRENT/TARGET\_REACHED). Validator từ chối khi:
  - `statusEcho` khác `goal.status`;
  - `TARGET_REACHED` mà code nói chưa đạt;
  - có cụm từ trái trạng thái (bảng từ khóa theo từng trạng thái);
  - có “đã đạt \<band đích>” khi `bandTargetStatus` khác REACHED.
  - File: `personalization/ai/comment.contract.ts`, `report.contract.ts`, `final.contract.ts`.
- [ ] **Polling sau khi thử lại.** `comments.service.ts` trả `RETRYING` kèm `nextRetryAt` thay vì `HIDDEN` khi insight FAILED còn lượt. `PersonalCommentCard.jsx` tiếp tục poll khi PENDING/RETRYING với chu kỳ 15 giây → 60 giây, dừng ở FALLBACK/HIDDEN.

**Test:** unit validator với 2 câu mẫu đã lọt trong báo cáo GĐ6 (“Bạn đang vượt tiến độ” khi BEHIND, “Bạn đã đạt B2” khi B2 là band đích). Browser: FAILED → READY hiện nhận xét mà không cần tải lại trang.

**Xong khi:** hai câu mẫu bị từ chối; Dashboard tự hiện nhận xét sau khi worker thử lại thành công.

## Thứ tự triển khai và rủi ro

Bắt đầu từ S1 vì nó sửa lỗi thật và không cần migration. S3 cần hồ sơ của S2; S4 gộp dữ liệu của S2 và S3 vào endpoint overview.

&#91;embedded content: thứ tự triển khai · 5 đợt, khoảng 11 ngày công\]

Tổng khoảng 11 ngày công; S5 có thể chèn vào bất kỳ lúc nào.

**Rủi ro và cách xử lý**

| Rủi ro | Cách xử lý |
| --- | --- |
| Lộ trình tuần đang chạy có việc TEST `targetCount > 1`; sau S1 việc này chỉ khớp đúng đề, nên buộc làm cùng một đề nhiều lần | Script một lần `personalization:replan-current`: dựng lại những ngày chưa có tiến độ của tuần hiện tại, dùng lại logic thay ngày chưa làm của GĐ7 |
| Tăng `SNAPSHOT_VERSION` làm mất cache AI, số lần gọi tăng một đợt trên quota free | Giữ giới hạn 6 lần/người/ngày và RPM; không tạo lại báo cáo đã READY |
| Các ca test snapshot hiện có kỳ vọng band cũ (bỏ Writing, theo mục tiêu) | Cập nhật kỳ vọng trong S2, ghi rõ lý do trong commit |
| Seed dùng chung nội dung giữa Full Test, Full Practice và Part, nên đề đánh giá có thể trùng bài luyện | Chọn một bộ chủ đề làm đề đánh giá và đánh dấu cả bản Practice/Part cùng nội dung là `is_placement` (xem Câu hỏi còn mở) |
| Hai migration trùng số `1760000019000` | Không đổi tên vì DB local đã chạy cả hai; migration mới bắt đầu từ `1760000021000`, ghi chú trong `backend/README.md` |
| GET không còn đối soát, nên số liệu có thể trễ tới 60 giây nếu hook sau nộp bài lỗi | `needsSync` + POST sync khi mở Dashboard; worker vẫn đối soát mỗi 60 giây |

## Câu hỏi còn mở

Các câu này chỉ đổi tham số hoặc độ ưu tiên, không đổi cấu trúc plan. Chưa trả lời thì dùng mặc định.

- [ ] **Quy mô demo** gồm hai con số đo hai điều khác nhau:
  - (a) số người có mục tiêu ACTIVE cùng lúc: quyết định tải của worker (hiện 50 người/phút) và độ trễ nhắc nhở;
  - (b) số người mở Dashboard hoặc nộp bài cùng một lúc: quyết định khóa user và pool kết nối DB.
  - Mặc định: (a) dưới 200, (b) dưới 20, nên bỏ mục “Worker theo việc cần làm” của S4.
- [ ] **Bộ đề đánh giá đầu vào:** dùng bộ chủ đề nào trong 5 bộ seed (Photography, Cooking, Walking, Books, Music), hay soạn mới? Mặc định: Music, kèm đánh dấu cả bản Practice/Part cùng nội dung.
- [ ] **Tham số hồ sơ:** vùng biên G&V ± 0,15; điểm yếu lấy 20 bài trong 60 ngày; nhịp tối đa 3 bài/ngày. Giữ hay đổi?
