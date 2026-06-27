(function () {
  var data = window.InfinityGachaData;

  function calculateInfinityMultiplier(state) {
    return Math.pow(2, Math.max(0, state.infinityCount || 0));
  }

  function buildInfinityHistoryEntry(state, nextCount) {
    return {
      count: nextCount,
      executedAt: Date.now(),
      totalGachaCount: state.totalGachaCount || 0,
      highestRelicRank: state.highestObservedRank || state.highestRelicRank || "N",
      multiplier: Math.pow(2, nextCount)
    };
  }

  function getInfinityWarningText() {
    return [
      "無限を実行します。",
      "石、所持遺物、通常の戦闘進行、ステータス、バグ撃破倍率は初期化されます。",
      "累計実績や解放済み記録の一部は引き継がれます。",
      "本当に無限へ進みますか？"
    ].join("\n");
  }

  function confirmInfinity() {
    return window.confirm(getInfinityWarningText());
  }

  function filterPersistentAchievementState(achievementState) {
    var source = achievementState || { claimed: {}, announced: {} };
    var keep = {};

    Object.keys(data.ACHIEVEMENT_INDEX || {}).forEach(function (achievementId) {
      if (
        achievementId.indexOf("infinity") !== -1 ||
        achievementId.indexOf("zero") !== -1 ||
        achievementId.indexOf("rebirth_") === 0
      ) {
        keep[achievementId] = true;
      }
    });

    var claimed = {};
    var announced = {};
    Object.keys(source.claimed || {}).forEach(function (achievementId) {
      if (keep[achievementId] && source.claimed[achievementId]) {
        claimed[achievementId] = true;
      }
    });
    Object.keys(source.announced || {}).forEach(function (achievementId) {
      if (keep[achievementId] && source.announced[achievementId]) {
        announced[achievementId] = true;
      }
    });

    return {
      claimed: claimed,
      announced: announced
    };
  }

  function createPersistentDungeonRecords(state) {
    var records = data.createDungeonRecords();
    var source = state && state.dungeonRecords ? state.dungeonRecords : {};
    records.totalInfinitySlimeEncounters = source.totalInfinitySlimeEncounters || 0;
    records.totalInfinitySlimeDefeats = source.totalInfinitySlimeDefeats || 0;
    records.totalZeroSlimeEncounters = source.totalZeroSlimeEncounters || 0;
    records.totalZeroSlimeDefeats = source.totalZeroSlimeDefeats || 0;
    return records;
  }

  function executeInfinity(state) {
    var nextCount = (state.infinityCount || 0) + 1;
    var nextState = data.createInitialState(Date.now());
    var history = Array.isArray(state.infinityHistory) ? state.infinityHistory.slice() : [];

    history.push(buildInfinityHistoryEntry(state, nextCount));

    nextState.achievementState = filterPersistentAchievementState(state.achievementState);
    nextState.discoveredRelics = [];
    nextState.totalGachaCount = 0;
    nextState.totalMissCount = 0;
    nextState.relicRankTotal = data.createRankTotalObject();
    nextState.totalBugDefeats = 0;
    nextState.defeatedBugCounts = data.createDefeatedBugCounts();
    nextState.totalDecomposeCount = 0;
    nextState.totalDecomposeStone = 0;
    nextState.dungeonRecords = createPersistentDungeonRecords(state);
    nextState.rebirthState = JSON.parse(JSON.stringify(state.rebirthState || data.createRebirthState()));
    nextState.zeroRelicState = JSON.parse(JSON.stringify(state.zeroRelicState || data.createZeroRelicState()));
    nextState.permanentRelics = JSON.parse(JSON.stringify(state.permanentRelics || data.createPermanentRelics()));
    nextState.zeroSlimeRecords = JSON.parse(JSON.stringify(state.zeroSlimeRecords || data.createZeroSlimeRecords()));
    nextState.tutorialState = JSON.parse(JSON.stringify(state.tutorialState || nextState.tutorialState));
    nextState.highestRelicRank = null;
    nextState.highestObservedRank = null;
    nextState.maxRelicCount = 0;
    nextState.maxRelicLimitBreak = 0;
    nextState.rankMaxLimitBreak = data.createRankLimitBreakObject();
    nextState.specialFlags = JSON.parse(JSON.stringify(data.createInitialState(Date.now()).specialFlags));
    nextState.bugLimitedRelicObtained = JSON.parse(JSON.stringify(state.bugLimitedRelicObtained || nextState.bugLimitedRelicObtained));
    nextState.limitedRelicDiscovered = JSON.parse(JSON.stringify(state.limitedRelicDiscovered || nextState.limitedRelicDiscovered));
    nextState.recentBugSpawnGachaCounts = [];
    nextState.infinityCount = nextCount;
    nextState.infinityExecuted = true;
    nextState.specialLogUnlocked = state.specialLogUnlocked === true || state.ifRelicObtained === true;
    nextState.ifRelicObtained = false;
    nextState.infinityHistory = history;
    nextState.normalLoopStartAt = Date.now();
    nextState.logs = [];
    nextState.zeroRelicState.purchasedThisLife = false;

    var multiplier = calculateInfinityMultiplier(nextState);
    var logs = [
      "無限が実行された。",
      "これまでの通常データは消去された。",
      "だが、観測の記録だけは残った。",
      "世界が反転した。",
      nextCount === 1 ? "今回は初回の無限到達だ。" : "今回は" + nextCount + "回目の無限到達だ。",
      "確率が再構築された。",
      nextCount === 1 ? "新しい周回が始まっている。" : "周回の重みだけが残っている。",
      "全遺物効果倍率が" + multiplier.toLocaleString("ja-JP") + "倍になった。"
    ];

    return {
      state: nextState,
      logs: logs
    };
  }

  window.InfinityGachaInfinity = {
    calculateInfinityMultiplier: calculateInfinityMultiplier,
    buildInfinityHistoryEntry: buildInfinityHistoryEntry,
    getInfinityWarningText: getInfinityWarningText,
    confirmInfinity: confirmInfinity,
    executeInfinity: executeInfinity
  };
})();
