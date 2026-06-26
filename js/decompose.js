(function () {
  var data = window.InfinityGachaData;
  var effects = window.InfinityGachaEffects;

  function looksMojibake(text) {
    return /ç¸º|ç¹§|è›Ÿ|èž³|éšª|é|é©•|è°º|èœ€|èžŸ|è³|èŸ„|è´|è¬Œ|縺|繧|蛟|螳/.test(String(text || ""));
  }

  function displayRelicName(relic) {
    return data.getRelicDisplayName(relic);
  }

  function canDecomposeRelic(relicId, state) {
    var owned = state.ownedRelics[relicId];
    var relic = data.RELIC_INDEX[relicId];

    if (!relic || !owned) {
      return { ok: false, reason: "未所持です。" };
    }
    if (relic.rank === "IF" || relic.decomposable === false) {
      return { ok: false, reason: "無限の遺物は分解できません。" };
    }
    if (owned.enabled !== false) {
      return { ok: false, reason: displayRelicName(relic) + "はON中のため分解できません。分解するには先にOFFにしてください。" };
    }

    return { ok: true, reason: "" };
  }

  function getDecomposeStonePreview(relicId, state) {
    return effects.calculateDecomposeStone(relicId, state);
  }

  function getDecomposeFilterList() {
    return [
      { value: "all", label: "全て" },
      { value: "N", label: "N" },
      { value: "S", label: "S" },
      { value: "SR", label: "SR" },
      { value: "SSR", label: "SSR" },
      { value: "SSSR", label: "SSSR" },
      { value: "QR", label: "QR" },
      { value: "IR", label: "IR" },
      { value: "ER", label: "ER" },
      { value: "qrPlus", label: "QR以上" },
      { value: "urPlus", label: "UR以上" },
      { value: "offOnly", label: "OFF中のみ" },
      { value: "canDecompose", label: "分解可能のみ" }
    ];
  }

  function getDecomposeSortList() {
    return [
      { value: "rank", label: "ランク順" },
      { value: "count", label: "所持数が多い順" },
      { value: "limitBreak", label: "凸数が多い順" },
      { value: "stone", label: "分解石が多い順" },
      { value: "name", label: "名前順" }
    ];
  }

  function decomposeRelic(state, relicId) {
    var check = canDecomposeRelic(relicId, state);
    if (!check.ok) {
      return { ok: false, logs: [check.reason] };
    }

    var owned = state.ownedRelics[relicId];
    var relic = data.RELIC_INDEX[relicId];
    var gainedStone = effects.calculateDecomposeStone(relicId, state);

    owned.count -= 1;
    if (owned.count <= 0) {
      delete state.ownedRelics[relicId];
    }

    state.stones += gainedStone;
    state.totalDecomposeCount += 1;
    state.totalDecomposeStone += gainedStone;

    return {
      ok: true,
      logs: [displayRelicName(relic) + "を1個分解した。石を" + gainedStone.toLocaleString("ja-JP") + "個獲得。"]
    };
  }

  window.InfinityGachaDecompose = {
    canDecomposeRelic: canDecomposeRelic,
    decomposeRelic: decomposeRelic,
    getDecomposeStonePreview: getDecomposeStonePreview,
    getDecomposeFilterList: getDecomposeFilterList,
    getDecomposeSortList: getDecomposeSortList
  };
})();
