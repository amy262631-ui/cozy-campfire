import { lang } from '../i18n/i18n.js';

/**
 * 隨機暱稱：形容詞＋名詞，每種語言各自一份（最多 12 個字）。
 */
const PARTS = {
  'zh-Hant': {
    adj: ['暖暖', '慢慢', '愛睡', '好奇', '害羞', '開心', '星光', '迷霧', '小小', '軟綿綿', '發呆', '微笑', '月光', '晚風', '咕嚕', '圓滾滾'],
    noun: ['旅人', '狐狸', '熊熊', '兔兔', '貓咪', '柴柴', '露營客', '棉花糖', '螢火蟲', '守火人', '散步者', '小鹿', '貓頭鷹', '松鼠', '熊貓'],
    join: '',
  },
  en: {
    adj: ['Sleepy', 'Cozy', 'Fluffy', 'Quiet', 'Happy', 'Starry', 'Misty', 'Tiny', 'Gentle', 'Lazy', 'Curious', 'Sunny', 'Mellow'],
    noun: ['Fox', 'Bear', 'Bunny', 'Cat', 'Panda', 'Shiba', 'Camper', 'Owl', 'Fawn', 'Moth', 'Otter', 'Cub', 'Pine'],
    join: ' ',
  },
  ja: {
    adj: ['ねむい', 'ふわふわ', 'のんびり', 'ほっこり', '星ふる', '霧の', 'ちいさな', 'にこにこ', '月夜の', 'ぽかぽか', 'まんまる'],
    noun: ['キツネ', 'クマ', 'ウサギ', 'ネコ', 'パンダ', 'シバ', '旅人', 'フクロウ', 'リス', 'ホタル', 'こじか'],
    join: '',
  },
  ko: {
    adj: ['졸린', '포근한', '말랑한', '조용한', '행복한', '별빛', '안개', '작은', '느긋한', '반짝', '동글'],
    noun: ['여우', '곰', '토끼', '고양이', '판다', '시바', '캠퍼', '부엉이', '다람쥐', '반딧불', '아기사슴'],
    join: ' ',
  },
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function randomName() {
  const p = PARTS[lang] ?? PARTS['zh-Hant'];
  for (let i = 0; i < 20; i++) {
    const name = pick(p.adj) + p.join + pick(p.noun);
    if ([...name].length <= 12) return name;
  }
  return pick(p.noun);
}
