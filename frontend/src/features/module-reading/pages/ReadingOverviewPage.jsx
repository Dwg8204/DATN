import SkillResources, { SkillSource } from '../../../components/common/SkillResources.jsx';
import { useUiTranslation } from "../../../i18n/useUiTranslation.jsx";
import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ReadingOverviewPage.module.css';


export default function ReadingOverviewPage() {
  const ui = useUiTranslation();
  const navigate = useNavigate();
  return (
    <div className={styles.page}>
      <div className={styles.section}>
        <div className={styles.titleContainer}>
          <div className={styles.title}>
            <span className={styles.titleLight}>{ui("Reading")}</span>{ ' ' + ui("Overview") }</div>
          <div className={styles.divider}></div>
        </div>

        <div className={styles.contentBlock}>
          <div className={styles.heading}>
            <span className={styles.headingBold}>{ ui("A quick look at the") + ' ' }</span>
            <span className={styles.headingLight}>{ui("APTIS Reading")}</span>
            <span className={styles.headingBold}>{ ' ' + ui("Test") }</span>
          </div>
          <div className={styles.textBlock}>
            <p>{ui("APTIS Reading is one of the four components of the APTIS test, developed by the British Council, which is designed to assess a test taker's proficiency in the English language. The APTIS Reading test evaluates your ability to understand and interpret written texts in English across a range of contexts and complexity levels.")}</p>

            <p>
              <strong>{ui("Test Format:")}</strong><br />{ui("The APTIS Reading test is divided into four sections, and the tasks become progressively more difficult as the test advances. Unlike a single fixed format, the time allowed varies depending on the version of the test:")}<br />{ui("- Aptis General – 35 minutes")}<br />{ui("- Aptis Advanced – 60 minutes")}<br />{ui("- Aptis for Teens – 30 minutes")}<br />{ui("- Aptis for Teachers – 30 minutes")}</p>

            <p>
              <strong>{ui("Question Types:")}</strong><br />{ui("- Part 1 – Sentence Comprehension: You will read a short text in the form of a note or an email. For five sentences in the text, you must choose a word to complete each sentence. This part tests your ability to read and understand simple sentences.")}<br />{ui("- Part 2 – Text Cohesion: This section contains two separate texts. Each text consists of six sentences, but only the first sentence is placed correctly. Your task is to arrange the remaining five sentences in the correct order to form a complete, coherent text.")}<br />{ui("- Part 3 – Opinion Matching: You will read a text made up of four paragraphs on a common topic, each paragraph representing a different person's opinions or preferences. You will then match seven given statements to the correct person.")}<br />{ui("- Part 4 – Long Text Comprehension: In the final section, you will read a longer text split into seven paragraphs. You are given seven headings and must match one heading to each paragraph.")}</p>

            <p>
              <strong>{ui("Top tips for the reading test:")}</strong>
              <br />{ui("- Read all the sentences carefully first, then decide on the correct order. You need to look for words that show how the sentences link with each other.")}<br />{ui("- To perform well in section two, first read each paragraph so you understand each person's point of view. Then read the statements and decide which person's opinion it best represents.")}<br />{ui("- In section four it is necessary to scroll the reading text to see all of it. Select the most appropriate heading for each paragraph.")}</p>

            <p>
              <strong>{ui("Skills Assessed:")}</strong>
              <br />{ui("- Understanding simple sentences and everyday language")}<br />{ui("- Recognizing how texts are structured and how ideas connect")}<br />{ui("- Identifying individual opinions and matching them to statements")}<br />{ui("- Comprehending extended texts and identifying the main idea of each section")}</p>

          </div>
        </div>
      </div>

      <SkillSource skill="reading" />
      <SkillResources skill="reading" />

      <button className={styles.goToTestBtn} onClick={() => navigate('/reading/tests')}>{ui("View Test List")}</button>
    </div>
  );
}
