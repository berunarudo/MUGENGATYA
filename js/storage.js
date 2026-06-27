(function () {
  var data = window.InfinityGachaData;

  function cloneState(state) {
    return JSON.parse(JSON.stringify(state));
  }

  function clampNumber(value, fallback) {
    return typeof value === "number" && isFinite(value) ? value : fallback;
  }

  function normalizeAchievementState(rawState) {
    var source = rawState && typeof rawState === "object" ? rawState : {};
    return {
      claimed: source.claimed && typeof source.claimed === "object" ? source.claimed : {},
      announced: source.announced && typeof source.announced === "object" ? source.announced : {}
    };
  }

  function normalizeTutorialState(rawState) {
    var source = rawState && typeof rawState === "object" ? rawState : {};
    return {
      hasSeenFirstTutorial: source.hasSeenFirstTutorial === true,
      hasSeenRebirthTutorial: source.hasSeenRebirthTutorial === true,
      hasSeenSecondLoopTutorial: source.hasSeenSecondLoopTutorial === true,
      tutorialLogEnabled: source.tutorialLogEnabled !== false
    };
  }

  function normalizeAutoButtonState(rawState) {
    var fallback = data.createInitialState(Date.now()).autoButtonState;
    var source = rawState && typeof rawState === "object" ? rawState : {};
    return {
      lastPlayerActionAt: clampNumber(source.lastPlayerActionAt, fallback.lastPlayerActionAt),
      isRunning: source.isRunning === true,
      startedAt: source.startedAt == null ? null : clampNumber(source.startedAt, null)
    };
  }

  function migrateLegacyRelics(state) {
    if (state.ownedRelics && typeof state.ownedRelics === "object") {
      return state.ownedRelics;
    }

    var legacyRelics = state.relics && typeof state.relics === "object" ? state.relics : {};
    var migrated = {};

    Object.keys(legacyRelics).forEach(function (key) {
      var entry = legacyRelics[key] || {};
      var relic = data.RELICS.find(function (item) {
        return item.name === entry.name || item.name === key;
      });

      if (!relic) {
        return;
      }

      migrated[relic.id] = {
        count: Math.max(1, Math.floor(clampNumber(entry.count, 1))),
        enabled: entry.enabled !== false
      };
    });

    return migrated;
  }

  function normalizeOwnedRelics(rawOwnedRelics) {
    var normalized = {};
    var source = rawOwnedRelics && typeof rawOwnedRelics === "object" ? rawOwnedRelics : {};
    var nextOrder = 1;

    Object.keys(source).forEach(function (relicId) {
      if (!data.RELIC_INDEX[relicId]) {
        return;
      }

      var entry = source[relicId] || {};
      var count = Math.max(1, Math.floor(clampNumber(entry.count, 1)));
      var acquiredOrder = Math.max(1, Math.floor(clampNumber(entry.acquiredOrder, nextOrder)));

      normalized[relicId] = {
        count: count,
        enabled: entry.enabled !== false,
        acquiredOrder: acquiredOrder
      };

      nextOrder = Math.max(nextOrder, acquiredOrder + 1);
    });

    return {
      ownedRelics: normalized,
      nextAcquiredOrder: nextOrder
    };
  }

  function normalizeRankTotals(rawTotals) {
    var result = data.createRankTotalObject();
    var source = rawTotals && typeof rawTotals === "object" ? rawTotals : {};
    Object.keys(result).forEach(function (rank) {
      result[rank] = Math.max(0, Math.floor(clampNumber(source[rank], result[rank])));
    });
    return result;
  }

  function normalizeRankLimitBreaks(rawTotals) {
    var result = data.createRankLimitBreakObject();
    var source = rawTotals && typeof rawTotals === "object" ? rawTotals : {};
    Object.keys(result).forEach(function (rank) {
      result[rank] = Math.max(0, Math.floor(clampNumber(source[rank], result[rank])));
    });
    return result;
  }

  function normalizeDefeatedBugCounts(rawCounts) {
    var result = data.createDefeatedBugCounts();
    var source = rawCounts && typeof rawCounts === "object" ? rawCounts : {};
    Object.keys(result).forEach(function (rank) {
      result[rank] = Math.max(0, Math.floor(clampNumber(source[rank], result[rank])));
    });
    return result;
  }

  function normalizeBugDefeatRateBonus(rawBonus) {
    var result = data.createBugDefeatRateBonus();
    var source = rawBonus && typeof rawBonus === "object" ? rawBonus : {};
    Object.keys(result).forEach(function (rank) {
      result[rank] = Math.max(1, clampNumber(source[rank], result[rank]));
    });
    return result;
  }

  function normalizeAltarState(rawState) {
    var source = rawState && typeof rawState === "object" ? rawState : {};
    var activeEvent = source.activeEvent && typeof source.activeEvent === "object" ? source.activeEvent : null;
    return {
      activeEvent: activeEvent ? {
        type: typeof activeEvent.type === "string" ? activeEvent.type : "normal",
        effectId: typeof activeEvent.effectId === "string" ? activeEvent.effectId : "",
        effectName: typeof activeEvent.effectName === "string" ? activeEvent.effectName : "",
        effectType: typeof activeEvent.effectType === "string" ? activeEvent.effectType : "",
        targetRank: typeof activeEvent.targetRank === "string" ? activeEvent.targetRank : null,
        targetGroup: Array.isArray(activeEvent.targetGroup) ? activeEvent.targetGroup.slice() : null,
        multiplier: clampNumber(activeEvent.multiplier, 1),
        value: clampNumber(activeEvent.value, 0),
        startedAt: clampNumber(activeEvent.startedAt, Date.now()),
        endsAt: clampNumber(activeEvent.endsAt, Date.now())
      } : null,
      eventHistory: Array.isArray(source.eventHistory) ? source.eventHistory.slice(-20) : [],
      altarRelicObtained: source.altarRelicObtained && typeof source.altarRelicObtained === "object" ? source.altarRelicObtained : {}
    };
  }

  function normalizeDiscoveredRelics(rawList) {
    if (!Array.isArray(rawList)) {
      return [];
    }

    var map = {};
    rawList.forEach(function (relicId) {
      if (data.RELIC_INDEX[relicId]) {
        map[relicId] = true;
      }
    });
    return Object.keys(map);
  }

  function normalizeSpecialFlags(rawFlags) {
    var source = rawFlags && typeof rawFlags === "object" ? rawFlags : {};
    return {
      defeatedSsrBugWithoutUr: source.defeatedSsrBugWithoutUr === true,
      threeBugSpawnsWithinTen: source.threeBugSpawnsWithinTen === true,
      subPoint001RelicFound: source.subPoint001RelicFound === true,
      voidStatLossTaken: source.voidStatLossTaken === true,
      randomGodJudgmentSeen: source.randomGodJudgmentSeen === true,
      randomGodResetSeen: source.randomGodResetSeen === true,
      voidDungeonFailed: source.voidDungeonFailed === true,
      voidDungeonEntered: source.voidDungeonEntered === true
    };
  }

  function normalizeSettings(rawSettings) {
    var source = rawSettings && typeof rawSettings === "object" ? rawSettings : {};
    return {
      achievementStoneMultiplierEnabled: source.achievementStoneMultiplierEnabled === true,
      allowRankBoostPastUnlock: source.allowRankBoostPastUnlock !== false,
      enableRankMatchedBugDrop: source.enableRankMatchedBugDrop !== false,
      bgmVolume: Math.max(0, Math.min(1, clampNumber(source.bgmVolume, 0.5))),
      seVolume: Math.max(0, Math.min(1, clampNumber(source.seVolume, 0.7)))
    };
  }

  function normalizeLimitedRelicState(rawState) {
    var source = rawState && typeof rawState === "object" ? rawState : {};
    return {
      QR: source.QR === true,
      IR: source.IR === true,
      ER: source.ER === true
    };
  }

  function normalizeLimitedRelicDiscovered(rawState) {
    var source = rawState && typeof rawState === "object" ? rawState : {};
    return {
      qr_deep_bug_slayer: source.qr_deep_bug_slayer === true,
      ir_abyss_bug_slayer: source.ir_abyss_bug_slayer === true,
      er_infinity_gate: source.er_infinity_gate === true
    };
  }

  function normalizeInfinityHistory(rawHistory) {
    if (!Array.isArray(rawHistory)) {
      return [];
    }

    return rawHistory.map(function (entry, index) {
      var source = entry && typeof entry === "object" ? entry : {};
      return {
        count: Math.max(1, Math.floor(clampNumber(source.count, index + 1))),
        executedAt: clampNumber(source.executedAt, Date.now()),
        totalGachaCount: Math.max(0, Math.floor(clampNumber(source.totalGachaCount, 0))),
        highestRelicRank: typeof source.highestRelicRank === "string" ? source.highestRelicRank : null,
        multiplier: Math.max(1, clampNumber(source.multiplier, 1))
      };
    });
  }

  function normalizeDungeonState(rawState) {
    var fallback = data.createDungeonState();
    var source = rawState && typeof rawState === "object" ? rawState : {};
    var allowedRanks = ["N"].concat(data.BUG_RANKS.map(function (bug) { return bug.rank; }));
    var unlocked = Array.isArray(source.unlockedSlimeRanks) ? source.unlockedSlimeRanks.filter(function (rank) {
      return allowedRanks.indexOf(rank) !== -1;
    }) : fallback.unlockedSlimeRanks.slice();

    if (!unlocked.length) {
      unlocked = fallback.unlockedSlimeRanks.slice();
    }

    return {
      isInDungeon: source.isInDungeon === true,
      type: typeof source.type === "string" && data.DUNGEON_TYPES[source.type] ? source.type : null,
      name: typeof source.name === "string" ? source.name : null,
      startedAt: source.startedAt == null ? null : clampNumber(source.startedAt, null),
      endsAt: source.endsAt == null ? null : clampNumber(source.endsAt, null),
      miningCount: Math.max(0, Math.floor(clampNumber(source.miningCount, 0))),
      slimeDefeatCount: Math.max(0, Math.floor(clampNumber(source.slimeDefeatCount, 0))),
      currentDungeonSlimeDefeatCount: Math.max(0, Math.floor(clampNumber(source.currentDungeonSlimeDefeatCount, 0))),
      unlockedSlimeRanks: unlocked,
      highestDefeatedSlimeRank: typeof source.highestDefeatedSlimeRank === "string" ? source.highestDefeatedSlimeRank : null,
      dungeonRateBonus: Math.max(1, clampNumber(source.dungeonRateBonus, 1)),
      isInfiniteDungeon: source.isInfiniteDungeon === true,
      isVoidDungeon: source.isVoidDungeon === true,
      currentBattleIndex: Math.max(0, Math.floor(clampNumber(source.currentBattleIndex, 0))),
      maxBattleCount: Math.max(0, Math.floor(clampNumber(source.maxBattleCount, 0))),
      defeatedCount: Math.max(0, Math.floor(clampNumber(source.defeatedCount, 0))),
      isCompleted: source.isCompleted === true,
      endedAt: source.endedAt == null ? null : clampNumber(source.endedAt, null)
    };
  }

  function normalizeDungeonStatBonus(rawBonus) {
    var fallback = data.createDungeonStatBonus();
    var source = rawBonus && typeof rawBonus === "object" ? rawBonus : {};
    Object.keys(fallback).forEach(function (key) {
      fallback[key] = Math.max(0, clampNumber(source[key], fallback[key]));
    });
    return fallback;
  }

  function normalizeInfinityRateGrowthMap(rawMap) {
    var result = {};
    var source = rawMap && typeof rawMap === "object" ? rawMap : {};
    (data.INFINITY_RATE_RANKS || []).forEach(function (rank) {
      result[rank] = Math.max(0, clampNumber(source[rank], 0));
    });
    return result;
  }

  function normalizeInfinityBugRecords(rawRecords) {
    var source = rawRecords && typeof rawRecords === "object" ? rawRecords : {};
    return {
      encounters: Math.max(0, Math.floor(clampNumber(source.encounters, 0))),
      defeats: Math.max(0, Math.floor(clampNumber(source.defeats, 0))),
      firstDefeatedAt: source.firstDefeatedAt == null ? null : clampNumber(source.firstDefeatedAt, null)
    };
  }

  function normalizeDungeonRecords(rawRecords) {
    var fallback = data.createDungeonRecords();
    var source = rawRecords && typeof rawRecords === "object" ? rawRecords : {};
    Object.keys(fallback).forEach(function (key) {
      fallback[key] = Math.max(0, Math.floor(clampNumber(source[key], fallback[key])));
    });
    return fallback;
  }

  function normalizeRebirthState(rawState) {
    var fallback = data.createRebirthState();
    var source = rawState && typeof rawState === "object" ? rawState : {};
    return {
      rebirthCount: Math.max(0, Math.floor(clampNumber(source.rebirthCount, fallback.rebirthCount))),
      baseRateRebirthBonus: Math.max(0, clampNumber(source.baseRateRebirthBonus, fallback.baseRateRebirthBonus)),
      lastRebirthAt: source.lastRebirthAt == null ? null : clampNumber(source.lastRebirthAt, null),
      history: Array.isArray(source.history) ? source.history.slice(-100).map(function (entry, index) {
        var item = entry && typeof entry === "object" ? entry : {};
        return {
          count: Math.max(1, Math.floor(clampNumber(item.count, index + 1))),
          executedAt: clampNumber(item.executedAt, Date.now()),
          hadZeroRelic: item.hadZeroRelic === true,
          zeroRelicLimitBreak: Math.max(0, Math.floor(clampNumber(item.zeroRelicLimitBreak, 0))),
          gainedBaseRateBonus: Math.max(0, clampNumber(item.gainedBaseRateBonus, 0)),
          totalBaseRateBonus: Math.max(0, clampNumber(item.totalBaseRateBonus, 0)),
          totalGachaCount: Math.max(0, Math.floor(clampNumber(item.totalGachaCount, 0))),
          highestRelicRank: typeof item.highestRelicRank === "string" ? item.highestRelicRank : null
        };
      }) : fallback.history.slice()
    };
  }

  function normalizeZeroRelicState(rawState) {
    var fallback = data.createZeroRelicState();
    var source = rawState && typeof rawState === "object" ? rawState : {};
    var count = Math.max(0, Math.floor(clampNumber(source.count, fallback.count)));
    return {
      owned: source.owned === true || count > 0,
      enabled: source.enabled === true,
      count: count,
      limitBreak: Math.max(0, Math.floor(clampNumber(source.limitBreak, Math.max(0, count - 1)))),
      purchasedThisLife: source.purchasedThisLife === true
    };
  }

  function normalizePermanentRelics(rawState) {
    var fallback = data.createPermanentRelics();
    var source = rawState && typeof rawState === "object" ? rawState : {};
    return {
      infinity_slime_relic: {
        owned: Boolean(source.infinity_slime_relic && source.infinity_slime_relic.owned),
        enabled: Boolean(source.infinity_slime_relic && source.infinity_slime_relic.enabled),
        count: 1,
        limitBreak: 0
      },
      zero_ending_relic: {
        owned: Boolean(source.zero_ending_relic && source.zero_ending_relic.owned),
        enabled: Boolean(source.zero_ending_relic && source.zero_ending_relic.enabled),
        count: Math.max(Boolean(source.zero_ending_relic && source.zero_ending_relic.owned) ? 1 : 0, Math.floor(clampNumber(source.zero_ending_relic && source.zero_ending_relic.count, fallback.zero_ending_relic.count))),
        limitBreak: Math.max(0, Math.floor(clampNumber(source.zero_ending_relic && source.zero_ending_relic.limitBreak, fallback.zero_ending_relic.limitBreak)))
      },
      if_random_relic: {
        owned: Boolean(source.if_random_relic && source.if_random_relic.owned),
        enabled: Boolean(source.if_random_relic && source.if_random_relic.enabled),
        count: 1,
        limitBreak: 0
      }
    };
  }

  function normalizeVoidState(rawState) {
    var fallback = data.createVoidState();
    var source = rawState && typeof rawState === "object" ? rawState : {};
    return {
      unlocked: source.unlocked === true,
      isInVoidBattle: source.isInVoidBattle === true,
      encounters: Math.max(0, Math.floor(clampNumber(source.encounters, fallback.encounters))),
      defeats: Math.max(0, Math.floor(clampNumber(source.defeats, fallback.defeats))),
      firstDefeatedAt: source.firstDefeatedAt == null ? null : clampNumber(source.firstDefeatedAt, null)
    };
  }

  function normalizeVoidBattleState(rawState) {
    var fallback = data.createVoidBattleState();
    var source = rawState && typeof rawState === "object" ? rawState : {};
    return {
      turnCount: Math.max(0, Math.floor(clampNumber(source.turnCount, fallback.turnCount))),
      voidActionCount: Math.max(0, Math.floor(clampNumber(source.voidActionCount, fallback.voidActionCount))),
      playerActionCount: Math.max(0, Math.floor(clampNumber(source.playerActionCount, fallback.playerActionCount))),
      randomGodActionCount: Math.max(0, Math.floor(clampNumber(source.randomGodActionCount, fallback.randomGodActionCount))),
      initialPlayerMaxHp: Math.max(0, Math.floor(clampNumber(source.initialPlayerMaxHp, fallback.initialPlayerMaxHp))),
      initialEnemyMaxHp: Math.max(0, Math.floor(clampNumber(source.initialEnemyMaxHp, fallback.initialEnemyMaxHp))),
      initialEnemyAttack: Math.max(0, Math.floor(clampNumber(source.initialEnemyAttack, fallback.initialEnemyAttack))),
      initialEnemyDefense: Math.max(0, Math.floor(clampNumber(source.initialEnemyDefense, fallback.initialEnemyDefense))),
      initialEnemySpeed: Math.max(0, Math.floor(clampNumber(source.initialEnemySpeed, fallback.initialEnemySpeed)))
    };
  }

  function normalizeVoidDungeonState(rawState) {
    var fallback = data.createVoidDungeonState();
    var source = rawState && typeof rawState === "object" ? rawState : {};
    return {
      isInVoidDungeon: source.isInVoidDungeon === true,
      currentBattleIndex: Math.max(0, Math.floor(clampNumber(source.currentBattleIndex, fallback.currentBattleIndex))),
      maxBattleCount: Math.max(1, Math.floor(clampNumber(source.maxBattleCount, fallback.maxBattleCount))),
      defeatedCount: Math.max(0, Math.floor(clampNumber(source.defeatedCount, fallback.defeatedCount))),
      isCompleted: source.isCompleted === true,
      startedAt: source.startedAt == null ? null : clampNumber(source.startedAt, null),
      endedAt: source.endedAt == null ? null : clampNumber(source.endedAt, null)
    };
  }

  function normalizeVoidSlimeRecords(rawState) {
    var fallback = data.createVoidSlimeRecords();
    var source = rawState && typeof rawState === "object" ? rawState : {};
    var result = {
      encounters: Math.max(0, Math.floor(clampNumber(source.encounters, fallback.encounters))),
      defeats: Math.max(0, Math.floor(clampNumber(source.defeats, fallback.defeats))),
      defeatByRank: Object.assign({}, fallback.defeatByRank)
    };
    Object.keys(result.defeatByRank).forEach(function (rank) {
      result.defeatByRank[rank] = Math.max(0, Math.floor(clampNumber(source.defeatByRank && source.defeatByRank[rank], result.defeatByRank[rank])));
    });
    return result;
  }

  function normalizeRandomGodRecords(rawState) {
    var fallback = data.createRandomGodRecords();
    var source = rawState && typeof rawState === "object" ? rawState : {};
    return {
      encounters: Math.max(0, Math.floor(clampNumber(source.encounters, fallback.encounters))),
      defeats: Math.max(0, Math.floor(clampNumber(source.defeats, fallback.defeats))),
      sawJudgment: source.sawJudgment === true,
      sawReset: source.sawReset === true,
      firstDefeatedAt: source.firstDefeatedAt == null ? null : clampNumber(source.firstDefeatedAt, null)
    };
  }

  function normalizeRandomRelicState(rawState) {
    var fallback = data.createRandomRelicState();
    var source = rawState && typeof rawState === "object" ? rawState : {};
    return {
      owned: source.owned === true,
      enabled: source.enabled === true,
      selectedRank: typeof source.selectedRank === "string" ? source.selectedRank : fallback.selectedRank
    };
  }

  function normalizeZeroSlimeRecords(rawState) {
    var fallback = data.createZeroSlimeRecords();
    var source = rawState && typeof rawState === "object" ? rawState : {};
    return {
      totalEncounters: Math.max(0, Math.floor(clampNumber(source.totalEncounters, fallback.totalEncounters))),
      totalDefeats: Math.max(0, Math.floor(clampNumber(source.totalDefeats, fallback.totalDefeats))),
      firstDefeatedAt: source.firstDefeatedAt == null ? null : clampNumber(source.firstDefeatedAt, null)
    };
  }

  function backfillFromOwnedRelics(state) {
    var highestRank = state.highestRelicRank;
    var maxCount = state.maxRelicCount;
    var maxLimitBreak = state.maxRelicLimitBreak;

    Object.keys(state.ownedRelics).forEach(function (relicId) {
      var owned = state.ownedRelics[relicId];
      var relic = data.RELIC_INDEX[relicId];
      if (!relic) {
        return;
      }

      state.discoveredRelics.push(relicId);
      state.relicRankTotal[relic.rank] = Math.max(state.relicRankTotal[relic.rank] || 0, owned.count);
      if (!highestRank || data.isRankAtLeast(relic.rank, highestRank)) {
        highestRank = relic.rank;
      }

      maxCount = Math.max(maxCount, owned.count);
      maxLimitBreak = Math.max(maxLimitBreak, owned.count - 1);
      state.rankMaxLimitBreak[relic.rank] = Math.max(state.rankMaxLimitBreak[relic.rank] || 0, owned.count - 1);
    });

    state.highestRelicRank = highestRank;
    state.maxRelicCount = maxCount;
    state.maxRelicLimitBreak = maxLimitBreak;
    state.discoveredRelics = normalizeDiscoveredRelics(state.discoveredRelics);
  }

  function normalizeState(rawState) {
    var fallback = data.createInitialState(Date.now());
    var state = rawState && typeof rawState === "object" ? rawState : {};
    var normalizedOwned = normalizeOwnedRelics(migrateLegacyRelics(state));

    var normalized = {
      stones: Math.max(0, Math.floor(clampNumber(state.stones, fallback.stones))),
      ownedRelics: normalizedOwned.ownedRelics,
      logs: Array.isArray(state.logs) ? state.logs.slice(-data.LOG_LIMIT) : fallback.logs.slice(),
      lastRecoveryAt: clampNumber(state.lastRecoveryAt, fallback.lastRecoveryAt),
      totalGachaCount: Math.max(0, Math.floor(clampNumber(state.totalGachaCount, 0))),
      missCount: Math.max(0, Math.floor(clampNumber(state.missCount, 0))),
      totalMissCount: Math.max(0, Math.floor(clampNumber(state.totalMissCount, 0))),
      nextAcquiredOrder: Math.max(1, Math.floor(clampNumber(state.nextAcquiredOrder, normalizedOwned.nextAcquiredOrder))),
      isBattle: state.isBattle === true,
      battleState: state.battleState && typeof state.battleState === "object" ? state.battleState : null,
      unlockedBugRanks: Array.isArray(state.unlockedBugRanks) && state.unlockedBugRanks.length ? state.unlockedBugRanks.slice() : fallback.unlockedBugRanks.slice(),
      defeatedBugCounts: normalizeDefeatedBugCounts(state.defeatedBugCounts),
      pendingBugRank: typeof state.pendingBugRank === "string" ? state.pendingBugRank : null,
      pendingBugSourceRank: typeof state.pendingBugSourceRank === "string" ? state.pendingBugSourceRank : null,
      totalBugDefeats: Math.max(0, Math.floor(clampNumber(state.totalBugDefeats, 0))),
      bugDefeatRateBonus: normalizeBugDefeatRateBonus(state.bugDefeatRateBonus),
      highestDefeatedBugRank: typeof state.highestDefeatedBugRank === "string" ? state.highestDefeatedBugRank : null,
      altarState: normalizeAltarState(state.altarState),
      dungeonState: normalizeDungeonState(state.dungeonState),
      dungeonStatBonus: normalizeDungeonStatBonus(state.dungeonStatBonus),
      dungeonRecords: normalizeDungeonRecords(state.dungeonRecords),
      rebirthState: normalizeRebirthState(state.rebirthState),
      zeroRelicState: normalizeZeroRelicState(state.zeroRelicState),
      permanentRelics: normalizePermanentRelics(state.permanentRelics),
      zeroSlimeRecords: normalizeZeroSlimeRecords(state.zeroSlimeRecords),
      voidState: normalizeVoidState(state.voidState),
      voidStatPenalty: normalizeDungeonStatBonus(state.voidStatPenalty),
      voidBattleState: normalizeVoidBattleState(state.voidBattleState),
      voidDungeonState: normalizeVoidDungeonState(state.voidDungeonState),
      voidSlimeRecords: normalizeVoidSlimeRecords(state.voidSlimeRecords),
      randomGodRecords: normalizeRandomGodRecords(state.randomGodRecords),
      randomRelicState: normalizeRandomRelicState(state.randomRelicState),
      autoButtonState: normalizeAutoButtonState(state.autoButtonState),
      tutorialState: normalizeTutorialState(state.tutorialState),
      achievementState: normalizeAchievementState(state.achievementState),
      relicRankTotal: normalizeRankTotals(state.relicRankTotal),
      totalDecomposeCount: Math.max(0, Math.floor(clampNumber(state.totalDecomposeCount, 0))),
      totalDecomposeStone: Math.max(0, Math.floor(clampNumber(state.totalDecomposeStone, 0))),
      highestRelicRank: typeof state.highestRelicRank === "string" ? state.highestRelicRank : null,
      discoveredRelics: normalizeDiscoveredRelics(state.discoveredRelics),
      maxRelicCount: Math.max(0, Math.floor(clampNumber(state.maxRelicCount, 0))),
      maxRelicLimitBreak: Math.max(0, Math.floor(clampNumber(state.maxRelicLimitBreak, 0))),
      rankMaxLimitBreak: normalizeRankLimitBreaks(state.rankMaxLimitBreak),
      specialFlags: normalizeSpecialFlags(state.specialFlags),
      ifUnlocked: state.ifUnlocked === true,
      bugLimitedRelicObtained: normalizeLimitedRelicState(state.bugLimitedRelicObtained),
      limitedRelicDiscovered: normalizeLimitedRelicDiscovered(state.limitedRelicDiscovered),
      highestObservedRank: typeof state.highestObservedRank === "string" ? state.highestObservedRank : null,
      observedIfProbability: state.observedIfProbability === true,
      infinityBugUnlocked: state.infinityBugUnlocked === true,
      infinityRateGrowth: Math.max(0, clampNumber(state.infinityRateGrowth, 0)),
      randomRateGrowthByShard: normalizeInfinityRateGrowthMap(state.randomRateGrowthByShard),
      creationRelicStatBonus: normalizeDungeonStatBonus(state.creationRelicStatBonus),
      infinityBugRecords: normalizeInfinityBugRecords(state.infinityBugRecords),
      evolutionCount: Math.max(0, Math.floor(clampNumber(state.evolutionCount, 0))),
      infinityCount: Math.max(0, Math.floor(clampNumber(state.infinityCount, 0))),
      infinityExecuted: state.infinityExecuted === true,
      specialLogUnlocked: state.specialLogUnlocked === true,
      ifRelicObtained: state.ifRelicObtained === true,
      infinityHistory: normalizeInfinityHistory(state.infinityHistory),
      normalLoopStartAt: clampNumber(state.normalLoopStartAt, fallback.normalLoopStartAt),
      settings: normalizeSettings(state.settings),
      recentBugSpawnGachaCounts: Array.isArray(state.recentBugSpawnGachaCounts)
        ? state.recentBugSpawnGachaCounts
            .map(function (value) { return Math.floor(clampNumber(value, -1)); })
            .filter(function (value) { return value >= 0; })
            .slice(-10)
        : []
    };

    backfillFromOwnedRelics(normalized);

    if (!normalized.highestObservedRank) {
      normalized.highestObservedRank = normalized.highestRelicRank;
    }

    if (normalized.ownedRelics.er_infinity_gate) {
      normalized.ifUnlocked = true;
      normalized.infinityBugUnlocked = true;
      normalized.bugLimitedRelicObtained.ER = true;
      normalized.limitedRelicDiscovered.er_infinity_gate = true;
    }
    if (normalized.ownedRelics.if_infinity) {
      normalized.ifRelicObtained = true;
    }
    if (normalized.ownedRelics.if_infinity || normalized.infinityCount >= 1) {
      normalized.voidState.unlocked = true;
    }
    if (normalized.observedIfProbability) {
      normalized.infinityBugUnlocked = true;
    }
    if (normalized.zeroRelicState.count > 0) {
      normalized.zeroRelicState.owned = true;
      normalized.zeroRelicState.limitBreak = Math.max(normalized.zeroRelicState.limitBreak, normalized.zeroRelicState.count - 1);
      if (normalized.discoveredRelics.indexOf("altar_zero_relic") === -1) {
        normalized.discoveredRelics.push("altar_zero_relic");
      }
    }
    if (normalized.permanentRelics.infinity_slime_relic.owned && normalized.discoveredRelics.indexOf("infinity_slime_relic") === -1) {
      normalized.discoveredRelics.push("infinity_slime_relic");
    }
    if (normalized.permanentRelics.zero_ending_relic.owned && normalized.discoveredRelics.indexOf("zero_ending_relic") === -1) {
      normalized.discoveredRelics.push("zero_ending_relic");
    }
    if (normalized.permanentRelics.if_random_relic.owned) {
      normalized.randomRelicState.owned = true;
      normalized.randomRelicState.enabled = normalized.permanentRelics.if_random_relic.enabled !== false;
      if (normalized.discoveredRelics.indexOf("if_random_relic") === -1) {
        normalized.discoveredRelics.push("if_random_relic");
      }
    }
    if (normalized.ownedRelics.ir_abyss_bug_slayer) {
      normalized.bugLimitedRelicObtained.IR = true;
      normalized.limitedRelicDiscovered.ir_abyss_bug_slayer = true;
    }
    if (normalized.ownedRelics.qr_deep_bug_slayer) {
      normalized.bugLimitedRelicObtained.QR = true;
      normalized.limitedRelicDiscovered.qr_deep_bug_slayer = true;
    }

    normalized.discoveredRelics = normalizeDiscoveredRelics(normalized.discoveredRelics);

    return normalized;
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(data.STORAGE_KEY);
      if (!raw) {
        var initialState = data.createInitialState(Date.now());
        saveState(initialState);
        return cloneState(initialState);
      }
      var loadedState = normalizeState(JSON.parse(raw));
      loadedState.autoButtonState.isRunning = false;
      loadedState.autoButtonState.startedAt = null;
      return loadedState;
    } catch (error) {
      var recoveredState = data.createInitialState(Date.now());
      saveState(recoveredState);
      return cloneState(recoveredState);
    }
  }

  function saveState(state) {
    var nextState = normalizeState(state);
    localStorage.setItem(data.STORAGE_KEY, JSON.stringify(nextState));
    return nextState;
  }

  function resetState() {
    localStorage.removeItem(data.STORAGE_KEY);
    var initialState = data.createInitialState(Date.now());
    saveState(initialState);
    return cloneState(initialState);
  }

  window.InfinityGachaStorage = {
    loadState: loadState,
    saveState: saveState,
    resetState: resetState
  };
})();
