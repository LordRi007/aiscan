import { api } from './api';

export const faceService = {
  getExpressionEmoji(expression) {
    switch (expression?.toLowerCase()) {
      case 'happy':
        return '😊';
      case 'laughing':
        return '😄';
      case 'neutral':
        return '😐';
      case 'surprised':
        return '😲';
      case 'thinking':
        return '🤔';
      case 'sad':
        return '🙁';
      case 'angry':
        return '😠';
      case 'fearful':
        return '😨';
      case 'disgusted':
        return '🤢';
      case 'sleepy':
        return '😴';
      case 'uncertain':
      default:
        return '🧐';
    }
  },

  getExpressionColor(expression) {
    switch (expression?.toLowerCase()) {
      case 'happy':
        return '#10B981'; // Green
      case 'laughing':
        return '#06B6D4'; // Cyan
      case 'neutral':
        return '#6366F1'; // Indigo
      case 'thinking':
        return '#3B82F6'; // Blue
      case 'sad':
        return '#64748B'; // Slate
      case 'surprised':
        return '#F59E0B'; // Amber
      case 'angry':
        return '#EF4444'; // Red
      case 'fearful':
        return '#8B5CF6'; // Purple
      case 'disgusted':
        return '#D97706'; // Amber dark
      case 'sleepy':
        return '#A855F7'; // Purple-ish
      case 'uncertain':
      default:
        return '#9CA3AF'; // Gray
    }
  },

  getVerificationStatusBadge(status) {
    switch (status) {
      case 'REGISTERED':
        return { text: 'Registered Person', bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
      case 'NEW_REGISTERED':
        return { text: 'New Person Registered', bg: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      case 'VERIFICATION_REQUIRED':
        return { text: 'Verification Required', bg: 'bg-gray-500/20 text-gray-300 border-gray-500/30' };
      case 'POTENTIALLY_NEW':
        return { text: 'Verified New Identity', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/30' };
      case 'CHECKING':
      default:
        return { text: 'Checking Registration...', bg: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
    }
  },
};
