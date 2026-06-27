(function () {
  var data = window.InfinityGachaData;
  var effects = window.InfinityGachaEffects;

  var SLIME_RANK_SEQUENCE = ["N", "S", "SR", "SSR", "SSSR", "UR", "AR", "LR", "GR", "BR", "QR", "IR", "ER"];
  var DIMENSIONAL_GEM_RANKS = ["UR", "AR", "LR", "GR", "BR", "QR", "IR", "ER", "IF"];
  var DUNGEON_STAT_KEYS = ["hp", "attack", "defense", "speed", "luck"];
  var DUNGEON_ALL_BONUS_KEYS = ["hp", "attack", "defense", "speed", "luck", "accuracy", "evasionRate", "criticalRate", "criticalDamage"];

  function getDungeonConfig(type) {
    return data.DUNGEON_TYPES[type] || null;
  }

  function getDungeonEnterCount(state, type) {
    ensureDungeonCollections(state);
    if (type === "normal") {
      return state.dungeonRecords.enteredNormalDungeon || 0;
    }
    if (type === "golden") {
      return state.dungeonRecords.enteredGoldenDungeon || 0;
    }
    if (type === "dimensional") {
      return state.dungeonRecords.enteredDimensionalDungeon || 0;
    }
    if (type === "void") {
      return state.dungeonRecords.enteredVoidDungeon || 0;
    }
    return 0;
  }

  function getDungeonCost(state, type) {
    var config = getDungeonConfig(type);
    if (!config) {
      return 0;
    }
    return effects.applyShopDiscount(Math.floor(config.cost * Math.pow(2, getDungeonEnterCount(state, type))), state);
  }

  function ensureDungeonCollections(state) {
    if (!state.dungeonState) {
      state.dungeonState = data.createDungeonState();
    }
    if (!state.dungeonStatBonus) {
      state.dungeonStatBonus = data.createDungeonStatBonus();
    }
    if (!state.dungeonRecords) {
      state.dungeonRecords = data.createDungeonRecords();
    }
    if (!state.zeroSlimeRecords) {
      state.zeroSlimeRecords = data.createZeroSlimeRecords();
    }
    if (!state.permanentRelics) {
      state.permanentRelics = data.createPermanentRelics();
    }
    if (!state.zeroRelicState) {
      state.zeroRelicState = data.createZeroRelicState();
    }
  }

  function isInDungeon(state) {
    return Boolean(state && state.dungeonState && state.dungeonState.isInDungeon);
  }

  function getCurrentDungeonConfig(state) {
    return isInDungeon(state) ? getDungeonConfig(state.dungeonState.type) : null;
  }

  function formatDungeonTime(ms) {
    if (ms == null) {
      return "無制限";
    }
    var totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    return minutes + "分" + seconds + "秒";
  }

  function getRemainingTimeMs(state, now) {
    if (!isInDungeon(state) || !state.dungeonState.endsAt) {
      return null;
    }
    return Math.max(0, state.dungeonState.endsAt - (now || Date.now()));
  }

  function getDungeonStatusText(state) {
    if (!isInDungeon(state)) {
      return "未入場";
    }
    return state.dungeonState.name + " / " + formatDungeonTime(getRemainingTimeMs(state, Date.now()));
  }

  function enterDungeon(state, type) {
    ensureDungeonCollections(state);
    var config = getDungeonConfig(type);

    if (!config) {
      return { ok: false, logs: ["そのダンジョンは存在しません。"] };
    }
    if (state.isBattle) {
      return { ok: false, logs: ["戦闘中はダンジョンに入れません。"] };
    }
    if (isInDungeon(state)) {
      return { ok: false, logs: ["すでにダンジョンに入場しています。"] };
    }
    if (type === "void") {
      return enterVoidDungeon(state);
    }

    var cost = getDungeonCost(state, type);
    var baseCost = Math.floor(config.cost * Math.pow(2, getDungeonEnterCount(state, type)));
    if (state.stones < cost) {
      return { ok: false, logs: ["石が足りません。必要石：" + cost.toLocaleString("ja-JP")] };
    }

    state.stones -= cost;
    state.dungeonState = data.createDungeonState();
    state.dungeonState.isInDungeon = true;
    state.dungeonState.type = type;
    state.dungeonState.name = config.name;
    state.dungeonState.startedAt = Date.now();
    state.dungeonState.endsAt = config.durationMs ? (state.dungeonState.startedAt + config.durationMs) : null;
    state.dungeonState.isInfiniteDungeon = config.isInfinite === true;

    if (type === "normal") {
      state.dungeonRecords.enteredNormalDungeon += 1;
    } else if (type === "golden") {
      state.dungeonRecords.enteredGoldenDungeon += 1;
    } else if (type === "dimensional") {
      state.dungeonRecords.enteredDimensionalDungeon += 1;
    }

    return {
      ok: true,
      logs: (cost < baseCost ? ["SSR割引の遺物により、価格が" + Math.round(effects.calculateShopDiscountRate(state) * 100) + "%減少した。"] : []).concat(config.altarLogs.slice())
    };
  }

  function exitDungeon(state, reason) {
    ensureDungeonCollections(state);
    if (!isInDungeon(state)) {
      return [];
    }

    var config = getCurrentDungeonConfig(state);
    var logs = [];

    if (Array.isArray(reason)) {
      logs = reason.slice();
    } else if (reason === "timeout" && config && Array.isArray(config.exitLogs)) {
      logs = config.exitLogs.slice();
    } else if (reason === "defeat" && config && config.key === "dimensional") {
      logs = config.exitLogs.slice();
    } else if (typeof reason === "string" && reason) {
      logs = [reason];
    }

    state.dungeonState = data.createDungeonState();
    state.pendingBugRank = null;
    state.pendingBugSourceRank = null;
    state.isBattle = false;
    state.battleState = null;
    if (state.voidDungeonState) {
      state.voidDungeonState.isInVoidDungeon = false;
      state.voidDungeonState.endedAt = Date.now();
    }
    return logs;
  }

  function ensureVoidDungeonCollections(state) {
    ensureDungeonCollections(state);
    if (!state.voidDungeonState) {
      state.voidDungeonState = data.createVoidDungeonState();
    }
    if (!state.voidSlimeRecords) {
      state.voidSlimeRecords = data.createVoidSlimeRecords();
    }
    if (!state.randomGodRecords) {
      state.randomGodRecords = data.createRandomGodRecords();
    }
  }

  function canEnterVoidDungeon(state) {
    var relic = state.ownedRelics && state.ownedRelics[data.VOID_DUNGEON_CONFIG.requiredRelicId];
    if (!relic) {
      return { ok: false, reason: "ER虚無の遺物を所持していません。" };
    }
    return { ok: true, warning: relic.enabled === false ? "ER虚無の遺物がOFFです。侵食を防げません。" : "" };
  }

  function getVoidSlimeRankByBattleIndex(index) {
    return data.VOID_SLIME_RANK_ORDER[Math.max(0, index - 1)] || "ER";
  }

  function getVoidSlimeStats(rank) {
    var base = data.BUG_RANK_INDEX["∞"];
    var multiplier = data.VOID_SLIME_RANK_MULTIPLIER[rank] || 1;
    return {
      rank: rank,
      name: rank + "虚無スライム",
      hp: Math.max(1, Math.floor(base.hp * multiplier)),
      attack: Math.max(1, Math.floor(base.attack * multiplier)),
      defense: Math.max(1, Math.floor(base.defense * multiplier)),
      speed: Math.max(1, Math.floor(base.speed * multiplier)),
      isBoss: true,
      isVoidSlimeBattle: true
    };
  }

  function startVoidSlimeBattle(state, rank) {
    var battleModule = window.InfinityGachaBattle;
    var enemy = getVoidSlimeStats(rank);
    state.voidSlimeRecords.encounters += 1;
    return battleModule.startBattle(state, {
      rank: enemy.rank,
      name: enemy.name,
      hp: enemy.hp,
      attack: enemy.attack,
      defense: enemy.defense,
      speed: enemy.speed,
      rewardMin: 0,
      rewardMax: 0,
      isBoss: true,
      isVoidBattle: true,
      isVoidSlimeBattle: true,
      hideStats: false
    });
  }

  function startRandomGodBattle(state) {
    var battleModule = window.InfinityGachaBattle;
    state.randomGodRecords.encounters += 1;
    return battleModule.startBattle(state, {
      rank: data.RANDOM_GOD.rank,
      name: data.RANDOM_GOD.name,
      hp: data.RANDOM_GOD.hp,
      attack: data.RANDOM_GOD.attack,
      defense: data.RANDOM_GOD.defense,
      speed: data.RANDOM_GOD.speed,
      rewardMin: 0,
      rewardMax: 0,
      isBoss: true,
      isVoidBattle: true,
      isRandomGodBattle: true,
      hideStats: false
    });
  }

  function startNextVoidDungeonBattle(state) {
    ensureVoidDungeonCollections(state);
    if (!state.voidDungeonState.isInVoidDungeon) {
      return { ok: false, logs: ["虚無のダンジョンに入っていません。"] };
    }
    var index = state.voidDungeonState.currentBattleIndex;
    var logs = [index + "戦目。"];
    var outcome;
    if (index >= data.VOID_DUNGEON_CONFIG.maxBattleCount) {
      logs.push("乱数の神が現れた。");
      logs.push("この戦闘では、次に何が起こるか誰にも分からない。");
      outcome = startRandomGodBattle(state);
    } else {
      var rank = getVoidSlimeRankByBattleIndex(index);
      logs.push(rank + "虚無スライムが現れた。");
      if (rank === "ER") {
        logs.push("虚無の濃度が限界に近づいている。");
      }
      outcome = startVoidSlimeBattle(state, rank);
    }
    return { ok: true, logs: logs.concat((outcome && outcome.logs) || []) };
  }

  function enterVoidDungeon(state) {
    ensureVoidDungeonCollections(state);
    var enterCheck = canEnterVoidDungeon(state);
    if (!enterCheck.ok) {
      return { ok: false, logs: [enterCheck.reason] };
    }
    state.dungeonState = data.createDungeonState();
    state.dungeonState.isInDungeon = true;
    state.dungeonState.type = "void";
    state.dungeonState.name = data.DUNGEON_TYPES.void.name;
    state.dungeonState.startedAt = Date.now();
    state.dungeonState.isInfiniteDungeon = true;
    state.dungeonState.isVoidDungeon = true;
    state.dungeonState.currentBattleIndex = 1;
    state.dungeonState.maxBattleCount = data.VOID_DUNGEON_CONFIG.maxBattleCount;
    state.voidDungeonState = data.createVoidDungeonState();
    state.voidDungeonState.isInVoidDungeon = true;
    state.voidDungeonState.currentBattleIndex = 1;
    state.voidDungeonState.startedAt = Date.now();
    state.dungeonRecords.enteredVoidDungeon += 1;
    state.specialFlags.voidDungeonEntered = true;
    var logs = data.DUNGEON_TYPES.void.altarLogs.slice();
    if (enterCheck.warning) {
      logs.push(enterCheck.warning);
    }
    var battleOutcome = startNextVoidDungeonBattle(state);
    Array.prototype.push.apply(logs, battleOutcome.logs || []);
    return { ok: true, logs: logs };
  }

  function finishVoidDungeonBattleWin(state, battleState) {
    ensureVoidDungeonCollections(state);
    var logs = [];
    if (battleState.isRandomGodBattle) {
      state.randomGodRecords.defeats += 1;
      if (state.randomGodRecords.firstDefeatedAt == null) {
        state.randomGodRecords.firstDefeatedAt = Date.now();
      }
      state.dungeonRecords.completedVoidDungeon += 1;
      state.voidDungeonState.isInVoidDungeon = false;
      state.voidDungeonState.isCompleted = true;
      state.voidDungeonState.endedAt = Date.now();
      state.dungeonState = data.createDungeonState();
      logs.push("乱数の神を撃破した。");
      logs.push("確率は、ついに操作される側になった。");
      logs.push("虚無のダンジョンを踏破しました。");
      return logs;
    }
    state.voidSlimeRecords.defeats += 1;
    state.voidSlimeRecords.defeatByRank[battleState.bugRank] = (state.voidSlimeRecords.defeatByRank[battleState.bugRank] || 0) + 1;
    state.voidDungeonState.defeatedCount += 1;
    state.voidDungeonState.currentBattleIndex += 1;
    state.dungeonState.currentBattleIndex = state.voidDungeonState.currentBattleIndex;
    state.dungeonState.defeatedCount = state.voidDungeonState.defeatedCount;
    logs.push(battleState.bugName + "を撃破した。");
    logs.push("次の虚無が現れる。");
    var nextOutcome = startNextVoidDungeonBattle(state);
    Array.prototype.push.apply(logs, nextOutcome.logs || []);
    return logs;
  }

  function finishVoidDungeonLose(state) {
    ensureVoidDungeonCollections(state);
    state.dungeonRecords.failedVoidDungeon += 1;
    state.specialFlags.voidDungeonFailed = true;
    state.voidDungeonState.isInVoidDungeon = false;
    state.voidDungeonState.endedAt = Date.now();
    state.dungeonState = data.createDungeonState();
    return [
      "虚無のダンジョンで敗北した。",
      "戦闘は終了した。",
      "削られたステータスは戻らない。"
    ];
  }

  function checkDungeonTime(state) {
    ensureDungeonCollections(state);
    if (!isInDungeon(state) || !state.dungeonState.endsAt) {
      return [];
    }
    if (Date.now() < state.dungeonState.endsAt) {
      return [];
    }
    return exitDungeon(state, "timeout");
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function rollWeightedRank(rows) {
    var total = rows.reduce(function (sum, row) {
      return sum + Math.max(0, row.weight);
    }, 0);
    if (total <= 0) {
      return null;
    }

    var roll = Math.random() * total;
    var current = 0;
    for (var i = 0; i < rows.length; i += 1) {
      current += Math.max(0, rows[i].weight);
      if (roll < current) {
        return rows[i].rank;
      }
    }

    return rows[rows.length - 1].rank;
  }

  function getGemRowsForDungeon(state, dungeonType) {
    var rows = effects.calculateRateModifiers(state).rows.map(function (row) {
      return { rank: row.rank, weight: Math.max(0, row.final) };
    });
    var ifUnlocked = effects.calculateIfInfo(state).drawEnabled;

    if (dungeonType === "normal") {
      return rows;
    }

    if (dungeonType === "golden") {
      return rows.filter(function (row) {
        return row.rank !== "IF";
      }).map(function (row) {
        return { rank: row.rank, weight: Math.max(0.0001, row.weight) };
      });
    }

    return DIMENSIONAL_GEM_RANKS.filter(function (rank) {
      return rank !== "IF" || ifUnlocked;
    }).map(function (rank) {
      var row = rows.find(function (item) { return item.rank === rank; });
      var weight = row ? row.weight : 0;
      return {
        rank: rank,
        weight: Math.max(0.0001, weight * (state.dungeonState.dungeonRateBonus || 1))
      };
    });
  }

  function rollGemRank(dungeonType, state) {
    var rows = getGemRowsForDungeon(state, dungeonType);
    if (dungeonType === "normal") {
      var missRate = Math.max(0, effects.calculateRateModifiers(state).missRate);
      var total = rows.reduce(function (sum, row) {
        return sum + row.weight;
      }, 0);
      var roll = Math.random() * (total + missRate);
      if (roll >= total) {
        return "STONE";
      }
    }
    return rollWeightedRank(rows) || "STONE";
  }

  function gainGemReward(state, rank) {
    var config = getCurrentDungeonConfig(state);
    var reward = data.GEM_REWARD_STONES[rank] || 0;
    reward = Math.floor(reward * (config ? config.gemRewardMultiplier : 1) * effects.calculateStoneGainMultiplier(state).multiplier);
    state.stones += reward;
    state.dungeonRecords.totalGemCount += 1;
    return reward;
  }

  function rollSlimeSpawn(state) {
    var config = getCurrentDungeonConfig(state);
    if (!config) {
      return false;
    }
    var extraRate = effects.calculateBugSpawnRate(state) - 10;
    var bonusRate = config.key === "dimensional" ? ((state.dungeonState.dungeonRateBonus - 1) * 10) : 0;
    var spawnRate = Math.max(0, Math.min(100, config.slimeSpawnRate + extraRate + bonusRate));
    return Math.random() * 100 < spawnRate;
  }

  function shouldSpawnInfinitySlime(state) {
    return isInDungeon(state) &&
      state.dungeonState.type === "dimensional" &&
      !shouldSpawnZeroSlime(state) &&
      (((state.dungeonState.currentDungeonSlimeDefeatCount || 0) + 1) % 100 === 0);
  }

  function shouldSpawnZeroSlime(state) {
    return isInDungeon(state) &&
      state.dungeonState.type === "dimensional" &&
      (((state.dungeonState.currentDungeonSlimeDefeatCount || 0) + 1) % 1000 === 0);
  }

  function getInfinityScale(state) {
    return Math.max(0.1, 1 - ((state.infinityCount || 0) * 0.3));
  }

  function getInfinitySlimeStats(state) {
    var scale = getInfinityScale(state);
    return {
      rank: "∞",
      name: "∞スライム",
      hp: Math.max(1, Math.floor(data.INFINITY_SLIME_BASE_STATS.hp * scale)),
      attack: Math.max(1, Math.floor(data.INFINITY_SLIME_BASE_STATS.attack * scale)),
      defense: Math.max(0, Math.floor(data.INFINITY_SLIME_BASE_STATS.defense * scale)),
      speed: Math.max(1, Math.floor(data.INFINITY_SLIME_BASE_STATS.speed * scale)),
      isInfinitySlime: true,
      isBoss: true
    };
  }

  function getZeroSlimeStats(state) {
    var infinityScale = getInfinityScale(state);
    var zeroLimitBreak = state.zeroRelicState ? (state.zeroRelicState.limitBreak || 0) : 0;
    var zeroScale = Math.max(0.1, 1 - (zeroLimitBreak * 0.05));
    var scale = infinityScale * zeroScale;
    return {
      rank: "0",
      name: "0スライム",
      hp: Math.max(1, Math.floor(data.ZERO_SLIME_BASE_STATS.hp * scale)),
      attack: Math.max(1, Math.floor(data.ZERO_SLIME_BASE_STATS.attack * scale)),
      defense: Math.max(0, Math.floor(data.ZERO_SLIME_BASE_STATS.defense * scale)),
      speed: Math.max(1, Math.floor(data.ZERO_SLIME_BASE_STATS.speed * scale)),
      isZeroSlime: true,
      isBoss: true
    };
  }

  function canDamageInfinitySlime(state) {
    return Boolean(state.ownedRelics && state.ownedRelics.if_infinity);
  }

  function selectSlimeRank(state) {
    var unlocked = state.dungeonState.unlockedSlimeRanks || ["N"];
    return unlocked[Math.floor(Math.random() * unlocked.length)] || "N";
  }

  function getSlimeStats(rank) {
    if (rank === "N") {
      return Object.assign({}, data.N_SLIME_STATS);
    }
    var bug = data.BUG_RANK_INDEX[rank];
    return bug ? {
      rank: rank,
      name: rank + "スライム",
      hp: bug.hp,
      attack: bug.attack,
      defense: bug.defense,
      speed: bug.speed
    } : Object.assign({}, data.N_SLIME_STATS);
  }

  function startSlimeBattle(state, rank) {
    var battle = window.InfinityGachaBattle;
    var config = getCurrentDungeonConfig(state);
    if (!battle || !config) {
      return { ok: false, logs: [] };
    }

    var enemyStats = rank === "∞" ? getInfinitySlimeStats(state) : (rank === "0" ? getZeroSlimeStats(state) : getSlimeStats(rank));
    var enemyName = rank === "∞" ? "∞スライム" : (rank === "0" ? "0スライム" : ((config.slimePrefix || "") + rank + "スライム"));
    var beforeLogs = rank === "0"
      ? ["異次元の奥で、数値が消えた。", "1000戦目。", "0スライムが現れた。", "それは、無限よりも前にあるものだった。"]
      : ["地面が揺れた。", enemyName + "が現れた。", "ログ形式を戦闘モードに変更。"];

    var outcome = battle.startBattle(state, {
      rank: enemyStats.rank,
      name: enemyName,
      hp: enemyStats.hp,
      attack: enemyStats.attack,
      defense: enemyStats.defense,
      speed: enemyStats.speed,
      isBoss: enemyStats.isBoss === true || SLIME_RANK_SEQUENCE.indexOf(rank) >= 4,
      isSlimeBattle: true,
      isInfinitySlime: rank === "∞",
      isZeroSlime: rank === "0",
      hideStats: rank === "∞" && !canDamageInfinitySlime(state)
    });

    if (rank === "∞") {
      state.dungeonRecords.totalInfinitySlimeEncounters += 1;
    }
    if (rank === "0") {
      state.dungeonRecords.totalZeroSlimeEncounters += 1;
      state.zeroSlimeRecords.totalEncounters += 1;
    }

    return { ok: true, logs: beforeLogs.concat((outcome && outcome.logs) || []) };
  }

  function unlockNextSlimeRank(state, rank) {
    var index = SLIME_RANK_SEQUENCE.indexOf(rank);
    if (index === -1 || index >= SLIME_RANK_SEQUENCE.length - 1) {
      return null;
    }
    var nextRank = SLIME_RANK_SEQUENCE[index + 1];
    if (state.dungeonState.unlockedSlimeRanks.indexOf(nextRank) === -1) {
      state.dungeonState.unlockedSlimeRanks.push(nextRank);
      return nextRank;
    }
    return null;
  }

  function getSlimeRewardMultiplier(state) {
    var config = getCurrentDungeonConfig(state);
    return config ? config.slimeRewardMultiplier : 1;
  }

  function applySlimeStatReward(state, rank) {
    ensureDungeonCollections(state);
    if (rank === "∞") {
      var infinityAmount = 10000 * effects.getSlimeGrowthMultiplier(state);
      DUNGEON_STAT_KEYS.forEach(function (key) {
        state.dungeonStatBonus[key] += infinityAmount;
      });
      return { statKey: "all", amount: infinityAmount };
    }
    if (rank === "0") {
      var zeroAmount = 100000 * effects.getSlimeGrowthMultiplier(state);
      DUNGEON_ALL_BONUS_KEYS.forEach(function (key) {
        state.dungeonStatBonus[key] += zeroAmount;
      });
      return { statKey: "all", amount: zeroAmount };
    }

    var key = DUNGEON_STAT_KEYS[Math.floor(Math.random() * DUNGEON_STAT_KEYS.length)];
    var base = data.SLIME_STAT_REWARD[rank] || 1;
    var amount = base * getSlimeRewardMultiplier(state) * effects.getSlimeGrowthMultiplier(state);
    state.dungeonStatBonus[key] += amount;
    return { statKey: key, amount: amount };
  }

  function statLabel(key) {
    return {
      hp: "HP",
      attack: "攻撃",
      defense: "防御",
      speed: "速度",
      luck: "運",
      all: "全ステータス"
    }[key] || key;
  }

  function finishSlimeWin(state, battleState) {
    ensureDungeonCollections(state);
    var rank = battleState.bugRank;
    var config = getCurrentDungeonConfig(state);
    var reward = applySlimeStatReward(state, rank);
    var logs = [];
    var prefix = (config && config.slimePrefix) || "";

    state.dungeonState.slimeDefeatCount += 1;
    state.dungeonState.currentDungeonSlimeDefeatCount += 1;
    state.dungeonRecords.totalSlimeDefeats += 1;
    if (rank !== "∞" && (!state.dungeonState.highestDefeatedSlimeRank || data.isRankAtLeast(rank, state.dungeonState.highestDefeatedSlimeRank))) {
      state.dungeonState.highestDefeatedSlimeRank = rank;
    }

    if (rank === "∞") {
      state.dungeonRecords.totalInfinitySlimeDefeats += 1;
      state.stones += 100000000;
      logs.push("∞スライムを撃破した。");
      logs.push("存在しない核が砕けた。");
      logs.push("全ステータスが10,000上昇した。");
      logs.push("石を100,000,000個獲得。");
      logs.push("ダンジョンの奥で、無限が一度だけ笑った。");
      return logs;
    }

    if (rank === "0") {
      state.dungeonRecords.totalZeroSlimeDefeats += 1;
      state.zeroSlimeRecords.totalDefeats += 1;
      if (!state.zeroSlimeRecords.firstDefeatedAt) {
        state.zeroSlimeRecords.firstDefeatedAt = Date.now();
      }
      state.specialLogUnlocked = true;
      state.stones += 1000000000;
      if (!state.permanentRelics.infinity_slime_relic.owned) {
        state.permanentRelics.infinity_slime_relic.owned = true;
        state.permanentRelics.infinity_slime_relic.enabled = true;
      }
      if (state.discoveredRelics.indexOf("infinity_slime_relic") === -1) {
        state.discoveredRelics.push("infinity_slime_relic");
      }
      logs.push("0スライムを撃破した。");
      logs.push("存在しない核が砕けた。");
      logs.push("あなたは、スライム神に到達した。");
      logs.push("実績「スライム神」を解除。");
      logs.push("スライムの遺物を獲得した。");
      logs.push("全ステータスが" + reward.amount.toLocaleString("ja-JP") + "上昇した。");
      logs.push("石を1,000,000,000個獲得。");
      return logs;
    }

    logs.push(prefix + rank + "スライムを撃破した。");
    logs.push((config && config.key === "golden") ? "黄金の核が砕けた。" : ((config && config.key === "dimensional") ? "存在しない核が砕けた。" : "スライムの核が砕けた。"));
    if (effects.getSlimeGrowthMultiplier(state) > 1) {
      logs.push("スライムの遺物が輝いた。");
      logs.push("スライム成長報酬が2倍になった。");
    }
    logs.push(statLabel(reward.statKey) + "が" + reward.amount.toLocaleString("ja-JP") + "上昇した。");

    var nextRank = unlockNextSlimeRank(state, rank);
    if (nextRank) {
      logs.push(nextRank + "スライムが出現するようになった。");
    }

    return logs;
  }

  function finishSlimeLose(state) {
    var logs = [];
    if (isInDungeon(state) && state.dungeonState.type === "dimensional") {
      Array.prototype.push.apply(logs, exitDungeon(state, "defeat"));
    }
    return logs;
  }

  function mineDungeon(state) {
    ensureDungeonCollections(state);
    if (!isInDungeon(state)) {
      return { ok: false, logs: ["ダンジョンに入っていません。"] };
    }
    if (state.dungeonState.type === "void") {
      return { ok: false, logs: ["虚無のダンジョンでは採掘できません。"] };
    }

    var config = getCurrentDungeonConfig(state);
    var logs = [config.minePrefix];
    var result = rollGemRank(config.key, state);

    state.dungeonState.miningCount += 1;
    state.dungeonRecords.totalMiningCount += 1;

    if (result === "STONE") {
      var stoneGain = Math.floor(randomInt(1, 5) * effects.calculateStoneGainMultiplier(state).multiplier);
      state.stones += stoneGain;
      logs.push("石を" + stoneGain.toLocaleString("ja-JP") + "個獲得。");
    } else {
      var reward = gainGemReward(state, result);
      logs.push(result + "宝石を掘り当てた。");
      logs.push("石を" + reward.toLocaleString("ja-JP") + "個獲得。");
      if (config.key === "dimensional") {
        state.dungeonState.dungeonRateBonus = Math.round((state.dungeonState.dungeonRateBonus + 0.01) * 100) / 100;
        logs.push("異次元の採掘により、確率が上昇した。");
        logs.push("現在の異次元確率倍率：" + state.dungeonState.dungeonRateBonus.toFixed(2) + "倍");
      }
    }

    if (rollSlimeSpawn(state)) {
      var slimeRank = shouldSpawnZeroSlime(state) ? "0" : (shouldSpawnInfinitySlime(state) ? "∞" : selectSlimeRank(state));
      var battleOutcome = startSlimeBattle(state, slimeRank);
      Array.prototype.push.apply(logs, battleOutcome.logs || []);
    }

    return { ok: true, logs: logs };
  }

  function renderDungeonStatus(state) {
    if (!isInDungeon(state)) {
      return "";
    }

    if (state.dungeonState.type === "void") {
      return '<div class="box-block"><h3>虚無のダンジョン</h3><div class="detail-grid">' +
        '<span class="detail-label">進行</span><span class="detail-value">' + state.voidDungeonState.currentBattleIndex + ' / ' + state.voidDungeonState.maxBattleCount + '</span>' +
        '<span class="detail-label">撃破数</span><span class="detail-value">' + state.voidDungeonState.defeatedCount + '</span>' +
        '<span class="detail-label">状態</span><span class="detail-value">戦闘のみ</span>' +
        '<span class="detail-label">採掘</span><span class="detail-value">不可</span>' +
        '</div></div>';
    }

    var remaining = state.dungeonState.endsAt ? formatDungeonTime(getRemainingTimeMs(state, Date.now())) : "戦闘敗北まで";
    var slimeRanks = (state.dungeonState.unlockedSlimeRanks || ["N"]).join(" / ");
    return '<div class="box-block"><h3>ダンジョン状況</h3><div class="detail-grid">' +
      '<span class="detail-label">ダンジョン名</span><span class="detail-value">' + state.dungeonState.name + '</span>' +
      '<span class="detail-label">残り時間</span><span class="detail-value">' + remaining + '</span>' +
      '<span class="detail-label">採掘回数</span><span class="detail-value">' + state.dungeonState.miningCount + '</span>' +
      '<span class="detail-label">撃破スライム数</span><span class="detail-value">' + state.dungeonState.slimeDefeatCount + '</span>' +
      '<span class="detail-label">解放済みスライム</span><span class="detail-value">' + slimeRanks + '</span>' +
      '<span class="detail-label">最高撃破ランク</span><span class="detail-value">' + (state.dungeonState.highestDefeatedSlimeRank || "なし") + '</span>' +
      '<span class="detail-label">ダンジョン補正</span><span class="detail-value">' + (state.dungeonState.dungeonRateBonus || 1).toFixed(2) + '倍</span>' +
      '</div></div>';
  }

  window.InfinityGachaDungeon = {
    isInDungeon: isInDungeon,
    getCurrentDungeonConfig: getCurrentDungeonConfig,
    getDungeonCost: getDungeonCost,
    getDungeonEnterCount: getDungeonEnterCount,
    getRemainingTimeMs: getRemainingTimeMs,
    getDungeonStatusText: getDungeonStatusText,
    enterDungeon: enterDungeon,
    exitDungeon: exitDungeon,
    checkDungeonTime: checkDungeonTime,
    mineDungeon: mineDungeon,
    rollGemRank: rollGemRank,
    gainGemReward: gainGemReward,
    rollSlimeSpawn: rollSlimeSpawn,
    startSlimeBattle: startSlimeBattle,
    selectSlimeRank: selectSlimeRank,
    unlockNextSlimeRank: unlockNextSlimeRank,
    finishSlimeWin: finishSlimeWin,
    finishSlimeLose: finishSlimeLose,
    applySlimeStatReward: applySlimeStatReward,
    getSlimeStats: getSlimeStats,
    shouldSpawnInfinitySlime: shouldSpawnInfinitySlime,
    shouldSpawnZeroSlime: shouldSpawnZeroSlime,
    getInfinitySlimeStats: getInfinitySlimeStats,
    getZeroSlimeStats: getZeroSlimeStats,
    canEnterVoidDungeon: canEnterVoidDungeon,
    enterVoidDungeon: enterVoidDungeon,
    startNextVoidDungeonBattle: startNextVoidDungeonBattle,
    startVoidSlimeBattle: startVoidSlimeBattle,
    startRandomGodBattle: startRandomGodBattle,
    finishVoidDungeonBattleWin: finishVoidDungeonBattleWin,
    finishVoidDungeonLose: finishVoidDungeonLose,
    getVoidSlimeRankByBattleIndex: getVoidSlimeRankByBattleIndex,
    getVoidSlimeStats: getVoidSlimeStats,
    canDamageInfinitySlime: canDamageInfinitySlime,
    renderDungeonStatus: renderDungeonStatus,
    formatDungeonTime: formatDungeonTime
  };
})();
