# GĐ10 — Rà soát đề xuất nhãn Grammar & Vocab

> Cập nhật sau khi người dùng chốt luồng hàng loạt ngày 21/10/2026: đã bổ sung 15 mã trong bảng dưới vào danh mục bằng migration `1760000020000-ExpandGrammarTopics`. 74 câu trước đây thiếu mã nay đã có mã phù hợp để đề xuất; 3 câu tạm giữ vẫn cần admin xem lại. Các bảng dưới giữ nguyên kết quả rà soát ban đầu, chưa phải quyết định duyệt nhãn. Đã xếp thêm 35 đề vào queue local; không tự duyệt.

Ngày 21/10/2026. Đọc dữ liệu local, không cập nhật câu hỏi hoặc nhãn. Đây là đề xuất rà soát của trợ lý để admin kiểm tra; chưa phải nhãn APPROVED và chưa so sánh với output của worker AI thật.

Có 275 câu thuộc đề xuất bản, gộp thành 151 nhóm theo nội dung + đáp án. Đã đọc câu, đáp án và ngân hàng đáp án đúng set cho phần Vocab. Các bản trùng được liệt kê riêng bằng ID ở cuối file; vẫn cần xác nhận đúng đề/phiên bản trên UI khi duyệt.

- 198 câu có đề xuất dùng mã hiện tại và không bị tạm giữ.
- 74 câu cần bổ sung mã chủ đề để gắn đúng trọng tâm.
- 3 câu tạm giữ để admin xem lại nội dung/đáp án.
- Mốc nghiệm thu vẫn là ít nhất 220/275 câu được admin duyệt trên database. Không tính các đề xuất trong file này vào tỷ lệ.

## Bổ sung danh mục trước khi gợi ý hàng loạt

Các mã dưới đây mới là đề xuất, chưa được tạo trong database. Admin có thể thêm qua /admin/learning-topics (GRAMMAR_VOCAB, KNOWLEDGE). Không ép các câu thiếu chủ đề vào thì hiện tại hoặc word-meaning để đạt tỷ lệ. Mã articles hiện có tên Articles and determiners nên dùng được cho much/little/neither.

| Mã đề xuất | Số câu đang chờ mã |
|---|---:|
| question-tags | 5 |
| past-perfect | 4 |
| indirect-questions | 6 |
| verb-patterns | 18 |
| past-continuous | 5 |
| conjunctions | 5 |
| relative-clauses | 6 |
| adjectives-adverbs | 9 |
| subject-verb-agreement | 7 |
| participle-clauses | 2 |
| pronouns | 1 |
| subjunctive | 1 |
| unreal-past | 2 |
| inversion | 2 |
| causative | 1 |

## Đề xuất theo câu

Số thứ tự là nhóm rà soát, không phải vị trí câu trong đề. “Có mã” chỉ nghĩa là danh mục hỗ trợ nhãn đề xuất; admin vẫn là người quyết định duyệt.

