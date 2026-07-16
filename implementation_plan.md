# Kịch bản Chi Tiết: Frontend Module Reading - Hệ Thống Luyện Thi APTIS

## Tổng Quan

Module **Reading** là một trong những module cốt lõi của hệ thống luyện thi APTIS. Module này gồm toàn bộ luồng từ trang giới thiệu → chọn đề → làm bài **(4 Part)** → nộp bài → xem kết quả → ôn luyện từ vựng.

**Tech stack:** React + Tailwind CSS | **AI:** Google Gemini API | **API data:** Mock data (phát triển trước) | **Phạm vi:** Toàn bộ module Reading

---

## Cấu Trúc Thư Mục

```
src/features/module-reading/
├── pages/
│   ├── ReadingOverviewPage.jsx        # Trang tổng quan Reading
│   ├── ReadingIntroPage.jsx           # Giới thiệu bài thi
│   ├── ReadingChooseTestPage.jsx      # Chọn đề thi
│   ├── ReadingTestPage.jsx            # Wrapper trang làm bài
│   └── ReadingResultPage.jsx          # Trang kết quả
│
├── components/
│   ├── overview/
│   │   ├── ReadingHeroSection.jsx     # Banner intro + mô tả Reading
│   │   ├── ReadingBlogSection.jsx     # Bài viết hướng dẫn
│   │   └── ReadingPopularSection.jsx  # Đề phổ biến
│   │
│   ├── test-selection/
│   │   ├── TestFilterBar.jsx          # Lọc: Dễ / Full / Level
│   │   ├── TestCard.jsx               # Card một đề thi
│   │   └── TestCardGrid.jsx           # Grid các đề thi
│   │
│   ├── test-intro/
│   │   ├── TestInfoCard.jsx           # Thông tin bài thi (thời gian, số câu)
│   │   └── TestInstructionModal.jsx   # Modal hướng dẫn chung
│   │
│   ├── test-engine/
│   │   ├── TestHeader.jsx             # Header khi làm bài (timer, tiến độ)
│   │   ├── PartNavigator.jsx          # Chuyển Part 1→2→3→4
│   │   ├── QuestionNavigator.jsx      # Điều hướng câu hỏi trong 1 Part
│   │   │
│   │   ├── parts/
│   │   │   ├── Part1GapFilling.jsx    # Part 1: Điền từ vào chỗ trống
│   │   │   ├── Part2TextCohesion.jsx  # Part 2: Sắp xếp câu/đoạn
│   │   │   ├── Part3OpinionMatch.jsx  # Part 3: Nối ý kiến với người
│   │   │   └── Part4MatchHeading.jsx  # Part 4: Nối tiêu đề đoạn văn
│   │   │
│   │   ├── SubmitModal.jsx            # Modal xác nhận nộp bài
│   │   └── ExitModal.jsx              # Modal xác nhận thoát
│   │
│   ├── result/
│   │   ├── ScoreCircle.jsx            # Vòng tròn điểm (SVG animated)
│   │   ├── PartScoreTable.jsx         # Bảng điểm từng Part
│   │   ├── FeedbackSection.jsx        # Nhận xét + gợi ý AI
│   │   └── SkillRadarChart.jsx        # Biểu đồ kỹ năng (Recharts)
│   │
│   ├── review/
│   │   ├── ReviewQuestion.jsx         # Xem lại từng câu + đáp án đúng/sai
│   │   └── ExplanationPanel.jsx       # Giải thích đáp án (AI)
│   │
│   ├── vocabulary/
│   │   ├── FlashcardComponent.jsx     # Thẻ flashcard flip animation
│   │   ├── VocabNotebook.jsx          # Sổ tay từ vựng
│   │   └── DictationExercise.jsx      # Bài tập nghe chép
│   │
│   └── ai/
│       ├── AIHintButton.jsx           # Nút gợi ý AI trong khi làm bài
│       └── AIChatPanel.jsx            # Chatbot AI hỗ trợ
│
├── hooks/
│   ├── useReadingTest.js              # Logic chính: state bài thi
│   ├── useTimer.js                    # Countdown timer
│   ├── useTestNavigation.js           # Điều hướng Part/Question
│   └── useAIHint.js                   # Gọi AI API
│
├── context/
│   └── ReadingTestContext.jsx         # Context chia sẻ state toàn bài thi
│
├── services/
│   ├── readingApi.js                  # Gọi API thật (sau mock)
│   └── mockData/
│       ├── testList.json              # Danh sách đề thi
│       ├── part1Data.json             # Dữ liệu Part 1
│       ├── part2Data.json             # Dữ liệu Part 2
│       ├── part3Data.json             # Dữ liệu Part 3
│       └── part4Data.json             # Dữ liệu Part 4
│
└── utils/
    ├── scoreCalculator.js             # Tính điểm APTIS
    └── readingConstants.js            # Hằng số (thời gian, số câu...)
```

