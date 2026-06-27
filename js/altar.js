(function () {
  var data = window.InfinityGachaData;
  var engine = window.InfinityGachaEngine;
  var effects = window.InfinityGachaEffects;

  function randomPick(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function ensureAltarState(state) {
    if (!state.altarState) {
      state.altarState = { activeEvent: null, eventHistory: [], altarRelicObtained: {} };
    }
  }

  function getDiscountedCost(baseCost, state) {
    return effects.applyShopDiscount(baseCost, state);
  }

  function pushDiscountLog(logs, baseCost, finalCost, state) {
    var discountRate = effects.calculateShopDiscountRate(state);
    if (finalCost < baseCost && discountRate > 0) {
      logs.push("SSR割引の遺物により、価格が" + Math.round(discountRate * 100) + "%減少した。");
    }
  }

  function getAltarEventCost(type) {
    return (data.ALTAR_EVENT_CONFIG[type] || data.ALTAR_EVENT_CONFIG.normal).cost;
  }

  function getAltarEventDuration(type) {
    return (data.ALTAR_EVENT_CONFIG[type] || data.ALTAR_EVENT_CONFIG.normal).durationMs;
  }

  function getAltarEventPower(type) {
    return (data.ALTAR_EVENT_CONFIG[type] || data.ALTAR_EVENT_CONFIG.normal).power;
  }

  function repairEventText(event) {
    var definition;
    if (!event) {
      return null;
    }
    definition = data.ALTAR_EVENT_INDEX && data.ALTAR_EVENT_INDEX[event.effectId || event.id];
    if (definition) {
      event.effectName = definition.effectName;
      event.effectType = event.effectType || definition.effectType;
      if (!event.targetRank && definition.targetRank) {
        event.targetRank = definition.targetRank;
      }
      if (!event.targetGroup && definition.targetGroup) {
        event.targetGroup = definition.targetGroup.slice();
      }
    }
    return event;
  }

  function getActiveAltarEvent(state) {
    return state.altarState && state.altarState.activeEvent ? repairEventText(state.altarState.activeEvent) : null;
  }

  function isAltarEventActive(state) {
    var event = getActiveAltarEvent(state);
    return Boolean(event && event.endsAt > Date.now());
  }

  function clearExpiredAltarEvent(state) {
    ensureAltarState(state);
    if (!isAltarEventActive(state) && state.altarState.activeEvent) {
      state.altarState.activeEvent = null;
      return ["祭壇の光が消えた。", "イベント効果が終了しました。"];
    }
    return [];
  }

  function rollAltarEvent(type) {
    var pool = data.ALTAR_EVENT_POOL[type] || data.ALTAR_EVENT_POOL.normal || [];
    var effect = Object.assign({}, randomPick(pool));
    var power = getAltarEventPower(type);
    var now = Date.now();

    if (effect.effectType === "bug_spawn_add" || effect.effectType === "bug_spawn_subtract") {
      effect.value = type === "normal" ? 10 : (type === "super" ? 25 : 50);
    } else if (effect.effectType === "bug_reward_multiplier") {
      effect.multiplier = type === "normal" ? 1.5 : (type === "super" ? 3 : 10);
    } else if (effect.effectType === "stone_gain_multiplier" || effect.effectType === "decompose_multiplier" || effect.effectType === "miss_stone_multiplier") {
      effect.multiplier = power;
    } else if (effect.effectType === "high_rare_log_up") {
      effect.multiplier = type === "normal" ? 2 : (type === "super" ? 3 : 5);
    } else if (effect.effectType === "bug_rank_up") {
      effect.value = type === "normal" ? 1 : (type === "super" ? 2 : 3);
    } else {
      effect.multiplier = power;
    }

    effect.type = type;
    effect.effectId = effect.effectId || effect.id;
    effect.startedAt = now;
    effect.endsAt = now + getAltarEventDuration(type);
    return repairEventText(effect);
  }

  function startAltarEvent(state, type) {
    var cost;
    var baseCost;
    var event;
    var magnitude;

    ensureAltarState(state);

    if (isAltarEventActive(state)) {
      return { ok: false, logs: ["すでに祭壇イベントが発動中です。"] };
    }

    baseCost = getAltarEventCost(type);
    cost = getDiscountedCost(baseCost, state);
    if (state.stones < cost) {
      return { ok: false, logs: ["石が足りません。必要石：" + cost.toLocaleString("ja-JP")] };
    }

    state.stones -= cost;
    event = rollAltarEvent(type);
    state.altarState.activeEvent = event;
    state.altarState.eventHistory.push({
      type: event.type,
      effectId: event.effectId,
      effectName: event.effectName,
      startedAt: event.startedAt,
      endsAt: event.endsAt
    });
    state.altarState.eventHistory = state.altarState.eventHistory.slice(-20);

    magnitude = event.multiplier ? (event.multiplier + "倍") : ((event.value > 0 ? "+" : "-") + Math.abs(event.value) + "%");

    return {
      ok: true,
      logs: [
        (function () {
          var entries = [];
          pushDiscountLog(entries, baseCost, cost, state);
          return entries;
        })()[0] || null,
        "石を" + cost.toLocaleString("ja-JP") + "個捧げた。",
        type === "normal" ? "祭壇の奥で、確率が焼けた。" : (type === "super" ? "祭壇の奥で、確率が強く揺れた。" : "祭壇の奥で、確率そのものが軋んだ。"),
        data.ALTAR_EVENT_CONFIG[type].label + "発動。",
        Math.floor(getAltarEventDuration(type) / 60000) + "分間、" + event.effectName + "が" + magnitude + "になります。"
      ].filter(Boolean)
    };
  }

  function obtainAltarRelic(state, relicId) {
    var relic;
    var logs;
    var owned;
    var cost;
    var baseCost;

    ensureAltarState(state);

    relic = data.RELIC_INDEX[relicId];
    if (!relic || relic.obtainType !== "altar_only") {
      return { ok: false, logs: ["祭壇ではその遺物を扱えません。"] };
    }
    owned = state.ownedRelics[relicId];
    if (owned && relic.limitBreakable === false) {
      return { ok: false, logs: [relic.name + "はすでに所持しています。", "この遺物は凸できません。"] };
    }
    baseCost = relic.altarCost || 0;
    cost = getDiscountedCost(baseCost, state);
    if (state.stones < cost) {
      return { ok: false, logs: ["石が足りません。必要石：" + cost.toLocaleString("ja-JP")] };
    }

    state.stones -= cost;
    logs = [];
    pushDiscountLog(logs, baseCost, cost, state);
    logs.push("石を" + cost.toLocaleString("ja-JP") + "個捧げた。");

    if (relicId === "altar_ssr_long_press") {
      logs.push("祭壇の奥から、果ての見えない道が伸びた。");
    } else if (relicId === "altar_ssr_multi_10") {
      logs.push("祭壇の奥から遺物が現れた。");
    } else if (relicId === "altar_lr_multi_100") {
      logs.push("祭壇の奥で世界が回転した。");
    } else if (relicId === "altar_lr_auto_start") {
      logs.push(owned ? "祭壇の奥で、誰も触れていないボタンが再び沈んだ。" : "祭壇の奥で、誰も触れていないボタンが沈んだ。");
    } else {
      logs.push("祭壇の奥で、無数の世界が重なった。");
    }

    engine.acquireRelic(state, relicId, logs);
    state.altarState.altarRelicObtained[relicId] = true;

    if (relicId === "altar_ssr_long_press") {
      logs.push("メインボタンの長押しが解放されました。");
    } else if (relicId === "altar_ssr_multi_10") {
      logs.push("10連ガチャが解放されました。");
    } else if (relicId === "altar_lr_multi_100") {
      logs.push("100連ガチャが解放されました。");
    } else if (relicId === "altar_lr_auto_start") {
      logs.push(owned ? "LR自動起動の遺物が再起動した。" : "自動起動が解放されました。");
    } else {
      logs.push("全石ガチャが解放されました。");
    }

    return { ok: true, logs: logs };
  }

  function getActiveAltarEffectSummary(state) {
    var event = getActiveAltarEvent(state);
    if (!event || event.endsAt <= Date.now()) {
      return { active: false, text: "発動中のイベントはありません。" };
    }
    return {
      active: true,
      text: event.effectName + " / 残り" + Math.max(0, Math.ceil((event.endsAt - Date.now()) / 1000)) + "秒"
    };
  }

  function getNextRebirthBonusPreview(state) {
    return effects.calculateNextRebirthBaseRateBonus(state);
  }

  function buyZeroRelic(state) {
    var zeroRelic = state.zeroRelicState || data.createZeroRelicState();
    var baseCost = 100000;
    var cost = getDiscountedCost(baseCost, state);
    if (zeroRelic.purchasedThisLife) {
      return { ok: false, logs: ["この周回では、すでに0の遺物を購入しています。", "転生後、再び購入できるようになります。"] };
    }
    if (state.stones < cost) {
      return { ok: false, logs: ["石が足りません。必要石：" + cost.toLocaleString("ja-JP")] };
    }

    state.stones -= cost;
    zeroRelic.owned = true;
    zeroRelic.enabled = true;
    zeroRelic.count = Math.max(0, zeroRelic.count || 0) + 1;
    zeroRelic.limitBreak = Math.max(0, zeroRelic.count - 1);
    zeroRelic.purchasedThisLife = true;
    state.zeroRelicState = zeroRelic;
    if (state.discoveredRelics.indexOf("altar_zero_relic") === -1) {
      state.discoveredRelics.push("altar_zero_relic");
    }

    return {
      ok: true,
      logs: (function () {
        var entries = [];
        pushDiscountLog(entries, baseCost, cost, state);
        entries.push("石を" + cost.toLocaleString("ja-JP") + "個捧げた。");
        entries.push("祭壇の奥に、0が浮かび上がった。");
        entries.push(zeroRelic.count === 1 ? "0の遺物を獲得した。" : "0の遺物が重なった。");
        entries.push(zeroRelic.count === 1 ? "転生時、素の確率が強化されるようになった。" : ("0の遺物が" + zeroRelic.limitBreak + "凸になった。"));
        return entries;
      })()
    };
  }

  function createRebirthHistoryEntry(state, gainedBonus) {
    return {
      count: ((state.rebirthState && state.rebirthState.rebirthCount) || 0) + 1,
      executedAt: Date.now(),
      hadZeroRelic: Boolean(state.zeroRelicState && state.zeroRelicState.owned && state.zeroRelicState.enabled),
      zeroRelicLimitBreak: (state.zeroRelicState && state.zeroRelicState.limitBreak) || 0,
      gainedBaseRateBonus: gainedBonus,
      totalBaseRateBonus: ((state.rebirthState && state.rebirthState.baseRateRebirthBonus) || 0) + gainedBonus,
      totalGachaCount: state.totalGachaCount || 0,
      highestRelicRank: state.highestObservedRank || state.highestRelicRank || null
    };
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

  function executeRebirth(state) {
    var baseCost = 10000;
    var cost = getDiscountedCost(baseCost, state);
    if (state.isBattle) {
      return { ok: false, logs: ["戦闘中は転生できません。"] };
    }
    if (state.stones < cost) {
      return { ok: false, logs: ["石が足りません。必要石：" + cost.toLocaleString("ja-JP")] };
    }

    state.stones -= cost;
    var hasZeroRelic = Boolean(state.zeroRelicState && state.zeroRelicState.owned);
    var message = hasZeroRelic
      ? "転生します。\n通常データは初期化されます。\n無限の遺物、0の遺物、スライムの遺物、実績、図鑑、累計記録は保存されます。\n本当に転生しますか？"
      : "0の遺物を所持していません。\nこの状態で転生しても、素の確率上昇はほとんどありません。\nそれでも転生しますか？";
    if (!window.confirm(message)) {
      state.stones += cost;
      return { ok: false, logs: ["転生を取りやめた。"] };
    }

    var gainedBonus = getNextRebirthBonusPreview(state);
    var nextState = data.createInitialState(Date.now());
    var history = (state.rebirthState && Array.isArray(state.rebirthState.history)) ? state.rebirthState.history.slice() : [];
    var entry = createRebirthHistoryEntry(state, gainedBonus);
    history.push(entry);

    nextState.achievementState = filterPersistentAchievementState(state.achievementState);
    nextState.discoveredRelics = [];
    nextState.totalGachaCount = 0;
    nextState.totalBugDefeats = 0;
    nextState.totalMissCount = 0;
    nextState.dungeonRecords = createPersistentDungeonRecords(state);
    nextState.rebirthState = JSON.parse(JSON.stringify(state.rebirthState || nextState.rebirthState));
    nextState.rebirthState.rebirthCount = entry.count;
    nextState.rebirthState.baseRateRebirthBonus = entry.totalBaseRateBonus;
    nextState.rebirthState.lastRebirthAt = entry.executedAt;
    nextState.rebirthState.history = history.slice(-100);
    nextState.tutorialState = JSON.parse(JSON.stringify(state.tutorialState || nextState.tutorialState));
    nextState.zeroRelicState = JSON.parse(JSON.stringify(state.zeroRelicState || nextState.zeroRelicState));
    nextState.zeroRelicState.purchasedThisLife = false;
    nextState.permanentRelics = JSON.parse(JSON.stringify(state.permanentRelics || nextState.permanentRelics));
    nextState.zeroSlimeRecords = JSON.parse(JSON.stringify(state.zeroSlimeRecords || nextState.zeroSlimeRecords));
    nextState.infinityCount = state.infinityCount || 0;
    nextState.infinityExecuted = state.infinityExecuted === true;
    nextState.infinityHistory = JSON.parse(JSON.stringify(state.infinityHistory || nextState.infinityHistory));
    nextState.specialLogUnlocked = state.specialLogUnlocked === true;
    nextState.settings = JSON.parse(JSON.stringify(state.settings || nextState.settings));
    nextState.totalDecomposeCount = 0;
    nextState.totalDecomposeStone = 0;
    nextState.highestRelicRank = null;
    nextState.highestObservedRank = null;
    nextState.maxRelicCount = 0;
    nextState.maxRelicLimitBreak = 0;
    nextState.rankMaxLimitBreak = data.createRankLimitBreakObject();
    nextState.specialFlags = JSON.parse(JSON.stringify(data.createInitialState(Date.now()).specialFlags));
    nextState.normalLoopStartAt = Date.now();
    nextState.logs = [];

    return {
      ok: true,
      state: nextState,
      logs: (function () {
        var entries = [];
        pushDiscountLog(entries, baseCost, cost, state);
        if (gainedBonus > 0) {
          entries.push("石を" + cost.toLocaleString("ja-JP") + "個捧げた。", "転生が開始された。", "世界が初期化された。", "素の確率が上昇した。");
        } else {
          entries.push("石を" + cost.toLocaleString("ja-JP") + "個捧げた。", "転生が開始された。", "しかし、0の遺物は存在しなかった。", "ほとんど何も変わらないまま、世界だけが戻った。");
        }
        return entries;
      })()
    };
  }

  window.InfinityGachaAltar = {
    getAltarEventCost: getAltarEventCost,
    getAltarEventDuration: getAltarEventDuration,
    getAltarEventPower: getAltarEventPower,
    getActiveAltarEvent: getActiveAltarEvent,
    getActiveAltarEffectSummary: getActiveAltarEffectSummary,
    isAltarEventActive: isAltarEventActive,
    clearExpiredAltarEvent: clearExpiredAltarEvent,
    rollAltarEvent: rollAltarEvent,
    startAltarEvent: startAltarEvent,
    obtainAltarRelic: obtainAltarRelic,
    buyZeroRelic: buyZeroRelic,
    executeRebirth: executeRebirth,
    getNextRebirthBonusPreview: getNextRebirthBonusPreview
  };
})();
