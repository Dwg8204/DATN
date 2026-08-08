import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
    path: '/grammar-vocab/overview',
  },
  {
    image: 'https://placehold.co/600x720/FFD3A8/A11D33?text=VOCABULARY',
    alt: 'Vocabulary',
    path: '/vocab',
  },
];

const reviews = [
  {
    avatar: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/r33cn91v_expires_30_days.png',
    name: 'Emily',
    date: '12 April 2025',
    ratingImage: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/amnslara_expires_30_days.png',
    ratingValue: '5.0',
    comment:
      'The timed practice tests helped me become comfortable with the real Aptis format. The detailed review made it much easier to understand my mistakes and improve before test day.',
  },
  {
    avatar: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/24p67znc_expires_30_days.png',
    name: 'Daniel',
    date: '3 May 2025',
    ratingImage: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/385j6ham_expires_30_days.png',
    ratingValue: '5.0',
    comment:
      'I especially like being able to practise on both my laptop and phone. The Grammar and Vocabulary exercises showed me exactly which areas needed more attention.',
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
  {
    avatar: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/r33cn91v_expires_30_days.png',
    name: 'Sophia',
    date: '18 May 2025',
    ratingImage: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/amnslara_expires_30_days.png',
    ratingValue: '5.0',
    comment: 'The practice flow is clear and very close to the real exam. Being able to review every answer helped me improve consistently each week.',
  },
  {
    avatar: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/24p67znc_expires_30_days.png',
    name: 'Marcus',
    date: '2 June 2025',
    ratingImage: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/385j6ham_expires_30_days.png',
    ratingValue: '5.0',
    comment: 'AptiMate made it easy to identify my weaker skills. The instant results and explanations saved me a lot of preparation time.',
  },
  {
    avatar: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/nf8qn4r4_expires_30_days.png',
    name: 'Olivia',
    date: '15 June 2025',
    ratingImage: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/4gpo4cco_expires_30_days.png',
    ratingValue: '4.9',
    comment: 'The Listening and Reading practice sets are well organised, and the explanations are concise enough to review quickly after each test.',
  },
  {
    avatar: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/r33cn91v_expires_30_days.png',
    name: 'Noah',
    date: '27 June 2025',
    ratingImage: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/amnslara_expires_30_days.png',
    ratingValue: '5.0',
    comment: 'I used AptiMate every evening for two weeks. The realistic timing and clear result pages helped me stay focused and track my progress.',
  },
  {
    avatar: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/24p67znc_expires_30_days.png',
    name: 'Amelia',
    date: '8 July 2025',
    ratingImage: 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/385j6ham_expires_30_days.png',
    ratingValue: '4.8',
    comment: 'The mobile layout is convenient for short practice sessions, while the full tests on desktop give me a very useful exam-day experience.',
  },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [activeReview, setActiveReview] = useState(0);
  const reviewCarouselRef = useRef(null);

  const getVisibleReviewCount = () => (window.innerWidth <= 768 ? 1 : 3);
  const getMaxReviewIndex = () => Math.max(0, reviews.length - getVisibleReviewCount());

  const goToReview = (index) => {
    const carousel = reviewCarouselRef.current;
    if (!carousel) return;
    const maxIndex = getMaxReviewIndex();
    const next = index < 0 ? maxIndex : index > maxIndex ? 0 : index;
    const slide = carousel.children[next];
    carousel.scrollTo({ left: slide?.offsetLeft ?? 0, behavior: 'smooth' });
    setActiveReview(next);
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveReview((current) => {
        const maxIndex = getMaxReviewIndex();
        const next = current >= maxIndex ? 0 : current + 1;
        const carousel = reviewCarouselRef.current;
        const slide = carousel?.children[next];
        carousel?.scrollTo({ left: slide?.offsetLeft ?? 0, behavior: 'smooth' });
        return next;
      });
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);

  const handleReviewScroll = () => {
    const carousel = reviewCarouselRef.current;
    if (!carousel?.clientWidth) return;
    const slideWidth = carousel.children[0]?.getBoundingClientRect().width;
    if (slideWidth) setActiveReview(Math.round(carousel.scrollLeft / slideWidth));
  };

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
          <div className={styles.reviewCarouselFrame}>
            <button type="button" className={`${styles.reviewArrow} ${styles.reviewArrowPrevious}`} aria-label="Previous review" onClick={() => goToReview(activeReview - 1)}>
              <ChevronLeft aria-hidden="true" />
            </button>
            <div ref={reviewCarouselRef} className={styles.reviewList} onScroll={handleReviewScroll}>
              {reviews.map((review) => (
                <div key={review.name} className={styles.reviewSlide}>
                  <ReviewCard {...review} />
                </div>
              ))}
            </div>
            <button type="button" className={`${styles.reviewArrow} ${styles.reviewArrowNext}`} aria-label="Next review" onClick={() => goToReview(activeReview + 1)}>
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </div>
        <PaginationDots total={reviews.length - getVisibleReviewCount() + 1} active={activeReview} />
      </div>
    </div>
  );
}
