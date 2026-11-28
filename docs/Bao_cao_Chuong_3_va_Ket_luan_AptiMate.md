# CHƯƠNG 3. PHÂN TÍCH, THIẾT KẾ, TRIỂN KHAI VÀ ĐÁNH GIÁ HỆ THỐNG

Trên cơ sở các kiến thức đã trình bày trong Chương 2, chương này tập trung phân tích, thiết kế và triển khai hệ thống luyện thi Aptis tích hợp trí tuệ nhân tạo mang tên AptiMate. Nội dung chương bắt đầu từ việc xác định yêu cầu và các tác nhân sử dụng, tiếp đến là kiến trúc tổng thể, thiết kế cơ sở dữ liệu và quy trình xử lý của các chức năng chính. Sau đó, chương trình bày giao diện, phương pháp thực nghiệm và kết quả đánh giá. Các kết quả được xem xét theo từng phạm vi kiểm chứng, bao gồm tính đúng đắn của chức năng, khả năng hoàn thành quy trình chấm bài bằng AI và khả năng truy xuất dữ liệu phục vụ hỗ trợ học tập.

## 3.1. Phân tích yêu cầu và nghiệp vụ hệ thống

### 3.1.1. Mục tiêu và phạm vi xây dựng hệ thống

AptiMate được xây dựng nhằm hỗ trợ người học luyện tập các thành phần của bài thi Aptis trong một môi trường thống nhất. Hệ thống cung cấp các nhóm bài tập Grammar & Vocabulary, Reading, Listening, Writing và Speaking; đồng thời hỗ trợ tra cứu, lưu từ vựng, luyện nghe chép chính tả, theo dõi lịch sử làm bài và xây dựng kế hoạch học tập. Việc tích hợp AI được thực hiện ở những chức năng cần phân tích nội dung tự do, điển hình là đánh giá bài viết, đánh giá câu trả lời nói và giải đáp theo ngữ cảnh học tập.

Đối với các câu hỏi có đáp án xác định, hệ thống đối chiếu bài làm với đáp án được lưu trong đề để tính kết quả. Đối với Writing và Speaking, bài làm được đánh giá theo bộ tiêu chí và được kiểm tra trước khi công bố. Cách tổ chức này cho phép kết hợp chấm điểm theo quy tắc với đánh giá bằng mô hình ngôn ngữ, phù hợp với đặc điểm của từng kỹ năng.

Phạm vi của đồ án là xây dựng một ứng dụng web phục vụ luyện tập và hỗ trợ tự học. Điểm số và mức CEFR do AI ước lượng được sử dụng để cung cấp phản hồi học tập, không thay thế kết quả của kỳ thi Aptis chính thức. Đồ án tập trung vào quá trình tích hợp, kiểm soát dữ liệu và tổ chức trải nghiệm người dùng; không thực hiện huấn luyện mô hình ngôn ngữ lớn từ đầu.

### 3.1.2. Các tác nhân của hệ thống

Hệ thống phân quyền theo hai vai trò chính là người học và quản trị viên. Bên cạnh đó, khách chưa đăng nhập có thể tiếp cận các nội dung công khai và thực hiện đăng ký tài khoản. Các dịch vụ AI, lưu trữ đa phương tiện và gửi thư điện tử là những thành phần bên ngoài được hệ thống sử dụng để hoàn thành nghiệp vụ.

**Bảng 3.1. Các tác nhân và phạm vi tương tác với hệ thống**

| Tác nhân | Phạm vi tương tác |
| --- | --- |
| Khách | Xem nội dung công khai, tiếp cận danh sách đề, đăng ký và đăng nhập. |
| Người học | Làm bài, xem kết quả, quản lý lịch sử và từ vựng, sử dụng chatbot, theo dõi mục tiêu và kế hoạch học tập. |
| Quản trị viên | Quản lý tài khoản, nội dung đề, chủ đề, học liệu, thống kê và các chức năng quản trị được phân quyền. |
| Dịch vụ AI | Tiếp nhận dữ liệu được backend chuẩn bị, nhận dạng tiếng nói, đánh giá bài làm hoặc sinh phản hồi. |
| Dịch vụ lưu trữ và thư điện tử | Lưu trữ ảnh, âm thanh và hỗ trợ gửi thông tin xác thực, khôi phục tài khoản. |

Việc xác định quyền truy cập được thực hiện tại backend. Giao diện chỉ hiển thị các chức năng phù hợp với vai trò, nhưng không được sử dụng như lớp kiểm soát quyền duy nhất. Đối với dữ liệu cá nhân như bài làm, lịch sử trò chuyện và kế hoạch học tập, hệ thống kiểm tra cả trạng thái xác thực lẫn quyền sở hữu dữ liệu.

### 3.1.3. Yêu cầu chức năng

**a) Quản lý tài khoản**

Hệ thống cho phép người dùng đăng ký, xác thực tài khoản theo quy trình của ứng dụng, đăng nhập, đăng xuất, khôi phục mật khẩu và cập nhật thông tin cá nhân. Các trường bắt buộc được kiểm tra trước khi gửi yêu cầu và được xác thực lại tại backend. Mật khẩu mới khi đăng ký hoặc thay đổi phải đáp ứng yêu cầu về độ dài và thành phần ký tự. Quy tắc mới không làm mất khả năng đăng nhập của các tài khoản đã được tạo trước đó.

**b) Quản lý và khai thác ngân hàng đề**

Quản trị viên có thể tạo, chỉnh sửa và quản lý trạng thái xuất bản của đề. Nội dung được tổ chức theo kỹ năng, chế độ làm bài và từng phần thi. Tùy loại câu hỏi, đề có thể chứa đoạn văn, lựa chọn, âm thanh, hình ảnh, lời giải và câu trả lời tham khảo. Người học được cung cấp danh sách đề đã xuất bản, chức năng tìm kiếm, phân trang và trạng thái làm bài tương ứng với tài khoản của mình.

**c) Làm bài và xem kết quả**

Hệ thống hỗ trợ luyện tập theo từng phần và làm bài đầy đủ theo cấu hình đề. Trong quá trình thực hiện, câu trả lời được lưu gắn với lượt làm bài. Sau khi nộp, hệ thống hoàn tất dữ liệu cần chấm, xác định phương thức đánh giá và cung cấp kết quả phù hợp. Người học có thể xem tổng quan, mở chi tiết từng câu và thực hiện lượt luyện tập mới.

Đối với Writing và Speaking, quá trình chấm AI được xử lý nền. Giao diện thể hiện trạng thái đang chấm, hoàn thành hoặc chưa thể hoàn thành. Kết quả chính và kết quả tham khảo được phân biệt rõ, cho phép người học chuyển đổi để xem mà không làm thay đổi bài làm đã nộp.

**d) Hỗ trợ tự học và cá nhân hóa**

Hệ thống tổng hợp lịch sử, điểm số và bằng chứng học tập để hỗ trợ nhận diện nội dung cần ôn luyện. Người học có thể thiết lập mục tiêu, theo dõi kế hoạch, xem lại câu sai và tham khảo giải thích có liên kết với học liệu. Các chức năng tra cứu từ vựng và luyện nghe chép chính tả bổ sung hoạt động học bên ngoài các lượt thi thử.

**e) Trợ lý học tập và quản trị**

Chatbot hỗ trợ trao đổi theo ngữ cảnh, khai thác học liệu và dữ liệu học tập được phép truy cập. Quản trị viên có các màn hình theo dõi hoạt động, quản lý nội dung và kiểm tra dữ liệu phục vụ truy xuất. Những thao tác ảnh hưởng đến nội dung hoặc dữ liệu hệ thống được giới hạn theo vai trò.

### 3.1.4. Yêu cầu phi chức năng

Về tính toàn vẹn, bài làm đã nộp phải được bảo toàn trong thời gian chấm, kể cả khi dịch vụ AI gặp lỗi. Kết quả của các nhà cung cấp cần được lưu tách biệt để tránh ghi đè không chủ đích. Việc quản lý phiên bản đề phải hỗ trợ xem lại nội dung tương ứng với thời điểm người học bắt đầu bài thi.

Về khả năng đáp ứng, thao tác nộp bài không nên phụ thuộc vào thời gian hoàn thành của một yêu cầu AI kéo dài. Các truy vấn danh sách và thống kê thường xuyên được tổ chức theo hướng tái sử dụng dữ liệu, đồng thời vẫn bảo đảm phân tách thông tin cá nhân. Khi Redis không sẵn sàng, ứng dụng cần có khả năng đọc dữ liệu từ cơ sở dữ liệu chính.

