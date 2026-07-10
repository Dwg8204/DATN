import styles from './ReviewCard.module.css';

export default function ReviewCard({
  avatar,
  name = 'Henry',
  date = '26 March 2025',
  ratingImage,
  ratingValue = '5.0',
  comment = '',
}) {
  return (
    <div className={styles.card}>
      <div className={styles.userInfo}>
        <img src={avatar} alt={name} className={styles.avatar} />
        <div className={styles.userMeta}>
          <span className={styles.userName}>{name}</span>
          <span className={styles.userDate}>{date}</span>
        </div>
      </div>
      <div className={styles.ratingRow}>
        <img src={ratingImage} alt="Rating" className={styles.ratingImage} />
        <span className={styles.ratingValue}>{ratingValue}</span>
      </div>
      <span className={styles.comment}>{comment}</span>
    </div>
  );
}
