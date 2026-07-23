import { useNavigate } from 'react-router-dom';
import HeroBanner from '../components/shared/HeroBanner/HeroBanner';
import SkillCard from '../components/shared/SkillCard/SkillCard';
import FeatureShowcase from '../components/shared/FeatureShowcase/FeatureShowcase';
import ReviewCard from '../components/shared/ReviewCard/ReviewCard';
import PaginationDots from '../components/common/PaginationDots';
import styles from './HomePage.module.css';

const skillCards = [
  {
    image: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/ab4jseam_expires_30_days.png',
    alt: 'Listening',
    path: '/listening',
  },
  {
    image: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/joqfqb3e_expires_30_days.png',
    alt: 'Reading',
    path: '/reading',
  },
  {
    image: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/3c94qbfj_expires_30_days.png',
    alt: 'Writing',
    path: '/writing',
  },
  {
    image: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/emndtqro_expires_30_days.png',
    alt: 'Speaking',
    path: '/speaking',
  },
  {
    image: 'https://res.cloudinary.com/dkrisyrlh/image/upload/v1784102681/Gemini_Generated_Image_mc1u72mc1u72mc1u_1111_rys0cc.png',
    alt: 'Grammar & Vocab',
    path: '/grammar',
  },
];

const reviews = [
  {
    avatar: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/r33cn91v_expires_30_days.png',
    name: 'Henry',
    date: '26 March 2025',
    ratingImage: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/amnslara_expires_30_days.png',
    ratingValue: '5.0',
    comment:
      'Thank you very much for creating this website; it is amazing. I have been using it since January and took the real test at the end of February, achieving scores of 8 and 8.5 for listening and reading. It has helped me a lot, particularly in preparing for the computer-based test.',
  },
  {
    avatar: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/24p67znc_expires_30_days.png',
    name: 'Henry',
    date: '26 March 2025',
    ratingImage: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/385j6ham_expires_30_days.png',
    ratingValue: '5.0',
    comment:
      'Thank you very much for creating this website; it is amazing. I have been using it since January and took the real test at the end of February, achieving scores of 8 and 8.5 for listening and reading. It has helped me a lot, particularly in preparing for the computer-based test.',
  },
  {
    avatar: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/nf8qn4r4_expires_30_days.png',
    name: 'Henry',
    date: '26 March 2025',
    ratingImage: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/4gpo4cco_expires_30_days.png',
    ratingValue: '5.0',
    comment:
      'Thank you very much for creating this website; it is amazing. I have been using it since January and took the real test at the end of February, achieving scores of 8 and 8.5 for listening and reading. It has helped me a lot, particularly in preparing for the computer-based test.',
  },
];

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      {/* Hero Banner */}
      <HeroBanner buttonText={null} />

      {/* Choose a Skill to Practice */}
      <div className={styles.skillsSection}>
        <span className={styles.skillsTitle}>Choose a Skill to Practice</span>
        <div className={styles.skillsGrid}>
          {skillCards.map((card) => (
            <SkillCard
              key={card.alt}
              image={card.image}
              alt={card.alt}
              onClick={() => navigate(card.path)}
            />
          ))}
        </div>
      </div>

      {/* Key Features */}
      <FeatureShowcase />

      {/* Review Section */}
      <div className={styles.reviewSection}>
        <div className={styles.reviewContent}>
          <span className={styles.reviewTitle}>Review</span>
          <div className={styles.reviewList}>
            {reviews.map((review, index) => (
              <ReviewCard key={index} {...review} />
            ))}
          </div>
        </div>
        <PaginationDots total={3} active={0} />
      </div>
    </div>
  );
}