Về bảo mật, mật khẩu và khóa dịch vụ phải được quản lý ở phía máy chủ; dữ liệu cá nhân chỉ được truy cập theo quyền phù hợp. Nội dung do người học nhập được xem là dữ liệu cần xử lý, không được phép thay thế chỉ dẫn đánh giá của hệ thống. Nhật ký vận hành ưu tiên ghi mã lỗi, giai đoạn xử lý và vị trí dữ liệu không hợp lệ thay vì ghi toàn bộ bài làm hoặc thông tin xác thực.

Về khả năng sử dụng, giao diện cần thống nhất giữa các kỹ năng, hỗ trợ tiếng Việt và tiếng Anh, chế độ sáng và tối, đồng thời thích ứng với kích thước màn hình. Về bảo trì, các chức năng cần được phân chia thành các mô-đun và có kiểm thử tương ứng; thay đổi cấu trúc dữ liệu được quản lý bằng migration.

### 3.1.5. Biểu đồ ca sử dụng và các kịch bản chính

Các ca sử dụng được tổ chức quanh hai nhóm nghiệp vụ: học tập của người dùng và quản trị nội dung. Trong đó, ca sử dụng làm bài là trung tâm, liên kết với chọn đề, lưu tiến độ, nộp bài, đánh giá và xem kết quả. Các chức năng lịch sử, thống kê và cá nhân hóa tiếp tục khai thác dữ liệu được tạo ra từ quy trình này.

[Chèn biểu đồ ca sử dụng tổng quan tại đây]

**Hình 3.1. Biểu đồ ca sử dụng tổng quan của AptiMate**

*Mô tả: Thể hiện khách, người học, quản trị viên và các nhóm chức năng tương ứng; dịch vụ AI được biểu diễn như tác nhân hỗ trợ bên ngoài.*

**Bảng 3.2. Đặc tả rút gọn ca sử dụng làm bài và xem kết quả**

| Thành phần | Nội dung |
| --- | --- |
| Tác nhân chính | Người học. |
| Điều kiện trước | Người học đã đăng nhập và đề có thể được truy cập theo quy định của hệ thống. |
| Luồng chính | Chọn đề; tạo hoặc tiếp tục lượt làm; nhập câu trả lời hoặc ghi âm; nộp bài; hệ thống đánh giá; mở kết quả. |
| Luồng thay thế | Bài chấm AI tiếp tục xử lý nền; người học rời trang và xem lại trong lịch sử. |
| Luồng ngoại lệ | Dữ liệu đầu vào không hợp lệ, lỗi tải âm thanh, dịch vụ AI không sẵn sàng hoặc kết quả không vượt qua kiểm tra. |
| Điều kiện sau | Bài làm được lưu; kết quả hoặc trạng thái chấm được gắn với đúng lượt làm và đúng người học. |

## 3.2. Kiến trúc tổng thể của hệ thống

### 3.2.1. Tổ chức các thành phần

AptiMate được triển khai theo kiến trúc ứng dụng web phân tầng. Frontend xây dựng bằng React, đảm nhiệm hiển thị và tương tác. Backend sử dụng NestJS, tiếp nhận yêu cầu API, kiểm tra dữ liệu, phân quyền và điều phối nghiệp vụ. PostgreSQL là nơi lưu trữ dữ liệu chính; phần mở rộng pgvector phục vụ biểu diễn và truy xuất vector. Redis được sử dụng làm bộ nhớ đệm cho những dữ liệu có thể tái sử dụng trong một khoảng thời gian ngắn.

Backend được tổ chức thành các mô-đun nghiệp vụ trong cùng ứng dụng, thay vì tách toàn bộ chức năng thành các dịch vụ độc lập. Các worker đảm nhiệm những công việc có thời gian xử lý dài, chẳng hạn chấm bài và cập nhật dữ liệu phục vụ truy xuất. Cách tổ chức này phù hợp với quy mô đồ án, giúp giảm yêu cầu vận hành nhưng vẫn phân biệt được trách nhiệm của từng thành phần.

Các dịch vụ bên ngoài bao gồm Google Gemini, Groq, Cloudinary và dịch vụ thư điện tử. Khóa truy cập được cấu hình ở backend. Frontend nhận dữ liệu nghiệp vụ từ API của AptiMate, không trực tiếp sử dụng khóa chấm bài của nhà cung cấp.

[Chèn sơ đồ kiến trúc tại đây]

**Hình 3.2. Kiến trúc tổng thể hệ thống AptiMate**

*Mô tả: Minh họa quan hệ giữa trình duyệt, React, NestJS, PostgreSQL/pgvector, Redis, worker và các dịch vụ AI, lưu trữ đa phương tiện, thư điện tử.*

### 3.2.2. Luồng xử lý tổng quát

Một lượt làm bài bắt đầu khi frontend gửi yêu cầu tạo lượt làm tới backend. Backend xác thực người dùng, kiểm tra đề và liên kết lượt làm với phiên bản nội dung phù hợp. Các câu trả lời phát sinh được lưu trong quá trình thực hiện. Khi người học nộp bài, backend kiểm tra trạng thái, hoàn tất dữ liệu và chuyển sang bước đánh giá.

Với các kỹ năng có đáp án xác định, kết quả được tính từ dữ liệu đề và bài làm. Với các kỹ năng cần AI, backend tạo công việc xử lý nền và trả trạng thái tiếp nhận. Worker chuẩn bị đầu vào, gọi dịch vụ, kiểm tra đầu ra và lưu kết quả. Frontend truy vấn trạng thái định kỳ để cập nhật tiến trình. Việc chuyển tab hoặc chuyển nhà cung cấp trên giao diện chỉ thay đổi dữ liệu đang xem, không có ý nghĩa khởi tạo lại một yêu cầu chấm.

[Chèn biểu đồ tuần tự tại đây]

**Hình 3.3. Biểu đồ tuần tự nộp bài và nhận kết quả**

*Mô tả: Thể hiện hai nhánh chấm theo đáp án và chấm AI bất đồng bộ, cùng quá trình frontend truy vấn trạng thái sau khi nộp bài.*

### 3.2.3. Môi trường triển khai và quản lý cấu hình

Dự án sử dụng Docker Compose để tổ chức môi trường chạy các thành phần cần thiết. Cấu hình phát triển hỗ trợ cập nhật mã nguồn và khởi động lại tiến trình tương ứng; cấu hình chạy bản build phục vụ việc kiểm tra trên phiên bản đã biên dịch. Cơ sở dữ liệu sử dụng volume để duy trì dữ liệu khi container được tạo lại.

Cấu hình kết nối, khóa API và thông tin xác thực được tách khỏi mã nguồn. Các tệp ví dụ mô tả tên biến cần thiết, còn giá trị bí mật không được đưa vào tài liệu hoặc hệ thống quản lý phiên bản. Migration được chạy có chủ đích khi cập nhật cấu trúc cơ sở dữ liệu; việc khởi động container không được đồng nhất với việc tạo lại dữ liệu.

[Chèn sơ đồ triển khai tại đây]

**Hình 3.4. Sơ đồ triển khai các thành phần của AptiMate**

*Mô tả: Thể hiện trình duyệt, các container ứng dụng và dữ liệu, volume lưu trữ cùng kết nối ra các dịch vụ bên ngoài.*

## 3.3. Thiết kế cơ sở dữ liệu

### 3.3.1. Phân nhóm dữ liệu

Cơ sở dữ liệu được thiết kế theo các nhóm nghiệp vụ có quan hệ với nhau. Nhóm tài khoản quản lý danh tính và phiên truy cập. Nhóm đề và bài làm lưu nội dung luyện tập, phiên bản đề và kết quả. Nhóm học tập cá nhân lưu mục tiêu, bằng chứng và kế hoạch. Nhóm tri thức hỗ trợ truy xuất học liệu, còn nhóm công việc AI ghi nhận trạng thái xử lý và thông tin phục vụ theo dõi vận hành.

**Bảng 3.3. Các nhóm bảng chính trong cơ sở dữ liệu**

