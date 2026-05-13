// components/mochi/hamsterExpressions.ts

export type MochiExpression = 
  | 'PROUD'
  | 'MILESTONE'           // NEW - specific milestone celebration
  | 'HAPPY'
  | 'NEUTRAL'
  | 'CONCERNED'
  | 'DISAPPOINTED'
  | 'DESPERATE'
  | 'PASSIVE_AGGRESSIVE'
  | 'CELEBRATING'
  | 'EARLY_BIRD'          // NEW
  | 'STRESSED'            // NEW (using angry.png)
  | 'CRAMMING'            // NEW
  | 'SLEEPY'              // NEW
  | 'WAKING'              // NEW
  | 'ENCOURAGING'         // NEW
  | 'GASLIGHT'            // NEW
  | 'IGNORED';            // NEW

export interface HamsterExpression {
  id: MochiExpression;
  emoji: string;
  imagePath: string;
  eyeShape: string;
  mouthShape: string;
  blush: boolean;
  sweatDrop: boolean;
  sparkles: boolean;
  backgroundColor: string;
}

export const HAMSTER_EXPRESSIONS: Record<MochiExpression, HamsterExpression> = {
  PROUD: {
    id: 'PROUD',
    emoji: '🐹👑✨',
    imagePath: '/icons/mochi-milestone.png',
    eyeShape: '^ ^',
    mouthShape: 'w',
    blush: false,
    sweatDrop: false,
    sparkles: true,
    backgroundColor: 'from-yellow-400 to-amber-500'
  },
  MILESTONE: {
    id: 'MILESTONE',
    emoji: '🐹🏆✨',
    imagePath: '/icons/mochi-milestone.png',
    eyeShape: '★ ★',
    mouthShape: 'D',
    blush: true,
    sweatDrop: false,
    sparkles: true,
    backgroundColor: 'from-amber-500 to-orange-600'
  },
  HAPPY: {
    id: 'HAPPY',
    emoji: '🐹😊',
    imagePath: '/icons/mochi-happy-192.png',
    eyeShape: '● ●',
    mouthShape: 'D',
    blush: true,
    sweatDrop: false,
    sparkles: false,
    backgroundColor: 'from-amber-400 to-orange-400'
  },
  NEUTRAL: {
    id: 'NEUTRAL',
    emoji: '🐹',
    imagePath: '/icons/mochi-neutral.png',
    eyeShape: '• •',
    mouthShape: '_',
    blush: false,
    sweatDrop: false,
    sparkles: false,
    backgroundColor: 'from-stone-300 to-gray-400'
  },
  CONCERNED: {
    id: 'CONCERNED',
    emoji: '🐹😰',
    imagePath: '/icons/mochi-concerned.png',
    eyeShape: '> <',
    mouthShape: 'o',
    blush: false,
    sweatDrop: true,
    sparkles: false,
    backgroundColor: 'from-amber-300 to-orange-300'
  },
  DISAPPOINTED: {
    id: 'DISAPPOINTED',
    emoji: '🐹😢',
    imagePath: '/icons/mochi-disappointed.png',
    eyeShape: '• •',
    mouthShape: '⊂',
    blush: false,
    sweatDrop: true,
    sparkles: false,
    backgroundColor: 'from-blue-200 to-blue-300'
  },
  DESPERATE: {
    id: 'DESPERATE',
    emoji: '🐹😭💔',
    imagePath: '/icons/mochi-desperate.png',
    eyeShape: '; ;',
    mouthShape: '⊂',
    blush: false,
    sweatDrop: true,
    sparkles: false,
    backgroundColor: 'from-purple-200 to-purple-300'
  },
  PASSIVE_AGGRESSIVE: {
    id: 'PASSIVE_AGGRESSIVE',
    emoji: '🐹😒',
    imagePath: '/icons/mochi-passive.png',
    eyeShape: '¬ ¬',
    mouthShape: '¬',
    blush: false,
    sweatDrop: false,
    sparkles: false,
    backgroundColor: 'from-gray-400 to-gray-500'
  },
  CELEBRATING: {
    id: 'CELEBRATING',
    emoji: '🐹🎉✨',
    imagePath: '/icons/mochi-celebrating.png',
    eyeShape: '★ ★',
    mouthShape: 'D',
    blush: true,
    sweatDrop: false,
    sparkles: true,
    backgroundColor: 'from-green-400 to-emerald-500'
  },
  EARLY_BIRD: {
    id: 'EARLY_BIRD',
    emoji: '🐹☀️✨',
    imagePath: '/icons/mochi-early-bird.png',
    eyeShape: '● ●',
    mouthShape: 'D',
    blush: true,
    sweatDrop: false,
    sparkles: true,
    backgroundColor: 'from-yellow-300 to-orange-400'
  },
  STRESSED: {
    id: 'STRESSED',
    emoji: '🐹😫💦',
    imagePath: '/icons/mochi-angry.png',
    eyeShape: '> <',
    mouthShape: 'O',
    blush: false,
    sweatDrop: true,
    sparkles: false,
    backgroundColor: 'from-red-300 to-red-500'
  },
  CRAMMING: {
    id: 'CRAMMING',
    emoji: '🐹☕💻',
    imagePath: '/icons/mochi-cramming.png',
    eyeShape: '• •',
    mouthShape: '_',
    blush: false,
    sweatDrop: true,
    sparkles: false,
    backgroundColor: 'from-gray-700 to-gray-900'
  },
  SLEEPY: {
    id: 'SLEEPY',
    emoji: '🐹😴💤',
    imagePath: '/icons/mochi-sleepy.png',
    eyeShape: '– –',
    mouthShape: '~',
    blush: false,
    sweatDrop: false,
    sparkles: false,
    backgroundColor: 'from-indigo-300 to-purple-400'
  },
  WAKING: {
    id: 'WAKING',
    emoji: '🐹🌅☕',
    imagePath: '/icons/mochi-waking.png',
    eyeShape: '• •',
    mouthShape: 'D',
    blush: false,
    sweatDrop: false,
    sparkles: false,
    backgroundColor: 'from-orange-300 to-yellow-400'
  },
  ENCOURAGING: {
    id: 'ENCOURAGING',
    emoji: '🐹💪✨',
    imagePath: '/icons/mochi-encouraging.png',
    eyeShape: '● ●',
    mouthShape: 'D',
    blush: true,
    sweatDrop: false,
    sparkles: true,
    backgroundColor: 'from-teal-400 to-cyan-500'
  },
  GASLIGHT: {
    id: 'GASLIGHT',
    emoji: '🐹👀',
    imagePath: '/icons/mochi-gaslight.png',
    eyeShape: '¬ ¬',
    mouthShape: '¬',
    blush: false,
    sweatDrop: false,
    sparkles: false,
    backgroundColor: 'from-gray-500 to-gray-700'
  },
  IGNORED: {
    id: 'IGNORED',
    emoji: '🐹💔',
    imagePath: '/icons/mochi-ignored.png',
    eyeShape: '• •',
    mouthShape: '⊂',
    blush: false,
    sweatDrop: true,
    sparkles: false,
    backgroundColor: 'from-gray-400 to-gray-600'
  }
};