---

## Luồng Màn Hình (User Flow)

```
Reading Overview Page
        │
        ▼
Reading Test Introduction  ←──── Chọn từ trang chọn đề
        │
        ▼
Reading Choose Test Page
    ├── Tab: Dễ lẻ  → Chọn đề → Reading Intro → Bắt đầu làm
    └── Tab: Full Test → Chọn đề → Reading Intro → Bắt đầu làm
        │
        ▼
Reading Test Engine (Part 1 → 2 → 3 → 4)  [tự do chuyển Part]
    ├── Part 1: Gap Filling
    ├── Part 2: Text Cohesion  (⭐ Drag & Drop)
    ├── Part 3: Opinion Matching
    └── Part 4: Matching Headings
        │
        ├── [Submit Modal] → Xác nhận nộp
        └── [Exit Modal]   → Xác nhận thoát
        │
        ▼
Reading Result Page
    ├── Score Circle (Level B2/C1 + Điểm số + Thời gian làm)
    ├── Bảng điểm 4 Part
    ├── AI Feedback Google Gemini (nhận xét + lộ trình)
    ├── Statistics Circles (4 kỹ năng)
    ├── [Xem chi tiết] → Review Feedback Page
    └── [Làm lại]      → Làm lại đề thi đó
        │
        ▼
Review Feedback Page (từng Part)
    ├── Đáp án user: xanh (đúng) / đỏ (sai)
    ├── Đáp án đúng luôn hiển thị
    └── AI giải thích từng câu (collapsible)
        │
        ▼
Vocabulary / Flashcard Page
    ├── Flashcard (lật thẻ 3D)
    ├── Vocab Notebook (bảng từ + Word Writing sidebar)
    └── Dictation (nghe + điền)
```

---

## Chi Tiết Từng Màn Hình

### 1. 📖 Reading Overview Page (`/reading`)

**Mục đích:** Giới thiệu module Reading, blog hướng dẫn, đề phổ biến

**Nội dung:**
- Hero banner: Tiêu đề "READING OVERVIEW", mô tả kỹ năng Reading trong APTIS
- Sidebar phải: Danh sách bài viết "Reading Basics", liên kết nhanh
- Section "Most Popular": 3 card đề thi nổi bật
- Nút CTA: "Bắt đầu luyện tập" → `/reading/choose`

**State:** Không có state phức tạp, dữ liệu tĩnh + fetch blog/đề phổ biến

---

### 2. 📋 Reading Test Introduction (`/reading/intro/:testId`)

**Mục đích:** Hiển thị thông tin bài thi trước khi bắt đầu

**Nội dung:**
- Card thông tin: Tên bài thi, thời gian (35 phút), số Part (4), số câu (36)
- Hướng dẫn chung từng Part (dạng accordion hoặc list)
- Nút: **"Bắt đầu thi"** → chuyển sang test engine
- Nút: **"Quay lại"** → trở về danh sách đề

**State:** `testId` từ URL params, fetch thông tin đề thi

---

### 3. 🗂️ Reading Choose Test Page (`/reading/choose`)

**Mục đích:** Chọn đề thi muốn làm

**Nội dung:**
- Filter bar: [Tất cả] [Dễ lẻ] [Full Test] + dropdown Level (A1-C)
- Search box: Tìm kiếm đề theo tên
- Grid (3 cột): TestCard bao gồm:
  - Thumbnail ảnh đề thi (chủ đề)
  - Tên đề thi, Level badge (màu sắc theo cấp độ)
  - Thời gian | Số câu
  - Số lượt làm, đánh giá sao
  - Nút **"Làm bài"** (nếu chưa làm) hoặc **"Làm lại"** (nếu đã làm)
  - Badge **"Đã làm"** với điểm cũ
