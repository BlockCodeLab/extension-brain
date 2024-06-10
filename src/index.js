import featureImage from './feature.svg';
import iconImage from './icon.svg';

export default {
  name: 'Brain',
  description: 'Bring words to life.',
  collaborator: 'iFLYTEK Spark',
  image: featureImage,
  icon: iconImage,
  tags: ['blocks', 'data', 'internet', 'ai'],
  internetRequired: true,

  // l10n
  translations: {
    en: {
      name: 'Brain',
      description: 'Make your projects smarter.',
      collaborator: 'iFLYTEK Spark',
    },
    'zh-Hans': {
      name: '智脑',
      description: '让你的作品变聪明起来。',
      collaborator: '讯飞星火',
    },
  },
};