// Animation variants for each expression
export const expressionAnimations = {
  PROUD: {
    animate: { y: [0, -3, 0], rotate: [0, 5, -5, 0] },
    transition: { duration: 2, repeat: Infinity }
  },
  MILESTONE: {
    animate: { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] },
    transition: { duration: 1, repeat: 3 }
  },
  HAPPY: {
    animate: { y: [0, -2, 0] },
    transition: { duration: 1.5, repeat: Infinity }
  },
  NEUTRAL: {
    animate: { y: [0, 0, 0] },
    transition: { duration: 3, repeat: Infinity }
  },
  CONCERNED: {
    animate: { x: [0, -2, 2, 0] },
    transition: { duration: 3, repeat: Infinity }
  },
  DISAPPOINTED: {
    animate: { y: [0, 1, 0] },
    transition: { duration: 2, repeat: Infinity }
  },
  DESPERATE: {
    animate: { rotate: [0, -3, 3, 0] },
    transition: { duration: 2, repeat: Infinity }
  },
  PASSIVE_AGGRESSIVE: {
    animate: { x: [0, -1, 1, 0] },
    transition: { duration: 4, repeat: Infinity }
  },
  CELEBRATING: {
    animate: { scale: [1, 1.1, 1], rotate: [0, 10, -10, 0] },
    transition: { duration: 0.5, repeat: Infinity }
  },
  EARLY_BIRD: {
    animate: { y: [0, -2, 0], scale: [1, 1.05, 1] },
    transition: { duration: 1, repeat: Infinity }
  },
  STRESSED: {
    animate: { x: [0, -3, 3, 0], rotate: [0, -2, 2, 0] },
    transition: { duration: 0.5, repeat: Infinity }
  },
  CRAMMING: {
    animate: { rotate: [0, -2, 2, 0] },
    transition: { duration: 0.3, repeat: Infinity }
  },
  SLEEPY: {
    animate: { y: [0, -1, 0] },
    transition: { duration: 3, repeat: Infinity }
  },
  WAKING: {
    animate: { scale: [1, 1.02, 1], rotate: [0, 3, -3, 0] },
    transition: { duration: 1, repeat: 2 }
  },
  ENCOURAGING: {
    animate: { y: [0, -3, 0] },
    transition: { duration: 1, repeat: Infinity }
  },
  GASLIGHT: {
    animate: { x: [0, -1, 1, -1, 0] },
    transition: { duration: 5, repeat: Infinity }
  },
  IGNORED: {
    animate: { y: [0, 2, 0] },
    transition: { duration: 4, repeat: Infinity }
  }
};