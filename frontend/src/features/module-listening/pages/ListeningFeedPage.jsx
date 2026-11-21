import SkillResources from '../../../components/common/SkillResources';
import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import { useNavigate } from 'react-router-dom';
import styles from './ListeningFeedPage.module.css';

const listeningResources = [
  { key: 'format', href: 'https://www.britishcouncil.org/exam/aptis/practice-materials/listening-aptis-test' },
  { key: 'practice', href: 'https://www.britishcouncil.vn/sites/default/files/aptis_esol_general_practice_tests.pdf' },
  { key: 'guide', href: 'https://www.britishcouncil.vn/sites/default/files/aptis_esol_general_candidate_guide_2023_a4_0.pdf' },
  { key: 'preparation', href: 'https://aptistests.vn/danh-muc/cac-de-thi-mau-cua-hoi-dong-anh-tai-viet-nam-dar74' },
];

export default function ListeningFeedPage() {
  const ui = useUiTranslation();
  const navigate = useNavigate();

  const bandScores = [
    {
      band: 'A1 — Beginner',
      level: 'Beginner user',
      desc: 'Can only understand isolated words or simple phrases in very familiar contexts. Listening ability is very limited, and the user is not yet able to infer meaning or match information systematically.'
    },
    {
      band: 'A2 — Elementary',
      level: 'Basic user',
      desc: 'Can recognise very simple and familiar information such as phone numbers, times, and places in short conversations. Has significant difficulty with matching tasks and inferring opinions.'
    },
    {
      band: 'B1 — Intermediate',
      level: 'Independent user',
      desc: 'Can process specific information and perform basic matching tasks. May experience difficulty with listening tasks that require opinion inference or involve more abstract and complex content.'
    },
    {
      band: 'B2 — Upper Intermediate',
      level: 'Good user',
      desc: 'Can identify specific information, match details, and infer opinions in most situations. May occasionally make minor errors in more complex or inference-based listening tasks, but overall demonstrates a strong ability to handle the different task types in the test.'
    },
    {
      band: 'C — Proficient',
      level: 'Expert user',
      desc: 'Can fully and accurately understand all types of listening tasks, including complex opinion inference in extended monologues. Demonstrates no difficulty in processing information across a wide range of real-life situations.'
    }
  ];

  return (
    <div className={styles.page}>
      <div className={styles.section}>
        <div className={styles.titleContainer}>
          <div className={styles.title}>
            <span className={styles.titleLight}>{ui("Listening")}</span>{ ' ' + ui("Feed") }</div>
          <div className={styles.divider}></div>
        </div>
        <div className={styles.contentBlock}>
          <div className={styles.heading}>
            <span className={styles.headingBold}>{ ui("Listening") + ' ' }</span>
            <span className={styles.headingLight}>{ui("band scores")}</span>
          </div>
          <div className={styles.textBlock}>
            <p>{ui("The Aptis Listening test consists of 17 tasks with a total of 20 questions based on a variety of audio recordings. It focuses on listening skills in real-life situations. Your final score is calculated based on the number of correct answers you provide.")}</p>
            <p>{ui("The questions in the Listening test are based on four different task types: identifying specific information from short messages or conversations (Part 1), matching information from four speakers talking about the same topic (Part 2), inferring opinions from a conversation between a man and a woman (Part 3), and inferring opinions from longer monologues on a range of topics (Part 4).")}</p>
            <p>{ui("You will have approximately 40 minutes to complete the Listening test. Each correct answer is worth one mark, and the total score is converted to the Aptis scale from A1 to C. Each audio recording can be played a maximum of two times.")}</p>
            <p>{ui("For example, to achieve a B2 level in the Listening test, you need to reach the required score threshold according to the Aptis scale, demonstrating your ability to process real-life information and infer meaning across a range of contexts.")}</p>
          </div>

          <div className={styles.bandScoresGrid}>
            {bandScores.map((score, index) => (
              <div key={index} className={styles.scoreCard}>
                <h3 className={styles.scoreBand}>{score.band}</h3>
                <div className={styles.scoreDetail}>
                  <div className={styles.scoreRow}>
                    <span className={styles.scoreLabel}>{ui("Skill level")}</span>
                    <span className={styles.scoreValue}>{score.level}</span>
                  </div>
                  <div className={styles.scoreRow}>
                    <span className={styles.scoreLabel}>{ui("Description")}</span>
                    <span className={styles.scoreValue}>{score.desc}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <SkillResources skill="listening" items={listeningResources} />

      <button className={styles.goToTestBtn} onClick={() => navigate('/listening/tests')}>{ui("View Test List")}</button>
    </div>
  );
}
