import testAudio from './audio/jonasblakewood-energy-rock-action-567332.mp3';

export const PART2_DATA = {
  id: 14,
  audioUrl: testAudio,
  instruction: "Four people are talking about science. Match each speaker with the correct statement.",
  speakers: ['Speaker A', 'Speaker B', 'Speaker C', 'Speaker D'],
  options: [
    'now enjoys science',
    'found science boring at school',
    'wants to be a scientist',
    'thinks science is hard to understand',
    'uses science in their work',
  ],
  answers: [
    'now enjoys science',
    'found science boring at school',
    'wants to be a scientist',
    'thinks science is hard to understand',
  ],
  scripts: [
    "Speaker A: Honestly, when I was in high school, I couldn't stand chemistry or physics. It just felt like memorizing formulas. But recently, I started watching documentaries about space and biology, and I'm fascinated. I actually look forward to reading science articles now.",
    "Speaker B: My science teacher used to just read from the textbook for an hour straight. I found it incredibly dull and struggled to stay awake. It's a shame, because I realize now it could have been taught in a much more engaging way.",
    "Speaker C: I've always loved experimenting and figuring out how things work. After I graduate next year, I'm hoping to get a PhD and eventually run my own research lab. That's my ultimate goal.",
    "Speaker D: I try my best, but whenever they talk about quantum physics or even basic genetics on the news, it goes completely over my head. It just seems too complex for me to grasp, no matter how simply they try to explain it."
  ]
};
