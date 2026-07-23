export const PART4_QUESTIONS = [
  {
    id: 16,
    context: "Listen to a city planner talk at a press conference about a new transport plan.",
    script: "City Planner: Thank you all for coming today. I'm here to address some of the concerns regarding the new transport plan for the downtown area. First, let me state clearly that this plan is very much in line with previous community projects we've successfully implemented in this district. While some vocal groups have suggested we didn't consult properly, we actually held six open forums over the last year. It's impossible to please everyone, but overall, this project mirrors the successful initiatives we've seen revitalize neighboring communities, and I firmly believe it represents the best path forward for our city as a whole. As for the media coverage, I must say I find the intense scrutiny quite surprising. We've introduced similar infrastructure plans in the past with barely a mention in the local press, yet suddenly this has become headline news every day. I certainly didn't expect this level of public debate over a relatively straightforward traffic management update.",
    subQuestions: [
      {
        id: '16a',
        text: "What is his opinion of the plan overall?",
        options: [
          'It is very similar to previous community projects in the same area.',
          'It was prepared without proper consultation with the community.',
          'It does not represent the opinions of the whole community.',
        ],
        answer: 0,
      },
      {
        id: '16b',
        text: "What is his opinion of the role of the media?",
        options: [
          "He is critical of the media's reporting of the plan.",
          "He is surprised by the media's interest in the plan.",
          "He is confused by the media's reaction to the plan.",
        ],
        answer: 1,
      }
    ]
  },
  {
    id: 17,
    context: "Listen to a woman talking about her experience working abroad.",
    script: "Woman: When I first accepted the job in Tokyo, I was incredibly excited but also very nervous. I hadn't studied the language at all, and I worried it would be a major barrier. However, my colleagues were incredibly welcoming and went out of their way to make me feel at home. In fact, what impressed me the most wasn't the efficiency of the public transport or the amazing food, but rather the strong sense of community and teamwork in the office. People were always ready to collaborate and help out. The only real difficulty I had was adjusting to the long working hours, which were much more demanding than I had anticipated. Despite that, I think the experience gave me a completely new perspective on international business, and I'd highly recommend it to anyone looking to broaden their career horizons.",
    subQuestions: [
      {
        id: '17a',
        text: "What impressed her the most about working in Tokyo?",
        options: [
          "The efficiency of the public transport.",
          "The amazing quality of the food.",
          "The strong sense of teamwork in the office.",
        ],
        answer: 2,
      },
      {
        id: '17b',
        text: "What did she find difficult during her time there?",
        options: [
          "The language barrier with colleagues.",
          "Adjusting to the demanding working hours.",
          "Understanding international business practices.",
        ],
        answer: 1,
      }
    ]
  }
];
