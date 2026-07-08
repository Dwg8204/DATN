import { useState } from 'react';
import Button from '../../common/Button';
import CustomInput from '../../common/CustomInput';
import CommentItem from './CommentItem';
import styles from './Comment.module.css';

export default function CommentSection({ title = 'Bình luận', initialComments = [] }) {
  const [comments, setComments] = useState(initialComments);
  const [form, setForm] = useState({ author: '', content: '' });

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!form.author.trim() || !form.content.trim()) {
      return;
    }

    setComments((current) => [
      {
        author: form.author.trim(),
        content: form.content.trim(),
        time: 'Vừa xong',
      },
      ...current,
    ]);
    setForm({ author: '', content: '' });
  };

  return (
    <section className={`surface ${styles.commentSection}`}>
      <div>
        <h2 className="section-title">{title}</h2>
        <p className="section-description">Cấu phần dùng chung để gắn vào bất kỳ trang nào cần trao đổi nội dung.</p>
      </div>

      <form className="comment-form" onSubmit={handleSubmit}>
        <div className="comment-form__grid">
          <CustomInput
            label="Tên hiển thị"
            placeholder="Ví dụ: Mai Anh"
            value={form.author}
            onChange={(event) => setForm((current) => ({ ...current, author: event.target.value }))}
          />
          <CustomInput
            label="Nội dung"
            placeholder="Viết bình luận của bạn..."
            value={form.content}
            onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
          />
        </div>
        <Button type="submit">Gửi bình luận</Button>
      </form>

      <div className={styles.commentList}>
        {comments.length ? comments.map((comment, index) => <CommentItem key={`${comment.author}-${index}`} {...comment} />) : <p className="section-description">Chưa có bình luận nào.</p>}
      </div>
    </section>
  );
}