| Nhóm | Các bảng tiêu biểu | Vai trò |
| --- | --- | --- |
| Tài khoản | `users`, `roles`, `refresh_tokens`, `password_reset_tokens` | Danh tính, vai trò, phiên truy cập và khôi phục tài khoản. |
| Ngân hàng đề | `tests`, `questions`, `test_snapshots`, `learning_topics`, `question_topics` | Nội dung đề, câu hỏi, phiên bản và chủ đề. |
| Lượt làm bài | `test_attempts`, `attempt_progress`, `speech_analyses` | Trạng thái lượt làm, câu trả lời và dữ liệu phân tích nói. |
| Chấm AI | `writing_grading_jobs`, `speaking_grading_jobs`, `reference_ai_jobs`, `reference_ai_calls` | Công việc chấm chính, chấm tham khảo và lịch sử gọi dịch vụ. |
| Cá nhân hóa | `learning_goals`, `learning_evidence`, `learner_topic_states`, `study_plans`, `study_plan_items` | Mục tiêu, trạng thái học tập và lộ trình. |
| Tri thức và truy xuất | `knowledge_documents`, `knowledge_chunks`, `question_embeddings`, `learner_error_chunks` | Học liệu, đoạn văn bản và biểu diễn vector. |
| Giải thích và theo dõi | `mistake_explanations`, `retrieval_gaps`, `ai_requests` | Giải thích câu sai, thiếu hụt truy xuất và thông tin yêu cầu AI. |
| Chức năng bổ trợ | `chat_sessions`, `chat_messages`, `vocabulary_folders`, `vocabulary_entries`, `notifications` | Hội thoại, từ vựng và thông báo. |

[Chèn sơ đồ quan hệ thực thể tại đây]

**Hình 3.5. Sơ đồ quan hệ các nhóm dữ liệu chính**

*Mô tả: Tập trung vào liên kết người dùng – lượt làm – phiên bản đề – kết quả, cùng các nhóm dữ liệu AI, học liệu và kế hoạch học tập.*

### 3.3.2. Quản lý phiên bản đề và bài làm

Nội dung đề có thể được quản trị viên cập nhật trong quá trình vận hành. Vì vậy, hệ thống sử dụng bản chụp nội dung đề để gắn với lượt làm bài. Bản chụp cung cấp căn cứ cho quá trình chấm và xem lại, hạn chế tình trạng bài làm cũ bị đối chiếu với đáp án đã thay đổi.

Dữ liệu tiến độ được lưu riêng với thông tin tổng quan của lượt làm. Khi nộp bài, dữ liệu phục vụ chấm được hoàn tất trước khi tạo công việc AI. Sự phân tách giữa nội dung đề, dữ liệu bài làm và kết quả cho phép quản lý rõ trạng thái của từng bước, đồng thời hỗ trợ xử lý lại khi có lỗi mà không yêu cầu người học nhập lại câu trả lời.

Một người dùng có thể có nhiều lượt làm đối với cùng một đề. Do đó, kết quả được gắn với định danh lượt làm, thay vì lưu trực tiếp vào bản ghi đề. Lịch sử học tập được tổng hợp từ các lượt làm thuộc người dùng đang xác thực.

### 3.3.3. Lưu kết quả AI và dữ liệu truy xuất

Kết quả chấm AI bao gồm điểm, nhận xét, bằng chứng, thông tin phiên bản và trạng thái đánh giá. Dữ liệu có cấu trúc linh hoạt được biểu diễn bằng JSON, trong khi các trường phục vụ liên kết, lọc và quản lý trạng thái vẫn được lưu theo cấu trúc quan hệ. Tuy nhiên, việc sử dụng JSON không thay thế bước kiểm tra cấu trúc và quy tắc nghiệp vụ trước khi ghi kết quả.

Các kết quả trung gian của quy trình chấm Writing theo phần được lưu trong dữ liệu công việc. Chỉ những phần đã vượt qua kiểm tra mới được sử dụng làm điểm tiếp tục. Khi một phần sau gặp lỗi, worker có thể sử dụng lại những phần hợp lệ trước đó nếu dữ liệu đầu vào và phiên bản xử lý vẫn tương thích.

Đối với RAG, học liệu được chia thành các đoạn và gắn thông tin nguồn. Vector của học liệu, câu hỏi và lỗi học tập được tổ chức theo phạm vi sử dụng. Dữ liệu lỗi cá nhân phải được lọc theo người sở hữu; không được đưa vào phạm vi truy xuất dùng chung như tài liệu công khai. Các công việc cập nhật vector giúp theo dõi nội dung chưa được lập chỉ mục hoặc không còn phù hợp với phiên bản hiện tại.

## 3.4. Thiết kế và triển khai các chức năng chính

### 3.4.1. Xác thực và quản lý truy cập

Quy trình đăng nhập kiểm tra thông tin tài khoản và tạo phiên truy cập theo cơ chế token. Backend tiếp nhận token để xác định người dùng và vai trò trước khi xử lý các API được bảo vệ. Token làm mới được quản lý để hỗ trợ duy trì phiên theo chính sách của ứng dụng.

Đối với đăng ký và thay đổi mật khẩu, hệ thống kiểm tra các trường bắt buộc và quy tắc mật khẩu. Giao diện cung cấp thông báo phù hợp, kết hợp tooltip để giải thích yêu cầu mà không làm bố cục biểu mẫu trở nên quá dài. Thao tác đăng xuất có bước xác nhận nhằm hạn chế việc kết thúc phiên do nhấn nhầm.

Ngoài kiểm tra vai trò, những API truy vấn bài làm và hội thoại sử dụng danh tính từ phiên xác thực để kiểm tra quyền sở hữu. Cách triển khai này tránh phụ thuộc vào một định danh người dùng do phía trình duyệt tự cung cấp.

### 3.4.2. Quản lý đề và tổ chức làm bài

Nội dung bài tập được tổ chức theo kỹ năng và dạng câu hỏi. Listening sử dụng âm thanh và các dạng chọn, ghép thông tin; Reading khai thác văn bản cùng các thao tác trả lời phù hợp; Grammar & Vocabulary đối chiếu đáp án theo cấu trúc đề. Writing nhận văn bản tự do, còn Speaking nhận bản ghi âm của người học.

Các chế độ luyện tập và thi thử sử dụng chung những thành phần cơ bản nhưng khác nhau về phạm vi và hỗ trợ trong quá trình thực hiện. Với luyện tập, hệ thống có thể cung cấp chức năng xem đáp án theo cấu hình. Thông tin hỗ trợ đã sử dụng cần được lưu cùng bài làm để không diễn giải kết quả như một lượt làm hoàn toàn độc lập khi người học đã xem lời giải.

Kết quả của các kỹ năng khách quan được trình bày bằng tổng quan đáp án và phần xem lại chi tiết. Những câu chưa làm được phân biệt với câu trả lời đúng hoặc sai. Việc chấm dựa trên đáp án đã lưu, không cần gọi mô hình ngôn ngữ cho mỗi lượt tính điểm.

### 3.4.3. Quy trình đánh giá Writing bằng AI

**a) Chuẩn bị dữ liệu**

Đầu vào chấm Writing được xây dựng từ bản chụp đề, bài làm đã nộp, phạm vi đánh giá và các thông tin hỗ trợ liên quan. Prompt quy định nhiệm vụ, rubric, cách diễn giải nhận xét và cấu trúc kết quả. Bài làm của người học được phân biệt với chỉ dẫn của hệ thống để hạn chế ảnh hưởng của những câu mang tính yêu cầu hoặc điều khiển xuất hiện trong nội dung bài viết.

Ở cấu hình mã nguồn được khảo sát, mô hình chính của Writing là Gemini 3.5 Flash-Lite, mã `gemini-3.5-flash-lite`. Hệ thống còn tích hợp `openai/gpt-oss-120b` thông qua Groq để cung cấp kết quả tham khảo. Các mô hình được gọi qua API; đồ án không điều chỉnh trọng số của chúng bằng fine-tuning.

**b) Chấm từng phần và tổng hợp**

Một bài Writing đầy đủ được xử lý theo từng phần. Worker gửi nội dung của phần cần chấm, nhận kết quả và kiểm tra tính hợp lệ. Khi phần đó hoàn tất, kết quả trung gian được lưu trước khi xử lý phần tiếp theo. Sau khi các phần cần thiết đã có kết quả, bước tổng hợp được thực hiện để hình thành đánh giá chung.

Cách tổ chức này làm giảm lượng nội dung cần xử lý trong một yêu cầu so với việc gửi toàn bộ bài và tất cả phản hồi trong một lần. Đồng thời, nó hỗ trợ tiếp tục từ phần chưa hoàn thành. Tuy nhiên, số lượt gọi tăng lên và bước tổng hợp vẫn cần được kiểm soát về dung lượng, vì các nhận xét trung gian có thể tạo thành đầu vào dài.

[Chèn lưu đồ chấm Writing tại đây]

**Hình 3.6. Quy trình chấm Writing theo từng phần và tổng hợp**