| Nhóm | Nội dung | Đáp án đang lưu | Số bản | Nhãn chính đề xuất | Nhận xét |
|---:|---|---|---:|---|---|
| 1 | A. Can you come to my party tonight? B. Sorry, I can't. I ______ dinner with my parents. | am having | 2 | present-continuous | Có mã: Hiện tại tiếp diễn cho kế hoạch đã sắp xếp. |
| 2 | A. Could you help me, please? B. Sorry, as I don't know much about computers, there is ______ I can do. | little | 2 | articles | Có mã: Lượng từ little + danh từ không đếm được (ngầm hiểu). |
| 3 | A. I've got you a special gift for your birthday. B. Oh, you shouldn't ______! | have | 2 | modals | Có mã: Nhãn theo cấu trúc được hỏi. |
| 4 | A. My car has broken down. B. Haven't you ______ taken it to the mechanics this week? | already | 2 | present-perfect | Có mã: Already dùng với hiện tại hoàn thành. |
| 5 | A. That film we saw yesterday was hilarious, ______? B. Yes, it was really funny! | wasn't it | 2 | question-tags | Cần thêm mã: Nhãn theo cấu trúc được hỏi. |
| 6 | By the time we arrived, the train ___ left. | had | 3 | past-perfect | Cần thêm mã: Quá khứ hoàn thành: sự việc trước một mốc quá khứ. |
| 7 | Could you tell me where the station ___? | is | 3 | indirect-questions | Cần thêm mã: Câu hỏi gián tiếp; không nên gắn present-simple chỉ vì có is. |
| 8 | Did you hear that? I can't stand people ______ about politics at parties. | talking | 2 | verb-patterns | Cần thêm mã: Cannot stand + V-ing. |
| 9 | I ______ in the park, when suddenly it started to rain. | was walking | 2 | past-continuous | Cần thêm mã: Quá khứ tiếp diễn bị một sự việc xen vào. |
| 10 | In the end, we are not going to the restaurant ______ we decided to eat in. | as | 2 | conjunctions | Cần thêm mã: As nối nguyên nhân. |
| 11 | I play ______ piano in a jazz bar. | the | 2 | articles | Có mã: Nhãn theo cấu trúc được hỏi. |
| 12 | I remember ______ the restaurant; I just don't remember what time it was. | leaving | 2 | verb-patterns | Cần thêm mã: Remember + V-ing: nhớ đã làm. |
| 13 | I was born in Birmingham ______ is about 120 miles from London. | which | 2 | relative-clauses | Cần thêm mã: Mệnh đề quan hệ; nên bổ sung dấu phẩy sau Birmingham. |
| 14 | People ______ drop litter on the street, as it's bad for the environment. | shouldn't | 2 | modals | Có mã: Nhãn theo cấu trúc được hỏi. |
| 15 | She offered to help me ______ my presentation. | finish | 2 | verb-patterns | Cần thêm mã: Help + tân ngữ + động từ nguyên mẫu. |
| 16 | Sorry, I don't know ______ you're supposed to do in that situation. | what | 2 | indirect-questions | Cần thêm mã: Mệnh đề danh từ/câu hỏi gián tiếp với what. |
| 17 | That ______ be a rabbit! It's got a long tail. | can't | 2 | modals | Có mã: Nhãn theo cấu trúc được hỏi. |
| 18 | They have ______ to France on holiday. They'll be back next week. | gone | 2 | present-perfect | Có mã: Nhãn theo cấu trúc được hỏi. |
| 19 | We can both make dinner, but ______ of us knows what to cook. | neither | 2 | articles | Có mã: Nhãn theo cấu trúc được hỏi. |
| 20 | Well, that was one of the most ______ films I've ever watched. | interesting | 2 | adjectives-adverbs | Cần thêm mã: Phân biệt tính từ -ing/-ed, không phải bài kiểm tra thì. |
| 21 | Would you mind ______ the door, please? | closing | 2 | verb-patterns | Cần thêm mã: Would you mind + V-ing. |
| 22 | You should see my puppy. She's so cute that now I can't imagine life ______ her. | without | 2 | prepositions | Có mã: Nhãn theo cấu trúc được hỏi. |
| 23 | He enjoys ___ in the river. | swimming | 3 | verb-patterns | Cần thêm mã: Enjoy + V-ing. |
| 24 | How ___ water do you drink each day? | much | 3 | articles | Có mã: Lượng từ much với water. |
| 25 | If I ___ more time, I would travel. | had | 2 | conditionals | Có mã: Nhãn theo cấu trúc được hỏi. |
| 26 | If it ______ for the bad weather, we could go out for a walk. | weren't | 2 | conditionals | Có mã: Nhãn theo cấu trúc được hỏi. |
| 27 | If it rains tomorrow, we ___ at home. | will stay | 3 | conditionals | Có mã: Nhãn theo cấu trúc được hỏi. |
| 28 | If Mike ______ to work today, we'll postpone the meeting. | doesn't come | 2 | conditionals | Có mã: Nhãn theo cấu trúc được hỏi. |
| 29 | I have lived here ___ 2020. | since | 3 | prepositions | Có mã: Since + mốc thời gian; có thể thêm present-perfect làm nhãn phụ. |
| 30 | I was tired, ___ I went to bed early. | so | 3 | conjunctions | Cần thêm mã: So nối kết quả. |
| 31 | I wish I ___ speak French fluently. | could | 3 | modals | Có mã: Could diễn đạt khả năng trong câu ước; có thể thêm unreal-past sau khi tạo mã. |
| 32 | I would travel more if I ___ more money. | had | 3 | conditionals | Có mã: Nhãn theo cấu trúc được hỏi. |
| 33 | My sister is good ___ mathematics. | at | 3 | prepositions | Có mã: Nhãn theo cấu trúc được hỏi. |
| 34 | Neither of the answers ___ correct. | is | 3 | subject-verb-agreement | Cần thêm mã: Hòa hợp chủ-vị với neither. |
| 35 | Although ________ thoroughly, the machine still made an unusual noise. | inspected | 1 | participle-clauses | Cần thêm mã: Mệnh đề phân từ bị động rút gọn; có thể thêm passive-voice. |
| 36 | By the time we arrive at the auditorium, the ceremony ________. | will have started | 1 | future-forms | Có mã: Tương lai hoàn thành thuộc future-forms. |
| 37 | Could you please tell me where ________? | the conference room is | 1 | indirect-questions | Cần thêm mã: Nhãn theo cấu trúc được hỏi. |
| 38 | Having ________ his degree, David immediately applied for international internships. | completed | 1 | participle-clauses | Cần thêm mã: Having + V3 trong mệnh đề phân từ hoàn thành. |
| 39 | He hasn’t visited his hometown ________ more than five years. | for | 1 | prepositions | TẠM GIỮ: Đáp án lưu for hợp lệ; in cũng có thể tự nhiên trong câu phủ định này. Admin cần kiểm tra tính đơn nghĩa. |
| 40 | He spoke so quietly that ________ heard what he said. | hardly anyone | 1 | pronouns | Cần thêm mã: Đại từ bất định hardly anyone. |
| 41 | If I ________ your phone number earlier, I would have called you. | had had | 1 | conditionals | Có mã: Nhãn theo cấu trúc được hỏi. |
| 42 | If you ________ any further questions, please contact customer support. | should have | 1 | conditionals | Có mã: Nhãn theo cấu trúc được hỏi. |
| 43 | It is essential that every applicant ________ the form accurately. | complete | 1 | subjunctive | Cần thêm mã: Thức giả định sau essential that. |
| 44 | I wish I ________ more time to travel when I was younger. | had had | 1 | unreal-past | Cần thêm mã: Wish + quá khứ hoàn thành cho tiếc nuối. |
| 45 | Please speak ___; I cannot hear you. | more loudly | 3 | adjectives-adverbs | Cần thêm mã: Trạng từ và dạng so sánh. |
| 46 | Mark admitted ________ a mistake in the monthly revenue calculations. | making | 1 | verb-patterns | Cần thêm mã: Nhãn theo cấu trúc được hỏi. |
| 47 | Neither John nor his colleagues ________ satisfied with the final outcome. | are | 1 | subject-verb-agreement | Cần thêm mã: Hòa hợp với danh từ gần động từ trong neither...nor. |
| 48 | Not only ________ the championship, but they also set a new world record. | did they win | 1 | inversion | Cần thêm mã: Đảo ngữ sau Not only. |
| 49 | Rarely ________ such an inspiring presentation in my whole career. | have I heard | 1 | inversion | Cần thêm mã: Đảo ngữ sau Rarely; thì hoàn thành chỉ là phụ. |
| 50 | She looked tired because she ________ on the computer all morning. | had been working | 1 | past-perfect | Cần thêm mã: Quá khứ hoàn thành tiếp diễn; mô tả mã mới past-perfect cần bao gồm dạng tiếp diễn. |
| 51 | She suggested ________ a short break before continuing the discussion. | taking | 1 | verb-patterns | Cần thêm mã: Nhãn theo cấu trúc được hỏi. |
| 52 | She would rather you ________ anyone about the decision yet. | didn’t tell | 1 | unreal-past | Cần thêm mã: Would rather + chủ ngữ + quá khứ giả định. |
| 53 | The heavier the rain became, ________ the visibility was. | the worse | 1 | adjectives-adverbs | Cần thêm mã: So sánh kép the...the... |
| 54 | The manager was busy ________ the quarterly financial reports. | reviewing | 1 | verb-patterns | Cần thêm mã: Nhãn theo cấu trúc được hỏi. |
| 55 | The report must ________ to the director before 5 PM today. | be submitted | 1 | passive-voice | Có mã: Bị động với động từ khuyết thiếu; có thể thêm modals. |
| 56 | The scientist ________ findings changed modern astronomy was awarded a Nobel Prize. | whose | 1 | relative-clauses | Cần thêm mã: Nhãn theo cấu trúc được hỏi. |
| 57 | They are not used to ________ in such an open-plan office. | working | 1 | verb-patterns | Cần thêm mã: Nhãn theo cấu trúc được hỏi. |
| 58 | We had our air conditioner ________ yesterday morning. | repaired | 1 | causative | Cần thêm mã: Cấu trúc sai khiến have + vật + V3. |
| 59 | We will proceed with the outdoor event ________ it starts raining heavily. | unless | 1 | conditionals | Có mã: Nhãn theo cấu trúc được hỏi. |
| 60 | You ________ have booked tickets in advance; the entry is completely free. | needn't | 1 | modals | Có mã: Nhãn theo cấu trúc được hỏi. |
| 61 | She___ to work every day. | goes | 1 | present-simple | Có mã: Nội dung có HTML entity bị mã hóa nhiều lần, nên chuẩn hóa trước xuất bản lại. |
| 62 | She has already ___ her homework. | done | 3 | present-perfect | Có mã: Nhãn theo cấu trúc được hỏi. |
| 63 | She ___ to work every day. | going | 1 | present-simple | TẠM GIỮ: TẠM GIỮ: đáp án lưu going không tạo câu đúng với She ___ to work every day. Đáp án dự kiến goes; cần admin kiểm tra/sửa. |
| 64 | She ___ to work by bus every day. | goes | 3 | present-simple | Có mã: Nhãn theo cấu trúc được hỏi. |
| 65 | The letter ___ yesterday. | was sent | 3 | passive-voice | Có mã: Nhãn theo cấu trúc được hỏi. |
| 66 | The man ___ lives next door is a doctor. | who | 3 | relative-clauses | Cần thêm mã: Nhãn theo cấu trúc được hỏi. |
| 67 | There is ___ apple on the table. | an | 3 | articles | Có mã: Nhãn theo cấu trúc được hỏi. |
| 68 | There ___ two chairs in the room. | are | 3 | subject-verb-agreement | Cần thêm mã: There are + danh từ số nhiều. |
| 69 | They have lived here ___ 2020. | since | 2 | prepositions | Có mã: Nhãn theo cấu trúc được hỏi. |
| 70 | They ___ visited London before. | have | 3 | present-perfect | Có mã: Nhãn theo cấu trúc được hỏi. |
| 71 | This book is ___ than that one. | more interesting | 3 | adjectives-adverbs | Cần thêm mã: So sánh hơn. |
| 72 | We are looking forward to ___ you. | seeing | 3 | verb-patterns | Cần thêm mã: Look forward to + V-ing. |
| 73 | We ___ dinner when the phone rang. | were having | 3 | past-continuous | Cần thêm mã: Nhãn theo cấu trúc được hỏi. |
| 74 | We ___ to the cinema last Saturday. | went | 3 | past-simple | Có mã: Nhãn theo cấu trúc được hỏi. |
| 75 | You have never been there, ___ you? | have | 3 | question-tags | Cần thêm mã: Câu hỏi đuôi với have. |
| 76 | You ___ wear a helmet when riding a motorbike. | must | 3 | modals | Có mã: Nhãn theo cấu trúc được hỏi. |
| 77 | Able to be done or achieved easily and conveniently; practical | feasible | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 78 | abundant | plentiful | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 79 | afraid | scared | 3 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 80 | After hours of intense debate, the committee failed to [ ___ ] a consensus. | reach | 1 | collocations | Có mã: Cụm từ kết hợp; không coi hai từ là từ đồng nghĩa. |
| 81 | A kitchen appliance you use to cook food is a/an = | oven | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 82 | A metal container with a handle used for cooking is a/an = | pan | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 83 | angry | annoyed | 3 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 84 | An official whose job is to carefully examine financial records and accounts | Auditor | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 85 | A personal computer is a/an = | laptop | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 86 | A person or group that derives advantage from something, especially a will or trust | Beneficiary | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 87 | A person who helps two opposing groups reach an agreement | Mediator | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 88 | A person who is in charge of a museum or art gallery | Curator | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 89 | A reflective surface used to see oneself is a/an = | mirror | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 90 | argue | dispute | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 91 | arrest | capture | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 92 | assist | help | 3 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 93 | A young worker who is learning a skilled trade from a qualified employer | Apprentice | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 94 | beautiful | attractive | 3 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 95 | begin | start | 3 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 96 | Candidates must undergo [ ___ ] physical and psychological testing before being accepted | rigorous | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 97 | clever | intelligent | 3 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 98 | delicate | fragile | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 99 | deliriously | happy | 1 | collocations | Có mã: Cụm từ kết hợp; không coi hai từ là từ đồng nghĩa. |
| 100 | difficult | hard | 3 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 101 | Disposal of [ ___ ] chemical waste requires strict adherence to international safety protocols. | hazardous | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 102 | error | mistake | 3 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 103 | essential | vital | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 104 | finish | complete | 3 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 105 | gift | present | 3 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 106 | happy | pleased | 3 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 107 | Having or expressing more than one possible meaning; not clear | ambiguous | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 108 | hazardous | dangerous | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 109 | He needs a bigger sized jacket. It looks too ___ around his chest. | tight | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 110 | house | home | 3 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 111 | I am cleaning the house today so I'm wearing ___ old clothes. | scruffy | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 112 | Investing in emerging technology proved to be a highly [ ___ ] venture | lucrative | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 113 | ising carbon emissions continue to [ ___ ] a serious threat to global agriculture. | pose | 1 | collocations | Có mã: Nội dung thiếu chữ R ở đầu Rising; nên sửa chính tả. |
| 114 | journey | trip | 3 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 115 | large | big | 3 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 116 | mitigating | circumstance | 1 | collocations | Có mã: Collocation mitigating circumstance; thường dùng số nhiều circumstances trong ngữ cảnh pháp lý. |
| 117 | No longer produced or used; completely out of date | obsolete | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 118 | novelty | value | 1 | collocations | Có mã: Cụm từ kết hợp; không coi hai từ là từ đồng nghĩa. |
| 119 | observe | watch | 3 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 120 | occupation | job | 3 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 121 | picturesque | village | 1 | collocations | Có mã: Cụm từ kết hợp; không coi hai từ là từ đồng nghĩa. |
| 122 | prompt | rapid | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 123 | purchase | buy | 3 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 124 | quick | fast | 3 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 125 | quit | give up | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 126 | release | free | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 127 | repair | fix | 3 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 128 | reply | answer | 3 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 129 | require | need | 3 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 130 | select | choose | 3 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 131 | silent | quiet | 3 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 132 | speak | talk | 3 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 133 | test | assess | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 134 | The club is very expensive. It is rather _____ . | extravagant | 1 | word-meaning | TẠM GIỮ: Extravagant không hoàn toàn đồng nghĩa expensive; cần xem lại cách diễn đạt câu và đáp án. |
| 135 | The initial investigation yielded only [ ___ ] findings, so further research is required. | preliminary | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 136 | The newly discovered evidence helped [ ___ ] doubt on the suspect's original alibi. | cast | 1 | collocations | Có mã: Cụm từ kết hợp; không coi hai từ là từ đồng nghĩa. |
| 137 | The part of a jumper or jacket that covers the arm is a/an = | sleeve | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 138 | The rapid adoption of artificial intelligence has had a [ ___ ] impact on the modern workforce. | profound | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 139 | This banana isn't ___ yet so we have to wait to eat it. | ripe | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 140 | tired | exhausted | 3 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 141 | To accomplish an intended objective is to | succeed | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 142 | To avoid burnout, it is vital to [ ___ ] a healthy balance between work and personal life. | strike | 1 | collocations | Có mã: Cụm từ kết hợp; không coi hai từ là từ đồng nghĩa. |
| 143 | To change in condition or nature is to | transform | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 144 | To divide something equally between people is to = | share | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 145 | To look fixedly at something is to | stare | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 146 | To place something on top of an object for protection is to = | cover | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 147 | Unfriendly, aggressive, or opposing someone or something | hostile | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 148 | university | tutor | 1 | collocations | Có mã: Cụm từ kết hợp; không coi hai từ là từ đồng nghĩa. |
| 149 | Unwilling and hesitant to do something | reluctant | 1 | word-meaning | Có mã: Đối chiếu nghĩa từ/định nghĩa với ngân hàng đáp án của đúng set. |
| 150 | We need to take immediate measures to [ ___ ] the ongoing conflict between the two departments. | resolve | 1 | collocations | Có mã: Cụm từ kết hợp; không coi hai từ là từ đồng nghĩa. |
| 151 | You don't need to get so upset. Just try to ___ down. | calm | 1 | collocations | Có mã: Cụm từ kết hợp; không coi hai từ là từ đồng nghĩa. |

