export const MOCK_SPEAKING_RESULT = {
  testId: 1,
  cefrLevel: 'B2',
  overallScore: {
    grammar: 100,
    pronunciation: 100,
    fluency: 75,
    taskFulfillment: 75
  },
  parts: {
    1: {
      partName: 'Part 1 - Introduction & Interview',
      instruction: 'Answer questions about yourself and familiar topics.',
      qna: [
        { 
          id: 1, 
          question: "Please tell me about your family.", 
          answer: "Well, I have four member MEMBERS in my family. There are my parent PARENTS, my sister and me. We are very close and we usually goes GO to the park together on Sundays."
        },
        { 
          id: 2, 
          question: "What do you like to do in your free time?", 
          answer: "In my free time, I really enjoy reading books and playing badminton with my friends. It helps me stay fit and relax after work."
        },
        { 
          id: 3, 
          question: "What is your favorite type of weather?", 
          answer: "As for the weather, my favorite type is definitely autumn weather. I love the cool breeze and the beautiful changing colors of the leaves."
        }
      ],
      grammarFeedback: "Your sentences are structurally sound with minimal errors. Good use of simple and compound sentences.",
      vocabFeedback: "You used a good range of vocabulary appropriate for B2 level, such as 'cool breeze' and 'changing colors'.",
      pronunciationFeedback: "Clear pronunciation, intonation could be slightly more natural.",
      coherenceFeedback: "You answered all questions directly and naturally linked your ideas. Good job keeping the flow.",
      fluencyFeedback: "You spoke without too many pauses.",
      taskFeedback: "All questions were answered within the time limit."
    },
    2: {
      partName: 'Part 2 - Describe a Picture',
      instruction: 'Describe the picture and answer two questions.',
      qna: [
        {
          id: 1,
          question: "Describe the picture.",
          answer: "This picture shows a group of people working together in an office. They are looking at a laptop and seem to be discussing a project."
        },
        {
          id: 2,
          question: "Tell me about a time you worked in a team.",
          answer: "It reminds me of a time I worked in a team during my university years. We had to create a marketing campaign."
        },
        {
          id: 3,
          question: "Do you think teamwork is always better than working alone?",
          answer: "I think teamwork is usually better than working alone because you can share ideas and distribute the workload, although it can sometimes lead to arguments if people disagree."
        }
      ],
      grammarFeedback: "Good use of descriptive adjectives and present continuous tense to describe the image.",
      vocabFeedback: "Vocabulary is sufficient. Phrases like 'distribute the workload' are excellent.",
      pronunciationFeedback: "Very clear.",
      coherenceFeedback: "Your transition from describing the picture to your personal experience was very smooth.",
      fluencyFeedback: "A few hesitations when thinking of the next point, but overall very fluid.",
      taskFeedback: "You covered all aspects of the picture well."
    },
    3: {
      partName: 'Part 3 - Compare Two Pictures',
      instruction: 'Compare the two pictures and answer two questions.',
      qna: [
        {
          id: 1,
          question: "Compare these two pictures.",
          answer: "In the first picture, I see a man playing a sport, maybe basketball, and it looks very intense. In the second picture, there is a woman studying quietly in a library."
        },
        {
          id: 2,
          question: "Which of these activities would you prefer to do?",
          answer: "I would prefer to play sports because it helps me release stress and stay active."
        },
        {
          id: 3,
          question: "Why do people enjoy doing difficult things?",
          answer: "I think people enjoy doing difficult things because overcoming challenges gives them a strong sense of achievement and builds character."
        }
      ],
      grammarFeedback: "Khi dùng cấu trúc 'I see someone + V-ing', đây là một cách diễn đạt tốt để miêu tả hành động đang diễn ra. Tuy nhiên, ở câu hỏi số 3, bạn có thể cân nhắc dùng những cấu trúc nâng cao hơn (ví dụ: 'One reason why people tend to...').",
      vocabFeedback: "Bạn có thể bổ sung các từ vựng diễn tả sự kịch tính như 'intense', 'thrilling', hoặc 'competitive'.",
      pronunciationFeedback: "Good overall.",
      coherenceFeedback: "Lập luận mạch lạc. Việc so sánh sự đối lập giữa 'intense' và 'quietly' rất tốt để làm nổi bật sự khác biệt.",
      fluencyFeedback: "Vị trí của từ dưới 'difficult' câu này, nếu bạn đổi cấu trúc thành 'The difficulty of this task lies in...' thì câu sẽ tự nhiên và trôi chảy hơn.",
      taskFeedback: "Lập luận mạch lạc, bao quát đủ 3 câu hỏi."
    },
    4: {
      partName: 'Part 4 - Speak on a given topic',
      instruction: 'You have 1 minute to prepare and 2 minutes to speak on a topic.',
      qna: [
        {
          id: 1,
          question: "Tell me about a time you experienced a significant change in your life. How did you feel about it? What was the outcome?",
          answer: "The topic I want to discuss today is a significant change in my life. A few years ago, I moved to a completely different city for university. At first, I felt extremely overwhelmed and homesick because I didn't know anyone there. However, the outcome was incredibly positive. It forced me to step out of my comfort zone, become more independent, and I made some lifelong friends along the way."
        }
      ],
      grammarFeedback: "Excellent use of past tenses to describe an experience.",
      vocabFeedback: "Strong vocabulary relating to personal growth and feelings (e.g. 'overwhelmed', 'comfort zone').",
      pronunciationFeedback: "No major issues, intonation showed good emotion.",
      coherenceFeedback: "Your answer followed a clear logical structure: the event, the initial feelings, and the final outcome.",
      fluencyFeedback: "Very fluent, well organized thoughts.",
      taskFeedback: "The topic was fully addressed and elaborated upon well."
    }
  }
};