*Mô tả: Thể hiện chuẩn bị dữ liệu, chấm từng phần, kiểm tra và lưu kết quả trung gian, tổng hợp, xử lý lỗi và công bố kết quả.*

**c) Kiểm tra đầu ra**

Kết quả AI được kiểm tra theo nhiều mức. Trước hết là cấu trúc JSON, kiểu dữ liệu và các trường bắt buộc. Tiếp theo là phạm vi điểm, khóa câu hỏi, tiêu chí và sự tương thích giữa kết quả với đề. Cuối cùng là kiểm tra bằng chứng được sử dụng trong nhận xét.

Một nhận xét có dẫn chứng cần liên hệ được với nội dung bài làm. Nếu mô hình đưa ra câu trích không tồn tại hoặc nêu lỗi mà không cung cấp bằng chứng theo quy định, đầu ra bị từ chối. Việc tham chiếu bằng định danh và đối chiếu với dữ liệu gốc giúp giảm phụ thuộc vào khả năng sao chép nguyên văn của mô hình. Tuy nhiên, kiểm tra sự tồn tại của bằng chứng chưa đủ để khẳng định nhận xét về bằng chứng đó luôn đúng về chuyên môn.

Khi đầu ra không hợp lệ, hệ thống lưu loại lỗi và vị trí liên quan để phục vụ kiểm tra. Cơ chế thử lại có giới hạn nhằm tránh lặp vô hạn. Nếu đã vượt giới hạn, trạng thái chấm chuyển sang thất bại; bài làm và kết quả trung gian vẫn là căn cứ để xử lý tiếp theo chính sách của hệ thống. Những phần đã chấm không được tự công bố như một kết quả toàn bài hoàn chỉnh khi bước tổng hợp chưa thành công.

### 3.4.4. Quy trình đánh giá Speaking

Đối với Speaking, frontend ghi nhận âm thanh trả lời và gửi dữ liệu theo câu hỏi. Backend kiểm tra nguồn, tải và chuẩn hóa âm thanh trước khi xử lý. Dịch vụ nhận dạng sử dụng `whisper-large-v3` qua Groq để tạo bản chép lời tiếng Anh. Bản chép lời này là kết quả nhận dạng tiếng nói, không phải bản dịch sang ngôn ngữ khác.

Ở phiên bản mã nguồn được khảo sát, nhánh chấm chính sử dụng `gemini-3.1-flash-lite`. Yêu cầu đánh giá được xây dựng từ đề, bản chép lời, dữ liệu âm thanh thực tế và ảnh của câu hỏi khi có. Mô hình vì vậy có thể tiếp cận cả nội dung ngôn ngữ và tín hiệu âm thanh; bản chép lời đóng vai trò hỗ trợ, không thay thế hoàn toàn âm thanh khi nhận xét phát âm hoặc độ trôi chảy. Luồng chính hiện chuẩn bị một yêu cầu đánh giá cho phạm vi bài làm, khác với quy trình chia phần của Writing.

Kết quả Speaking được tổ chức theo bốn nhóm tiêu chí: Grammar & Vocabulary, Pronunciation, Fluency và Task Fulfillment. Ngoài điểm, hệ thống cung cấp nhận xét, nội dung gợi ý chỉnh sửa và câu trả lời tham khảo nếu đề có dữ liệu tương ứng. Câu trả lời tham khảo do quản trị viên nhập được phân biệt với nội dung do AI đề xuất.

[Chèn lưu đồ xử lý Speaking tại đây]

**Hình 3.7. Quy trình xử lý bản ghi âm và đánh giá Speaking**

*Mô tả: Minh họa luồng ghi âm, lưu trữ, chuẩn hóa, nhận dạng bằng Whisper và đánh giá bằng Gemini với âm thanh, transcript và dữ liệu đề.*

Nhánh tham khảo Groq sử dụng nội dung văn bản được chuẩn bị từ bài làm. Do không có cùng bằng chứng âm thanh với nhánh Gemini, những nhận xét suy ra từ transcript không được xem là phép đo trực tiếp về phát âm, nhịp nói hoặc khoảng dừng. Sự khác biệt về đầu vào này cần được tính đến khi so sánh hai kết quả.

Đối với bài đầy đủ nhưng bỏ qua một số câu, hệ thống vẫn cần đánh giá theo phạm vi toàn bài và phản ánh mức độ hoàn thành trong kết quả. Điểm luyện tập và CEFR ước lượng có liên hệ nhưng không được đồng nhất bằng một phép quy đổi đơn giản. Một điểm số nội bộ không tự động chứng minh người học đã đạt mức năng lực tương ứng trong kỳ thi chính thức.

### 3.4.5. Điều phối công việc chấm và quản lý kết quả

Các công việc chấm được lưu trong PostgreSQL để theo dõi trạng thái, số lần xử lý, thời điểm có thể chạy tiếp và kết quả trung gian. Worker tiếp nhận công việc phù hợp, thực hiện xử lý và cập nhật trạng thái. Redis trong phạm vi cache được trình bày ở đây không thay thế nơi lưu trữ bền vững của các công việc chấm.

Lỗi dịch vụ được phân biệt với lỗi nội dung. HTTP 503 thể hiện yêu cầu không được dịch vụ đáp ứng tại thời điểm gọi; HTTP 429 liên quan đến giới hạn sử dụng trong cửa sổ thời gian. Một yêu cầu vượt giới hạn dung lượng token có thể bị từ chối ngay và không được giải quyết chỉ bằng cách chờ. Với lỗi cấu trúc hoặc bằng chứng, cần điều chỉnh dữ liệu, schema hoặc chỉ dẫn xử lý theo loại lỗi cụ thể.

Nhánh Gemini và Groq có trạng thái riêng. Gemini được sử dụng làm nguồn kết quả chính cho lịch sử và thống kê, còn Groq là nguồn tham khảo. Lỗi của nhánh tham khảo không làm mất kết quả chính đã hoàn thành. Trên giao diện, người học có thể đổi nguồn xem kết quả nhưng không thay đổi nguồn điểm được sử dụng để tổng hợp lịch sử.

### 3.4.6. Chatbot và truy xuất tri thức

Chatbot của AptiMate được tổ chức theo phiên hội thoại, lưu câu hỏi và câu trả lời để người học có thể xem lại. Khi gửi tin nhắn, giao diện hiển thị câu hỏi ngay và thể hiện trạng thái chờ phản hồi. Cách tương tác này giúp người học nhận biết yêu cầu đã được tiếp nhận, kể cả khi dịch vụ AI chưa hoàn tất.

Để hỗ trợ câu trả lời có căn cứ, hệ thống khai thác kho tài liệu và dữ liệu học tập được phép truy cập. Học liệu được chia thành các đoạn, tạo embedding và lưu cùng thông tin nguồn. Cơ chế truy xuất kết hợp tìm kiếm từ khóa và tìm kiếm vector, sau đó hợp nhất thứ hạng bằng RRF. Các nội dung liên quan được đưa vào ngữ cảnh trước khi sinh phản hồi.

Hệ thống sử dụng mô hình embedding `gemini-embedding-001` với cấu hình vector 768 chiều cho luồng được khảo sát. Đây là mô hình biểu diễn dữ liệu phục vụ tìm kiếm, không phải mô hình trực tiếp sinh điểm hoặc nhận xét bài viết. PostgreSQL kết hợp pgvector được dùng để quản lý dữ liệu quan hệ và vector trong cùng nền tảng lưu trữ.

[Chèn sơ đồ RAG tại đây]

**Hình 3.8. Quy trình truy xuất tri thức và tạo phản hồi học tập**

*Mô tả: Thể hiện xử lý học liệu, tạo embedding, truy xuất từ khóa/vector, hợp nhất kết quả, lọc quyền truy cập và sinh phản hồi có nguồn.*

Những thông tin riêng như bài làm và thống kê cá nhân được truy cập theo phạm vi người dùng. Khi không có ngữ cảnh đủ phù hợp, hệ thống cần phản ánh giới hạn hoặc sử dụng phương án dự phòng đã thiết kế, thay vì tạo một nguồn tham khảo không tồn tại. Việc có trích dẫn được kiểm tra như một điều kiện về dữ liệu, nhưng chất lượng diễn giải vẫn cần được đánh giá bằng chuyên môn.

### 3.4.7. Cá nhân hóa và hỗ trợ ôn tập

