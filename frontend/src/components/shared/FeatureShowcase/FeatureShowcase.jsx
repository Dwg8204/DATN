import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import PaginationDots from '../../common/PaginationDots';
import styles from './FeatureShowcase.module.css';

export default function FeatureShowcase({
  sectionTitle = 'Key Features',
  featureTitle = 'Realistic Aptis Exam Experience',
  featureImage = 'https://storage.googleapis.com/tagjs-prod.appspot.com/v1/YiUdaz83Xp/jie2waj6_expires_30_days.png',
  featureDescription = 'AptiMate recreates the Aptis test format, question types, and timing so you can practise Listening, Reading, Writing, Speaking, Grammar, and Vocabulary with confidence. Study on desktop or mobile, receive instant results, review every answer, and focus your practice on the skills that need the most improvement.',
  totalDots = 3,
  activeDot = 0,
  features,
}) {
  const slides = useMemo(() => features || [
    { title: featureTitle, description: featureDescription, image: featureImage },
    {
      title: 'Instant Results and Detailed Review',
      description: 'See your result immediately, review every answer, and understand which areas should be prioritised in your next practice session.',
      image: featureImage,
    },
    {
      title: 'Practice Anywhere, On Any Device',
      description: 'Continue your Aptis preparation smoothly on desktop, tablet, or mobile with the same familiar test experience.',
      image: featureImage,
    },
  ], [features, featureDescription, featureImage, featureTitle]);
  const [currentSlide, setCurrentSlide] = useState(activeDot);
  const carouselRef = useRef(null);

  const goToSlide = (index) => {
    const next = (index + slides.length) % slides.length;
    const carousel = carouselRef.current;
    carousel?.scrollTo({ left: carousel.clientWidth * next, behavior: 'smooth' });
    setCurrentSlide(next);
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentSlide((current) => {
        const next = (current + 1) % slides.length;
        const carousel = carouselRef.current;
        carousel?.scrollTo({ left: carousel.clientWidth * next, behavior: 'smooth' });
        return next;
      });
    }, 3000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  const handleScroll = () => {
    const carousel = carouselRef.current;
    if (!carousel?.clientWidth) return;
    setCurrentSlide(Math.round(carousel.scrollLeft / carousel.clientWidth));
  };

  return (
    <div className={styles.section}>
      <div className={styles.content}>
        <span className={styles.sectionTitle}>{sectionTitle}</span>
        <div className={styles.carouselFrame}>
          <button type="button" className={`${styles.arrowButton} ${styles.arrowPrevious}`} aria-label="Previous feature" onClick={() => goToSlide(currentSlide - 1)}>
            <ChevronLeft aria-hidden="true" />
          </button>
          <div ref={carouselRef} className={styles.carouselViewport} onScroll={handleScroll}>
            {slides.map((slide) => (
              <div key={slide.title} className={styles.showcase}>
                <div className={styles.textWrap}>
                  <span className={styles.featureTitle}>{slide.title}</span>
                  <span className={styles.featureDescription}>{slide.description}</span>
                </div>
                <div className={styles.imageWrap}>
                  <img src={slide.image} alt={slide.title} className={styles.featureImage} />
                </div>
              </div>
            ))}
          </div>
          <button type="button" className={`${styles.arrowButton} ${styles.arrowNext}`} aria-label="Next feature" onClick={() => goToSlide(currentSlide + 1)}>
            <ChevronRight aria-hidden="true" />
          </button>
        </div>
      </div>
      <PaginationDots total={features ? slides.length : totalDots} active={currentSlide} />
    </div>
  );
}
