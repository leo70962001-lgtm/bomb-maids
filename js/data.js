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
    shieldRechargeBattle: 60 * 60, shieldStartBattle: false, magicShieldBattle: false, // battle rounds are one heart each, so the shield is slower there
    charmRadius: 4, charmFrames: 270, bossCharm: 180, // Honey's magic on monsters
    stunRadius: 2.5, stunFrames: 25, // and on rival maids
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
      id: '1-1', theme: 'classroom', title: '教室大掃除', client: '櫻丘學園 校長', reward: 150, time: 150, layout: 'desks',
      brief: ['放學後的教室被塵塵貓佔領了。', '請把牠們通通清掉！'],
      enemies: { dustcat: 4 }, items: { bomb: 2, fire: 2, tea: 1 }, soft: 0.85, dust: 3,
    },
    {
      id: '1-2', theme: 'classroom', title: '福利社的貪吃鬼', client: '學生會長', reward: 220, time: 160, layout: 'store',
      brief: ['福利社的麵包被吃光了！', '犯人好像是粉紅色的……'],
      enemies: { dustcat: 3, piggy: 3 }, items: { bomb: 2, fire: 2, speed: 1, heart: 1 }, soft: 0.62, dust: 4,
    },
    {
      id: '2-1', theme: 'garden', title: '玫瑰花園除蟲', client: '花園伯爵夫人', reward: 300, time: 170, layout: 'plaza', decor: 'treehouse',
      brief: ['暴走熊在玫瑰園裡橫衝直撞。', '別讓牠們弄壞樹屋！'],
      enemies: { piggy: 2, teddy: 3 }, items: { bomb: 2, fire: 2, clock: 1, heart: 1 }, soft: 0.55, dust: 4,
    },
    {
      id: '2-2', theme: 'garden', title: '果凍迷宮', client: '園丁老爺爺', reward: 360, time: 180, layout: 'hedgemaze',
      brief: ['果凍怪會穿過花叢！', '聽說牠們最怕長長的火力。'],
      enemies: { teddy: 3, jelly: 3 }, items: { bomb: 2, fire: 3, speed: 1, star: 1 }, soft: 0.62, dust: 5,
    },
    {
      id: 'BOSS1', theme: 'classroom', title: '鑽頭機器人', client: '理科社社長', reward: 450, time: 180, layout: 'boss', boss: 'drill',
      brief: ['理科社的掃除機器人失控了！', '牠撞到硬牆會暈一下，趁機炸牠！'],
      enemies: {}, items: { bomb: 2, fire: 2, heart: 1 }, soft: 0.3, dust: 3,
    },
    {
      id: '3-1', theme: 'snow', title: '雪原的企鵝管家', client: '冰雪山莊', reward: 420, time: 180, layout: 'snowfield',
      brief: ['企鵝紳士跑得飛快。', '在牠的路上等著放炸彈吧。'],
      enemies: { penguin: 4, snowkid: 2 }, items: { bomb: 2, fire: 2, speed: 1, heart: 1, clock: 1 }, soft: 0.55, dust: 5,
    },
    {
      id: '3-2', theme: 'snow', title: '聰明的雪寶寶', client: '冰雪山莊', reward: 480, time: 190, layout: 'lanes',
      brief: ['雪寶寶會躲炸彈。', '用連環爆炸把牠逼進死角！'],
      enemies: { snowkid: 4, jelly: 2, penguin: 1 }, items: { bomb: 3, fire: 2, star: 1, heart: 1 }, soft: 0.6, dust: 5,
    },
    {
      id: '4-1', theme: 'candy', title: '糖果城堡的午茶', client: '甜點女王', reward: 560, time: 200, layout: 'candyCastle',
      brief: ['杯子蛋糕怪的奶油很厚，', '要炸兩次才會投降。'],
      enemies: { cupcake: 4, dragon: 2 }, items: { bomb: 2, fire: 2, speed: 1, heart: 1, tea: 1 }, soft: 0.58, dust: 6,
    },
    {
      id: '4-2', theme: 'candy', title: '甜點大暴走', client: '甜點女王', reward: 650, time: 210, layout: 'lanes',
      brief: ['糖果龍帶著大軍來了！', '這是最後的甜點防衛戰。'],
      enemies: { dragon: 4, cupcake: 2, teddy: 2 }, items: { bomb: 3, fire: 3, star: 1, heart: 2, clock: 1 }, soft: 0.6, dust: 6,
    },
    {
      id: 'BOSS2', theme: 'candy', title: '火焰蜘蛛', client: '甜點女王', reward: 800, time: 200, layout: 'boss', boss: 'spider',
      brief: ['城堡地下出現了噴火的機械蜘蛛！', '火焰沿著直線噴出，別跟牠站同一排！'],
      enemies: {}, items: { bomb: 2, fire: 3, speed: 1, heart: 1 }, soft: 0.28, dust: 4,
    },
    {
      id: '5-1', theme: 'toy', title: '玩具箱演唱會', client: '玩具店老闆', reward: 700, time: 210, layout: 'toyStage',
      brief: ['玩具們在舞台上開起了演唱會！', '鼓鼓兔會追著人跑，小心被包圍。'],
      enemies: { drumbun: 3, piggy: 2, teddy: 2 }, items: { bomb: 2, fire: 2, speed: 1, heart: 1, tea: 1 }, soft: 0.6, dust: 6,
    },
    {
      id: '5-2', theme: 'toy', title: '積木迷宮', client: '玩具店老闆', reward: 760, time: 220, layout: 'blocks',
      brief: ['積木塔堆成了迷宮。', '用炸彈打通一條路吧！'],
      enemies: { drumbun: 4, jelly: 2, snowkid: 1 }, items: { bomb: 3, fire: 2, star: 1, heart: 1, clock: 1 }, soft: 0.62, dust: 6,
    },
    {
      id: '6-1', theme: 'jewel', title: '寶石宮殿', client: '寶石公主', reward: 850, time: 220, layout: 'jewelEgg',
      brief: ['宮殿中央的巨大寶石蛋被盯上了！', '寶石騎士很硬，要炸兩次。'],
      enemies: { gemknight: 3, dragon: 2, cupcake: 1 }, items: { bomb: 2, fire: 3, speed: 1, heart: 1, tea: 1 }, soft: 0.58, dust: 6,
    },
    {
      id: '6-2', theme: 'jewel', title: '閃耀迴廊', client: '寶石公主', reward: 950, time: 230, layout: 'jewelRing',
      brief: ['水晶柱排成菱形的迴廊。', '從四個缺口鑽進中央吧！'],
      enemies: { gemknight: 4, dragon: 2, penguin: 2 }, items: { bomb: 3, fire: 3, star: 1, heart: 2, clock: 1 }, soft: 0.6, dust: 7,
    },
    {
      id: 'BOSS3', theme: 'lab', title: '金熊機甲', client: '？？？', reward: 1500, time: 240, layout: 'boss', boss: 'bear', final: true,
      brief: ['所有灰塵的源頭——', '神秘研究所的巨大機甲！'],
      enemies: {}, items: { bomb: 3, fire: 3, heart: 2 }, soft: 0.25, dust: 4,
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
  G.CARDS = [
    { id: 'm_dustcat', kind: 'monster', ref: 'dustcat', rare: 1 },
    { id: 'm_piggy', kind: 'monster', ref: 'piggy', rare: 1 },
    { id: 'm_teddy', kind: 'monster', ref: 'teddy', rare: 1 },
    { id: 'm_jelly', kind: 'monster', ref: 'jelly', rare: 1 },
    { id: 'm_penguin', kind: 'monster', ref: 'penguin', rare: 1 },
    { id: 'm_snowkid', kind: 'monster', ref: 'snowkid', rare: 1 },
    { id: 'm_cupcake', kind: 'monster', ref: 'cupcake', rare: 1 },
    { id: 'm_dragon', kind: 'monster', ref: 'dragon', rare: 1 },
    { id: 'm_drumbun', kind: 'monster', ref: 'drumbun', rare: 1 },
    { id: 'm_gemknight', kind: 'monster', ref: 'gemknight', rare: 1 },
    { id: 'c_berry', kind: 'maid', ref: 'berry', rare: 2 },
    { id: 'c_yoru', kind: 'maid', ref: 'yoru', rare: 2 },
    { id: 'c_honey', kind: 'maid', ref: 'honey', rare: 2 },
    { id: 'c_yukino', kind: 'maid', ref: 'yukino', rare: 2 },
    { id: 's_drill', kind: 'boss', ref: 'drill', rare: 3, name: '鑽頭機器人', desc: '理科社做的掃除機器人。' },
    { id: 's_spider', kind: 'boss', ref: 'spider', rare: 3, name: '火焰蜘蛛', desc: '頭上燒著火焰的機械蜘蛛。' },
    { id: 's_boss', kind: 'boss', ref: 'bear', rare: 3, name: '金熊機甲', desc: '研究所的最終兵器。' },
    { id: 's_bomb', kind: 'bomb', ref: 'bomb', rare: 3, name: '女僕炸彈', desc: '戴著蕾絲髮箍的炸彈。' },
  ];
  G.RARE_NAME = { 1: 'N', 2: 'R', 3: 'SR' };

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
  ];
  G.FLOORS = [
    { id: 'wood', name: '木地板', price: 0 },
    { id: 'carpet', name: '粉紅地毯', price: 150 },
    { id: 'checker', name: '格子磁磚', price: 200 },
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
  };
  // cheapest first, so the shop reads as a wish list you work up
  G.FURNITURE_SHOP = ['plant', 'lamp', 'rug', 'plush', 'fishbowl', 'teatable', 'dresser', 'bookshelf', 'sofa', 'gramophone', 'piano', 'princess'];
  G.ROOM_DEFAULT = {
    size: 0, wall: 'bunny', floor: 'wood',
    owned: { bed: 1, desk: 1, wardrobe: 1 },
    placed: [{ id: 'bed', c: 0, r: 0 }, { id: 'desk', c: 4, r: 0 }, { id: 'wardrobe', c: 5, r: 0 }],
    walls: { bunny: true }, floors: { wood: true },
  };

  G.GIFTS = [
    { id: 'daifuku', name: '草莓大福', price: 60, fav: 'berry', aff: 8 },
    { id: 'matcha', name: '抹茶羊羹', price: 60, fav: 'yoru', aff: 8 },
    { id: 'honeycake', name: '蜂蜜蛋糕', price: 60, fav: 'honey', aff: 8 },
    { id: 'icecream', name: '香草冰淇淋', price: 60, fav: 'yukino', aff: 8 },
    { id: 'bouquet', name: '玫瑰花束', price: 150, fav: 'all', aff: 15 },
    { id: 'ribbon', name: '蕾絲髮帶', price: 320, fav: 'all', aff: 32 },
  ];

  // affection: points needed for Lv1..Lv5 and what each level unlocks
  G.AFF_LEVELS = [
    { at: 0, name: '陌生', perk: '—' },
    { at: 30, name: '熟悉', perk: '委託開始時 SP +20' },
    { at: 90, name: '信賴', perk: '委託中愛心 +1' },
    { at: 180, name: '親密', perk: '委託報酬 +20%' },
    { at: 300, name: '最愛', perk: '愛的守護：每次委託抵擋一次致命傷' },
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
      greet: ['主人早安！今天也要元氣滿滿喔！', '主人！我已經熱身完畢了！', '嘿嘿，主人來啦～今天要做什麼？'],
      pat: ['欸嘿嘿……被摸頭了～', '唔、主人的手好溫暖……', '再、再摸一下也可以喔！'],
      patMany: ['主人，頭髮要被摸亂啦！', '好、好了啦！夠了夠了！'],
      poke: ['呀！主人，偷襲犯規啦！', '嘿嘿，戳臉頰好癢喔～'],
      pokeMany: '再戳下去，莓果要反擊囉！',
      highFive: ['耶——！擊掌！我們是最強搭檔！', '好痛快！再來一次！'],
      tickle: ['哈哈哈！住手、住手啦主人！', '呀哈哈！我、我最怕癢了！'],
      tickleMany: '呼……呼……笑到肚子好痛……今天不行了！',
      talk: [
        ['我小時候在道場練了十年空手道！', '打掃跟練拳一樣，靠的是氣勢！', '主人的房間有點亂耶，我來整理！'],
        ['主人喜歡草莓嗎？我超喜歡的！', '上次委託，我踢飛了好多炸彈喔！', '跟主人說話，心情就會變好呢！'],
        ['就算怪物再多，我也會保護主人！', '主人，我們是最棒的搭檔對吧？', '偷偷告訴你，我其實很怕打雷……'],
        ['能當主人的女僕，真的太好了。', '主人……今天也可以待在我身邊嗎？'],
        ['最喜歡主人了！……啊，說出來了！', '不管去哪裡，莓果都跟著主人喔！'],
      ],
      talkMany: '今天聊好多喔！剩下的明天再說吧♪',
      giftLike: '草莓大福！主人怎麼知道我最愛這個！',
      giftNormal: '謝謝主人！我會好好珍惜的！',
      giftMany: '今天收到好多禮物了，留到明天嘛！',
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
      },
    },
    yoru: {
      intro: '初次見面，主人。我是夜子。今後，請讓我侍奉您。',
      greet: ['主人，早安。今天的行程已經準備好了。', '……主人，您來了。', '今日天氣晴。適合斬灰塵。'],
      pat: ['……！主、主人，請不要突然這樣。', '……並不討厭。', '咳。請、請繼續……不，沒事。'],
      patMany: ['主人，請適可而止。', '……再摸下去，我要拔刀了。'],
      poke: ['……主人。這是什麼意思？', '……臉頰，不是按鈕。'],
      pokeMany: '……再戳一次，我就要反擊了。',
      highFive: ['……擊掌。嗯，配合得不錯。', '……很好，默契滿分。'],
      tickle: ['……唔、噗……！請、請不要……！', '……哈……！這、這是犯規的……！'],
      tickleMany: '……主人。今天到此為止。（臉紅）',
      talk: [
        ['我的刀名叫「月見」，是祖母傳下來的。', '保持房間整潔，就是保持心的整潔。', '請放心，我會完成每一個委託。'],
        ['抹茶配上和菓子，是最好的休息。', '主人今天看起來很有精神，太好了。', '打掃時，我喜歡聽掃把的聲音。'],
        ['主人的背後，就由我來守護。', '……我其實不太擅長和人說話。', '和主人在一起時，心情很平靜。'],
        ['主人，這是我做的護身符。請收下。', '……如果是主人的話，叫我小夜也可以。'],
        ['我的刀，還有我的心，都屬於主人。', '……主人，請一直待在我身邊。'],
      ],
      talkMany: '今天已經說了很多話……我有點不習慣。',
      giftLike: '抹茶……！主人，您真是……謝謝您。',
      giftNormal: '謝謝主人。我會好好收藏。',
      giftMany: '主人，今天的心意已經足夠了。',
      tea: '茶的溫度剛好。主人很懂呢。',
      tired: '……抱歉，主人。請讓我稍微歇息。',
      train: '修行開始。請主人在一旁看著。',
      trainDone: '……刀法又精進了一分。',
      jobGo: '夜子，出陣。',
      jobBack: '任務完成。灰塵已全數斬除。',
      jobFail: '……是我修行不足。下次一定。',
      sleep: '主人，晚安。請做個好夢。',
      levelUp: '……主人。今後也請多多指教。',
      piano: '……這首是祖母教我的曲子。',
      hello: {
        morning: '主人，早。……今天的空氣很乾淨。',
        noon: '午安。……這個時間，最適合泡茶。',
        evening: '日落了。……夜子的時間要開始了。',
        night: '夜晚安靜得剛剛好。……主人還醒著嗎？',
      },
      week: {
        weekday: '平日的街上很安靜。……我喜歡這樣。',
        weekend: '假日呢……人多了一些。主人想去哪裡？',
      },
      sky: {
        sun: '陽光有點刺眼。……不過，很溫暖。',
        cloud: '雲層很厚。……像是要下雨了。',
        rain: '雨聲……讓人靜下心來。',
        snow: '下雪了。……在雪裡，刀光會更清楚。',
      },
    },
    honey: {
      intro: '主人好～我是蜜糖！以後每天都做點心給主人吃喔♪',
      greet: ['主人早安～今天的點心是鬆餅喔♪', '哇～主人來了！蜜糖好開心♪', '主人主人～今天要一起做什麼呀？'],
      pat: ['嘿嘿～主人的手好溫柔♪', '喵～被摸得好舒服～', '再多摸摸人家嘛～♪'],
      patMany: ['唔～雙馬尾要塌掉了啦！', '主人好貪心喔～今天夠了啦♪'],
      poke: ['呀啊！主人嚇到人家了啦～', '唔～臉頰軟軟的對吧♪'],
      pokeMany: '主人好壞～人家要生氣囉！',
      highFive: ['耶～擊掌！……啊，手、手滑了！', '嘿嘿，跟主人擊掌好開心♪'],
      tickle: ['呀哈哈哈！不、不行啦～！', '好癢好癢～人家要笑壞了啦！'],
      tickleMany: '嗚～笑到沒力氣了……主人負責揹我喔。',
      talk: [
        ['蜜糖最會烤蛋糕了，下次做給主人吃！', '炸彈也可以做成甜點的形狀喔♪', '雙馬尾每天都要捲好久呢～'],
        ['主人喜歡甜的還是鹹的呀？', '蜂蜜蛋糕的秘訣是……愛心喔♪', '跟主人在一起，每天都甜甜的～'],
        ['蜜糖受傷的話，主人會心疼嗎？', '主人累了，蜜糖的魔法分你一點♪', '主人是蜜糖的專屬試吃員喔！'],
        ['主人……蜜糖可以一直待在這裡嗎？', '今天的蛋糕，只做給主人一個人♪'],
        ['最～最～最喜歡主人了♪', '蜜糖的心，已經融化成蜂蜜了啦……'],
      ],
      talkMany: '今天說了好多話，嘴巴都甜甜的了～',
      giftLike: '蜂蜜蛋糕！！主人最棒了～♪',
      giftNormal: '哇～謝謝主人！蜜糖好開心♪',
      giftMany: '今天的禮物夠多啦，明天再給蜜糖嘛♪',
      tea: '配上點心的午茶時間最幸福了～',
      tired: '嗚～蜜糖累累了……想睡午覺……',
      train: '蜜糖也會努力的！加油加油～',
      trainDone: '好累喔～但是變強了呢♪',
      jobGo: '蜜糖出發囉～主人要乖乖等我♪',
      jobBack: '我回來了～有沒有想蜜糖呀？',
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
      },
    },
    yukino: {
      intro: '我是雪乃。……既然被雇用了，我會盡到女僕的責任。',
      greet: ['早安，主人。今天的最佳行動已經算好了。', '……主人，你遲到了三分鐘。', '早。昨晚的資料我整理完了。'],
      pat: ['……這不在我的計算之內。', '我、我又不是小孩子……！', '……只准再摸一下。'],
      patMany: ['主人，摸頭次數已超過合理範圍。', '眼鏡要歪了啦……真是的。'],
      poke: ['……主人，請說明這個行為的目的。', '哎呀，是想吸引我的注意嗎？'],
      pokeMany: '……再戳一次，就把你的零食沒收。',
      highFive: ['擊掌……作戰成功的慶祝，對吧？', '呵呵，配合度很好呢。'],
      tickle: ['等、等一下……呵、呵呵……！計算外……！', '呀……！主人，這不公平……！'],
      tickleMany: '呼……今天的搔癢額度，已經用完了。',
      talk: [
        ['爆炸威力和火力等級成正比。', '我讀過三百本關於清潔的書。', '主人，請把書放回書櫃。'],
        ['冰淇淋的最佳溫度是零下十三度。', '……主人的判斷，偶爾也挺正確的。', '遙控引爆的時機，全靠計算。'],
        ['我替主人做了委託的攻略筆記。', '和主人在一起的時間……效率很高。', '……並不是特別想見你才來的。'],
        ['我們相處的天數，我都記得喔。', '算了很多次……答案都是主人。'],
        ['……喜歡。這是經過驗算的結論。', '主人，今後也請一直做我的研究對象。'],
      ],
      talkMany: '今日對話量已達上限。明天再說。',
      giftLike: '冰淇淋……！咳，我只是剛好想吃而已。',
      giftNormal: '……謝謝。我會好好保存的。',
      giftMany: '禮物太多會影響判斷。明天再給我。',
      tea: '紅茶有助於思考。主人也喝一點吧。',
      tired: '能量不足……主人，建議休息。',
      train: '特訓計畫，開始執行。',
      trainDone: '數據提升了。符合預期。',
      jobGo: '雪乃，出發。會準時回來的。',
      jobBack: '委託完成。誤差在容許範圍內。',
      jobFail: '……計算錯誤。我會修正的。',
      sleep: '晚安，主人。……明天見。',
      levelUp: '好感度參數……上升了。不是壞事。',
      piano: '這首的節拍，我練習了一百次。',
      hello: {
        morning: '早安，主人。今天的行程已經整理好了。',
        noon: '中午了。建議先補充水分。',
        evening: '傍晚了。效率會下降，請適度休息。',
        night: '已經這麼晚了。……主人，該睡了。',
      },
      week: {
        weekday: '平日行程比較緊湊，請注意體力分配。',
        weekend: '今天是假日。……偶爾放空，也是必要的。',
      },
      sky: {
        sun: '晴天。適合曬棉被和擦窗戶。',
        cloud: '陰天。紫外線較弱，適合外出。',
        rain: '降雨中。地板會濕滑，請小心。',
        snow: '積雪了。……雪的結晶，很美。',
      },
    },
  };

  G.SAVE_DEFAULT = {
    v: 1, coins: 0, maid: null, hired: {}, cleared: {}, upgrades: { bombs: 0, fire: 0, speed: 0, hearts: 0 },
    buffs: {}, cards: {}, sound: true, music: true, plays: 0, ending: false,
    day: 1, bond: {}, room: null, gifts: {}, guide: 0, intro: false, lastJob: null, lang: 'ja', first: null, outfits: {}, closet: { maid: true }, titleCast: [],
    seen: 0,
  };

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
