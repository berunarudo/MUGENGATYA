(function () {
  var data = window.InfinityGachaData;
  var effects = window.InfinityGachaEffects;
  var achievements = window.InfinityGachaAchievements;
  var decompose = window.InfinityGachaDecompose;
  var dungeon = window.InfinityGachaDungeon;
  var help = window.InfinityGachaHelp;

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatNumber(value) {
    return Number(value).toFixed(2).replace(/\.00$/, "");
  }

  function formatPercent(value) {
    return formatNumber(value) + "%";
  }

  function formatMultiplier(value) {
    return formatNumber(value) + "倍";
  }

  function formatRateValue(value) {
    return effects.formatRateDisplay(value);
  }

  function detailCell(label, value) {
    return '<span class="detail-label">' + escapeHtml(label) + '</span><span class="detail-value">' + escapeHtml(String(value)) + '</span>';
  }

  function formatCostLabel(baseCost, discountedCost) {
    if (discountedCost < baseCost) {
      return '通常 ' + baseCost.toLocaleString('ja-JP') + '石 / 割引後 ' + discountedCost.toLocaleString('ja-JP') + '石';
    }
    return discountedCost.toLocaleString('ja-JP') + '石';
  }

  function getAutoStatusText(summary, state) {
    var autoState = (state && state.autoButtonState) || { lastPlayerActionAt: Date.now(), isRunning: false };
    if (!summary.autoStartUnlocked) {
      return { footer: 'AUTO: 未所持', state: '未所持', remaining: '-', interval: '-', css: 'long-press-status long-press-disabled' };
    }
    if (!summary.autoStartEnabled) {
      return { footer: 'AUTO: OFF', state: 'OFF', remaining: '-', interval: summary.autoButtonInterval + 'ms', css: 'long-press-status long-press-disabled' };
    }
    if (autoState.isRunning) {
      return { footer: 'AUTO: 実行中 ' + summary.autoButtonInterval + 'ms', state: '実行中', remaining: '0.0秒', interval: summary.autoButtonInterval + 'ms', css: 'long-press-status long-press-active' };
    }
    return {
      footer: 'AUTO: 待機中 ' + Math.max(0, (data.AUTO_START_IDLE_TIME - (Date.now() - autoState.lastPlayerActionAt)) / 1000).toFixed(1) + '秒',
      state: '待機中',
      remaining: Math.max(0, (data.AUTO_START_IDLE_TIME - (Date.now() - autoState.lastPlayerActionAt)) / 1000).toFixed(1) + '秒',
      interval: summary.autoButtonInterval + 'ms',
      css: 'long-press-status'
    };
  }

  function looksMojibake(text) {
    return /(?:\u7E3A|\u7E67|\u8373|\u86DF|\u8757|\u9015|\u9052\uFF7A|\u87B3|\u8703\uFF7A|\u8B3E\uFF7B\u8B26|\u9AEA\uFF72|\u9A55\uFF7A|\u9695\uFF73)/.test(String(text || ""));
  }

  function displayRelicName(view) {
    return data.getRelicDisplayName(view);
  }

  function effectLabel(effectInfo) {
    var described = effects.describeEffect(effectInfo);
    return described.currentLabel;
  }

  function baseEffectLabel(effectInfo) {
    var described = effects.describeEffect(effectInfo);
    return described.baseLabel;
  }

  function displayRelicDescription(view) {
    var effectText = view.effectValues.map(effectLabel).join(' / ');
    if (effectText) {
      return effectText;
    }
    if (!looksMojibake(view.description)) {
      return view.description;
    }
    return '効果未設定';
  }

  function normalizeEffectText(text, fallback) {
    return looksMojibake(text) ? fallback : text;
  }

  function getRelicTabs() {
    return [
      { value: "all", label: "全て" },
      { value: "0", label: "0" },
      { value: "N", label: "N" },
      { value: "S", label: "S" },
      { value: "SR", label: "SR" },
      { value: "SSR", label: "SSR" },
      { value: "SSSR", label: "SSSR" },
      { value: "UR", label: "UR" },
      { value: "AR", label: "AR" },
      { value: "LR", label: "LR" },
      { value: "GR", label: "GR" },
      { value: "BR", label: "BR" },
      { value: "QR", label: "QR" },
      { value: "IR", label: "IR" },
      { value: "ER", label: "ER" },
      { value: "IF", label: "IF" },
      { value: "infinity", label: "∞" },
      { value: "urPlus", label: "UR以上" },
      { value: "unowned", label: "未所持" },
      { value: "unobserved", label: "未観測" }
    ];
  }

  function buildProbabilityHtml(summary) {
    var rows = summary.rateTable.rows.slice().reverse().map(function (row) {
      return '<div class="probability-row"><span class="probability-rank">' + escapeHtml(row.label) + '</span><span class="probability-rate">' + escapeHtml(formatRateValue(row.final)) + '</span></div>';
    });

    rows.unshift('<div class="probability-row"><span class="probability-rank">はずれ</span><span class="probability-rate">' + escapeHtml(formatRateValue(summary.rateTable.missRate)) + '</span></div>');

    rows.unshift('<div class="probability-row"><span class="probability-rank">IF</span><span class="probability-rate">' + escapeHtml(summary.ifInfo ? summary.ifInfo.probabilityText : "未観測") + '</span></div>');

    return rows.join('');
  }

  function renderRelicTabs(activeTab) {
    return '<div class="tabs">' + getRelicTabs().map(function (tab) {
      return '<button type="button" class="tab-button ' + (activeTab === tab.value ? 'is-active' : '') + '" data-relic-tab="' + tab.value + '">' + escapeHtml(tab.label) + '</button>';
    }).join('') + '</div>';
  }

  function renderRelicSort(sortMode) {
    var options = [
      { value: 'acquired', label: '入手順' },
      { value: 'rank', label: 'ランク順' },
      { value: 'count', label: '所持数が多い順' },
      { value: 'limitBreak', label: '凸数が多い順' },
      { value: 'name', label: '名前順' },
      { value: 'onOnly', label: 'ONのみ' },
      { value: 'offOnly', label: 'OFFのみ' },
      { value: 'unownedOnly', label: '未所持のみ' }
    ];

    return '<div class="sort-wrap"><label for="relic-sort">並び替え</label><select id="relic-sort" data-relic-sort>' + options.map(function (option) {
      return '<option value="' + option.value + '"' + (sortMode === option.value ? ' selected' : '') + '>' + escapeHtml(option.label) + '</option>';
    }).join('') + '</select></div>';
  }

  function isUrPlusRank(rank) {
    return ['UR', 'AR', 'LR', 'GR', 'BR', 'QR', 'IR', 'ER'].indexOf(rank) !== -1;
  }

  function filterRelics(relicViews, activeTab, sortMode) {
    var filtered = relicViews.slice();

    if (activeTab === 'unowned') {
      filtered = filtered.filter(function (view) { return !view.owned; });
    } else if (activeTab === 'unobserved') {
      filtered = filtered.filter(function (view) { return !view.discovered; });
    } else if (activeTab === 'infinity') {
      filtered = filtered.filter(function (view) { return view.uiRank === '∞' || view.id === 'if_infinity' || view.id === 'infinity_slime_relic'; });
    } else if (activeTab === 'urPlus') {
      filtered = filtered.filter(function (view) { return isUrPlusRank(view.rank); });
    } else if (activeTab !== 'all') {
      filtered = filtered.filter(function (view) { return view.rank === activeTab; });
    }

    if (sortMode === 'onOnly') {
      filtered = filtered.filter(function (view) { return view.owned && view.enabled; });
    } else if (sortMode === 'offOnly') {
      filtered = filtered.filter(function (view) { return view.owned && !view.enabled; });
    } else if (sortMode === 'unownedOnly') {
      filtered = filtered.filter(function (view) { return !view.owned; });
    }

    filtered.sort(function (a, b) {
      if (sortMode === 'rank') {
        return data.getRankOrderIndex(a.rank) - data.getRankOrderIndex(b.rank);
      }
      if (sortMode === 'count') {
        return (b.count || 0) - (a.count || 0);
      }
      if (sortMode === 'limitBreak') {
        return (b.limitBreak || 0) - (a.limitBreak || 0);
      }
      if (sortMode === 'name') {
        return a.name.localeCompare(b.name, 'ja');
      }
      return (a.acquiredOrder || 999999) - (b.acquiredOrder || 999999);
    });

    return filtered;
  }

  function renderRelicList(summary, relicUiState) {
    var filtered = filterRelics(summary.relicViews, relicUiState.activeTab, relicUiState.sortMode);
    if (!filtered.length) {
      return '<div class="empty-text">表示できる遺物はありません。</div>';
    }

    return filtered.map(function (view) {
      var currentEffects = view.effectValues.map(function (effectInfo) {
        return effectLabel(effectInfo);
      }).join(' / ');
      var baseEffects = view.effectValues.map(function (effectInfo) {
        return baseEffectLabel(effectInfo);
      }).join(' / ');
      var relicName = (view.owned || view.discovered || view.id !== 'if_infinity') ? displayRelicName(view) : '未観測';
      var description = displayRelicDescription(view);
      var rankLabel = view.uiRank || view.rank;
      if (!view.discovered && view.id === 'if_infinity') {
        description = '未観測';
        currentEffects = '未観測';
      }

      var toggle = view.owned
        ? '<button type="button" class="toggle-button ' + (view.enabled ? 'is-on' : '') + '" data-relic-toggle="' + escapeHtml(view.id) + '">' + (view.enabled ? 'ON' : 'OFF') + '</button>'
        : '<button type="button" class="toggle-button" disabled>未所持</button>';

      return '<article class="relic-card">' +
        '<div class="relic-head"><div><div class="inventory-name">[' + escapeHtml(rankLabel) + '] ' + escapeHtml(relicName) + '</div>' +
        '<div class="relic-meta">所持数: ' + escapeHtml(view.count) + ' / 凸数: ' + escapeHtml(view.owned ? view.limitBreak : '-') + ' / 状態: ' + escapeHtml(view.owned ? (view.enabled ? 'ON' : 'OFF') : '未所持') + '</div></div>' + toggle + '</div>' +
        '<div class="detail-row"><span class="detail-label">効果</span><span class="detail-value">' + escapeHtml(description) + '</span></div>' +
        '<div class="detail-row"><span class="detail-label">基礎効果</span><span class="detail-value">' + escapeHtml(baseEffects || 'なし') + '</span></div>' +
        '<div class="detail-row"><span class="detail-label">凸成長倍率</span><span class="detail-value">' + escapeHtml(formatMultiplier(view.limitBreakGrowthMultiplier || 1)) + '</span></div>' +
        '<div class="detail-row"><span class="detail-label">入手区分</span><span class="detail-value">' + escapeHtml(view.obtainType === 'zero_slime_reward' ? '0スライム報酬' : view.obtainType === 'bug_drop_only' ? 'バグ限定' : view.obtainType === 'if_gacha' ? 'IF抽選' : view.obtainType === 'altar_only' ? '祭壇限定' : '通常ガチャ') + '</span></div>' +
        (view.dropBugRank ? '<div class="detail-row"><span class="detail-label">対応バグ</span><span class="detail-value">' + escapeHtml(view.dropBugRank + 'バグ') + '</span></div>' : '') +
        '<div class="detail-row"><span class="detail-label">現在効果</span><span class="detail-value">' + escapeHtml(currentEffects || 'なし') + '</span></div>' +
        '<div class="detail-row"><span class="detail-label">実装状態</span><span class="detail-value">' + escapeHtml(view.implementationStatus.label) + '</span></div>' +
        (view.id === 'if_infinity' ? '<div class="detail-row"><span class="detail-label">警告</span><span class="detail-value">この遺物をONにすると、ガチャボタンが「無限」に変化します。「無限」を押すと、通常データは初期化されます。</span></div>' : '') +
      '</article>';
    }).join('');
  }

  function renderRelicView(summary, relicUiState) {
    return '<div class="toolbar">' + renderRelicTabs(relicUiState.activeTab) + renderRelicSort(relicUiState.sortMode) + '</div>' + renderRelicList(summary, relicUiState);
  }

  function battleBonusSummary(battleStats) {
    var parts = [];
    if (battleStats.damageBonus.bonusFlat) {
      parts.push('与ダメ+' + formatNumber(battleStats.damageBonus.bonusFlat));
    }
    if (battleStats.damageBonus.bonusMultiplier) {
      parts.push('与ダメ+' + formatNumber(battleStats.damageBonus.bonusMultiplier * 100) + '%');
    }
    if (battleStats.damageReduction.flat) {
      parts.push('被ダメ-' + formatNumber(battleStats.damageReduction.flat));
    }
    if (battleStats.damageReduction.multiplier) {
      parts.push('被ダメ-' + formatNumber(battleStats.damageReduction.multiplier * 100) + '%');
    }
    if (battleStats.startDamage) {
      parts.push('開幕ダメージ' + formatNumber(battleStats.startDamage));
    }
    return parts.length ? parts.join(' / ') : 'なし';
  }

  function renderRateTable(summary) {
    var rows = summary.rateTable.rows.map(function (row) {
      return '<tr><td>' + escapeHtml(row.rank) + '</td><td>' + escapeHtml(row.baseDisplay || formatRateValue(row.base)) + '</td><td>' + escapeHtml(row.rebirthBaseDisplay || formatRateValue(row.rebirthBase || row.base)) + '</td><td>' + escapeHtml(formatMultiplier(summary.rateTable.rebirthMultiplier || 1)) + '</td><td>' + escapeHtml(formatMultiplier(summary.rateTable.zeroRelicRateMultiplier || 1)) + '</td><td>' + escapeHtml(formatRateValue(row.add)) + '</td><td>' + escapeHtml(formatRateValue(row.subtract)) + '</td><td>' + escapeHtml(formatMultiplier(row.multiplier || 1)) + '</td><td>' + escapeHtml(formatMultiplier(row.bugDefeatMultiplier || 1)) + '</td><td>' + escapeHtml(formatRateValue(row.final)) + '</td></tr>';
    }).join('');

    rows += '<tr><td>はずれ</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>' + escapeHtml(formatRateValue(summary.rateTable.missRate)) + '</td></tr>';
    rows += '<tr><td>IF</td><td>' + escapeHtml(summary.ifInfo && summary.ifInfo.drawEnabled ? "0.0000000000000000000000000000001%" : "未観測") + '</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>' + escapeHtml(summary.ifInfo ? summary.ifInfo.probabilityText : "未観測") + '</td></tr>';

    return '<div class="box-block"><h3>現在のガチャ確率補正</h3><table class="data-table"><thead><tr><th>ランク</th><th>初期基礎確率</th><th>転生後基礎確率</th><th>転生倍率</th><th>0の遺物補正</th><th>加算</th><th>減少</th><th>倍率補正</th><th>撃破倍率補正</th><th>最終確率</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function renderRateSummary(summary) {
    var multipliers = summary.rateTable.multipliers;
    var focusInfo = summary.rateTable.focusInfo || {};

    return '<div class="box-block"><h3>高レア補正</h3><div class="detail-grid">' +
      detailCell('全レア最終倍率', formatMultiplier(multipliers.allRare)) +
      detailCell('S以上倍率', formatMultiplier(multipliers.sPlus)) +
      detailCell('BR以上倍率', formatMultiplier(multipliers.brPlus)) +
      detailCell('QR以上倍率', formatMultiplier(multipliers.qrPlus)) +
      detailCell('IR以上倍率', formatMultiplier(multipliers.irPlus)) +
      detailCell('ER以上倍率', formatMultiplier(multipliers.erPlus)) +
      detailCell('はずれ減少', formatRateValue(multipliers.missRateSubtractFlat)) +
      detailCell('低位高レア補正', formatMultiplier(multipliers.lowerRateBoostMultiplier)) +
      detailCell('最低高レア対象', focusInfo.highRareTarget ? (focusInfo.highRareTarget + ' / ' + formatMultiplier(focusInfo.highRareMultiplier || 1)) : 'なし') +
      detailCell('最低UR以上対象', focusInfo.urPlusTarget ? (focusInfo.urPlusTarget + ' / ' + formatMultiplier(focusInfo.urPlusMultiplier || 1)) : 'なし') +
    '</div></div>';
  }

  function renderEffectTable(list, title, emptyText) {
    if (!list.length) {
      return '<div class="box-block"><div class="empty-text">' + escapeHtml(emptyText) + '</div></div>';
    }

    return '<div class="box-block"><h3>' + escapeHtml(title) + '</h3><table class="data-table"><thead><tr><th>遺物名</th><th>ランク</th><th>凸数</th><th>分類</th><th>現在効果</th><th>対象</th></tr></thead><tbody>' + list.map(function (entry) {
      return '<tr><td>' + escapeHtml(normalizeEffectText(entry.relicName, entry.rank + '遺物')) + '</td><td>' + escapeHtml(entry.rank) + '</td><td>' + escapeHtml(entry.limitBreak) + '</td><td>' + escapeHtml(normalizeEffectText(entry.category, '効果')) + '</td><td>' + escapeHtml(normalizeEffectText(entry.currentLabel, '反映中')) + '</td><td>' + escapeHtml(normalizeEffectText(entry.target, '-')) + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  }

  function renderStatusView(summary, state) {
    var stats = summary.stats;
    var battleStats = summary.battleStats;
    var stoneGain = summary.stoneGain;
    var rerolls = summary.rerollEffects;
    var autoInfo = getAutoStatusText(summary, state);

    var descriptions = Object.keys(data.STAT_DESCRIPTIONS).map(function (key) {
      var labels = {
        hp: 'HP',
        attack: '攻撃',
        defense: '防御',
        speed: '速度',
        luck: '運',
        accuracy: '命中',
        evasion: '回避率',
        criticalRate: '会心率',
        criticalDamage: '会心ダメージ'
      };
      return '<strong>' + escapeHtml(labels[key] || key) + '</strong><span>' + escapeHtml(data.STAT_DESCRIPTIONS[key]) + '</span>';
    }).join('');

    var bugDefeatBonusRows = Object.keys(summary.rateTable.bugDefeatBonuses || {}).map(function (rank) {
      return '<tr><td>' + escapeHtml(rank) + '</td><td>' + escapeHtml(formatMultiplier(summary.rateTable.bugDefeatBonuses[rank])) + '</td></tr>';
    }).join('');

    return '<div class="box-block"><h3>現在のステータス</h3><div class="detail-grid">' +
      detailCell('HP', stats.hp) +
      detailCell('攻撃', stats.attack) +
      detailCell('防御', stats.defense) +
      detailCell('速度', stats.speed) +
      detailCell('運', stats.luck) +
      detailCell('命中', stats.accuracy) +
      detailCell('回避率', formatPercent(stats.evasion)) +
      detailCell('会心率', formatPercent(battleStats.critical.rate)) +
      detailCell('会心ダメージ', formatPercent(battleStats.critical.damageBonus)) +
      detailCell('10秒ごとの石回復', summary.idleStone.total) +
      detailCell('ハズレ時の石獲得量', summary.missStone.previewTotal) +
      detailCell('ガチャ10回ごとの石', summary.gachaBonus.total10) +
      detailCell('ハズレ10回ごとの石', summary.gachaBonus.miss10) +
      detailCell('現在のガチャ消費', summary.gachaCost) +
      detailCell('無料ガチャ条件', summary.gachaBonus.freeInterval ? summary.gachaBonus.freeInterval + '回ごと' : 'なし') +
      detailCell('石獲得倍率', formatMultiplier(stoneGain.multiplier)) +
      detailCell('再抽選率', 'ER ' + formatPercent(rerolls.erRate * 100) + ' / IR ' + formatPercent(rerolls.irRate * 100) + ' / QR ' + formatPercent(rerolls.qrRate * 100) + ' / BR ' + formatPercent(rerolls.brRate * 100) + ' / GR ' + formatPercent(rerolls.grRate * 100) + ' / LR ' + formatPercent(rerolls.lrRate * 100) + ' / AR ' + formatPercent(rerolls.arRate * 100)) +
      detailCell('再抽選失敗時の石', rerolls.rerollFailStone) +
      detailCell('現在のバグ出現率', formatPercent(battleStats.bugSpawnRate)) +
      detailCell('バグランク補正', (battleStats.bugRankModifier >= 0 ? '+' : '') + battleStats.bugRankModifier) +
      detailCell('バグ報酬倍率', formatMultiplier(battleStats.rewardBonus.rewardMultiplier)) +
      detailCell('バグ戦闘系補正', battleBonusSummary(battleStats)) +
      detailCell('QR以上追加遺物率', formatPercent(summary.extraBugRelicDropRate.qrPlus * 100)) +
      detailCell('IR以上追加遺物率', formatPercent(summary.extraBugRelicDropRate.irPlus * 100)) +
      detailCell('∞凸数', state.infinityCount || 0) +
      detailCell('全遺物効果倍率', formatMultiplier(summary.infinityMultiplier || 1)) +
      detailCell('次の無限実行後', formatMultiplier(summary.nextInfinityMultiplier || 2)) +
      detailCell('転生回数', (state.rebirthState && state.rebirthState.rebirthCount) || 0) +
      detailCell('素の確率倍率', formatMultiplier(summary.rebirthMultiplier || 1)) +
      detailCell('0の遺物', state.zeroRelicState && state.zeroRelicState.owned ? '所持' : '未所持') +
      detailCell('0の遺物状態', state.zeroRelicState && state.zeroRelicState.owned ? ((state.zeroRelicState.enabled ? 'ON' : 'OFF') + ' / ' + ((state.zeroRelicState.limitBreak || 0) + '凸')) : '未所持') +
      detailCell('次回転生時上昇', '+' + formatPercent((summary.nextRebirthBaseRateBonus || 0) * 100)) +
      detailCell('0スライム遭遇数', (state.zeroSlimeRecords && state.zeroSlimeRecords.totalEncounters) || 0) +
      detailCell('0スライム撃破数', (state.zeroSlimeRecords && state.zeroSlimeRecords.totalDefeats) || 0) +
      detailCell('スライム神', (state.zeroSlimeRecords && state.zeroSlimeRecords.totalDefeats > 0) ? '達成' : '未達成') +
      detailCell('スライムの遺物', state.permanentRelics && state.permanentRelics.infinity_slime_relic && state.permanentRelics.infinity_slime_relic.owned ? '所持' : '未所持') +
      detailCell('スライム成長倍率', formatMultiplier(summary.slimeGrowthMultiplier || 1)) +
      detailCell('IF解放状態', summary.ifInfo && summary.ifInfo.displayUnlocked ? '観測中' : '未観測') +
      detailCell('IF確率', summary.ifInfo ? summary.ifInfo.probabilityText : '未観測') +
      detailCell('無限の遺物', state.ownedRelics && state.ownedRelics.if_infinity ? '所持' : '未所持') +
      detailCell('無限の遺物状態', state.ownedRelics && state.ownedRelics.if_infinity ? (summary.infinityRelicEnabled ? 'ON' : 'OFF') : '未所持') +
      detailCell('万里の遺物', summary.longPressUnlocked ? '所持' : '未所持') +
      detailCell('長押し状態', summary.longPressUnlocked ? (summary.longPressEnabled ? 'ON' : 'OFF') : '未解放') +
      detailCell('自動起動遺物', summary.autoStartUnlocked ? '所持' : '未所持') +
      detailCell('自動起動状態', autoInfo.state) +
      detailCell('自動起動まで', autoInfo.remaining) +
      detailCell('自動実行間隔', autoInfo.interval) +
      detailCell('ショップ割引率', Math.round((summary.shopDiscountRate || 0) * 100) + '% OFF') +
      detailCell('特殊ログ', state.specialLogUnlocked ? '解放済み' : '未解放') +
      detailCell('現在周回数', (state.infinityCount || 0) + 1) +
      detailCell('解放済みバグ', (state.unlockedBugRanks || []).join(' / ')) +
      detailCell('最高撃破バグ', state.highestDefeatedBugRank || 'なし') +
      detailCell('最高観測ランク', state.highestObservedRank || 'なし') +
      detailCell('分解回数', state.totalDecomposeCount || 0) +
      detailCell('分解獲得石', (state.totalDecomposeStone || 0).toLocaleString('ja-JP')) +
      detailCell('ダンジョン状態', dungeon && dungeon.isInDungeon(state) ? state.dungeonState.name : '通常') +
      detailCell('採掘累計', (state.dungeonRecords && state.dungeonRecords.totalMiningCount) || 0) +
      detailCell('宝石累計', (state.dungeonRecords && state.dungeonRecords.totalGemCount) || 0) +
      detailCell('スライム累計', (state.dungeonRecords && state.dungeonRecords.totalSlimeDefeats) || 0) +
      detailCell('ダンジョンHP補正', (state.dungeonStatBonus && state.dungeonStatBonus.hp) || 0) +
      detailCell('ダンジョン攻撃補正', (state.dungeonStatBonus && state.dungeonStatBonus.attack) || 0) +
      detailCell('ダンジョン防御補正', (state.dungeonStatBonus && state.dungeonStatBonus.defense) || 0) +
      detailCell('ダンジョン速度補正', (state.dungeonStatBonus && state.dungeonStatBonus.speed) || 0) +
      detailCell('ダンジョン運補正', (state.dungeonStatBonus && state.dungeonStatBonus.luck) || 0) +
    '</div></div>' +
    '<div class="box-block"><h3>凸補正方式</h3><p class="section-note">段階式。10凸以降は上昇率が約2倍、100凸以降は約5倍、200凸以降は100凸ごとにさらに強くなります。</p></div>' +
    '<div class="box-block"><h3>バグ撃破によるガチャ倍率</h3><p class="section-note">バグを撃破すると、対応するランクの遺物出現倍率が少し上昇します。この倍率は∞実行時にリセットされます。</p><table class="data-table"><thead><tr><th>ランク</th><th>倍率</th></tr></thead><tbody>' + bugDefeatBonusRows + '</tbody></table></div>' +
    '<div class="box-block"><h3>∞情報</h3><p class="section-note">∞凸数が上がるたび、全遺物効果が2倍になります。ただし、無限を実行すると通常データは初期化されます。</p>' +
    ((state.infinityHistory && state.infinityHistory.length) ? '<table class="data-table"><thead><tr><th>回数</th><th>累計ガチャ</th><th>最高到達</th><th>実行後倍率</th></tr></thead><tbody>' + state.infinityHistory.slice().reverse().map(function (entry) {
      return '<tr><td>' + escapeHtml(entry.count) + '回目</td><td>' + escapeHtml((entry.totalGachaCount || 0).toLocaleString('ja-JP')) + '</td><td>' + escapeHtml(entry.highestRelicRank || 'N') + '</td><td>' + escapeHtml(formatMultiplier(entry.multiplier || 1)) + '</td></tr>';
    }).join('') + '</tbody></table>' : '<div class="empty-text">無限実行履歴はまだありません。</div>') + '</div>' +
    '<div class="box-block"><h3>転生履歴</h3>' +
    ((state.rebirthState && state.rebirthState.history && state.rebirthState.history.length) ? '<table class="data-table"><thead><tr><th>回数</th><th>0の遺物</th><th>増加量</th><th>累計倍率</th></tr></thead><tbody>' + state.rebirthState.history.slice().reverse().slice(0, 20).map(function (entry) {
      return '<tr><td>' + escapeHtml(entry.count) + '回目</td><td>' + escapeHtml(entry.hadZeroRelic ? ('所持 / ' + entry.zeroRelicLimitBreak + '凸') : '未所持') + '</td><td>' + escapeHtml('+' + formatPercent((entry.gainedBaseRateBonus || 0) * 100)) + '</td><td>' + escapeHtml(formatMultiplier(1 + (entry.totalBaseRateBonus || 0))) + '</td></tr>';
    }).join('') + '</tbody></table>' : '<div class="empty-text">転生履歴はまだありません。</div>') + '</div>' +
    '<div class="box-block"><h3>ステータス説明</h3><div class="description-list">' + descriptions + '</div></div>' +
    renderEffectTable(summary.activeEffects, '発動中の遺物効果', '現在発動中の効果はありません。') +
    renderEffectTable(summary.inactiveEffects, 'OFF中の遺物効果', 'OFF中の効果はありません。') +
    renderRateSummary(summary) +
    renderRateTable(summary);
  }

  function renderSettingsToggle(label, value, key, note) {
    return '<article class="relic-card"><div class="relic-head"><div><div class="inventory-name">' + escapeHtml(label) + '</div><div class="relic-meta">現在: ' + escapeHtml(value ? 'ON' : 'OFF') + '</div></div><button type="button" class="mini-button" data-setting-toggle="' + escapeHtml(key) + '">' + (value ? 'OFFにする' : 'ONにする') + '</button></div><div class="detail-row"><span class="detail-label">説明</span><span class="detail-value">' + escapeHtml(note) + '</span></div></article>';
  }

  function renderSettingsSlider(label, value, key, note) {
    var percent = Math.round((value || 0) * 100);
    return '<article class="relic-card"><div class="relic-head"><div><div class="inventory-name">' + escapeHtml(label) + '</div><div class="relic-meta">現在: ' + escapeHtml(percent + "%") + '</div></div></div><div class="detail-row"><span class="detail-label">音量</span><span class="detail-value"><input type="range" min="0" max="100" step="1" value="' + escapeHtml(percent) + '" data-setting-range="' + escapeHtml(key) + '"> ' + escapeHtml(percent + "%") + '</span></div><div class="detail-row"><span class="detail-label">説明</span><span class="detail-value">' + escapeHtml(note) + '</span></div></article>';
  }

  function renderSettingsView(state) {
    var settings = state.settings || {};
    return '<div class="box-block"><h3>設定</h3><div class="detail-grid">' +
      detailCell('通常BGM', 'audio/bgm/normal.mp3') +
      detailCell('バグ戦BGM', 'audio/bgm/bug-battle.mp3') +
      detailCell('通常SE', 'audio/se/gacha-button.mp3') +
      detailCell('BR以上SE', 'audio/se/br-plus.mp3') +
      detailCell('クレジット', 'infinityガチャ') +
    '</div></div>' +
    renderSettingsSlider('BGM音量', settings.bgmVolume, 'bgmVolume', '通常画面とバグ戦BGMの音量を調整します。') +
    renderSettingsSlider('SE音量', settings.seVolume, 'seVolume', 'ボタンSEとBR以上特殊SEの音量を調整します。') +
    renderSettingsToggle('実績報酬に石倍率を反映', settings.achievementStoneMultiplierEnabled === true, 'achievementStoneMultiplierEnabled', 'ONで実績報酬にも石倍率をかけます。') +
    renderSettingsToggle('未解放ランクへの上振れを許可', settings.allowRankBoostPastUnlock !== false, 'allowRankBoostPastUnlock', 'ONでバグランク上昇が未解放帯にも届きます。') +
    renderSettingsToggle('同ランクバグ遺物ドロップ', settings.enableRankMatchedBugDrop !== false, 'enableRankMatchedBugDrop', 'ONでバグ撃破時に対応ランクの遺物が追加で落ちます。') +
    '<div class="box-block"><div class="toolbar"><button type="button" class="mini-button" data-open-help>ヘルプ</button><button type="button" class="mini-button" data-replay-tutorial>チュートリアルを再表示</button></div></div>' +
    '<div class="box-block"><button type="button" class="mini-button" data-open-reset>データリセット</button></div>';
  }

  function renderHelpView(helpUiState) {
    return help.renderHelpView((helpUiState && helpUiState.category) || 'basic');
  }

  function formatRemainingTime(endsAt) {
    var ms = Math.max(0, endsAt - Date.now());
    var totalSeconds = Math.ceil(ms / 1000);
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    return minutes + "分" + seconds + "秒";
  }

  function renderAltarRelicCard(state, summary, relicId, buttonLabel) {
    var relic = summary.relicViews.find(function (item) { return item.id === relicId; });
    if (!relic) {
      return '';
    }
    var baseCost = relic.altarCost || 0;
    var discountedCost = effects.applyShopDiscount(baseCost, state);
    var ownedText = relic.owned ? ('所持 / ' + (relic.limitBreak || 0) + '凸') : '未所持';
    var canRepeatBuy = relic.limitBreakable !== false;
    var button = relic.owned && !canRepeatBuy
      ? '<button type="button" class="mini-button" disabled>所持済み</button>'
      : '<button type="button" class="mini-button" data-altar-relic="' + escapeHtml(relic.id) + '">' + escapeHtml(relic.owned ? '再購入' : buttonLabel) + '</button>';
    return '<article class="relic-card"><div class="relic-head"><div><div class="inventory-name">[' + escapeHtml(relic.uiRank || relic.rank) + '] ' + escapeHtml(displayRelicName(relic)) + '</div><div class="relic-meta">' + escapeHtml(ownedText) + ' / 祭壇限定</div></div>' + button + '</div><div class="detail-row"><span class="detail-label">効果</span><span class="detail-value">' + escapeHtml(displayRelicDescription(relic)) + '</span></div><div class="detail-row"><span class="detail-label">価格</span><span class="detail-value">' + escapeHtml(formatCostLabel(baseCost, discountedCost)) + '</span></div></article>';
  }

  function renderAltarView(state, summary) {
    var activeEvent = summary.altarEvent;
    var inDungeon = dungeon && dungeon.isInDungeon(state);
    var zeroRelicState = state.zeroRelicState || { owned: false, enabled: false, limitBreak: 0, purchasedThisLife: false };
    var slimeRelicOwned = Boolean(state.permanentRelics && state.permanentRelics.infinity_slime_relic && state.permanentRelics.infinity_slime_relic.owned);
    var normalDungeonCost = dungeon ? dungeon.getDungeonCost(state, 'normal') : 10000;
    var goldenDungeonCost = dungeon ? dungeon.getDungeonCost(state, 'golden') : 100000;
    var dimensionalDungeonCost = dungeon ? dungeon.getDungeonCost(state, 'dimensional') : 1000000;
    var normalDungeonBaseCost = Math.floor(data.DUNGEON_TYPES.normal.cost * Math.pow(2, (state.dungeonRecords && state.dungeonRecords.enteredNormalDungeon) || 0));
    var goldenDungeonBaseCost = Math.floor(data.DUNGEON_TYPES.golden.cost * Math.pow(2, (state.dungeonRecords && state.dungeonRecords.enteredGoldenDungeon) || 0));
    var dimensionalDungeonBaseCost = Math.floor(data.DUNGEON_TYPES.dimensional.cost * Math.pow(2, (state.dungeonRecords && state.dungeonRecords.enteredDimensionalDungeon) || 0));
    var nextRebirthBonus = summary.nextRebirthBaseRateBonus || 0;
    var zeroRelicCost = effects.applyShopDiscount(100000, state);
    var rebirthCost = effects.applyShopDiscount(10000, state);
    var eventBlock = activeEvent
      ? '<div class="box-block"><h3>発動中の祭壇イベント</h3><div class="detail-grid">' +
        detailCell('イベント名', activeEvent.effectName) +
        detailCell('種別', activeEvent.type) +
        detailCell('残り時間', formatRemainingTime(activeEvent.endsAt)) +
      '</div></div>'
      : '<div class="box-block"><h3>発動中の祭壇イベント</h3><div class="empty-text">発動中のイベントはありません。</div></div>';

    var dungeonBlock = inDungeon
      ? '<div class="box-block"><h3>ダンジョン確認</h3><div class="detail-grid">' +
        detailCell('現在地', state.dungeonState.name) +
        detailCell('残り時間', dungeon.getRemainingTimeMs(state, Date.now()) == null ? '戦闘敗北まで' : dungeon.formatDungeonTime(dungeon.getRemainingTimeMs(state, Date.now()))) +
        detailCell('採掘回数', state.dungeonState.miningCount || 0) +
        detailCell('撃破スライム数', state.dungeonState.slimeDefeatCount || 0) +
        detailCell('解放済みスライム', (state.dungeonState.unlockedSlimeRanks || ['N']).join(' / ')) +
        detailCell('ダンジョン補正', (state.dungeonState.dungeonRateBonus || 1).toFixed(2) + '倍') +
      '</div><p class="section-note">ダンジョン中は入場操作ではなく、状況確認のみ行えます。</p></div>'
      : '';

    var dungeonButtons = inDungeon ? '' : '<div class="box-block"><h3>ダンジョン入場</h3><div class="toolbar">' +
      '<button type="button" class="mini-button" data-altar-dungeon=\"normal\">通常 ' + escapeHtml(formatCostLabel(normalDungeonBaseCost, normalDungeonCost)) + '</button>' +
      '<button type="button" class="mini-button" data-altar-dungeon=\"golden\">黄金 ' + escapeHtml(formatCostLabel(goldenDungeonBaseCost, goldenDungeonCost)) + '</button>' +
      '<button type="button" class="mini-button" data-altar-dungeon=\"dimensional\">異次元 ' + escapeHtml(formatCostLabel(dimensionalDungeonBaseCost, dimensionalDungeonCost)) + '</button>' +
    '</div></div>';

    var rebirthBlock = '<div class="box-block"><h3>0と転生</h3><div class="detail-grid">' +
      detailCell('0の遺物', zeroRelicState.owned ? '所持 / ' + (zeroRelicState.enabled ? 'ON' : 'OFF') : '未所持') +
      detailCell('0の遺物凸数', zeroRelicState.limitBreak || 0) +
      detailCell('この周回で購入済み', zeroRelicState.purchasedThisLife ? 'はい' : 'いいえ') +
      detailCell('転生回数', (state.rebirthState && state.rebirthState.rebirthCount) || 0) +
      detailCell('素の確率倍率', formatMultiplier(summary.rebirthMultiplier || 1)) +
      detailCell('次回転生時上昇', '+' + formatPercent(nextRebirthBonus * 100)) +
      detailCell('ショップ割引率', Math.round((summary.shopDiscountRate || 0) * 100) + '% OFF') +
      detailCell('スライムの遺物', slimeRelicOwned ? '所持' : '未所持') +
      detailCell('スライム神', (state.zeroSlimeRecords && state.zeroSlimeRecords.totalDefeats > 0) ? '達成' : '未達成') +
    '</div>' + (inDungeon ? '<p class="section-note">ダンジョン中の祭壇は確認のみ可能です。</p>' : '<div class="toolbar">' +
      '<button type="button" class="mini-button" data-zero-relic-buy' + (zeroRelicState.purchasedThisLife ? ' disabled' : '') + '>0の遺物を購入する: ' + escapeHtml(formatCostLabel(100000, zeroRelicCost)) + '</button>' +
      '<button type="button" class="mini-button" data-rebirth-execute>転生する: ' + escapeHtml(formatCostLabel(10000, rebirthCost)) + '</button>' +
    '</div>') + '</div>';

    return '<div class="box-block"><h3>祭壇</h3><div class="detail-grid">' +
      detailCell('現在の石数', (state.stones || 0).toLocaleString('ja-JP')) +
      detailCell('祭壇効果', activeEvent ? activeEvent.effectName : 'なし') +
    '</div><p class="section-note">石が、黒い光を帯びている。確率に祈りますか？</p></div>' +
    dungeonBlock +
    rebirthBlock +
    eventBlock +
    (inDungeon ? '' : '<div class="box-block"><h3>イベント発動</h3><div class="toolbar">' +
      '<button type="button" class="mini-button" data-altar-event="normal"' + (activeEvent ? ' disabled' : '') + '>イベント ' + escapeHtml(formatCostLabel(10000, effects.applyShopDiscount(10000, state))) + '</button>' +
      '<button type="button" class="mini-button" data-altar-event="super"' + (activeEvent ? ' disabled' : '') + '>スーパー ' + escapeHtml(formatCostLabel(100000, effects.applyShopDiscount(100000, state))) + '</button>' +
      '<button type="button" class="mini-button" data-altar-event="hyper"' + (activeEvent ? ' disabled' : '') + '>ハイパー ' + escapeHtml(formatCostLabel(1000000, effects.applyShopDiscount(1000000, state))) + '</button>' +
    '</div></div>') +
    dungeonButtons +
    (inDungeon ? '' : '<div class="box-block"><h3>祭壇限定遺物</h3>' +
      renderAltarRelicCard(state, summary, 'altar_ssr_long_press', '万里の遺物を得る') +
      renderAltarRelicCard(state, summary, 'altar_ssr_multi_10', 'SSR連続の遺物を獲得') +
      renderAltarRelicCard(state, summary, 'altar_lr_multi_100', 'LR回転する世界の遺物を獲得') +
      renderAltarRelicCard(state, summary, 'altar_lr_auto_start', 'LR自動起動の遺物を獲得') +
      renderAltarRelicCard(state, summary, 'altar_br_multiverse', 'BRマルチバースの遺物を獲得') +
    '</div>');
  }

  function renderBatchDrawButtons(state, summary) {
    if (state.isBattle || summary.infinityRelicEnabled || (dungeon && dungeon.isInDungeon(state))) {
      return '';
    }
    return (summary.batchDrawOptions || []).filter(function (option) {
      return option.enabled;
    }).map(function (option) {
      return '<button type="button" class="mini-button" data-batch-draw="' + escapeHtml(option.id) + '">' + escapeHtml(option.label) + '</button>';
    }).join('');
  }

  function filterDecomposeRelics(summary, state, uiState) {
    var filtered = summary.relicViews.filter(function (view) { return view.owned; }).map(function (view) {
      var check = decompose.canDecomposeRelic(view.id, state);
      return {
        view: view,
        previewStone: decompose.getDecomposeStonePreview(view.id, state),
        canDecompose: check.ok,
        reason: check.reason
      };
    });

    if (uiState.filter === 'offOnly') {
      filtered = filtered.filter(function (entry) { return !entry.view.enabled; });
    } else if (uiState.filter === 'canDecompose') {
      filtered = filtered.filter(function (entry) { return entry.canDecompose; });
    } else if (uiState.filter === 'qrPlus') {
      filtered = filtered.filter(function (entry) { return ['QR', 'IR', 'ER'].indexOf(entry.view.rank) !== -1; });
    } else if (uiState.filter === 'urPlus') {
      filtered = filtered.filter(function (entry) { return isUrPlusRank(entry.view.rank); });
    } else if (uiState.filter !== 'all') {
      filtered = filtered.filter(function (entry) { return entry.view.rank === uiState.filter; });
    }

    filtered.sort(function (a, b) {
      if (uiState.sort === 'count') {
        return b.view.count - a.view.count;
      }
      if (uiState.sort === 'limitBreak') {
        return (b.view.limitBreak || 0) - (a.view.limitBreak || 0);
      }
      if (uiState.sort === 'stone') {
        return b.previewStone - a.previewStone;
      }
      if (uiState.sort === 'name') {
        return a.view.name.localeCompare(b.view.name, 'ja');
      }
      return data.getRankOrderIndex(a.view.rank) - data.getRankOrderIndex(b.view.rank);
    });

    return filtered;
  }

  function renderDecomposeToolbar(uiState) {
    return '<div class="toolbar"><div class="sort-wrap"><label for="decompose-filter">表示</label><select id="decompose-filter" data-decompose-filter>' + decompose.getDecomposeFilterList().map(function (item) {
      return '<option value="' + item.value + '"' + (uiState.filter === item.value ? ' selected' : '') + '>' + escapeHtml(item.label) + '</option>';
    }).join('') + '</select></div><div class="sort-wrap"><label for="decompose-sort">並び替え</label><select id="decompose-sort" data-decompose-sort>' + decompose.getDecomposeSortList().map(function (item) {
      return '<option value="' + item.value + '"' + (uiState.sort === item.value ? ' selected' : '') + '>' + escapeHtml(item.label) + '</option>';
    }).join('') + '</select></div></div>';
  }

  function renderDecomposeView(summary, state, uiState) {
    var entries = filterDecomposeRelics(summary, state, uiState);
    if (!entries.length) {
      return renderDecomposeToolbar(uiState) + '<div class="empty-text">分解対象の遺物はありません。</div>';
    }

    return renderDecomposeToolbar(uiState) + entries.map(function (entry) {
      var button = '<button type="button" class="mini-button" data-decompose-action="' + escapeHtml(entry.view.id) + '"' + (entry.canDecompose ? '' : ' disabled') + '>分解</button>';
      return '<article class="relic-card"><div class="relic-head"><div><div class="inventory-name">[' + escapeHtml(entry.view.rank) + '] ' + escapeHtml(displayRelicName(entry.view)) + '</div><div class="relic-meta">所持数: ' + escapeHtml(entry.view.count) + ' / 凸数: ' + escapeHtml(entry.view.limitBreak || 0) + ' / 状態: ' + escapeHtml(entry.view.enabled ? 'ON' : 'OFF') + '</div></div>' + button + '</div><div class="detail-row"><span class="detail-label">獲得石</span><span class="detail-value">' + escapeHtml(entry.previewStone) + '</span></div><div class="detail-row"><span class="detail-label">状態</span><span class="detail-value">' + escapeHtml(entry.canDecompose ? '分解可能' : entry.reason) + '</span></div></article>';
    }).join('');
  }

  function filterAchievements(entries, uiState) {
    var filtered = entries.slice();
    var categoryOrder = {};

    data.ACHIEVEMENT_CATEGORIES.forEach(function (category, index) {
      categoryOrder[category.key] = index;
    });

    function getCategoryOrder(key) {
      return Object.prototype.hasOwnProperty.call(categoryOrder, key) ? categoryOrder[key] : 999;
    }

    if (uiState.category && uiState.category !== 'all') {
      filtered = filtered.filter(function (entry) { return entry.categoryKey === uiState.category; });
    }

    if (uiState.status === 'achieved') {
      filtered = filtered.filter(function (entry) { return entry.status.achieved; });
    } else if (uiState.status === 'unachieved') {
      filtered = filtered.filter(function (entry) { return !entry.status.achieved && !entry.status.future; });
    } else if (uiState.status === 'claimable') {
      filtered = filtered.filter(function (entry) { return entry.status.canClaim; });
    } else if (uiState.status === 'claimed') {
      filtered = filtered.filter(function (entry) { return entry.status.claimed; });
    }

    filtered.sort(function (a, b) {
      var statusPriorityA = a.status.canClaim ? 0 : (a.status.future ? 3 : (a.status.claimed ? 2 : 1));
      var statusPriorityB = b.status.canClaim ? 0 : (b.status.future ? 3 : (b.status.claimed ? 2 : 1));

      if (uiState.sort === 'achievedFirst') {
        return Number(b.status.achieved) - Number(a.status.achieved);
      }
      if (uiState.sort === 'claimableFirst') {
        if (Number(b.status.canClaim) !== Number(a.status.canClaim)) {
          return Number(b.status.canClaim) - Number(a.status.canClaim);
        }
        return statusPriorityA - statusPriorityB;
      }
      if (uiState.sort === 'reward') {
        return b.rewardStoneDisplay - a.rewardStoneDisplay;
      }
      if (uiState.sort === 'nearest') {
        if (statusPriorityA !== statusPriorityB) {
          return statusPriorityA - statusPriorityB;
        }
        return (b.progress.ratio || 0) - (a.progress.ratio || 0);
      }
      if (getCategoryOrder(a.categoryKey) !== getCategoryOrder(b.categoryKey)) {
        return getCategoryOrder(a.categoryKey) - getCategoryOrder(b.categoryKey);
      }
      if (statusPriorityA !== statusPriorityB) {
        return statusPriorityA - statusPriorityB;
      }
      if ((b.progress.ratio || 0) !== (a.progress.ratio || 0)) {
        return (b.progress.ratio || 0) - (a.progress.ratio || 0);
      }
      return a.name.localeCompare(b.name, 'ja');
    });

    return filtered;
  }

  function renderAchievementTabs(activeCategory) {
    var tabs = [{ value: 'all', label: '全て' }].concat(data.ACHIEVEMENT_CATEGORIES.map(function (category) {
      return { value: category.key, label: category.label };
    }));

    return '<div class="tabs">' + tabs.map(function (tab) {
      return '<button type="button" class="tab-button ' + (activeCategory === tab.value ? 'is-active' : '') + '" data-achievement-category="' + escapeHtml(tab.value) + '">' + escapeHtml(tab.label) + '</button>';
    }).join('') + '</div>';
  }

  function renderAchievementToolbar(uiState) {
    var statusOptions = [
      { value: 'all', label: '全状態' },
      { value: 'achieved', label: '達成済み' },
      { value: 'unachieved', label: '未達成' },
      { value: 'claimable', label: '受取可能' },
      { value: 'claimed', label: '受取済み' }
    ];

    var sortOptions = [
      { value: 'category', label: 'カテゴリ順' },
      { value: 'achievedFirst', label: '達成済み優先' },
      { value: 'claimableFirst', label: '受取可能優先' },
      { value: 'reward', label: '報酬順' },
      { value: 'nearest', label: '進行順' }
    ];

    return renderAchievementTabs(uiState.category) + '<div class="toolbar"><div class="sort-wrap"><label for="achievement-status">状態</label><select id="achievement-status" data-achievement-status>' + statusOptions.map(function (item) {
      return '<option value="' + item.value + '"' + (uiState.status === item.value ? ' selected' : '') + '>' + escapeHtml(item.label) + '</option>';
    }).join('') + '</select></div><div class="sort-wrap"><label for="achievement-sort">並び替え</label><select id="achievement-sort" data-achievement-sort>' + sortOptions.map(function (item) {
      return '<option value="' + item.value + '"' + (uiState.sort === item.value ? ' selected' : '') + '>' + escapeHtml(item.label) + '</option>';
    }).join('') + '</select></div></div>';
  }

  function renderAchievementView(state, uiState) {
    var entries = filterAchievements(achievements.buildAchievementEntries(state), uiState);
    if (!entries.length) {
      return renderAchievementToolbar(uiState) + '<div class="empty-text">表示できる実績はありません。</div>';
    }

    return renderAchievementToolbar(uiState) + entries.map(function (entry) {
      var statusLabel = entry.status.future
        ? '後のフェーズ'
        : (entry.status.achieved
          ? (entry.status.claimed ? '達成済み / 受取済み' : '達成済み / 未受取')
          : '未達成');
      var rewardButton = entry.status.future
        ? '<button type="button" class="mini-button" disabled>未実装</button>'
        : entry.status.claimed
          ? '<button type="button" class="mini-button" disabled>受取済み</button>'
          : entry.status.canClaim
            ? '<button type="button" class="mini-button" data-achievement-claim="' + escapeHtml(entry.id) + '">報酬受取</button>'
            : '<button type="button" class="mini-button" disabled>未達成</button>';

      return '<article class="relic-card"><div class="relic-head"><div><div class="inventory-name">' + escapeHtml(entry.name) + '</div><div class="relic-meta">' + escapeHtml(entry.category) + ' / ' + escapeHtml(statusLabel) + '</div></div>' + rewardButton + '</div><div class="detail-row"><span class="detail-label">内容</span><span class="detail-value">' + escapeHtml(entry.description) + '</span></div><div class="detail-row"><span class="detail-label">進行度</span><span class="detail-value">' + escapeHtml(entry.progress.text) + '</span></div><div class="detail-row"><span class="detail-label">報酬石</span><span class="detail-value">' + escapeHtml(entry.rewardStoneDisplay.toLocaleString('ja-JP')) + '</span></div></article>';
    }).join('');
  }

  function renderBattleView(state, summary) {
    var battleState = state.battleState;
    var battleStats = summary.battleStats;
    var hiddenValue = battleState.hideStats ? '???' : null;
    var battleLogs = battleState.logs && battleState.logs.length
      ? '<div class="log-stream">' + battleState.logs.map(function (log) {
          return '<div class="log-entry">' + escapeHtml(log) + '</div>';
        }).join('') + '</div>'
      : '<div class="empty-text">戦闘ログはまだありません。</div>';

    var battleSummary = [
      '自HP ' + battleState.playerHp + ' / ' + battleState.playerMaxHp,
      'ターン ' + battleState.turn,
      '敵ランク ' + battleState.bugRank,
      '敵HP ' + (hiddenValue || (battleState.bugHp + ' / ' + battleState.bugMaxHp)),
      '敵攻撃 ' + (hiddenValue || battleState.bugAttack),
      '敵防御 ' + (hiddenValue || battleState.bugDefense),
      '敵速度 ' + (hiddenValue || battleState.bugSpeed),
      '命中率 ' + formatPercent(battleStats.hitRate),
      '回避率 ' + formatPercent(battleStats.evasionRate),
      '会心率 ' + formatPercent(battleStats.critical.rate),
      '会心ダメージ ' + formatPercent(battleStats.critical.damageBonus),
      '攻撃回数 ' + battleStats.attackCount + '回'
    ];

    return '<div class="battle-layout"><div class="battle-frame"><h3>戦闘中</h3><div class="battle-summary">' + battleSummary.map(function (item) {
      return '<span class="battle-chip">' + escapeHtml(item) + '</span>';
    }).join('') + '</div><p class="section-note">メインボタンで攻撃します。戦闘中は枠を固定し、ログだけ下から上へ流れます。</p></div><div class="battle-log-frame"><h3>戦闘ログ</h3><div class="battle-log-body">' + battleLogs + '</div></div></div>';
  }

  function renderNormalView(state, summary, activeMenu, uiState) {
    if (activeMenu === 'relics') {
      return { title: '遺物一覧', html: renderRelicView(summary, uiState.relic), showBack: true };
    }
    if (activeMenu === 'status') {
      return { title: 'ステータス', html: renderStatusView(summary, state), showBack: true };
    }
    if (activeMenu === 'altar') {
      return { title: '祭壇', html: renderAltarView(state, summary), showBack: true };
    }
    if (activeMenu === 'decompose') {
      return { title: '分解', html: renderDecomposeView(summary, state, uiState.decompose), showBack: true };
    }
    if (activeMenu === 'achievements') {
      return { title: '実績', html: renderAchievementView(state, uiState.achievements), showBack: true };
    }
    if (activeMenu === 'settings') {
      return { title: '設定', html: renderSettingsView(state), showBack: true };
    }
    if (activeMenu === 'help') {
      return { title: 'ヘルプ', html: renderHelpView(uiState.help), showBack: true };
    }

    var dungeonStatusHtml = dungeon && dungeon.isInDungeon(state) ? dungeon.renderDungeonStatus(state) : '';
    return {
      title: dungeon && dungeon.isInDungeon(state) ? 'ダンジョンログ' : 'ガチャ結果ログ',
      html: dungeonStatusHtml + (state.logs.length ? '<div class="log-stream">' + state.logs.map(function (log) { return '<div class="log-entry">' + escapeHtml(log) + '</div>'; }).join('') + '</div>' : '<div class="empty-text">ログはまだありません。</div>'),
      showBack: false
    };
  }

  function updateMainButton(state, nextDrawCost) {
    var button = document.getElementById('gacha-button');

    if (state.isBattle) {
      button.disabled = false;
      button.textContent = '攻撃';
      return;
    }

    if (state.pendingBugRank) {
      button.disabled = false;
      button.textContent = 'ガチャを開く';
      return;
    }

    if (dungeon && dungeon.isInDungeon(state)) {
      button.disabled = false;
      button.textContent = '採掘';
      return;
    }

    if (effects.isInfinityRelicEnabled(state)) {
      button.disabled = false;
      button.textContent = '無限';
      return;
    }

    button.disabled = !nextDrawCost.isFree && state.stones < nextDrawCost.amount;
    button.textContent = nextDrawCost.isFree ? 'ガチャを引く（無料）' : 'ガチャを引く';
  }

  function updateLongPressDisplay(summary, runtime) {
    var status = document.getElementById('long-press-status');
    var button = document.getElementById('gacha-button');
    if (!status || !button) {
      return;
    }

    button.classList.toggle('is-long-press-active', Boolean(runtime && runtime.isActive));

    if (!summary.longPressUnlocked) {
      status.className = 'long-press-status long-press-disabled';
      status.textContent = '万里の遺物: 未所持 / 長押し無効';
      return;
    }
    if (!summary.longPressEnabled) {
      status.className = 'long-press-status long-press-disabled';
      status.textContent = '万里の遺物: OFF / 長押し無効';
      return;
    }
    if (runtime && runtime.isActive) {
      status.className = 'long-press-status long-press-active';
      status.textContent = '万里の遺物: ON / 長押し中...';
      return;
    }

    status.className = 'long-press-status';
    status.textContent = '万里の遺物: ON / 長押し可能';
  }

  function updateAutoStatusDisplay(summary, runtime) {
    var status = document.getElementById('auto-main-status');
    if (!status) {
      return;
    }
    var autoInfo = getAutoStatusText(summary, { autoButtonState: runtime && runtime.autoState ? runtime.autoState : null });
    status.className = autoInfo.css;
    status.textContent = autoInfo.footer + ' / 割引 ' + Math.round((summary.shopDiscountRate || 0) * 100) + '% OFF';
  }

  function updateResourceDisplay(state, recoveryRemainingMs) {
    document.getElementById('stone-count').textContent = String(state.stones);
    document.getElementById('recovery-timer').textContent = (recoveryRemainingMs / 1000).toFixed(1) + '秒';
    document.getElementById('total-gacha-count').textContent = String(state.totalGachaCount);
    document.getElementById('total-miss-count').textContent = String(state.totalMissCount);
    document.getElementById('total-bug-defeats').textContent = String(state.totalBugDefeats || 0);
  }

  function scrollLogToBottom(container) {
    if (!container) {
      return;
    }
    container.scrollTop = container.scrollHeight;
  }

  function renderState(state, summary, recoveryRemainingMs, activeMenu, nextDrawCost, uiState, runtime) {
    updateResourceDisplay(state, recoveryRemainingMs);
    updateMainButton(state, nextDrawCost);
    updateLongPressDisplay(summary, runtime);
    updateAutoStatusDisplay(summary, runtime);
    document.getElementById('batch-draw-buttons').innerHTML = renderBatchDrawButtons(state, summary);
    document.getElementById('probability-list').innerHTML = buildProbabilityHtml(summary);

    var title = document.getElementById('center-title');
    var view = document.getElementById('center-view');
    var backButton = document.getElementById('center-back-button');

    if (state.isBattle && state.battleState) {
      title.textContent = state.battleState.bugName;
      view.innerHTML = renderBattleView(state, summary);
      backButton.classList.add('is-hidden');
      scrollLogToBottom(view.querySelector('.battle-log-body'));
      scrollLogToBottom(view.querySelector('.log-stream'));
      return;
    }

    var normalView = renderNormalView(state, summary, activeMenu, uiState);
    title.textContent = normalView.title;
    view.innerHTML = normalView.html;
    backButton.classList.toggle('is-hidden', !normalView.showBack);

    if (!normalView.showBack) {
      scrollLogToBottom(view);
      scrollLogToBottom(view.querySelector('.log-stream'));
    }
  }

  function refreshChrome(state, summary, recoveryRemainingMs, nextDrawCost, runtime) {
    updateResourceDisplay(state, recoveryRemainingMs);
    updateMainButton(state, nextDrawCost);
    updateLongPressDisplay(summary, runtime);
    updateAutoStatusDisplay(summary, runtime);
    document.getElementById('batch-draw-buttons').innerHTML = renderBatchDrawButtons(state, summary);

    if (!state.isBattle) {
      document.getElementById('probability-list').innerHTML = buildProbabilityHtml(summary);
    }
  }

  window.InfinityGachaUi = {
    renderState: renderState,
    refreshChrome: refreshChrome
  };
})();

