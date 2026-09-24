/* 炸彈女僕 BOMB MAIDS — game data */
(function (G) {
  'use strict';

  // ------------------------------------------------------------------ maids
  // stats: speed level (0-5), bombs, fire, hearts. Each maid has a role, an always-on passive and an SP skill.
  G.MAID_DATA = {
    berry: {
      name: '莓果', en: 'BERRY', color: '#ec4a62', age: 17, hobby: '空手道', like: '草莓大福',
      role: '突擊型', passive: '踢飛炸彈', passiveDesc: ['走向炸彈就能把它踢飛。'],
      skill: '爆裂飛踢', skillDesc: ['把面前的炸彈用力踢出（沒有就先放一顆），', '撞到東西就立刻爆炸。'],
      cost: 25, stats: { speed: 2, bombs: 1, fire: 2, hearts: 3 },
      tip: '踢出的炸彈撞到東西就爆炸，別站在它的火線上！',
      line: '今天也要元氣滿滿地打掃！',
    },
    yoru: {
      name: '夜子', en: 'YORU', color: '#6b5a8e', age: 18, hobby: '劍道', like: '抹茶',
      role: '斬擊型', passive: '一刀兩斷', passiveDesc: ['她的爆炸火焰能貫穿一個木箱繼續延伸。'],
      skill: '居合斬', skillDesc: ['斬開面前兩格的木箱與怪物，', '連炸彈也能一刀拆除。'],
      cost: 36, stats: { speed: 1, bombs: 1, fire: 3, hearts: 3 },
      tip: '腳步慢但火力強，居合斬能拆掉滑過來的炸彈。',
      line: '主人，請退後。灰塵由我來斬。',
    },
    honey: {
      name: '蜜糖', en: 'HONEY', color: '#e0a014', age: 16, hobby: '烤點心', like: '蜂蜜蛋糕',
      role: '支援型', passive: '糖霜護盾', passiveDesc: ['護盾能擋下一次傷害，', '破掉後過一陣子會重新長出來。'],
      skill: '甜心魔法', skillDesc: ['回復 1 顆愛心並立刻補好護盾，', '附近的怪物和對手會暈頭轉向。'],
      cost: 65, stats: { speed: 1, bombs: 2, fire: 1, hearts: 4 },
      tip: '用魔法暈住對手，靠護盾爭取反擊時間。對戰中護盾長得慢。',
      line: '點心烤好了～怪物們也乖乖的喔♪',
    },
    yukino: {
      name: '雪乃', en: 'YUKINO', color: '#27a7b8', age: 17, hobby: '讀書', like: '冰淇淋',
      role: '戰術型', passive: '冰晶爆破', passiveDesc: ['爆炸旁邊的怪物會被凍住，', '對手則會被寒氣拖慢腳步。'],
      skill: '遙控引爆', skillDesc: ['立刻引爆自己放下的所有炸彈，', '遙控引爆時火力 +1。'],
      cost: 35, stats: { speed: 1, bombs: 2, fire: 2, hearts: 3 },
      tip: '先放炸彈，等對手靠近再遙控引爆，寒氣會拖住逃跑的人。',
      line: '計算完畢。爆破時機，完美。',
    },
  };
  // numbers behind the skills and passives. Tuned with CPU-vs-CPU battles (4-maid free-for-all and every 1v1 pairing,
  // both CPU levels): each maid wins about a quarter of free-for-alls and 44-56% of duels.
  G.SKILL = {
    kickSpeed: 4.5, kickSelfSafe: false, // Berry's skill kick slides this fast and bursts on impact (it can still catch her)
    slashReach: 2, // tiles Yoru's slash reaches
    pierce: 1, // crates Yoru's flames burn through before stopping
    shieldRecharge: 25 * 60, // frames until Honey's shield grows back
    shieldRechargeBattle: 45 * 60, shieldStartBattle: false, magicShieldBattle: false, // battle rounds are one heart each, so the shield is slower there
    charmRadius: 4, charmFrames: 270, bossCharm: 180, // Honey's magic on monsters
    stunRadius: 2.2, stunFrames: 18, // and on rival maids
    frostEnemy: 120, frostMaid: 35, chillSpeed: 0.7, // Yukino's frost: monsters freeze, rivals slow down
    remoteBoost: 1, remoteDelay: 4, remoteDelayBattle: 16, // Yukino's remote blast
  };
  // Berry starts in your room; each boss defeated brings the next maid
  G.MAID_ORDER = ['berry', 'honey', 'yukino', 'yoru'];
  G.MAID_UNLOCK_STAGES = ['BOSS1', 'BOSS2', 'BOSS3'];

  // ------------------------------------------------------------------ outfits (bought once, any maid can wear them)
  G.OUTFITS = [
    { id: 'maid', name: '女僕裝', price: 0, desc: '蕾絲咖啡廳的制服。' },
    { id: 'cat', name: '黑貓女僕裝', price: 500, desc: '毛茸茸的貓耳朵是重點！' },
    { id: 'yukata', name: '夏日浴衣', price: 800, desc: '別上髮花的祭典浴衣。' },
    { id: 'princess', name: '公主洋裝', price: 1200, desc: '閃亮亮的小皇冠。' },
  ];

  // ------------------------------------------------------------------ monsters
  G.ENEMY_DATA = {
    dustcat: { name: '塵塵貓', speed: 0.5, hp: 1, ai: 'wander', coin: 10, desc: '住在課桌底下的灰塵團。' },
    piggy: { name: '貪吃豬', speed: 0.6, hp: 1, ai: 'wander', coin: 15, desc: '把福利社的麵包吃光光。' },
    teddy: { name: '暴走熊', speed: 0.72, hp: 1, ai: 'chase', coin: 20, desc: '會追著女僕跑的布偶熊。' },
    jelly: { name: '果凍怪', speed: 0.5, hp: 1, ai: 'ghost', coin: 25, desc: '能穿過家具的軟Q果凍。' },
    penguin: { name: '企鵝紳士', speed: 1.1, hp: 1, ai: 'straight', coin: 25, desc: '一旦開跑就停不下來。' },
    snowkid: { name: '雪寶寶', speed: 0.62, hp: 1, ai: 'smart', coin: 30, desc: '會躲開炸彈的聰明雪人。' },
    cupcake: { name: '杯子蛋糕怪', speed: 0.6, hp: 2, ai: 'wander', coin: 35, desc: '奶油很厚，要炸兩次。' },
    dragon: { name: '糖果龍', speed: 0.9, hp: 1, ai: 'smart', coin: 40, desc: '檸檬冠毛的甜點守衛。' },
    drumbun: { name: '鼓鼓兔', speed: 0.8, hp: 1, ai: 'chase', coin: 40, desc: '敲著小鼓追過來的兔子。' },
    gemknight: { name: '寶石騎士', speed: 0.6, hp: 2, ai: 'smart', coin: 55, desc: '盔甲很硬，要炸兩次。' },
  };

  // ------------------------------------------------------------------ jobs (stages)
  G.STAGES = [
    {
      id: '1-1', theme: 'classroom', title: '教室大掃除', client: '櫻丘學園 校長', reward: 150, time: 175, layout: 'desks',
      brief: ['放學後的教室被塵塵貓佔領了。', '請把牠們通通清掉！'],
      enemies: { dustcat: 3 }, items: { bomb: 2, fire: 2, tea: 1, kick: 1, heart: 1 }, soft: 0.8, dust: 3,
    },
    {
      id: '1-2', theme: 'classroom', title: '福利社的貪吃鬼', client: '學生會長', reward: 220, time: 180, layout: 'store',
      brief: ['福利社的麵包被吃光了！', '犯人好像是粉紅色的……'],
      enemies: { dustcat: 3, piggy: 2 }, items: { bomb: 2, fire: 2, speed: 1, heart: 1, line: 1 }, soft: 0.6, dust: 4,
    },
    {
      id: '2-1', theme: 'garden', title: '玫瑰花園除蟲', client: '花園伯爵夫人', reward: 300, time: 185, layout: 'plaza', decor: 'well',
      brief: ['暴走熊在玫瑰園裡橫衝直撞。', '別讓牠們弄壞樹屋！'],
      enemies: { piggy: 3, teddy: 2 }, items: { bomb: 2, fire: 2, clock: 1, heart: 1, pierce: 1 }, soft: 0.55, dust: 4,
    },
    {
      id: '2-2', theme: 'garden', title: '果凍迷宮', client: '園丁老爺爺', reward: 360, time: 190, layout: 'hedgemaze',
      brief: ['果凍怪會穿過花叢！', '聽說牠們最怕長長的火力。'],
      enemies: { teddy: 3, jelly: 2 }, items: { bomb: 2, fire: 3, speed: 1, star: 1, fullfire: 1, heart: 1 }, soft: 0.6, dust: 5,
    },
    {
      id: 'BOSS1', theme: 'classroom', title: '鑽頭機器人', client: '理科社社長', reward: 450, time: 200, layout: 'boss', boss: 'drill',
      brief: ['理科社的掃除機器人失控了！', '牠撞到硬牆會暈一下，趁機炸牠！'],
      enemies: {}, items: { bomb: 2, fire: 3, heart: 2, kick: 1, line: 1 }, soft: 0.3, dust: 3,
    },
    {
      id: '3-1', theme: 'snow', title: '雪原的企鵝管家', client: '冰雪山莊', reward: 420, time: 180, layout: 'snowfield',
      brief: ['企鵝紳士跑得飛快。', '在牠的路上等著放炸彈吧。'],
      enemies: { penguin: 4, snowkid: 2 }, items: { bomb: 2, fire: 2, speed: 1, heart: 1, clock: 1, pierce: 1, skull: 1, glove: 1 }, soft: 0.55, dust: 5,
    },
    {
      id: '3-2', theme: 'snow', title: '聰明的雪寶寶', client: '冰雪山莊', reward: 480, time: 190, layout: 'lanes',
      brief: ['雪寶寶會躲炸彈。', '用連環爆炸把牠逼進死角！'],
      enemies: { snowkid: 4, jelly: 2, penguin: 1 }, items: { bomb: 3, fire: 2, star: 1, heart: 1, line: 1, kick: 1 }, soft: 0.6, dust: 5,
    },
    {
      id: '4-1', theme: 'candy', title: '糖果城堡的午茶', client: '甜點女王', reward: 560, time: 200, layout: 'candyCastle',
      brief: ['杯子蛋糕怪的奶油很厚，', '要炸兩次才會投降。'],
      enemies: { cupcake: 4, dragon: 2 }, items: { bomb: 2, fire: 2, speed: 1, heart: 1, tea: 1, fullfire: 1, skull: 1, glove: 1 }, soft: 0.58, dust: 6,
    },
    {
      id: '4-2', theme: 'candy', title: '甜點大暴走', client: '甜點女王', reward: 650, time: 210, layout: 'lanes',
      brief: ['糖果龍帶著大軍來了！', '這是最後的甜點防衛戰。'],
      enemies: { dragon: 4, cupcake: 2, teddy: 2 }, items: { bomb: 3, fire: 3, star: 1, heart: 2, clock: 1, pierce: 1, line: 1 }, soft: 0.6, dust: 6,
    },
    {
      id: 'BOSS2', theme: 'candy', title: '火焰蜘蛛', client: '甜點女王', reward: 800, time: 200, layout: 'boss', boss: 'spider',
      brief: ['城堡地下出現了噴火的機械蜘蛛！', '火焰沿著直線噴出，別跟牠站同一排！'],
      enemies: {}, items: { bomb: 2, fire: 3, speed: 1, heart: 1, fullfire: 1, pierce: 1, glove: 1 }, soft: 0.28, dust: 4,
    },
    {
      id: '5-1', theme: 'toy', title: '玩具箱演唱會', client: '玩具店老闆', reward: 700, time: 210, layout: 'toyStage',
      brief: ['玩具們在舞台上開起了演唱會！', '鼓鼓兔會追著人跑，小心被包圍。'],
      enemies: { drumbun: 4, piggy: 2, teddy: 2 }, items: { bomb: 2, fire: 2, speed: 1, heart: 1, tea: 1, kick: 1, skull: 2 }, soft: 0.6, dust: 6,
    },
    {
      id: '5-2', theme: 'toy', title: '積木迷宮', client: '玩具店老闆', reward: 760, time: 215, layout: 'blocks',
      brief: ['積木塔堆成了迷宮。', '用炸彈打通一條路吧！'],
      enemies: { drumbun: 4, jelly: 2, snowkid: 2 }, items: { bomb: 3, fire: 2, star: 1, heart: 1, clock: 1, line: 1, glove: 1 }, soft: 0.62, dust: 6,
    },
    {
      id: '6-1', theme: 'jewel', title: '寶石宮殿', client: '寶石公主', reward: 850, time: 220, layout: 'jewelEgg',
      brief: ['宮殿中央的巨大寶石蛋被盯上了！', '寶石騎士很硬，要炸兩次。'],
      enemies: { gemknight: 4, dragon: 2, cupcake: 1 }, items: { bomb: 2, fire: 3, speed: 1, heart: 1, tea: 1, fullfire: 1, skull: 1, glove: 1 }, soft: 0.58, dust: 6,
    },
    {
      id: '6-2', theme: 'jewel', title: '閃耀迴廊', client: '寶石公主', reward: 950, time: 220, layout: 'jewelRing',
      brief: ['水晶柱排成菱形的迴廊。', '從四個缺口鑽進中央吧！'],
      enemies: { gemknight: 5, dragon: 2, penguin: 2 }, items: { bomb: 3, fire: 3, star: 1, heart: 2, clock: 1, kick: 1, line: 1, glove: 1 }, soft: 0.6, dust: 7,
    },
    {
      id: 'BOSS3', theme: 'lab', title: '金熊機甲', client: '？？？', reward: 1500, time: 235, layout: 'boss', boss: 'bear', final: true,
      brief: ['所有灰塵的源頭——', '神秘研究所的巨大機甲！'],
      enemies: {}, items: { bomb: 3, fire: 3, heart: 2, fullfire: 1, line: 1, glove: 1 }, soft: 0.25, dust: 4,
    },
  ];

  // ------------------------------------------------------------------ stage maps
  // 13 columns x 11 rows of the playfield inside the border wall.
  // H hard block · T the theme's second hard block · D footprint of a set piece · . a crate may appear · _ always open
  // Layouts not listed here ('classic', 'plaza', 'lanes', 'boss') are generated in World.build.
  G.LAYOUTS = {
    // 1-1 classroom: rows of desks, teacher's desk and blackboard up front, bookshelves by the window
    desks: {
      rows: [
        '_____DDD_____',
        '_H_H_DDD_H_T_',
        '_.._.._.._.._',
        '_H_H_H_H_H_T_',
        '_.._.._.._.._',
        '_H_H_H_H_H_T_',
        '_.._.._.._.._',
        '_H_H_H_H_H_T_',
        '_.._.._.._.._',
        '_H_H_H_H_H_H_',
        '_____________',
      ],
      decor: [{ kind: 'podium', c: 6, r: 1, w: 3, h: 2 }],
    },
    // 1-2 school store: shelf aisles with a clear lane down the middle
    store: {
      rows: [
        '_____________',
        '_T.T.T_T.T.T_',
        '_T.T.T_T.T.T_',
        '_T.T.T_T.T.T_',
        '_..........._',
        '_H.H.H_H.H.H_',
        '_..........._',
        '_T.T.T_T.T.T_',
        '_T.T.T_T.T.T_',
        '_T.T.T_T.T.T_',
        '_____________',
      ],
    },
    // 2-2 hedge maze with loops everywhere
    hedgemaze: {
      rows: [
        '_____________',
        '_HHHHH_HHHHH_',
        '_..........._',
        '_H_HHH_HHH_H_',
        '_H.........H_',
        '___HH_H_HH___',
        '_H.........H_',
        '_H_HHH_HHH_H_',
        '_..........._',
        '_HHHHH_HHHHH_',
        '_____________',
      ],
    },
    // 3-1 snowfield: snowy pines around the igloo
    snowfield: {
      rows: [
        '_____________',
        '_T.T.T.T.T.T_',
        '_..........._',
        '_T.T_____T.T_',
        '_..._DDD_..._',
        '_T.._DDD_..T_',
        '_..._DDD_..._',
        '_T.T_____T.T_',
        '_..........._',
        '_T.T.T.T.T.T_',
        '_____________',
      ],
      decor: [{ kind: 'igloo', c: 6, r: 5 }],
    },
    // 4-1 candy castle courtyard with a giant lollipop
    candyCastle: {
      rows: [
        '_____________',
        '_H.H.H.H.H.H_',
        '_..........._',
        '_H.H_____H.H_',
        '_..._DDD_..._',
        '_H.._DDD_..H_',
        '_..._DDD_..._',
        '_H.H_____H.H_',
        '_........DD._',
        '_H.H.H.H.DD._',
        '_____________',
      ],
      decor: [{ kind: 'castle', c: 6, r: 5 }, { kind: 'cane', c: 10, r: 9, w: 2, h: 2 }],
    },
    // 5-1 toy box concert: the music machine on stage, speakers on both sides
    toyStage: {
      rows: [
        '_____________',
        '_H.H.H.H.H.H_',
        '_..._____..._',
        '_H.HTDDDTH.H_',
        '_..._DDD_..._',
        '_H.HTDDDTH.H_',
        '_..._____..._',
        '_H.H.H.H.H.H_',
        '_..........._',
        '_H.H.H.H.H.H_',
        '_____________',
      ],
      decor: [{ kind: 'stage', c: 6, r: 4 }],
    },
    // 5-2 block maze: towers of toy blocks
    blocks: {
      rows: [
        '_____________',
        '_HH.HH_HH.HH_',
        '_HH.HH_HH.HH_',
        '_..........._',
        '_T.T.T_T.T.T_',
        '_..........._',
        '_HH.HH_HH.HH_',
        '_HH.HH_HH.HH_',
        '_..........._',
        '_T.T.T_T.T.T_',
        '_____________',
      ],
    },
    // 6-1 jewel palace: the giant jewelled egg ringed by blue orbs
    jewelEgg: {
      rows: [
        '_____________',
        '_T.T.T.T.T.T_',
        '_...._H_...._',
        '_T.TH___HT.T_',
        '_..._DDD_..._',
        '_T.H_DDD_H.T_',
        '_..._DDD_..._',
        '_T.TH___HT.T_',
        '_...._H_...._',
        '_T.T.T.T.T.T_',
        '_____________',
      ],
      decor: [{ kind: 'egg', c: 6, r: 5 }],
    },
    // 6-2 crystal hall: a diamond of crystals with a gap at each tip
    jewelRing: {
      rows: [
        '_____________',
        '_H.H.H_H.H.H_',
        '_....T_T...._',
        '_H.HT...TH.H_',
        '_..T.....T.._',
        '_.__..T..__._',
        '_..T.....T.._',
        '_H.HT...TH.H_',
        '_....T_T...._',
        '_H.H.H_H.H.H_',
        '_____________',
      ],
    },
  };

  // ------------------------------------------------------------------ café
  G.MENU_FOOD = [
    { id: 'cake', name: '草莓蛋糕', price: 250, desc: '下個委託 愛心 +1', icon: 'heart' },
    { id: 'pudding', name: '焦糖布丁', price: 200, desc: '下個委託 火力 +1', icon: 'fire' },
    { id: 'latte', name: '冰拿鐵', price: 180, desc: '下個委託 速度 +1', icon: 'speed' },
    { id: 'tea', name: '伯爵紅茶', price: 120, desc: '下個委託 開場特技全滿', icon: 'tea' },
  ];
  G.UPGRADES = [
    { id: 'bombs', name: '炸彈提籃', desc: '炸彈數量 +1', prices: [400, 900, 1600], icon: 'bomb' },
    { id: 'fire', name: '火力掃把', desc: '火力 +1', prices: [400, 900, 1600], icon: 'fire' },
    { id: 'speed', name: '輕盈皮鞋', desc: '速度 +1', prices: [300, 700, 1300], icon: 'speed' },
    { id: 'hearts', name: '蕾絲圍裙', desc: '愛心上限 +1', prices: [500, 1100, 2000], icon: 'heart' },
  ];
  G.GACHA_PRICE = 100;
  // Cards (N R SR SSR). fx is what a card does while it is in the deck (up to three cards, for every job):
  // coin (reward %), sp (SP at the start), time (seconds added), fire / bombs / speed / heart (+n), kick (kicks from the
  // start), pierce (+n), part (damage to a boss's parts, x n).
  G.CARDS = [
    { id: 'm_dustcat', kind: 'monster', ref: 'dustcat', rare: 1, fx: { coin: 5 } },
    { id: 'm_piggy', kind: 'monster', ref: 'piggy', rare: 1, fx: { sp: 10 } },
    { id: 'm_teddy', kind: 'monster', ref: 'teddy', rare: 1, fx: { time: 5 } },
    { id: 'm_jelly', kind: 'monster', ref: 'jelly', rare: 1, fx: { coin: 5 } },
    { id: 'm_penguin', kind: 'monster', ref: 'penguin', rare: 1, fx: { sp: 10 } },
    { id: 'm_snowkid', kind: 'monster', ref: 'snowkid', rare: 1, fx: { time: 5 } },
    { id: 'm_cupcake', kind: 'monster', ref: 'cupcake', rare: 1, fx: { coin: 5 } },
    { id: 'm_dragon', kind: 'monster', ref: 'dragon', rare: 1, fx: { sp: 10 } },
    { id: 'm_drumbun', kind: 'monster', ref: 'drumbun', rare: 1, fx: { time: 5 } },
    { id: 'm_gemknight', kind: 'monster', ref: 'gemknight', rare: 1, fx: { coin: 5 } },
    { id: 'c_berry', kind: 'maid', ref: 'berry', rare: 2, fx: { kick: 1 } },
    { id: 'c_yoru', kind: 'maid', ref: 'yoru', rare: 2, fx: { pierce: 1 } },
    { id: 'c_honey', kind: 'maid', ref: 'honey', rare: 2, fx: { sp: 20 } },
    { id: 'c_yukino', kind: 'maid', ref: 'yukino', rare: 2, fx: { time: 10 } },
    { id: 's_drill', kind: 'boss', ref: 'drill', rare: 3, name: '鑽頭機器人', desc: '理科社做的掃除機器人。', fx: { bombs: 1 } },
    { id: 's_spider', kind: 'boss', ref: 'spider', rare: 3, name: '火焰蜘蛛', desc: '頭上燒著火焰的機械蜘蛛。', fx: { fire: 1 } },
    { id: 's_boss', kind: 'boss', ref: 'bear', rare: 3, name: '金熊機甲', desc: '研究所的最終兵器。', fx: { part: 2 } },
    { id: 's_bomb', kind: 'bomb', ref: 'bomb', rare: 3, name: '女僕炸彈', desc: '戴著蕾絲髮箍的炸彈。', fx: { coin: 15 } },
  ];
  // the maids' expression cards (from the user's expression sheets): six R, four SR and two SSR a maid
  const EXPR_CARDS = {
    berry: { ssr: ['overjoy', 'peace'], sr: ['excited', 'proud', 'tender', 'smug'], r: ['rage', 'cheer', 'cry', 'wonder', 'giggle', 'panic'] },
    yoru: { ssr: ['tender', 'shy'], sr: ['content', 'wonder', 'surprise', 'serve'], r: ['calm', 'sweat', 'pout', 'rage', 'disgust', 'cry'] },
    honey: { ssr: ['gift', 'content'], sr: ['cheer', 'shy', 'wonder', 'dreamy'], r: ['worry', 'pout', 'panic', 'confused', 'nervous', 'fluster'] },
    yukino: { ssr: ['seduce', 'tender'], sr: ['confident', 'shy', 'excited', 'tease'], r: ['arrogant', 'serious', 'sad', 'angry', 'tired', 'surprise'] },
  };
  const EXPR_LABEL = {
    berry: { rage: '暴怒', smug: '得意', cheer: '元氣', cry: '哭哭', overjoy: '超開心', peace: '比YA', wonder: '驚嘆', tender: '溫柔', giggle: '偷笑', panic: '慌張', proud: '自豪', excited: '興奮' },
    yoru: { calm: '平靜', tender: '溫柔', sweat: '尷尬', content: '滿足', pout: '不悅', rage: '生氣', disgust: '嫌棄', cry: '哭泣', surprise: '驚嚇', shy: '害羞', serve: '倒茶', wonder: '驚喜' },
    honey: { cheer: '開心', worry: '擔心', pout: '鬧彆扭', panic: '慌張', confused: '暈頭轉向', dreamy: '發呆', nervous: '緊張', shy: '害羞', gift: '收到禮物', content: '滿足', fluster: '手忙腳亂', wonder: '好奇' },
    yukino: { confident: '自信', tender: '溫柔', seduce: '誘惑', arrogant: '傲慢', serious: '嚴肅', shy: '害羞', sad: '悲傷', angry: '生氣', excited: '期待', tired: '疲憊', tease: '調皮', surprise: '驚訝' },
  };
  // what they do: each maid's SR and SSR cards lean her way (Berry fire, Yoru speed and pierce, Honey bombs and hearts,
  // Yukino SP and time); the R cards take turns between coins, SP and time
  const EXPR_FX = {
    berry: { sr: { fire: 1 }, ssr: { fire: 2 } },
    yoru: { sr: { speed: 1 }, ssr: { pierce: 2 } },
    honey: { sr: { bombs: 1 }, ssr: { heart: 1 } },
    yukino: { sr: { sp: 40 }, ssr: { time: 30 } },
  };
  const R_FX = [{ coin: 10 }, { sp: 20 }, { time: 10 }];
  for (const k of Object.keys(EXPR_CARDS)) {
    const set = EXPR_CARDS[k];
    set.r.forEach((pic, i) => G.CARDS.push({ id: 'x_' + k + '_' + pic, kind: 'expr', ref: k, pic, rare: 2, label: EXPR_LABEL[k][pic], fx: Object.assign({}, R_FX[i % 3]) }));
    set.sr.forEach((pic) => G.CARDS.push({ id: 'x_' + k + '_' + pic, kind: 'expr', ref: k, pic, rare: 3, label: EXPR_LABEL[k][pic], fx: Object.assign({}, EXPR_FX[k].sr) }));
    set.ssr.forEach((pic) => G.CARDS.push({ id: 'x_' + k + '_' + pic, kind: 'expr', ref: k, pic, rare: 4, label: EXPR_LABEL[k][pic], fx: Object.assign({}, EXPR_FX[k].ssr) }));
  }
  G.RARE_NAME = { 1: 'N', 2: 'R', 3: 'SR', 4: 'SSR' };
  // the card counter: one card or five (the five-pack always has an SR or better); a card you already have pays back
  G.CARD_PRICE = 150;
  G.CARD_PRICE5 = 650;
  G.CARD_RATES = [[4, 0.04], [3, 0.16], [2, 0.32], [1, 0.48]];
  G.CARD_REFUND = { 1: 10, 2: 30, 3: 80, 4: 200 };
  G.DECK_SIZE = 3;
  // the capsule machine (G.GACHA_PRICE a turn): capsule toys by rarity (N R SR SSR) and weight
  G.CAPSULES = [
    { id: 'coin30', kind: 'coins', n: 30, rare: 1, w: 26, name: '零錢包' },
    { id: 'gift', kind: 'gift', rare: 1, w: 30, name: '小禮物' },
    { id: 'food', kind: 'food', rare: 2, w: 16, name: '甜點招待券' },
    { id: 'coin200', kind: 'coins', n: 200, rare: 2, w: 12, name: '金幣袋' },
    { id: 'card', kind: 'card', rare: 3, w: 10, name: '卡片' },
    { id: 'furniture', kind: 'furniture', rare: 3, w: 5, name: '家具' },
    { id: 'jackpot', kind: 'coins', n: 1000, rare: 4, w: 1, name: '大獎' },
  ];

  // ------------------------------------------------------------------ room & raising (育成)
  G.ROOM_SIZES = [
    { w: 6, h: 4, price: 0, name: '小房間' },
    { w: 8, h: 5, price: 600, name: '中房間' },
    { w: 10, h: 6, price: 1500, name: '大房間' },
  ];
  G.WALLPAPERS = [
    { id: 'bunny', name: '兔兔壁紙', price: 0 },
    { id: 'stripe', name: '草莓牛奶條紋', price: 150 },
    { id: 'strawberry', name: '草莓點點', price: 200 },
    { id: 'night', name: '星空壁紙', price: 250 },
    { id: 'lace', name: '蕾絲壁紙', price: 260 },
    { id: 'shoji', name: '和式紙門', price: 260 },
  ];
  G.FLOORS = [
    { id: 'wood', name: '木地板', price: 0 },
    { id: 'carpet', name: '粉紅地毯', price: 150 },
    { id: 'checker', name: '格子磁磚', price: 200 },
    { id: 'tatami', name: '榻榻米', price: 220 },
  ];
  // w/h in tiles; over = pixels the sprite rises above its footprint; use = what clicking it does
  G.FURNITURE = {
    bed: { name: '小木床', price: 0, w: 1, h: 2, over: 4, use: 'sleep', desc: '在這裡休息到隔天。', unique: true },
    princess: { name: '公主床', price: 900, w: 2, h: 2, over: 10, use: 'sleep', desc: '睡醒時心情 +15。', unique: true },
    desk: { name: '書桌', price: 0, w: 1, h: 1, over: 8, use: 'train', desc: '在這裡進行特訓。', unique: true },
    wardrobe: { name: '衣櫃', price: 0, w: 1, h: 1, over: 12, use: 'wardrobe', desc: '讓別的女僕來值班。', unique: true },
    teatable: { name: '下午茶桌', price: 300, w: 1, h: 1, over: 4, use: 'tea', desc: '可以一起喝下午茶。', unique: true },
    bookshelf: { name: '書櫃', price: 400, w: 1, h: 1, over: 12, use: 'diary', desc: '特訓經驗值 +20%。', unique: true },
    plant: { name: '盆栽', price: 120, w: 1, h: 1, over: 8, use: 'water', desc: '澆水讓心情變好。' },
    plush: { name: '兔兔抱枕', price: 250, w: 1, h: 1, over: 4, use: 'hug', desc: '摸頭時好感度多 +1。', unique: true },
    rug: { name: '愛心地毯', price: 200, w: 2, h: 2, over: 0, layer: 'floor', use: null, desc: '心情不容易變差。', unique: true },
    piano: { name: '小鋼琴', price: 800, w: 2, h: 1, over: 10, use: 'piano', desc: '每天聽女僕彈一曲。', unique: true },
    lamp: { name: '立燈', price: 150, w: 1, h: 1, over: 12, use: 'lamp', desc: '溫暖的燈光。' },
    fishbowl: { name: '金魚缸', price: 280, w: 1, h: 1, over: 4, use: 'fish', desc: '每天餵魚，心情 +4。', unique: true },
    dresser: { name: '梳妝台', price: 350, w: 1, h: 1, over: 12, use: 'dresser', desc: '每天梳妝打扮，心情 +6。', unique: true },
    sofa: { name: '愛心沙發', price: 450, w: 2, h: 1, over: 6, use: 'sofa', desc: '每天坐著休息，體力 +15。', unique: true },
    gramophone: { name: '留聲機', price: 600, w: 1, h: 1, over: 12, use: 'music', desc: '播放唱片，心情 +5。', unique: true },
    sandbag: { name: '沙包', price: 400, w: 1, h: 1, over: 14, use: 'punch', desc: '莓果專用。打一輪，心情 +5、力量經驗 +4。', unique: true, who: 'berry' },
    toybox: { name: '玩具箱', price: 380, w: 1, h: 1, over: 6, use: 'toy', desc: '蜜糖專用。翻玩具，心情 +6。', unique: true, who: 'honey' },
    vase: { name: '玫瑰花瓶', price: 420, w: 1, h: 1, over: 12, use: 'flower', desc: '雪乃專用。插花整理，心情 +5、好感 +1。', unique: true, who: 'yukino' },
    screen: { name: '和式屏風', price: 480, w: 2, h: 1, over: 14, use: 'screen', desc: '夜子專用。她會躲到屏風後面。', unique: true, who: 'yoru' },
  };
  // cheapest first, so the shop reads as a wish list you work up
  // who: only that maid's shop carries it, and it only ever stands in her room
  G.FURNITURE_SHOP = ['plant', 'lamp', 'rug', 'plush', 'fishbowl', 'teatable', 'dresser', 'bookshelf', 'sofa', 'gramophone', 'piano', 'princess', 'sandbag', 'toybox', 'vase', 'screen'];
  // every maid keeps her own room: her paper, her floor, and the piece that suits her
  G.ROOM_STYLE = {
    berry: { wall: 'bunny', floor: 'wood' },
    honey: { wall: 'strawberry', floor: 'carpet' },
    yukino: { wall: 'lace', floor: 'checker' },
    yoru: { wall: 'shoji', floor: 'tatami' },
  };
  G.ROOM_DEFAULT = {
    size: 0, wall: 'bunny', floor: 'wood',
    owned: { bed: 1, desk: 1, wardrobe: 1 },
    placed: [{ id: 'bed', c: 0, r: 0 }, { id: 'desk', c: 4, r: 0 }, { id: 'wardrobe', c: 5, r: 0 }],
    walls: { bunny: true }, floors: { wood: true },
  };

  // Every gift does something of its own, and the shop says what (desc): stamina, mood, training experience (exp, by
  // training id) or a charm for the next job (buff). How much affection it brings, and how she takes it, depends on her
  // taste (G.TRAITS[k].taste, see G.GIFT_TASTE); the effect itself is always what the shop promised.
  G.GIFTS = [
    { id: 'daifuku', name: '草莓大福', price: 60, fav: 'berry', aff: 6, stamina: 20, desc: '體力 +20' },
    { id: 'honeycake', name: '蜂蜜蛋糕', price: 60, fav: 'honey', aff: 6, stamina: 10, mood: 10, desc: '體力 +10・心情 +10' },
    { id: 'icecream', name: '香草冰淇淋', price: 60, fav: 'yukino', aff: 6, mood: 25, desc: '心情 +25' },
    { id: 'matcha', name: '抹茶羊羹', price: 60, fav: 'yoru', aff: 6, mood: 10, exp: { hou: 15 }, desc: '心情 +10・家事經驗 +15' },
    { id: 'drink', name: '運動飲料', price: 90, aff: 3, stamina: 50, desc: '體力 +50' },
    { id: 'novel', name: '推理小說', price: 120, aff: 8, exp: { bom: 25 }, desc: '爆破研究經驗 +25' },
    { id: 'charm', name: '幸運御守', price: 180, aff: 8, buff: 'charm', desc: '下次委託免死一次' },
    { id: 'bouquet', name: '玫瑰花束', price: 150, fav: 'all', aff: 15, mood: 100, desc: '好感 +15・心情全滿' },
    { id: 'ribbon', name: '蕾絲髮帶', price: 320, fav: 'all', aff: 32, desc: '好感 +32' },
  ];
  // what her taste does to a gift: affection multiplier and a little extra mood. 'secret' is Yoru's: she says she does
  // not care for it and takes it like a gift she likes.
  G.GIFT_TASTE = {
    love: { aff: 2.5, mood: 15 },
    like: { aff: 1.5, mood: 8 },
    normal: { aff: 1, mood: 3 },
    meh: { aff: 0.5, mood: 0 },
    secret: { aff: 1.5, mood: 8 },
  };
  G.tasteOf = (maid, giftId) => (G.TRAITS[maid] && G.TRAITS[maid].taste[giftId]) || 'normal';

  // affection: points needed for Lv1..Lv5, what each level gives on a job (perk) and what it opens up in the room (unlock)
  G.AFF_LEVELS = [
    { at: 0, name: '陌生', perk: '—' },
    { at: 30, name: '熟悉', perk: '委託開始時 SP +20', unlock: '牽手散步' },
    { at: 90, name: '信賴', perk: '委託中愛心 +1', unlock: '拍照' },
    { at: 180, name: '親密', perk: '委託報酬 +20%', unlock: '抱抱' },
    { at: 300, name: '最愛', perk: '愛的守護：每次委託免死一次', unlock: '悄悄話' },
  ];
  G.TRAIN_LV = [0, 30, 80, 150, 240, 360];
  G.TRAININGS = [
    { id: 'str', name: '體能鍛鍊', stamina: 20, exp: 10, mood: -4, anim: 'jump', icon: 'heart', short: 'Lv2/4 愛心+1', desc: '愛心上限 +1（Lv2、Lv4）' },
    { id: 'agi', name: '敏捷訓練', stamina: 20, exp: 10, mood: -4, anim: 'run', icon: 'speed', short: 'Lv2/5 速度+1', desc: '速度 +1（Lv2、Lv5），受傷後無敵更久' },
    { id: 'bom', name: '爆破研究', stamina: 15, exp: 8, mood: -2, anim: 'study', icon: 'bomb', short: 'Lv2 火力 Lv4 炸彈', desc: '火力 +1（Lv2）、炸彈 +1（Lv4）' },
    { id: 'hou', name: '家事練習', stamina: 10, exp: 8, mood: 3, anim: 'sweep', icon: 'broom', short: '打掃獎勵・省SP', desc: '掃灰塵獎勵變多，特技更省 SP（Lv3、Lv5）' },
  ];
  G.JOB_STAMINA = 20;

  G.INTRO_LINES = [
    '「蕾絲町」——一座被灰塵怪佔領的小鎮。',
    '你搬進洋館裡的一間小房間，成為新的主人。',
    '為了打掃小鎮、賺點生活費……',
    '你決定雇用一位女僕！',
  ];
  G.GUIDE = [
    { key: 'pat', text: '把手套移到女僕頭上按 Z，摸摸她的頭', reward: 30 },
    { key: 'talk', text: '點女僕的身體打開選單，和她聊聊天', reward: 30 },
    { key: 'train', text: '點書桌進行特訓，讓她變得更強', reward: 50 },
    { key: 'out', text: '點下方的門口出門，接下第一個委託吧', reward: 0 },
    { key: 'shop', text: '用賺到的金幣買家具吧！點右上角的「佈置」', reward: 0 },
  ];
  G.MORNING_EVENTS = [
    { text: '{maid}烤了點心要送給你！', gift: true },
    { text: '在床底下撿到了 40G！', coins: 40 },
    { text: '{maid}一早就把房間擦得亮晶晶。', mood: 8, aff: 3 },
    { text: '{maid}泡了早安紅茶，心情很好。', mood: 12 },
  ];

  // dialogue: talk pools are indexed by affection level (0-4)
  G.LINES = {
    berry: {
      intro: '初次見面！我是莓果！從今天起就是主人的女僕了，請多指教！',
      // what she says at each piece of furniture, and when there is nothing left to do there today
      furn: {
        water: '水！給我長高高——！嘿咻！',
        hug: '兔兔！陪我練習抱摔——開玩笑的啦！',
        fish: '開飯囉！一、二、三，搶食比賽開始！',
        dresser: '頭髮又翹起來了！壓一壓……好，出發！',
        sofa: '呼——！剛剛的特訓超累的！再五分鐘就好！',
        music: '這首超燃！跟著節奏動起來——！',
        lamp: '開燈！這樣才看得清楚敵人……啊，沒有敵人。',
        piano: '我只會彈這首——嘿！咚咚咚！',
        rug: '地毯！翻滾練習的最佳場地！',
        sleep: '睡飽才有力氣！晚安，主人！',
        train: '特訓時間！今天要打破紀錄！',
        wardrobe: '換班？好啊——大家一起上！',
        tea: '茶！還有點心！點心呢——？',
        diary: '這本是我的成長紀錄！看看我變多強！',
        sandbag: '看我的——！一、二、三！打完精神百倍！',
      },
      furnDone: '今天份的已經做完啦！明天再一起！',
      greet: ['主人早安！今天也要全力衝刺！', '主人！莓果已經熱身完畢，隨時可以上！', '嘿嘿，主人來啦～今天要打倒幾隻灰塵？'],
      pat: ['欸嘿嘿……被摸頭了～力量湧上來了！', '唔、主人的手好溫暖……', '再、再摸一下也可以喔！'],
      patMany: ['主人，頭髮要被摸亂啦！', '好、好了啦！夠了夠了！'],
      poke: ['呀！主人，偷襲犯規啦！', '嘿嘿，戳臉頰好癢喔～'],
      pokeMany: '再戳下去，莓果要反擊囉！',
      highFive: ['耶——！擊掌！我們是最強搭檔！', '好痛快！再來一次！'],
      tickle: ['哈哈哈！住手、住手啦主人！', '呀哈哈！我、我最怕癢了！'],
      tickleMany: '呼……呼……笑到肚子好痛……今天不行了！',
      patLow: ['欸？摸、摸頭？……主人突然這樣，莓果會嚇一跳的啦！', '唔……還不太習慣，不過不討厭喔！'],
      patHigh: ['嘿嘿～主人的手最棒了！再多摸一點！', '被主人摸頭，莓果就充滿力量了！最喜歡了！'],
      pokeLow: ['呀！主人，偷襲犯規！', '戳、戳臉頰？主人好奇怪喔！'],
      pokeHigh: ['嘿嘿，戳回去！……開玩笑的啦～', '主人想要莓果看你嗎？莓果一直都在看你喔！'],
      fiveLow: ['擊、擊掌？好！耶！', '這樣就是搭檔了嗎？好，莓果會加油！'],
      fiveHigh: ['耶——！我們是最強的搭檔！永遠都是！', '跟主人擊掌，什麼委託都不怕了！'],
      tickleLow: ['哇哈哈！住、住手啦！', '主人！這樣很犯規耶！哈哈！'],
      tickleHigh: ['哈哈哈！好啦好啦，主人最壞了～', '呀哈哈！莓果投降！最喜歡主人了！'],
      handLow: ['牽、牽手？……好、好啊！莓果帶路！', '主人的手好大喔……有點緊張耶。'],
      hand: ['嘿嘿，一起散步！主人要跟上喔！', '牽著手走，房間好像變大了呢！'],
      handHigh: ['不放開喔！今天一整天都不放開！', '跟主人牽手走路，是莓果最喜歡的事！'],
      photo: ['耶！V！拍得帥一點喔！', '再一張！這次莓果要跳起來拍！'],
      photoHigh: ['要跟主人的照片放在一起喔！', '嘿嘿，這張要當成寶物！'],
      hug: ['抱——！嘿嘿，莓果的力氣很大喔，要抱緊囉！', '主人好溫暖……再、再一下下就好……', '充電完畢！現在什麼都做得到！'],
      whisperIn: '主人，靠過來一點……（小聲）',
      whisper: ['其實……莓果最想保護的，不是委託，是主人。', '打雷的晚上，只要想到主人，就不怕了喔。', '這是秘密……莓果以後也想一直當主人的女僕。'],
      locked: '欸？那個……等我們再熟一點啦！',
      greetHigh: ['主人！等你好久了！今天也要一直在一起喔！', '主人來了！莓果的元氣全開了！'],
      seek: ['主人主人！陪莓果玩嘛！', '主人，摸摸頭！……不行嗎？'],
      seekPat: '嘿嘿，就是在等這個！',
      // her questions: you pick an answer, she answers back (1 = it pleases her)
      ask: [
        { q: '主人！草莓跟巧克力，你比較喜歡哪個？', a: [['草莓', '對吧對吧！莓果就知道主人最懂了！', 1], ['巧克力', '唔……那莓果就做草莓巧克力！兩個都有！', 0]] },
        { q: '如果莓果跟灰塵怪物打起來，主人會幫誰加油？', a: [['當然是莓果', '嘿嘿！有主人加油，莓果一百倍強！', 1], ['灰塵怪物', '欸——！主人好過分！莓果要哭了喔！……騙你的！', 0]] },
        { q: '主人，休假的時候想做什麼？', a: [['一起出去玩', '好耶！去公園跑步，然後吃可麗餅！', 1], ['在家睡覺', '那莓果幫主人把被子曬得鬆鬆軟軟的！', 1]] },
      ],
      talk: [
        ['我小時候在道場練了十年空手道！', '打掃跟練拳一樣，靠的是氣勢！', '主人的房間有點亂耶，我來整理！', '莓果的座右銘是「一擊必殺」！打掃也是！'],
        ['主人喜歡草莓嗎？我超喜歡的！', '上次委託，我踢飛了好多炸彈喔！', '跟主人說話，心情就會變好呢！', '主人，要不要一起晨跑？很舒服喔！'],
        ['就算怪物再多，我也會保護主人！', '主人，我們是最棒的搭檔對吧？', '偷偷告訴你，我其實很怕打雷……', '主人受傷的話，莓果會很難過的……要小心喔。'],
        ['能當主人的女僕，真的太好了。', '主人……今天也可以待在我身邊嗎？', '主人的手……好想再牽一次。啊，沒、沒什麼！'],
        ['最喜歡主人了！……啊，說出來了！', '不管去哪裡，莓果都跟著主人喔！', '主人，莓果以後也可以一直在這裡嗎？……嘿嘿，說好了喔！'],
      ],
      talkMany: '今天聊好多喔！剩下的明天再說吧♪',
      giftLike: '草莓大福！主人怎麼知道我最愛這個！',
      giftNormal: '謝謝主人！我會好好珍惜的！',
      giftMany: '今天收到好多禮物了，留到明天嘛！',
      giftFond: '{gift}！好耶——謝謝主人，莓果收下了！',
      giftMeh: '字、字好多……莓果看了頭會暈啦……不過我會努力讀讀看！',
      giftUse: { stamina: '力氣全部回來了！現在就能出擊！', mood: '嘿嘿，心情超好的！', study: '唔……好像學到了什麼！', charm: '有這個在，下次委託莓果一定贏！' },
      tea: '呼～和主人喝茶好幸福喔。',
      tired: '呼……主人，讓我休息一下嘛……',
      train: '好！特訓開始！看我的！',
      trainDone: '呼！流了好多汗，感覺變強了！',
      jobGo: '莓果，出擊！主人等我好消息！',
      jobBack: '我回來了！委託順利完成～',
      jobFail: '嗚嗚……被炸得黑漆漆的……',
      sleep: '主人晚安……明天見……',
      levelUp: '和主人的距離，好像又更近了一點呢！',
      piano: '嘿嘿，我只會彈「小星星」啦♪',
      // greetings by the real clock, the real weekday and today's sky
      hello: {
        morning: '主人早安！今天也從打掃開始吧！',
        noon: '主人午安！中午了，要不要吃點什麼？',
        evening: '主人，太陽快下山了，今天也辛苦了！',
        night: '這麼晚還沒睡？莓果陪主人到你想睡為止！',
      },
      week: {
        weekday: '平日的主人也很努力呢，我也要加油！',
        weekend: '今天是假日耶！要不要一起出門走走？',
      },
      sky: {
        sun: '今天天氣真好！把被子拿去曬一曬吧！',
        cloud: '陰陰的天氣，打掃起來反而不會熱呢。',
        rain: '下雨了……不過雨聲聽起來很舒服對吧？',
        snow: '下雪了！主人，等一下來堆雪人嘛！',
        petal: '櫻花在飄耶！等一下去散步好不好？',
        storm: '打、打雷了……！沒、沒事，莓果不怕！',
      },
    },
    yoru: {
      intro: '……夜子。從今天起，主人的一切，由我管理。',
      // what she says at each piece of furniture, and when there is nothing left to do there today
      furn: {
        water: '……喝吧。長不大的話，我可不管你。',
        hug: '……只有現在。看到了就當作沒看到。',
        fish: '……吃吧。被養著的感覺，不壞吧。',
        dresser: '……看什麼。轉過去。',
        sofa: '……這個位子是我的。要坐的話，坐地上。',
        music: '……安靜一點的曲子。吵的話，我就關掉。',
        lamp: '……太亮了。這樣剛好。',
        piano: '……（一個低音）。這樣就夠了。',
        rug: '……踩起來，還不錯。',
        sleep: '……先說好，不准偷看我的睡臉。',
        train: '……看著。學得起來就算你厲害。',
        wardrobe: '……我的衣服，別亂碰。',
        tea: '……茶泡好了。涼掉的話，是你的錯。',
        diary: '……這本，寫著你的事。要看嗎。',
        screen: '……我在這後面。找得到再說。',
      },
      furnDone: '……今天已經夠了。別貪心。',
      greet: ['……主人。', '……來了啊。', '……嗯。（點頭）'],
      pat: ['……哼。', '……可以，繼續。', '……這種事，只准主人做。'],
      patMany: ['……夠了。', '……再摸，這隻手就不還你了。'],
      poke: ['……大膽。', '……這張臉，看夠了嗎。'],
      pokeMany: '……下次換我戳回去。做好覺悟。',
      highFive: ['……啪。力道太弱了。', '……再一次。這次認真點。'],
      tickle: ['……！別、別碰那裡……！', '……唔……！這筆帳，我記下了。'],
      tickleMany: '……主人。今晚睡覺時，小心點。',
      patLow: ['……別碰我。', '……（瞪）'],
      patHigh: ['……嗯。可以再一下。', '……只有主人，可以。'],
      pokeLow: ['……再戳，就砍了。', '……無聊。'],
      pokeHigh: ['……主人，很閒嗎。……那就陪你。', '……（戳回去）……扯平了。'],
      fiveLow: ['……擊掌？……哼。', '……勉強配合你。'],
      fiveHigh: ['……嗯。今天也，辛苦了。', '……主人的手，很暖。'],
      tickleLow: ['……住手。……唔、……住手。', '……（忍住）……'],
      tickleHigh: ['……噗。……剛才，什麼都沒發生。', '……主人，犯規。……哈、……哈哈。'],
      handLow: ['……只是，怕你迷路。', '……手。……借你一下。'],
      hand: ['……慢一點。我跟得上。', '……走吧。去哪都行。'],
      handHigh: ['……別放開。……這是命令。', '……主人的手，我記住了。'],
      photo: ['……別拍。……拍了就算了。', '……這表情，不准給別人看。'],
      photoHigh: ['……一張就好。……好好收著。', '……笑了嗎？……你看錯了。'],
      hug: ['……！……突然這樣，犯規。', '……一下下。……就一下下。', '……心跳，太吵了。……不是我的。'],
      whisperIn: '……過來。……耳朵。',
      whisper: ['……夜子這個名字，只想被主人叫。', '……我不擅長說話。……但，喜歡主人。', '……那個蝴蝶結，還留著。……一直。'],
      locked: '……還早。',
      greetHigh: ['……主人。……等你。', '……來了。……（微笑）'],
      seek: ['……主人。……（站在旁邊）', '……頭。……可以摸。'],
      seekPat: '……嗯。……很好。',
      napWake: '……沒睡。……真的。',
      // her questions: you pick an answer, she answers back (1 = it pleases her)
      ask: [
        { q: '……主人。喜歡夜晚，還是白天。', a: [['夜晚', '……嗯。夜晚安靜。……和我一樣。', 1], ['白天', '……是嗎。……那我就在白天，也陪著你。', 1]] },
        { q: '……抹茶，要不要加糖。', a: [['不加', '……懂的人。……很好。', 1], ['加很多', '……（沉默）……下次，泡甜的給你。', 0]] },
        { q: '……如果我不見了，主人會找嗎。', a: [['一定會找', '……笨蛋。……我不會走的。', 1], ['你會回來的', '……嗯。……不管多遠，都會回來。', 1]] },
      ],
      talk: [
        ['……有事？', '……灰塵，都斬乾淨了。', '……這個房間的每個角落，我都記得。', '……我的刀，叫「月影」。……別碰。'],
        ['……主人的杯子放歪了。我調好了。', '……話多的人，我不擅長應付。', '……看主人忙來忙去，很有趣。', '……主人，話很多。……不討厭。'],
        ['……主人今天也在看我。……可以再看久一點。', '……害羞的表情，不錯。', '……別離開我的視線範圍。', '……任務的時候，背後交給我。'],
        ['……主人是我的。這點不用討論。', '……偶爾，我也想被誇獎。', '……今晚的月亮，很漂亮。……一起看。'],
        ['……主人，過來。……嗯，這樣就好。', '……要是逃跑，我會去追。', '……主人。……一直在。……我也是。'],
      ],
      talkMany: '……今天，說太多了。',
      giftLike: '……抹茶。……算你識相。',
      giftNormal: '……收下了。',
      giftMany: '……今天夠了。剩下的，明天再給。',
      giftFond: '……{gift}。……還行。',
      giftMeh: '……太甜了。……不過，吃完了。',
      giftSecret: ['……蕾絲？這種東西，不適合我。', '……明天，戴給你看。'],
      giftUse: { stamina: '……嗯。可以再陪你一會。', mood: '……哼。還不錯。', study: '……記住了。', charm: '……我不需要保護。……不過，收下了。' },
      tea: '……溫度剛好。……我可沒說謝謝。',
      tired: '……有點累。……不准笑。',
      train: '……開始。別眨眼。',
      trainDone: '……還不夠。',
      jobGo: '……去了。',
      jobBack: '……結束了。無聊。',
      jobFail: '……失手了。……別安慰我。',
      sleep: '……晚安。……別做奇怪的夢。',
      levelUp: '……主人，你已經逃不掉了。',
      piano: '……只會這一首。……別笑。',
      hello: {
        morning: '……早。',
        noon: '……午安。……吃飯了嗎。',
        evening: '……天黑了。……我的時間。',
        night: '……還醒著？……陪我一下。',
      },
      week: {
        weekday: '……平日。街上很安靜，我喜歡。',
        weekend: '……假日。……今天，哪裡都別去。',
      },
      sky: {
        sun: '……太陽。……太刺眼了。',
        cloud: '……雲很厚。……要下雨了。',
        rain: '……雨。……正好，適合睡覺。',
        snow: '……雪。……手，冷嗎。',
        petal: '……櫻花。……會掉在主人頭上。',
        storm: '……打雷。……怕的話，可以靠過來。',
      },
    },
    honey: {
      intro: '主人好～我是蜜糖！以後每天都做點心給主人吃喔♪',
      // what she says at each piece of furniture, and when there is nothing left to do there today
      furn: {
        water: '咦？剛剛是不是已經澆過了……？再一點點好了。',
        hug: '呼……兔兔最會聽人說話了呢。',
        fish: '啊，飼料……咦，我剛剛是不是倒太多了？',
        dresser: '咦，髮夾……剛剛明明放在這裡的……',
        sofa: '這裡好軟……主人，我睡一下下就好……呼……',
        music: '啊，這首歌……咦，歌名是什麼來著？',
        lamp: '暖暖的……啊，飛蛾！沒事沒事，不要怕～',
        piano: '咦……啊，彈錯了。再、再一次！',
        rug: '毛毛的……在這裡打滾一下下好了……',
        sleep: '棉被……啊，是不是忘了關燈……算了……',
        train: '筆記……咦，昨天寫到哪裡了呢？',
        wardrobe: '咦，我的圍裙……啊，穿在身上。',
        tea: '我來倒……啊，滿出來了！等、等一下！',
        diary: '咦，書怎麼倒了……啊，是我放反了。',
        toybox: '哇……好多玩具！咦，這個是什麼來著？',
      },
      furnDone: '咦……好像已經做過了？嗯，做過了。',
      greet: ['主人早安～咦，現在是早上……對吧？', '啊、主人！蜜糖剛剛在找主人……咦，找什麼來著？', '主人主人～今天的點心是……啊，忘記放糖了。'],
      pat: ['欸嘿嘿……舒服～', '呼哇……頭有點暈……啊不是，是開心！', '主人的手，聞起來有餅乾的味道……咦？'],
      patMany: ['呀……頭髮會變成鳥窩啦～', '好、好了啦……蜜糖要暈了……'],
      poke: ['呀！……咦，剛剛是誰戳我？', '嘿嘿，臉頰軟軟的對吧？'],
      pokeMany: '主、主人……再戳下去，蜜糖要哭了喔？',
      highFive: ['耶～擊掌♪……啊，打歪了。', '嘿嘿，手掌好燙喔～'],
      tickle: ['呀哈哈！住手～會、會打翻東西的！', '哈哈哈！不、不行啦主人～'],
      tickleMany: '呼……呼……蜜糖的腦袋，已經變成棉花糖了……',
      patLow: ['咦？頭上有什麼東西嗎？……啊，是主人的手！', '欸嘿……有點不好意思呢……'],
      patHigh: ['欸嘿嘿～主人摸頭好舒服……蜜糖要睡著了……', '再摸一下下嘛～蜜糖最喜歡主人了～'],
      pokeLow: ['呀？臉、臉頰怎麼了嗎？', '咦？蜜糖臉上沾到東西了嗎？'],
      pokeHigh: ['唔～主人壞壞，蜜糖也要戳回去！', '欸嘿嘿，被主人戳了～好開心～'],
      fiveLow: ['擊、擊掌？啊，手舉錯邊了……', '耶……？這樣對嗎？'],
      fiveHigh: ['耶～！跟主人擊掌，今天也會很順利喔～', '啪！欸嘿嘿，蜜糖這次有對準了！'],
      tickleLow: ['呀哈哈！好、好癢！不要啦～', '哇、哇啊！蜜糖會跌倒的！'],
      tickleHigh: ['欸嘿嘿嘿～主人好壞～蜜糖要生氣了喔～（沒有生氣）', '哈哈哈～好癢好癢～最喜歡主人了～'],
      handLow: ['欸？要牽手嗎？……那、那蜜糖就不會迷路了！', '手、手心好像出汗了……欸嘿嘿。'],
      hand: ['跟主人一起走，就不會迷路了～', '欸嘿嘿，散步散步～要去哪裡呢？'],
      handHigh: ['主人的手暖暖的……蜜糖想一直牽著～', '就算迷路也沒關係，因為主人在嘛～'],
      photo: ['要、要笑嗎？像這樣？欸嘿嘿……', '欸嘿嘿，拍到蜜糖最可愛的樣子了嗎？'],
      photoHigh: ['欸嘿嘿，要跟主人一起拍嗎？', '這張照片，蜜糖要貼在床頭～'],
      hug: ['哇～主人抱抱～蜜糖要融化了～', '欸嘿嘿……好安心……好想睡……', '軟綿綿的……啊，是蜜糖自己啦。'],
      whisperIn: '主人主人，悄悄話喔……（小聲）',
      whisper: ['蜜糖常常迷路……可是回主人身邊的路，從來沒忘過喔。', '兔兔跟蜜糖說，牠也最喜歡主人了～', '蜜糖做的蛋糕……第一塊永遠是主人的。'],
      locked: '欸？那個……蜜糖還會害羞啦……',
      greetHigh: ['主人～！蜜糖好想你喔～', '欸嘿嘿，主人來了～蜜糖今天有好好記得等你喔～'],
      seek: ['主人～蜜糖找到你了～', '主人，蜜糖想被摸摸頭～'],
      seekPat: '欸嘿嘿～被發現了～',
      // her questions: you pick an answer, she answers back (1 = it pleases her)
      ask: [
        { q: '主人，蜜糖剛剛要說什麼來著……主人知道嗎？', a: [['想說喜歡我？', '欸、欸欸！？……好、好像是那個沒錯……欸嘿嘿……', 1], ['我也不知道', '對吧～那就一起想吧～……啊，想不起來了～', 0]] },
        { q: '蜂蜜蛋糕跟冰淇淋，要先吃哪個？', a: [['先吃蜂蜜蛋糕', '欸嘿嘿，跟蜜糖想的一樣～！', 1], ['先吃冰淇淋', '對喔，冰淇淋會融化！主人好聰明～', 1]] },
        { q: '主人，兔兔的名字要叫什麼好呢？', a: [['叫「棉花糖」', '棉花糖！軟綿綿的，好可愛～就決定是你了！', 1], ['叫「蜜糖二號」', '蜜糖二號……？那蜜糖是一號嗎？欸嘿嘿～', 0]] },
      ],
      talk: [
        ['今天的鬆餅……咦，我烤了嗎？', '砂糖和鹽長得好像喔，主人覺得呢？', '蜜糖最喜歡烤點心了♪', '蜜糖的兔兔很會跳喔～比蜜糖還會跳～'],
        ['啊、主人的杯子，我洗過了……應該吧？', '小兔子今天也很有精神喔～', '跟主人在一起，就會忘記時間呢。', '主人，蜜糖今天有乖乖沒迷路喔！……大概。'],
        ['主人愛吃甜的嗎？蜜糖記起來了！', '欸嘿嘿，剛剛在想主人的事，結果糖放了兩次。', '主人笑起來的樣子，蜜糖最喜歡了。', '主人說話的聲音，蜜糖聽了就會安心～'],
        ['主人，今天也留在蜜糖身邊嘛～', '啊……剛剛想說什麼來著？……嗯，喜歡主人！', '主人……蜜糖可以靠著你一下下嗎？好睏……'],
        ['主人是蜜糖的第一名喔♪', '欸嘿嘿……牽手可以嗎？', '蜜糖最喜歡的東西……第一名是主人，第二名是蛋糕！'],
      ],
      talkMany: '呼哇～聊到頭昏了，剩下的明天再說吧♪',
      giftLike: '蜂蜜蛋糕！主人怎麼知道……啊，我說過好幾次了對吧♪',
      giftNormal: '謝謝主人～蜜糖會好好收著的！',
      giftMany: '今天收好多禮物……咦，剛剛那個放哪去了？',
      giftFond: '哇～{gift}！……咦，真的是給蜜糖的嗎？',
      giftMeh: '苦、苦苦的……蜜糖會加油吃完的……嗚。',
      giftUse: { stamina: '好像……充滿電了？蜜糖現在超有精神！', mood: '欸嘿嘿～好幸福喔～', study: '學、學到了……吧？欸嘿嘿。', charm: '要好好收著……先放口袋……咦，哪個口袋？' },
      tea: '啊、砂糖放了兩次……主人，這杯會很甜喔？',
      tired: '呼哇……主人，蜜糖的腳站不太住了……',
      train: '特訓……咦，今天是要練什麼來著？',
      trainDone: '呼～流了好多汗！……啊，鬆餅忘在烤箱裡了！',
      jobGo: '蜜糖出發囉～啊、鑰匙，鑰匙帶了嗎？',
      jobBack: '我回來了～欸嘿嘿，路上迷了一下下路。',
      jobFail: '嗚嗚……奶油都烤焦了……',
      sleep: '晚安，主人～夢裡也要一起吃蛋糕喔♪',
      levelUp: '主人對蜜糖的好感度……爆表了♪',
      piano: '這首曲子叫「鬆餅圓舞曲」喔♪',
      hello: {
        morning: '主人早安～今天的紅茶已經泡好囉♪',
        noon: '主人午安～要不要休息一下吃塊蛋糕？',
        evening: '傍晚了呢～主人晚餐想吃什麼呀？',
        night: '夜深了喔，別太勉強……蜜糖陪著主人♪',
      },
      week: {
        weekday: '平日辛苦了～回到這裡就好好放鬆吧♪',
        weekend: '今天是假日呢～要慢慢過，還是出去玩？',
      },
      sky: {
        sun: '陽光好舒服～小兔子也在曬太陽呢♪',
        cloud: '雲有點多呢，出門記得帶把傘喔。',
        rain: '雨天的午後，最適合配紅茶了♪',
        snow: '下雪了……主人，手會不會冷呀？',
        petal: '啊、花瓣掉進紅茶裡了……這樣也很香吧？',
        storm: '呀！打、打雷了……蜜糖可以躲在主人後面嗎？',
      },
    },
    yukino: {
      intro: '我是雪乃。年紀比大家都大一點，就讓姊姊來照顧主人吧。',
      // what she says at each piece of furniture, and when there is nothing left to do there today
      furn: {
        water: '葉子上的灰塵也擦一擦……好，這樣才漂亮。',
        hug: '呵呵，主人也想抱抱嗎？姊姊讓給你喔。',
        fish: '水溫也要顧好喔。金魚是很怕冷的。',
        dresser: '主人，姊姊今天的髮型……還可以嗎？',
        sofa: '主人也坐下吧？姊姊的腿可以借你。',
        music: '這張唱片很有味道呢。要一起聽嗎？',
        lamp: '燈光調暗一點，眼睛比較舒服喔。',
        piano: '小時候學過一點點。……還記得呢。',
        rug: '地毯下面也要掃喔，灰塵最愛躲在那裡。',
        sleep: '主人也早點休息喔。姊姊會擔心的。',
        train: '先複習昨天的，再往前走一步。',
        wardrobe: '要換誰來值班呢？姊姊都可以喔。',
        tea: '今天泡的是紅茶。慢慢喝，不用急。',
        diary: '書要照順序放，找起來才快喔。',
        vase: '花也要修剪過才漂亮喔。主人想要哪一朵？',
      },
      furnDone: '今天已經好囉。明天再說吧？',
      greet: ['主人，早安。姊姊等你很久囉。', '呵呵，主人來了。今天想做什麼呢？', '慢慢來就好，姊姊會陪著你。'],
      pat: ['呵呵……被主人摸頭，感覺很新鮮呢。', '好乖好乖……啊，反過來了。', '真是的，主人也太會撒嬌了。'],
      patMany: ['好了好了，頭髮會亂掉喔。', '呵呵，撒嬌也要適可而止呢。'],
      poke: ['呀……真是的，主人。', '呵呵，戳姊姊的臉頰很好玩嗎？'],
      pokeMany: '再鬧下去，姊姊可要處罰你囉？',
      highFive: ['來，擊掌。做得很好喔。', '呵呵，配合得真好。'],
      tickle: ['呀……！主、主人，太犯規了……', '哈哈……！等、等一下……！'],
      tickleMany: '呼……真是的。姊姊也是會怕癢的。',
      patLow: ['……主人？被摸頭有點意外呢。', '呵呵，主人對姊姊也會這樣嗎？'],
      patHigh: ['呵呵……被主人摸頭，姊姊也會想撒嬌的呢。', '真拿你沒辦法……只准主人喔。'],
      pokeLow: ['主人，這樣很失禮喔。……呵呵，開玩笑的。', '嗯？怎麼了，有話要跟姊姊說嗎？'],
      pokeHigh: ['呵呵，主人想要姊姊多看你一點嗎？', '真是的……要戳的話，換姊姊戳你喔？'],
      fiveLow: ['擊掌嗎？好的，辛苦了。', '呵呵，很有精神呢，主人。'],
      fiveHigh: ['辛苦了，我最可靠的主人。', '呵呵，下次也一起努力吧。姊姊一直都在。'],
      tickleLow: ['等、等一下……主人！呵、呵呵……', '這種事……不、不行……哈哈！'],
      tickleHigh: ['哈哈……主人真是的，姊姊要反擊了喔？', '呵、呵呵……好啦好啦，姊姊投降。'],
      handLow: ['呵呵，要姊姊牽著你走嗎？', '……主人的手，比想像中還大呢。'],
      hand: ['慢慢走就好，姊姊不會走丟的。', '呵呵，這樣好像在約會呢。'],
      handHigh: ['……被主人牽著走，姊姊也會心跳加速的。', '就這樣，走到哪裡都好。'],
      photo: ['呵呵，要拍得漂亮一點喔？', '姊姊上相嗎？……說實話喔。'],
      photoHigh: ['這張照片，要好好珍惜喔。', '呵呵……下次，一起入鏡吧。'],
      hug: ['呵呵，來，姊姊抱抱。……今天也辛苦了。', '……被抱住的是姊姊呢。……真狡猾。', '就這樣待一會兒吧，不用急。'],
      whisperIn: '主人，姊姊有件事只想跟你說……（小聲）',
      whisper: ['……其實，姊姊也想被寵一下。', '每天等主人回來，是姊姊最喜歡的時間。', '……以後不用叫姊姊了。叫「雪乃」就好。'],
      locked: '呵呵，那個嘛……等我們更親近一點再說吧。',
      greetHigh: ['主人，歡迎回來。姊姊好想你。', '呵呵，終於來了。今天要讓姊姊好好寵你喔。'],
      seek: ['主人，要不要休息一下？姊姊陪你。', '呵呵……偶爾，也想被主人摸摸頭呢。'],
      seekPat: '……呵呵，謝謝主人。',
      // her questions: you pick an answer, she answers back (1 = it pleases her)
      ask: [
        { q: '主人，累的時候都怎麼放鬆呢？', a: [['跟你聊天', '……呵呵，這麼說的話，姊姊可要天天陪你了。', 1], ['睡覺', '那姊姊幫你把枕頭拍得軟軟的吧。', 1]] },
        { q: '主人喜歡什麼樣的故事呢？', a: [['冒險故事', '呵呵，很像主人呢。下次姊姊念給你聽。', 1], ['戀愛故事', '……呵呵，主人也會在意這種事呀？', 1]] },
        { q: '如果姊姊累了，主人會怎麼做呢？', a: [['換我照顧你', '……呵呵，真可靠。那就麻煩你囉。', 1], ['給你冰淇淋', '呵呵，被看穿了呢。姊姊最喜歡了。', 1]] },
      ],
      talk: [
        ['主人的書桌，姊姊幫你整理好了。', '眼鏡嗎？只是看書用的，度數其實很淺。', '有什麼煩惱，都可以跟姊姊說喔。', '有什麼不懂的，都可以問姊姊喔。'],
        ['主人，今天有好好吃飯嗎？', '呵呵，看著主人努力的樣子，姊姊很開心。', '要不要靠著休息一下？肩膀借你。', '呵呵，主人今天也很努力呢。姊姊都看在眼裡。'],
        ['主人偶爾也可以任性一點喔。', '這種粗活，讓姊姊來就好。', '……被主人依賴的感覺，其實不壞呢。', '主人的笑容，是姊姊最好的獎勵。'],
        ['主人，今天也讓姊姊多疼你一點吧？', '……真是的，明明是主人，卻讓人想寵著。', '……主人，姊姊偶爾也想撒嬌一下，可以嗎？'],
        ['主人的第一名，姊姊可不會讓給別人喔。', '……呵呵，姊姊也是會吃醋的。', '以後的每一天，都想和主人一起度過。'],
      ],
      talkMany: '今天聊得很開心呢。剩下的留到明天吧。',
      giftLike: '冰淇淋……！呵呵，主人真懂姊姊。',
      giftNormal: '謝謝主人。姊姊會好好收下的。',
      giftMany: '呵呵，今天已經收很多了。留一些到明天吧。',
      giftFond: '呵呵，{gift}呀。主人的品味不錯呢。',
      giftMeh: '呵呵……姊姊不需要這麼有活力喔。不過，謝謝你。',
      giftUse: { stamina: '精神好多了。主人也別太勉強自己喔。', mood: '呵呵，今天會是很好的一天呢。', study: '原來如此，又學到一課了。', charm: '下次委託，姊姊會帶著它。……也帶著主人的心意。' },
      tea: '紅茶泡好了。來，小心燙。',
      tired: '……抱歉，姊姊也有點累了呢。',
      train: '好，開始吧。姊姊會看著你的。',
      trainDone: '呵呵，表現得很好喔。',
      jobGo: '那麼，姊姊出門囉。',
      jobBack: '我回來了。有沒有乖乖等姊姊呀？',
      jobFail: '……抱歉，姊姊失手了。下次會補回來的。',
      sleep: '晚安，主人。做個好夢喔。',
      levelUp: '呵呵……主人越來越離不開姊姊了呢。',
      piano: '這首曲子，是姊姊以前最常彈的。',
      hello: {
        morning: '主人，早安。有睡飽嗎？',
        noon: '午安，主人。午餐吃了嗎？',
        evening: '傍晚了呢。今天辛苦了，來，坐下休息。',
        night: '這麼晚還不睡？……真拿你沒辦法。',
      },
      week: {
        weekday: '平日也要好好照顧自己喔，主人。',
        weekend: '今天是假日呢。要不要讓姊姊陪你放鬆一下？',
      },
      sky: {
        sun: '天氣真好。要不要一起去曬棉被？',
        cloud: '有點陰呢。出門記得帶件外套。',
        rain: '下雨了。……主人，有沒有淋濕？',
        snow: '下雪了呢。手伸過來，姊姊幫你暖暖。',
        petal: '櫻花開了呢。等等去走走好嗎？',
        storm: '打雷了。……怕的話，可以靠過來喔。',
      },
    },
  };

  G.SAVE_DEFAULT = {
    v: 1, coins: 0, maid: null, hired: {}, cleared: {}, upgrades: { bombs: 0, fire: 0, speed: 0, hearts: 0 },
    buffs: {}, tastes: {}, cards: {}, deck: [], sound: true, music: true, plays: 0, ending: false,
    day: 1, bond: {}, room: null, rooms: null, gifts: {}, guide: 0, intro: false, lastJob: null, lang: 'ja', first: null, outfits: {}, closet: { maid: true }, titleCast: [],
    seen: 0,
  };

  // ------------------------------------------------------------------ how each maid behaves in the room
  // Berry runs on pure engine, Honey is a sweet scatterbrain, Yukino is the big sister who spoils you, Yoru says little
  // and enjoys the reaction she gets. Touches pick a face, a bubble and how high she jumps; idle picks one of her own
  // little moves: punch (shadow-boxing), trip, dream, tidy, read, stare, blade, clean (sweeping, everyone does it).
  G.TRAITS = {
    berry: {
      pat: { face: 'happy', emote: 'heart', hop: 6 }, poke: { face: 'surprise', emote: 'exclaim' },
      tickle: { face: 'happy', emote: 'note' }, five: { face: 'happy', emote: 'exclaim', hop: 9 },
      cross: { face: 'angry', emote: 'anger' }, idle: ['punch', 'punch', 'clean'], idleMore: ['rope'], mood: 'note',
      // she runs everywhere and kicks up dust; talks fast; sparks and flames
      walk: { speed: 1.4, dust: true }, talk: 1.1, voice: ['blipHi', 3], aura: 'flame', hover: { emote: 'exclaim', hop: 3 }, shy: { face: 'surprise', emote: 'exclaim' },
      bubble: { bg: '#fff4ee', edge: '#e2402a', ink: '#5a1a14' },
      // at the furniture: she throws herself at it, the room shakes, and she cannot sit still afterwards
      furn: { face: 'happy', feel: 'excited', emote: 'exclaim', hop: 6, aura: 5, pianoStep: 12, flair: 'burst',
        pose: { sofa: 'punch', music: 'rope', rug: 'punch', plant: 'punch', plush: 'rope', dresser: 'punch', sandbag: 'punch' } },
      taste: { daifuku: 'love', drink: 'like', charm: 'like', honeycake: 'like', bouquet: 'like', ribbon: 'like', novel: 'meh' },
    },
    honey: {
      pat: { face: 'blush', emote: 'note', hop: 4 }, poke: { face: 'surprise', emote: 'question' },
      tickle: { face: 'surprise', emote: 'sweat' }, five: { face: 'happy', emote: 'note', hop: 5 },
      cross: { face: 'tired', emote: 'sweat' }, idle: ['trip', 'dream', 'clean'], idleMore: ['hum'], mood: 'heart',
      // she wanders, sometimes stops mid-way to wonder where she was going; talks slowly; bubbles and blossoms
      walk: { speed: 0.85, wobble: true }, talk: 0.5, voice: ['blipSoft', 5], aura: 'bubble', hover: { emote: 'question', hop: 1 }, shy: { face: 'surprise', emote: 'question' },
      bubble: { bg: '#fffbe4', edge: '#e0a010', ink: '#5a3c08' },
      // she drifts in humming, takes a moment, and only then notices what she was doing
      furn: { face: 'happy', feel: 'happy', emote: 'note', hop: 3, aura: 4, pianoStep: 22, flair: 'late',
        pose: { sofa: 'dream', music: 'hum', rug: 'dream', plush: 'dream', fish: 'trip', dresser: 'trip', toybox: 'dream' } },
      taste: { honeycake: 'love', icecream: 'like', daifuku: 'like', bouquet: 'like', ribbon: 'like', matcha: 'meh' },
    },
    yukino: {
      pat: { face: 'blush', emote: 'heart', hop: 2 }, poke: { face: 'blush', emote: 'dots' },
      tickle: { face: 'happy', emote: 'sweat' }, five: { face: 'happy', emote: 'heart', hop: 3 },
      cross: { face: 'angry', emote: 'dots' }, idle: ['tidy', 'read', 'clean'], idleMore: ['tea'], mood: 'heart',
      // she glides, unhurried, a glint trailing now and then; talks evenly; snowflakes and glints
      walk: { speed: 0.8, glide: true }, talk: 0.65, voice: ['blip', 4], aura: 'snow', hover: { emote: 'heart', hop: 0 }, shy: { face: 'normal', emote: 'dots' },
      bubble: { bg: '#f0f7ff', edge: '#3d86f0', ink: '#16305c' },
      // she tidies as she goes, finishes with a glint, and settles in with a cup
      furn: { face: 'happy', feel: 'calm', emote: 'heart', hop: 1, aura: 4, pianoStep: 20, flair: 'glint',
        pose: { sofa: 'tea', rug: 'tidy', plant: 'tidy', dresser: 'tidy', music: 'tidy', fish: 'read', vase: 'tidy' } },
      taste: { icecream: 'love', novel: 'like', matcha: 'like', bouquet: 'like', ribbon: 'like', drink: 'meh' },
    },
    yoru: {
      pat: { face: 'blush', emote: 'dots', hop: 1 }, poke: { face: 'angry', emote: 'dots' },
      tickle: { face: 'surprise', emote: 'anger' }, five: { face: 'normal', emote: 'dots', hop: 2 },
      cross: { face: 'angry', emote: 'anger' }, idle: ['stare', 'blade', 'clean'], idleMore: ['nap'], mood: 'dots',
      // she moves without a sound and takes her time; her words come out slowly, with long silences; dark petals
      walk: { speed: 0.7 }, talk: 0.38, voice: ['blipLo', 6], aura: 'night', hover: { emote: 'dots', hop: 0 }, shy: { face: 'angry', emote: 'anger' },
      bubble: { bg: '#262033', edge: '#8a6ac0', ink: '#f4ecff' },
      // she waits, looks, says little — and claims the seat
      furn: { face: 'normal', feel: 'calm', emote: 'dots', hop: 0, aura: 3, pianoStep: 30, flair: 'pause',
        pose: { sofa: 'nap', lamp: 'stare', music: 'nap', rug: 'stare', plush: 'nap', fish: 'stare', screen: 'stare' } },
      taste: { matcha: 'love', novel: 'like', charm: 'like', bouquet: 'like', ribbon: 'secret', honeycake: 'meh' },
    },
  };
  G.traitOf = (k) => G.TRAITS[k] || G.TRAITS.berry;

  // ------------------------------------------------------------------ the real world: clock, weather, resting
  // The room follows the device clock: the window and the lighting change with the hour, the maids greet by the time of
  // day and know a weekday from a weekend. The weather is made up from the date instead of fetched, so it needs no network
  // and no location: every player sees the same sky on the same day, and it follows the season.
  const PHASE_NAMES = { morning: '早上', noon: '白天', evening: '傍晚', night: '晚上' };
  const WEEK_NAMES = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
  G.WEATHER_NAMES = { sun: '晴天', cloud: '陰天', rain: '雨天', snow: '下雪', petal: '櫻花紛飛', storm: '雷雨' };
  // seasonal odds, in order; the last one takes the rest
  const SKY_ODDS = {
    spring: [['sun', 0.42], ['cloud', 0.24], ['rain', 0.2], ['petal', 0.14]],
    summer: [['sun', 0.48], ['cloud', 0.2], ['rain', 0.2], ['storm', 0.12]],
    autumn: [['sun', 0.44], ['cloud', 0.3], ['rain', 0.26]],
    winter: [['sun', 0.3], ['cloud', 0.32], ['snow', 0.38]],
  };
  const noise = (n) => {
    let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  };
  G.seasonOf = (month) => (month <= 2 || month === 12 ? 'winter' : month <= 5 ? 'spring' : month <= 8 ? 'summer' : 'autumn');
  // the clock and the calendar the game plays by (the device's own)
  G.clock = function (when) {
    const d = when || new Date();
    const h = d.getHours(), min = d.getMinutes();
    const dow = d.getDay();
    const month = d.getMonth() + 1;
    return {
      date: d, h, min, dow, month,
      hhmm: String(h).padStart(2, '0') + ':' + String(min).padStart(2, '0'),
      phase: h < 5 ? 'night' : h < 10 ? 'morning' : h < 16 ? 'noon' : h < 19 ? 'evening' : 'night',
      phaseName: PHASE_NAMES[h < 5 ? 'night' : h < 10 ? 'morning' : h < 16 ? 'noon' : h < 19 ? 'evening' : 'night'],
      weekName: WEEK_NAMES[dow],
      weekend: dow === 0 || dow === 6,
      season: G.seasonOf(month),
    };
  };
  // one sky per six-hour block, drawn from the season's odds
  G.weatherAt = function (when) {
    const c = when && when.date ? when : G.clock(when);
    const d = c.date;
    const block = Math.floor(c.h / 6);
    const r = noise(d.getFullYear() * 100000 + (d.getMonth() + 1) * 2000 + d.getDate() * 31 + block * 7919);
    let acc = 0;
    const odds = SKY_ODDS[c.season];
    for (const [id, p] of odds) { acc += p; if (r < acc) return id; }
    return odds[odds.length - 1][0];
  };
  // everything a scene needs about the moment: { h, min, hhmm, phase, weekName, weekend, season, weather }
  G.world = function (when) {
    const c = G.clock(when);
    c.weather = G.weatherAt(c);
    c.weatherName = G.WEATHER_NAMES[c.weather];
    return c;
  };

  // what a maid has to say about this moment: the time of day, whether it is a workday, and the sky
  G.contextLines = function (maid, when) {
    const L = G.LINES[maid] || {};
    const w = when && when.weather ? when : G.world(when);
    const sky = { sun: 'sun', petal: 'sun', cloud: 'cloud', rain: 'rain', storm: 'rain', snow: 'snow' }[w.weather] || 'sun';
    return {
      time: L.hello && L.hello[w.phase],
      week: L.week && L.week[w.weekend ? 'weekend' : 'weekday'],
      sky: L.sky && L.sky[sky],
    };
  };

  // the maids rest while the game is closed: stamina comes back with the real clock (SAVE.seen is the last time we looked)
  G.REST_PER_HOUR = 20;
  G.restTick = function () {
    const S = G.getSave && G.getSave();
    if (!S) return 0;
    const now = Date.now();
    if (!S.seen || now < S.seen) { S.seen = now; return 0; }
    const hours = (now - S.seen) / 3600000;
    if (hours * 60 < 1) return 0;
    let best = 0;
    for (const k of Object.keys(S.bond || {})) {
      const b = S.bond[k];
      if (!b || typeof b.stamina !== 'number' || b.stamina >= 100) continue;
      const before = b.stamina;
      b.stamina = Math.min(100, b.stamina + hours * G.REST_PER_HOUR);
      best = Math.max(best, b.stamina - before);
    }
    S.seen = now;
    return best;
  };

  // ------------------------------------------------------------------ music
  function seq(str) {
    return str.replace(/\|/g, ' ').trim().split(/\s+/);
  }
  G.MUSIC = {
    title: {
      bpm: 128, len: 128,
      ch: [
        {
          type: 'square', v: 0.075, notes: seq(`
            E5 . G5 . C6 - - . B5 . A5 . G5 - - . | A5 . G5 . E5 - - . F5 . E5 . D5 - - .
            E5 . G5 . C6 - - . D6 . C6 . B5 - A5 . | G5 - - - E5 - - . G5 - - - . . . .
            F5 . A5 . C6 - - . A5 . G5 . F5 - - . | E5 . G5 . C6 - - . G5 . F5 . E5 - - .
            D5 . F5 . A5 - - . G5 . F5 . D5 - E5 . | C5 - - - . . G4 . C5 - - - . . . .`),
        },
        {
          type: 'triangle', v: 0.2, notes: seq(`
            C3 . C4 . C3 . C4 . C3 . C4 . C3 . C4 . | F3 . F4 . F3 . F4 . G3 . G4 . G3 . G4 .
            C3 . C4 . C3 . C4 . A2 . A3 . A2 . A3 . | G2 . G3 . G2 . G3 . G2 . G3 . B2 . B3 .
            F3 . F4 . F3 . F4 . F3 . F4 . F3 . F4 . | C3 . C4 . C3 . C4 . E3 . E4 . E3 . E4 .
            D3 . D4 . D3 . D4 . G2 . G3 . G2 . G3 . | C3 . C4 . G2 . G3 . C3 . . . C3 . . .`),
        },
        { drum: true, v: 0.16, notes: seq('k . h . s . h . k . h . s . h h') },
      ],
    },
    stage: {
      bpm: 150, len: 128,
      ch: [
        {
          type: 'square', v: 0.07, notes: seq(`
            A4 . C5 . E5 . A5 - G5 . E5 . C5 . D5 . | E5 - - . D5 . C5 . D5 - - . . . . .
            A4 . C5 . E5 . A5 - B5 . A5 . G5 . E5 . | G5 - - . E5 - - . . . . . . . . .
            F5 . E5 . D5 . C5 - D5 . E5 . F5 . G5 . | E5 - - . C5 - - . A4 - - . . . . .
            F5 . E5 . D5 . C5 . B4 . C5 . D5 . G4 . | A4 - - - . . E5 . A5 - - - . . . .`),
        },
        {
          type: 'triangle', v: 0.2, notes: seq(`
            A2 . A3 . A2 . A3 . A2 . A3 . A2 . A3 . | F2 . F3 . F2 . F3 . G2 . G3 . G2 . G3 .
            A2 . A3 . A2 . A3 . A2 . A3 . A2 . A3 . | E2 . E3 . E2 . E3 . E2 . E3 . E2 . E3 .
            D3 . D4 . D3 . D4 . C3 . C4 . C3 . C4 . | A2 . A3 . A2 . A3 . F2 . F3 . F2 . F3 .
            D3 . D4 . D3 . D4 . G2 . G3 . G2 . G3 . | A2 . A3 . E2 . E3 . A2 . . . A2 . . .`),
        },
        {
          type: 'square', v: 0.028, notes: seq(`
            . . E4 . . . E4 . . . E4 . . . E4 . | . . C4 . . . C4 . . . D4 . . . D4 .
            . . E4 . . . E4 . . . E4 . . . E4 . | . . B3 . . . B3 . . . B3 . . . G#3 .
            . . F4 . . . F4 . . . E4 . . . E4 . | . . E4 . . . E4 . . . C4 . . . C4 .
            . . F4 . . . F4 . . . D4 . . . D4 . | . . C4 . . . B3 . . . C4 . . . . .`),
        },
        { drum: true, v: 0.15, notes: seq('k . h . s . h k . k h . s . h .') },
      ],
    },
    boss: {
      bpm: 168, len: 64,
      ch: [
        {
          type: 'square', v: 0.07, notes: seq(`
            E5 . E5 . G5 . E5 . A5 . G5 . F#5 . D5 . | E5 - - - . . B4 . E5 - - - . . . .
            E5 . E5 . G5 . E5 . B5 . A5 . G5 . F#5 . | G5 - - - F#5 - - - D5 - - - B4 - - -`),
        },
        {
          type: 'sawtooth', v: 0.07, notes: seq(`
            E2 . E3 E2 . E2 E3 . E2 . E3 E2 . E2 E3 . | C3 . C4 C3 . C3 C4 . D3 . D4 D3 . D3 D4 .
            E2 . E3 E2 . E2 E3 . E2 . E3 E2 . E2 E3 . | C3 . C4 C3 . C3 C4 . B2 . B3 B2 . B2 B3 .`),
        },
        { drum: true, v: 0.16, notes: seq('k h s h k k s h k h s h k k s s') },
      ],
    },
    cafe: {
      bpm: 100, len: 64,
      ch: [
        {
          type: 'triangle', v: 0.16, notes: seq(`
            A5 - - . G5 . F5 - - . C5 - - - . . | D5 - - . E5 . F5 - - . G5 - - - . .
            A5 - - . C6 . Bb5 - - . A5 - G5 - . . | F5 - - - - - . . . . . . . . . .`),
        },
        {
          type: 'triangle', v: 0.16, notes: seq(`
            F2 . . . C3 . . . F2 . . . C3 . . . | Bb2 . . . F3 . . . C3 . . . G3 . . .
            F2 . . . C3 . . . D3 . . . A2 . . . | G2 . . . C3 . . . F2 . . . C3 . . .`),
        },
        {
          type: 'square', v: 0.03, notes: seq(`
            . . A4 . . . C5 . . . A4 . . . C5 . | . . Bb4 . . . D5 . . . C5 . . . E5 .
            . . A4 . . . C5 . . . F4 . . . A4 . | . . Bb4 . . . E5 . . . A4 . . . . .`),
        },
        { drum: true, v: 0.1, notes: seq('h . . h . . h . h . . h . . h .') },
      ],
    },
    room: {
      bpm: 92, len: 64,
      ch: [
        {
          type: 'triangle', v: 0.15, notes: seq(`
            E5 - G5 - C6 - B5 - A5 - - - G5 - - - | F5 - A5 - G5 - E5 - D5 - - - - - - -
            E5 - G5 - C6 - D6 - E6 - D6 - C6 - B5 - | A5 - B5 - G5 - - - C6 - - - - - - -`),
        },
        {
          type: 'triangle', v: 0.13, notes: seq(`
            C3 . . . G3 . . . A2 . . . E3 . . . | F2 . . . C3 . . . G2 . . . D3 . . .
            C3 . . . G3 . . . A2 . . . E3 . . . | F2 . . . G2 . . . C3 . . . G2 . . .`),
        },
        {
          type: 'square', v: 0.022, notes: seq(`
            . C5 E5 G5 . C5 E5 G5 . A4 C5 E5 . A4 C5 E5 | . A4 C5 F5 . A4 C5 F5 . B4 D5 G5 . B4 D5 G5
            . C5 E5 G5 . C5 E5 G5 . A4 C5 E5 . A4 C5 E5 | . A4 C5 F5 . B4 D5 G5 . C5 E5 G5 . . . .`),
        },
      ],
    },
    lullaby: {
      bpm: 70, len: 32, loop: false,
      ch: [
        { type: 'triangle', v: 0.14, notes: seq('G5 - E5 - C5 - - - D5 - E5 - C5 - - - | G4 - A4 - B4 - C5 - - - - - - - - -') },
        { type: 'triangle', v: 0.1, notes: seq('C3 - - - - - - - G2 - - - - - - - | F2 - - - G2 - - - C3 - - - - - - -') },
      ],
    },
    clear: {
      bpm: 170, len: 32, loop: false,
      ch: [
        { type: 'square', v: 0.09, notes: seq('C5 . E5 . G5 . C6 - - . G5 . C6 - - - - - - - . . . . . . . . . . . .') },
        { type: 'triangle', v: 0.2, notes: seq('C3 . C3 . E3 . G3 - - . E3 . C4 - - - - - - - . . . . . . . . . . . .') },
      ],
    },
    fail: {
      bpm: 96, len: 24, loop: false,
      ch: [
        { type: 'square', v: 0.08, notes: seq('G4 - . F#4 - . F4 - . E4 - - - - - . . . . . . . . .') },
        { type: 'triangle', v: 0.18, notes: seq('C3 - . B2 - . Bb2 - . A2 - - - - - . . . . . . . . .') },
      ],
    },
  };
})(window);
