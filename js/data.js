(function () {
  var STORAGE_KEY = "infinity-gacha-phase6";
  var LOG_LIMIT = 30;
  var GACHA_COST = 1;
  var RECOVERY_INTERVAL_MS = 10000;
  var LONG_PRESS_INTERVAL = 300;
  var AUTO_START_IDLE_TIME = 5000;
  var AUTO_BASE_INTERVAL = 1000;
  var AUTO_MIN_INTERVAL = 100;

  var BASE_STATS = {
    hp: 10,
    attack: 1,
    defense: 1,
    speed: 1,
    luck: 1,
    accuracy: 0,
    evasion: 0,
    criticalRate: 0,
    criticalDamage: 0
  };

  var CONVEX_BONUS_BY_RANK = {
    "0": 0.01,
    N: 0.01,
    S: 0.02,
    SR: 0.05,
    SSR: 0.08,
    SSSR: 0.10,
    UR: 0.15,
    AR: 0.20,
    LR: 0.25,
    GR: 0.30,
    BR: 0.40,
    QR: 0.50,
    IR: 0.75,
    ER: 1.00,
    IF: 0
  };

  var LIMIT_BREAK_GROWTH_TIERS = [
    { start: 1, end: 9, multiplier: 1 },
    { start: 10, end: 99, multiplier: 2 },
    { start: 100, end: 199, multiplier: 5 }
  ];

  var LIMIT_BREAK_GROWTH_MODE = "linear_step";

  var STAT_DESCRIPTIONS = {
    hp: "戦闘中の体力。0になるとバグ戦で敗北する。",
    attack: "攻撃ボタンの基本威力。",
    defense: "バグから受けるダメージを軽減する。",
    speed: "速度が高いほど攻撃回数が増える。100で2回、200で3回の予定。",
    luck: "会心率に関係する。100%超過分は会心ダメージへ回る予定。",
    accuracy: "攻撃が外れにくくなる補助値。",
    evasion: "回避率。上限は65%。",
    criticalRate: "攻撃時に会心が出る確率。",
    criticalDamage: "会心時のダメージ上昇量。"
  };

  var DECOMPOSE_STONES = {
    N: 1,
    S: 5,
    SR: 25,
    SSR: 100,
    SSSR: 500,
    UR: 2500,
    AR: 10000,
    LR: 50000,
    GR: 250000,
    BR: 1000000,
    QR: 5000000,
    IR: 25000000,
    ER: 100000000,
    IF: 0
  };

  var BUG_DEFEAT_RATE_BONUS_INCREASE = {
    S: 0.01,
    SR: 0.01,
    SSR: 0.015,
    SSSR: 0.02,
    UR: 0.03,
    AR: 0.04,
    LR: 0.05,
    GR: 0.07,
    BR: 0.1,
    QR: 0.15,
    IR: 0.2,
    ER: 0.3
  };

  var BUG_DEFEAT_RATE_BONUS_CAP = {
    S: 5,
    SR: 5,
    SSR: 5,
    SSSR: 5,
    UR: 10,
    AR: 10,
    LR: 10,
    GR: 10,
    BR: 10,
    QR: 20,
    IR: 20,
    ER: 20
  };

  var BUG_RANK_RELIC_DROP_RATE = {
    S: 0.20,
    SR: 0.18,
    SSR: 0.15,
    SSSR: 0.12,
    UR: 0.10,
    AR: 0.08,
    LR: 0.06,
    GR: 0.05,
    BR: 0.04,
    QR: 0.03,
    IR: 0.02,
    ER: 0.01
  };

  var ALTAR_EVENT_CONFIG = {
    normal: { cost: 10000, durationMs: 5 * 60 * 1000, power: 1.2, label: "イベント" },
    super: { cost: 100000, durationMs: 15 * 60 * 1000, power: 2, label: "スーパーイベント" },
    hyper: { cost: 1000000, durationMs: 30 * 60 * 1000, power: 5, label: "ハイパーイベント" }
  };

  var ALTAR_EVENT_DEFINITIONS = [
    { id: "ssr_rate_up", effectType: "rank_rate_up", effectName: "SSR確率UP", targetRank: "SSR", availableTypes: ["normal", "super", "hyper"] },
    { id: "sssr_rate_up", effectType: "rank_rate_up", effectName: "SSSR確率UP", targetRank: "SSSR", availableTypes: ["normal", "super", "hyper"] },
    { id: "ur_rate_up", effectType: "rank_rate_up", effectName: "UR確率UP", targetRank: "UR", availableTypes: ["normal", "super", "hyper"] },
    { id: "gr_rate_up", effectType: "rank_rate_up", effectName: "GR確率UP", targetRank: "GR", availableTypes: ["super", "hyper"] },
    { id: "s_rate_up", effectType: "rank_rate_up", effectName: "S確率UP", targetRank: "S", availableTypes: ["hyper"] },
    { id: "sr_rate_up", effectType: "rank_rate_up", effectName: "SR確率UP", targetRank: "SR", availableTypes: ["hyper"] },
    { id: "ar_rate_up", effectType: "rank_rate_up", effectName: "AR確率UP", targetRank: "AR", availableTypes: ["hyper"] },
    { id: "lr_rate_up", effectType: "rank_rate_up", effectName: "LR確率UP", targetRank: "LR", availableTypes: ["hyper"] },
    { id: "br_rate_up", effectType: "rank_rate_up", effectName: "BR確率UP", targetRank: "BR", availableTypes: ["hyper"] },
    { id: "qr_rate_up", effectType: "rank_rate_up", effectName: "QR確率UP", targetRank: "QR", availableTypes: ["hyper"] },
    { id: "er_rate_up", effectType: "rank_rate_up", effectName: "ER確率UP", targetRank: "ER", availableTypes: ["hyper"] },
    { id: "n_to_sssr_rate_up", effectType: "group_rate_up", effectName: "N〜SSSR確率UP", targetGroup: ["N", "S", "SR", "SSR", "SSSR"], availableTypes: ["hyper"] },
    { id: "ur_to_br_rate_up", effectType: "group_rate_up", effectName: "UR〜BR確率UP", targetGroup: ["UR", "AR", "LR", "GR", "BR"], availableTypes: ["hyper"] },
    { id: "qr_to_er_rate_up", effectType: "group_rate_up", effectName: "QR〜ER確率UP", targetGroup: ["QR", "IR", "ER"], availableTypes: ["hyper"] },
    { id: "bug_spawn_up", effectType: "bug_spawn_add", effectName: "バグ出現率上昇", availableTypes: ["normal", "super", "hyper"] },
    { id: "bug_spawn_down", effectType: "bug_spawn_subtract", effectName: "バグ出現率低下", availableTypes: ["normal", "super", "hyper"] },
    { id: "bug_reward_up", effectType: "bug_reward_multiplier", effectName: "バグ報酬UP", availableTypes: ["normal", "super", "hyper"] },
    { id: "stone_gain_up", effectType: "stone_gain_multiplier", effectName: "石獲得量UP", availableTypes: ["normal", "super", "hyper"] },
    { id: "miss_stone_up", effectType: "miss_stone_multiplier", effectName: "ハズレ時石獲得量UP", availableTypes: ["normal", "super", "hyper"] },
    { id: "decompose_up", effectType: "decompose_multiplier", effectName: "分解石UP", availableTypes: ["normal", "super", "hyper"] },
    { id: "bug_rank_up", effectType: "bug_rank_up", effectName: "バグランク上昇", availableTypes: ["normal", "super", "hyper"] },
    { id: "high_rare_log_up", effectType: "high_rare_log_up", effectName: "高レアログ出現率UP", availableTypes: ["normal", "super", "hyper"] }
  ];

  var ALTAR_EVENT_POOL = {
    normal: ALTAR_EVENT_DEFINITIONS.filter(function (event) {
      return event.availableTypes.indexOf("normal") !== -1;
    }),
    super: ALTAR_EVENT_DEFINITIONS.filter(function (event) {
      return event.availableTypes.indexOf("super") !== -1;
    }),
    hyper: ALTAR_EVENT_DEFINITIONS.filter(function (event) {
      return event.availableTypes.indexOf("hyper") !== -1;
    })
  };

  var ALTAR_EVENT_INDEX = {};
  ALTAR_EVENT_DEFINITIONS.forEach(function (event) {
    ALTAR_EVENT_INDEX[event.id] = event;
  });

  var DUNGEON_TYPES = {
    normal: {
      key: "normal",
      name: "通常ダンジョン",
      cost: 10000,
      durationMs: 60 * 1000,
      isInfinite: false,
      altarLogs: ["石を10,000個捧げた。", "祭壇の下に、暗い階段が現れた。", "ダンジョンに入場しました。"],
      exitLogs: ["ダンジョンの時間が終了した。", "採掘道具が崩れた。", "ガチャ画面へ戻ります。"],
      minePrefix: "採掘した。",
      slimePrefix: "",
      slimeRewardMultiplier: 1,
      gemRewardMultiplier: 1,
      slimeSpawnRate: 10
    },
    golden: {
      key: "golden",
      name: "黄金ダンジョン",
      cost: 100000,
      durationMs: 30 * 1000,
      isInfinite: false,
      altarLogs: ["石を100,000個捧げた。", "黄金の扉が開いた。", "黄金ダンジョンに入場しました。"],
      exitLogs: ["黄金の光が消えた。", "黄金ダンジョンから帰還しました。"],
      minePrefix: "黄金の壁を採掘した。",
      slimePrefix: "黄金",
      slimeRewardMultiplier: 5,
      gemRewardMultiplier: 2,
      slimeSpawnRate: 20
    },
    dimensional: {
      key: "dimensional",
      name: "異次元ダンジョン",
      cost: 1000000,
      durationMs: null,
      isInfinite: true,
      altarLogs: ["石を1,000,000個捧げた。", "祭壇の奥に、存在しない穴が開いた。", "異次元ダンジョンに入場しました。"],
      exitLogs: ["異次元の接続が切断された。", "通常世界へ帰還します。"],
      minePrefix: "異次元の壁を採掘した。",
      slimePrefix: "異次元",
      slimeRewardMultiplier: 20,
      gemRewardMultiplier: 1,
      slimeSpawnRate: 30
    }
  };

  var GEM_REWARD_STONES = {
    N: 10,
    S: 50,
    SR: 100,
    SSR: 500,
    SSSR: 1000,
    UR: 5000,
    AR: 10000,
    LR: 50000,
    GR: 100000,
    BR: 500000,
    QR: 1000000,
    IR: 5000000,
    ER: 10000000,
    IF: 100000000
  };

  var SLIME_STAT_REWARD = {
    N: 1,
    S: 2,
    SR: 3,
    SSR: 4,
    SSSR: 5,
    UR: 10,
    AR: 15,
    LR: 20,
    GR: 30,
    BR: 40,
    QR: 50,
    IR: 75,
    ER: 100
  };

  var N_SLIME_STATS = {
    rank: "N",
    name: "Nスライム",
    hp: 10,
    attack: 1,
    defense: 0,
    speed: 1
  };

  var INFINITY_SLIME_BASE_STATS = {
    rank: "∞",
    name: "∞スライム",
    hp: 999999999,
    attack: 999999,
    defense: 999999,
    speed: 999
  };

  var ZERO_SLIME_BASE_STATS = {
    rank: "0",
    name: "0スライム",
    hp: 9999999999,
    attack: 9999999,
    defense: 9999999,
    speed: 9999,
    luck: 9999
  };

  var ACHIEVEMENT_CATEGORIES = [
    { key: "gacha", label: "ガチャ" },
    { key: "mining", label: "採掘" },
    { key: "gem", label: "宝石" },
    { key: "bug", label: "バグ撃破" },
    { key: "dungeon", label: "ダンジョン" },
    { key: "relic", label: "遺物" },
    { key: "convex", label: "凸" },
    { key: "decompose", label: "分解" },
    { key: "infinity", label: "無限" },
    { key: "rebirth", label: "転生" },
    { key: "special", label: "特殊" }
  ];

  var RANK_ORDER = ["0", "IF", "ER", "IR", "QR", "BR", "GR", "LR", "AR", "UR", "SSSR", "SSR", "SR", "S", "N"];
  var TRACKED_RANKS = ["0", "N", "S", "SR", "SSR", "SSSR", "UR", "AR", "LR", "GR", "BR", "QR", "IR", "ER", "IF"];
  var PLAYER_RELIC_RANKS = ["0", "N", "S", "SR", "SSR", "SSSR", "UR", "AR", "LR", "GR", "BR", "QR", "IR", "ER", "IF"];

  var BUG_RANKS = [
    { rank: "S", name: "Sバグ", hp: 20, attack: 2, defense: 0, speed: 1, rewardMin: 10, rewardMax: 20, dropRanks: ["N", "S"] },
    { rank: "SR", name: "SRバグ", hp: 60, attack: 5, defense: 1, speed: 3, rewardMin: 50, rewardMax: 100, dropRanks: ["N", "S", "SR"] },
    { rank: "SSR", name: "SSRバグ", hp: 200, attack: 12, defense: 3, speed: 8, rewardMin: 200, rewardMax: 500, dropRanks: ["S", "SR"] },
    { rank: "SSSR", name: "SSSRバグ", hp: 800, attack: 30, defense: 10, speed: 20, rewardMin: 1000, rewardMax: 2000, dropRanks: ["SR", "SSR"] },
    { rank: "UR", name: "URバグ", hp: 3000, attack: 80, defense: 30, speed: 50, rewardMin: 5000, rewardMax: 10000, dropRanks: ["SSR", "UR"] },
    { rank: "AR", name: "ARバグ", hp: 12000, attack: 200, defense: 80, speed: 120, rewardMin: 30000, rewardMax: 100000, dropRanks: ["SSSR", "AR"] },
    { rank: "LR", name: "LRバグ", hp: 50000, attack: 600, defense: 250, speed: 300, rewardMin: 200000, rewardMax: 500000, dropRanks: ["UR", "LR"] },
    { rank: "GR", name: "GRバグ", hp: 250000, attack: 2000, defense: 800, speed: 800, rewardMin: 1000000, rewardMax: 3000000, dropRanks: ["AR", "GR"] },
    { rank: "BR", name: "BRバグ", hp: 1500000, attack: 8000, defense: 3000, speed: 2000, rewardMin: 10000000, rewardMax: 30000000, dropRanks: ["LR", "BR"] },
    { rank: "QR", name: "QRバグ", hp: 10000000, attack: 30000, defense: 12000, speed: 5000, rewardMin: 100000000, rewardMax: 300000000, dropRanks: ["GR", "QR"] },
    { rank: "IR", name: "IRバグ", hp: 100000000, attack: 150000, defense: 60000, speed: 12000, rewardMin: 1000000000, rewardMax: 3000000000, dropRanks: ["BR", "IR"] },
    { rank: "ER", name: "ERバグ", hp: 1000000000, attack: 800000, defense: 300000, speed: 30000, rewardMin: 10000000000, rewardMax: 30000000000, dropRanks: ["QR", "ER"] }
  ];

  var BUG_RANK_INDEX = {};
  BUG_RANKS.forEach(function (bug) {
    BUG_RANK_INDEX[bug.rank] = bug;
  });
  var BUG_LIMITED_RELIC_DROP = {
    SSR: {
      relicId: "bug_ssr_discount",
      firstDropRate: 0.10,
      repeatDropRate: 0.05
    }
  };
  var BUG_RANKS_LIST = BUG_RANKS.map(function (bug) {
    return bug.rank;
  });

  var BUG_ACHIEVEMENT_RANK_MULTIPLIER = {
    S: 1,
    SR: 2,
    SSR: 5,
    SSSR: 10,
    UR: 20,
    AR: 30,
    LR: 50,
    GR: 100,
    BR: 200,
    QR: 500,
    IR: 1000,
    ER: 5000
  };

  var BUG_ACHIEVEMENT_THRESHOLDS = [
    { count: 10, baseReward: 1000 },
    { count: 100, baseReward: 10000 },
    { count: 1000, baseReward: 100000 },
    { count: 10000, baseReward: 1000000 },
    { count: 100000, baseReward: 10000000 },
    { count: 1000000, baseReward: 100000000 }
  ];

  function singleEffect(effectType, target, value, phase) {
    return [{ effectType: effectType, target: target, value: value, phase: phase }];
  }

  function createRelic(id, rank, name, description, effects, options) {
    return Object.assign({
      id: id,
      rank: rank,
      name: name,
      description: description,
      effects: effects
    }, options || {});
  }

  var RELICS = [
    createRelic("altar_zero_relic", "0", "0の遺物", "転生するたびに素のガチャ確率が上昇する。転生後、再び購入できるようになる。凸数が多いほど上昇量が増える。", singleEffect("special", "rebirth_base_rate_growth", 1, 8), { obtainType: "altar_only", autoEnableOnFirstGet: true, decomposable: false, altarCost: 100000, uiRank: "0" }),
    createRelic("infinity_slime_relic", "IF", "スライムの遺物", "スライム勝利後にもらえるステータス成長が2倍になる。", singleEffect("special", "slime_growth_multiplier", 2, 8), { obtainType: "zero_slime_reward", autoEnableOnFirstGet: true, limitBreakable: false, decomposable: false, uiRank: "∞", permanent: true }),
    createRelic("altar_ssr_long_press", "SSR", "万里の遺物", "メインボタンを長押しできるようになる。画面が切り替わっても、押し続けている限り現在のメインボタン処理を実行し続ける。", singleEffect("special", "unlock_long_press", 1, 8), { obtainType: "altar_only", autoEnableOnFirstGet: true, limitBreakable: false, decomposable: false, altarCost: 10000 }),
    createRelic("altar_ssr_multi_10", "SSR", "SSR連続の遺物", "10連ガチャを実行できるようになる。ただし10連ガチャの消費石は10,000になる。", singleEffect("special", "unlock_multi_draw_10", 10, 8), { obtainType: "altar_only", autoEnableOnFirstGet: true, limitBreakable: false, decomposable: false, altarCost: 10000 }),
    createRelic("altar_lr_multi_100", "LR", "LR回転する世界の遺物", "100連ガチャを実行できるようになる。ただし100連ガチャの消費石は100,000になる。", singleEffect("special", "unlock_multi_draw_100", 100, 8), { obtainType: "altar_only", autoEnableOnFirstGet: true, limitBreakable: false, decomposable: false, altarCost: 100000 }),
    createRelic("altar_lr_auto_start", "LR", "LR自動起動の遺物", "5秒間ボタンを押さなかった場合、現在のメインボタンを自動で押し続ける。凸するほど実行間隔が短くなる。", singleEffect("special", "auto_main_button", 1, 8), { obtainType: "altar_only", autoEnableOnFirstGet: true, limitBreakable: true, decomposable: false, altarCost: 100000 }),
    createRelic("altar_br_multiverse", "BR", "BRマルチバースの遺物", "所持石をすべて消費し、その数だけガチャを引く。全石ガチャを解放する。", singleEffect("special", "unlock_all_stone_draw", 1, 8), { obtainType: "altar_only", autoEnableOnFirstGet: true, limitBreakable: false, decomposable: false, altarCost: 1000000 }),
    createRelic("n_attack", "N", "N攻撃の遺物", "", singleEffect("stat_flat", "attack", 1, 2)),
    createRelic("n_life", "N", "N生命の遺物", "", singleEffect("stat_flat", "hp", 1, 2)),
    createRelic("n_defense", "N", "N防御の遺物", "", singleEffect("stat_flat", "defense", 1, 2)),
    createRelic("n_speed", "N", "N速度の遺物", "", singleEffect("stat_flat", "speed", 1, 2)),
    createRelic("n_luck", "N", "N幸運の遺物", "", singleEffect("stat_flat", "luck", 1, 2)),
    createRelic("n_stone_pick", "N", "N石拾いの遺物", "", singleEffect("miss_stone_flat", "miss", 1, 2)),
    createRelic("n_pebble_bag", "N", "N小石袋の遺物", "", singleEffect("bug_reward_flat", "stone", 1, 4)),
    createRelic("n_retry", "N", "N再挑戦の遺物", "", singleEffect("special", "bug_lose_stone", 1, 4)),
    createRelic("n_many_hands", "N", "N手数の遺物", "", singleEffect("special", "manual_attack_bonus", 1, 4)),
    createRelic("n_hard_skin", "N", "N硬皮の遺物", "", singleEffect("bug_damage_reduction_flat", "bug", 1, 4)),
    createRelic("n_preemptive", "N", "N先制の遺物", "", singleEffect("battle_start_damage", "enemy", 1, 4)),
    createRelic("n_recovery", "N", "N回復の遺物", "", singleEffect("special", "battle_victory_heal", 1, 4)),
    createRelic("n_first_aid", "N", "N応急の遺物", "", singleEffect("battle_start_heal", "self", 1, 4)),
    createRelic("n_idle", "N", "N放置の遺物", "", singleEffect("idle_stone_flat", "idle", 1, 2)),
    createRelic("n_accuracy", "N", "N命中の遺物", "", singleEffect("accuracy_flat", "accuracy", 1, 2)),
    createRelic("n_evasion", "N", "N回避の遺物", "", singleEffect("evasion_rate", "evasion", 1, 2)),
    createRelic("n_critical", "N", "N会心の遺物", "", singleEffect("critical_rate", "criticalRate", 1, 2)),
    createRelic("n_critical_damage", "N", "N会心ダメの遺物", "", singleEffect("critical_damage", "criticalDamage", 1, 2)),
    createRelic("n_rate_up", "N", "N確率上昇の遺物", "", singleEffect("rate_add", "N", 0.1, 2)),
    createRelic("n_stone_save", "N", "N石節約の遺物", "10回ごとに1回ガチャ消費が無料", singleEffect("free_gacha_interval", "gacha", 10, 2)),
    createRelic("n_fragment", "N", "N欠片の遺物", "", singleEffect("gacha_count_bonus", "miss_10", 1, 2)),
    createRelic("n_record", "N", "N記録の遺物", "", singleEffect("gacha_count_bonus", "total_10", 1, 2)),
    createRelic("n_observe", "N", "N観測の遺物", "", singleEffect("special", "random_log_stone", 0.05, 2)),
    createRelic("n_crush", "N", "N粉砕の遺物", "", singleEffect("special", "dismantle_stone", 1, 5)),
    createRelic("n_storage", "N", "N倉庫の遺物", "", singleEffect("stone_gain_flat", "all", 1, 2)),
    createRelic("n_call", "N", "N呼び声の遺物", "", singleEffect("special", "bug_spawn_add", 0.1, 4)),
    createRelic("n_suppress", "N", "N抑制の遺物", "", singleEffect("special", "bug_spawn_subtract", 0.1, 4)),
    createRelic("n_reward", "N", "N報酬の遺物", "", singleEffect("bug_reward_flat", "stone", 1, 4)),
    createRelic("n_evolution", "N", "N進化の遺物", "", singleEffect("rate_add", "S", 0.1, 2)),
    createRelic("n_devolution", "N", "N退化の遺物", "", singleEffect("rate_subtract", "N", 0.1, 2)),

    createRelic("s_power", "S", "S剛力の遺物", "", singleEffect("stat_flat", "attack", 5, 2)),
    createRelic("s_life", "S", "S生命の遺物", "", singleEffect("stat_flat", "hp", 10, 2)),
    createRelic("s_guard", "S", "S守護の遺物", "", singleEffect("stat_flat", "defense", 5, 2)),
    createRelic("s_gale", "S", "S疾風の遺物", "", singleEffect("stat_flat", "speed", 5, 2)),
    createRelic("s_luck", "S", "S幸運の遺物", "", singleEffect("stat_flat", "luck", 5, 2)),
    createRelic("s_stone_mine", "S", "S石鉱の遺物", "", singleEffect("miss_stone_flat", "miss", 3, 2)),
    createRelic("s_chain", "S", "S連撃の遺物", "", singleEffect("special", "extra_attack_damage", 1, 4)),
    createRelic("s_generate", "S", "S生成の遺物", "", singleEffect("idle_stone_flat", "idle", 10, 2)),
    createRelic("s_victory_reward", "S", "S勝利報酬の遺物", "", singleEffect("bug_reward_flat", "stone", 5, 4)),
    createRelic("s_dismantle_furnace", "S", "S分解炉の遺物", "", singleEffect("special", "dismantle_bonus", 3, 5)),
    createRelic("s_evolution", "S", "S進化の遺物", "", singleEffect("rate_add", "SR", 0.1, 2)),
    createRelic("s_devolution", "S", "S退化の遺物", "", singleEffect("rate_subtract", "S", 0.1, 2)),
    createRelic("s_observe", "S", "S観測の遺物", "", singleEffect("gacha_count_bonus", "total_10", 3, 2)),
    createRelic("s_hunter", "S", "S討伐者の遺物", "", singleEffect("bug_damage_flat", "bug", 3, 4)),
    createRelic("s_stable", "S", "S安定の遺物", "", singleEffect("bug_damage_reduction_flat", "bug", 3, 4)),

    createRelic("sr_power", "SR", "SR剛力の遺物", "", singleEffect("stat_multiplier", "attack", 0.05, 2)),
    createRelic("sr_life", "SR", "SR生命の遺物", "", singleEffect("stat_multiplier", "hp", 0.05, 2)),
    createRelic("sr_guard", "SR", "SR守護の遺物", "", singleEffect("stat_multiplier", "defense", 0.05, 2)),
    createRelic("sr_gale", "SR", "SR疾風の遺物", "", singleEffect("stat_multiplier", "speed", 0.05, 2)),
    createRelic("sr_luck", "SR", "SR幸運の遺物", "", singleEffect("stat_multiplier", "luck", 0.05, 2)),
    createRelic("sr_stone_mine", "SR", "SR石鉱の遺物", "", singleEffect("stone_gain_multiplier", "miss", 0.05, 2)),
    createRelic("sr_subjugation", "SR", "SR討伐の遺物", "", singleEffect("bug_damage_multiplier", "bug", 0.05, 4)),
    createRelic("sr_resist", "SR", "SR耐性の遺物", "", singleEffect("bug_damage_reduction_multiplier", "bug", 0.05, 4)),
    createRelic("sr_evolution", "SR", "SR進化の遺物", "", singleEffect("rate_add", "SSR", 0.05, 2)),
    createRelic("sr_devolution", "SR", "SR退化の遺物", "", singleEffect("rate_subtract", "SR", 0.05, 2)),

    createRelic("ssr_giant", "SSR", "SSR巨人の遺物", "", singleEffect("stat_multiplier", "attack", 0.1, 2)),
    createRelic("ssr_phoenix", "SSR", "SSR不死鳥の遺物", "", singleEffect("stat_multiplier", "hp", 0.1, 2)),
    createRelic("ssr_fortress", "SSR", "SSR城塞の遺物", "", singleEffect("stat_multiplier", "defense", 0.1, 2)),
    createRelic("ssr_thunder", "SSR", "SSR疾雷の遺物", "", singleEffect("stat_multiplier", "speed", 0.1, 2)),
    createRelic("ssr_star_luck", "SSR", "SSR星運の遺物", "", singleEffect("stat_multiplier", "luck", 0.1, 2)),
    createRelic("ssr_gold_vein", "SSR", "SSR黄金鉱脈の遺物", "", singleEffect("stone_gain_multiplier", "miss", 0.1, 2)),
    createRelic("ssr_hunt_god", "SSR", "SSR狩神の遺物", "", singleEffect("bug_damage_multiplier", "bug", 0.1, 4)),
    createRelic("ssr_magic_shell", "SSR", "SSR魔殻の遺物", "", singleEffect("bug_damage_reduction_multiplier", "bug", 0.1, 4)),
    createRelic("bug_ssr_discount", "SSR", "SSR割引の遺物", "ショップ価格を減少させる。凸するほど減少率が上昇する。", singleEffect("special", "shop_discount", 0.05, 8), { obtainType: "bug_drop_only", dropBugRank: "SSR", autoEnableOnFirstGet: true, limitBreakable: true, decomposable: false }),
    createRelic("ssr_transcend", "SSR", "SSR超越の遺物", "", singleEffect("rate_add", "SSSR", 0.01, 2)),
    createRelic("ssr_selection", "SSR", "SSR選別の遺物", "", singleEffect("rate_subtract", "SSR", 0.01, 2)),

    createRelic("sssr_dragon_king", "SSSR", "SSSR竜王の遺物", "", singleEffect("stat_multiplier", "attack", 0.15, 2)),
    createRelic("sssr_world_tree", "SSSR", "SSSR世界樹の遺物", "", [
      { effectType: "stat_multiplier", target: "hp", value: 0.15, phase: 2 },
      { effectType: "battle_start_heal", target: "self_percent", value: 0.05, phase: 4 }
    ]),
    createRelic("sssr_bastion", "SSSR", "SSSR要塞の遺物", "", [
      { effectType: "stat_multiplier", target: "defense", value: 0.15, phase: 2 },
      { effectType: "special", target: "low_hp_defense_bonus", value: 0.05, phase: 4 }
    ]),
    createRelic("sssr_raiden", "SSSR", "SSSR雷神の遺物", "", [
      { effectType: "stat_multiplier", target: "speed", value: 0.15, phase: 2 },
      { effectType: "special", target: "battle_damage_bonus", value: 0.05, phase: 4 }
    ]),
    createRelic("sssr_fate_star", "SSSR", "SSSR運命星の遺物", "", [
      { effectType: "stat_multiplier", target: "luck", value: 0.15, phase: 2 },
      { effectType: "special", target: "miss_stone_chance", value: 0.05, phase: 2 }
    ]),
    createRelic("sssr_alchemist", "SSSR", "SSSR錬金王の遺物", "", singleEffect("stone_gain_multiplier", "miss", 0.2, 2)),
    createRelic("sssr_annihilator", "SSSR", "SSSR討滅者の遺物", "", [
      { effectType: "bug_damage_multiplier", target: "bug", value: 0.15, phase: 4 },
      { effectType: "special", target: "boss_bug_damage_bonus", value: 0.05, phase: 4 }
    ]),
    createRelic("sssr_unbreakable_shell", "SSSR", "SSSR不壊殻の遺物", "", singleEffect("bug_damage_reduction_multiplier", "bug", 0.15, 4)),
    createRelic("sssr_deification", "SSSR", "SSSR神化の遺物", "", singleEffect("rate_add", "UR", 0.005, 2)),
    createRelic("sssr_severance", "SSSR", "SSSR断絶の遺物", "", [
      { effectType: "rate_subtract", target: "SSSR", value: 0.005, phase: 2 },
      { effectType: "special", target: "redirect_to_ur", value: 0.005, phase: 2 }
    ]),

    createRelic("ur_divine_beast", "UR", "UR神獣の遺物", "", singleEffect("final_rate_multiplier", "all", 1.05, 6)),
    createRelic("ur_war_god", "UR", "UR戦神の遺物", "戦闘ステータスを1.05倍", singleEffect("special", "battle_stat_multiplier", 1.05, 6)),
    createRelic("ur_golden_rule", "UR", "UR黄金律の遺物", "石獲得量の最終値を1.1倍", singleEffect("stone_gain_multiplier", "all_final", 1.1, 6)),
    createRelic("ur_observer", "UR", "UR観測者の遺物", "ハズレ時の石獲得確率を強化する", singleEffect("special", "miss_stone_chance_multiplier", 2, 6)),
    createRelic("ur_evolution_factor", "UR", "UR進化因子の遺物", "S以上の出現確率の最終値を1.05倍", singleEffect("rate_group_multiplier", "S_PLUS", 1.05, 6)),

    createRelic("ar_sanctuary", "AR", "AR神域の遺物", "すべてのレア出現確率の最終値を1.1倍", singleEffect("final_rate_multiplier", "all", 1.1, 6)),
    createRelic("ar_reroll", "AR", "AR再抽選の遺物", "", singleEffect("reroll_on_miss", "all", 0.1, 6)),
    createRelic("ar_treasure_vault", "AR", "AR宝物庫の遺物", "石獲得量の最終値を1.25倍", singleEffect("stone_gain_multiplier", "all_final", 1.25, 6)),
    createRelic("ar_destroyer", "AR", "AR破壊者の遺物", "バグに与える最終ダメージを1.25倍", singleEffect("special", "battle_final_damage_multiplier", 1.25, 6)),
    createRelic("ar_guardian", "AR", "AR守護者の遺物", "バグから受ける最終ダメージを0.8倍", singleEffect("special", "battle_final_damage_reduction", 0.8, 6)),

    createRelic("lr_probability_distorter", "LR", "LR確率を歪める者の遺物", "すべてのレア出現確率の最終値を1.2倍", singleEffect("final_rate_multiplier", "all", 1.2, 6)),
    createRelic("lr_miss_rejector", "LR", "LRハズレ拒絶の遺物", "", singleEffect("reroll_on_miss", "reject", 0.1, 6)),
    createRelic("lr_treasure_opener", "LR", "LR宝物庫を開く者の遺物", "", singleEffect("special", "bonus_bug_relic_drop", 0.05, 6)),
    createRelic("lr_calamity_caller", "LR", "LR災厄招来の遺物", "", [
      { effectType: "bug_spawn_rate", target: "all", value: 5, phase: 6 },
      { effectType: "bug_reward_multiplier", target: "all", value: 1.5, phase: 6 }
    ]),
    createRelic("lr_causality_shaver", "LR", "LR因果を削る者の遺物", "現在もっとも低いUR以上の確率を1.1倍", singleEffect("rare_rate_focus", "UR_PLUS_LOWEST", 1.1, 6)),

    createRelic("gr_world_rewriter", "GR", "GR世界改変の遺物", "", [
      { effectType: "final_rate_multiplier", target: "all", value: 1.3, phase: 6 },
      { effectType: "special", target: "miss_rate_subtract_flat", value: 5, phase: 6 }
    ]),
    createRelic("gr_miss_eater", "GR", "GRハズレ捕食の遺物", "", singleEffect("miss_convert", "N_TO_SSSR", 0.2, 6)),
    createRelic("gr_treasure_ruler", "GR", "GR宝物支配の遺物", "", [
      { effectType: "stone_gain_multiplier", target: "all_final", value: 2, phase: 6 },
      { effectType: "bug_reward_multiplier", target: "all", value: 1.5, phase: 6 }
    ]),
    createRelic("gr_calamity_tamer", "GR", "GR災厄を鎮める者の遺物", "バグ出現率10%、バグランク+1、報酬2倍", [
      { effectType: "bug_spawn_rate", target: "all", value: 10, phase: 6 },
      { effectType: "bug_rank_modifier", target: "all", value: 1, phase: 6 },
      { effectType: "bug_reward_multiplier", target: "all", value: 2, phase: 6 }
    ]),
    createRelic("gr_causality_breaker", "GR", "GR因果を砕く者の遺物", "BR以上の確率を1.25倍、さらに低位高レア補正を1.1倍", [
      { effectType: "rate_group_multiplier", target: "BR_PLUS", value: 1.25, phase: 6 },
      { effectType: "special", target: "lower_rate_boost_multiplier", value: 1.1, phase: 6 }
    ]),

    createRelic("br_fate_piercer", "BR", "BR天命を穿つ者の遺物", "全レア確率を1.4倍、さらに最低高レア確率を1.5倍", [
      { effectType: "final_rate_multiplier", target: "all", value: 1.4, phase: 6 },
      { effectType: "rare_rate_focus", target: "HIGH_RARE_LOWEST", value: 1.5, phase: 6 }
    ]),
    createRelic("br_miss_nullifier", "BR", "BRハズレ無効の遺物", "", [
      { effectType: "reroll_on_miss", target: "br", value: 0.3, phase: 6 },
      { effectType: "special", target: "reroll_fail_stone", value: 1, phase: 6 }
    ]),
    createRelic("br_eternal_wealth", "BR", "BR永劫の富の遺物", "石獲得量3倍、ガチャ消費石+1", [
      { effectType: "stone_gain_multiplier", target: "all_final", value: 3, phase: 6 },
      { effectType: "special", target: "gacha_cost_plus", value: 1, phase: 6 }
    ]),
    createRelic("br_calamity_throne", "BR", "BR災厄玉座の遺物", "", [
      { effectType: "bug_rank_modifier", target: "all", value: 1, phase: 6 },
      { effectType: "bug_reward_multiplier", target: "all", value: 3, phase: 6 },
      { effectType: "bug_spawn_rate", target: "all", value: 10, phase: 6 }
    ]),
    createRelic("br_causality_gate", "BR", "BR因果の門を開く者の遺物", "QR以上の確率を1.25倍、さらに低位高レア補正を1.1倍", [
      { effectType: "rate_group_multiplier", target: "QR_PLUS", value: 1.25, phase: 6 },
      { effectType: "special", target: "lower_rate_boost_multiplier", value: 1.1, phase: 6 }
    ]),
    createRelic("qr_random_master", "QR", "QR世界の乱数を支配する者の遺物", "全レア出現確率の最終値を2倍", singleEffect("final_rate_multiplier", "all_relic", 2, 7), { obtainType: "gacha" }),
    createRelic("qr_reroll_crown", "QR", "QR再抽選王冠の遺物", "", singleEffect("reroll_on_miss", "qr", 0.5, 7), { obtainType: "gacha" }),
    createRelic("qr_stone_pillar", "QR", "QR石柱の遺物", "石獲得量の最終値を5倍", singleEffect("stone_gain_multiplier", "all_final", 5, 7), { obtainType: "gacha" }),
    createRelic("qr_bug_frenzy", "QR", "QRバグ狂乱の遺物", "", [
      { effectType: "bug_spawn_rate", target: "all", value: 20, phase: 7 },
      { effectType: "bug_reward_multiplier", target: "all", value: 4, phase: 7 }
    ], { obtainType: "gacha" }),
    createRelic("qr_deep_bug_slayer", "QR", "QR深層バグを討ち果たした者の遺物", "", [
      { effectType: "special", target: "ir_or_higher_rate", value: 2, phase: 7 },
      { effectType: "special", target: "bonus_bug_relic_drop_qr", value: 0.05, phase: 7 }
    ], { obtainType: "bug_drop_only", dropBugRank: "QR" }),
    createRelic("ir_probability_throne", "IR", "IR確率の王座に座す者の遺物", "全レア出現確率の最終値を3倍", singleEffect("final_rate_multiplier", "all_relic", 3, 7), { obtainType: "gacha" }),
    createRelic("ir_reroll_domain", "IR", "IR再抽選領域の遺物", "", singleEffect("reroll_on_miss", "ir", 0.8, 7), { obtainType: "gacha" }),
    createRelic("ir_stone_emperor", "IR", "IR石帝の遺物", "石獲得量の最終値を10倍", singleEffect("stone_gain_multiplier", "all_final", 10, 7), { obtainType: "gacha" }),
    createRelic("ir_bug_domination", "IR", "IRバグ支配の遺物", "", [
      { effectType: "bug_spawn_rate", target: "all", value: 30, phase: 7 },
      { effectType: "bug_reward_multiplier", target: "all", value: 6, phase: 7 }
    ], { obtainType: "gacha" }),
    createRelic("ir_abyss_bug_slayer", "IR", "IR深淵バグを討ち果たした者の遺物", "", [
      { effectType: "special", target: "er_or_higher_rate", value: 3, phase: 7 },
      { effectType: "special", target: "bonus_bug_relic_drop_ir", value: 0.1, phase: 7 }
    ], { obtainType: "bug_drop_only", dropBugRank: "IR" }),
    createRelic("er_probability_god", "ER", "ER確率の神座に至る者の遺物", "全レア出現確率の最終値を5倍", singleEffect("final_rate_multiplier", "all_relic", 5, 7), { obtainType: "gacha" }),
    createRelic("er_reroll_genesis", "ER", "ER再抽選創世の遺物", "", singleEffect("reroll_on_miss", "er", 1, 7), { obtainType: "gacha" }),
    createRelic("er_stone_heaven", "ER", "ER石天の遺物", "石獲得量の最終値を15倍", singleEffect("stone_gain_multiplier", "all_final", 15, 7), { obtainType: "gacha" }),
    createRelic("er_bug_apocalypse", "ER", "ERバグ終焉の遺物", "", [
      { effectType: "bug_spawn_rate", target: "all", value: 50, phase: 7 },
      { effectType: "bug_reward_multiplier", target: "all", value: 11, phase: 7 }
    ], { obtainType: "gacha" }),
    createRelic("er_infinity_gate", "ER", "ER無限門の遺物", "", singleEffect("special", "if_unlock", 1, 7), { obtainType: "bug_drop_only", dropBugRank: "ER" }),
    createRelic("if_infinity", "IF", "無限の遺物", "", singleEffect("special", "infinity_trigger", 1, 8), { obtainType: "if_gacha", autoEnableOnFirstGet: false, decomposable: false, uiRank: "∞" })
  ];

  var RELIC_INDEX = {};
  RELICS.forEach(function (relic) {
    RELIC_INDEX[relic.id] = relic;
  });

  var RELIC_NAME_FALLBACKS = {
    altar_zero_relic: "0の遺物",
    infinity_slime_relic: "スライムの遺物",
    altar_ssr_long_press: "万里の遺物",
    altar_ssr_multi_10: "SSR連続の遺物",
    altar_lr_multi_100: "LR回転する世界の遺物",
    altar_lr_auto_start: "LR自動起動の遺物",
    altar_br_multiverse: "BRマルチバースの遺物",
    n_attack: "N攻撃の遺物",
    n_life: "N生命の遺物",
    n_defense: "N防御の遺物",
    n_speed: "N速度の遺物",
    n_luck: "N幸運の遺物",
    n_stone_pick: "N石拾いの遺物",
    n_pebble_bag: "N小石袋の遺物",
    n_retry: "N再挑戦の遺物",
    n_many_hands: "N手数の遺物",
    n_hard_skin: "N硬皮の遺物",
    n_preemptive: "N先制の遺物",
    n_recovery: "N回復の遺物",
    n_first_aid: "N応急の遺物",
    n_idle: "N放置の遺物",
    n_accuracy: "N命中の遺物",
    n_evasion: "N回避の遺物",
    n_critical: "N会心の遺物",
    n_critical_damage: "N会心ダメの遺物",
    n_rate_up: "N確率上昇の遺物",
    n_stone_save: "N石節約の遺物",
    n_fragment: "N欠片の遺物",
    n_record: "N記録の遺物",
    n_observe: "N観測の遺物",
    n_crush: "N粉砕の遺物",
    n_storage: "N倉庫の遺物",
    n_call: "N呼び声の遺物",
    n_suppress: "N抑制の遺物",
    n_reward: "N報酬の遺物",
    n_evolution: "N進化の遺物",
    n_devolution: "N退化の遺物",
    s_power: "S剛力の遺物",
    s_life: "S生命の遺物",
    s_guard: "S守護の遺物",
    s_gale: "S疾風の遺物",
    s_luck: "S幸運の遺物",
    s_stone_mine: "S石鉱の遺物",
    s_chain: "S連撃の遺物",
    s_generate: "S生成の遺物",
    s_victory_reward: "S勝利報酬の遺物",
    s_dismantle_furnace: "S分解炉の遺物",
    s_evolution: "S進化の遺物",
    s_devolution: "S退化の遺物",
    s_observe: "S観測の遺物",
    s_hunter: "S討伐者の遺物",
    s_stable: "S安定の遺物",
    sr_power: "SR剛力の遺物",
    sr_life: "SR生命の遺物",
    sr_guard: "SR守護の遺物",
    sr_gale: "SR疾風の遺物",
    sr_luck: "SR幸運の遺物",
    sr_stone_mine: "SR石鉱の遺物",
    sr_subjugation: "SR討伐の遺物",
    sr_resist: "SR耐性の遺物",
    sr_evolution: "SR進化の遺物",
    sr_devolution: "SR退化の遺物",
    ssr_giant: "SSR巨人の遺物",
    ssr_phoenix: "SSR不死鳥の遺物",
    ssr_fortress: "SSR城塞の遺物",
    ssr_thunder: "SSR疾雷の遺物",
    ssr_star_luck: "SSR星運の遺物",
    ssr_gold_vein: "SSR黄金鉱脈の遺物",
    ssr_hunt_god: "SSR狩神の遺物",
    ssr_magic_shell: "SSR魔殻の遺物",
    bug_ssr_discount: "SSR割引の遺物",
    ssr_transcend: "SSR超越の遺物",
    ssr_selection: "SSR選別の遺物",
    sssr_dragon_king: "SSSR竜王の遺物",
    sssr_world_tree: "SSSR世界樹の遺物",
    sssr_bastion: "SSSR要塞の遺物",
    sssr_raiden: "SSSR雷神の遺物",
    sssr_fate_star: "SSSR運命星の遺物",
    sssr_alchemist: "SSSR錬金王の遺物",
    sssr_annihilator: "SSSR討滅者の遺物",
    sssr_unbreakable_shell: "SSSR不壊殻の遺物",
    sssr_deification: "SSSR神化の遺物",
    sssr_severance: "SSSR断絶の遺物",
    ur_divine_beast: "UR神獣の遺物",
    ur_war_god: "UR戦神の遺物",
    ur_golden_rule: "UR黄金律の遺物",
    ur_observer: "UR観測者の遺物",
    ur_evolution_factor: "UR進化因子の遺物",
    ar_sanctuary: "AR神域の遺物",
    ar_reroll: "AR再抽選の遺物",
    ar_treasure_vault: "AR宝物庫の遺物",
    ar_destroyer: "AR破壊者の遺物",
    ar_guardian: "AR守護者の遺物",
    lr_probability_distorter: "LR確率を歪める者の遺物",
    lr_miss_rejector: "LRハズレ拒絶の遺物",
    lr_treasure_opener: "LR宝物庫を開く者の遺物",
    lr_calamity_caller: "LR災厄招来の遺物",
    lr_causality_shaver: "LR因果を削る者の遺物",
    gr_world_rewriter: "GR世界改変の遺物",
    gr_miss_eater: "GRハズレ捕食の遺物",
    gr_treasure_ruler: "GR宝物支配の遺物",
    gr_calamity_tamer: "GR災厄を鎮める者の遺物",
    gr_causality_breaker: "GR因果を砕く者の遺物",
    br_fate_piercer: "BR天命を穿つ者の遺物",
    br_miss_nullifier: "BRハズレ無効の遺物",
    br_eternal_wealth: "BR永劫の富の遺物",
    br_calamity_throne: "BR災厄玉座の遺物",
    br_causality_gate: "BR因果の門を開く者の遺物",
    qr_random_master: "QR世界の乱数を支配する者の遺物",
    qr_reroll_crown: "QR再抽選王冠の遺物",
    qr_stone_pillar: "QR石柱の遺物",
    qr_bug_frenzy: "QRバグ狂乱の遺物",
    qr_deep_bug_slayer: "QR深層バグを討ち果たした者の遺物",
    ir_probability_throne: "IR確率の王座に座す者の遺物",
    ir_reroll_domain: "IR再抽選領域の遺物",
    ir_stone_emperor: "IR石帝の遺物",
    ir_bug_domination: "IRバグ支配の遺物",
    ir_abyss_bug_slayer: "IR深淵バグを討ち果たした者の遺物",
    er_probability_god: "ER確率の神座に至る者の遺物",
    er_reroll_genesis: "ER再抽選創世の遺物",
    er_stone_heaven: "ER石天の遺物",
    er_bug_apocalypse: "ERバグ終焉の遺物",
    er_infinity_gate: "ER無限門の遺物",
    if_infinity: "無限の遺物"
  };

  function isMojibakeText(text) {
    return /[\u7e3a\u7e67\u86df\u7e5d\u9a55\u907a\u8f5d\u8734\u83a8\u9aea\u9015\u8b3e\u8b00\u8747\u9695\u8c82\u86fb\u95a0\u8f63]/.test(String(text || ""));
  }

  function getEffectTargetLabel(target) {
    var labels = {
      attack: "攻撃",
      hp: "HP",
      defense: "防御",
      speed: "速度",
      luck: "運",
      accuracy: "命中",
      evasion: "回避",
      criticalRate: "会心率",
      criticalDamage: "会心ダメージ",
      miss: "ハズレ時",
      stone: "石",
      all: "全体",
      all_relic: "全レア",
      all_final: "全石獲得",
      idle: "放置",
      total_10: "10回ごと",
      miss_10: "ハズレ10回ごと",
      bug: "バグ",
      enemy: "敵",
      self: "自分",
      self_percent: "自身HP割合",
      gacha: "ガチャ",
      S_PLUS: "S以上",
      BR_PLUS: "BR以上",
      QR_PLUS: "QR以上"
    };
    return labels[target] || target;
  }

  function formatRelicEffectFallback(effect) {
    if (!effect) {
      return "効果未設定";
    }
    if (effect.effectType === "stat_flat") {
      return getEffectTargetLabel(effect.target) + "+" + effect.value;
    }
    if (effect.effectType === "stat_multiplier") {
      return getEffectTargetLabel(effect.target) + "+" + (effect.value * 100) + "%";
    }
    if (effect.effectType === "rate_add") {
      return effect.target + "確率+" + effect.value + "%";
    }
    if (effect.effectType === "rate_subtract") {
      return effect.target + "確率-" + effect.value + "%";
    }
    if (effect.effectType === "stone_gain_multiplier") {
      return getEffectTargetLabel(effect.target) + "石獲得" + effect.value + "倍";
    }
    if (effect.effectType === "miss_stone_flat") {
      return "ハズレ時に石+" + effect.value;
    }
    if (effect.effectType === "idle_stone_flat") {
      return "10秒ごとに石+" + effect.value;
    }
    if (effect.effectType === "bug_reward_flat") {
      return "バグ報酬石+" + effect.value;
    }
    if (effect.effectType === "bug_reward_multiplier") {
      return "バグ報酬" + effect.value + "倍";
    }
    if (effect.effectType === "bug_damage_flat") {
      return "対バグ与ダメ+" + effect.value;
    }
    if (effect.effectType === "bug_damage_multiplier") {
      return "対バグ与ダメ+" + (effect.value * 100) + "%";
    }
    if (effect.effectType === "bug_damage_reduction_flat") {
      return "対バグ被ダメ-" + effect.value;
    }
    if (effect.effectType === "bug_damage_reduction_multiplier") {
      return "対バグ被ダメ-" + (effect.value * 100) + "%";
    }
    if (effect.effectType === "free_gacha_interval") {
      return effect.value + "回ごとに無料";
    }
    if (effect.effectType === "gacha_count_bonus") {
      return getEffectTargetLabel(effect.target) + "で石+" + effect.value;
    }
    if (effect.effectType === "accuracy_flat") {
      return "命中+" + effect.value;
    }
    if (effect.effectType === "evasion_rate") {
      return "回避率+" + effect.value + "%";
    }
    if (effect.effectType === "critical_rate") {
      return "会心率+" + effect.value + "%";
    }
    if (effect.effectType === "critical_damage") {
      return "会心ダメージ+" + effect.value + "%";
    }
    if (effect.effectType === "reroll_on_miss") {
      return "ハズレ時に再抽選";
    }
    if (effect.effectType === "miss_convert") {
      return "ハズレ変換";
    }
    if (effect.effectType === "special") {
      if (effect.target === "unlock_long_press") {
        return "長押しを解放";
      }
      if (effect.target === "unlock_multi_draw_10") {
        return "10連ガチャを解放";
      }
      if (effect.target === "unlock_multi_draw_100") {
        return "100連ガチャを解放";
      }
      if (effect.target === "unlock_all_stone_draw") {
        return "全石ガチャを解放";
      }
      if (effect.target === "if_unlock") {
        return "IF確率表示を解放";
      }
      if (effect.target === "infinity_trigger") {
        return "無限を解放";
      }
      if (effect.target === "slime_growth_multiplier") {
        return "スライム成長報酬" + effect.value + "倍";
      }
      if (effect.target === "rebirth_base_rate_growth") {
        return "転生で基礎確率を強化";
      }
      if (effect.target === "random_log_stone") {
        return "観測ログ時に追加石";
      }
      if (effect.target === "bug_spawn_add") {
        return "バグ出現率+" + effect.value + "%";
      }
      if (effect.target === "bug_spawn_subtract") {
        return "バグ出現率-" + effect.value + "%";
      }
      return "特殊効果";
    }
    return "効果未設定";
  }

  function buildRelicDescriptionFallback(relic) {
    if (!relic || !Array.isArray(relic.effects) || !relic.effects.length) {
      return "効果未設定";
    }
    return relic.effects.map(formatRelicEffectFallback).join(" / ");
  }

  RELICS.forEach(function (relic) {
    if (isMojibakeText(relic.name)) {
      relic.name = RELIC_NAME_FALLBACKS[relic.id] || relic.id;
    }
    if (!relic.description || isMojibakeText(relic.description)) {
      relic.description = buildRelicDescriptionFallback(relic);
    }
  });

  function getRelicDisplayName(relicOrId) {
    var relic = typeof relicOrId === "string" ? RELIC_INDEX[relicOrId] : relicOrId;
    var relicId = typeof relicOrId === "string" ? relicOrId : (relicOrId && relicOrId.id);
    if (relic && relic.name && !isMojibakeText(relic.name)) {
      return relic.name;
    }
    return RELIC_NAME_FALLBACKS[relicId] || relicId || "遺物";
  }

  var GACHA_RANKS = [
    { key: "IF", label: "IF", baseChance: 0.0000000000000000000000000000001, displayRate: "0.0000000000000000000000000000001%", relicIds: ["if_infinity"] },
    { key: "ER", label: "ER", baseChance: 0.00000000001, displayRate: "0.00000000001%", relicIds: ["er_probability_god", "er_reroll_genesis", "er_stone_heaven", "er_bug_apocalypse"] },
    { key: "IR", label: "IR", baseChance: 0.0000000001, displayRate: "0.0000000001%", relicIds: ["ir_probability_throne", "ir_reroll_domain", "ir_stone_emperor", "ir_bug_domination"] },
    { key: "QR", label: "QR", baseChance: 0.000000001, displayRate: "0.000000001%", relicIds: ["qr_random_master", "qr_reroll_crown", "qr_stone_pillar", "qr_bug_frenzy"] },
    { key: "BR", label: "BR", baseChance: 0.00000001, displayRate: "0.00000001%", relicIds: ["br_fate_piercer", "br_miss_nullifier", "br_eternal_wealth", "br_calamity_throne", "br_causality_gate"] },
    { key: "GR", label: "GR", baseChance: 0.000001, displayRate: "0.000001%", relicIds: ["gr_world_rewriter", "gr_miss_eater", "gr_treasure_ruler", "gr_calamity_tamer", "gr_causality_breaker"] },
    { key: "LR", label: "LR", baseChance: 0.00001, displayRate: "0.00001%", relicIds: ["lr_probability_distorter", "lr_miss_rejector", "lr_treasure_opener", "lr_calamity_caller", "lr_causality_shaver"] },
    { key: "AR", label: "AR", baseChance: 0.0001, displayRate: "0.0001%", relicIds: ["ar_sanctuary", "ar_reroll", "ar_treasure_vault", "ar_destroyer", "ar_guardian"] },
    { key: "UR", label: "UR", baseChance: 0.001, displayRate: "0.001%", relicIds: ["ur_divine_beast", "ur_war_god", "ur_golden_rule", "ur_observer", "ur_evolution_factor"] },
    { key: "SSSR", label: "SSSR", baseChance: 0.01, displayRate: "0.01%", relicIds: ["sssr_dragon_king", "sssr_world_tree", "sssr_bastion", "sssr_raiden", "sssr_fate_star", "sssr_alchemist", "sssr_annihilator", "sssr_unbreakable_shell", "sssr_deification", "sssr_severance"] },
    { key: "SSR", label: "SSR", baseChance: 0.1, displayRate: "0.1%", relicIds: ["ssr_giant", "ssr_phoenix", "ssr_fortress", "ssr_thunder", "ssr_star_luck", "ssr_gold_vein", "ssr_hunt_god", "ssr_magic_shell", "ssr_transcend", "ssr_selection"] },
    { key: "SR", label: "SR", baseChance: 1, displayRate: "1%", relicIds: ["sr_power", "sr_life", "sr_guard", "sr_gale", "sr_luck", "sr_stone_mine", "sr_subjugation", "sr_resist", "sr_evolution", "sr_devolution"] },
    { key: "S", label: "S", baseChance: 3, displayRate: "3%", relicIds: ["s_power", "s_life", "s_guard", "s_gale", "s_luck", "s_stone_mine", "s_chain", "s_generate", "s_victory_reward", "s_dismantle_furnace", "s_evolution", "s_devolution", "s_observe", "s_hunter", "s_stable"] },
    { key: "N", label: "N", baseChance: 15, displayRate: "15%", relicIds: ["n_attack", "n_life", "n_defense", "n_speed", "n_luck", "n_stone_pick", "n_pebble_bag", "n_retry", "n_many_hands", "n_hard_skin", "n_preemptive", "n_recovery", "n_first_aid", "n_idle", "n_accuracy", "n_evasion", "n_critical", "n_critical_damage", "n_rate_up", "n_stone_save", "n_fragment", "n_record", "n_observe", "n_crush", "n_storage", "n_call", "n_suppress", "n_reward", "n_evolution", "n_devolution"] }
  ];

  function createRankTotalObject() {
    var result = {};
    TRACKED_RANKS.forEach(function (rank) {
      result[rank] = 0;
    });
    return result;
  }

  function createRankLimitBreakObject() {
    var result = {};
    TRACKED_RANKS.forEach(function (rank) {
      result[rank] = 0;
    });
    return result;
  }

  function createBugDefeatRateBonus() {
    var result = {};
    Object.keys(BUG_DEFEAT_RATE_BONUS_INCREASE).forEach(function (rank) {
      result[rank] = 1;
    });
    return result;
  }

  function createDefeatedBugCounts() {
    var result = {};
    BUG_RANKS.forEach(function (bug) {
      result[bug.rank] = 0;
    });
    return result;
  }

  function createDungeonState() {
    return {
      isInDungeon: false,
      type: null,
      name: null,
      startedAt: null,
      endsAt: null,
      miningCount: 0,
      slimeDefeatCount: 0,
      currentDungeonSlimeDefeatCount: 0,
      unlockedSlimeRanks: ["N"],
      highestDefeatedSlimeRank: null,
      dungeonRateBonus: 1,
      isInfiniteDungeon: false
    };
  }

  function createDungeonStatBonus() {
    return {
      hp: 0,
      attack: 0,
      defense: 0,
      speed: 0,
      luck: 0,
      accuracy: 0,
      evasionRate: 0,
      criticalRate: 0,
      criticalDamage: 0
    };
  }

  function createDungeonRecords() {
    return {
      totalMiningCount: 0,
      totalGemCount: 0,
      totalSlimeDefeats: 0,
      totalInfinitySlimeEncounters: 0,
      totalInfinitySlimeDefeats: 0,
      totalZeroSlimeEncounters: 0,
      totalZeroSlimeDefeats: 0,
      enteredNormalDungeon: 0,
      enteredGoldenDungeon: 0,
      enteredDimensionalDungeon: 0
    };
  }

  function createRebirthState() {
    return {
      rebirthCount: 0,
      baseRateRebirthBonus: 0,
      lastRebirthAt: null,
      history: []
    };
  }

  function createZeroRelicState() {
    return {
      owned: false,
      enabled: false,
      count: 0,
      limitBreak: 0,
      purchasedThisLife: false
    };
  }

  function createPermanentRelics() {
    return {
      infinity_slime_relic: {
        owned: false,
        enabled: false
      }
    };
  }

  function createZeroSlimeRecords() {
    return {
      totalEncounters: 0,
      totalDefeats: 0,
      firstDefeatedAt: null
    };
  }

  function getRankOrderIndex(rank) {
    var index = RANK_ORDER.indexOf(rank);
    return index === -1 ? 999 : index;
  }

  function isRankAtLeast(rank, minimumRank) {
    return getRankOrderIndex(rank) <= getRankOrderIndex(minimumRank);
  }

  function createAchievement(definition) {
    var category = ACHIEVEMENT_CATEGORIES.find(function (item) {
      return item.key === definition.categoryKey;
    });
    return Object.assign({}, definition, {
      category: category ? category.label : definition.categoryKey
    });
  }

  function generateCountAchievements(definitions, categoryKey, targetType) {
    return definitions.map(function (definition) {
      return createAchievement({
        id: definition.id,
        categoryKey: categoryKey,
        name: definition.name,
        description: definition.description,
        targetType: targetType,
        targetValue: definition.targetValue,
        rewardStone: definition.rewardStone,
        implemented: true
      });
    });
  }

  function generateBugDefeatAchievements() {
    var achievements = [];
    BUG_RANKS_LIST.forEach(function (rank) {
      var rankMultiplier = BUG_ACHIEVEMENT_RANK_MULTIPLIER[rank] || 1;
      BUG_ACHIEVEMENT_THRESHOLDS.forEach(function (threshold) {
        achievements.push(createAchievement({
          id: "bug_defeat_" + rank + "_" + threshold.count,
          categoryKey: "bug",
          name: rank + "バグを" + threshold.count.toLocaleString("ja-JP") + "体撃破",
          description: rank + "バグを" + threshold.count.toLocaleString("ja-JP") + "体撃破する。",
          targetType: "bugRankDefeat",
          targetRank: rank,
          targetValue: threshold.count,
          rewardStone: threshold.baseReward * rankMultiplier,
          implemented: true
        }));
      });
    });
    return achievements;
  }

  function buildAchievements() {
    return [
      createAchievement({ id: "gacha_1", categoryKey: "gacha", name: "初めてのガチャ", description: "ガチャを1回引く", targetType: "totalGachaCount", targetValue: 1, rewardStone: 10 }),
      createAchievement({ id: "gacha_2", categoryKey: "gacha", name: "ガチャ好き", description: "ガチャを100回引く", targetType: "totalGachaCount", targetValue: 100, rewardStone: 100 }),
    ].concat(generateCountAchievements([
      { id: "gacha_count_1000", name: "千回の観測者", description: "総ガチャ回数が1,000回に到達する。", targetValue: 1000, rewardStone: 1000 },
      { id: "gacha_count_10000", name: "一万回の観測者", description: "総ガチャ回数が10,000回に到達する。", targetValue: 10000, rewardStone: 10000 },
      { id: "gacha_count_100000", name: "十万回の観測者", description: "総ガチャ回数が100,000回に到達する。", targetValue: 100000, rewardStone: 100000 },
      { id: "gacha_count_1000000", name: "百万回の観測者", description: "総ガチャ回数が1,000,000回に到達する。", targetValue: 1000000, rewardStone: 1000000 }
    ], "gacha", "totalGachaCount")).concat([
      createAchievement({ id: "relic_n_1", categoryKey: "relic", name: "Nとの出会い", description: "N遺物を1個獲得する", targetType: "rankRelicTotal", targetRank: "N", targetValue: 1, rewardStone: 10 }),
      createAchievement({ id: "relic_rank_SSR_1", categoryKey: "relic", name: "SSR到達", description: "SSR遺物を1個獲得する", targetType: "rankRelicTotal", targetRank: "SSR", targetValue: 1, rewardStone: 500 }),
      createAchievement({ id: "convex_any_1", categoryKey: "convex", name: "初めての凸", description: "どれかの遺物を1凸にする", targetType: "maxRelicLimitBreak", targetValue: 1, rewardStone: 50 }),
      createAchievement({ id: "convex_any_10", categoryKey: "convex", name: "重ね上げる", description: "どれかの遺物を10凸にする", targetType: "maxRelicLimitBreak", targetValue: 10, rewardStone: 300 }),
      createAchievement({ id: "convex_n_1000", categoryKey: "convex", name: "Nを鍛えた者", description: "N遺物を1000凸にする", targetType: "rankMaxLimitBreak", targetRank: "N", targetValue: 1000, rewardStone: 100000 }),
      createAchievement({ id: "convex_n_10000", categoryKey: "convex", name: "Nの極点", description: "N遺物を10000凸にする", targetType: "rankMaxLimitBreak", targetRank: "N", targetValue: 10000, rewardStone: 1000000 }),
      createAchievement({ id: "convex_ur_plus_10", categoryKey: "convex", name: "高レアを鍛えた者", description: "UR以上の遺物を10凸にする", targetType: "highestRankMaxLimitBreak", targetRanks: ["UR", "AR", "LR", "GR", "BR", "QR", "IR", "ER"], targetValue: 10, rewardStone: 5000000 }),
      createAchievement({ id: "convex_er_10", categoryKey: "convex", name: "ERを極めた者", description: "ER遺物を10凸にする", targetType: "rankMaxLimitBreak", targetRank: "ER", targetValue: 10, rewardStone: 500000000 }),
      createAchievement({ id: "bug_total_1", categoryKey: "bug", name: "初めてのバグ撃破", description: "バグを1体倒す", targetType: "totalBugDefeats", targetValue: 1, rewardStone: 100 }),
      createAchievement({ id: "bug_total_10", categoryKey: "bug", name: "バグハンター", description: "バグを10体倒す", targetType: "totalBugDefeats", targetValue: 10, rewardStone: 1000 }),
      createAchievement({ id: "bug_rank_S", categoryKey: "bug", name: "Sバグを倒した", description: "Sバグを撃破する", targetType: "bugRankDefeat", targetRank: "S", targetValue: 1, rewardStone: 1000 }),
      createAchievement({ id: "bug_rank_ER", categoryKey: "bug", name: "ERバグを倒した", description: "ERバグを撃破する", targetType: "bugRankDefeat", targetRank: "ER", targetValue: 1, rewardStone: 20000000000 }),
    ]).concat(generateBugDefeatAchievements()).concat([
      createAchievement({ id: "dungeon_mine_1", categoryKey: "mining", name: "初めての採掘", description: "採掘を1回行う", targetType: "totalMiningCount", targetValue: 1, rewardStone: 100, implemented: true }),
      createAchievement({ id: "dungeon_mine_100", categoryKey: "mining", name: "鉱夫", description: "採掘を100回行う", targetType: "totalMiningCount", targetValue: 100, rewardStone: 10000, implemented: true }),
    ]).concat(generateCountAchievements([
      { id: "mining_count_1000", name: "千回掘る者", description: "総採掘回数が1,000回に到達する。", targetValue: 1000, rewardStone: 5000 },
      { id: "mining_count_10000", name: "一万回掘る者", description: "総採掘回数が10,000回に到達する。", targetValue: 10000, rewardStone: 50000 },
      { id: "mining_count_100000", name: "十万回掘る者", description: "総採掘回数が100,000回に到達する。", targetValue: 100000, rewardStone: 500000 },
      { id: "mining_count_1000000", name: "百万回掘る者", description: "総採掘回数が1,000,000回に到達する。", targetValue: 1000000, rewardStone: 5000000 }
    ], "mining", "totalMiningCount")).concat([
      createAchievement({ id: "dungeon_gem_1", categoryKey: "gem", name: "宝石発見", description: "初めて宝石を掘る", targetType: "totalGemCount", targetValue: 1, rewardStone: 1000, implemented: true }),
    ]).concat(generateCountAchievements([
      { id: "gem_count_1000", name: "千の宝石", description: "宝石を合計1,000個獲得する。", targetValue: 1000, rewardStone: 10000 },
      { id: "gem_count_10000", name: "一万の宝石", description: "宝石を合計10,000個獲得する。", targetValue: 10000, rewardStone: 100000 },
      { id: "gem_count_100000", name: "十万の宝石", description: "宝石を合計100,000個獲得する。", targetValue: 100000, rewardStone: 1000000 },
      { id: "gem_count_1000000", name: "百万の宝石", description: "宝石を合計1,000,000個獲得する。", targetValue: 1000000, rewardStone: 10000000 }
    ], "gem", "totalGemCount")).concat([
      createAchievement({ id: "dungeon_enter_golden", categoryKey: "dungeon", name: "黄金の採掘者", description: "黄金ダンジョンに入る", targetType: "enteredGoldenDungeon", targetValue: 1, rewardStone: 10000, implemented: true }),
      createAchievement({ id: "dungeon_enter_dimensional", categoryKey: "dungeon", name: "異次元採掘者", description: "異次元ダンジョンに入る", targetType: "enteredDimensionalDungeon", targetValue: 1, rewardStone: 100000, implemented: true }),
      createAchievement({ id: "dungeon_slime_1", categoryKey: "dungeon", name: "初めてのスライム退治", description: "スライムを1体撃破", targetType: "totalSlimeDefeats", targetValue: 1, rewardStone: 1000, implemented: true }),
      createAchievement({ id: "dungeon_slime_100", categoryKey: "dungeon", name: "スライム狩り", description: "スライムを100体撃破", targetType: "totalSlimeDefeats", targetValue: 100, rewardStone: 100000, implemented: true }),
      createAchievement({ id: "dungeon_infinity_encounter", categoryKey: "dungeon", name: "無限に触れた採掘者", description: "∞スライムに遭遇", targetType: "totalInfinitySlimeEncounters", targetValue: 1, rewardStone: 1000000, implemented: true }),
      createAchievement({ id: "dungeon_infinity_defeat", categoryKey: "dungeon", name: "無限を砕く者", description: "∞スライムを撃破", targetType: "totalInfinitySlimeDefeats", targetValue: 1, rewardStone: 100000000, implemented: true }),
      createAchievement({ id: "dungeon_zero_encounter", categoryKey: "dungeon", name: "0を見た採掘者", description: "0スライムに遭遇", targetType: "totalZeroSlimeEncounters", targetValue: 1, rewardStone: 10000000, implemented: true }),
      createAchievement({ id: "dungeon_zero_defeat", categoryKey: "dungeon", name: "スライム神", description: "0スライムを撃破", targetType: "totalZeroSlimeDefeats", targetValue: 1, rewardStone: 1000000000, implemented: true }),
      createAchievement({ id: "rebirth_1", categoryKey: "rebirth", name: "最初の転生", description: "転生を1回行う", targetType: "rebirthCount", targetValue: 1, rewardStone: 10000, implemented: true }),
      createAchievement({ id: "rebirth_10", categoryKey: "rebirth", name: "転生の習熟者", description: "転生を10回行う", targetType: "rebirthCount", targetValue: 10, rewardStone: 1000000, implemented: true }),
      createAchievement({ id: "zero_relic_lb1", categoryKey: "rebirth", name: "0を重ねる者", description: "0の遺物を1凸にする", targetType: "zeroRelicLimitBreak", targetValue: 1, rewardStone: 100000, implemented: true }),
      createAchievement({ id: "decompose_1", categoryKey: "decompose", name: "初めての分解", description: "遺物を1個分解する", targetType: "totalDecomposeCount", targetValue: 1, rewardStone: 20 }),
      createAchievement({ id: "decompose_10", categoryKey: "decompose", name: "分解職人", description: "遺物を10個分解する", targetType: "totalDecomposeCount", targetValue: 10, rewardStone: 100 }),
      createAchievement({ id: "decompose_stone_1000000", categoryKey: "decompose", name: "石に還す者", description: "分解で1,000,000石獲得", targetType: "totalDecomposeStone", targetValue: 1000000, rewardStone: 1000000 }),
      createAchievement({ id: "milestone_sr", categoryKey: "gacha", name: "レアの入口", description: "SR以上を獲得", targetType: "highestRelicRankAtLeast", targetRank: "SR", rewardStone: 500, implemented: true }),
      createAchievement({ id: "milestone_ssr", categoryKey: "gacha", name: "本物の幸運", description: "SSR以上を獲得", targetType: "highestRelicRankAtLeast", targetRank: "SSR", rewardStone: 3000, implemented: true }),
      createAchievement({ id: "milestone_ur", categoryKey: "gacha", name: "上位世界の始まり", description: "UR以上を獲得", targetType: "highestRelicRankAtLeast", targetRank: "UR", rewardStone: 100000, implemented: true }),
      createAchievement({ id: "milestone_qr", categoryKey: "gacha", name: "ありえない引き", description: "QR以上を獲得", targetType: "highestRelicRankAtLeast", targetRank: "QR", rewardStone: 50000000, implemented: true }),
      createAchievement({ id: "milestone_ir", categoryKey: "gacha", name: "確率の深淵", description: "IR以上を獲得", targetType: "highestRelicRankAtLeast", targetRank: "IR", rewardStone: 500000000, implemented: true }),
      createAchievement({ id: "milestone_er", categoryKey: "gacha", name: "終端の観測", description: "ER以上を獲得", targetType: "highestRelicRankAtLeast", targetRank: "ER", rewardStone: 5000000000, implemented: true }),
      createAchievement({ id: "milestone_infinity", categoryKey: "infinity", name: "無限の観測", description: "∞遺物を獲得", targetType: "future", rewardStone: 0, implemented: false, futurePhase: 8 }),
      createAchievement({ id: "milestone_infinity_button", categoryKey: "infinity", name: "無限を押した者", description: "初めて「無限」を押す", targetType: "future", rewardStone: 0, implemented: false, futurePhase: 8 }),
      createAchievement({ id: "milestone_infinity_lb1", categoryKey: "infinity", name: "二周目の世界", description: "∞凸1達成", targetType: "future", rewardStone: 1000000, implemented: false, futurePhase: 8 }),
      createAchievement({ id: "milestone_infinity_lb5", categoryKey: "infinity", name: "確率の外側", description: "∞凸5達成", targetType: "future", rewardStone: 100000000, implemented: false, futurePhase: 8 }),
      createAchievement({ id: "milestone_infinity_lb10", categoryKey: "infinity", name: "終わりなき始まり", description: "∞凸10達成", targetType: "future", rewardStone: 10000000000, implemented: false, futurePhase: 8 }),
      createAchievement({ id: "special_total_miss_10000", categoryKey: "special", name: "ハズレに愛された者", description: "ハズレを10,000回引く", targetType: "totalMissCount", targetValue: 10000, rewardStone: 100000, implemented: true }),
      createAchievement({ id: "special_n_only_ssr_bug", categoryKey: "special", name: "Nだけで勝つ", description: "UR未所持でSSRバグを撃破", targetType: "specialFlag", targetFlag: "defeatedSsrBugWithoutUr", rewardStone: 80000, implemented: true }),
      createAchievement({ id: "special_n_total_lb_10000", categoryKey: "special", name: "Nの総力", description: "N遺物の総凸数10,000", targetType: "rankTotalLimitBreak", targetRank: "N", targetValue: 10000, rewardStone: 1000000, implemented: true }),
      createAchievement({ id: "special_bug_spawn_three", categoryKey: "special", name: "バグに追われる者", description: "10回以内にバグが3回出現", targetType: "specialFlag", targetFlag: "threeBugSpawnsWithinTen", rewardStone: 50000, implemented: true }),
      createAchievement({ id: "special_sub001", categoryKey: "special", name: "確率の底を見た", description: "0.001%以下の遺物を獲得", targetType: "specialFlag", targetFlag: "subPoint001RelicFound", rewardStone: 1000000, implemented: true }),
      createAchievement({ id: "special_infinity_break", categoryKey: "infinity", name: "無限突破", description: "∞遺物を初獲得", targetType: "future", rewardStone: 0, implemented: false, futurePhase: 8 })
    ]);
  }

  var ACHIEVEMENTS = buildAchievements();
  var ACHIEVEMENT_INDEX = {};
  ACHIEVEMENTS.forEach(function (achievement) {
    ACHIEVEMENT_INDEX[achievement.id] = achievement;
  });

  function createInitialState(now) {
    return {
      stones: 100,
      ownedRelics: {},
      logs: ["[SYSTEM] データを初期化しました。"],
      lastRecoveryAt: now,
      totalGachaCount: 0,
      missCount: 0,
      totalMissCount: 0,
      nextAcquiredOrder: 1,
      isBattle: false,
      battleState: null,
      unlockedBugRanks: ["S"],
      defeatedBugCounts: createDefeatedBugCounts(),
      pendingBugRank: null,
      pendingBugSourceRank: null,
      totalBugDefeats: 0,
      bugDefeatRateBonus: createBugDefeatRateBonus(),
      highestDefeatedBugRank: null,
      achievementState: {
        claimed: {},
        announced: {}
      },
      relicRankTotal: createRankTotalObject(),
      totalDecomposeCount: 0,
      totalDecomposeStone: 0,
      highestRelicRank: null,
      discoveredRelics: [],
      maxRelicCount: 0,
      maxRelicLimitBreak: 0,
      rankMaxLimitBreak: createRankLimitBreakObject(),
      specialFlags: {
        defeatedSsrBugWithoutUr: false,
        threeBugSpawnsWithinTen: false,
        subPoint001RelicFound: false
      },
      altarState: {
        activeEvent: null,
        eventHistory: [],
        altarRelicObtained: {}
      },
      dungeonState: createDungeonState(),
      dungeonStatBonus: createDungeonStatBonus(),
      dungeonRecords: createDungeonRecords(),
      rebirthState: createRebirthState(),
      zeroRelicState: createZeroRelicState(),
      permanentRelics: createPermanentRelics(),
      zeroSlimeRecords: createZeroSlimeRecords(),
      autoButtonState: {
        lastPlayerActionAt: now,
        isRunning: false,
        startedAt: null
      },
      tutorialState: {
        hasSeenFirstTutorial: false,
        hasSeenRebirthTutorial: false,
        hasSeenSecondLoopTutorial: false,
        tutorialLogEnabled: true
      },
      recentBugSpawnGachaCounts: [],
      ifUnlocked: false,
      bugLimitedRelicObtained: {
        QR: false,
        IR: false,
        ER: false
      },
      limitedRelicDiscovered: {
        qr_deep_bug_slayer: false,
        ir_abyss_bug_slayer: false,
        er_infinity_gate: false
      },
      highestObservedRank: null,
      observedIfProbability: false,
      infinityCount: 0,
      infinityExecuted: false,
      specialLogUnlocked: false,
      ifRelicObtained: false,
      infinityHistory: [],
      normalLoopStartAt: now,
      settings: {
        achievementStoneMultiplierEnabled: false,
        allowRankBoostPastUnlock: true,
        enableRankMatchedBugDrop: true,
        bgmVolume: 0.5,
        seVolume: 0.7
      }
    };
  }

  window.InfinityGachaData = {
    STORAGE_KEY: STORAGE_KEY,
    LOG_LIMIT: LOG_LIMIT,
    GACHA_COST: GACHA_COST,
    RECOVERY_INTERVAL_MS: RECOVERY_INTERVAL_MS,
    LONG_PRESS_INTERVAL: LONG_PRESS_INTERVAL,
    AUTO_START_IDLE_TIME: AUTO_START_IDLE_TIME,
    AUTO_BASE_INTERVAL: AUTO_BASE_INTERVAL,
    AUTO_MIN_INTERVAL: AUTO_MIN_INTERVAL,
    BASE_STATS: BASE_STATS,
    CONVEX_BONUS_BY_RANK: CONVEX_BONUS_BY_RANK,
    LIMIT_BREAK_GROWTH_TIERS: LIMIT_BREAK_GROWTH_TIERS,
    LIMIT_BREAK_GROWTH_MODE: LIMIT_BREAK_GROWTH_MODE,
    STAT_DESCRIPTIONS: STAT_DESCRIPTIONS,
    DECOMPOSE_STONES: DECOMPOSE_STONES,
    BUG_DEFEAT_RATE_BONUS_INCREASE: BUG_DEFEAT_RATE_BONUS_INCREASE,
    BUG_DEFEAT_RATE_BONUS_CAP: BUG_DEFEAT_RATE_BONUS_CAP,
    BUG_RANK_RELIC_DROP_RATE: BUG_RANK_RELIC_DROP_RATE,
    BUG_LIMITED_RELIC_DROP: BUG_LIMITED_RELIC_DROP,
    ALTAR_EVENT_CONFIG: ALTAR_EVENT_CONFIG,
    ALTAR_EVENT_DEFINITIONS: ALTAR_EVENT_DEFINITIONS,
    ALTAR_EVENT_POOL: ALTAR_EVENT_POOL,
    ALTAR_EVENT_INDEX: ALTAR_EVENT_INDEX,
    DUNGEON_TYPES: DUNGEON_TYPES,
    GEM_REWARD_STONES: GEM_REWARD_STONES,
    SLIME_STAT_REWARD: SLIME_STAT_REWARD,
    N_SLIME_STATS: N_SLIME_STATS,
    INFINITY_SLIME_BASE_STATS: INFINITY_SLIME_BASE_STATS,
    ZERO_SLIME_BASE_STATS: ZERO_SLIME_BASE_STATS,
    ACHIEVEMENT_CATEGORIES: ACHIEVEMENT_CATEGORIES,
    ACHIEVEMENTS: ACHIEVEMENTS,
    ACHIEVEMENT_INDEX: ACHIEVEMENT_INDEX,
    BUG_ACHIEVEMENT_RANK_MULTIPLIER: BUG_ACHIEVEMENT_RANK_MULTIPLIER,
    BUG_ACHIEVEMENT_THRESHOLDS: BUG_ACHIEVEMENT_THRESHOLDS,
    GACHA_RANKS: GACHA_RANKS,
    RANK_ORDER: RANK_ORDER,
    TRACKED_RANKS: TRACKED_RANKS,
    PLAYER_RELIC_RANKS: PLAYER_RELIC_RANKS,
    BUG_RANKS: BUG_RANKS,
    BUG_RANKS_LIST: BUG_RANKS_LIST,
    BUG_RANK_INDEX: BUG_RANK_INDEX,
    RELICS: RELICS,
    RELIC_INDEX: RELIC_INDEX,
    RELIC_NAME_FALLBACKS: RELIC_NAME_FALLBACKS,
    getRelicDisplayName: getRelicDisplayName,
    createRankTotalObject: createRankTotalObject,
    createRankLimitBreakObject: createRankLimitBreakObject,
    createBugDefeatRateBonus: createBugDefeatRateBonus,
    createDefeatedBugCounts: createDefeatedBugCounts,
    createDungeonState: createDungeonState,
    createDungeonStatBonus: createDungeonStatBonus,
    createDungeonRecords: createDungeonRecords,
    createRebirthState: createRebirthState,
    createZeroRelicState: createZeroRelicState,
    createPermanentRelics: createPermanentRelics,
    createZeroSlimeRecords: createZeroSlimeRecords,
    getRankOrderIndex: getRankOrderIndex,
    isRankAtLeast: isRankAtLeast,
    createInitialState: createInitialState
  };
})();