Chức năng cá nhân hóa sử dụng mục tiêu, lịch sử và bằng chứng học tập để đề xuất nội dung luyện tập. Các trạng thái theo chủ đề giúp hệ thống tổ chức thông tin về nội dung đã học và nội dung cần củng cố. Kế hoạch học tập gồm các mục cụ thể, có thể gắn với bài luyện tập và được theo dõi trong quá trình thực hiện.

Các thành phần RAG được triển khai để hỗ trợ chọn câu hỏi liên quan, giải thích câu sai và tổng hợp lỗi học tập. Hệ thống có cơ chế dự phòng khi không tìm được dữ liệu phù hợp; việc thiếu vector hoặc thiếu học liệu không được xử lý bằng cách gán tùy ý một nguồn không tương ứng. Những chức năng này có cấu hình bật/tắt để kiểm soát quá trình áp dụng.

Khi có thêm bằng chứng từ các bài đánh giá đầu vào, kế hoạch có thể được cập nhật theo điều kiện của hệ thống, đồng thời bảo toàn phần tiến độ đã thực hiện. Tuy nhiên, việc xây dựng được cơ chế đề xuất không đồng nghĩa đã chứng minh hiệu quả cải thiện năng lực. Kết luận này cần được kiểm tra thông qua dữ liệu sử dụng và đánh giá người học trong thời gian đủ dài.

### 3.4.8. Cache danh sách đề và dashboard

Danh sách đề được tách thành hai nhóm dữ liệu. Nhóm thứ nhất là thông tin công khai của các đề đã xuất bản, được cache trong Redis trong 120 giây. Khóa cache phụ thuộc vào kỹ năng và các tham số như chế độ, từ khóa, số trang và kích thước trang. Nhóm thứ hai là trạng thái lượt làm và kết quả của người dùng, được lấy qua API có xác thực cho các định danh đề đang hiển thị.

Frontend kết hợp hai nhóm bằng định danh đề. Nhờ đó, nhiều người dùng có thể sử dụng cùng cache danh mục nhưng không chia sẻ điểm hoặc trạng thái cá nhân. Khi đổi số lượng đề trên trang, frontend lấy danh mục tương ứng và truy vấn trạng thái cho tập định danh mới.

Các thao tác quản trị nội dung thành công làm thay đổi thế hệ cache danh mục. Dữ liệu thuộc thế hệ cũ không tiếp tục được chọn cho yêu cầu mới và tự hết hạn. Cơ chế này không có nghĩa trình duyệt đang mở sẽ tự cập nhật ngay; giao diện cần thực hiện lần truy vấn tiếp theo để nhận danh sách mới.

Dashboard được cache riêng theo người dùng và tham số truy vấn với thời gian 45 giây. Khóa có thành phần phiên bản dữ liệu nhằm hỗ trợ phản ánh thay đổi sau nộp hoặc chấm bài. Khi Redis không hoạt động, hệ thống đọc từ PostgreSQL. Cache có vai trò giảm việc lặp lại truy vấn và tổng hợp; hiệu quả cụ thể về độ trễ cần được đo, không suy ra chỉ từ việc đã triển khai Redis.

[Chèn sơ đồ cache tại đây]

**Hình 3.9. Luồng kết hợp danh mục đề dùng chung và trạng thái người dùng**

*Mô tả: Minh họa API danh mục đọc Redis/PostgreSQL, API trạng thái đọc theo người dùng và bước ghép dữ liệu tại frontend.*

## 3.5. Giao diện người dùng và quản trị

### 3.5.1. Giao diện danh sách đề và làm bài

Danh sách đề cung cấp bộ lọc, tìm kiếm, phân trang và trạng thái thực hiện. Các thẻ đề thể hiện thông tin chính để người học lựa chọn, đồng thời phân biệt đề chưa làm và đề đã có kết quả. Giao diện sử dụng màu đỏ làm màu nhận diện, kết hợp hỗ trợ sáng/tối và chuyển ngôn ngữ.

[Chèn ảnh giao diện danh sách đề tại đây]

**Hình 3.10. Giao diện danh sách đề của AptiMate**

*Mô tả: Minh họa bộ lọc theo kỹ năng/phần thi, tìm kiếm và trạng thái bài làm của người dùng.*

Trang làm bài được bố trí theo đặc thù kỹ năng. Listening có trình phát âm thanh; Speaking có chức năng ghi âm; Writing có vùng nhập nội dung; các kỹ năng khách quan có nhóm điều khiển lựa chọn hoặc ghép đáp án. Các thành phần điều hướng và nộp bài được tổ chức nhất quán để giảm thời gian làm quen.

[Chèn ảnh trang làm bài tại đây]

**Hình 3.11. Giao diện thực hiện bài luyện tập**

*Mô tả: Ghép hai ảnh đại diện cho câu hỏi khách quan và bài tự luận/ghi âm, thể hiện cách bố trí đề, vùng trả lời và điều hướng.*

### 3.5.2. Giao diện kết quả Writing và Speaking

Trang kết quả tổng quan hiển thị trạng thái chấm, điểm luyện tập, CEFR ước lượng khi có đủ điều kiện và báo cáo phản hồi. Người học có thể chọn nguồn Gemini hoặc Groq. Nhãn nguồn chính và nguồn tham khảo giúp tránh nhầm lẫn khi hai mô hình đưa ra kết quả khác nhau.

Trang chi tiết cho phép chuyển phần thi và xem các nhóm nội dung: bài làm đã nộp, gợi ý chỉnh sửa và câu trả lời tham khảo. Với Speaking, người học có thể nghe lại bản ghi âm. Nhận xét theo tiêu chí được nhóm trong vùng AI Feedback, có khả năng mở rộng để xem chi tiết. Nếu đề không có đáp án tham khảo, giao diện thông báo tình trạng này thay vì tự thay thế bằng một nội dung do AI tạo.

[Chèn ảnh kết quả tổng quan tại đây]

**Hình 3.12. Giao diện kết quả đánh giá AI tổng quan**

*Mô tả: Thể hiện lựa chọn nhà cung cấp, tiến trình chấm, điểm, mức CEFR ước lượng và các tiêu chí đánh giá.*

[Chèn ảnh kết quả chi tiết tại đây]

**Hình 3.13. Giao diện phản hồi chi tiết của Writing và Speaking**

*Mô tả: Minh họa điều hướng theo phần, bài làm gốc, gợi ý chỉnh sửa, đáp án tham khảo và nhóm phản hồi theo tiêu chí.*

### 3.5.3. Giao diện theo dõi và hỗ trợ học tập

Trang lịch sử cho phép xem lại các lượt làm, phân biệt luyện tập với thi thử, lọc kỹ năng và tìm theo tên đề. Dashboard tổng hợp hoạt động và kết quả theo bộ lọc. Việc trình bày theo thời gian giúp người học quan sát quá trình luyện tập, nhưng các biến động điểm vẫn cần được hiểu trong bối cảnh độ khó đề và mức độ hoàn thành.

[Chèn ảnh lịch sử và dashboard tại đây]

**Hình 3.14. Giao diện lịch sử và dashboard của người học**

*Mô tả: Thể hiện danh sách lượt làm, bộ lọc và biểu đồ kết quả học tập; sử dụng dữ liệu đã ẩn thông tin định danh.*

Giao diện chatbot hỗ trợ gửi câu hỏi, xem phản hồi và mở lại hội thoại. Các màn hình kế hoạch, ôn câu sai và báo cáo học tập cung cấp những điểm truy cập khác nhau tới dữ liệu cá nhân hóa.

[Chèn ảnh chatbot và kế hoạch tại đây]

**Hình 3.15. Giao diện trợ lý và kế hoạch học tập**

*Mô tả: Minh họa hội thoại có ngữ cảnh cùng danh sách nhiệm vụ học tập và trạng thái hoàn thành.*

### 3.5.4. Giao diện quản trị

Quản trị viên sử dụng các màn hình riêng để quản lý nội dung, tài khoản và theo dõi hoạt động. Bộ tạo đề cung cấp các trường phù hợp từng kỹ năng, bao gồm tài nguyên đa phương tiện và câu trả lời mẫu khi cần. Các chức năng quản trị RAG hỗ trợ kiểm tra độ phủ dữ liệu, trạng thái lập chỉ mục và các trường hợp thiếu hụt truy xuất.

[Chèn ảnh giao diện quản trị tại đây]

**Hình 3.16. Giao diện quản trị nội dung và dữ liệu hỗ trợ AI**

*Mô tả: Minh họa trang quản lý đề, bộ tạo đề và màn hình theo dõi RAG bằng các ảnh thành phần có chú thích.*

## 3.6. Thực nghiệm và đánh giá kết quả

