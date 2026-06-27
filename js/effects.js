(function () {
  var data = window.InfinityGachaData;

  function roundDisplay(value) {
    return Math.round(value * 10000) / 10000;
  }

  function calculateLimitBreakGrowthMultiplier(rank, limitBreak) {
    var baseRate = data.CONVEX_BONUS_BY_RANK[rank] || 0;
    var remaining = Math.max(0, limitBreak || 0);
    var bonus = 0;

    if (baseRate <= 0 || remaining <= 0) {
      return 1;
    }

    (data.LIMIT_BREAK_GROWTH_TIERS || []).forEach(function (tier) {
      if (remaining <= 0) {
        return;
      }
      var tierSize = Math.max(0, Math.min(remaining, (tier.end - tier.start + 1)));
      if (tierSize > 0) {
        bonus += tierSize * baseRate * tier.multiplier;
        remaining -= tierSize;
      }
    });

    if (remaining > 0) {
      var step = 1;
      while (remaining > 0) {
        var chunk = Math.min(remaining, 100);
        var growthMultiplier;

        if (data.LIMIT_BREAK_GROWTH_MODE === "exponential_step") {
          growthMultiplier = Math.pow(10, step);
        } else {
          growthMultiplier = step * 10;
        }

        bonus += chunk * baseRate * growthMultiplier;
        remaining -= chunk;
        step += 1;
      }
    }

    return 1 + bonus;
  }

  function getConvexBonus(rank, count) {
    var limitBreak = Math.max(0, (count || 1) - 1);
    return calculateLimitBreakGrowthMultiplier(rank, limitBreak);
  }

  function applyConvexToMultiplier(baseMultiplier, convexBonus) {
    return 1 + ((baseMultiplier - 1) * convexBonus);
  }

  function statName(key) {
    var labels = {
      hp: "HP",
      attack: "攻撃",
      defense: "防御",
      speed: "速度",
      luck: "運",
      accuracy: "命中",
      evasion: "回避率",
      criticalRate: "会心率",
      criticalDamage: "会心ダメージ"
    };
    return labels[key] || key;
  }

  function formatTinyPercent(value) {
    if (value <= 0) {
      return "0%";
    }
    return value.toExponential(6).replace("+", "") + "%";
  }

  function formatRateDisplay(value, displayRate) {
    if (displayRate) {
      return displayRate;
    }
    if (value === null || value === undefined || !isFinite(value)) {
      return "0%";
    }
    if (value === 0) {
      return "0%";
    }
    if (value >= 1) {
      return Number(value).toFixed(2).replace(/\.00$/, "").replace(/(\.\d*[1-9])0+$/, "$1") + "%";
    }
    if (value >= 0.000001) {
      return String(value.toFixed(12)).replace(/0+$/, "").replace(/\.$/, "") + "%";
    }
    return formatTinyPercent(value);
  }

  function getDefaultBugDefeatRateBonus() {
    return data.createBugDefeatRateBonus();
  }

  function getBugDefeatBonusIncrease(rank) {
    return data.BUG_DEFEAT_RATE_BONUS_INCREASE[rank] || 0;
  }

  function getBugDefeatBonusCap(rank) {
    return data.BUG_DEFEAT_RATE_BONUS_CAP[rank] || 1;
  }

  function getActiveAltarEvent(state) {
    var event = state && state.altarState && state.altarState.activeEvent && state.altarState.activeEvent.endsAt > Date.now()
      ? state.altarState.activeEvent
      : null;
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

  function calculateAltarRateBonus(state) {
    var event = getActiveAltarEvent(state);
    if (!event) {
      return {};
    }
    var result = {};
    if (event.effectType === "rank_rate_up") {
      result[event.targetRank] = event.multiplier || 1;
    } else if (event.effectType === "group_rate_up" && Array.isArray(event.targetGroup)) {
      event.targetGroup.forEach(function (rank) {
        result[rank] = event.multiplier || 1;
      });
    }
    return result;
  }

  function calculateAltarBugSpawnModifier(state) {
    var event = getActiveAltarEvent(state);
    if (!event) {
      return 0;
    }
    if (event.effectType === "bug_spawn_add") {
      return event.value || 0;
    }
    if (event.effectType === "bug_spawn_subtract") {
      return -(event.value || 0);
    }
    return 0;
  }

  function calculateAltarBugRewardMultiplier(state) {
    var event = getActiveAltarEvent(state);
    return event && event.effectType === "bug_reward_multiplier" ? (event.multiplier || 1) : 1;
  }

  function calculateAltarStoneMultiplier(state) {
    var event = getActiveAltarEvent(state);
    if (!event) {
      return { all: 1, miss: 1, highRareLog: 1 };
    }
    return {
      all: event.effectType === "stone_gain_multiplier" ? (event.multiplier || 1) : 1,
      miss: event.effectType === "miss_stone_multiplier" ? (event.multiplier || 1) : 1,
      highRareLog: event.effectType === "high_rare_log_up" ? (event.multiplier || 1) : 1
    };
  }

  function calculateAltarDecomposeMultiplier(state) {
    var event = getActiveAltarEvent(state);
    return event && event.effectType === "decompose_multiplier" ? (event.multiplier || 1) : 1;
  }

  function calculateAltarBugRankBonus(state) {
    var event = getActiveAltarEvent(state);
    return event && event.effectType === "bug_rank_up" ? Math.max(0, Math.floor(event.value || 0)) : 0;
  }

  function targetName(key) {
    var labels = {
      MISS: "はずれ",
      N: "N",
      S: "S",
      SR: "SR",
      SSR: "SSR",
      SSSR: "SSSR",
      UR: "UR",
      AR: "AR",
      LR: "LR",
      GR: "GR",
      BR: "BR",
      QR: "QR",
      IR: "IR",
      ER: "ER",
      all: "全体",
      all_relic: "全遺物",
      all_final: "全石獲得",
      miss: "ハズレ時",
      total_10: "ガチャ10回ごと",
      miss_10: "ハズレ10回ごと",
      bug: "バグ",
      self_percent: "自身HP割合",
      S_PLUS: "S以上",
      BR_PLUS: "BR以上",
      QR_PLUS: "QR以上",
      UR_PLUS_LOWEST: "最低UR以上",
      HIGH_RARE_LOWEST: "最低高レア",
      battle_stat_multiplier: "戦闘後ステータス倍率",
      battle_final_damage_multiplier: "最終与ダメ倍率",
      battle_final_damage_reduction: "最終被ダメ倍率",
      miss_stone_chance: "ハズレ時石発生率",
      miss_stone_chance_multiplier: "ハズレ時石発生率倍率",
      lower_rate_boost_multiplier: "低位高レア補正",
      gacha_cost_plus: "ガチャ追加消費",
      reroll_fail_stone: "再抽選失敗時石",
      random_log_stone: "観測追加石",
      redirect_to_ur: "UR以上へ振替",
      ir_or_higher_rate: "IR以上最終確率",
      er_or_higher_rate: "ER以上最終確率",
      miss_rate_subtract_flat: "はずれ減少",
      bonus_bug_relic_drop: "追加遺物",
      bonus_bug_relic_drop_qr: "QR以上追加遺物",
      bonus_bug_relic_drop_ir: "IR以上追加遺物",
      if_unlock: "IF表示解放",
      infinity_bug_damage_reduction: "∞バグ被ダメ軽減",
      infinity_bug_damage_bonus: "∞バグ与ダメ上昇",
      set_infinity_bug_defense: "∞バグ防御固定",
      infinity_rate_growth_per_gacha: "∞確率成長",
      random_rate_growth: "ランダム確率成長",
      double_random_rate_growth: "ランダム確率成長倍率",
      all_stats_growth_after_bug_win: "バグ勝利後全能力成長",
      void_stat_loss_reduce_to_one: "虚無侵食抑制",
      minimum_base_rate: "最低基礎確率",
      selective_rate_control: "乱数操作",
      all_stats: "全ステータス",
      bug_spawn_add: "バグ出現率加算",
      bug_spawn_subtract: "バグ出現率減少",
      battle_victory_heal: "勝利時回復",
      manual_attack_bonus: "手動攻撃加算",
      extra_attack_damage: "追加攻撃ダメージ",
      battle_damage_bonus: "戦闘与ダメ補正",
      boss_bug_damage_bonus: "ボスバグ与ダメ補正",
      low_hp_defense_bonus: "低HP防御補正",
      dismantle_stone: "分解石加算",
      dismantle_bonus: "分解石倍率",
      er: "ER再抽選",
      ir: "IR再抽選",
      qr: "QR再抽選",
      br: "BR再抽選",
      reject: "拒絶再抽選",
      N_TO_SSSR: "N〜SSSR再抽選"
    };
    return labels[key] || statName(key);
  }

  function calculateRelicEffectValue(relic, ownedData) {
    var convexBonus = getConvexBonus(relic.rank, ownedData ? ownedData.count : 1);
    var infinityMultiplier = calculateInfinityMultiplier(ownedData && ownedData.state ? ownedData.state : null);
    return relic.effects.map(function (effect) {
      var currentValue;
      if (effect.effectType === "free_gacha_interval") {
        currentValue = effect.value;
      } else if (effect.effectType === "special" && effect.target === "minimum_base_rate") {
        currentValue = Math.min(50, effect.value + Math.max(0, (ownedData ? ownedData.count : 1) - 1));
      } else if (
        effect.effectType === "final_rate_multiplier" ||
        effect.effectType === "stone_gain_multiplier" ||
        effect.effectType === "bug_reward_multiplier" ||
        effect.effectType === "rate_group_multiplier" ||
        effect.effectType === "reroll_on_miss" ||
        effect.effectType === "miss_convert"
      ) {
        currentValue = applyConvexToMultiplier(effect.value, convexBonus);
      } else if (
        effect.effectType === "special" &&
        (
          effect.target === "battle_stat_multiplier" ||
          effect.target === "battle_final_damage_multiplier" ||
          effect.target === "battle_final_damage_reduction" ||
          effect.target === "miss_stone_chance_multiplier" ||
          effect.target === "lower_rate_boost_multiplier" ||
          effect.target === "gacha_cost_plus" ||
          effect.target === "reroll_fail_stone"
        )
      ) {
        if (effect.target === "gacha_cost_plus" || effect.target === "reroll_fail_stone") {
          currentValue = effect.value;
        } else {
          currentValue = applyConvexToMultiplier(effect.value, convexBonus);
        }
      } else {
        currentValue = effect.value * convexBonus;
      }

      currentValue = applyInfinityMultiplierToEffect(currentValue, effect.effectType, effect.target, infinityMultiplier);

      return {
        effectType: effect.effectType,
        target: effect.target,
        baseValue: effect.value,
        currentValue: currentValue,
        phase: effect.phase
      };
    });
  }

  function calculateInfinityMultiplier(state) {
    return Math.pow(2, Math.max(0, state && state.infinityCount ? state.infinityCount : 0));
  }

  function calculateNextInfinityMultiplier(state) {
    return Math.pow(2, Math.max(0, (state && state.infinityCount ? state.infinityCount : 0) + 1));
  }

  function getZeroRelicState(state) {
    return state && state.zeroRelicState ? state.zeroRelicState : data.createZeroRelicState();
  }

  function getPermanentRelicState(state, relicId) {
    var permanentRelics = state && state.permanentRelics ? state.permanentRelics : data.createPermanentRelics();
    return permanentRelics[relicId] || { owned: false, enabled: false };
  }

  function hasVoidRelic(state) {
    var relic = state && state.ownedRelics ? state.ownedRelics.er_void_relic : null;
    return Boolean(relic && relic.enabled !== false);
  }

  function isVoidLikeBattle(battleState) {
    return Boolean(battleState && (battleState.isVoidBattle || battleState.isVoidSlimeBattle));
  }

  function calculateZeroRelicGrowthMultiplier(stateOrLimitBreak) {
    var limitBreak = typeof stateOrLimitBreak === "number"
      ? stateOrLimitBreak
      : Math.max(0, (getZeroRelicState(stateOrLimitBreak).limitBreak || 0));
    return calculateLimitBreakGrowthMultiplier("0", limitBreak);
  }

  function getBaseRateRebirthBonus(state) {
    return state && state.rebirthState ? Math.max(0, state.rebirthState.baseRateRebirthBonus || 0) : 0;
  }

  function calculateBaseRateWithRebirth(baseRate, state) {
    return baseRate * (1 + getBaseRateRebirthBonus(state));
  }

  function getZeroRelicRateMultiplier(state) {
    var zeroRelic = getZeroRelicState(state);
    if (!zeroRelic.owned || zeroRelic.enabled !== true) {
      return 1;
    }
    return calculateZeroRelicGrowthMultiplier(zeroRelic.limitBreak || 0);
  }

  function calculateNextRebirthBaseRateBonus(state) {
    var zeroRelic = getZeroRelicState(state);
    if (!zeroRelic.owned || zeroRelic.enabled !== true) {
      return 0;
    }
    return 0.01 * calculateZeroRelicGrowthMultiplier(zeroRelic.limitBreak || 0);
  }

  function calculateZeroEndingMinimumBaseRate(state) {
    var relic = getPermanentRelicState(state, "zero_ending_relic");
    if (!relic.owned || relic.enabled === false) {
      return 0;
    }
    return Math.min(50, 1 + Math.max(0, relic.limitBreak || 0));
  }

  function applyZeroEndingMinimumBaseRate(baseRate, state) {
    return Math.max(baseRate, calculateZeroEndingMinimumBaseRate(state));
  }

  function calculateRandomRelicRateMultiplier(state, rank) {
    var relic = getPermanentRelicState(state, "if_random_relic");
    var randomRelicState = state && state.randomRelicState ? state.randomRelicState : data.createRandomRelicState();
    if (!relic.owned || relic.enabled === false || !randomRelicState.owned || randomRelicState.enabled === false) {
      return 1;
    }
    return randomRelicState.selectedRank === rank ? 10 : 1;
  }

  function getSlimeGrowthMultiplier(state) {
    var permanentRelic = getPermanentRelicState(state, "infinity_slime_relic");
    return permanentRelic.owned && permanentRelic.enabled !== false ? 2 : 1;
  }

  function applyInfinityMultiplierToEffect(value, effectType, target, infinityMultiplier) {
    if (!infinityMultiplier || infinityMultiplier === 1) {
      return value;
    }

    if (effectType === "free_gacha_interval") {
      return value;
    }

    if (effectType === "special" && (target === "if_unlock" || target === "infinity_trigger" || target === "set_infinity_bug_defense" || target === "minimum_base_rate" || target === "void_stat_loss_reduce_to_one")) {
      return value;
    }

    if (
      effectType === "final_rate_multiplier" ||
      effectType === "bug_reward_multiplier" ||
      effectType === "rate_group_multiplier" ||
      (effectType === "stone_gain_multiplier" && target !== "miss") ||
      (effectType === "special" && (
        target === "battle_stat_multiplier" ||
        target === "battle_final_damage_multiplier" ||
        target === "battle_final_damage_reduction" ||
        target === "miss_stone_chance_multiplier" ||
        target === "lower_rate_boost_multiplier"
      ))
    ) {
      return 1 + (value - 1) * infinityMultiplier;
    }

    return value * infinityMultiplier;
  }

  function getEffectImplementationStatus(relic) {
    if (!relic.effects || !relic.effects.length) {
      return { code: "unimplemented", label: "未実装", phase: null };
    }

    var minPhase = null;
    var hasImplemented = false;

    relic.effects.forEach(function (effect) {
      if (typeof effect.phase === "number") {
        if (minPhase === null || effect.phase < minPhase) {
          minPhase = effect.phase;
        }
        if (effect.phase <= 8) {
          hasImplemented = true;
        }
      }
    });

    if (hasImplemented) {
      return { code: "active", label: "反映中", phase: minPhase };
    }
    if (minPhase !== null) {
      return { code: "future", label: "フェーズ" + minPhase + "で反映予定", phase: minPhase };
    }
    return { code: "unimplemented", label: "未実装", phase: null };
  }

  function getAllRelicViews(state) {
    return data.RELICS.map(function (relic) {
      var ownedData = state.ownedRelics[relic.id] || null;
      var discovered = Array.isArray(state.discoveredRelics) && state.discoveredRelics.indexOf(relic.id) !== -1;
      if (!discovered && relic.id === "if_infinity" && (state.ifRelicObtained === true || (state.infinityCount || 0) > 0)) {
        discovered = true;
      }
      if (!ownedData && relic.id === "altar_zero_relic") {
        var zeroRelic = getZeroRelicState(state);
        if (zeroRelic.owned) {
          ownedData = {
            count: Math.max(1, zeroRelic.count || 1),
            enabled: zeroRelic.enabled !== false,
            acquiredOrder: 0
          };
        }
      }
      if (!ownedData && relic.id === "infinity_slime_relic") {
        var permanentRelic = getPermanentRelicState(state, relic.id);
        if (permanentRelic.owned) {
          ownedData = {
            count: Math.max(1, permanentRelic.count || 1),
            enabled: permanentRelic.enabled !== false,
            acquiredOrder: 0
          };
        }
      }
      if (!ownedData && relic.permanent === true && relic.id !== "infinity_slime_relic") {
        var genericPermanentRelic = getPermanentRelicState(state, relic.id);
        if (genericPermanentRelic.owned) {
          ownedData = {
            count: Math.max(1, genericPermanentRelic.count || 1),
            enabled: genericPermanentRelic.enabled !== false,
            acquiredOrder: 0
          };
        }
      }
      return {
        id: relic.id,
        rank: relic.rank,
        name: relic.name,
        description: relic.description,
        discovered: discovered,
        owned: Boolean(ownedData),
        count: ownedData ? ownedData.count : 0,
        limitBreak: relic.id === "altar_zero_relic"
          ? (ownedData ? Math.max(0, getZeroRelicState(state).limitBreak || 0) : null)
          : (ownedData ? Math.max(0, ownedData.count - 1) : null),
        enabled: ownedData ? ownedData.enabled !== false : false,
        acquiredOrder: ownedData ? ownedData.acquiredOrder : null,
        obtainType: relic.obtainType || "gacha",
        dropBugRank: relic.dropBugRank || null,
        uiRank: relic.uiRank || relic.rank,
        altarCost: relic.altarCost || 0,
        limitBreakable: relic.limitBreakable !== false,
        decomposable: relic.decomposable !== false,
        autoEnableOnFirstGet: relic.autoEnableOnFirstGet !== false,
        limitBreakGrowthMultiplier: calculateLimitBreakGrowthMultiplier(relic.rank, ownedData ? Math.max(0, ownedData.count - 1) : 0),
        effectValues: calculateRelicEffectValue(relic, ownedData ? { count: ownedData.count, state: state } : { count: 1, state: state }),
        implementationStatus: getEffectImplementationStatus(relic)
      };
    });
  }

  function getOwnedRelicsByEnabled(state, enabled, options) {
    options = options || {};
    return getAllRelicViews(state).filter(function (view) {
      if (options.excludeRelicId && view.id === options.excludeRelicId) {
        return false;
      }
      return view.owned && view.enabled === enabled;
    });
  }

  function describeEffect(effectInfo) {
    var current = roundDisplay(effectInfo.currentValue);
    var base = roundDisplay(effectInfo.baseValue);
    var rawCurrent = effectInfo.currentValue;
    var rawBase = effectInfo.baseValue;
    var target = targetName(effectInfo.target);

    switch (effectInfo.effectType) {
      case "stat_flat":
        return { category: "加算", target: statName(effectInfo.target), currentLabel: statName(effectInfo.target) + "+" + current, baseLabel: statName(effectInfo.target) + "+" + base };
      case "all_stats_flat":
        return { category: "全能力加算", target: "全ステータス", currentLabel: "全ステータス+" + current, baseLabel: "全ステータス+" + base };
      case "stat_multiplier":
        return { category: "乗算", target: statName(effectInfo.target), currentLabel: statName(effectInfo.target) + "+" + roundDisplay(current * 100) + "%", baseLabel: statName(effectInfo.target) + "+" + roundDisplay(base * 100) + "%" };
      case "rate_add":
        return { category: "確率加算", target: target, currentLabel: target + "確率+" + current + "%", baseLabel: target + "確率+" + base + "%" };
      case "rate_subtract":
        return { category: "確率減少", target: target, currentLabel: target + "確率-" + current + "%", baseLabel: target + "確率-" + base + "%" };
      case "final_rate_multiplier":
        return { category: "最終確率倍率", target: target, currentLabel: "最終確率" + current + "倍", baseLabel: "最終確率" + base + "倍" };
      case "rate_group_multiplier":
        return { category: "確率範囲倍率", target: target, currentLabel: target + " " + current + "倍", baseLabel: target + " " + base + "倍" };
      case "stone_gain_flat":
        return { category: "石加算", target: target, currentLabel: "石+" + current, baseLabel: "石+" + base };
      case "stone_gain_multiplier":
        return { category: "石倍率", target: target, currentLabel: "石獲得" + current + "倍", baseLabel: "石獲得" + base + "倍" };
      case "miss_stone_flat":
        return { category: "ハズレ石", target: target, currentLabel: "ハズレ時に石+" + current, baseLabel: "ハズレ時に石+" + base };
      case "idle_stone_flat":
        return { category: "放置石", target: target, currentLabel: "10秒ごとに石+" + current, baseLabel: "10秒ごとに石+" + base };
      case "gacha_count_bonus":
        return { category: "回数報酬", target: target, currentLabel: target + " 石+" + current, baseLabel: target + " 石+" + base };
      case "free_gacha_interval":
        return { category: "無料ガチャ", target: target, currentLabel: current + "回ごとに無料", baseLabel: base + "回ごとに無料" };
      case "accuracy_flat":
        return { category: "補助", target: "命中", currentLabel: "命中+" + current, baseLabel: "命中+" + base };
      case "evasion_rate":
        return { category: "補助", target: "回避率", currentLabel: "回避率+" + current + "%", baseLabel: "回避率+" + base + "%" };
      case "critical_rate":
        return { category: "補助", target: "会心率", currentLabel: "会心率+" + current + "%", baseLabel: "会心率+" + base + "%" };
      case "critical_damage":
        return { category: "補助", target: "会心ダメージ", currentLabel: "会心ダメージ+" + current + "%", baseLabel: "会心ダメージ+" + base + "%" };
      case "bug_reward_flat":
        return { category: "バグ報酬", target: "石", currentLabel: "バグ報酬石+" + current, baseLabel: "バグ報酬石+" + base };
      case "bug_reward_multiplier":
        return { category: "バグ報酬倍率", target: target, currentLabel: "バグ報酬" + current + "倍", baseLabel: "バグ報酬" + base + "倍" };
      case "bug_spawn_rate":
        return { category: "バグ出現率", target: target, currentLabel: "バグ出現率+" + current + "%", baseLabel: "バグ出現率+" + base + "%" };
      case "bug_rank_modifier":
        return { category: "バグランク補正", target: target, currentLabel: "バグランク+" + current, baseLabel: "バグランク+" + base };
      case "bug_damage_flat":
        return { category: "対バグ与ダメ", target: target, currentLabel: "与ダメ+" + current, baseLabel: "与ダメ+" + base };
      case "bug_damage_multiplier":
        return { category: "対バグ与ダメ", target: target, currentLabel: "与ダメ+" + roundDisplay(current * 100) + "%", baseLabel: "与ダメ+" + roundDisplay(base * 100) + "%" };
      case "bug_damage_reduction_flat":
        return { category: "対バグ被ダメ", target: target, currentLabel: "被ダメ-" + current, baseLabel: "被ダメ-" + base };
      case "bug_damage_reduction_multiplier":
        return { category: "対バグ被ダメ", target: target, currentLabel: "被ダメ-" + roundDisplay(current * 100) + "%", baseLabel: "被ダメ-" + roundDisplay(base * 100) + "%" };
      case "reroll_on_miss":
        return { category: "再抽選", target: target, currentLabel: "ハズレ時" + roundDisplay(current * 100) + "%で再抽選", baseLabel: "ハズレ時" + roundDisplay(base * 100) + "%で再抽選" };
      case "miss_convert":
        return { category: "ハズレ変換", target: target, currentLabel: "ハズレ時" + roundDisplay(current * 100) + "%で変換", baseLabel: "ハズレ時" + roundDisplay(base * 100) + "%で変換" };
      case "rare_rate_focus":
        return { category: "高レア補助", target: target, currentLabel: target + " " + current + "倍", baseLabel: target + " " + base + "倍" };
      case "special":
        if (effectInfo.target === "if_unlock") {
          return { category: "特殊", target: "IF", currentLabel: "IF確率を観測可能", baseLabel: "IF確率を観測可能" };
        }
        if (effectInfo.target === "infinity_trigger") {
          return { category: "特殊", target: "無限", currentLabel: "ONでガチャボタンが「無限」に変化", baseLabel: "ONでガチャボタンが「無限」に変化" };
        }
        if (effectInfo.target === "auto_main_button") {
          return { category: "特殊", target: "自動起動", currentLabel: "5秒放置で自動実行", baseLabel: "5秒放置で自動実行" };
        }
        if (effectInfo.target === "shop_discount") {
          return { category: "特殊", target: "ショップ", currentLabel: "価格を" + roundDisplay(current * 100) + "%減少", baseLabel: "価格を" + roundDisplay(base * 100) + "%減少" };
        }
        if (effectInfo.target === "unlock_multi_draw_10") {
          return { category: "特殊", target: "ガチャ", currentLabel: "10連ガチャを解放", baseLabel: "10連ガチャを解放" };
        }
        if (effectInfo.target === "unlock_long_press") {
          return { category: "特殊", target: "メインボタン", currentLabel: "長押しを解放", baseLabel: "長押しを解放" };
        }
        if (effectInfo.target === "unlock_multi_draw_100") {
          return { category: "特殊", target: "ガチャ", currentLabel: "100連ガチャを解放", baseLabel: "100連ガチャを解放" };
        }
        if (effectInfo.target === "unlock_all_stone_draw") {
          return { category: "特殊", target: "ガチャ", currentLabel: "全石ガチャを解放", baseLabel: "全石ガチャを解放" };
        }
        if (effectInfo.target === "rebirth_base_rate_growth") {
          return { category: "特殊", target: "転生", currentLabel: "転生時に素の確率を強化", baseLabel: "転生時に素の確率を強化" };
        }
        if (effectInfo.target === "slime_growth_multiplier") {
          return { category: "特殊", target: "スライム", currentLabel: "スライム成長" + current + "倍", baseLabel: "スライム成長" + base + "倍" };
        }
        if (effectInfo.target === "infinity_bug_damage_reduction") {
          return { category: "特殊", target: "∞バグ", currentLabel: "∞バグ被ダメ-" + roundDisplay(current * 100) + "%", baseLabel: "∞バグ被ダメ-" + roundDisplay(base * 100) + "%" };
        }
        if (effectInfo.target === "infinity_bug_damage_bonus") {
          return { category: "特殊", target: "∞バグ", currentLabel: "∞バグ与ダメ+" + roundDisplay(current * 100) + "%", baseLabel: "∞バグ与ダメ+" + roundDisplay(base * 100) + "%" };
        }
        if (effectInfo.target === "set_infinity_bug_defense") {
          return { category: "特殊", target: "∞バグ", currentLabel: "∞バグ防御を" + current + "に固定", baseLabel: "∞バグ防御を" + base + "に固定" };
        }
        if (effectInfo.target === "infinity_rate_growth_per_gacha") {
          return { category: "特殊", target: "∞確率", currentLabel: "∞成長値の初期量 " + formatRateDisplay(rawCurrent), baseLabel: "∞成長値の初期量 " + formatRateDisplay(rawBase) };
        }
        if (effectInfo.target === "random_rate_growth") {
          return { category: "特殊", target: "確率", currentLabel: "ランダム成長値の初期量 " + formatRateDisplay(rawCurrent), baseLabel: "ランダム成長値の初期量 " + formatRateDisplay(rawBase) };
        }
        if (effectInfo.target === "double_random_rate_growth") {
          return { category: "特殊", target: "確率", currentLabel: "選ばれた成長値を" + current + "倍化", baseLabel: "選ばれた成長値を" + base + "倍化" };
        }
        if (effectInfo.target === "all_stats_growth_after_bug_win") {
          return { category: "特殊", target: "バグ勝利", currentLabel: "勝利後に全ステータス成長", baseLabel: "勝利後に全ステータス成長" };
        }
        if (effectInfo.target === "void_stat_loss_reduce_to_one") {
          return { category: "特殊", target: "虚無", currentLabel: "虚無の侵食を1に抑える", baseLabel: "虚無の侵食を1に抑える" };
        }
        if (effectInfo.target === "minimum_base_rate") {
          return { category: "特殊", target: "確率", currentLabel: "全基礎確率の最低値" + current + "%", baseLabel: "全基礎確率の最低値" + base + "%" };
        }
        if (effectInfo.target === "selective_rate_control") {
          return { category: "特殊", target: "確率", currentLabel: "選択ランク最終確率" + current + "倍", baseLabel: "選択ランク最終確率" + base + "倍" };
        }
        return { category: "特殊", target: target, currentLabel: String(current), baseLabel: String(base) };
      default:
        return { category: "その他", target: target, currentLabel: String(current), baseLabel: String(base) };
    }
  }  function calculatePlayerStats(state) {
    var stats = Object.assign({}, data.BASE_STATS);
    var dungeonBonus = state && state.dungeonStatBonus ? state.dungeonStatBonus : data.createDungeonStatBonus();
    var creationBonus = state && state.creationRelicStatBonus ? state.creationRelicStatBonus : data.createDungeonStatBonus();
    var voidPenalty = state && state.voidStatPenalty ? state.voidStatPenalty : data.createDungeonStatBonus();
    var multipliers = { hp: 1, attack: 1, defense: 1, speed: 1, luck: 1 };

    stats.hp += dungeonBonus.hp || 0;
    stats.attack += dungeonBonus.attack || 0;
    stats.defense += dungeonBonus.defense || 0;
    stats.speed += dungeonBonus.speed || 0;
    stats.luck += dungeonBonus.luck || 0;
    stats.accuracy += dungeonBonus.accuracy || 0;
    stats.evasion += dungeonBonus.evasionRate || 0;
    stats.criticalRate += dungeonBonus.criticalRate || 0;
    stats.criticalDamage += dungeonBonus.criticalDamage || 0;
    stats.hp += creationBonus.hp || 0;
    stats.attack += creationBonus.attack || 0;
    stats.defense += creationBonus.defense || 0;
    stats.speed += creationBonus.speed || 0;
    stats.luck += creationBonus.luck || 0;
    stats.accuracy += creationBonus.accuracy || 0;
    stats.evasion += creationBonus.evasionRate || 0;
    stats.criticalRate += creationBonus.criticalRate || 0;
    stats.criticalDamage += creationBonus.criticalDamage || 0;

    getOwnedRelicsByEnabled(state, true).forEach(function (view) {
      view.effectValues.forEach(function (effectInfo) {
        if (effectInfo.effectType === "stat_flat") {
          stats[effectInfo.target] += effectInfo.currentValue;
        } else if (effectInfo.effectType === "all_stats_flat") {
          stats.hp += effectInfo.currentValue;
          stats.attack += effectInfo.currentValue;
          stats.defense += effectInfo.currentValue;
          stats.speed += effectInfo.currentValue;
          stats.luck += effectInfo.currentValue;
          stats.accuracy += effectInfo.currentValue;
          stats.evasion += effectInfo.currentValue;
          stats.criticalRate += effectInfo.currentValue;
          stats.criticalDamage += effectInfo.currentValue;
        } else if (effectInfo.effectType === "stat_multiplier") {
          multipliers[effectInfo.target] *= 1 + effectInfo.currentValue;
        } else if (effectInfo.effectType === "accuracy_flat") {
          stats.accuracy += effectInfo.currentValue;
        } else if (effectInfo.effectType === "evasion_rate") {
          stats.evasion += effectInfo.currentValue;
        } else if (effectInfo.effectType === "critical_rate") {
          stats.criticalRate += effectInfo.currentValue;
        } else if (effectInfo.effectType === "critical_damage") {
          stats.criticalDamage += effectInfo.currentValue;
        }
      });
    });

    Object.keys(multipliers).forEach(function (key) {
      stats[key] = roundDisplay(stats[key] * multipliers[key]);
    });

    stats.hp = Math.max(1, roundDisplay(stats.hp - (voidPenalty.hp || 0)));
    stats.attack = Math.max(1, roundDisplay(stats.attack - (voidPenalty.attack || 0)));
    stats.defense = Math.max(1, roundDisplay(stats.defense - (voidPenalty.defense || 0)));
    stats.speed = Math.max(1, roundDisplay(stats.speed - (voidPenalty.speed || 0)));
    stats.luck = Math.max(1, roundDisplay(stats.luck - (voidPenalty.luck || 0)));
    stats.accuracy = Math.max(1, roundDisplay(stats.accuracy - (voidPenalty.accuracy || 0)));
    stats.evasion = Math.max(0, roundDisplay(stats.evasion - (voidPenalty.evasionRate || 0)));
    stats.criticalRate = Math.max(0, roundDisplay(stats.criticalRate - (voidPenalty.criticalRate || 0)));
    stats.criticalDamage = Math.max(1, roundDisplay(stats.criticalDamage - (voidPenalty.criticalDamage || 0)));

    stats.evasion = roundDisplay(Math.min(65, stats.evasion));
    return stats;
  }

  function collectStoneGainBase(state) {
    var flat = 0;
    var multiplier = 1;
    var sources = [];

    getOwnedRelicsByEnabled(state, true).forEach(function (view) {
      view.effectValues.forEach(function (effectInfo) {
        if (effectInfo.effectType === "stone_gain_flat" && effectInfo.phase <= 7) {
          flat += effectInfo.currentValue;
          sources.push({ name: view.name, value: effectInfo.currentValue });
        } else if (effectInfo.effectType === "stone_gain_multiplier" && effectInfo.phase <= 7) {
          if (effectInfo.target === "all_final") {
            multiplier *= effectInfo.currentValue;
            sources.push({ name: view.name, value: effectInfo.currentValue });
          }
        }
      });
    });

    return { flat: roundDisplay(flat), multiplier: roundDisplay(multiplier), sources: sources };
  }

  function calculateStoneGainMultiplier(state) {
    var base = collectStoneGainBase(state);
    var altar = calculateAltarStoneMultiplier(state);
    return {
      flat: base.flat,
      multiplier: roundDisplay(base.multiplier * altar.all),
      sources: base.sources
    };
  }

  function calculateIdleStoneGain(state) {
    var total = 1;
    var sources = [{ name: "基本回復", value: 1 }];

    getOwnedRelicsByEnabled(state, true).forEach(function (view) {
      view.effectValues.forEach(function (effectInfo) {
        if (effectInfo.effectType === "idle_stone_flat" && effectInfo.phase <= 7) {
          total += effectInfo.currentValue;
          sources.push({ name: view.name, value: effectInfo.currentValue });
        }
      });
    });

    var stoneBoost = calculateStoneGainMultiplier(state);
    return {
      total: Math.floor(total * stoneBoost.multiplier),
      rawTotal: total,
      sources: sources,
      multiplier: stoneBoost.multiplier
    };
  }

  function calculateMissStoneGain(state) {
    var flat = 0;
    var bonusStoneFlat = 0;
    var multiplier = 1;
    var chance = 0;
    var chanceMultiplier = 1;
    var flatSources = [];
    var bonusStoneSources = [];
    var multiplierSources = [];
    var chanceSources = [];

    getOwnedRelicsByEnabled(state, true).forEach(function (view) {
      view.effectValues.forEach(function (effectInfo) {
        if (effectInfo.effectType === "miss_stone_flat" && effectInfo.phase <= 7) {
          flat += effectInfo.currentValue;
          flatSources.push({ name: view.name, value: effectInfo.currentValue });
        } else if (effectInfo.effectType === "stone_gain_flat" && effectInfo.phase <= 7) {
          bonusStoneFlat += effectInfo.currentValue;
          bonusStoneSources.push({ name: view.name, value: effectInfo.currentValue });
        } else if (effectInfo.effectType === "stone_gain_multiplier" && effectInfo.target === "miss" && effectInfo.phase <= 7) {
          multiplier *= 1 + effectInfo.currentValue;
          multiplierSources.push({ name: view.name, value: effectInfo.currentValue });
        } else if (effectInfo.effectType === "special" && effectInfo.target === "miss_stone_chance" && effectInfo.phase <= 7) {
          chance += effectInfo.currentValue;
          chanceSources.push({ name: view.name, value: effectInfo.currentValue });
        } else if (effectInfo.effectType === "special" && effectInfo.target === "miss_stone_chance_multiplier" && effectInfo.phase <= 7) {
          chanceMultiplier *= effectInfo.currentValue;
          chanceSources.push({ name: view.name, value: effectInfo.currentValue });
        }
      });
    });

    var allStoneMultiplier = calculateStoneGainMultiplier(state);
    var altarStone = calculateAltarStoneMultiplier(state);
    multiplier *= allStoneMultiplier.multiplier;
    multiplier *= altarStone.miss;

    return {
      flat: roundDisplay(flat),
      bonusStoneFlat: roundDisplay(bonusStoneFlat + allStoneMultiplier.flat),
      multiplier: roundDisplay(multiplier),
      chance: roundDisplay(chance * chanceMultiplier),
      chanceMultiplier: roundDisplay(chanceMultiplier),
      flatSources: flatSources,
      bonusStoneSources: bonusStoneSources,
      multiplierSources: multiplierSources.concat(allStoneMultiplier.sources),
      chanceSources: chanceSources,
      previewTotal: Math.floor((flat + bonusStoneFlat + allStoneMultiplier.flat) * multiplier)
    };
  }

  function calculateGachaCountBonus(state) {
    var total10 = 0;
    var miss10 = 0;
    var freeInterval = null;
    var observationChance = 0;
    var total10Sources = [];
    var miss10Sources = [];
    var freeSources = [];
    var observationSources = [];

    getOwnedRelicsByEnabled(state, true).forEach(function (view) {
      view.effectValues.forEach(function (effectInfo) {
        if (effectInfo.effectType === "gacha_count_bonus" && effectInfo.phase <= 7) {
          if (effectInfo.target === "total_10") {
            total10 += effectInfo.currentValue;
            total10Sources.push({ name: view.name, value: effectInfo.currentValue });
          } else if (effectInfo.target === "miss_10") {
            miss10 += effectInfo.currentValue;
            miss10Sources.push({ name: view.name, value: effectInfo.currentValue });
          }
        } else if (effectInfo.effectType === "free_gacha_interval" && effectInfo.phase <= 7) {
          freeInterval = freeInterval === null ? effectInfo.currentValue : Math.min(freeInterval, effectInfo.currentValue);
          freeSources.push({ name: view.name, value: effectInfo.currentValue });
        } else if (effectInfo.effectType === "special" && effectInfo.target === "random_log_stone" && effectInfo.phase <= 7) {
          observationChance += effectInfo.currentValue;
          observationSources.push({ name: view.name, value: effectInfo.currentValue });
        }
      });
    });

    var stoneBoost = calculateStoneGainMultiplier(state);
    return {
      total10: Math.floor(total10 * stoneBoost.multiplier),
      miss10: Math.floor(miss10 * stoneBoost.multiplier),
      rawTotal10: total10,
      rawMiss10: miss10,
      total10Sources: total10Sources,
      miss10Sources: miss10Sources,
      freeInterval: freeInterval,
      freeSources: freeSources,
      observationChance: roundDisplay(observationChance),
      observationSources: observationSources
    };
  }

  function createRateBuckets() {
    var buckets = {};
    data.GACHA_RANKS.forEach(function (rank) {
      buckets[rank.key] = { add: 0, subtract: 0 };
    });
    return buckets;
  }

  function getRandomRateGrowthMap(state) {
    var result = {};
    (data.INFINITY_RATE_RANKS || []).forEach(function (rank) {
      result[rank] = Math.max(0, state && state.randomRateGrowthByShard ? state.randomRateGrowthByShard[rank] || 0 : 0);
    });
    return result;
  }

  function rankMatchesGroup(rank, group) {
    if (group === "all") {
      return rank !== "MISS";
    }
    if (group === "S_PLUS") {
      return ["S", "SR", "SSR", "SSSR", "UR", "AR", "LR", "GR", "BR", "QR", "IR", "ER"].indexOf(rank) !== -1;
    }
    if (group === "BR_PLUS") {
      return ["BR", "QR", "IR", "ER"].indexOf(rank) !== -1;
    }
    if (group === "QR_PLUS") {
      return ["QR", "IR", "ER"].indexOf(rank) !== -1;
    }
    if (group === "IR_PLUS") {
      return ["IR", "ER"].indexOf(rank) !== -1;
    }
    if (group === "ER_PLUS") {
      return rank === "ER";
    }
    return false;
  }

  function calculateVoidStatLoss(state, playerStats) {
    var result = {};
    var source = playerStats || calculatePlayerStats(state);
    var reduceToOne = Boolean(state && state.ownedRelics && state.ownedRelics.er_void_relic && state.ownedRelics.er_void_relic.enabled !== false);
    ["hp", "attack", "defense", "speed", "luck", "accuracy", "evasion", "criticalRate", "criticalDamage"].forEach(function (key) {
      result[key] = reduceToOne ? 1 : Math.max(1, Math.floor((source[key] || 1) * 0.1));
    });
    return result;
  }

  function reduceVoidStatLoss(state, losses) {
    if (!state.voidStatPenalty) {
      state.voidStatPenalty = data.createDungeonStatBonus();
    }
    state.voidStatPenalty.hp += losses.hp || 0;
    state.voidStatPenalty.attack += losses.attack || 0;
    state.voidStatPenalty.defense += losses.defense || 0;
    state.voidStatPenalty.speed += losses.speed || 0;
    state.voidStatPenalty.luck += losses.luck || 0;
    state.voidStatPenalty.accuracy += losses.accuracy || 0;
    state.voidStatPenalty.evasionRate += losses.evasion || 0;
    state.voidStatPenalty.criticalRate += losses.criticalRate || 0;
    state.voidStatPenalty.criticalDamage += losses.criticalDamage || 0;
  }

  function calculateVoidBossStats() {
    return Object.assign({}, data.VOID_BOSS);
  }

  function calculateFinalRateMultipliers(state) {
    var info = {
      allRareMultiplier: 1,
      sPlusMultiplier: 1,
      brPlusMultiplier: 1,
      qrPlusMultiplier: 1,
      irPlusMultiplier: 1,
      erPlusMultiplier: 1,
      missRateSubtractFlat: 0,
      lowerRateBoostMultiplier: 1,
      allRareSources: [],
      groupSources: []
    };

    getOwnedRelicsByEnabled(state, true).forEach(function (view) {
      view.effectValues.forEach(function (effectInfo) {
        if (effectInfo.phase > 8) {
          return;
        }
        if (effectInfo.effectType === "final_rate_multiplier" && (effectInfo.target === "all" || effectInfo.target === "all_relic")) {
          info.allRareMultiplier *= effectInfo.currentValue;
          info.allRareSources.push({ name: view.name, value: effectInfo.currentValue });
        } else if (effectInfo.effectType === "rate_group_multiplier") {
          if (effectInfo.target === "S_PLUS") {
            info.sPlusMultiplier *= effectInfo.currentValue;
          } else if (effectInfo.target === "BR_PLUS") {
            info.brPlusMultiplier *= effectInfo.currentValue;
          } else if (effectInfo.target === "QR_PLUS") {
            info.qrPlusMultiplier *= effectInfo.currentValue;
          }
          info.groupSources.push({ name: view.name, target: effectInfo.target, value: effectInfo.currentValue });
        } else if (effectInfo.effectType === "special" && effectInfo.target === "ir_or_higher_rate") {
          info.irPlusMultiplier *= effectInfo.currentValue;
        } else if (effectInfo.effectType === "special" && effectInfo.target === "er_or_higher_rate") {
          info.erPlusMultiplier *= effectInfo.currentValue;
        } else if (effectInfo.effectType === "special" && effectInfo.target === "miss_rate_subtract_flat") {
          info.missRateSubtractFlat += effectInfo.currentValue;
        } else if (effectInfo.effectType === "special" && effectInfo.target === "lower_rate_boost_multiplier") {
          info.lowerRateBoostMultiplier *= effectInfo.currentValue;
        }
      });
    });

    return info;
  }

  function calculateHighRareFocusBonus(state, rows) {
    var info = {
      targetRank: null,
      targetRate: null,
      multiplier: 1,
      highRareMultiplier: 1,
      urPlusTarget: null,
      urPlusRate: null,
      urPlusMultiplier: 1,
      highRareTarget: null,
      highRareRate: null
    };

    getOwnedRelicsByEnabled(state, true).forEach(function (view) {
      view.effectValues.forEach(function (effectInfo) {
        if (effectInfo.phase > 7 || effectInfo.effectType !== "rare_rate_focus") {
          return;
        }
        if (effectInfo.target === "UR_PLUS_LOWEST") {
          info.multiplier *= effectInfo.currentValue;
        } else if (effectInfo.target === "HIGH_RARE_LOWEST") {
          info.highRareMultiplier *= effectInfo.currentValue;
        }
      });
    });

    function findLowest(predicate) {
      var candidates = rows.filter(function (row) {
        return predicate(row.rank) && row.final > 0;
      });
      if (!candidates.length) {
        return null;
      }
      candidates.sort(function (a, b) {
        return a.final - b.final;
      });
      return candidates[0];
    }

    var urPlusTarget = findLowest(function (rank) {
      return ["UR", "AR", "LR", "GR", "BR", "QR", "IR", "ER"].indexOf(rank) !== -1;
    });
    if (urPlusTarget && info.multiplier > 1) {
      urPlusTarget.final = urPlusTarget.final * info.multiplier;
      info.targetRank = urPlusTarget.rank;
      info.targetRate = urPlusTarget.final;
      info.urPlusTarget = urPlusTarget.rank;
      info.urPlusRate = urPlusTarget.final;
      info.urPlusMultiplier = info.multiplier;
    }

    var highRareTarget = findLowest(function (rank) {
      return ["SSR", "SSSR", "UR", "AR", "LR", "GR", "BR", "QR", "IR", "ER"].indexOf(rank) !== -1;
    });
    if (highRareTarget && info.highRareMultiplier > 1) {
      highRareTarget.final = highRareTarget.final * info.highRareMultiplier;
      info.targetRank = highRareTarget.rank;
      info.targetRate = highRareTarget.final;
      info.highRareTarget = highRareTarget.rank;
      info.highRareRate = highRareTarget.final;
    }

    return info;
  }

  function calculateBugDefeatRateBonuses(state) {
    var defaults = getDefaultBugDefeatRateBonus();
    var source = state && state.bugDefeatRateBonus ? state.bugDefeatRateBonus : defaults;
    var result = {};
    Object.keys(defaults).forEach(function (rank) {
      result[rank] = Math.max(1, source[rank] || 1);
    });
    return result;
  }

  function distributeMissReduction(rows, amount) {
    if (amount <= 0) {
      return;
    }
    var totalRare = rows.reduce(function (sum, row) {
      return sum + row.final;
    }, 0);
    if (totalRare <= 0) {
      return;
    }
    rows.forEach(function (row) {
      row.final = row.final + (amount * (row.final / totalRare));
    });
  }

  function calculateRateModifiers(state) {
    var buckets = createRateBuckets();
    var redirectToUr = 0;
    var randomGrowth = getRandomRateGrowthMap(state);

    getOwnedRelicsByEnabled(state, true).forEach(function (view) {
      view.effectValues.forEach(function (effectInfo) {
        if (effectInfo.phase > 7) {
          return;
        }
        if (effectInfo.effectType === "rate_add") {
          buckets[effectInfo.target].add += effectInfo.currentValue;
        } else if (effectInfo.effectType === "rate_subtract") {
          buckets[effectInfo.target].subtract += effectInfo.currentValue;
        } else if (effectInfo.effectType === "special" && effectInfo.target === "redirect_to_ur") {
          redirectToUr += effectInfo.currentValue;
        }
      });
    });

    var highRare = calculateFinalRateMultipliers(state);
    var bugDefeatBonuses = calculateBugDefeatRateBonuses(state);
    var altarRateBonus = calculateAltarRateBonus(state);

    var rebirthMultiplier = 1 + getBaseRateRebirthBonus(state);
    var zeroRelicRateMultiplier = getZeroRelicRateMultiplier(state);

    var rows = data.GACHA_RANKS.filter(function (rank) {
      return rank.key !== "IF";
    }).map(function (rank) {
      var rebirthBaseRate = calculateBaseRateWithRebirth(rank.baseChance, state);
      var zeroRelicAdjustedBaseRate = rebirthBaseRate * zeroRelicRateMultiplier;
      var minimumAdjustedBaseRate = applyZeroEndingMinimumBaseRate(zeroRelicAdjustedBaseRate, state);
      var baseRate = Math.max(0, minimumAdjustedBaseRate + buckets[rank.key].add - buckets[rank.key].subtract + (rank.key === "UR" ? redirectToUr : 0));
      var rateAfterNormalMultiplier = baseRate * highRare.allRareMultiplier;
      if (rankMatchesGroup(rank.key, "S_PLUS")) {
        rateAfterNormalMultiplier *= highRare.sPlusMultiplier;
      }
      if (rankMatchesGroup(rank.key, "BR_PLUS")) {
        rateAfterNormalMultiplier *= highRare.brPlusMultiplier;
      }
      if (rankMatchesGroup(rank.key, "QR_PLUS")) {
        rateAfterNormalMultiplier *= highRare.qrPlusMultiplier;
      }
      if (rankMatchesGroup(rank.key, "IR_PLUS")) {
        rateAfterNormalMultiplier *= highRare.irPlusMultiplier;
      }
      if (rankMatchesGroup(rank.key, "ER_PLUS")) {
        rateAfterNormalMultiplier *= highRare.erPlusMultiplier;
      }
      if (altarRateBonus[rank.key]) {
        rateAfterNormalMultiplier *= altarRateBonus[rank.key];
      }
      var bugDefeatMultiplier = bugDefeatBonuses[rank.key] || 1;
      var randomRelicMultiplier = calculateRandomRelicRateMultiplier(state, rank.key);
      var finalRate = rateAfterNormalMultiplier * bugDefeatMultiplier * randomRelicMultiplier;
      return {
        rank: rank.key,
        label: rank.label,
        base: rank.baseChance,
        rebirthBase: rebirthBaseRate,
        zeroRelicAdjustedBase: zeroRelicAdjustedBaseRate,
        minimumAdjustedBase: minimumAdjustedBaseRate,
        baseDisplay: rank.displayRate || formatRateDisplay(rank.baseChance),
        rebirthBaseDisplay: formatRateDisplay(rebirthBaseRate),
        zeroRelicAdjustedBaseDisplay: formatRateDisplay(zeroRelicAdjustedBaseRate),
        minimumAdjustedBaseDisplay: formatRateDisplay(minimumAdjustedBaseRate),
        add: buckets[rank.key].add,
        subtract: buckets[rank.key].subtract,
        shardGrowth: randomGrowth[rank.key] || 0,
        multiplier: roundDisplay(baseRate > 0 ? rateAfterNormalMultiplier / baseRate : 1),
        bugDefeatMultiplier: roundDisplay(bugDefeatMultiplier),
        randomRelicMultiplier: roundDisplay(randomRelicMultiplier),
        altarMultiplier: roundDisplay(altarRateBonus[rank.key] || 1),
        final: finalRate
      };
    });

    var focusInfo = calculateHighRareFocusBonus(state, rows);
    distributeMissReduction(rows, highRare.missRateSubtractFlat);

    var occupied = rows.reduce(function (sum, row) {
      return sum + row.final;
    }, 0);

    return {
      rows: rows,
      missRate: Math.max(0, 100 - occupied - highRare.missRateSubtractFlat),
      rebirthMultiplier: roundDisplay(rebirthMultiplier),
      zeroRelicRateMultiplier: roundDisplay(zeroRelicRateMultiplier),
      zeroEndingMinimumBaseRate: calculateZeroEndingMinimumBaseRate(state),
      redirectToUr: roundDisplay(redirectToUr),
      shardGrowthByRank: randomGrowth,
      multipliers: {
        allRare: roundDisplay(highRare.allRareMultiplier),
        sPlus: roundDisplay(highRare.sPlusMultiplier),
        brPlus: roundDisplay(highRare.brPlusMultiplier),
        qrPlus: roundDisplay(highRare.qrPlusMultiplier),
        irPlus: roundDisplay(highRare.irPlusMultiplier),
        erPlus: roundDisplay(highRare.erPlusMultiplier),
        missRateSubtractFlat: roundDisplay(highRare.missRateSubtractFlat),
        lowerRateBoostMultiplier: roundDisplay(highRare.lowerRateBoostMultiplier)
      },
      bugDefeatBonuses: bugDefeatBonuses,
      focusInfo: focusInfo
    };
  }

  function calculateRerollEffects(state) {
    var result = {
      erRate: 0,
      irRate: 0,
      qrRate: 0,
      brRate: 0,
      grRate: 0,
      lrRate: 0,
      arRate: 0,
      rerollFailStone: 0
    };

    getOwnedRelicsByEnabled(state, true).forEach(function (view) {
      view.effectValues.forEach(function (effectInfo) {
        if (effectInfo.phase > 7) {
          return;
        }
        if (effectInfo.effectType === "reroll_on_miss") {
          if (effectInfo.target === "er") {
            result.erRate = Math.max(result.erRate, effectInfo.currentValue);
          } else if (effectInfo.target === "ir") {
            result.irRate = Math.max(result.irRate, effectInfo.currentValue);
          } else if (effectInfo.target === "qr") {
            result.qrRate = Math.max(result.qrRate, effectInfo.currentValue);
          } else if (effectInfo.target === "br") {
            result.brRate = Math.max(result.brRate, effectInfo.currentValue);
          } else if (effectInfo.target === "reject") {
            result.lrRate = Math.max(result.lrRate, effectInfo.currentValue);
          } else {
            result.arRate = Math.max(result.arRate, effectInfo.currentValue);
          }
        } else if (effectInfo.effectType === "miss_convert" && effectInfo.target === "N_TO_SSSR") {
          result.grRate = Math.max(result.grRate, effectInfo.currentValue);
        } else if (effectInfo.effectType === "special" && effectInfo.target === "reroll_fail_stone") {
          result.rerollFailStone = Math.max(result.rerollFailStone, effectInfo.currentValue);
        }
      });
    });

    return result;
  }

  function calculateBugSpawnRate(state) {
    var rate = 10;
    getOwnedRelicsByEnabled(state, true).forEach(function (view) {
      view.effectValues.forEach(function (effectInfo) {
        if (effectInfo.phase > 7) {
          return;
        }
        if (effectInfo.effectType === "special" && effectInfo.target === "bug_spawn_add") {
          rate += effectInfo.currentValue;
        } else if (effectInfo.effectType === "special" && effectInfo.target === "bug_spawn_subtract") {
          rate -= effectInfo.currentValue;
        } else if (effectInfo.effectType === "bug_spawn_rate") {
          rate += effectInfo.currentValue;
        }
      });
    });
    rate += calculateAltarBugSpawnModifier(state);
    return roundDisplay(Math.max(0, Math.min(100, rate)));
  }

  function calculateBugRankModifier(state) {
    var modifier = 0;
    getOwnedRelicsByEnabled(state, true).forEach(function (view) {
      view.effectValues.forEach(function (effectInfo) {
        if (effectInfo.phase <= 7 && effectInfo.effectType === "bug_rank_modifier") {
          modifier += Math.floor(effectInfo.currentValue);
        }
      });
    });
    return modifier + calculateAltarBugRankBonus(state);
  }

  function calculateBugRewardBonus(state) {
    var rewardFlat = 0;
    var rewardMultiplier = 1;
    var healOnVictory = 0;

    getOwnedRelicsByEnabled(state, true).forEach(function (view) {
      view.effectValues.forEach(function (effectInfo) {
        if (effectInfo.phase > 7) {
          return;
        }
        if (effectInfo.effectType === "bug_reward_flat") {
          rewardFlat += effectInfo.currentValue;
        } else if (effectInfo.effectType === "bug_reward_multiplier") {
          rewardMultiplier *= effectInfo.currentValue;
        } else if (effectInfo.effectType === "special" && effectInfo.target === "battle_victory_heal") {
          healOnVictory += effectInfo.currentValue;
        }
      });
    });

    return {
      rewardFlat: roundDisplay(rewardFlat),
      rewardMultiplier: roundDisplay(rewardMultiplier * calculateAltarBugRewardMultiplier(state)),
      healOnVictory: roundDisplay(healOnVictory)
    };
  }

  function calculateBugDamageBonus(state) {
    var attackButtonFlat = 0;
    var bonusFlat = 0;
    var bonusMultiplier = 0;
    var extraAttackDamage = 0;
    var battleDamageBonus = 0;
    var bossBonus = 0;

    getOwnedRelicsByEnabled(state, true).forEach(function (view) {
      view.effectValues.forEach(function (effectInfo) {
        if (effectInfo.phase > 7) {
          return;
        }
        if (effectInfo.effectType === "special" && effectInfo.target === "manual_attack_bonus") {
          attackButtonFlat += effectInfo.currentValue;
        } else if (effectInfo.effectType === "bug_damage_flat") {
          bonusFlat += effectInfo.currentValue;
        } else if (effectInfo.effectType === "bug_damage_multiplier") {
          bonusMultiplier += effectInfo.currentValue;
        } else if (effectInfo.effectType === "special" && effectInfo.target === "extra_attack_damage") {
          extraAttackDamage += effectInfo.currentValue;
        } else if (effectInfo.effectType === "special" && effectInfo.target === "battle_damage_bonus") {
          battleDamageBonus += effectInfo.currentValue;
        } else if (effectInfo.effectType === "special" && effectInfo.target === "boss_bug_damage_bonus") {
          bossBonus += effectInfo.currentValue;
        }
      });
    });

    return {
      attackButtonFlat: roundDisplay(attackButtonFlat),
      bonusFlat: roundDisplay(bonusFlat),
      bonusMultiplier: roundDisplay(bonusMultiplier),
      extraAttackDamage: roundDisplay(extraAttackDamage),
      battleDamageBonus: roundDisplay(battleDamageBonus),
      bossBonus: roundDisplay(bossBonus)
    };
  }

  function calculateBattleFinalDamageMultiplier(state) {
    var multiplier = 1;
    getOwnedRelicsByEnabled(state, true).forEach(function (view) {
      view.effectValues.forEach(function (effectInfo) {
        if (effectInfo.phase <= 7 && effectInfo.effectType === "special" && effectInfo.target === "battle_final_damage_multiplier") {
          multiplier *= effectInfo.currentValue;
        }
      });
    });
    return roundDisplay(multiplier);
  }

  function calculateBugDamageReduction(state) {
    var flat = 0;
    var multiplier = 0;

    getOwnedRelicsByEnabled(state, true).forEach(function (view) {
      view.effectValues.forEach(function (effectInfo) {
        if (effectInfo.phase > 7) {
          return;
        }
        if (effectInfo.effectType === "bug_damage_reduction_flat") {
          flat += effectInfo.currentValue;
        } else if (effectInfo.effectType === "bug_damage_reduction_multiplier") {
          multiplier += effectInfo.currentValue;
        }
      });
    });

    return {
      flat: roundDisplay(flat),
      multiplier: roundDisplay(multiplier)
    };
  }

  function calculateBattleFinalDamageReduction(state) {
    var multiplier = 1;
    getOwnedRelicsByEnabled(state, true).forEach(function (view) {
      view.effectValues.forEach(function (effectInfo) {
        if (effectInfo.phase <= 7 && effectInfo.effectType === "special" && effectInfo.target === "battle_final_damage_reduction") {
          multiplier *= effectInfo.currentValue;
        }
      });
    });
    return roundDisplay(multiplier);
  }

  function calculateCriticalStats(state) {
    var stats = calculatePlayerStats(state);
    var rate = stats.criticalRate + (stats.luck * 0.1);
    var overflow = Math.max(0, rate - 100);
    return {
      rate: roundDisplay(Math.min(100, rate)),
      overflow: roundDisplay(overflow),
      damageBonus: roundDisplay(50 + stats.criticalDamage + (overflow * 0.5))
    };
  }

  function calculateHitRate(state) {
    return roundDisplay(Math.min(100, 95 + calculatePlayerStats(state).accuracy));
  }

  function calculateEvasionRate(state) {
    return roundDisplay(Math.min(65, calculatePlayerStats(state).evasion));
  }

  function calculateBattleStats(state) {
    var playerStats = calculatePlayerStats(state);
    var battleStatMultiplier = 1;
    var startDamage = 0;
    var startHealFlat = 0;
    var startHealPercent = 0;
    var lowHpDefenseBonus = 0;

    getOwnedRelicsByEnabled(state, true).forEach(function (view) {
      view.effectValues.forEach(function (effectInfo) {
        if (effectInfo.phase > 7) {
          return;
        }
        if (effectInfo.effectType === "battle_start_damage") {
          startDamage += effectInfo.currentValue;
        } else if (effectInfo.effectType === "battle_start_heal") {
          if (effectInfo.target === "self_percent") {
            startHealPercent += effectInfo.currentValue;
          } else {
            startHealFlat += effectInfo.currentValue;
          }
        } else if (effectInfo.effectType === "special" && effectInfo.target === "low_hp_defense_bonus") {
          lowHpDefenseBonus += effectInfo.currentValue;
        } else if (effectInfo.effectType === "special" && effectInfo.target === "battle_stat_multiplier") {
          battleStatMultiplier *= effectInfo.currentValue;
        }
      });
    });

    playerStats.hp = roundDisplay(playerStats.hp * battleStatMultiplier);
    playerStats.attack = roundDisplay(playerStats.attack * battleStatMultiplier);
    playerStats.defense = roundDisplay(playerStats.defense * battleStatMultiplier);

    return {
      playerStats: playerStats,
      damageBonus: calculateBugDamageBonus(state),
      damageReduction: calculateBugDamageReduction(state),
      damageFinalMultiplier: calculateBattleFinalDamageMultiplier(state),
      damageFinalReduction: calculateBattleFinalDamageReduction(state),
      critical: calculateCriticalStats(state),
      rewardBonus: calculateBugRewardBonus(state),
      bugSpawnRate: calculateBugSpawnRate(state),
      bugRankModifier: calculateBugRankModifier(state),
      hitRate: calculateHitRate(state),
      evasionRate: calculateEvasionRate(state),
      startDamage: roundDisplay(startDamage),
      startHealFlat: roundDisplay(startHealFlat),
      startHealPercent: roundDisplay(startHealPercent),
      lowHpDefenseBonus: roundDisplay(lowHpDefenseBonus),
      attackCount: Math.min(10, 1 + Math.floor(playerStats.speed / 100))
    };
  }

  function calculatePlayerDamage(state, battleState) {
    var battleStats = calculateBattleStats(state);
    var baseDamage = battleStats.playerStats.attack +
      battleStats.damageBonus.attackButtonFlat +
      battleStats.damageBonus.bonusFlat +
      battleStats.damageBonus.extraAttackDamage;

    var multiplier = 1 + battleStats.damageBonus.bonusMultiplier + battleStats.damageBonus.battleDamageBonus;
    if (battleState.isBoss) {
      multiplier += battleStats.damageBonus.bossBonus;
    }
    if (battleState.bugRank === "∞" || battleState.isVoidSlimeBattle) {
      multiplier += calculateInfinityBugDamageBonus(state);
    }
    multiplier *= battleStats.damageFinalMultiplier;
    var bugDefense = battleState.bugDefense;
    if (battleState.bugRank === "∞" || battleState.isVoidSlimeBattle) {
      var overrideDefense = calculateInfinityBugDefenseOverride(state);
      if (overrideDefense !== null) {
        bugDefense = overrideDefense;
      }
    }
    return Math.max(1, Math.floor((baseDamage * multiplier) - bugDefense));
  }

  function calculateBugDamage(state, battleState) {
    var battleStats = calculateBattleStats(state);
    var defense = battleStats.playerStats.defense;
    if (battleState.playerHp <= battleState.playerMaxHp * 0.5) {
      defense = defense * (1 + battleStats.lowHpDefenseBonus);
    }

    var damage = Math.max(0, battleState.bugAttack - defense);
    damage = Math.max(0, damage - battleStats.damageReduction.flat);
    damage = damage * (1 - battleStats.damageReduction.multiplier);
    damage = damage * battleStats.damageFinalReduction;
    if (battleState.bugRank === "∞" || battleState.isVoidSlimeBattle) {
      damage = damage * calculateInfinityBugDamageReduction(state).multiplier;
    }
    return Math.max(1, Math.floor(damage));
  }

  function calculateDecomposeBonus(state, options) {
    options = options || {};
    var flat = 0;
    var multiplier = calculateStoneGainMultiplier(state).multiplier * calculateAltarDecomposeMultiplier(state);

    getOwnedRelicsByEnabled(state, true, { excludeRelicId: options.excludeRelicId }).forEach(function (view) {
      view.effectValues.forEach(function (effectInfo) {
        if (effectInfo.phase > 7) {
          return;
        }
        if (effectInfo.effectType === "special" && (effectInfo.target === "dismantle_stone" || effectInfo.target === "dismantle_bonus")) {
          flat += effectInfo.currentValue;
        }
      });
    });

    return {
      flat: Math.floor(flat),
      multiplier: multiplier
    };
  }

  function calculateDecomposeStone(relicId, state, options) {
    var relic = data.RELIC_INDEX[relicId];
    if (!relic || relic.rank === "IF") {
      return 0;
    }
    var base = data.DECOMPOSE_STONES[relic.rank] || 0;
    var bonus = calculateDecomposeBonus(state, options);
    return Math.max(0, Math.floor((base + bonus.flat) * bonus.multiplier));
  }

  function getRelicLimitBreakCount(relicId, state) {
    var owned = state.ownedRelics[relicId];
    return owned ? Math.max(0, owned.count - 1) : 0;
  }

  function getMaxLimitBreak(state) {
    return Math.max(0, state.maxRelicLimitBreak || 0);
  }

  function getRankRelicTotal(rank, state) {
    return Math.max(0, (state.relicRankTotal && state.relicRankTotal[rank]) || 0);
  }

  function getRankTotalLimitBreak(rank, state) {
    var total = 0;
    Object.keys(state.ownedRelics).forEach(function (relicId) {
      var relic = data.RELIC_INDEX[relicId];
      if (relic && relic.rank === rank) {
        total += Math.max(0, state.ownedRelics[relicId].count - 1);
      }
    });
    return total;
  }

  function getHighestRankMaxLimitBreak(ranks, state) {
    var max = 0;
    ranks.forEach(function (rank) {
      max = Math.max(max, (state.rankMaxLimitBreak && state.rankMaxLimitBreak[rank]) || 0);
    });
    return max;
  }

  function calculateGachaCost(state) {
    var extraCost = 0;
    getOwnedRelicsByEnabled(state, true).forEach(function (view) {
      view.effectValues.forEach(function (effectInfo) {
        if (effectInfo.phase <= 7 && effectInfo.effectType === "special" && effectInfo.target === "gacha_cost_plus") {
          extraCost += effectInfo.currentValue;
        }
      });
    });
    return data.GACHA_COST + extraCost;
  }

  function calculateExtraBugRelicDropRate(state) {
    var result = {
      qrPlus: 0,
      irPlus: 0
    };

    getOwnedRelicsByEnabled(state, true).forEach(function (view) {
      view.effectValues.forEach(function (effectInfo) {
        if (effectInfo.phase > 8 || effectInfo.effectType !== "special") {
          return;
        }
        if (effectInfo.target === "bonus_bug_relic_drop_qr") {
          result.qrPlus += effectInfo.currentValue;
        } else if (effectInfo.target === "bonus_bug_relic_drop_ir") {
          result.irPlus += effectInfo.currentValue;
        }
      });
    });

    return {
      qrPlus: roundDisplay(result.qrPlus),
      irPlus: roundDisplay(result.irPlus)
    };
  }

  function calculateIfInfo(state) {
    var hasGate = Boolean(state.ownedRelics && state.ownedRelics.er_infinity_gate);
    var gateEnabled = hasGate && state.ownedRelics.er_infinity_gate.enabled !== false;
    var unlocked = state.ifUnlocked === true || hasGate;
    var rate = gateEnabled ? applyZeroEndingMinimumBaseRate(0.0000000000000000000000000000001, state) : 0;

    return {
      unlocked: unlocked,
      displayUnlocked: unlocked && gateEnabled,
      drawEnabled: unlocked && gateEnabled,
      rate: rate,
      probabilityText: unlocked && gateEnabled ? formatRateDisplay(rate) : "未観測"
    };
  }

  function calculateFiniteRelicGrowth(state) {
    var owned = state && state.ownedRelics ? state.ownedRelics.infinity_finite_relic : null;
    if (!owned || owned.enabled === false) {
      return 0;
    }
    var countMultiplier = Math.max(1, owned.count || 1);
    return data.FINITE_RELIC_INFINITY_RATE_GROWTH_BASE *
      countMultiplier *
      calculateInfinityMultiplier(state);
  }

  function calculateRandomRateGrowthMultiplier(state) {
    var multiplier = 1;
    if (state && state.ownedRelics && state.ownedRelics.er_fulfillment && state.ownedRelics.er_fulfillment.enabled !== false) {
      multiplier *= 2;
    }
    return multiplier;
  }

  function calculateShardRandomRateGrowth(state) {
    var owned = state && state.ownedRelics ? state.ownedRelics.n_fragment : null;
    var hasShard = owned && owned.enabled !== false;
    var hasFulfillment = state && state.ownedRelics && state.ownedRelics.er_fulfillment && state.ownedRelics.er_fulfillment.enabled !== false;
    if (!hasShard && !hasFulfillment) {
      return 0;
    }
    var base = data.SHARD_RANDOM_RATE_GROWTH_BASE;
    var shardMultiplier = hasShard ? calculateLimitBreakGrowthMultiplier("N", Math.max(0, (owned.count || 1) - 1)) : 1;
    return base * shardMultiplier * calculateInfinityMultiplier(state);
  }

  function calculateInfinityRateInfo(state) {
    var ifInfo = calculateIfInfo(state);
    var base = ifInfo.rate || 0;
    var growth = Math.max(0, state && state.infinityRateGrowth ? state.infinityRateGrowth : 0);
    return {
      unlocked: state && (state.infinityBugUnlocked === true || state.ifUnlocked === true || state.observedIfProbability === true || (state.ownedRelics && state.ownedRelics.er_infinity_gate)),
      base: base,
      growth: growth,
      final: base + growth,
      baseText: ifInfo.displayUnlocked ? formatRateDisplay(base) : "未観測",
      growthText: formatRateDisplay(growth),
      finalText: ifInfo.displayUnlocked ? formatRateDisplay(base + growth) : "未観測"
    };
  }

  function calculateInfinityBugDamageReduction(state) {
    var multiplier = 1;
    getOwnedRelicsByEnabled(state, true).forEach(function (view) {
      view.effectValues.forEach(function (effectInfo) {
        if (effectInfo.effectType === "special" && effectInfo.target === "infinity_bug_damage_reduction") {
          multiplier *= (1 - effectInfo.currentValue);
        }
      });
    });
    return {
      multiplier: roundDisplay(Math.max(0.05, multiplier)),
      reduction: roundDisplay(1 - Math.max(0.05, multiplier))
    };
  }

  function calculateInfinityBugDamageBonus(state) {
    var bonus = 0;
    getOwnedRelicsByEnabled(state, true).forEach(function (view) {
      view.effectValues.forEach(function (effectInfo) {
        if (effectInfo.effectType === "special" && effectInfo.target === "infinity_bug_damage_bonus") {
          bonus += effectInfo.currentValue;
        }
      });
    });
    return roundDisplay(bonus);
  }

  function calculateInfinityBugDefenseOverride(state) {
    var value = null;
    getOwnedRelicsByEnabled(state, true).forEach(function (view) {
      view.effectValues.forEach(function (effectInfo) {
        if (effectInfo.effectType === "special" && effectInfo.target === "set_infinity_bug_defense") {
          value = value === null ? effectInfo.currentValue : Math.min(value, effectInfo.currentValue);
        }
      });
    });
    return value;
  }

  function calculateCreationRelicStatGain(rank) {
    var table = {
      S: 10,
      SR: 30,
      SSR: 100,
      SSSR: 300,
      UR: 1000,
      AR: 3000,
      LR: 10000,
      GR: 30000,
      BR: 100000,
      QR: 300000,
      IR: 1000000,
      ER: 3000000,
      "∞": 10000000
    };
    return table[rank] || 0;
  }

  function getActiveEffects(state) {
    var entries = [];
    getOwnedRelicsByEnabled(state, true).forEach(function (view) {
      view.effectValues.forEach(function (effectInfo) {
        var described = describeEffect(effectInfo);
        entries.push({
          relicId: view.id,
          relicName: view.name,
          rank: view.rank,
          limitBreak: view.limitBreak,
          category: described.category,
          target: described.target,
          currentLabel: described.currentLabel,
          implementationStatus: effectInfo.phase <= 8 ? "反映中" : "後のフェーズで反映予定"
        });
      });
    });
    return entries;
  }

  function getInactiveEffects(state) {
    var entries = [];
    getOwnedRelicsByEnabled(state, false).forEach(function (view) {
      view.effectValues.forEach(function (effectInfo) {
        var described = describeEffect(effectInfo);
        entries.push({
          relicId: view.id,
          relicName: view.name,
          rank: view.rank,
          limitBreak: view.limitBreak,
          category: described.category,
          target: described.target,
          currentLabel: described.currentLabel,
          implementationStatus: "OFF中"
        });
      });
    });
    return entries;
  }

  function isInfinityRelicEnabled(state) {
    return Boolean(state.ownedRelics && state.ownedRelics.if_infinity && state.ownedRelics.if_infinity.enabled !== false);
  }

  function hasBatchDrawRelic(relicId, state) {
    return Boolean(state.ownedRelics && state.ownedRelics[relicId] && state.ownedRelics[relicId].enabled !== false);
  }

  function hasLongPressRelic(state) {
    return Boolean(state.ownedRelics && state.ownedRelics.altar_ssr_long_press);
  }

  function isLongPressEnabled(state) {
    return Boolean(state.ownedRelics && state.ownedRelics.altar_ssr_long_press && state.ownedRelics.altar_ssr_long_press.enabled !== false);
  }

  function hasAutoStartRelic(state) {
    return Boolean(state.ownedRelics && state.ownedRelics.altar_lr_auto_start);
  }

  function isAutoStartEnabled(state) {
    return Boolean(state.ownedRelics && state.ownedRelics.altar_lr_auto_start && state.ownedRelics.altar_lr_auto_start.enabled !== false);
  }

  function calculateAutoButtonInterval(state) {
    var owned = state.ownedRelics && state.ownedRelics.altar_lr_auto_start;
    var limitBreak = owned ? Math.max(0, (owned.count || 1) - 1) : 0;
    var growth = calculateLimitBreakGrowthMultiplier("LR", limitBreak);
    return Math.max(data.AUTO_MIN_INTERVAL || 100, Math.floor((data.AUTO_BASE_INTERVAL || 1000) / Math.max(1, growth)));
  }

  function calculateShopDiscountRate(state) {
    var owned = state.ownedRelics && state.ownedRelics.bug_ssr_discount;
    if (!owned || owned.enabled === false) {
      return 0;
    }
    return Math.min(0.8, 0.05 + Math.max(0, (owned.count || 1) - 1) * 0.01);
  }

  function applyShopDiscount(baseCost, state) {
    var safeBaseCost = Math.max(0, Math.floor(baseCost || 0));
    if (safeBaseCost <= 0) {
      return 0;
    }
    return Math.max(1, Math.ceil(safeBaseCost * (1 - calculateShopDiscountRate(state))));
  }

  function getRankMatchedBugDropRate(rank) {
    return data.BUG_RANK_RELIC_DROP_RATE[rank] || 0;
  }

  function getRelicsByRankForBugDrop(rank) {
    return data.RELICS.filter(function (relic) {
      var obtainType = relic.obtainType || "gacha";
      return relic.rank === rank && (obtainType === "gacha" || obtainType === "normal");
    }).map(function (relic) {
      return relic.id;
    });
  }

  function getBatchDrawOptions(state) {
    return [
      { id: "ten", relicId: "altar_ssr_multi_10", label: "10連ガチャ", count: 10, cost: 10000, enabled: hasBatchDrawRelic("altar_ssr_multi_10", state) },
      { id: "hundred", relicId: "altar_lr_multi_100", label: "100連ガチャ", count: 100, cost: 100000, enabled: hasBatchDrawRelic("altar_lr_multi_100", state) },
      { id: "allStone", relicId: "altar_br_multiverse", label: "全石ガチャ", count: "all", cost: "all", enabled: hasBatchDrawRelic("altar_br_multiverse", state) }
    ];
  }

  function isBatchDrawEnabled(type, state) {
    return getBatchDrawOptions(state).some(function (option) {
      return option.id === type && option.enabled;
    });
  }

  function buildSummary(state) {
    return {
      stats: calculatePlayerStats(state),
      relicViews: getAllRelicViews(state),
      idleStone: calculateIdleStoneGain(state),
      missStone: calculateMissStoneGain(state),
      gachaBonus: calculateGachaCountBonus(state),
      rateTable: calculateRateModifiers(state),
      battleStats: calculateBattleStats(state),
      activeEffects: getActiveEffects(state),
      inactiveEffects: getInactiveEffects(state),
      decomposeBonus: calculateDecomposeBonus(state),
      stoneGain: calculateStoneGainMultiplier(state),
      rerollEffects: calculateRerollEffects(state),
      gachaCost: calculateGachaCost(state),
      extraBugRelicDropRate: calculateExtraBugRelicDropRate(state),
      ifInfo: calculateIfInfo(state),
      infinityRateInfo: calculateInfinityRateInfo(state),
      finiteRelicGrowthPerGacha: calculateFiniteRelicGrowth(state),
      shardRandomRateGrowthPerGacha: calculateShardRandomRateGrowth(state),
      shardGrowthMultiplier: calculateRandomRateGrowthMultiplier(state),
      infinityBugDamageReduction: calculateInfinityBugDamageReduction(state),
      infinityBugDamageBonus: calculateInfinityBugDamageBonus(state),
      infinityBugDefenseOverride: calculateInfinityBugDefenseOverride(state),
      infinityMultiplier: calculateInfinityMultiplier(state),
      nextInfinityMultiplier: calculateNextInfinityMultiplier(state),
      rebirthMultiplier: roundDisplay(1 + getBaseRateRebirthBonus(state)),
      nextRebirthBaseRateBonus: calculateNextRebirthBaseRateBonus(state),
      zeroRelicGrowthMultiplier: calculateZeroRelicGrowthMultiplier(state),
      zeroRelicRateMultiplier: getZeroRelicRateMultiplier(state),
      slimeGrowthMultiplier: getSlimeGrowthMultiplier(state),
      infinityRelicEnabled: isInfinityRelicEnabled(state),
      longPressUnlocked: hasLongPressRelic(state),
      longPressEnabled: isLongPressEnabled(state),
      autoStartUnlocked: hasAutoStartRelic(state),
      autoStartEnabled: isAutoStartEnabled(state),
      autoButtonInterval: calculateAutoButtonInterval(state),
      shopDiscountRate: calculateShopDiscountRate(state),
      altarEvent: getActiveAltarEvent(state),
      altarRateBonus: calculateAltarRateBonus(state),
      batchDrawOptions: getBatchDrawOptions(state)
    };
  }

  window.InfinityGachaEffects = {
    roundDisplay: roundDisplay,
    getConvexBonus: getConvexBonus,
    calculateRelicEffectValue: calculateRelicEffectValue,
    getEffectImplementationStatus: getEffectImplementationStatus,
    getAllRelicViews: getAllRelicViews,
    getOwnedRelicsByEnabled: getOwnedRelicsByEnabled,
    describeEffect: describeEffect,
    calculatePlayerStats: calculatePlayerStats,
    calculateIdleStoneGain: calculateIdleStoneGain,
    calculateMissStoneGain: calculateMissStoneGain,
    calculateGachaCountBonus: calculateGachaCountBonus,
    calculateFinalRateMultipliers: calculateFinalRateMultipliers,
    calculateHighRareFocusBonus: calculateHighRareFocusBonus,
    calculateRateModifiers: calculateRateModifiers,
    calculateStoneGainMultiplier: calculateStoneGainMultiplier,
    formatRateDisplay: formatRateDisplay,
    formatTinyPercent: formatTinyPercent,
    getDefaultBugDefeatRateBonus: getDefaultBugDefeatRateBonus,
    getBugDefeatBonusIncrease: getBugDefeatBonusIncrease,
    getBugDefeatBonusCap: getBugDefeatBonusCap,
    getActiveAltarEvent: getActiveAltarEvent,
    calculateAltarRateBonus: calculateAltarRateBonus,
    calculateAltarBugSpawnModifier: calculateAltarBugSpawnModifier,
    calculateAltarBugRewardMultiplier: calculateAltarBugRewardMultiplier,
    calculateAltarStoneMultiplier: calculateAltarStoneMultiplier,
    calculateAltarDecomposeMultiplier: calculateAltarDecomposeMultiplier,
    calculateAltarBugRankBonus: calculateAltarBugRankBonus,
    calculateBugDefeatRateBonuses: calculateBugDefeatRateBonuses,
    calculateRerollEffects: calculateRerollEffects,
    calculateBugSpawnRate: calculateBugSpawnRate,
    calculateBugRankModifier: calculateBugRankModifier,
    calculateBugRewardBonus: calculateBugRewardBonus,
    calculateBugDamageBonus: calculateBugDamageBonus,
    calculateBattleFinalDamageMultiplier: calculateBattleFinalDamageMultiplier,
    calculateBugDamageReduction: calculateBugDamageReduction,
    calculateBattleFinalDamageReduction: calculateBattleFinalDamageReduction,
    calculateCriticalStats: calculateCriticalStats,
    calculateHitRate: calculateHitRate,
    calculateEvasionRate: calculateEvasionRate,
    calculateBattleStats: calculateBattleStats,
    calculatePlayerDamage: calculatePlayerDamage,
    calculateBugDamage: calculateBugDamage,
    calculateDecomposeBonus: calculateDecomposeBonus,
    calculateDecomposeStone: calculateDecomposeStone,
    calculateLimitBreakGrowthMultiplier: calculateLimitBreakGrowthMultiplier,
    getRelicLimitBreakCount: getRelicLimitBreakCount,
    getMaxLimitBreak: getMaxLimitBreak,
    getRankRelicTotal: getRankRelicTotal,
    getRankTotalLimitBreak: getRankTotalLimitBreak,
    getHighestRankMaxLimitBreak: getHighestRankMaxLimitBreak,
    calculateGachaCost: calculateGachaCost,
      calculateExtraBugRelicDropRate: calculateExtraBugRelicDropRate,
      calculateInfinityMultiplier: calculateInfinityMultiplier,
      calculateNextInfinityMultiplier: calculateNextInfinityMultiplier,
      calculateFiniteRelicGrowth: calculateFiniteRelicGrowth,
      calculateShardRandomRateGrowth: calculateShardRandomRateGrowth,
      calculateInfinityRateInfo: calculateInfinityRateInfo,
      calculateInfinityBugDamageReduction: calculateInfinityBugDamageReduction,
      calculateInfinityBugDamageBonus: calculateInfinityBugDamageBonus,
      calculateInfinityBugDefenseOverride: calculateInfinityBugDefenseOverride,
      calculateCreationRelicStatGain: calculateCreationRelicStatGain,
      calculateBaseRateWithRebirth: calculateBaseRateWithRebirth,
      calculateZeroRelicGrowthMultiplier: calculateZeroRelicGrowthMultiplier,
      calculateNextRebirthBaseRateBonus: calculateNextRebirthBaseRateBonus,
      calculateZeroEndingMinimumBaseRate: calculateZeroEndingMinimumBaseRate,
      applyZeroEndingMinimumBaseRate: applyZeroEndingMinimumBaseRate,
      calculateRandomRelicRateMultiplier: calculateRandomRelicRateMultiplier,
      calculateVoidStatLoss: calculateVoidStatLoss,
      reduceVoidStatLoss: reduceVoidStatLoss,
      calculateVoidBossStats: calculateVoidBossStats,
      hasVoidRelic: hasVoidRelic,
      isVoidLikeBattle: isVoidLikeBattle,
      getSlimeGrowthMultiplier: getSlimeGrowthMultiplier,
    getZeroRelicRateMultiplier: getZeroRelicRateMultiplier,
    applyInfinityMultiplierToEffect: applyInfinityMultiplierToEffect,
    calculateIfInfo: calculateIfInfo,
    isInfinityRelicEnabled: isInfinityRelicEnabled,
    hasLongPressRelic: hasLongPressRelic,
    isLongPressEnabled: isLongPressEnabled,
    hasAutoStartRelic: hasAutoStartRelic,
    isAutoStartEnabled: isAutoStartEnabled,
    calculateAutoButtonInterval: calculateAutoButtonInterval,
    calculateShopDiscountRate: calculateShopDiscountRate,
    applyShopDiscount: applyShopDiscount,
    getRankMatchedBugDropRate: getRankMatchedBugDropRate,
    getRelicsByRankForBugDrop: getRelicsByRankForBugDrop,
    hasBatchDrawRelic: hasBatchDrawRelic,
    isBatchDrawEnabled: isBatchDrawEnabled,
    getBatchDrawOptions: getBatchDrawOptions,
    getActiveEffects: getActiveEffects,
    getInactiveEffects: getInactiveEffects,
    buildSummary: buildSummary
  };
})();