- Pagination

**State:** `filter` (type, level), `searchQuery`, `currentPage`

---

### 4. 🖊️ Reading Test Engine (`/reading/test/:testId`)

Đây là phần phức tạp nhất. Toàn bộ 4 Part chạy trong cùng 1 route, điều hướng nội bộ.

#### Header chung (TestHeader):
- Logo nhỏ + Tên bài thi
- **Countdown timer** (35:00 → 0:00, màu đỏ khi < 5 phút)
- Tiến độ: "Câu X/Y | Part Z/4"
- Nút **Highlight** (bôi vàng text đoạn văn)
- Nút **Nộp bài** (mở SubmitModal)

#### Part Navigator:
- Tabs: [Part 1] [Part 2] [Part 3] [Part 4]
- Badge số câu đã trả lời / tổng số câu mỗi Part
- **User tự do click chuyển sang bất kỳ Part nào** (không bị lock)
- State câu trả lời được giữ nguyên khi chuyển qua lại

---

#### Part 1 – Gap Filling (Điền từ vào chỗ trống)

**Cấu trúc APTIS Part 1:**
- 20 câu điền từ (chọn 1 trong 3-4 đáp án dropdown hoặc điền tự do)
- Hiển thị theo nhóm nhỏ (mỗi lần 5 câu) với pagination
- Layout: Đoạn văn ngắn có chỗ trống `[___]`, bên dưới là các lựa chọn

**Component:** `Part1GapFilling`
```
- Đoạn văn với các `<select>` inline cho chỗ trống
- Dưới mỗi câu: lựa chọn A/B/C/D
- Pagination: [1] [2] [3] [4]
- Nút "Next" → chuyển trang câu hỏi trong Part 1
```

---

#### Part 2 – Text Cohesion (Sắp xếp đoạn văn)

**Cấu trúc APTIS Part 2:**
- Cho 5-6 câu/đoạn văn bị xáo trộn, kéo thả để sắp xếp đúng thứ tự
- Hoặc chọn vị trí (câu A đứng trước câu nào?)

**Component:** `Part2TextCohesion`
```
- Layout 2 cột:
  - Trái: Đoạn văn gốc có chỗ trống đánh số [1], [2]...
  - Phải: List câu/đoạn (⭐ draggable items) để kéo thả vào chỗ trống
- Thư viện: @dnd-kit/core + @dnd-kit/sortable
- Drop zone: highlight khi đang kéo qua
- Visual feedback: item đang kéo hiển thị bỉnh hơn + shadow
- Pagination nếu có nhiều câu
- Nút Reset (đặt lại tất cả về ban đầu)
```

---

#### Part 3 – Opinion Matching (Nối ý kiến)

**Cấu trúc APTIS Part 3:**
- Đoạn văn dài với nhiều người phát biểu (A, B, C, D, E)
- Bên dưới: List phát biểu/ý kiến → chọn ai đã nói điều đó

**Component:** `Part3OpinionMatch`
```
- Layout 2 cột:
  - Trái: Passage dài có thể scroll, highlight tên người
  - Phải: Câu hỏi dạng dropdown hoặc radio chọn tên (A/B/C/D/E)
- Nút highlight: bôi màu đoạn văn liên quan
```

---

#### Part 4 – Matching Headings (Nối tiêu đề)

**Cấu trúc APTIS Part 4:**
- Đoạn văn dài chia nhiều đoạn nhỏ (paragraph A, B, C...)
- List tiêu đề → kéo thả hoặc dropdown chọn tiêu đề cho từng đoạn

**Component:** `Part4MatchHeading`
```
- Trên: Box chứa các tiêu đề (draggable items) — dùng @dnd-kit
- Dưới: Các đoạn văn với drop zone cho tiêu đề
- Khi đã gán: Tiêu đề hiển thị trên đoạn, xoá khỏi pool tiêu đề
- Cho phép kéo tiêu đề ra khỏi đoạn để đổi
```

---

#### Submit Modal

```
Bạn có chắc chắn muốn nộp bài không?
- Số câu đã trả lời: X/36
- Số câu còn bỏ trống: Y
[Hủy]  [Nộp bài]
```

