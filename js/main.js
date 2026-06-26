(function () {
  var data = window.InfinityGachaData;
  var storage = window.InfinityGachaStorage;
  var effects = window.InfinityGachaEffects;
  var achievements = window.InfinityGachaAchievements;
  var decompose = window.InfinityGachaDecompose;
  var battle = window.InfinityGachaBattle;
  var engine = window.InfinityGachaEngine;
  var infinity = window.InfinityGachaInfinity;
  var altar = window.InfinityGachaAltar;
  var dungeon = window.InfinityGachaDungeon;
  var audio = window.InfinityGachaAudio;
  var ui = window.InfinityGachaUi;

  var state = storage.loadState();
  var activeMenu = "";
  var uiState = {
    relic: {
      activeTab: "all",
      sortMode: "acquired"
    },
    decompose: {
      filter: "all",
      sort: "rank"
    },
    achievements: {
      filter: "all",
      sort: "category"
    }
  };
  var longPressState = {
    pointerDown: false,
    isActive: false,
    timeoutId: null,
    intervalId: null,
    suppressClick: false
  };

  function looksMojibake(text) {
    return /縺|繧|蛟|螳|險|遏ｳ|驕ｺ|谺｡|蜀|螟|荳|蟄|菴|謌ｦ/.test(String(text || ""));
  }

  function displayRelicName(relic) {
    return data.getRelicDisplayName(relic);
  }

  function pushLog(message) {
    state.logs.push(message);
    if (state.logs.length > data.LOG_LIMIT) {
      state.logs = state.logs.slice(-data.LOG_LIMIT);
    }
  }

  function pushLogs(messages) {
    messages.forEach(pushLog);
  }

  function getRecoveryRemainingMs(now) {
    var elapsed = now - state.lastRecoveryAt;
    var remainder = elapsed % data.RECOVERY_INTERVAL_MS;
    return data.RECOVERY_INTERVAL_MS - remainder;
  }

  function getSummary() {
    return effects.buildSummary(state);
  }

  function getLongPressRuntime() {
    return {
      isActive: longPressState.isActive
    };
  }

  function refreshAchievements() {
    pushLogs(achievements.checkAchievements(state));
  }

  function applyDungeonTimers() {
    pushLogs(dungeon.checkDungeonTime(state));
  }

  function persistAndRender() {
    pushLogs(altar.clearExpiredAltarEvent(state));
    applyDungeonTimers();
    state = storage.saveState(state);
    audio.updateVolumes(state);
    audio.syncBgm(state);
    var summary = getSummary();
    var nextDrawCost = engine.getNextDrawCost(state, summary);
    ui.renderState(state, summary, getRecoveryRemainingMs(Date.now()), activeMenu, nextDrawCost, uiState, getLongPressRuntime());
  }

  function applyStoneRecovery() {
    var now = Date.now();
    var elapsed = now - state.lastRecoveryAt;
    pushLogs(altar.clearExpiredAltarEvent(state));
    applyDungeonTimers();

    if (elapsed < data.RECOVERY_INTERVAL_MS) {
      var fastSummary = getSummary();
      ui.refreshChrome(state, fastSummary, getRecoveryRemainingMs(now), engine.getNextDrawCost(state, fastSummary), getLongPressRuntime());
      return;
    }

    var ticks = Math.floor(elapsed / data.RECOVERY_INTERVAL_MS);
    var summary = getSummary();
    var totalGain = summary.idleStone.total * ticks;

    state.stones += totalGain;
    state.lastRecoveryAt += ticks * data.RECOVERY_INTERVAL_MS;
    pushLog("石が" + totalGain + "個回復した。");
    refreshAchievements();
    persistAndRender();
  }

  function openMenu(menuName) {
    if (state.isBattle) {
      pushLog("戦闘中はメニューを開けません。");
      persistAndRender();
      return;
    }

    if (dungeon.isInDungeon(state) && menuName === "decompose") {
      pushLog("ダンジョン内では分解できません。");
      persistAndRender();
      return;
    }

    if (activeMenu === menuName) {
      activeMenu = "";
      persistAndRender();
      return;
    }

    activeMenu = menuName;
    if (menuName === "relics") {
      pushLog("遺物一覧を表示しました。");
    } else if (menuName === "status") {
      pushLog("ステータスを表示しました。");
    } else if (menuName === "altar") {
      pushLog("祭壇を開いた。");
      pushLog("石が、黒い光を帯びている。");
      pushLog("確率に祈りますか？");
    } else if (menuName === "decompose") {
      pushLog("分解画面を表示しました。");
    } else if (menuName === "achievements") {
      pushLog("実績画面を表示しました。");
    } else if (menuName === "settings") {
      pushLog("設定を表示しました。");
    }
    persistAndRender();
  }

  function handleBattleTurn() {
    var outcome = battle.playerAttack(state);
    if (outcome.logs && outcome.logs.length) {
      pushLogs(outcome.logs);
    }
    refreshAchievements();
    persistAndRender();
  }

  function handlePendingBug() {
    var outcome = battle.handlePendingBug(state);
    if (outcome.logs && outcome.logs.length) {
      pushLogs(outcome.logs);
    }
    activeMenu = "";
    refreshAchievements();
    persistAndRender();
  }

  function handleGachaDraw() {
    var summary = getSummary();
    var outcome = engine.drawGacha(state, summary);
    audio.playSe(state, "mainButton");
    pushLogs(outcome.logs);
    activeMenu = "";

    if (outcome.specialSeRank) {
      audio.playRankSe(state, outcome.specialSeRank);
    }

    if (outcome.ok) {
      var spawnInfo = battle.rollBugSpawn(state);
      if (spawnInfo) {
        state.pendingBugRank = spawnInfo.finalRank;
        state.pendingBugSourceRank = spawnInfo.baseRank;

        if (spawnInfo.raised) {
          pushLog("次のガチャで" + spawnInfo.baseRank + "バグが" + spawnInfo.finalRank + "バグへ上振れして出現する。");
        } else {
          pushLog("次のガチャで" + spawnInfo.finalRank + "バグが出現する。");
        }
      }
    }

    refreshAchievements();
    persistAndRender();
  }

  function handleDungeonMine() {
    var outcome = dungeon.mineDungeon(state);
    audio.playSe(state, "mainButton");
    pushLogs(outcome.logs || []);
    activeMenu = "";
    refreshAchievements();
    persistAndRender();
  }

  function handleBatchDraw(type) {
    if (state.isBattle) {
      pushLog("戦闘中は連続ガチャを実行できません。");
      persistAndRender();
      return;
    }
    if (dungeon.isInDungeon(state)) {
      pushLog("ダンジョン中は通常ガチャを行えません。");
      persistAndRender();
      return;
    }
    if (effects.isInfinityRelicEnabled(state)) {
      pushLog("無限の遺物がON中のため、連続ガチャは使えません。");
      persistAndRender();
      return;
    }

    var summary = getSummary();
    var outcome;
    if (type === "ten") {
      outcome = engine.executeTenDraw(state, summary);
    } else if (type === "hundred") {
      outcome = engine.executeHundredDraw(state, summary);
    } else {
      outcome = engine.executeAllStoneDraw(state, summary);
    }
    audio.playSe(state, "mainButton");
    pushLogs(outcome.logs || []);
    activeMenu = "";

    if (outcome.specialSeRank) {
      audio.playRankSe(state, outcome.specialSeRank);
    }

    if (outcome.ok) {
      if (outcome.pendingBugRank) {
        state.pendingBugRank = outcome.pendingBugRank;
        state.pendingBugSourceRank = outcome.pendingBugRank;
        pushLog((type === "ten" ? "10連" : type === "hundred" ? "100連" : "全石ガチャ") + "中に未観測ランクの遺物を検知。");
        pushLog(outcome.pendingBugRank + "バグの気配を検知。");
        pushLog("連続ガチャ処理完了後、バグ戦闘へ移行します。");
      } else {
        var spawnInfo = battle.rollBugSpawn(state);
        if (spawnInfo) {
          state.pendingBugRank = spawnInfo.finalRank;
          state.pendingBugSourceRank = spawnInfo.baseRank;
          pushLog("連続ガチャ後、バグの気配を検知。");
          pushLog(spawnInfo.finalRank + "バグが出現した。");
        } else {
          pushLog("連続ガチャ後、接続は安定している。");
        }
      }
    }

    refreshAchievements();
    persistAndRender();
  }

  function handleMainButtonAction() {
    if (state.isBattle) {
      audio.playSe(state, "mainButton");
      handleBattleTurn();
      return { ok: true };
    }

    if (state.pendingBugRank) {
      audio.playSe(state, "mainButton");
      handlePendingBug();
      return { ok: true };
    }

    if (dungeon.isInDungeon(state)) {
      handleDungeonMine();
      return { ok: true };
    }

    if (effects.isInfinityRelicEnabled(state)) {
      if (dungeon.isInDungeon(state)) {
        pushLog("ダンジョン内では無限を実行できません。");
        persistAndRender();
        return { ok: false, dangerous: true };
      }
      if (!infinity.confirmInfinity()) {
        pushLog("無限の実行を取りやめた。");
      persistAndRender();
      return { ok: false, dangerous: true };
    }

      var outcome = infinity.executeInfinity(state);
      state = outcome.state;
      activeMenu = "";
      pushLogs(outcome.logs);
      refreshAchievements();
      persistAndRender();
      return { ok: true, dangerous: true };
    }

    handleGachaDraw();
    return { ok: true };
  }

  function handleMainAction() {
    handleMainButtonAction();
  }

  function clearLongPressTimers() {
    if (longPressState.timeoutId) {
      window.clearTimeout(longPressState.timeoutId);
      longPressState.timeoutId = null;
    }
    if (longPressState.intervalId) {
      window.clearInterval(longPressState.intervalId);
      longPressState.intervalId = null;
    }
  }

  function stopLongPressMainAction(reason) {
    var wasActive = longPressState.pointerDown || longPressState.isActive || longPressState.timeoutId || longPressState.intervalId;
    clearLongPressTimers();
    longPressState.pointerDown = false;
    longPressState.isActive = false;
    if (reason) {
      pushLog(reason);
    } else if (wasActive) {
      pushLog("長押しを停止しました。");
    }
    persistAndRender();
  }

  function canUseLongPress() {
    return effects.isLongPressEnabled(state) && (activeMenu === "" || state.isBattle || state.pendingBugRank);
  }

  function shouldStopLongPressForState() {
    if (!canUseLongPress()) {
      return "長押しを停止しました。";
    }
    if (dungeon.isInDungeon(state)) {
      return "";
    }
    if (effects.isInfinityRelicEnabled(state)) {
      return "危険操作のため、長押しを解除しました。";
    }
    if (!state.isBattle && !state.pendingBugRank) {
      var summary = getSummary();
      var nextDrawCost = engine.getNextDrawCost(state, summary);
      if (!nextDrawCost.isFree && state.stones < nextDrawCost.amount) {
        return "石が足りないため、長押しを停止しました。";
      }
    }
    return "";
  }

  function runLongPressTick() {
    var stopReason = shouldStopLongPressForState();
    if (stopReason) {
      stopLongPressMainAction(stopReason);
      return;
    }

    try {
      handleMainButtonAction();
    } catch (error) {
      stopLongPressMainAction("長押し中にエラーが発生したため停止しました。");
      return;
    }

    stopReason = shouldStopLongPressForState();
    if (stopReason) {
      stopLongPressMainAction(stopReason);
    }
  }

  function startLongPressMainAction(event) {
    if (!canUseLongPress() || longPressState.pointerDown) {
      return;
    }
    if (event) {
      event.preventDefault();
    }

    longPressState.pointerDown = true;
    clearLongPressTimers();
    longPressState.timeoutId = window.setTimeout(function () {
      longPressState.timeoutId = null;
      if (!longPressState.pointerDown) {
        return;
      }
      longPressState.isActive = true;
      longPressState.suppressClick = true;
      pushLog("万里の遺物により、長押しが開始された。");
      persistAndRender();
      runLongPressTick();
      if (!longPressState.isActive) {
        return;
      }
      longPressState.intervalId = window.setInterval(runLongPressTick, data.LONG_PRESS_INTERVAL);
    }, data.LONG_PRESS_INTERVAL);
  }

  function releaseLongPressMainAction() {
    var hadRepeating = longPressState.isActive;
    clearLongPressTimers();
    longPressState.pointerDown = false;
    longPressState.isActive = false;
    if (hadRepeating) {
      pushLog("長押しを停止しました。");
      persistAndRender();
    }
  }

  function handleMenuClick(event) {
    openMenu(event.currentTarget.dataset.menu);
  }

  function handleBackToLog() {
    if (!activeMenu) {
      return;
    }
    activeMenu = "";
    pushLog("ガチャ結果ログに戻りました。");
    persistAndRender();
  }

  function toggleRelicEnabled(relicId) {
    if (relicId === "altar_zero_relic") {
      state.zeroRelicState.enabled = !state.zeroRelicState.enabled;
      pushLog("0の遺物を" + (state.zeroRelicState.enabled ? "ON" : "OFF") + "にしました。");
      persistAndRender();
      return;
    }
    if (relicId === "infinity_slime_relic") {
      state.permanentRelics.infinity_slime_relic.enabled = !state.permanentRelics.infinity_slime_relic.enabled;
      pushLog("スライムの遺物を" + (state.permanentRelics.infinity_slime_relic.enabled ? "ON" : "OFF") + "にしました。");
      persistAndRender();
      return;
    }
    if (!state.ownedRelics[relicId]) {
      return;
    }

    state.ownedRelics[relicId].enabled = !state.ownedRelics[relicId].enabled;
    var relic = data.RELIC_INDEX[relicId];
    if (relicId === "if_infinity") {
      pushLog("無限の遺物を" + (state.ownedRelics[relicId].enabled ? "ON" : "OFF") + "にしました。");
      pushLog(state.ownedRelics[relicId].enabled ? "ガチャボタンが「無限」に変化した。" : "ガチャボタンは通常状態に戻りました。");
    } else {
      pushLog(displayRelicName(relic) + "を" + (state.ownedRelics[relicId].enabled ? "ON" : "OFF") + "にしました。");
    }
    pushLog("現在のステータスを再計算しました。");
    persistAndRender();
  }

  function handleDecompose(relicId) {
    if (dungeon.isInDungeon(state)) {
      pushLog("ダンジョン内では分解できません。");
      persistAndRender();
      return;
    }
    var outcome = decompose.decomposeRelic(state, relicId);
    pushLogs(outcome.logs);
    refreshAchievements();
    persistAndRender();
  }

  function handleAchievementClaim(achievementId) {
    var outcome = achievements.claimAchievementReward(state, achievementId);
    pushLogs(outcome.logs);
    persistAndRender();
  }

  function toggleSetting(settingKey) {
    if (!state.settings) {
      state.settings = {};
    }

    if (settingKey === "achievementStoneMultiplierEnabled") {
      state.settings.achievementStoneMultiplierEnabled = !state.settings.achievementStoneMultiplierEnabled;
      pushLog("実績報酬への石倍率反映を" + (state.settings.achievementStoneMultiplierEnabled ? "ON" : "OFF") + "にしました。");
    } else if (settingKey === "allowRankBoostPastUnlock") {
      state.settings.allowRankBoostPastUnlock = !state.settings.allowRankBoostPastUnlock;
      pushLog("未解放ランクへの上振れを" + (state.settings.allowRankBoostPastUnlock ? "許可" : "禁止") + "にしました。");
    } else if (settingKey === "enableRankMatchedBugDrop") {
      state.settings.enableRankMatchedBugDrop = !state.settings.enableRankMatchedBugDrop;
      pushLog("同ランクバグ遺物ドロップを" + (state.settings.enableRankMatchedBugDrop ? "ON" : "OFF") + "にしました。");
    }

    persistAndRender();
  }

  function updateSettingRange(settingKey, rawValue) {
    if (!state.settings) {
      state.settings = {};
    }
    var value = Math.max(0, Math.min(1, Number(rawValue) / 100));
    if (settingKey === "bgmVolume") {
      state.settings.bgmVolume = value;
      pushLog("BGM音量を" + Math.round(value * 100) + "%にしました。");
    } else if (settingKey === "seVolume") {
      state.settings.seVolume = value;
      pushLog("SE音量を" + Math.round(value * 100) + "%にしました。");
    }
    persistAndRender();
  }

  function handleCenterViewClick(event) {
    var toggleButton = event.target.closest("[data-relic-toggle]");
    if (toggleButton) {
      toggleRelicEnabled(toggleButton.getAttribute("data-relic-toggle"));
      return;
    }

    var tabButton = event.target.closest("[data-relic-tab]");
    if (tabButton) {
      uiState.relic.activeTab = tabButton.getAttribute("data-relic-tab");
      persistAndRender();
      return;
    }

    var decomposeButton = event.target.closest("[data-decompose-action]");
    if (decomposeButton) {
      handleDecompose(decomposeButton.getAttribute("data-decompose-action"));
      return;
    }

    var claimButton = event.target.closest("[data-achievement-claim]");
    if (claimButton) {
      handleAchievementClaim(claimButton.getAttribute("data-achievement-claim"));
      return;
    }

    var settingButton = event.target.closest("[data-setting-toggle]");
    if (settingButton) {
      toggleSetting(settingButton.getAttribute("data-setting-toggle"));
      return;
    }

    var altarEventButton = event.target.closest("[data-altar-event]");
    if (altarEventButton) {
      if (dungeon.isInDungeon(state)) {
        pushLog("ダンジョン中の祭壇は確認のみ可能です。");
        persistAndRender();
        return;
      }
      var altarOutcome = altar.startAltarEvent(state, altarEventButton.getAttribute("data-altar-event"));
      pushLogs(altarOutcome.logs || []);
      persistAndRender();
      return;
    }

    var altarDungeonButton = event.target.closest("[data-altar-dungeon]");
    if (altarDungeonButton) {
      var dungeonOutcome = dungeon.enterDungeon(state, altarDungeonButton.getAttribute("data-altar-dungeon"));
      pushLogs(dungeonOutcome.logs || []);
      refreshAchievements();
      persistAndRender();
      return;
    }

    var altarRelicButton = event.target.closest("[data-altar-relic]");
    if (altarRelicButton) {
      if (dungeon.isInDungeon(state)) {
        pushLog("ダンジョン中の祭壇は確認のみ可能です。");
        persistAndRender();
        return;
      }
      var relicOutcome = altar.obtainAltarRelic(state, altarRelicButton.getAttribute("data-altar-relic"));
      pushLogs(relicOutcome.logs || []);
      refreshAchievements();
      persistAndRender();
      return;
    }

    var zeroRelicButton = event.target.closest("[data-zero-relic-buy]");
    if (zeroRelicButton) {
      if (dungeon.isInDungeon(state)) {
        pushLog("ダンジョン中の祭壇は確認のみ可能です。");
        persistAndRender();
        return;
      }
      var zeroOutcome = altar.buyZeroRelic(state);
      pushLogs(zeroOutcome.logs || []);
      refreshAchievements();
      persistAndRender();
      return;
    }

    var rebirthButton = event.target.closest("[data-rebirth-execute]");
    if (rebirthButton) {
      if (dungeon.isInDungeon(state)) {
        pushLog("ダンジョン中の祭壇は確認のみ可能です。");
        persistAndRender();
        return;
      }
      var rebirthOutcome = altar.executeRebirth(state);
      if (rebirthOutcome.state) {
        state = rebirthOutcome.state;
        activeMenu = "";
      }
      pushLogs(rebirthOutcome.logs || []);
      refreshAchievements();
      persistAndRender();
      return;
    }

    var resetButton = event.target.closest("[data-open-reset]");
    if (resetButton) {
      handleReset();
    }
  }

  function handleCenterViewChange(event) {
    if (event.target.matches("[data-setting-range]")) {
      updateSettingRange(event.target.getAttribute("data-setting-range"), event.target.value);
      return;
    }
    if (event.target.matches("[data-relic-sort]")) {
      uiState.relic.sortMode = event.target.value;
      persistAndRender();
      return;
    }
    if (event.target.matches("[data-decompose-filter]")) {
      uiState.decompose.filter = event.target.value;
      persistAndRender();
      return;
    }
    if (event.target.matches("[data-decompose-sort]")) {
      uiState.decompose.sort = event.target.value;
      persistAndRender();
      return;
    }
    if (event.target.matches("[data-achievement-filter]")) {
      uiState.achievements.filter = event.target.value;
      persistAndRender();
      return;
    }
    if (event.target.matches("[data-achievement-sort]")) {
      uiState.achievements.sort = event.target.value;
      persistAndRender();
    }
  }

  function handleReset() {
    clearLongPressTimers();
    longPressState.pointerDown = false;
    longPressState.isActive = false;
    var accepted = window.confirm("infinityガチャのデータを初期化します。よろしいですか？");
    if (!accepted) {
      return;
    }

    state = storage.resetState();
    activeMenu = "";
    uiState.relic.activeTab = "all";
    uiState.relic.sortMode = "acquired";
    uiState.decompose.filter = "all";
    uiState.decompose.sort = "rank";
    uiState.achievements.filter = "all";
    uiState.achievements.sort = "category";
    pushLog("データをリセットしました。");
    refreshAchievements();
    persistAndRender();
  }

  function bindEvents() {
    var mainButton = document.getElementById("gacha-button");
    document.addEventListener("pointerdown", function () {
      audio.ensureAudioUnlocked();
      audio.syncBgm(state);
    }, { once: true });
    mainButton.addEventListener("click", function () {
      if (longPressState.suppressClick) {
        longPressState.suppressClick = false;
        return;
      }
      handleMainAction();
    });
    mainButton.addEventListener("pointerdown", startLongPressMainAction);
    mainButton.addEventListener("pointerup", releaseLongPressMainAction);
    mainButton.addEventListener("pointerleave", releaseLongPressMainAction);
    mainButton.addEventListener("pointercancel", releaseLongPressMainAction);
    document.getElementById("reset-button").addEventListener("click", handleReset);
    document.getElementById("batch-draw-buttons").addEventListener("click", function (event) {
      var button = event.target.closest("[data-batch-draw]");
      if (!button) {
        return;
      }
      handleBatchDraw(button.getAttribute("data-batch-draw"));
    });
    document.getElementById("center-view").addEventListener("click", handleCenterViewClick);
    document.getElementById("center-view").addEventListener("change", handleCenterViewChange);
    document.getElementById("center-back-button").addEventListener("click", handleBackToLog);

    Array.prototype.forEach.call(document.querySelectorAll(".js-menu-button"), function (button) {
      button.addEventListener("click", handleMenuClick);
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        releaseLongPressMainAction();
      }
    });
    window.addEventListener("blur", releaseLongPressMainAction);
    document.addEventListener("pointerup", function () {
      if (longPressState.pointerDown) {
        releaseLongPressMainAction();
      }
    });
  }

  function init() {
    bindEvents();
    refreshAchievements();
    applyStoneRecovery();
    persistAndRender();
    window.setInterval(applyStoneRecovery, 1000);
  }

  init();
})();

