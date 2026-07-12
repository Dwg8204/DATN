import React, { useState } from 'react';
import styles from './CommentSection.module.css';

const MOCK_COMMENTS = [
  {
    id: 1,
    author: 'Walter Mitty',
    role: 'Student',
    time: '10 min ago',
    avatar: 'https://placehold.co/55x55',
    content: 'Wow, the listening test was such an amazing experience! The audio quality was crystal clear, and the variety of accents really helped me prepare for the real exam. I loved how challenging but fair the questions were!',
    replies: [
      {
        id: 11,
        author: 'Walter Mitty',
        role: 'Student',
        time: '10 min ago',
        avatar: 'https://placehold.co/55x55',
        mention: 'Walter Mitty',
        content: 'Wow, the listening test was such an amazing experience! The audio quality was crystal clear...',
      }
    ]
  }
];

export default function CommentSection({ initialComments = MOCK_COMMENTS }) {
  const [comments, setComments] = useState(initialComments);
  const [replyingTo, setReplyingTo] = useState(null); // stores comment id
  const [replyText, setReplyText] = useState('');
  const [mainCommentText, setMainCommentText] = useState('');

  const handleMainCommentSubmit = () => {
    if (!mainCommentText.trim()) return;
    const newComment = {
      id: Date.now(),
      author: 'Current User',
      role: 'Student',
      time: 'Just now',
      avatar: 'https://placehold.co/55x55',
      content: mainCommentText.trim(),
      replies: []
    };
    setComments([newComment, ...comments]);
    setMainCommentText('');
  };

  const handleReplySubmit = (parentId, repliedUserName) => {
    if (!replyText.trim()) return;
    const newReply = {
      id: Date.now(),
      author: 'Current User',
      role: 'Student',
      time: 'Just now',
      avatar: 'https://placehold.co/55x55',
      mention: repliedUserName,
      content: replyText.trim()
    };
    
    setComments(comments.map(c => {
      if (c.id === parentId) {
        return { ...c, replies: [...(c.replies || []), newReply] };
      }
      return c;
    }));
    
    setReplyText('');
    setReplyingTo(null);
  };

  const totalComments = comments.length + comments.reduce((acc, c) => acc + (c.replies?.length || 0), 0);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.iconWrap}>
          <div className={styles.iconInner}>
            <div className={styles.iconShape}></div>
          </div>
        </div>
        <div className={styles.replyCount}>{totalComments} replies</div>
      </div>

      <div className={styles.mainInputContainer}>
        <div className={styles.avatar}>
          <img className={styles.avatarImg} src="https://placehold.co/55x55" alt="Current User" />
        </div>
        <div className={styles.inputWrap}>
          <input 
            type="text" 
            className={styles.replyInput} 
            placeholder="Write a comment...." 
            value={mainCommentText}
            onChange={(e) => setMainCommentText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleMainCommentSubmit();
            }}
          />
        </div>
        <div className={styles.sendBtnWrap}>
          <button className={styles.sendBtn} onClick={handleMainCommentSubmit}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <div className={styles.commentList}>
        {comments.map(comment => (
          <div key={comment.id} className={styles.commentThread}>
            <div className={styles.commentItem}>
              <div className={styles.avatar}>
                <img className={styles.avatarImg} src={comment.avatar} alt={comment.author} />
              </div>
              <div className={styles.commentBody}>
                <div className={styles.commentMeta}>
                  <div className={styles.authorName}>{comment.author}</div>
                  {comment.role && (
                    <div className={styles.roleBadge}>
                      <span className={styles.roleText}>{comment.role}</span>
                    </div>
                  )}
                  <div className={styles.time}>{comment.time}</div>
                </div>
                <div className={styles.commentContent}>
                  {comment.content}
                </div>
                <div className={styles.commentActions}>
                  <button className={styles.likeBtn}>
                    <div className={styles.likeIconWrap}>
                      <div className={styles.likeIcon}></div>
                    </div>
                  </button>
                  <button 
                    className={styles.replyBtn}
                    onClick={() => {
                      setReplyingTo(comment.id);
                      setReplyText('');
                    }}
                  >
                    Reply
                  </button>
                </div>
              </div>
            </div>

            {/* Replies */}
            {(comment.replies && comment.replies.length > 0) && (
              <div className={styles.repliesContainer}>
                {comment.replies.map(reply => (
                  <div key={reply.id} className={styles.commentItem}>
                    <div className={styles.avatar}>
                      <img className={styles.avatarImg} src={reply.avatar} alt={reply.author} />
                    </div>
                    <div className={styles.commentBody}>
                      <div className={styles.commentMeta}>
                        <div className={styles.authorName}>{reply.author}</div>
                        {reply.role && (
                          <div className={styles.roleBadge}>
                            <span className={styles.roleText}>{reply.role}</span>
                          </div>
                        )}
                        <div className={styles.time}>{reply.time}</div>
                      </div>
                      <div className={styles.commentContent}>
                        {reply.mention && <span className={styles.mention}>@{reply.mention}</span>}
                        {reply.content}
                      </div>
                      <div className={styles.commentActions}>
                        <button className={styles.likeBtn}>
                          <div className={styles.likeIconWrap}>
                            <div className={styles.likeIcon}></div>
                          </div>
                        </button>
                        <button 
                          className={styles.replyBtn}
                          onClick={() => {
                            setReplyingTo(comment.id);
                            setReplyText(`@${reply.author} `);
                          }}
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reply Input for this thread */}
            {replyingTo === comment.id && (
              <div className={styles.repliesContainer}>
                <div className={styles.replyInputContainer}>
                  <div className={styles.avatar}>
                    <img className={styles.avatarImg} src="https://placehold.co/55x55" alt="Current User" />
                  </div>
                  <div className={styles.inputWrap}>
                    <input 
                      type="text" 
                      className={styles.replyInput} 
                      placeholder="Write a comment...." 
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleReplySubmit(comment.id, comment.author);
                      }}
                    />
                  </div>
                  <div className={styles.sendBtnWrap}>
                    <button className={styles.sendBtn} onClick={() => handleReplySubmit(comment.id, comment.author)}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