#### Exit Modal

```
Bạn có chắc chắn muốn thoát không?
⚠️ Bài làm của bạn sẽ KHÔNG được lưu.
Bạn sẽ mất toàn bộ tiến độ hiện tại.
[Ở lại]  [Thoát]
```

---

### 5. 📊 Reading Result Page (`/reading/result/:sessionId`)

**Mục đích:** Hiển thị kết quả sau khi nộp bài

**Nội dung:**

#### Score Header Section
- **Score Circle (SVG Animated):** Vòng tròn lớn trung tâm hiển thị:
  - Level APTIS (B1 / B2 / C1 / C2) nổi bật
  - Số điểm thực tế (VD: X/54)
  - **Thời gian đã làm** (VD: 00:21:13) — góc trên phải
- **3 thống kê nhanh bên phải:** Số câu Đúng | Số câu Sai | Bỏ trống

#### Bảng điểm theo 4 Part

| | Part 1 | Part 2 | Part 3 | Part 4 |
|---|---|---|---|---|
| Kỹ năng | Grammar | Text Cohesion | Opinion Matching | Matching Headings |
| Đúng | X | X | X | X |
| Sai | X | X | X | X |
| Điểm | X | X | X | X |

#### AI Feedback Section
- Text block nhận xét tổng quan từ AI (paragraph)
- Highlight điểm mạnh (xanh) và điểm yếu (đỏ/cam)
- Gợi ý lộ trình học cụ thể

#### Statistics Circles (4 kỹ năng)
- 4 vòng tròn nhỏ animated bên dưới:
  - **Grammar** (Part 1)
  - **Text Cohesion** (Part 2)
  - **Opinion Matching** (Part 3)
  - **Matching Headings** (Part 4)
- Mỗi vòng hiển thị % và tên kỹ năng
- Score level được quy đổi từ bảng quy đổi của backend

#### Action Buttons
- **[Làm lại]** → Làm lại đề thi này
- **[Xem chi tiết]** → `/reading/review/:sessionId`
- **[Ôn từ vựng]** → `/reading/vocab`
- **[Làm bài khác]** → `/reading/choose`

---

### 6. 🔍 Review Feedback Page (`/reading/review/:sessionId`)

**Mục đích:** Xem lại từng câu đã làm, so sánh đáp án

**Nội dung:**

#### Layout chung (giống Test Engine nhưng read-only)
- **TestHeader** vẫn hiển thị (tên bài thi, không có timer)
- **Part Navigator** để chuyển qua lại các Part
- **Question pagination** trong từng Part

#### Chi tiết hiển thị từng câu (Part 1 - Gap Filling làm ví dụ)
```
Câu 1/5 - Passage hiển thị bình thường

Chỗ trống [___] → Dropdown bị lock (read-only)

Đáp án của bạn:  [Option B]   🔴 Sai
Đáp án đúng:     [Option A]   ✅ Đúng  (luôn hiển thị, màu xanh)

💡 Giải thích (AI): "Option A đúng vì..."
    [Thu gọn ▲]
```

#### Color Coding (quan trọng - thấy rõ trong Figma)
- **Đúng:** Nền xanh lá nhạt + border xanh + ✅ icon
- **Sai:** Nền đỏ nhạt + border đỏ + ❌ icon
- **Bỏ trống:** Nền xám + "Chưa trả lời"
- **Đáp án đúng:** Luôn có badge xanh "Đáp án đúng" kể cả khi user chọn đúng

#### Filter Bar (trên cùng)
- [Tất cả] [✅ Đúng (X)] [❌ Sai (X)] [— Bỏ trống (X)]

---

### 7. 🃏 Flashcard / Vocabulary (`/reading/vocab`)

**Mục đích:** Ôn luyện từ vựng từ bài thi

#### 7a. Flashcard Mode
- **Thẻ lật 3D** (CSS `transform: rotateY(180deg)`):
  - **Mặt trước (hồng/cam):** Từ tiếng Anh to + phiên âm `/beʊt/` + loại từ `(noun)`
  - **Mặt sau:** Nghĩa tiếng Việt + câu ví dụ
  - Click vào thẻ để lật
- **Điều hướng:**
  - `[← Trước]` `[Sau →]` hoặc swipe trên mobile
  - Progress bar: "3/20 thẻ"