### 3.6.1. Mục tiêu và phạm vi thực nghiệm

Thực nghiệm được tổ chức theo ba nhóm. Nhóm thứ nhất kiểm tra chức năng và tính toàn vẹn của các luồng nghiệp vụ. Nhóm thứ hai khảo sát khả năng hoàn thành quy trình chấm Writing bằng các mô hình API. Nhóm thứ ba đánh giá chẩn đoán khả năng truy xuất học liệu và câu hỏi của thành phần RAG.

Ba nhóm có ý nghĩa khác nhau. Kiểm thử chức năng xác nhận hành vi của phần mềm trong các tình huống được xây dựng. Benchmark chấm AI ghi nhận yêu cầu được xử lý và đầu ra vượt qua bộ kiểm tra, không trực tiếp chứng minh điểm chấm đúng với đánh giá chuyên gia. Thực nghiệm truy xuất đo mức phù hợp theo nhãn hiện có, nhưng chỉ trở thành bằng chứng độc lập khi bộ nhãn được thẩm định phù hợp.

### 3.6.2. Môi trường và dữ liệu thực nghiệm

Hệ thống được phát triển và kiểm tra trong môi trường cục bộ với frontend React/Vite, backend NestJS/TypeScript, PostgreSQL và Redis. Các thành phần có thể được chạy thông qua Docker Compose. Việc đánh giá sử dụng kiểm thử đơn vị, các kịch bản tích hợp cơ sở dữ liệu, kiểm thử giao diện và những lượt gọi API được ghi nhận trong báo cáo benchmark.

**Bảng 3.4. Thành phần và vai trò trong môi trường kiểm thử**

| Thành phần | Vai trò |
| --- | --- |
| React, Vite | Chạy và kiểm tra giao diện web. |
| NestJS, TypeScript | Thực hiện API, nghiệp vụ và worker. |
| PostgreSQL, pgvector | Kiểm tra lưu trữ, quan hệ dữ liệu và truy xuất vector. |
| Redis | Kiểm tra cache, thời gian tồn tại và cơ chế dự phòng. |
| Jest và các script tích hợp | Kiểm tra logic và tương tác cơ sở dữ liệu. |
| Kiểm thử trình duyệt | Kiểm tra tương tác, ngôn ngữ và bố cục theo các kịch bản. |
| API Gemini, Groq | Khảo sát hoạt động chấm bài với dịch vụ thật trong đợt benchmark. |

Dữ liệu chức năng gồm các đề mẫu và dữ liệu thử được xây dựng cho từng kịch bản. Những thử nghiệm cơ sở dữ liệu cách ly không được diễn giải như hoạt động học của người dùng thật. Đối với benchmark Writing ngày 26/11/2026, năm lượt làm được lựa chọn và đánh giá bằng sáu cấu hình mô hình, tạo thành 30 trường hợp thử. Điểm benchmark không được ghi đè vào kết quả học tập; báo cáo ghi nhận giá trị kiểm tra kết quả gốc không thay đổi.

Đối với RAG, tập phát triển gồm 60 mẫu truy xuất học liệu, phân bố đều cho Grammar & Vocabulary, Reading và Listening. Trong đó có 37 mẫu được dùng cho bảng truy xuất câu hỏi theo các cặp liên quan hiện có. Tập này chưa có mẫu Writing và Speaking; đồng thời chưa có mẫu nào đủ điều kiện làm bộ chuẩn độc lập. Vì vậy, kết quả được sử dụng để chẩn đoán hệ thống trong quá trình phát triển.

### 3.6.3. Tiêu chí đánh giá

Với chức năng nghiệp vụ, tiêu chí chính là sự phù hợp giữa kết quả thực tế và kết quả mong đợi, bao gồm quyền truy cập, trạng thái xử lý, dữ liệu được lưu và hành vi khi có lỗi. Những trường hợp thiếu quyền, mất kết nối, dữ liệu không hợp lệ hoặc gọi lặp cần được xem xét cùng luồng xử lý thành công.

Với chấm AI, một trường hợp được ghi nhận thành công khi hoàn thành các bước cần thiết và đầu ra vượt qua bộ kiểm tra của hệ thống. Tỷ lệ hoàn thành được tính như sau:

$$
R_{complete}=\frac{N_{valid}}{N_{cases}}\times100\% \qquad (3.1)
$$

Trong đó, $N_{valid}$ là số trường hợp có kết quả hợp lệ và $N_{cases}$ là tổng số trường hợp thử. Chẳng hạn, nếu hai trong năm bài hoàn thành thì tỷ lệ bằng 40%. Một bài có nhiều yêu cầu API thành công nhưng thất bại ở bước tổng hợp vẫn được tính là chưa hoàn thành ở mức toàn bài.

Với truy xuất, Recall@k được tính theo tỷ lệ phần tử liên quan đã gán nhãn xuất hiện trong k kết quả đầu, sau đó lấy trung bình trên các truy vấn được đánh giá. MRR phản ánh vị trí của kết quả liên quan đầu tiên; kết quả xuất hiện càng sớm thì giá trị càng cao. Đơn vị đánh giá của kho học liệu là tài liệu sau khi loại trùng các đoạn, còn đơn vị của kho câu hỏi là câu hỏi.

Bên cạnh tỷ lệ, các mã lỗi và giai đoạn thất bại được ghi nhận để phân biệt vấn đề dịch vụ, giới hạn tài nguyên và vấn đề dữ liệu đầu ra. Những yêu cầu bị lỗi sớm không được dùng để kết luận mô hình có tốc độ chấm tốt hơn, bởi chúng chưa hoàn thành cùng khối lượng công việc.

### 3.6.4. Kết quả kiểm thử chức năng

Đợt kiểm chứng thành phần RAG và cá nhân hóa ngày 14/11/2026 ghi nhận 318 kiểm thử đơn vị trong 27 bộ kiểm thử cùng một snapshot đạt yêu cầu. Ngoài ra, 11 kịch bản DB/API và 12 trường hợp kiểm thử trình duyệt được báo cáo đạt. Các ca trình duyệt sử dụng dữ liệu API mô phỏng; đợt kiểm chứng này không gọi nhà cung cấp AI thật. Vì vậy, các số liệu phản ánh phạm vi thành phần được kiểm tra, không phải tỷ lệ thành công của toàn bộ hệ thống với dịch vụ bên ngoài.

**Bảng 3.5. Phạm vi kiểm chứng chức năng đã được ghi nhận**

| Nhóm kiểm tra | Nội dung đã kiểm tra | Kết quả và giới hạn |
| --- | --- | --- |
| Truy xuất | Bộ lọc, vector, hợp nhất thứ hạng và trạng thái dữ liệu | Đạt trong các kịch bản kiểm thử; chưa đồng nghĩa nhãn đánh giá đạt chuẩn độc lập. |
| Giải thích câu sai | Quyền sở hữu, cache, nguồn, thử lại và phương án dự phòng | Đạt về luồng chức năng; chất lượng giải thích cần đánh giá chuyên môn. |
| Kế hoạch học tập | Chọn đề, cập nhật sau đánh giá đầu vào, bảo toàn tiến độ và xử lý lặp | Đạt trong các kịch bản tích hợp. |
| Dữ liệu lỗi và báo cáo | Cách ly người dùng, nguồn căn cứ, worker và đồng bộ | Đạt trong phạm vi kiểm thử; còn tình huống dữ liệu lịch sử thiếu vector phù hợp. |
| Quản trị RAG | Phân quyền, lọc, phân trang, khóa công việc và lập chỉ mục lại | Đạt; dữ liệu vector thử được sử dụng trong kiểm thử cách ly. |
| Giao diện | Hai ngôn ngữ và các kích thước được đưa vào kịch bản | Đạt 12 ca được ghi nhận; không đại diện cho mọi thiết bị. |

Kết quả trên cho thấy các thành phần đã có cơ chế kiểm soát luồng và dữ liệu trong phạm vi đã kiểm thử. Tuy nhiên, số lượng kiểm thử đạt không được sử dụng thay cho mức độ bao phủ mã nguồn hoặc bằng chứng rằng phần mềm không còn lỗi. Những thay đổi sau thời điểm kiểm thử cần được xác nhận lại bằng bộ kiểm thử hồi quy tương ứng.

### 3.6.5. Kết quả khảo sát khả năng hoàn thành chấm Writing

