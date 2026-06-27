(function () {
  var data = window.InfinityGachaData;
  var effects = window.InfinityGachaEffects;
  var engine = window.InfinityGachaEngine;

  function looksMojibake(text) {
    return /c，o|c1§|e??|e?3|e?a|e??|ec?|e°o|e??|e??|e?3|e??|e?´|e￢?|縺|繧|蛟|螳/.test(String(text || ""));
  }

  function displayBugName(bug) {
    if (!bug) {
      return "バグ";
    }
    return looksMojibake(bug.name) ? (bug.rank + "バグ") : bug.name;
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function getBugConfig(rank) {
    return data.BUG_RANK_INDEX[rank] || null;
  }

  function getDungeon() {
    return window.InfinityGachaDungeon;
  }

  function createEnemyConfig(configOrRank) {
    if (typeof configOrRank === "object") {
      return Object.assign({}, configOrRank);
    }

    var bug = getBugConfig(configOrRank);
    return {
      rank: configOrRank,
      name: displayBugName(bug || { rank: configOrRank, name: configOrRank + "バグ" }),
      hp: bug.hp,
      attack: bug.attack,
      defense: bug.defense,
      speed: bug.speed,
      rewardMin: bug.rewardMin,
      rewardMax: bug.rewardMax,
      isBoss: ["SSSR", "UR", "AR", "LR", "GR", "BR", "QR", "IR", "ER", "∞"].indexOf(configOrRank) !== -1,
      isSlimeBattle: false,
      isInfinitySlime: false,
      isVoidBattle: false,
      hideStats: false
    };
  }

  function getBugRankOrder() {
    return data.BUG_RANKS.map(function (bug) {
      return bug.rank;
    });
  }

  function getHighestUnlockedRank(state) {
    var unlocked = Array.isArray(state.unlockedBugRanks) && state.unlockedBugRanks.length ? state.unlockedBugRanks : ["S"];
    var highestRank = unlocked[0];

    unlocked.forEach(function (rank) {
      if (data.getRankOrderIndex(rank) < data.getRankOrderIndex(highestRank)) {
        highestRank = rank;
      }
    });

    return highestRank;
  }

  function getRaisedBugRank(state, baseRank, modifier, allowPastUnlock) {
    var order = getBugRankOrder();
    var startIndex = order.indexOf(baseRank);
    if (startIndex === -1 || modifier <= 0) {
      return baseRank;
    }

    var targetIndex = Math.min(order.length - 1, startIndex + modifier);

    if (!allowPastUnlock) {
      var highestUnlockedRank = getHighestUnlockedRank(state);
      var highestUnlockedIndex = order.indexOf(highestUnlockedRank);
      if (highestUnlockedIndex !== -1) {
        targetIndex = Math.min(targetIndex, highestUnlockedIndex);
      }
    }

    return order[targetIndex];
  }

  function getBonusBugRelicDropRate(state) {
    var rate = 0;
    effects.getOwnedRelicsByEnabled(state, true).forEach(function (view) {
      view.effectValues.forEach(function (effectInfo) {
        if (effectInfo.phase <= 7 && effectInfo.effectType === "special" && effectInfo.target === "bonus_bug_relic_drop") {
          rate += effectInfo.currentValue;
        }
      });
    });
    return rate;
  }

  function getLimitedRelicIdByBugRank(rank) {
    if (rank === "QR") {
      return "qr_deep_bug_slayer";
    }
    if (rank === "IR") {
      return "ir_abyss_bug_slayer";
    }
    if (rank === "ER") {
      return "er_infinity_gate";
    }
    return null;
  }

  function isInfinityBugUnlocked(state) {
    return Boolean(
      state.infinityBugUnlocked === true ||
      (state.ownedRelics && state.ownedRelics.er_infinity_gate) ||
      state.ifUnlocked === true ||
      state.observedIfProbability === true
    );
  }

  function updateHighestObservedRank(state, rank) {
    if (!state.highestObservedRank || data.isRankAtLeast(rank, state.highestObservedRank)) {
      state.highestObservedRank = rank;
    }
  }

  function createBattleState(config, battleStats) {
    var playerMaxHp = Math.max(1, Math.floor(battleStats.playerStats.hp));
    var healed = Math.floor(battleStats.startHealFlat) + Math.floor(playerMaxHp * battleStats.startHealPercent);

    return {
      bugRank: config.rank,
      bugName: config.name,
      bugHp: config.hp,
      bugMaxHp: config.hp,
      bugAttack: config.attack,
      bugDefense: config.defense,
      bugSpeed: config.speed,
      playerHp: Math.min(playerMaxHp, playerMaxHp + healed),
      playerMaxHp: playerMaxHp,
      turn: 1,
      logs: [config.name + "が出現した。"],
      isBoss: config.isBoss === true,
      isSlimeBattle: config.isSlimeBattle === true,
      isInfinitySlime: config.isInfinitySlime === true,
      isVoidBattle: config.isVoidBattle === true,
      isVoidSlimeBattle: config.isVoidSlimeBattle === true,
      isRandomGodBattle: config.isRandomGodBattle === true,
      hideStats: config.hideStats === true,
      rewardMin: config.rewardMin || 0,
      rewardMax: config.rewardMax || 0,
      voidActionCount: 0,
      playerActionCount: 0
    };
  }

  function pickWeightedAction(actions) {
    var total = actions.reduce(function (sum, action) {
      return sum + action.weight;
    }, 0);
    var roll = Math.random() * total;
    var current = 0;
    for (var i = 0; i < actions.length; i += 1) {
      current += actions[i].weight;
      if (roll < current) {
        return actions[i];
      }
    }
    return actions[actions.length - 1];
  }

  function grantRandomRelic(state, logs) {
    if (!state.permanentRelics) {
      state.permanentRelics = data.createPermanentRelics();
    }
    if (!state.randomRelicState) {
      state.randomRelicState = data.createRandomRelicState();
    }
    if (!state.permanentRelics.if_random_relic.owned) {
      state.permanentRelics.if_random_relic.owned = true;
      state.permanentRelics.if_random_relic.enabled = true;
      state.randomRelicState.owned = true;
      state.randomRelicState.enabled = true;
      if (state.discoveredRelics.indexOf("if_random_relic") === -1) {
        state.discoveredRelics.push("if_random_relic");
      }
      logs.push("IF乱数の遺物を獲得。");
      return;
    }
    state.randomRelicState.owned = true;
    state.randomRelicState.enabled = true;
    logs.push("IF乱数の遺物はすでに所持している。");
  }

  function applyVoidLikeEnemyTurn(state, battleState, battleStats) {
    state.voidBattleState.voidActionCount += 1;
    battleState.voidActionCount = state.voidBattleState.voidActionCount;
    if (battleState.voidActionCount % data.VOID_BOSS.healEvery === 0) {
      var healAmount = Math.floor(battleState.bugMaxHp * data.VOID_BOSS.healRate);
      battleState.bugHp = Math.min(battleState.bugMaxHp, battleState.bugHp + healAmount);
      addBattleLog(state, battleState.isVoidSlimeBattle ? battleState.bugName + "が欠落を埋めた。" : "虚無が、自身の欠落を埋めた。");
      addBattleLog(state, (battleState.isVoidSlimeBattle ? battleState.bugName : "虚無") + "のHPが大幅に回復した。");
    }
    if (battleState.voidActionCount % data.VOID_BOSS.specialStatLossEvery === 0) {
      var losses = effects.calculateVoidStatLoss(state, battleStats.playerStats);
      effects.reduceVoidStatLoss(state, losses);
      state.specialFlags.voidStatLossTaken = true;
      addBattleLog(state, battleState.bugName + "の攻撃が、存在を削った。");
      if (state.ownedRelics && state.ownedRelics.er_void_relic && state.ownedRelics.er_void_relic.enabled !== false) {
        addBattleLog(state, "ER虚無の遺物が侵食を抑え込んだ。");
        addBattleLog(state, "全ステータスの減少は1になった。");
      } else {
        addBattleLog(state, "全ステータスが大幅に減少した。");
        addBattleLog(state, "減少したステータスは戦闘終了後も戻りません。");
      }
      battleState.turn += 1;
      return true;
    }
    return false;
  }

  function executeRandomGodAction(state, battleState) {
    var action = pickWeightedAction(data.RANDOM_GOD_ACTIONS);
    var battleStats = effects.calculateBattleStats(state);
    state.voidBattleState.randomGodActionCount += 1;
    if (action.id === "blessing") {
      addBattleLog(state, "乱数の神は、乱数の洗礼を放った。");
      return false;
    }
    if (action.id === "breath") {
      battleState.bugHp = battleState.bugMaxHp;
      addBattleLog(state, "乱数の神は、乱数の息吹を吐いた。");
      addBattleLog(state, "乱数の神のHPが全回復した。");
      return true;
    }
    if (action.id === "rage") {
      battleState.playerHp = Math.max(1, Math.floor(battleState.playerHp / 2));
      addBattleLog(state, "乱数の神は怒った。");
      addBattleLog(state, "プレイヤーのHPが半分になった。");
      return true;
    }
    if (action.id === "smile") {
      battleState.playerHp = battleState.playerMaxHp;
      addBattleLog(state, "乱数の神が微笑んだ。");
      addBattleLog(state, "なぜか、プレイヤーのHPが全回復した。");
      return true;
    }
    if (action.id === "power") {
      battleState.bugAttack = Math.floor(battleState.bugAttack * 1.1);
      battleState.bugDefense = Math.floor(battleState.bugDefense * 1.1);
      battleState.bugSpeed = Math.floor(battleState.bugSpeed * 1.1);
      battleState.bugMaxHp = Math.floor(battleState.bugMaxHp * 1.1);
      battleState.bugHp = Math.min(battleState.bugMaxHp, Math.floor(battleState.bugHp * 1.1));
      addBattleLog(state, "乱数の神の力が増した。");
      addBattleLog(state, "全ステータスが上昇した。");
      return true;
    }
    if (action.id === "weakness") {
      var losses = effects.calculateVoidStatLoss(state, battleStats.playerStats);
      effects.reduceVoidStatLoss(state, losses);
      state.specialFlags.voidStatLossTaken = true;
      addBattleLog(state, "乱数が崩れた。");
      addBattleLog(state, "プレイヤーの全ステータスが減少した。");
      return true;
    }
    if (action.id === "judgment") {
      state.randomGodRecords.sawJudgment = true;
      state.specialFlags.randomGodJudgmentSeen = true;
      battleState.playerHp = 0;
      addBattleLog(state, "乱数の神は、乱数の裁きを下した。");
      addBattleLog(state, "プレイヤーのHPが0になった。");
      return true;
    }
    if (action.id === "reset") {
      state.randomGodRecords.sawReset = true;
      state.specialFlags.randomGodResetSeen = true;
      battleState.playerHp = state.voidBattleState.initialPlayerMaxHp;
      battleState.playerMaxHp = state.voidBattleState.initialPlayerMaxHp;
      battleState.bugHp = state.voidBattleState.initialEnemyMaxHp;
      battleState.bugMaxHp = state.voidBattleState.initialEnemyMaxHp;
      battleState.bugAttack = state.voidBattleState.initialEnemyAttack || battleState.bugAttack;
      battleState.bugDefense = state.voidBattleState.initialEnemyDefense || battleState.bugDefense;
      battleState.bugSpeed = state.voidBattleState.initialEnemySpeed || battleState.bugSpeed;
      battleState.turn = 1;
      state.voidBattleState.voidActionCount = 0;
      addBattleLog(state, "乱数が巻き戻った。");
      addBattleLog(state, "戦闘開始時点まで戻された。");
      return true;
    }
    if (action.id === "needle") {
      var needleDamage = Math.max(1, Math.floor(effects.calculateBugDamage(state, battleState) * 3));
      battleState.playerHp = Math.max(0, battleState.playerHp - needleDamage);
      addBattleLog(state, "乱数の針が突き刺さった。");
      addBattleLog(state, "大ダメージを受けた。");
      return true;
    }
    if (action.id === "random") {
      var randomDamage = Math.max(1, Math.floor(battleState.bugMaxHp * 0.3));
      if (Math.random() < 0.5) {
        battleState.playerHp = Math.max(0, battleState.playerHp - randomDamage);
        addBattleLog(state, "乱数が跳ねた。");
        addBattleLog(state, "プレイヤーに大ダメージ。");
      } else {
        battleState.bugHp = Math.max(0, battleState.bugHp - randomDamage);
        addBattleLog(state, "乱数が反転した。");
        addBattleLog(state, "乱数の神に大ダメージ。");
      }
      return true;
    }
    return false;
  }

  function addBattleLog(state, message) {
    state.battleState.logs.push(message);
    if (state.battleState.logs.length > data.LOG_LIMIT) {
      state.battleState.logs = state.battleState.logs.slice(-data.LOG_LIMIT);
    }
  }

  function applyStartEffects(state, battleStats) {
    if (battleStats.startDamage > 0) {
      state.battleState.bugHp = Math.max(0, state.battleState.bugHp - Math.floor(battleStats.startDamage));
      addBattleLog(state, "先制効果で" + state.battleState.bugName + "に" + Math.floor(battleStats.startDamage) + "ダメージ。");
    }
    if (battleStats.startHealFlat > 0 || battleStats.startHealPercent > 0) {
      addBattleLog(state, "戦闘開始時効果でHPが回復した。");
    }
  }

  function unlockNextBugRank(state, currentRank, logs) {
    var nextMap = {
      S: "SR",
      SR: "SSR",
      SSR: "SSSR",
      SSSR: "UR",
      UR: "AR",
      AR: "LR",
      LR: "GR",
      GR: "BR",
      BR: "QR",
      QR: "IR",
      IR: "ER"
    };

    var nextRank = nextMap[currentRank];
    if (!nextRank) {
      return;
    }

    if (state.unlockedBugRanks.indexOf(nextRank) === -1) {
      state.unlockedBugRanks.push(nextRank);
      logs.push(nextRank + "バグが解放された。");
    }
  }

  function getDropCandidatesForRank(rank) {
    var bug = getBugConfig(rank);
    if (!bug) {
      return [];
    }
    return data.RELICS.filter(function (relic) {
      return bug.dropRanks.indexOf(relic.rank) !== -1 && (relic.obtainType || "gacha") === "gacha";
    }).map(function (relic) {
      return relic.id;
    });
  }

  function getRankMatchedDropCandidates(rank) {
    return effects.getRelicsByRankForBugDrop(rank);
  }

  function rollRankMatchedBugDrop(state, bugRank, logs) {
    if (state.settings && state.settings.enableRankMatchedBugDrop === false) {
      return;
    }

    var rate = effects.getRankMatchedBugDropRate(bugRank);
    var candidates = getRankMatchedDropCandidates(bugRank);
    if (!rate || !candidates.length || Math.random() >= rate) {
      return;
    }

    var relicId = pickRandom(candidates);
    var relic = data.RELIC_INDEX[relicId];
    engine.acquireRelic(state, relicId, logs);
    if (relic) {
      var tail = bugRank === "ER" ? "終端" : "核";
      logs.push(bugRank + "バグの" + tail + "から" + data.getRelicDisplayName(relic) + "が現れた。");
    }
  }

  function getExtraLimitedDropRate(state, bugRank) {
    var bonus = effects.calculateExtraBugRelicDropRate(state);
    if (["IR", "ER"].indexOf(bugRank) !== -1) {
      return bonus.qrPlus + bonus.irPlus;
    }
    if (bugRank === "QR") {
      return bonus.qrPlus;
    }
    return 0;
  }

  function awardLimitedBugRelic(state, bugRank, logs) {
    var relicId = getLimitedRelicIdByBugRank(bugRank);
    if (!relicId) {
      return;
    }

    var defeatedCount = state.defeatedBugCounts[bugRank] || 0;
    var shouldDrop = defeatedCount <= 0 || Math.random() < 0.1;
    if (!shouldDrop) {
      return;
    }

    engine.acquireRelic(state, relicId, logs);
    if (relicId === "er_infinity_gate") {
      logs.push("ER無限への門を開いた者の遺物により、未観測だった確率が表示された。");
      logs.push("IF: 0.0000000000000000000000000000001%");
      state.observedIfProbability = true;
      state.infinityBugUnlocked = true;
      logs.push("ER無限の門を開いた者の遺物が、さらに奥の接続を開いた。");
      logs.push("∞バグが出現するようになりました。");
    }
  }

  function awardConfiguredLimitedBugRelic(state, bugRank, logs) {
    var config = data.BUG_LIMITED_RELIC_DROP && data.BUG_LIMITED_RELIC_DROP[bugRank];
    var owned;
    var rate;

    if (!config || !config.relicId) {
      return;
    }

    owned = state.ownedRelics && state.ownedRelics[config.relicId];
    rate = owned ? config.repeatDropRate : config.firstDropRate;
    if (!rate || Math.random() >= rate) {
      return;
    }

    engine.acquireRelic(state, config.relicId, logs);
    logs.push(bugRank + "バグの残骸から、値札のついた遺物が現れた。");
  }

  function rollBugRelicDrop(state, bugRank, logs) {
    var candidates = getDropCandidatesForRank(bugRank);

    if (candidates.length && Math.random() < 0.2) {
      var relicId = pickRandom(candidates);
      engine.acquireRelic(state, relicId, logs);
      logs.push("バグの報酬から遺物が零れ落ちた。");
    }

    rollRankMatchedBugDrop(state, bugRank, logs);
    awardConfiguredLimitedBugRelic(state, bugRank, logs);
    awardLimitedBugRelic(state, bugRank, logs);

    var extraDropRate = getBonusBugRelicDropRate(state);
    if (candidates.length && extraDropRate > 0 && Math.random() < extraDropRate) {
      var bonusRelicId = pickRandom(candidates);
      engine.acquireRelic(state, bonusRelicId, logs);
      logs.push("追加ドロップ効果により、さらに遺物を1つ獲得した。");
    }

    var limitedExtraRate = getExtraLimitedDropRate(state, bugRank);
    if (candidates.length && limitedExtraRate > 0 && Math.random() < limitedExtraRate) {
      var limitedBonusRelicId = pickRandom(candidates);
      engine.acquireRelic(state, limitedBonusRelicId, logs);
      logs.push("深層級のバグ討伐遺物により、追加で遺物を1つ獲得した。");
    }
  }

  function giveBugReward(state, battleState, logs) {
    var rewardBonus = effects.calculateBugRewardBonus(state);
    var stoneGain = effects.calculateStoneGainMultiplier(state).multiplier;
    var reward = randomInt(battleState.rewardMin, battleState.rewardMax);

    reward += Math.floor(rewardBonus.rewardFlat);
    reward = Math.floor(reward * rewardBonus.rewardMultiplier);
    reward = Math.floor(reward * stoneGain);

    state.stones += reward;
    logs.push("バグ報酬として石を" + reward.toLocaleString("ja-JP") + "個獲得。");
  }

  function increaseBugDefeatRateBonus(state, rank, logs) {
    if (!state.bugDefeatRateBonus) {
      state.bugDefeatRateBonus = effects.getDefaultBugDefeatRateBonus();
    }

    var before = Math.max(1, state.bugDefeatRateBonus[rank] || 1);
    var increase = effects.getBugDefeatBonusIncrease(rank);
    var cap = effects.getBugDefeatBonusCap(rank);
    var after = Math.min(cap, before + increase);

    state.bugDefeatRateBonus[rank] = after;
    logs.push(rank + "遺物のガチャ倍率が上昇した。");
    if (after === before && after >= cap) {
      logs.push(rank + "遺物のガチャ倍率は上限に達しています。");
      logs.push(rank + "倍率：" + before.toFixed(2) + "倍");
      return;
    }
    logs.push(rank + "倍率：" + before.toFixed(2) + "倍 → " + after.toFixed(3).replace(/0+$/, "").replace(/\.$/, "") + "倍");
  }

  function checkSpecialBugFlags(state, defeatedRank) {
    if (defeatedRank === "SSR" && !state.discoveredRelics.some(function (relicId) {
      var relic = data.RELIC_INDEX[relicId];
      return relic && relic.rank !== "0" && data.isRankAtLeast(relic.rank, "UR");
    })) {
      state.specialFlags.defeatedSsrBugWithoutUr = true;
    }
  }

  function finishBattleWin(state) {
    var battleState = state.battleState;
    var logs = battleState.logs.slice();
    var rank = battleState.bugRank;
    var dungeon = getDungeon();

    if (battleState.isSlimeBattle && dungeon) {
      Array.prototype.push.apply(logs, dungeon.finishSlimeWin(state, battleState));
      state.isBattle = false;
      state.battleState = null;
      state.pendingBugSourceRank = null;
      return logs;
    }
    if ((battleState.isVoidSlimeBattle || battleState.isRandomGodBattle) && dungeon) {
      Array.prototype.push.apply(logs, dungeon.finishVoidDungeonBattleWin(state, battleState));
      if (battleState.isRandomGodBattle) {
        state.stones += 10000000000;
        grantRandomRelic(state, logs);
        state.isBattle = false;
        state.battleState = null;
      } else if (state.battleState === battleState) {
        state.isBattle = false;
        state.battleState = null;
      }
      state.pendingBugSourceRank = null;
      return logs;
    }
    if (battleState.isVoidBattle) {
      state.voidState.isInVoidBattle = false;
      state.voidState.defeats += 1;
      if (state.voidState.firstDefeatedAt == null) {
        state.voidState.firstDefeatedAt = Date.now();
      }
      state.stones += 10000000000;
      logs.push("虚無を撃破した。");
      logs.push("何もなかった場所に、終わりが生まれた。");
      logs.push("実績「虚無を超えた者」を解除。");
      logs.push("石を10,000,000,000個獲得。");
      grantZeroEndingRelic(state, logs);
      state.specialLogUnlocked = true;
      state.isBattle = false;
      state.battleState = null;
      state.pendingBugSourceRank = null;
      return logs;
    }

    updateHighestObservedRank(state, rank);
    giveBugReward(state, battleState, logs);
    state.defeatedBugCounts[rank] = (state.defeatedBugCounts[rank] || 0) + 1;
    state.totalBugDefeats += 1;
    if (rank === "∞") {
      state.infinityBugRecords.encounters = Math.max(state.infinityBugRecords.encounters || 0, 1);
      state.infinityBugRecords.defeats = (state.infinityBugRecords.defeats || 0) + 1;
      if (state.infinityBugRecords.firstDefeatedAt == null) {
        state.infinityBugRecords.firstDefeatedAt = Date.now();
      }
      logs.push("∞バグを撃破した。");
      logs.push("終わらないノイズが、有限の形を取った。");
      engine.acquireRelic(state, "infinity_finite_relic", logs);
      logs.push("ガチャを引くたびに、∞の確率が上昇するようになりました。");
    }
    increaseBugDefeatRateBonus(state, rank, logs);
    rollBugRelicDrop(state, rank, logs);

    if (!state.highestDefeatedBugRank || data.isRankAtLeast(rank, state.highestDefeatedBugRank)) {
      state.highestDefeatedBugRank = rank;
    }

    checkSpecialBugFlags(state, rank);
    unlockNextBugRank(state, rank, logs);
    if (state.ownedRelics && state.ownedRelics.er_creation && state.ownedRelics.er_creation.enabled !== false) {
      var gain = effects.calculateCreationRelicStatGain(rank);
      if (gain > 0) {
        var target = state.creationRelicStatBonus;
        target.hp += gain;
        target.attack += gain;
        target.defense += gain;
        target.speed += gain;
        target.luck += gain;
        target.accuracy += gain;
        target.evasionRate += gain;
        target.criticalRate += gain;
        target.criticalDamage += gain;
        logs.push("ER創造の遺物が世界を再構築した。");
        logs.push("全ステータスが" + gain.toLocaleString("ja-JP") + "上昇した。");
      }
    }

    state.isBattle = false;
    state.battleState = null;
    state.pendingBugSourceRank = null;
    return logs;
  }

  function finishBattleLose(state) {
    var battleState = state.battleState;
    var logs = battleState.logs.slice();
    var dungeon = getDungeon();

    state.isBattle = false;
    state.battleState = null;
    state.pendingBugSourceRank = null;

    if (battleState.isSlimeBattle && dungeon) {
      Array.prototype.push.apply(logs, dungeon.finishSlimeLose(state, battleState));
      return logs;
    }

    if ((battleState.isVoidSlimeBattle || battleState.isRandomGodBattle) && dungeon) {
      Array.prototype.push.apply(logs, dungeon.finishVoidDungeonLose(state, battleState));
      return logs;
    }

    if (battleState.isVoidBattle) {
      logs.push("虚無に敗北した。");
      logs.push("あなたは何も失わなかった。");
      logs.push("ただし、削られた存在は戻らない。");
      return logs;
    }

    logs.push("敗北した。石の損失は発生しなかった。");
    if (state.ownedRelics.n_retry && state.ownedRelics.n_retry.enabled !== false) {
      state.stones += 1;
      logs.push("N再挑戦の遺物により石を1個獲得。");
    }

    return logs;
  }

  function checkBattleWin(state) {
    if (state.battleState.bugHp <= 0) {
      addBattleLog(state, state.battleState.bugName + "を倒した。");
      return true;
    }
    return false;
  }

  function checkBattleLose(state) {
    if (state.battleState.playerHp <= 0) {
      addBattleLog(state, "負けてしまった。");
      return true;
    }
    return false;
  }

  function startBattle(state, configOrRank) {
    var battleStats = effects.calculateBattleStats(state);
    var enemyConfig = createEnemyConfig(configOrRank);
    state.battleState = createBattleState(enemyConfig, battleStats);
    state.isBattle = true;
    if (!state.voidBattleState) {
      state.voidBattleState = data.createVoidBattleState();
    }
    state.voidBattleState.turnCount = 0;
    state.voidBattleState.voidActionCount = 0;
    state.voidBattleState.playerActionCount = 0;
    state.voidBattleState.randomGodActionCount = 0;
    state.voidBattleState.initialPlayerMaxHp = state.battleState.playerMaxHp;
    state.voidBattleState.initialEnemyMaxHp = state.battleState.bugMaxHp;
    state.voidBattleState.initialEnemyAttack = state.battleState.bugAttack;
    state.voidBattleState.initialEnemyDefense = state.battleState.bugDefense;
    state.voidBattleState.initialEnemySpeed = state.battleState.bugSpeed;
    if (enemyConfig.rank === "∞") {
      state.infinityBugRecords.encounters = (state.infinityBugRecords.encounters || 0) + 1;
      addBattleLog(state, "接続が終端を超えた。");
      addBattleLog(state, "∞バグが出現した。");
      if (effects.calculateInfinityBugDefenseOverride(state) !== null) {
        addBattleLog(state, "ER絶剣の遺物が、∞バグの防御式を切断した。");
        addBattleLog(state, "∞バグの防御力が1になった。");
      }
    } else if (enemyConfig.isVoidBattle) {
      addBattleLog(state, "祭壇が音を失った。");
      addBattleLog(state, enemyConfig.name + "が現れた。");
      addBattleLog(state, "それは、何も存在しない敵だった。");
      if (enemyConfig.isRandomGodBattle) {
        addBattleLog(state, "この戦闘では、次に何が起こるか誰にも分からない。");
      } else {
        addBattleLog(state, "虚無の数値は読めない。");
        addBattleLog(state, "ただ、∞バグより遥かに大きいことだけは分かる。");
      }
    }

    if (!enemyConfig.isSlimeBattle && state.pendingBugSourceRank && state.pendingBugSourceRank !== enemyConfig.rank) {
      addBattleLog(state, "高位の遺物効果により、" + state.pendingBugSourceRank + "バグは" + enemyConfig.rank + "バグへ変質した。");
    }

    applyStartEffects(state, battleStats);

    if (checkBattleWin(state)) {
      return { logs: finishBattleWin(state) };
    }

    return { logs: ["戦闘を開始した。"] };
  }

  function playerAttack(state) {
    if (!state.isBattle || !state.battleState) {
      return { logs: [] };
    }

    var battleState = state.battleState;
    var dungeon = getDungeon();
    var battleStats = effects.calculateBattleStats(state);
    addBattleLog(state, "ターン" + battleState.turn + "開始。");
    if (battleState.isVoidBattle) {
      state.voidBattleState.turnCount += 1;
    }

    for (var i = 0; i < battleStats.attackCount; i += 1) {
      if (battleState.bugHp <= 0) {
        break;
      }

      if (Math.random() * 100 >= battleStats.hitRate) {
        addBattleLog(state, "攻撃が外れた。");
        continue;
      }

      if (battleState.isInfinitySlime && dungeon && !dungeon.canDamageInfinitySlime(state)) {
        addBattleLog(state, "∞スライムに攻撃した。");
        addBattleLog(state, "だが、攻撃は存在しない距離で止まった。");
        addBattleLog(state, "無限の遺物がなければ、届かない。");
        continue;
      }

      var damage = effects.calculatePlayerDamage(state, battleState);
      if (Math.random() * 100 < battleStats.critical.rate) {
        damage = Math.max(1, Math.floor(damage * (1 + (battleStats.critical.damageBonus / 100))));
        addBattleLog(state, "会心の一撃。");
      }

      battleState.bugHp = Math.max(0, battleState.bugHp - damage);
      addBattleLog(state, battleState.bugName + "に" + damage + "ダメージ。");
      if (battleState.isVoidBattle) {
        state.voidBattleState.playerActionCount += 1;
      }

      if (battleState.isInfinitySlime && dungeon && dungeon.canDamageInfinitySlime(state) && battleState.hideStats) {
        battleState.hideStats = false;
        addBattleLog(state, "∞スライムに攻撃が届いた。");
        addBattleLog(state, "数値が表示された。");
      }

      if (checkBattleWin(state)) {
        return { logs: finishBattleWin(state) };
      }
    }

    if (battleState.isRandomGodBattle) {
      if (executeRandomGodAction(state, battleState)) {
        if (checkBattleWin(state)) {
          return { logs: finishBattleWin(state) };
        }
        if (checkBattleLose(state)) {
          return { logs: finishBattleLose(state) };
        }
        battleState.turn += 1;
        return { logs: [] };
      }
    } else if (battleState.isVoidBattle) {
      if (applyVoidLikeEnemyTurn(state, battleState, battleStats)) {
        return { logs: [] };
      }
    }

    if (Math.random() * 100 < battleStats.evasionRate) {
      addBattleLog(state, (battleState.isSlimeBattle ? "スライム" : "バグ") + "の攻撃を回避した。");
    } else {
      var bugDamage = effects.calculateBugDamage(state, battleState);
      battleState.playerHp = Math.max(0, battleState.playerHp - bugDamage);
      addBattleLog(state, (battleState.isSlimeBattle ? "スライム" : "バグ") + "の攻撃で" + bugDamage + "ダメージを受けた。");

      if (checkBattleLose(state)) {
        return { logs: finishBattleLose(state) };
      }
    }

    battleState.turn += 1;
    return { logs: [] };
  }

  function selectBugRank(state) {
    var unlocked = Array.isArray(state.unlockedBugRanks) && state.unlockedBugRanks.length ? state.unlockedBugRanks.slice() : ["S"];
    return pickRandom(unlocked);
  }

  function registerBugSpawn(state) {
    state.recentBugSpawnGachaCounts.push(state.totalGachaCount);
    state.recentBugSpawnGachaCounts = state.recentBugSpawnGachaCounts.filter(function (count) {
      return count >= state.totalGachaCount - 9;
    });
    if (state.recentBugSpawnGachaCounts.length >= 3) {
      state.specialFlags.threeBugSpawnsWithinTen = true;
    }
  }

  function rollBugSpawn(state) {
    var dungeon = getDungeon();
    if (state.isBattle || state.pendingBugRank || (dungeon && dungeon.isInDungeon(state))) {
      return null;
    }

    var spawnRate = effects.calculateBugSpawnRate(state);
    if (Math.random() * 100 >= spawnRate) {
      return null;
    }

    var baseRank = selectBugRank(state);
    var rankModifier = effects.calculateBugRankModifier(state);
    var allowPastUnlock = !state.settings || state.settings.allowRankBoostPastUnlock !== false;
    var finalRank = getRaisedBugRank(state, baseRank, rankModifier, allowPastUnlock);
    if (isInfinityBugUnlocked(state) && (Math.random() < 0.01 || (rankModifier > 0 && finalRank === "ER" && Math.random() < 0.05))) {
      finalRank = "∞";
    }

    registerBugSpawn(state);

    return {
      baseRank: baseRank,
      finalRank: finalRank,
      raised: finalRank !== baseRank
    };
  }

  function handlePendingBug(state) {
    if (!state.pendingBugRank) {
      return { logs: [] };
    }

    var rank = state.pendingBugRank;
    state.pendingBugRank = null;
    return startBattle(state, rank);
  }

  function grantZeroEndingRelic(state, logs) {
    if (!state.permanentRelics) {
      state.permanentRelics = data.createPermanentRelics();
    }
    var relic = state.permanentRelics.zero_ending_relic;
    if (!relic.owned) {
      relic.owned = true;
      relic.enabled = true;
      relic.count = 1;
      relic.limitBreak = 0;
      if (state.discoveredRelics.indexOf("zero_ending_relic") === -1) {
        state.discoveredRelics.push("zero_ending_relic");
      }
      logs.push("0終焉の遺物を獲得。");
      logs.push("すべての確率は、最低1%を持つようになった。");
      return;
    }
    relic.count += 1;
    relic.limitBreak = Math.max(0, relic.count - 1);
    logs.push("0終焉の遺物が重なった。");
    logs.push("最低基礎確率が上昇した。");
  }

  window.InfinityGachaBattle = {
    startBattle: startBattle,
    playerAttack: playerAttack,
    rollBugSpawn: rollBugSpawn,
    handlePendingBug: handlePendingBug,
    grantZeroEndingRelic: grantZeroEndingRelic,
    grantRandomRelic: grantRandomRelic
  };
})();