- **Self-rating buttons** (theo Figma):
  - Thanh màu đỏ → cam → vàng → xanh (mức độ nhớ)
  - Lưu vào localStorage để theo dõi tiến độ
- **Số thẻ còn lại** hiển thị góc trên

#### 7b. Vocabulary Notebook (`/reading/vocab/notebook`)
- **Header:** "My Vocabulary Notebook" + Nút [+ Thêm từ]
- **Bảng từ vựng** (theo Figma):

| Từ | Phiên âm | Nghĩa | Loại từ | Nguồn bài thi | Ngày lưu | Thao tác |
|---|---|---|---|---|---|---|
| boat | /beʊt/ | thuyền; con thuyền | noun | APTIS-R-001 | 14/07/2026 | ✏️ 🗑️ |

- **Sidebar phải — Word Writing Area:**
  - Ô text lớn để user **gõ lại từ** đang học (thực hành viết)
  - Hiển thị từ đang chọn bên bảng là gợi ý
  - Nút **[Kiểm tra]**: So sánh với đáp án đúng, highlight được/sai
  - Đếm số lần luyện viết
- **Filter:** Tất cả | Chưa thuộc | Đã thuộc | Theo bài thi
- **Search:** Tìm kiếm theo từ hoặc nghĩa
- **Pagination:** Phân trang 10-20 từ/trang
- **Export:** Xuất ra CSV / Anki deck (optional)

#### 7c. Dictation Exercise (`/reading/vocab/dictation`)
- **Audio Player tùy chỉnh:**
  - Play / Pause button (nổi bật)
  - Thanh timeline có thể kéo
  - Điều chỉnh tốc độ: 0.5x | 0.75x | 1x | 1.25x
  - Replay đoạn (lặp lại 5 giây cuối)
- **Input area:** Ô text điền từ nghe được
- **Check button:** So sánh kết quả, highlight đúng/sai từng từ
- **Script toggle:** Ẩn/hiện transcript sau khi kiểm tra

---

## Tính Năng AI Tích Hợp (Google Gemini)

> [!NOTE]
> Tất cả tính năng AI đều dùng **Google Gemini API**. Thiết kế `useGeminiAI` hook với các prompt template riêng cho từng chức năng.

| Vị trí | Tính năng | Gemini Prompt Input | Output |
|--------|-----------|---------------------|--------|
| Làm bài | **Hint Button** | Câu hỏi + đoạn văn | Gợi ý hướng (không reveal đáp án) |
| Làm bài | **AI Chat Panel** | Lịch sử chat + context bài | Trả lời câu hỏi user |
| Kết quả | **AI Feedback** | Toàn bộ kết quả 4 Part | Đoạn nhận xét + lộ trình |
| Review | **Giải thích** | Câu hỏi + đáp án + đáp án user | Giải thích tại sao đúng/sai |
| Vocab | **AI Example** | Từ vựng | 2-3 câu ví dụ tự nhiên |

---

## Kế Hoạch Mock Data

```json
// testList.json - Danh sách đề thi
{
  "tests": [
    {
      "id": "apt-r-001",
      "title": "APTIS Reading - Environment",
      "type": "full",
      "level": "B2",
      "duration": 35,
      "totalQuestions": 36,
      "thumbnail": "/images/reading/environment.jpg",
      "attempts": 1234,
      "rating": 4.5
    }
  ]
}

// Cấu trúc dữ liệu từng Part:
// Part 1 — Gap Filling:
// { questions: [{id, passage, blanks:[{pos, options, answer}]}] }
//
// Part 2 — Text Cohesion (Drag & Drop):
// { passage_with_gaps: "...[1]...[2]...", sentences: [{id, content, correct_position}] }
//
// Part 3 — Opinion Matching:
// { passage, speakers: ["A","B","C","D","E"], questions: [{id, statement, answer}] }
//
// Part 4 — Matching Headings (Drag & Drop):
// { paragraphs: [{id, label, content}], headings: [{id, text, correct_paragraph}] }

// sessionResult.json - Kết quả sau khi nộp bài
{
  "sessionId": "sess-001",
  "testId": "apt-r-001",
  "duration": "00:21:13",
  "level": "B2",
  "totalScore": 42,
  "maxScore": 54,
  "parts": [
    { "part": 1, "skill": "Grammar",           "correct": 8, "wrong": 2, "blank": 0, "score": 8 },
    { "part": 2, "skill": "Text Cohesion",      "correct": 7, "wrong": 3, "blank": 0, "score": 7 },
    { "part": 3, "skill": "Opinion Matching",   "correct": 9, "wrong": 1, "blank": 0, "score": 9 },
    { "part": 4, "skill": "Matching Headings",  "correct": 6, "wrong": 4, "blank": 0, "score": 6 }
  ],
  "aiFeedback": "Bạn thể hiện tốt ở kỹ năng Opinion Matching...",
  "answers": [
    { "questionId": "p1-q1", "userAnswer": "B", "correctAnswer": "A", "isCorrect": false }
  ]
}

// vocab.json - Từ vựng notebook
{
  "words": [
    {
      "id": "v-001",
      "word": "boat",
      "pronunciation": "/beʊt/",
      "meaning": "thuyền; con thuyền",
      "type": "noun",
      "sourceTest": "APTIS-R-001",
      "dateAdded": "2026-07-14",
      "memoryLevel": 2
    }
  ]
}
```