## Đối chiếu ID để duyệt trên UI

Vào /admin/topic-labels?testId=ID_ĐỀ. Đối chiếu question key và câu hiện tại trước khi thêm nhãn thủ công hoặc duyệt AI. ID chỉ phục vụ xác định dữ liệu local; không dùng để cập nhật hàng loạt thiếu kiểm tra fingerprint.

| Nhóm | Đề | Test ID | Câu | Question ID |
|---:|---|---|---|---|
| 1 | Full test 1 | 235bb766-44dc-4c27-b4c1-90172d54ce79 | p1:q15 | 01340ead-25bf-4368-a06d-fb5705a1821b |
| 1 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p1:q15 | be3b6794-9a42-4b8e-9285-d913189cd75a |
| 2 | Full test 1 | 235bb766-44dc-4c27-b4c1-90172d54ce79 | p1:q17 | 3e25998b-825a-42d5-92c2-fb38cddee395 |
| 2 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p1:q17 | 7d27618a-e11f-4015-9f7b-866507d8a134 |
| 3 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p1:q20 | 623a6916-fd1c-48e6-9a2b-5d76bf178a69 |
| 3 | Full test 1 | 235bb766-44dc-4c27-b4c1-90172d54ce79 | p1:q20 | 9933dbd3-755a-4498-913b-497c630ec39c |
| 4 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p1:q7 | 00796fee-b99b-4397-8cc3-9ce91925abb2 |
| 4 | Full test 1 | 235bb766-44dc-4c27-b4c1-90172d54ce79 | p1:q7 | 9847b6b8-5945-4391-b1b4-0f4cdd4b105f |
| 5 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p1:q8 | 100060a8-8965-42dd-aa2f-443fad04bcd9 |
| 5 | Full test 1 | 235bb766-44dc-4c27-b4c1-90172d54ce79 | p1:q8 | 6995569a-984e-4540-8b59-574c742bf29a |
| 6 | [Mẫu] Grammar & Vocabulary · Practice · Part 1 | c77c3ded-b4fb-5cdd-86e5-a30e2d7261a9 | p1:q25 | 3bc47e02-d2ba-491a-bd85-9b65ea31d1cf |
| 6 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p1:q25 | 6ebf3f49-dc61-4426-b854-a2f0327adab9 |
| 6 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p1:q25 | ff945a0d-521d-43ac-8512-d0c64abdefbf |
| 7 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p1:q19 | 96a78e33-e9d9-44db-9949-9726dae5e2af |
| 7 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p1:q19 | d4c35e2c-d4dd-4917-abda-d564e5ce6ff3 |
| 7 | [Mẫu] Grammar & Vocabulary · Practice · Part 1 | c77c3ded-b4fb-5cdd-86e5-a30e2d7261a9 | p1:q19 | e82a0618-3b29-4b71-868a-5abfdcef1b4d |
| 8 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p1:q21 | d0f5e943-c4ab-407c-ac4a-001f7f5cf77f |
| 8 | Full test 1 | 235bb766-44dc-4c27-b4c1-90172d54ce79 | p1:q21 | d2e036d2-ce2d-4c70-a39b-7e82c0f2d454 |
| 9 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p1:q10 | 533c3ad5-79fe-45b4-9ba4-4610ec25d518 |
| 9 | Full test 1 | 235bb766-44dc-4c27-b4c1-90172d54ce79 | p1:q10 | 68c53f68-ddf1-4c82-bcb0-84528c4a857e |
| 10 | Full test 1 | 235bb766-44dc-4c27-b4c1-90172d54ce79 | p1:q13 | 61f4064a-299c-4e2c-8d35-df132e13bb7d |
| 10 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p1:q13 | a0d807a2-54f9-4bdb-b969-ffc302210ae1 |
| 11 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p1:q19 | 2f5f7773-0db8-4984-9a71-b8a7e24746b3 |
| 11 | Full test 1 | 235bb766-44dc-4c27-b4c1-90172d54ce79 | p1:q19 | 6fbcc2d7-fe67-490d-9cdd-b29c0db9b307 |
| 12 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p1:q9 | 51ad3f3a-c8f5-4bab-8fd3-f87a10871efe |
| 12 | Full test 1 | 235bb766-44dc-4c27-b4c1-90172d54ce79 | p1:q9 | 8c67bf78-7d7e-4980-833b-2ba7bcb836d6 |
| 13 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p1:q18 | 5e90ebb4-313b-4acb-9024-d4be41591324 |
| 13 | Full test 1 | 235bb766-44dc-4c27-b4c1-90172d54ce79 | p1:q18 | b4304e1c-b531-4b50-a23f-1547b5ac7f27 |
| 14 | Full test 1 | 235bb766-44dc-4c27-b4c1-90172d54ce79 | p1:q14 | 04dc2f2f-4a3d-4e79-80dc-49abd307909d |
| 14 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p1:q14 | bbaf1589-ca76-4733-a27b-01f1906a5e03 |
| 15 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p1:q24 | 069fc1b9-1705-44d7-bce5-c1fc8cc565a5 |
| 15 | Full test 1 | 235bb766-44dc-4c27-b4c1-90172d54ce79 | p1:q24 | 588c77b4-6451-42fe-aa3e-dc6fbb42185a |
| 16 | Full test 1 | 235bb766-44dc-4c27-b4c1-90172d54ce79 | p1:q16 | 37ce3e07-70a9-4d86-b9ed-c27b000c8e0c |
| 16 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p1:q16 | 3d5eac05-6eba-4f1f-8131-7b05bb0305a9 |
| 17 | Full test 1 | 235bb766-44dc-4c27-b4c1-90172d54ce79 | p1:q6 | 540e3faa-6830-4420-8970-b6611fa950ed |
| 17 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p1:q6 | 5c4e86d6-080b-4e43-85e3-271b8848ee53 |
| 18 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p1:q4 | 1ca146e4-b1dc-459c-877b-48b545192147 |
| 18 | Full test 1 | 235bb766-44dc-4c27-b4c1-90172d54ce79 | p1:q4 | beb187c6-f51f-46ff-a8a0-4457cf58ca0e |
| 19 | Full test 1 | 235bb766-44dc-4c27-b4c1-90172d54ce79 | p1:q11 | 2727aee4-bb2b-4769-a4cd-f8e0b3249b79 |
| 19 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p1:q11 | 8f10611d-a786-4fb4-afa3-91e249cad0a3 |
| 20 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p1:q22 | 1bfb7e73-a060-436e-acf7-ccbb4ebc807f |
| 20 | Full test 1 | 235bb766-44dc-4c27-b4c1-90172d54ce79 | p1:q22 | ead4565e-47ac-463b-8c09-a521e78b745e |
| 21 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p1:q12 | 108b5e51-2578-476d-93f0-29e5bee88bfc |
| 21 | Full test 1 | 235bb766-44dc-4c27-b4c1-90172d54ce79 | p1:q12 | 5f5107e8-aad7-4b0e-9e5b-1ea84572c39a |
| 22 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p1:q25 | 08f2eac0-e454-49b7-bd04-5d222d32b6fa |
| 22 | Full test 1 | 235bb766-44dc-4c27-b4c1-90172d54ce79 | p1:q25 | af034262-bbbb-44fe-b902-bf03364b71d8 |
| 23 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p1:q8 | 3f1dd1d6-1951-499f-bb71-7a4313858306 |
| 23 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p1:q8 | 5be6005c-2cc0-4613-b911-0ab3ad60ab4c |
| 23 | [Mẫu] Grammar & Vocabulary · Practice · Part 1 | c77c3ded-b4fb-5cdd-86e5-a30e2d7261a9 | p1:q8 | 693ec66b-c079-4738-836d-eca4c66b7895 |
| 24 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p1:q10 | 5b13606f-6d77-4e96-ac91-71ab90729f51 |
| 24 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p1:q10 | b3f2c21c-dc98-4b13-9f47-ac68ac085a57 |
| 24 | [Mẫu] Grammar & Vocabulary · Practice · Part 1 | c77c3ded-b4fb-5cdd-86e5-a30e2d7261a9 | p1:q10 | e4a25550-51bb-44e6-8f05-b22101b16b17 |
| 25 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p1:q2 | 84bd169d-d0f0-464b-a0aa-48a816a21a5c |
| 25 | Full test 1 | 235bb766-44dc-4c27-b4c1-90172d54ce79 | p1:q2 | 91ea3856-922e-4c26-bed1-8cb6a6ff6f8e |
| 26 | Full test 1 | 235bb766-44dc-4c27-b4c1-90172d54ce79 | p1:q5 | 35bbdf01-3a29-4567-80de-b415ed275705 |
| 26 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p1:q5 | 7f1204a8-b44f-4477-b063-f99ed1882ee7 |
| 27 | [Mẫu] Grammar & Vocabulary · Practice · Part 1 | c77c3ded-b4fb-5cdd-86e5-a30e2d7261a9 | p1:q7 | 2d02ffce-7eff-4c3d-bf7e-95b2dcf54ed9 |
| 27 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p1:q7 | b9174176-453f-4348-80d9-91d0717cf9b5 |
| 27 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p1:q7 | cd4c6b07-6a49-4f33-a45f-719b6eb7b036 |
| 28 | Full test 1 | 235bb766-44dc-4c27-b4c1-90172d54ce79 | p1:q23 | 88626291-b6e6-4751-8d48-c4e4d054bcc0 |
| 28 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p1:q23 | c0d31090-feb5-4f05-9ebb-33ab7b3b8836 |
| 29 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p1:q3 | 011e2a0b-5fb6-4739-be8b-96799e52c559 |
| 29 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p1:q3 | 361ba95f-59a5-41cd-979c-455c0040428c |
| 29 | [Mẫu] Grammar & Vocabulary · Practice · Part 1 | c77c3ded-b4fb-5cdd-86e5-a30e2d7261a9 | p1:q3 | 55699902-13fe-4230-aa49-253153a6dd6a |
| 30 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p1:q13 | 3baf3ea5-d4c6-4041-a9fd-1e5ce12da296 |
| 30 | [Mẫu] Grammar & Vocabulary · Practice · Part 1 | c77c3ded-b4fb-5cdd-86e5-a30e2d7261a9 | p1:q13 | 7b552afb-6e90-44c4-aadf-03b37a3fd616 |
| 30 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p1:q13 | d5606e25-3e8e-41e2-89f1-573590cbde99 |
| 31 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p1:q24 | 7dc578f0-2ba1-43fb-a188-d7dddff51ad3 |
| 31 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p1:q24 | 9c76c92f-4adc-49bf-9f43-93860fb8dbcf |
| 31 | [Mẫu] Grammar & Vocabulary · Practice · Part 1 | c77c3ded-b4fb-5cdd-86e5-a30e2d7261a9 | p1:q24 | a71bd0d4-9b7f-4c43-8857-7054a19e56ba |
| 32 | [Mẫu] Grammar & Vocabulary · Practice · Part 1 | c77c3ded-b4fb-5cdd-86e5-a30e2d7261a9 | p1:q17 | 102d2878-1978-4ec2-9726-ce7281c5f512 |
| 32 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p1:q17 | 7daa0e70-9317-46c0-b287-fdb1405d18a6 |
| 32 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p1:q17 | c9eeafc0-dcde-4163-8668-fa562bc40564 |
| 33 | [Mẫu] Grammar & Vocabulary · Practice · Part 1 | c77c3ded-b4fb-5cdd-86e5-a30e2d7261a9 | p1:q12 | 6a476cf3-9153-4566-b510-ddc5ec9fb91e |
| 33 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p1:q12 | d0d36d95-7906-4bc7-a759-15ce453b7cd5 |
| 33 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p1:q12 | eedcad86-fcdd-42fd-a3ec-0c2d01e0b96a |
| 34 | [Mẫu] Grammar & Vocabulary · Practice · Part 1 | c77c3ded-b4fb-5cdd-86e5-a30e2d7261a9 | p1:q23 | 0277b32c-8428-4875-8b8a-2781a49a7658 |
| 34 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p1:q23 | a764f004-a108-416b-bcee-7dbda52a87be |
| 34 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p1:q23 | ad3f0665-4c68-4131-844f-470d80ff406e |
| 35 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p1:q13 | daf5448b-2e51-460d-b764-791ecddfb5bc |
| 36 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p1:q7 | 85a3150f-bfc2-4e25-a0ac-0458d56c071f |
| 37 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p1:q14 | d23f46f1-3c88-418e-83dc-97ba130a2bb3 |
| 38 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p1:q24 | 8001cd9b-aab7-4a52-bb9a-50cbd1bf1e77 |
| 39 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p1:q1 | bee732da-bbc9-4377-9b70-449bafe4fcce |
| 40 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p1:q18 | 6b39e03d-e3bd-465e-b806-16dd86c76f9b |
| 41 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p1:q2 | 9f59907c-274d-4c6c-9173-954d70ab3d20 |
| 42 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p1:q17 | 2a531cb2-cb23-4786-8c61-8b02cc902bf3 |
| 43 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p1:q10 | acb9a02b-dab0-4a38-a922-40c21a7555fe |
| 44 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p1:q12 | b5f02d55-1f88-401b-9861-99c46b6e4d9b |
| 45 | [Mẫu] Grammar & Vocabulary · Practice · Part 1 | c77c3ded-b4fb-5cdd-86e5-a30e2d7261a9 | p1:q16 | 7c4f98bc-bd89-4eed-8daf-635d8063d5e5 |
| 45 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p1:q16 | bf0799af-29ca-4eea-a303-fbe125d68b80 |
| 45 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p1:q16 | e797a6aa-f226-4ce3-b9ea-be4655c73152 |
| 46 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p1:q16 | 6d0c2b6c-6831-479b-9ccc-18e1347b1a07 |
| 47 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p1:q4 | d053f03c-0c9c-4144-aa73-57a113cddc1d |
| 48 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p1:q21 | a9445127-c0c1-44f5-b8bc-db3259707cd1 |
| 49 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p1:q5 | 87d07fa3-debb-466f-bc40-3b1dfbcf742f |
| 50 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p1:q11 | 10b3ec03-4d9a-4262-a7d7-ea45e6e6097d |
| 51 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p1:q6 | 0a70ff55-cd74-4aac-a926-a3ab66648b1c |
| 52 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p1:q23 | a2bf24db-cede-4041-bc17-20bfdc534a79 |
| 53 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p1:q15 | 897d2818-2f87-4d4c-b247-dc62cdb261cf |
| 54 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p1:q25 | 91de76a7-5857-4380-8b87-88709b0a3949 |
| 55 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p1:q3 | 76a02d22-b711-4592-998e-7bfba1dbd83e |
| 56 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p1:q9 | 2544cf22-f15f-451e-b2aa-f2bca4806164 |
| 57 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p1:q19 | d42e871c-87fe-456d-ae05-b3d4fe25905e |
| 58 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p1:q22 | 2cab63a3-5fe1-4ae0-978d-d87d0088d8b8 |
| 59 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p1:q20 | 8b5977ab-f74d-40cf-bf27-fa56ba77be34 |
| 60 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p1:q8 | 042f01c9-328f-4934-b737-c051626122d0 |
| 61 | Full test 1 | 235bb766-44dc-4c27-b4c1-90172d54ce79 | p1:q1 | e6abc20c-4cac-4c39-8da5-ebc7b4ec844a |
| 62 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p1:q20 | 390b16ca-8c2d-4dae-be4a-7d347cf274ef |
| 62 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p1:q20 | 4c4a72c8-36b9-437f-ac51-5702bba78860 |
| 62 | [Mẫu] Grammar & Vocabulary · Practice · Part 1 | c77c3ded-b4fb-5cdd-86e5-a30e2d7261a9 | p1:q20 | 4ea7324b-34cc-41d4-ae99-6a3b43e3a4a4 |
| 63 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p1:q1 | 71b0958e-af15-4774-8db5-988c645638ba |
| 64 | [Mẫu] Grammar & Vocabulary · Practice · Part 1 | c77c3ded-b4fb-5cdd-86e5-a30e2d7261a9 | p1:q1 | 1297c75f-b062-401c-8088-20e3c60357db |
| 64 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p1:q1 | 331accce-88ab-4144-990d-9de81d09af46 |
| 64 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p1:q1 | 8c7f0914-302c-4a0d-8286-142c03b278cc |
| 65 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p1:q9 | 0d7aa111-f46b-4fad-bc63-384c7b62c011 |
| 65 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p1:q9 | c6c4122b-8718-4f29-9b76-96e156598deb |
| 65 | [Mẫu] Grammar & Vocabulary · Practice · Part 1 | c77c3ded-b4fb-5cdd-86e5-a30e2d7261a9 | p1:q9 | f19cb709-bdcf-446b-a5a1-9b260beced19 |
| 66 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p1:q14 | 70d98145-9394-4ca9-a7ba-aa573444d35d |
| 66 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p1:q14 | abe6352c-51ae-44d8-b80c-ce85832ad079 |
| 66 | [Mẫu] Grammar & Vocabulary · Practice · Part 1 | c77c3ded-b4fb-5cdd-86e5-a30e2d7261a9 | p1:q14 | bbc9bc4c-77f6-4b0e-9235-c72ba583a531 |
| 67 | [Mẫu] Grammar & Vocabulary · Practice · Part 1 | c77c3ded-b4fb-5cdd-86e5-a30e2d7261a9 | p1:q4 | 9f5f9bf1-9eff-4b8e-999a-25503c11f5bc |
| 67 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p1:q4 | b091c9a5-a177-46cb-a90a-a99b78272c6d |
| 67 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p1:q4 | ddf52398-d011-4893-bdc8-01fa05d4ce4a |
| 68 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p1:q18 | 29ec4be0-0e50-42cc-9da6-bb67055ebdff |
| 68 | [Mẫu] Grammar & Vocabulary · Practice · Part 1 | c77c3ded-b4fb-5cdd-86e5-a30e2d7261a9 | p1:q18 | 5f5ab21d-2e4d-4294-844a-5d54c952e3fe |
| 68 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p1:q18 | b72b558e-a5b8-4747-8232-f222f5a23dd1 |
| 69 | Full test 1 | 235bb766-44dc-4c27-b4c1-90172d54ce79 | p1:q3 | 0ecd5add-3593-4fdb-bf93-b280fb5dc13f |
| 69 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p1:q3 | d4aeecd3-b97d-47cf-9318-8de6030a135b |
| 70 | [Mẫu] Grammar & Vocabulary · Practice · Part 1 | c77c3ded-b4fb-5cdd-86e5-a30e2d7261a9 | p1:q11 | 0e9279f4-7a57-4c37-bbf1-55fe11f532f1 |
| 70 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p1:q11 | 58fff9c3-f10f-42fe-b3a3-3a312a5c6597 |
| 70 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p1:q11 | 8415b3b8-2880-4e3c-a416-7e492adc5e36 |
| 71 | [Mẫu] Grammar & Vocabulary · Practice · Part 1 | c77c3ded-b4fb-5cdd-86e5-a30e2d7261a9 | p1:q5 | 0d310cd1-0c91-42a8-a84e-5875d8022c7c |
| 71 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p1:q5 | 2e29307e-27a7-41d2-b246-330a8b5f7625 |
| 71 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p1:q5 | ff0d33de-9acf-42a9-a0d4-f7e9d11f1e8a |
| 72 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p1:q21 | 25de4845-d8ef-4739-95b8-082c97a54866 |
| 72 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p1:q21 | 8c1ef495-a4fe-4b57-9884-89e9fde4ddce |
| 72 | [Mẫu] Grammar & Vocabulary · Practice · Part 1 | c77c3ded-b4fb-5cdd-86e5-a30e2d7261a9 | p1:q21 | af25eca4-9bc3-4e98-bec8-1e1c67bf381c |
| 73 | [Mẫu] Grammar & Vocabulary · Practice · Part 1 | c77c3ded-b4fb-5cdd-86e5-a30e2d7261a9 | p1:q2 | 8eb974f1-7bb4-43d0-86d7-92a7d81cb6c1 |
| 73 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p1:q2 | ac42ea10-9556-4ed3-ba09-72bab7a35445 |
| 73 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p1:q2 | c285b835-51a6-4e75-9204-50186a3e5b93 |
| 74 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p1:q15 | 3d434f5f-c896-49e9-bfcd-94b0c912c64a |
| 74 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p1:q15 | 7507a54d-d015-420b-9688-a0ef987ce4de |
| 74 | [Mẫu] Grammar & Vocabulary · Practice · Part 1 | c77c3ded-b4fb-5cdd-86e5-a30e2d7261a9 | p1:q15 | 95523a8b-5743-4938-80e5-74744d37a603 |
| 75 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p1:q22 | 02c961d2-830c-49e0-9f48-ebe3db58e8f7 |
| 75 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p1:q22 | 9dc69cd0-1d9a-4a49-81b1-7925d9a2e338 |
| 75 | [Mẫu] Grammar & Vocabulary · Practice · Part 1 | c77c3ded-b4fb-5cdd-86e5-a30e2d7261a9 | p1:q22 | d750450b-97c2-40dc-8ebf-fae3f9e30b69 |
| 76 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p1:q6 | 492042d4-6769-4248-b27a-280bf85bf798 |
| 76 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p1:q6 | 56024e9d-8bb6-4ea8-979e-ba8e1e085d89 |
| 76 | [Mẫu] Grammar & Vocabulary · Practice · Part 1 | c77c3ded-b4fb-5cdd-86e5-a30e2d7261a9 | p1:q6 | 949ceb0d-edd8-4df7-9a98-975ba892295b |
| 77 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p2:q37 | 2a9fe033-9797-43df-bc0f-a0d32404d065 |
| 78 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p2:q26 | 4a000374-c342-4581-9310-c6388e3df4ec |
| 79 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p2:q45 | 35eb326a-605c-4190-9ee3-25166c74f727 |
| 79 | [Mẫu] Grammar & Vocabulary · Practice · Part 2 | ff2ba07d-9994-5ccc-b8c6-c4dd910768ed | p2:q45 | 66c13f55-9138-4f8a-9d35-24056125a5ab |
| 79 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p2:q45 | cee86bef-b2d2-4dee-8441-d16058b85045 |
| 80 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p2:q42 | 720e6ea9-0b6c-4774-92f7-d238f000d9ea |
| 81 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p2:q36 | 5e03fc05-035c-40b8-b851-fd83ec542707 |
| 82 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p2:q40 | d9ad0e80-be04-46dc-8bdd-4a73c75916e6 |
| 83 | [Mẫu] Grammar & Vocabulary · Practice · Part 2 | ff2ba07d-9994-5ccc-b8c6-c4dd910768ed | p2:q42 | 3232748e-0817-4af6-87c3-f43d752fb81d |
| 83 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p2:q42 | 437b9872-4845-4e51-877e-06eeadeef38d |
| 83 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p2:q42 | faf5726c-288c-4071-9cbe-5f9ab58520b7 |
| 84 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p2:q33 | c55e0933-21b3-403e-9bd9-f4bdee6b105c |
| 85 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p2:q37 | ab3054ab-c2af-485f-9f18-98b8b88980ef |
| 86 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p2:q35 | 97337559-d81f-4949-87fe-6f98e3f4fc94 |
| 87 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p2:q34 | d8a18d12-250e-4794-b211-5c6b7fedc4d0 |
| 88 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p2:q31 | c0458711-7661-4d20-8b4b-7aeaaba46fc6 |
| 89 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p2:q39 | 5eaa1d9f-ecbe-4c26-bf6a-088285c137d5 |
| 90 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p2:q27 | 6cb04717-057c-4821-ae21-7f34cd708081 |
| 91 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p2:q28 | 83e84e5e-dbe9-4d96-a503-45e6f1abefe5 |
| 92 | [Mẫu] Grammar & Vocabulary · Practice · Part 2 | ff2ba07d-9994-5ccc-b8c6-c4dd910768ed | p2:q34 | 50036f29-dcde-4e90-82f1-3c0f45469185 |
| 92 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p2:q34 | c57b8807-abde-4c41-83c3-a5bebdd007a6 |
| 92 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p2:q34 | ed0c0f55-12ab-4dd9-b954-5884ea8480fd |
| 93 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p2:q32 | d2c113bb-5461-4d8e-a66f-1938a216d23f |
| 94 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p2:q41 | 64d4dd92-6cbb-4bcb-abb2-d15311e6cc93 |
| 94 | [Mẫu] Grammar & Vocabulary · Practice · Part 2 | ff2ba07d-9994-5ccc-b8c6-c4dd910768ed | p2:q41 | d0dfe4ab-62f2-4a3d-81ee-7285ded5a2cd |
| 94 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p2:q41 | e2f47010-e98c-4e41-9683-9cf02b5894b9 |
| 95 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p2:q31 | 646d01c4-efac-489b-9118-7a452e64d868 |
| 95 | [Mẫu] Grammar & Vocabulary · Practice · Part 2 | ff2ba07d-9994-5ccc-b8c6-c4dd910768ed | p2:q31 | cbcdd57e-defe-4d5d-ba63-c1a4168068a0 |
| 95 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p2:q31 | fb0f187e-95de-43ba-8d80-f1dc6ffb9463 |
| 96 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p2:q48 | 8c4f47fe-dbf9-4a0c-9315-993d592ca580 |
| 97 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p2:q43 | 59f671b3-9e4a-4739-b5b6-d98784210df0 |
| 97 | [Mẫu] Grammar & Vocabulary · Practice · Part 2 | ff2ba07d-9994-5ccc-b8c6-c4dd910768ed | p2:q43 | 7dbd4a5e-f164-4335-bf7c-5494e59ab988 |
| 97 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p2:q43 | c19d08a1-2961-475b-9f14-9dbc552e9f45 |
| 98 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p2:q28 | 8eb2ae9d-39fc-4278-a128-97fddf991b52 |
| 99 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p2:q47 | feac156c-3e3e-443f-82de-afd08422f18a |
| 100 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p2:q30 | 575c04af-5a5d-4231-8e69-c8101f36fedd |
| 100 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p2:q30 | 90bab597-b226-4d2a-a2a1-727cc2c52647 |
| 100 | [Mẫu] Grammar & Vocabulary · Practice · Part 2 | ff2ba07d-9994-5ccc-b8c6-c4dd910768ed | p2:q30 | c3ee4d18-1829-4ccb-bbd8-406725c52c28 |
| 101 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p2:q47 | 51b84e6e-fb20-45b1-8f60-2a1448e379b1 |
| 102 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p2:q40 | 1f5b39ce-9ce7-4759-8648-d45b40d0730b |
| 102 | [Mẫu] Grammar & Vocabulary · Practice · Part 2 | ff2ba07d-9994-5ccc-b8c6-c4dd910768ed | p2:q40 | 3bc37ca5-cde7-44b4-8eb8-a81b3063b0ed |
| 102 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p2:q40 | 7e4ee593-c21e-4531-9e69-56be5695757e |
| 103 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p2:q29 | 2bf42a41-a88a-452a-89ae-f2c7f81ddc6c |
| 104 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p2:q32 | 7387331d-03f0-4a1e-a44e-067252a4d1a6 |
| 104 | [Mẫu] Grammar & Vocabulary · Practice · Part 2 | ff2ba07d-9994-5ccc-b8c6-c4dd910768ed | p2:q32 | 8d2bf7ef-cd9f-4a6b-8c66-bf5e79988d47 |
| 104 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p2:q32 | ab934e58-85b7-42be-8fe3-81b6e9023d0b |
| 105 | [Mẫu] Grammar & Vocabulary · Practice · Part 2 | ff2ba07d-9994-5ccc-b8c6-c4dd910768ed | p2:q39 | 81fca3ec-11d1-4748-aeb1-7453fa702d0f |
| 105 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p2:q39 | db372b81-b053-4267-a468-26bdc77701af |
| 105 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p2:q39 | fc82b3ff-6c90-414b-807c-d23ce232c256 |
| 106 | [Mẫu] Grammar & Vocabulary · Practice · Part 2 | ff2ba07d-9994-5ccc-b8c6-c4dd910768ed | p2:q26 | b774ba43-0beb-4fe5-bdc7-5c9b4912a8e4 |
| 106 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p2:q26 | e7aa9d0b-71c3-4b63-9928-601458b94201 |
| 106 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p2:q26 | fdc05f7f-5560-4eb9-a9df-1f82a4a502b3 |
| 107 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p2:q38 | 3904c54f-8596-46b5-9928-d24a045efdce |
| 108 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p2:q27 | 0c554108-ec51-4835-9dd3-3412ebb7629f |
| 109 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p2:q44 | f2feaa24-7358-476c-9fd0-67bc1ce3104a |
| 110 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p2:q36 | 4af53626-c7a3-4f07-8135-ceb454c0d079 |
| 110 | [Mẫu] Grammar & Vocabulary · Practice · Part 2 | ff2ba07d-9994-5ccc-b8c6-c4dd910768ed | p2:q36 | 8e02c58e-b420-42ac-af02-de77e062b721 |
| 110 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p2:q36 | fb160b20-bdbf-4d7b-b759-9e56ec9714eb |
| 111 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p2:q43 | c6351a00-fe86-4e65-9fcb-a3e9889d86ba |
| 112 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p2:q50 | 4c6893ad-148f-490a-9bae-184bed20303f |
| 113 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p2:q41 | 79bc8085-4754-47be-a2b2-6f9c89a7fe29 |
| 114 | [Mẫu] Grammar & Vocabulary · Practice · Part 2 | ff2ba07d-9994-5ccc-b8c6-c4dd910768ed | p2:q38 | 3fa9f4a1-70e4-405d-aa2e-07248769ad4e |
| 114 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p2:q38 | 71a3686b-b7d2-4153-9e1f-bd3e90687772 |
| 114 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p2:q38 | d9448c3d-2701-4562-a4d3-8418d64caaf2 |
| 115 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p2:q28 | 0c4c5f7d-18cb-4d32-922f-153bb50e554e |
| 115 | [Mẫu] Grammar & Vocabulary · Practice · Part 2 | ff2ba07d-9994-5ccc-b8c6-c4dd910768ed | p2:q28 | 1a8f7acf-eb02-4cde-8a98-fedc71f4ec94 |
| 115 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p2:q28 | d618ea18-a3a7-442c-8700-d86420dec4fe |
| 116 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p2:q46 | 90290d27-d534-48c4-ad9c-88c407e9bcec |
| 117 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p2:q40 | 98c02f67-76c1-4bf5-956b-2debbfba7744 |
| 118 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p2:q49 | be97d26b-b969-46d7-9ce9-021615de3378 |
| 119 | [Mẫu] Grammar & Vocabulary · Practice · Part 2 | ff2ba07d-9994-5ccc-b8c6-c4dd910768ed | p2:q50 | 265015ac-d4fd-48ec-ab76-064a8fd418b0 |
| 119 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p2:q50 | 38fdd337-4657-4754-b49c-5c1dbef70447 |
| 119 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p2:q50 | ff1d4a5a-6379-4db8-b81e-46de98b87699 |
| 120 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p2:q37 | 42d4cb2f-6a9f-4da6-9f6a-18ae0711ff96 |
| 120 | [Mẫu] Grammar & Vocabulary · Practice · Part 2 | ff2ba07d-9994-5ccc-b8c6-c4dd910768ed | p2:q37 | a87082bb-8022-4d16-8def-9848570ab993 |
| 120 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p2:q37 | bad7b0a2-f5c0-46f3-95c1-b069400c86a6 |
| 121 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p2:q48 | 90299049-2386-4267-a9fa-09e226a1c8cd |
| 122 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p2:q30 | 3cc70404-a83e-4b58-9f7b-374c13eb36fa |
| 123 | [Mẫu] Grammar & Vocabulary · Practice · Part 2 | ff2ba07d-9994-5ccc-b8c6-c4dd910768ed | p2:q33 | 0cc0a78c-9bb4-43f5-a088-b02e25743603 |
| 123 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p2:q33 | 49b03431-319c-4c93-b7e5-738ad1ca5b47 |
| 123 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p2:q33 | edbe2f03-a36a-4b21-9dd7-c58c82725a59 |
| 124 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p2:q27 | 5577d2fe-2d30-4e79-9525-df3fa52e0a99 |
| 124 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p2:q27 | 64120191-29c4-48e7-b978-153e1b608502 |
| 124 | [Mẫu] Grammar & Vocabulary · Practice · Part 2 | ff2ba07d-9994-5ccc-b8c6-c4dd910768ed | p2:q27 | fd9b7a64-3443-4645-9185-b8ae4f9de50a |
| 125 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p2:q30 | 9b4b9dc9-dec6-48a1-9c27-1a1118d9627a |
| 126 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p2:q29 | 9e8c3579-b6f2-4c45-a811-cbfb7a1f956c |
| 127 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p2:q47 | 7083a0d0-b494-4da3-ba39-8b62a2bc3e5b |
| 127 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p2:q47 | a7cec50e-3671-4804-aec7-a36939679c20 |
| 127 | [Mẫu] Grammar & Vocabulary · Practice · Part 2 | ff2ba07d-9994-5ccc-b8c6-c4dd910768ed | p2:q47 | f8a7a728-1d19-4ca6-a5ab-788101fc4467 |
| 128 | [Mẫu] Grammar & Vocabulary · Practice · Part 2 | ff2ba07d-9994-5ccc-b8c6-c4dd910768ed | p2:q46 | 861381eb-f121-4bff-973d-7a7527649e6b |
| 128 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p2:q46 | 8a7587cf-83d3-4ebd-9194-3833dc1d5fe8 |
| 128 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p2:q46 | c3b6496d-172b-4bb7-84ba-53e042a08a79 |
| 129 | [Mẫu] Grammar & Vocabulary · Practice · Part 2 | ff2ba07d-9994-5ccc-b8c6-c4dd910768ed | p2:q49 | 254e2ad8-918c-450b-8a9e-5f5d4c25d725 |
| 129 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p2:q49 | 6ec1cd3b-c7bb-4f61-baf1-8779a97229e9 |
| 129 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p2:q49 | e9e683b7-957f-45bc-b3f8-510739dcea0e |
| 130 | [Mẫu] Grammar & Vocabulary · Practice · Part 2 | ff2ba07d-9994-5ccc-b8c6-c4dd910768ed | p2:q35 | 111ce40a-eb34-46e9-ae15-1571f3acbe11 |
| 130 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p2:q35 | 419504fc-0e91-41fa-a1fb-f7a579ee7126 |
| 130 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p2:q35 | 76258512-899b-4cf2-93c2-a21c7a3e9a77 |
| 131 | [Mẫu] Grammar & Vocabulary · Practice · Part 2 | ff2ba07d-9994-5ccc-b8c6-c4dd910768ed | p2:q29 | 2429754e-1429-42a0-93cc-b420b3ae322c |
| 131 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p2:q29 | 7dd98265-7b6c-41d7-ba26-815c537eff84 |
| 131 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p2:q29 | b8f33a79-6f82-44c1-950a-43b33b91216e |
| 132 | [Mẫu] Grammar & Vocabulary · Practice · Part 2 | ff2ba07d-9994-5ccc-b8c6-c4dd910768ed | p2:q48 | 0256f6da-68c2-4dd9-b9d1-6e18b308a16f |
| 132 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p2:q48 | 5f52bc09-b33d-4af7-bcbc-b92584743697 |
| 132 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p2:q48 | cd557d75-5aad-4fd3-bae7-86269ed06ef7 |
| 133 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p2:q26 | 36a7cc18-ba3c-4bb4-8477-66f44249f5c4 |
| 134 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p2:q45 | d674dbc5-1ff7-4b18-ba05-28af3621fcfa |
| 135 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p2:q49 | 76d449c5-fb87-4835-bb7f-d48fd9dadfbd |
| 136 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p2:q44 | c3b4c697-ddb2-413d-963e-9b586411d5aa |
| 137 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p2:q38 | 5f26fde2-4cce-4719-bc42-6f1359c74166 |
| 138 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p2:q46 | a0d70087-3d18-480c-8a0a-4574e15cadc8 |
| 139 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p2:q42 | 14919c72-2187-463d-80b8-4db07b956477 |
| 140 | [Mẫu] Grammar & Vocabulary · Tests · Full Test | 895d5f87-6077-5ab0-8824-84576415a011 | p2:q44 | 60cf180e-0f51-40a7-936a-d11a9bed5c28 |
| 140 | [Mẫu] Grammar & Vocabulary · Practice · Part 2 | ff2ba07d-9994-5ccc-b8c6-c4dd910768ed | p2:q44 | 620ff45c-8669-4203-a332-6a0915873477 |
| 140 | [Mẫu] Grammar & Vocabulary · Practice · Full Test | 7c7c3616-06ef-5729-96cc-5f41158f13db | p2:q44 | f5a25591-f1ee-43c0-89c8-63d5db3b1471 |
| 141 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p2:q31 | db6a2c2b-1c24-4771-8c28-32b82b1810a0 |
| 142 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p2:q45 | dcadc62e-d400-4818-98bb-9076ed33daff |
| 143 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p2:q32 | 851ad361-c7e9-4006-b31f-2482926d5f14 |
| 144 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p2:q35 | 723795d2-e42e-4f49-a48d-a987c86dac9d |
| 145 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p2:q33 | 61f545f1-d735-4075-9774-1771d8e6a4f2 |
| 146 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p2:q34 | 6dae8725-505e-4929-ace9-1f8cf80eeecd |
| 147 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p2:q39 | 9982320d-7538-4ca5-ae4f-a0d8a085872b |
| 148 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p2:q50 | 2ae99cf4-19d1-4956-a188-2c415373501f |
| 149 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p2:q36 | be595759-aca0-498c-bb70-e8c140f93678 |
| 150 | Full test 1 | 5148c89d-e37e-416b-a257-2acb05b9812e | p2:q43 | 880cd66b-379f-4fb8-892b-6958363a2e7b |
| 151 | Full test 1 | 8d02e41b-f426-429f-9e48-377a576c45a7 | p2:q41 | 53c08dee-ef30-455d-802c-f2d72c99adc1 |
