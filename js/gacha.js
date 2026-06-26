(function () {
  var data = window.InfinityGachaData;
  var effects = window.InfinityGachaEffects;

  function getRankConfig(rankKey) {
    return data.GACHA_RANKS.find(function (rank) {
      return rank.key === rankKey;
    }) || null;
  }

  function randomPick(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function addStone(state, amount) {
    var gained = Math.max(0, Math.floor(amount));
    state.stones += gained;
    return gained;
  }

  function looksMojibake(text) {
    return /縺|繧|蛟|螳|險|遏ｳ|驕ｺ|谺｡|蜀|螟|荳|蟄|菴|謌ｦ/.test(String(text || ""));
  }

  function displayRelicName(relic) {
    return data.getRelicDisplayName(relic);
  }

  function displaySourceName(source, fallback) {
    var name = source && source.name ? String(source.name) : "";
    if (!name || looksMojibake(name)) {
      return fallback || "遺物効果";
    }
    return name;
  }

  function joinNames(sources, fallback) {
    return sources.map(function (source) {
      return displaySourceName(source, fallback);
    }).join(" / ");
  }

  function getHighRareLogPrefix(rank) {
    if (rank === "IF") {
      return "ありえない確率が観測された。";
    }
    if (rank === "UR") {
      return "確率が揺らいだ。";
    }
    if (rank === "AR") {
      return "確率の層がめくれた。";
    }
    if (rank === "LR") {
      return "ありえない確率を観測した。";
    }
    if (rank === "GR") {
      return "世界の乱数が書き換わった。";
    }
    if (rank === "BR") {
      return "天命がわずかに歪んだ。";
    }
    if (["QR", "IR", "ER"].indexOf(rank) !== -1) {
      return "深層確率が反応した。";
    }
    if (["SSR", "SSSR"].indexOf(rank) !== -1) {
      return "確率がわずかに歪んだ。";
    }
    return "";
  }

  function getSpecialLogPool() {
    return [
      "ログの端が黒く滲んでいる。",
      "さっき引いたはずの結果が、まだ未来にある。",
      "確率表の一部が読めない。",
      "何も出なかった。だが、本当に何もなかったのか？",
      "乱数がこちらを見ている。",
      "ガチャボタンの文字が一瞬だけ別の言語に見えた。",
      "石の数が、数えることを拒んでいる。",
      "このログは保存されていないはずだった。",
      "無限は終わりではなく、倍率だった。",
      "あなたは一度、すべてを消した。"
    ];
  }

  function maybePushSpecialLog(state, logs, chance) {
    if (!state.specialLogUnlocked || Math.random() >= chance) {
      return;
    }
    logs.push(randomPick(getSpecialLogPool()));
  }

  function getNextDrawCost(state, summary) {
    var interval = summary.gachaBonus.freeInterval;
    var nextCount = state.totalGachaCount + 1;
    var isFree = interval && nextCount % interval === 0;
    var amount = isFree ? 0 : effects.calculateGachaCost(state);
    return {
      amount: amount,
      isFree: Boolean(isFree)
    };
  }

  function rollRankFromRows(rows) {
    var roll = Math.random() * 100;
    var current = 0;

    for (var i = 0; i < rows.length; i += 1) {
      current += rows[i].final;
      if (roll < current) {
        return rows[i].rank;
      }
    }
    return "MISS";
  }

  function rollRank(summary) {
    return rollRankFromRows(summary.rateTable.rows);
  }

  function isBrOrHigher(rank) {
    return ["BR", "QR", "IR", "ER", "IF"].indexOf(rank) !== -1;
  }

  function higherSpecialSeRank(current, candidate) {
    if (!candidate || !isBrOrHigher(candidate)) {
      return current;
    }
    if (!current) {
      return candidate;
    }
    return data.getRankOrderIndex(candidate) < data.getRankOrderIndex(current) ? candidate : current;
  }

  function cloneSummaryWithBatchRates(summary, overrides) {
    if (!overrides) {
      return summary;
    }

    var nextSummary = Object.assign({}, summary);
    var nextRateTable = Object.assign({}, summary.rateTable);
    var rows = summary.rateTable.rows.map(function (row) {
      return Object.assign({}, row);
    });
    var total = 0;

    rows.forEach(function (row) {
      if (Object.prototype.hasOwnProperty.call(overrides, row.rank)) {
        row.final = overrides[row.rank];
      }
      total += row.final;
    });

    nextRateTable.rows = rows;
    nextRateTable.missRate = Math.max(0, 100 - total);
    nextSummary.rateTable = nextRateTable;
    return nextSummary;
  }

  function updateHighestRelicRank(state, rank) {
    if (!state.highestRelicRank || data.isRankAtLeast(rank, state.highestRelicRank)) {
      state.highestRelicRank = rank;
    }
    if (!state.highestObservedRank || data.isRankAtLeast(rank, state.highestObservedRank)) {
      state.highestObservedRank = rank;
    }
  }

  function applyLimitedRelicState(state, relicId) {
    if (relicId === "qr_deep_bug_slayer") {
      state.bugLimitedRelicObtained.QR = true;
      state.limitedRelicDiscovered.qr_deep_bug_slayer = true;
    } else if (relicId === "ir_abyss_bug_slayer") {
      state.bugLimitedRelicObtained.IR = true;
      state.limitedRelicDiscovered.ir_abyss_bug_slayer = true;
    } else if (relicId === "er_infinity_gate") {
      state.bugLimitedRelicObtained.ER = true;
      state.limitedRelicDiscovered.er_infinity_gate = true;
      state.ifUnlocked = true;
    }
  }

  function announceIfUnlock(state, logs) {
    var ifInfo = effects.calculateIfInfo(state);
    if (ifInfo.displayUnlocked && !state.observedIfProbability) {
      state.observedIfProbability = true;
      logs.push("ER到達条件を満たした。遺物画面により、極低確率が表示された。");
      logs.push("IF: " + ifInfo.probabilityText);
    }
  }

  function acquireRelic(state, relicId, logs, options) {
    options = options || {};
    var relic = data.RELIC_INDEX[relicId];
    if (!relic) {
      return null;
    }

    var owned = state.ownedRelics[relicId];
    var isFirst = !owned;
    var nextCount = owned ? owned.count + 1 : 1;
    var limitBreak = Math.max(0, nextCount - 1);
    var relicName = displayRelicName(relic);

    state.ownedRelics[relicId] = {
      count: nextCount,
      enabled: owned ? owned.enabled !== false : relic.autoEnableOnFirstGet !== false,
      acquiredOrder: owned ? owned.acquiredOrder : state.nextAcquiredOrder
    };

    if (isFirst) {
      state.nextAcquiredOrder += 1;
      if (state.discoveredRelics.indexOf(relicId) === -1) {
        state.discoveredRelics.push(relicId);
      }
    }

    state.relicRankTotal[relic.rank] = (state.relicRankTotal[relic.rank] || 0) + 1;
    state.maxRelicCount = Math.max(state.maxRelicCount, nextCount);
    state.maxRelicLimitBreak = Math.max(state.maxRelicLimitBreak, limitBreak);
    state.rankMaxLimitBreak[relic.rank] = Math.max(state.rankMaxLimitBreak[relic.rank] || 0, limitBreak);
    updateHighestRelicRank(state, relic.rank);
    applyLimitedRelicState(state, relicId);
    if (relicId === "if_infinity") {
      state.ifRelicObtained = true;
      state.specialLogUnlocked = true;
    }

    if (["UR", "AR", "LR", "GR", "BR", "QR", "IR", "ER"].indexOf(relic.rank) !== -1) {
      state.specialFlags.subPoint001RelicFound = true;
    }

    if (!options.silent) {
      var prefix = getHighRareLogPrefix(relic.rank);
      if (relicId === "if_infinity") {
        logs.push("ありえない確率が観測された。");
        logs.push("無限の遺物を獲得。");
        logs.push("ログの奥から、まだ存在しない文字列が浮かび上がった。");
        logs.push("無限の遺物をOFF状態で保管しました。");
        logs.push("この遺物は自動では起動しません。");
      } else {
        logs.push((prefix ? prefix : "") + relicName + "を獲得。");
      }
      if (nextCount > 1) {
        logs.push(relicName + "が" + limitBreak + "凸になった。");
      }
    }

    return { relic: relic, isFirst: isFirst, count: nextCount, limitBreak: limitBreak };
  }

  function handlePlaceholderHighRank(state, rankKey, logs) {
    var stone = Math.max(1, Math.floor((effects.calculateStoneGainMultiplier(state).multiplier || 1) * 1000));
    state.stones += stone;
    logs.push(rankKey + "遺物を観測したが、まだ深層確率として実装していない。代わりに石を" + stone.toLocaleString("ja-JP") + "個獲得した。");
  }

  function applyObservationBonus(state, summary, logs) {
    if (!summary.gachaBonus.observationChance) {
      return;
    }
    if (Math.random() < summary.gachaBonus.observationChance) {
      var gained = addStone(state, 1 * summary.stoneGain.multiplier);
      logs.push(joinNames(summary.gachaBonus.observationSources, "観測の遺物") + "により石を" + gained + "個獲得。");
    }
  }

  function applyTotalGachaBonus(state, summary, logs) {
    if (!summary.gachaBonus.rawTotal10 || state.totalGachaCount % 10 !== 0) {
      return;
    }
    summary.gachaBonus.total10Sources.forEach(function (source) {
      var gained = addStone(state, source.value * summary.stoneGain.multiplier);
      logs.push(displaySourceName(source, "回数報酬") + "により石を" + gained + "個獲得。");
    });
  }

  function applyMissCounterBonus(state, summary, logs) {
    if (!summary.gachaBonus.rawMiss10 || state.missCount < 10) {
      return;
    }
    state.missCount -= 10;
    summary.gachaBonus.miss10Sources.forEach(function (source) {
      var gained = addStone(state, source.value * summary.stoneGain.multiplier);
      logs.push(displaySourceName(source, "ハズレ報酬") + "により石を" + gained + "個獲得。");
    });
  }

  function applyMissReward(state, summary, logs) {
    var baseGain = summary.missStone.flat;
    var sourceNames = summary.missStone.flatSources.slice();

    if (baseGain <= 0 && summary.missStone.chance > 0 && Math.random() < summary.missStone.chance) {
      baseGain = 1;
      sourceNames = sourceNames.concat(summary.missStone.chanceSources);
    }

    baseGain += summary.missStone.bonusStoneFlat;
    if (baseGain <= 0) {
      logs.push("何も出なかった。");
      return;
    }

    var totalGain = Math.floor(baseGain * summary.missStone.multiplier);
    if (totalGain <= 0) {
      logs.push("何も出なかった。");
      return;
    }

    state.stones += totalGain;
    var prefix = sourceNames.length ? joinNames(sourceNames, "遺物効果") + "により" : "";
    logs.push("何も出なかった。" + prefix + "石を" + totalGain + "個獲得。");
  }

  function rerollRestrictedRank(summary, allowedRanks) {
    var rows = summary.rateTable.rows
      .filter(function (row) { return allowedRanks.indexOf(row.rank) !== -1; })
      .map(function (row) { return { rank: row.rank, final: row.final }; });
    return rollRankFromRows(rows);
  }

  function resolveMissReroll(state, summary, logs) {
    var rerolls = summary.rerollEffects;

    if (rerolls.erRate > 0 && Math.random() < rerolls.erRate) {
      logs.push("ER系効果により、ハズレが再抽選された。");
      return rollRank(summary);
    }

    if (rerolls.irRate > 0 && Math.random() < rerolls.irRate) {
      logs.push("IR系効果により、ハズレが強化再抽選された。");
      return rollRank(summary);
    }

    if (rerolls.qrRate > 0 && Math.random() < rerolls.qrRate) {
      logs.push("QR系効果により、ハズレが再抽選された。");
      return rollRank(summary);
    }

    if (rerolls.brRate > 0 && Math.random() < rerolls.brRate) {
      logs.push("BR系効果により、ハズレを拒絶した。");
      logs.push("再抽選を行います。");
      var brRank = rollRank(summary);
      if (brRank === "MISS" && rerolls.rerollFailStone > 0) {
        state.stones += rerolls.rerollFailStone;
        logs.push("再抽選でも何も出なかった。石を" + rerolls.rerollFailStone + "個獲得。");
      }
      return brRank;
    }

    if (rerolls.grRate > 0 && Math.random() < rerolls.grRate) {
      logs.push("GR系効果により、ハズレを別抽選へ変換した。");
      logs.push("N〜SSSRから再抽選を行います。");
      return rerollRestrictedRank(summary, ["N", "S", "SR", "SSR", "SSSR"]);
    }

    if (rerolls.lrRate > 0 && Math.random() < rerolls.lrRate) {
      logs.push("LR系効果により、ハズレをなかったことにした。");
      logs.push("再抽選を行います。");
      return rollRank(summary);
    }

    if (rerolls.arRate > 0 && Math.random() < rerolls.arRate) {
      logs.push("AR再抽選の効果がもう一度確率を試みた。");
      logs.push("再抽選を行います。");
      return rollRank(summary);
    }

    return "MISS";
  }

  function resolveRankResult(state, summary, rankKey, logs) {
    if (rankKey === "MISS") {
      return false;
    }

    var rank = getRankConfig(rankKey);
    if (!rank || !rank.relicIds || !rank.relicIds.length) {
      handlePlaceholderHighRank(state, rankKey, logs);
      return true;
    }

    var relicPool = rank.relicIds.filter(function (relicId) {
      var relic = data.RELIC_INDEX[relicId];
      return relic && ["gacha", "if_gacha"].indexOf(relic.obtainType || "gacha") !== -1;
    });
    var relicId = randomPick(relicPool.length ? relicPool : rank.relicIds);
    if (!data.RELIC_INDEX[relicId]) {
      handlePlaceholderHighRank(state, rankKey, logs);
      return true;
    }

    acquireRelic(state, relicId, logs);
    return true;
  }

  function drawGacha(state, summary) {
    var logs = [];
    var costInfo = getNextDrawCost(state, summary);

    if (!costInfo.isFree && state.stones < costInfo.amount) {
      return { ok: false, logs: ["石が足りません。"] };
    }

    if (costInfo.isFree) {
      logs.push("無料効果により、今回のガチャ消費は0になった。");
    } else {
      state.stones -= costInfo.amount;
      if (costInfo.amount > data.GACHA_COST) {
        logs.push("追加コスト効果により、ガチャ消費石が増加している。");
      }
    }

    var drawResult = performSingleDraw(state, summary, logs, {});

    return { ok: true, logs: logs, specialSeRank: isBrOrHigher(drawResult.finalRank) ? drawResult.finalRank : null };
  }

  function rankToPendingBug(rank) {
    if (rank === "IF") {
      return "ER";
    }
    if (["S", "SR", "SSR", "SSSR", "UR", "AR", "LR", "GR", "BR", "QR", "IR", "ER"].indexOf(rank) !== -1) {
      return rank;
    }
    return null;
  }

  function isHigherBugRank(candidate, current) {
    if (!candidate) {
      return false;
    }
    if (!current) {
      return true;
    }
    return data.getRankOrderIndex(candidate) < data.getRankOrderIndex(current);
  }

  function performSingleDraw(state, summary, logs, options) {
    options = options || {};
    state.totalGachaCount += 1;
    var beforeDiscovered = state.discoveredRelics.slice();
    var rankKey = summary.ifInfo && summary.ifInfo.drawEnabled && Math.random() * 100 < summary.ifInfo.rate
      ? "IF"
      : rollRank(summary);

    var result = {
      rankKey: rankKey,
      finalRank: rankKey,
      firstBugRank: null
    };

    if (rankKey === "MISS") {
      state.totalMissCount += 1;
      state.missCount += 1;

      var rerolledRank = resolveMissReroll(state, summary, logs);
      if (rerolledRank !== "MISS") {
        result.finalRank = rerolledRank;
        resolveRankResult(state, summary, rerolledRank, logs);
      } else {
        applyMissReward(state, summary, logs);
        applyMissCounterBonus(state, summary, logs);
      }
    } else {
      resolveRankResult(state, summary, rankKey, logs);
    }

    var newlyDiscovered = state.discoveredRelics.filter(function (relicId) {
      return beforeDiscovered.indexOf(relicId) === -1;
    });
    newlyDiscovered.forEach(function (relicId) {
      var relic = data.RELIC_INDEX[relicId];
      var bugRank = relic ? rankToPendingBug(relic.rank) : null;
      if (isHigherBugRank(bugRank, result.firstBugRank)) {
        result.firstBugRank = bugRank;
      }
    });

    applyTotalGachaBonus(state, summary, logs);
    applyObservationBonus(state, summary, logs);
    announceIfUnlock(state, logs);
    maybePushSpecialLog(state, logs, rankKey === "IF" || ["UR", "AR", "LR", "GR", "BR", "QR", "IR", "ER"].indexOf(result.finalRank) !== -1 ? 0.1 : 0.01);
    return result;
  }

  function summarizeBatchResults(counts, totalCount) {
    var order = ["MISS", "N", "S", "SR", "SSR", "SSSR", "UR", "AR", "LR", "GR", "BR", "QR", "IR", "ER", "IF"];
    var lines = [totalCount.toLocaleString("ja-JP") + "連結果まとめ："];
    order.forEach(function (rank) {
      if (counts[rank] > 0) {
        lines.push((rank === "MISS" ? "ハズレ" : rank) + "：" + counts[rank].toLocaleString("ja-JP"));
      }
    });
    return lines;
  }

  function drawBatchGacha(state, count, cost, options) {
    options = options || {};
    var summary = cloneSummaryWithBatchRates(options.summary || effects.buildSummary(state), options.rateOverrides);
    var logs = [];
    if (cost <= 0 || state.stones < cost) {
      return { ok: false, logs: [options.insufficientMessage || "石が足りません。"] };
    }

    state.stones -= cost;
    logs.push((options.type || "連続ガチャ") + "を実行した。");
    logs.push("石を" + cost.toLocaleString("ja-JP") + "個消費した。");
    if ((options.type || "").indexOf("全石") !== -1) {
      logs.push(count.toLocaleString("ja-JP") + "回分の抽選を開始。");
    }

    var counts = {};
    var highRareLogs = [];
    var highestPendingBugRank = null;
    var specialSeRank = null;

    for (var i = 0; i < count; i += 1) {
      var localLogs = [];
      var drawResult = performSingleDraw(state, summary, localLogs, { silent: true });
      var finalRank = drawResult.finalRank || "MISS";
      counts[finalRank] = (counts[finalRank] || 0) + 1;
      if (isHigherBugRank(drawResult.firstBugRank, highestPendingBugRank)) {
        highestPendingBugRank = drawResult.firstBugRank;
      }
      specialSeRank = higherSpecialSeRank(specialSeRank, finalRank);
      if (["SSR", "SSSR", "UR", "AR", "LR", "GR", "BR", "QR", "IR", "ER", "IF"].indexOf(finalRank) !== -1) {
        Array.prototype.push.apply(highRareLogs, localLogs.filter(function (line) {
          return /獲得。|観測された。/.test(line);
        }).slice(0, 3));
      }
    }

    Array.prototype.push.apply(logs, summarizeBatchResults(counts, count));
    if (highRareLogs.length) {
      logs.push("高レア観測：");
      Array.prototype.push.apply(logs, highRareLogs.slice(0, 30));
    }

    return {
      ok: true,
      logs: logs,
      pendingBugRank: highestPendingBugRank,
      specialSeRank: specialSeRank
    };
  }

  function executeTenDraw(state, summary) {
    return drawBatchGacha(state, 10, 10000, {
      type: "10連ガチャ",
      summary: summary,
      rateOverrides: {
        SSR: 1,
        SSSR: 0.1,
        UR: 0.01
      },
      insufficientMessage: "10連ガチャに必要な石が足りません。必要石：10,000"
    });
  }

  function executeHundredDraw(state, summary) {
    return drawBatchGacha(state, 100, 100000, {
      type: "100連ガチャ",
      summary: summary,
      rateOverrides: {
        SSR: 5,
        SSSR: 1,
        UR: 0.1,
        AR: 0.001,
        LR: 0.0001
      },
      insufficientMessage: "100連ガチャに必要な石が足りません。必要石：100,000"
    });
  }

  function executeAllStoneDraw(state, summary) {
    if (state.stones <= 0) {
      return { ok: false, logs: ["全石ガチャは石が1以上必要です。"] };
    }
    var count = state.stones;
    return drawBatchGacha(state, count, count, {
      type: "全石ガチャ",
      summary: summary,
      insufficientMessage: "全石ガチャは石が1以上必要です。"
    });
  }

  window.InfinityGachaEngine = {
    addStone: addStone,
    acquireRelic: acquireRelic,
    drawGacha: drawGacha,
    getNextDrawCost: getNextDrawCost,
    drawBatchGacha: drawBatchGacha,
    executeTenDraw: executeTenDraw,
    executeHundredDraw: executeHundredDraw,
    executeAllStoneDraw: executeAllStoneDraw
  };
})();