---

## Thứ Tự Xây Dựng (Sprint Plan)

### Sprint 1 – Nền Tảng (2-3 ngày)
- [ ] Setup thư mục, routes, `ReadingTestContext`
- [ ] Mock data đầy đủ cho **4 Part** + `sessionResult.json` + `vocab.json`
- [ ] `useTimer`, `useTestNavigation` (hỗ trợ tự do chuyển Part), `useReadingTest` hooks
- [ ] `useGeminiAI` hook (Google Gemini API client + prompt templates)
- [ ] `scoreCalculator.js` (nhận bảng quy đổi từ backend)
- [ ] TestHeader component (timer + progress)

### Sprint 2 – Trang Chọn & Giới Thiệu (1-2 ngày)
- [ ] ReadingOverviewPage
- [ ] ReadingChooseTestPage + TestCard + Filter
- [ ] ReadingIntroPage

### Sprint 3 – Test Engine (4-5 ngày) ← Phần quan trọng nhất
- [ ] `Part1GapFilling` (inline `<select>` dropdown)
- [ ] `Part2TextCohesion` (**@dnd-kit/core + @dnd-kit/sortable**)
- [ ] `Part3OpinionMatch` (scroll passage 2 cột + radio)
- [ ] `Part4MatchHeading` (@dnd-kit drag tiêu đề vào đoạn văn)
- [ ] `SubmitModal` (hiển số câu chưa trả lời)
- [ ] `ExitModal` (⚠️ cảnh báo mất dữ liệu)
- [ ] `AIHintButton` (gọi Gemini, hiển popover)

### Sprint 4 – Kết Quả & Review (2-3 ngày)
- [ ] ReadingResultPage:
  - [ ] Animated Score Circle (SVG) + Level + Thời gian
  - [ ] Bảng điểm 5 Part
  - [ ] Statistics Circles (4 kỹ năng animated)
  - [ ] AI Feedback block
- [ ] ReviewFeedbackPage:
  - [ ] Color-coded answers (xanh/đỏ/xám)
  - [ ] ExplanationPanel (AI giải thích)
  - [ ] Filter bar (Tất cả/Đúng/Sai/Bỏ trống)

### Sprint 5 – Từ Vựng & AI (2-3 ngày)
- [ ] `FlashcardComponent` (CSS 3D flip + self-rating bar)
- [ ] `VocabNotebook` (bảng + **Word Writing sidebar** có kiểm tra)
- [ ] `DictationExercise` (custom audio player)
- [ ] `AIChatPanel` (sidebar chat — Gemini)
- [ ] Hoàn thiện **Gemini prompt** cho từng tính năng

### Sprint 6 – Polish (1-2 ngày)
- [ ] Responsive (mobile/tablet)
- [ ] Animation & micro-interactions
- [ ] Loading skeleton states
- [ ] Error boundaries
- [ ] Code review + cleanup

---

## 📦 Thư Viện Cần Cài

```bash
# Drag & Drop (Part 2 + Part 4)
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Biểu đồ kỹ năng (Result page)
npm install recharts

# Google Gemini AI
npm install @google/generative-ai
```
