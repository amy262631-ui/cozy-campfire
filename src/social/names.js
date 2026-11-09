import { lang } from '../i18n/i18n.js';

/**
 * 隨機暱稱：形容詞＋名詞，每種語言各自一份（最多 12 個字）。
 */
const PARTS = {
  'zh-Hant': {
    adj: ['暖暖', '慢慢', '愛睡', '好奇', '害羞', '開心', '星光', '迷霧', '小小', '軟綿綿', '發呆', '微笑', '月光', '晚風', '咕嚕', '圓滾滾', '暖呼呼', '毛茸茸', '甜甜', '悠悠', '晴天', '雨天', '迷路', '打盹', '哼歌', '輕輕', '蓬蓬', '亮晶晶', '彩虹', '森林', '湖邊', '夜貓', '安靜', '肚子餓'],
    noun: ['旅人', '狐狸', '熊熊', '兔兔', '貓咪', '柴柴', '露營客', '棉花糖', '螢火蟲', '守火人', '散步者', '小鹿', '貓頭鷹', '松鼠', '熊貓', '刺蝟', '水獺', '企鵝', '浣熊', '海豹', '小羊', '鴨鴨', '青蛙', '蘑菇', '松果', '小雲', '星星', '烏龜', '麻糬', '小狗'],
    join: '',
  },
  en: {
    adj: ['Sleepy', 'Cozy', 'Fluffy', 'Quiet', 'Happy', 'Starry', 'Misty', 'Tiny', 'Gentle', 'Lazy', 'Curious', 'Sunny', 'Mellow', 'Snug', 'Dreamy', 'Moonlit', 'Breezy', 'Velvet', 'Rosy', 'Drowsy', 'Bubbly', 'Hazy', 'Woolly', 'Mossy', 'Peachy'],
    noun: ['Fox', 'Bear', 'Bunny', 'Cat', 'Panda', 'Shiba', 'Camper', 'Owl', 'Fawn', 'Moth', 'Otter', 'Cub', 'Pine', 'Hedgehog', 'Penguin', 'Raccoon', 'Seal', 'Lamb', 'Duck', 'Frog', 'Acorn', 'Cloud', 'Mochi', 'Turtle', 'Puppy'],
    join: ' ',
  },
  ja: {
    adj: ['ねむい', 'ふわふわ', 'のんびり', 'ほっこり', '星ふる', '霧の', 'ちいさな', 'にこにこ', '月夜の', 'ぽかぽか', 'まんまる', 'もふもふ', 'すやすや', 'きらきら', 'そよかぜ', 'ゆるゆる', 'あまい', 'しずかな', 'はらぺこ', '森の', '湖の', 'にじいろ', 'ぽてぽて'],
    noun: ['キツネ', 'クマ', 'ウサギ', 'ネコ', 'パンダ', 'シバ', '旅人', 'フクロウ', 'リス', 'ホタル', 'こじか', 'ハリネズミ', 'カワウソ', 'ペンギン', 'タヌキ', 'アザラシ', 'ヒツジ', 'アヒル', 'カエル', 'キノコ', 'どんぐり', 'くも', 'もち', 'カメ', 'こいぬ'],
    join: '',
  },
  ko: {
    adj: ['졸린', '포근한', '말랑한', '조용한', '행복한', '별빛', '안개', '작은', '느긋한', '반짝', '동글', '몽글', '보들', '달빛', '산들', '말랑말랑', '달콤한', '꾸벅', '배고픈', '숲속', '호숫가', '무지개', '뽀송'],
    noun: ['여우', '곰', '토끼', '고양이', '판다', '시바', '캠퍼', '부엉이', '다람쥐', '반딧불', '아기사슴', '고슴도치', '수달', '펭귄', '너구리', '물범', '아기양', '오리', '개구리', '버섯', '도토리', '구름', '찹쌀떡', '거북이', '강아지'],
    join: ' ',
  },
};

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** 是不是遊戲幫忙取的隨機名字（形容詞＋名詞），用來判斷要不要提醒「幫自己取個名字」 */
export function isAutoName(name) {
  for (const p of Object.values(PARTS)) {
    for (const a of p.adj) if (name.startsWith(a + p.join) && p.noun.includes(name.slice((a + p.join).length))) return true;
  }
  return false;
}

export function randomName() {
  const p = PARTS[lang] ?? PARTS['zh-Hant'];
  for (let i = 0; i < 20; i++) {
    const name = pick(p.adj) + p.join + pick(p.noun);
    if ([...name].length <= 12) return name;
  }
  return pick(p.noun);
}
