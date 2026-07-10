import styles from './AnnouncementBar.module.css';

const defaultAnnouncements = [
  {
    iconLeft: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/y9879nea_expires_30_days.png',
    text: 'APTIS test platform has new announcement',
    iconRight: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/kjjsqsnv_expires_30_days.png',
  },
  {
    iconLeft: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/kom8dimn_expires_30_days.png',
    text: 'APTIS test platform has new announcement',
    iconRight: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/nufscdzd_expires_30_days.png',
  },
];

export default function AnnouncementBar({ announcements = defaultAnnouncements }) {
  return (
    <div className={styles.bar}>
      {announcements.map((item, index) => (
        <div key={index} className={styles.item}>
          <img src={item.iconLeft} alt="" className={styles.icon} />
          <span className={styles.text}>{item.text}</span>
          <img src={item.iconRight} alt="" className={styles.arrow} />
        </div>
      ))}
    </div>
  );
}
