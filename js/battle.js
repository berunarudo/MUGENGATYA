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
      isBoss: ["SSSR", "UR", "AR", "LR", "GR", "BR", "QR", "IR", "ER"].indexOf(configOrRank) !== -1,
      isSlimeBattle: false,
      isInfinitySlime: false,
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
      hideStats: config.hideStats === true,
      rewardMin: config.rewardMin || 0,
      rewardMax: config.rewardMax || 0
    };
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
    }
  }

  function rollBugRelicDrop(state, bugRank, logs) {
    var candidates = getDropCandidatesForRank(bugRank);

    if (candidates.length && Math.random() < 0.2) {
      var relicId = pickRandom(candidates);
      engine.acquireRelic(state, relicId, logs);
      logs.push("バグの報酬から遺物が零れ落ちた。");
    }

    rollRankMatchedBugDrop(state, bugRank, logs);
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
      return relic && data.isRankAtLeast(relic.rank, "UR");
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

    updateHighestObservedRank(state, rank);
    giveBugReward(state, battleState, logs);
    rollBugRelicDrop(state, rank, logs);
    state.defeatedBugCounts[rank] = (state.defeatedBugCounts[rank] || 0) + 1;
    state.totalBugDefeats += 1;
    increaseBugDefeatRateBonus(state, rank, logs);

    if (!state.highestDefeatedBugRank || data.isRankAtLeast(rank, state.highestDefeatedBugRank)) {
      state.highestDefeatedBugRank = rank;
    }

    checkSpecialBugFlags(state, rank);
    unlockNextBugRank(state, rank, logs);

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

      if (battleState.isInfinitySlime && dungeon && dungeon.canDamageInfinitySlime(state) && battleState.hideStats) {
        battleState.hideStats = false;
        addBattleLog(state, "∞スライムに攻撃が届いた。");
        addBattleLog(state, "数値が表示された。");
      }

      if (checkBattleWin(state)) {
        return { logs: finishBattleWin(state) };
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

  window.InfinityGachaBattle = {
    startBattle: startBattle,
    playerAttack: playerAttack,
    rollBugSpawn: rollBugSpawn,
    handlePendingBug: handlePendingBug
  };
})();

