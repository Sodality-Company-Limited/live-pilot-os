/**
 * Emotional Intent & Four-Archetype Motion Personality Matrix
 * Grounded in LottieFiles Motion Design Skill:
 * - Playful: Under-damped spring, 3-10% overshoot, bouncy joyful recovery
 * - Premium: Critically damped, zero bounce, elegant cubic-bezier deceleration
 * - Corporate / Utilitarian: Sub-200ms snappy execution, zero distraction
 * - Energetic: High stiffness, fast velocity, snappy response
 */

export const MOTION_ARCHETYPES = Object.freeze({
  playful: {
    name: 'playful',
    emotionalTargets: ['delightful', 'friendly', 'celebratory', 'casual'],
    durationMs: 320,
    spring: {
      stiffness: 180,
      damping: 12,
      dampingRatio: 0.75, // Under-damped
      overshootPercent: 6
    },
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
  },
  premium: {
    name: 'premium',
    emotionalTargets: ['luxury', 'refined', 'reassuring', 'calm'],
    durationMs: 350,
    spring: {
      stiffness: 150,
      damping: 24,
      dampingRatio: 1.0, // Critically damped
      overshootPercent: 0
    },
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
  },
  corporate: {
    name: 'corporate',
    emotionalTargets: ['banking', 'enterprise', 'productivity', 'compliance'],
    durationMs: 180,
    spring: {
      stiffness: 220,
      damping: 28,
      dampingRatio: 1.1, // Slightly over-damped
      overshootPercent: 0
    },
    easing: 'cubic-bezier(0.2, 0, 0, 1)'
  },
  energetic: {
    name: 'energetic',
    emotionalTargets: ['fitness', 'gaming', 'urgent', 'active'],
    durationMs: 220,
    spring: {
      stiffness: 280,
      damping: 18,
      dampingRatio: 0.85,
      overshootPercent: 4
    },
    easing: 'cubic-bezier(0.1, 1.2, 0.3, 1)'
  }
});

/**
 * Resolves configuration for a declared archetype.
 * @param {'playful' | 'premium' | 'corporate' | 'energetic'} archetype
 * @returns {object}
 */
export function resolveMotionArchetypeConfig(archetype) {
  const config = MOTION_ARCHETYPES[archetype];
  if (!config) {
    throw new Error(`Unknown motion archetype: ${archetype}`);
  }
  return JSON.parse(JSON.stringify(config));
}

/**
 * Validates whether an archetype matches an intended emotional goal.
 * @param {string} emotionalTarget
 * @param {string} archetype
 * @returns {boolean}
 */
export function validateArchetypeSuitability(emotionalTarget, archetype) {
  const config = MOTION_ARCHETYPES[archetype];
  if (!config) return false;
  return config.emotionalTargets.includes(emotionalTarget.toLowerCase());
}
