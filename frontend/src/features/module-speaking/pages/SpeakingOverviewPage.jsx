import SkillResources, { SkillSource } from '../../../components/common/SkillResources.jsx';
import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import { useNavigate } from 'react-router-dom';
import styles from './SpeakingOverviewPage.module.css';


export default function SpeakingOverviewPage() {
  const ui = useUiTranslation();
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <div className={styles.section}>
        <div className={styles.titleContainer}>
          <div className={styles.title}>
            <span className={styles.titleLight}>{ui("Speaking")}</span>{ ' ' + ui("Test") }</div>
          <div className={styles.divider}></div>
        </div>
        <div className={styles.contentBlock}>
          <div className={styles.heading}>
            <span className={styles.headingBold}>{ ui("A quick look at the") + ' ' }</span>
            <span className={styles.headingLight}>{ui("Aptis Speaking")}</span>
            <span className={styles.headingBold}>{ ' ' + ui("Test") }</span>
          </div>
          <div className={styles.textBlock}>
            <p>{ui("The Aptis Speaking component tests your ability to communicate in English in real-life situations.")}</p>
            <p>{ui("It takes about 12 minutes and it is divided into four sections. Your responses will be recorded and marked by our examiners.")}</p>
            <p>{ui("If you are taking Aptis Advanced, you will have 10 minutes to complete this part.")}</p>
          </div>
        </div>

        <div className={styles.contentBlock}>
          <div className={styles.subHeading}>{ui("Speaking part details:")}</div>
          <div className={styles.textBlock}>{ui("Part 1: Sentence Comprehension")}<br />{ui("You will be asked three questions about yourself and your interests. You are expected to speak for 30 seconds for each question.")}<br /><br />{ui("Part 2: Describe, express opinion and provide reasons and explanations")}<br />{ui("You will be asked to describe a photograph, then answer two questions on the topic of the photograph. The questions will ask you to talk about your own experience of the topic and to comment on some more general aspect of the topic. In this part you are expected to speak for 45 seconds for each response.")}<br /><br />{ui("Part 3: Describe, compare and provide reasons and explanations")}<br />{ui("You will be asked to describe two photographs, then answer two questions on the topic of the photographs. The questions will ask you to compare some aspect of the topic and to express an opinion on or speculate about the topic. Again, you are expected to speak for 45 seconds for each response.")}<br /><br />{ui("Part 4: Discuss personal experience and opinion on an abstract topic")}<br />{ui("You will be asked three questions on a single topic and given one minute to prepare an answer. You can take brief notes and use these to help structure your answer. You are expected to talk for two minutes.")}</div>
        </div>
      </div>

      <SkillSource skill="speaking" />
      <SkillResources skill="speaking" />

      <button className={styles.goToTestBtn} onClick={() => navigate('/speaking/tests')}>{ui("View Test List")}</button>
    </div>
  );
}