Đợt khảo sát ngày 26/11/2026 sử dụng cùng năm bài Writing cho sáu mô hình. Mỗi trường hợp chạy một lần, không tự động thử lại các lỗi HTTP hoặc lỗi nội dung trong đợt đo. Quy trình sử dụng prompt và bộ kiểm tra tại thời điểm đó; số yêu cầu có thể khác nhau do một trường hợp dừng ở những giai đoạn khác nhau.

**Bảng 3.6. Kết quả benchmark Writing ngày 26/11/2026**

| Mô hình và nơi truy cập | Số bài | Số yêu cầu sinh nội dung | Bài hợp lệ | Tỷ lệ hoàn thành | Tỷ lệ chưa hoàn thành | Nguyên nhân ghi nhận ở mức bài |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Gemini 3.1 Flash-Lite – Google | 5 | 15 | 0 | 0% | 100% | 4 lỗi giá trị `cefr.level`; 1 lỗi HTTP 503. |
| Gemini 3.5 Flash-Lite – Google | 5 | 21 | 2 | 40% | 60% | 3 lỗi HTTP 503. |
| Gemini 3.6 Flash – Google | 5 | 7 | 0 | 0% | 100% | 3 lỗi HTTP 503; 2 quá thời gian chờ. |
| Gemini 3.8 Flash – Google | 5 | 5 | 0 | 0% | 100% | 4 lỗi HTTP 503; 1 quá thời gian chờ. |
| GPT-OSS 120B – Groq | 5 | 12 | 0 | 0% | 100% | 5 trường hợp dừng do giới hạn của nhà cung cấp. |
| Qwen 3.8 27B – Groq | 5 | 15 | 0 | 0% | 100% | 5 trường hợp dừng do giới hạn của nhà cung cấp. |

Tổng cộng đợt đo phát sinh 75 yêu cầu sinh nội dung. Gemini 3.5 Flash-Lite có hai bài hoàn thành trong điều kiện của đợt thử. Tuy nhiên, không thể từ đó kết luận mô hình chấm chính xác hơn các mô hình còn lại. Phần lớn trường hợp thất bại liên quan đến khả năng đáp ứng của dịch vụ hoặc giới hạn sử dụng, chưa tạo ra một kết quả hoàn chỉnh để so sánh về chất lượng.

Lỗi `cefr.level` của Gemini 3.1 Flash-Lite xuất hiện trong cấu hình schema tại thời điểm khảo sát, trước điều chỉnh schema cho phạm vi từng phần. Do đó, số liệu này mô tả hành vi của phiên bản tích hợp được thử, không phải một tỷ lệ lỗi cố định của mô hình. Việc sửa schema cần được đánh giá bằng một đợt đo mới, không được tự thay số liệu lịch sử bằng kết quả dự kiến.

Tỷ lệ lỗi của Groq cũng phải được diễn giải theo ngữ cảnh. Một bài chấm nhiều phần có thể tiêu thụ hạn mức ở các yêu cầu đầu, rồi bị chặn tại phần sau hoặc bước tổng hợp. Việc tăng số lượt cho phép trong cấu hình nội bộ không làm tăng hạn mức token do nhà cung cấp cấp cho tài khoản. Điều này cho thấy điều phối cần xét cả dung lượng token và số lượt gọi.

[Chèn biểu đồ từ Bảng 3.6 tại đây]

**Hình 3.17. Tỷ lệ hoàn thành quy trình chấm Writing trong đợt benchmark**

*Mô tả: Biểu đồ cột thể hiện số bài hợp lệ trên năm bài của từng mô hình; ghi rõ đây là khả năng hoàn thành quy trình, không phải độ chính xác chấm điểm.*

Quy mô năm bài còn nhỏ; các mô hình được gọi ở những thời điểm khác nhau và chịu trạng thái hạn mức khác nhau. Đợt đo cũng không áp dụng chính sách thử lại đầy đủ như vận hành thực tế. Vì vậy, đây là bằng chứng khảo sát khả năng tích hợp và nhận diện lỗi, chưa phải phép xếp hạng tổng quát giữa các nhà cung cấp.

### 3.6.6. Kết quả đánh giá chẩn đoán truy xuất RAG

Ba phương án truy xuất được đối chiếu gồm từ khóa, vector và hợp nhất RRF. Kết quả tổng hợp trên nhãn phát triển hiện có được trình bày trong Bảng 3.7. Các giá trị nằm trong khoảng từ 0 đến 1.

**Bảng 3.7. Kết quả truy xuất trên tập dữ liệu phát triển**

| Kho dữ liệu | Phương pháp | Số mẫu | Recall@1 | Recall@3 | Recall@5 | MRR |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Học liệu | Từ khóa | 60 | 0,0000 | 0,0000 | 0,0000 | 0,0000 |
| Học liệu | Vector | 60 | 0,8667 | 0,9333 | 1,0000 | 0,9094 |
| Học liệu | RRF | 60 | 0,8667 | 0,9333 | 1,0000 | 0,9094 |
| Câu hỏi | Từ khóa | 37 | 0,1068 | 0,1068 | 0,1068 | 0,2162 |
| Câu hỏi | Vector | 37 | 0,1676 | 0,2446 | 0,3054 | 0,4225 |
| Câu hỏi | RRF | 37 | 0,1676 | 0,2446 | 0,3054 | 0,4223 |

Ở kho học liệu, vector và RRF có kết quả tương đương trên các chỉ số được đo. Recall@5 bằng 1 chỉ phản ánh việc tìm được các tài liệu được gán nhãn trong tập phát triển; không có nghĩa mọi câu hỏi thực tế đều được truy xuất đúng. Nhánh từ khóa chưa tìm được kết quả liên quan trên tập này. Cách kết hợp điều kiện từ khóa và khác biệt ngôn ngữ giữa truy vấn với học liệu là những yếu tố cần tiếp tục khảo sát.

Ở kho câu hỏi, vector có Recall@5 bằng 0,3054 và MRR bằng 0,4225. RRF giữ nguyên các giá trị Recall được báo cáo nhưng có MRR thấp hơn nhẹ. Do đó, chưa có căn cứ từ đợt đo này để khẳng định hợp nhất RRF luôn tốt hơn truy xuất vector. Kết quả cũng cho thấy việc tìm câu hỏi tương tự còn khó hơn việc truy xuất học liệu trên tập nhãn hiện có.

Các cặp liên quan của kho câu hỏi chưa được gán nhãn đầy đủ; câu hỏi chưa có nhãn không mặc nhiên là câu hỏi sai. Dữ liệu Listening chưa được xác minh đầy đủ ở mức âm thanh, còn Writing và Speaking chưa có mẫu đánh giá trong bộ này. Toàn bộ 60 mẫu vẫn chưa đủ điều kiện sử dụng như bộ chuẩn độc lập. Vì vậy, các chỉ số được xem là chẩn đoán phát triển và không dùng để công bố độ chính xác chính thức của RAG.

[Chèn biểu đồ từ Bảng 3.7 tại đây]

**Hình 3.18. So sánh truy xuất từ khóa, vector và RRF**

*Mô tả: Biểu đồ thể hiện Recall@5 và MRR riêng cho kho học liệu và kho câu hỏi; chú thích rõ phạm vi nhãn phát triển chưa được thẩm định độc lập.*

### 3.6.7. Đánh giá tổng hợp và các hạn chế

Về chức năng, AptiMate đã hình thành một quy trình từ lựa chọn đề, thực hiện bài làm, đánh giá đến xem lại và hỗ trợ ôn tập. Việc tách chấm khách quan và chấm AI phù hợp với đặc điểm của từng kỹ năng. Cơ chế xử lý nền, lưu trạng thái và kết quả trung gian giúp bảo toàn bài làm khi dịch vụ bên ngoài không đáp ứng.

Về tích hợp AI, đầu ra có cấu trúc và kiểm tra bằng chứng giúp phát hiện những lỗi không thể nhận biết chỉ từ mã HTTP thành công. Tuy nhiên, một kết quả vượt qua validator vẫn có thể chứa nhận xét chưa chính xác về ngôn ngữ. Đồ án chưa có tập bài được chuyên gia chấm độc lập đủ để xác định độ lệch điểm, mức đồng thuận CEFR hoặc độ tin cậy của nhận xét. Đánh giá Speaking cũng cần một bộ âm thanh có chất lượng và tiêu chí kiểm định phù hợp.

Về RAG và cá nhân hóa, các kết quả phát triển cho thấy cần tách đánh giá truy xuất khỏi đánh giá câu trả lời cuối cùng. Bộ chấm tay gồm giải thích và báo cáo đã được chuẩn bị nhưng chưa có kết quả thẩm định độc lập để đưa vào kết luận. Hiệu quả cải thiện kết quả học tập, mức độ hài lòng và khả năng duy trì học tập chưa được kiểm chứng bằng nghiên cứu người dùng kéo dài.

