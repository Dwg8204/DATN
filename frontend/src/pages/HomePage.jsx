import { Link } from 'react-router-dom';
import Button from '../components/common/Button';
import CommentSection from '../components/shared/CommentSection/CommentSection';

const highlights = [
  'Kiến trúc module rõ ràng',
  'Router, context, services tách biệt',
  'Sẵn sàng mở rộng theo từng thành viên',
];

export default function HomePage() {
  return (
    <>
      <section className="page-section">
        <div className="container">
          <div className="hero surface">
            <div className="hero__content">
              <span className="hero__eyebrow">AptiMate</span>
              <h1>Nền tảng React core cho hệ thống luyện thi tiếng Anh</h1>
              <p>
                Bộ khung frontend được tổ chức theo đúng mô hình shared components, features, pages, routes và services để
                dễ mở rộng theo từng module nghiệp vụ.
              </p>
              <div className="hero__actions">
                <Button as={Link} to="/practice-exam">Khám phá module</Button>
                <Button as={Link} to="/introduction" variant="secondary">Xem giới thiệu</Button>
              </div>
            </div>

            <div className="hero__panel">
              <div className="hero__stat surface">
                <strong>3</strong>
                <span>module chính</span>
              </div>
              <div className="hero__stat surface">
                <strong>1</strong>
                <span>router tổng</span>
              </div>
              <div className="hero__stat surface">
                <strong>100%</strong>
                <span>phân tách rõ ràng</span>
              </div>
            </div>
          </div>

          <div className="feature-grid feature-grid--highlights">
            {highlights.map((item) => (
              <article className="feature-card surface" key={item}>
                <h3>{item}</h3>
                <p>Thiết kế sẵn cho việc gắn thêm API, kiểm thử và các màn hình nghiệp vụ khác.</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="page-section page-section--alt">
        <div className="container">
          <CommentSection
            title="Khu vực thảo luận mẫu"
            initialComments={[
              { author: 'Admin', content: 'Shared component này có thể tái sử dụng cho mọi trang cần bình luận.', time: '2 giờ trước' },
              { author: 'Tutor', content: 'State và UI đã được tách riêng để dễ thay thế bằng API thật.', time: 'Hôm nay' },
            ]}
          />
        </div>
      </section>
    </>
  );
}