Về hiệu năng, cache đã được thiết kế cho danh mục và dashboard, nhưng chưa có số liệu đối chứng đủ để khẳng định mức giảm độ trễ hoặc tải cơ sở dữ liệu theo một tỷ lệ cụ thể. Việc đo tiếp theo cần phân biệt cache trống và cache đã có dữ liệu, sử dụng cùng tập truy vấn và mức đồng thời, đồng thời ghi nhận thời gian phản hồi cùng số truy vấn cơ sở dữ liệu. Các thông số này không được thay thế bằng ước lượng không có phép đo.

Về vận hành, hệ thống phụ thuộc vào kết nối, hạn mức và vòng đời mô hình của nhà cung cấp. Những lỗi HTTP 503, 429, vượt dung lượng hoặc kết quả không hợp lệ có thể khiến người học phải chờ hoặc yêu cầu chấm lại. Các cơ chế thử lại và dự phòng hỗ trợ phục hồi nhưng không loại bỏ hoàn toàn sự phụ thuộc này.

## 3.7. Kết luận chương 3

Chương 3 đã trình bày quá trình phân tích, thiết kế và triển khai AptiMate từ yêu cầu nghiệp vụ đến kiến trúc, dữ liệu và giao diện. Hệ thống kết hợp chấm theo đáp án với đánh giá bằng AI, đồng thời tổ chức lịch sử, chatbot và các thành phần cá nhân hóa để hỗ trợ quá trình tự học. Việc sử dụng công việc nền, kiểm tra đầu ra, lưu kết quả trung gian và cache góp phần kiểm soát quá trình xử lý trong điều kiện tài nguyên và dịch vụ bên ngoài có giới hạn.

Phần thực nghiệm đã làm rõ phạm vi kiểm chứng của từng nhóm kết quả. Các kiểm thử cung cấp bằng chứng về hành vi của những thành phần được kiểm tra; benchmark AI phản ánh khả năng hoàn thành quy trình trong điều kiện đo; đánh giá RAG cung cấp thông tin chẩn đoán trên tập phát triển. Những kết quả này đồng thời chỉ ra các nội dung cần tiếp tục hoàn thiện, đặc biệt là chất lượng dữ liệu đánh giá, mức độ ổn định của dịch vụ AI và kiểm định chuyên môn đối với điểm số, phản hồi.

# KẾT LUẬN

## 1. Kết quả đạt được

Đồ án “Xây dựng hệ thống luyện thi Aptis tích hợp AI” đã nghiên cứu và triển khai ứng dụng web AptiMate nhằm hỗ trợ người học luyện tập, theo dõi kết quả và tiếp cận phản hồi trong cùng một hệ thống. Trên nền tảng kiến thức về mô hình ngôn ngữ lớn, truy xuất tri thức và phát triển ứng dụng web, nhóm đã xây dựng các thành phần phục vụ Grammar & Vocabulary, Reading, Listening, Writing và Speaking, kết hợp những chức năng hỗ trợ tự học.

Về nghiệp vụ, hệ thống tổ chức được ngân hàng đề, các chế độ làm bài, lịch sử và kết quả theo người dùng. Quản trị viên có các chức năng quản lý nội dung và theo dõi hoạt động. Giao diện được xây dựng theo hướng thống nhất, hỗ trợ hai ngôn ngữ và chế độ sáng/tối, giúp người học tiếp cận các kỹ năng trong một môi trường chung.

Về tích hợp AI, đồ án đã xây dựng quy trình chuẩn bị dữ liệu, gọi mô hình, kiểm tra kết quả và lưu phản hồi cho Writing và Speaking. Kết quả chấm chính được phân biệt với kết quả tham khảo; bài làm gốc được bảo toàn. Việc xử lý Writing theo từng phần và lưu kết quả trung gian hỗ trợ phục hồi khi một giai đoạn gặp lỗi. Với Speaking, sự kết hợp giữa âm thanh và bản chép lời trong nhánh đánh giá chính cung cấp cơ sở đầu vào phù hợp hơn so với chỉ sử dụng văn bản.

Về kỹ thuật, AptiMate sử dụng React, NestJS, PostgreSQL, pgvector và Redis, kết hợp các dịch vụ bên ngoài qua API. Các thành phần chatbot và cá nhân hóa khai thác dữ liệu học tập, học liệu và truy xuất để hỗ trợ phản hồi có căn cứ. Quản lý phiên bản dữ liệu, kiểm tra quyền sở hữu và kiểm thử được áp dụng nhằm hạn chế sai lệch giữa các luồng nghiệp vụ.

Các kết quả thực nghiệm đã giúp nhận diện những vấn đề thực tế khi tích hợp AI, bao gồm hạn mức token, lỗi dịch vụ và đầu ra chưa đáp ứng yêu cầu. Đây là cơ sở để hoàn thiện cơ chế điều phối và kiểm tra, thay vì chỉ đánh giá hệ thống qua những trường hợp thành công.

## 2. Hạn chế của đồ án

Chất lượng chấm Writing và Speaking chưa được kiểm định trên một tập bài đủ lớn có điểm và nhận xét độc lập của chuyên gia. Do đó, điểm số và CEFR ước lượng chỉ được sử dụng trong phạm vi hỗ trợ luyện tập. Việc vượt qua kiểm tra cấu trúc và bằng chứng không bảo đảm mọi nhận xét đều đúng về chuyên môn.

Khả năng vận hành của các chức năng AI còn phụ thuộc vào nhà cung cấp, kết nối và hạn mức tài khoản. Quy mô benchmark nhỏ và điều kiện gọi API chưa hoàn toàn đồng nhất, nên chưa đủ để kết luận mô hình nào tốt nhất cho mọi tình huống. Nhánh tham khảo dựa trên transcript cũng có giới hạn khi đánh giá những đặc trưng cần nghe âm thanh trực tiếp.

Đối với RAG, dữ liệu nhãn hiện tại chủ yếu phục vụ phát triển, chưa đủ điều kiện làm bộ đánh giá độc lập. Kho học liệu và ngân hàng câu hỏi cần tiếp tục được rà soát về độ phủ, chất lượng nguồn và sự phù hợp với mục tiêu học. Hiệu quả cá nhân hóa đối với tiến bộ của người học chưa được xác nhận bằng thực nghiệm dài hạn. Ngoài ra, hệ thống cần được kiểm thử thêm về tải, hiệu năng và trải nghiệm trên phạm vi người dùng, thiết bị rộng hơn.

## 3. Hướng phát triển

Hướng ưu tiên là xây dựng tập đánh giá có thẩm định chuyên môn cho Writing, Speaking và truy xuất tri thức. Các bài làm cần được chấm theo cùng rubric bởi người có chuyên môn, sau đó phân tích sai lệch và mức đồng thuận với hệ thống. Với Speaking, dữ liệu cần bao phủ mức năng lực, chất lượng thu âm và đặc điểm giọng nói khác nhau. Với RAG, cần hoàn thiện nhãn liên quan và đánh giá cả tính đúng đắn của phản hồi sau truy xuất.

Tiếp theo, hệ thống cần hoàn thiện điều phối API theo ngân sách token, giới hạn thời gian và trạng thái dịch vụ. Việc sử dụng mô hình dự phòng chỉ nên thực hiện khi đã xác minh tính tương thích, chất lượng và điều kiện dữ liệu. Khi thay đổi mô hình, prompt hoặc schema, cần lưu phiên bản và chạy lại các trường hợp kiểm thử để hạn chế ảnh hưởng tới kết quả học tập.

Một hướng phát triển khác là đo lường và tối ưu truy vấn trên tải đại diện. Cache, chỉ mục và cách tổng hợp dữ liệu cần được đánh giá bằng số liệu trước và sau thay đổi. Đồng thời, cần mở rộng kiểm thử về bảo mật, sao lưu, khôi phục và giám sát để chuẩn bị cho môi trường sử dụng ngoài phạm vi phát triển cục bộ.

Cuối cùng, việc triển khai thử nghiệm với người học thực tế sẽ cung cấp cơ sở đánh giá tính hữu ích của phản hồi, sự phù hợp của kế hoạch và mức độ thuận tiện của giao diện. Những phản hồi này, kết hợp với kết quả kiểm định chuyên môn, sẽ định hướng quá trình hoàn thiện AptiMate thành một công cụ hỗ trợ luyện thi và tự học có căn cứ rõ ràng hơn.
