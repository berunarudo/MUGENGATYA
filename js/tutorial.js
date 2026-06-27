(function () {
  function ensureTutorialState(state) {
    if (!state.tutorialState) {
      state.tutorialState = {
        hasSeenFirstTutorial: false,
        hasSeenRebirthTutorial: false,
        hasSeenSecondLoopTutorial: false,
        tutorialLogEnabled: true
      };
    }
    return state.tutorialState;
  }

  function getFirstTutorialLogs() {
    return [
      "infinityガチャへようこそ。",
      "このゲームは、無限に近い確率を突破するためにガチャを引き続けるゲームです。",
      "まずは「ガチャを引く」ボタンを押して、遺物を集めましょう。",
      "遺物は持っているだけで効果を発揮するものもありますが、多くは「遺物」画面でON/OFFを切り替えられます。",
      "メニュー説明:",
      "「遺物」では、獲得した遺物を閲覧できます。また、遺物のON/OFFを切り替えられます。",
      "「ステータス」では、HP、攻撃、防御、速度、運、確率補正、バグ撃破倍率、転生情報などの詳細情報を確認できます。",
      "「祭壇」では、転生ができるほか、ダンジョンに入場したり、便利な祭壇限定遺物を購入できます。",
      "「分解」では、不要な遺物を分解して石を獲得できます。ただし、ON中の遺物や一部の特殊遺物は分解できません。",
      "「実績」では、条件をクリアすると報酬を受け取れます。ガチャ回数、採掘回数、宝石獲得数、バグ撃破数など、さまざまな実績があります。",
      "このゲームは、転生をして素の確率を育ててもよし。ダンジョンに潜り、スライムを倒して最強を目指してもよし。祭壇で便利な遺物を集め、放置効率を上げてもよし。すべては、無限の確率を突破するためにあります。",
      "おすすめの戦略や、それぞれの詳しい情報は、設定の「ヘルプ」から確認できます。",
      "それでは、ガチャを引き続けましょう。"
    ];
  }

  function getRebirthTutorialLogs() {
    return [
      "転生が完了しました。",
      "通常データは初期化されましたが、あなたの記録は一部引き継がれています。",
      "転生する前に「0の遺物」を購入しておくと、転生時に素のガチャ確率が上昇します。",
      "0の遺物を購入しない転生は、転生回数だけが残り、成長効果はほとんどありません。",
      "転生後は、祭壇で再び0の遺物を購入できるようになります。",
      "0の遺物は凸可能です。凸数が増えるほど、転生時の素の確率上昇量が大きくなります。",
      "まずは石を集め、祭壇で0の遺物を購入することを目指しましょう。"
    ];
  }

  function getSecondLoopTutorialLogs() {
    return [
      "二周目の世界へようこそ。",
      "あなたは一度、通常データを初期化し、それでも残る力を手に入れました。",
      "無限の遺物による∞凸は、全遺物効果を強化します。",
      "転生による0の遺物は、素の確率を強化します。",
      "スライムの遺物は、スライム勝利後の成長を強化します。",
      "このゲームには、いくつかの成長軸があります。",
      "ガチャを引いて遺物を集める。",
      "バグを倒して確率倍率を上げる。",
      "ダンジョンで採掘し、宝石とステータスを得る。",
      "祭壇で便利な遺物を購入する。",
      "0の遺物を持って転生し、素の確率を育てる。",
      "無限の遺物で全遺物効果を強化する。",
      "そして、異次元ダンジョンの奥にいる0スライムへ挑む。",
      "詳しい情報は、設定のヘルプから確認できます。",
      "まだ終わりではありません。",
      "ここからが、infinityガチャです。"
    ];
  }

  function shouldShowSecondLoopTutorial(state) {
    var currentLoop = typeof state.currentLoop === "number" ? state.currentLoop : ((state.infinityCount || 0) + 1);
    return (state.infinityCount || 0) >= 1 || currentLoop >= 2;
  }

  function collectPendingTutorialLogs(state) {
    var tutorialState = ensureTutorialState(state);
    var logs = [];

    if (tutorialState.tutorialLogEnabled !== false && !tutorialState.hasSeenFirstTutorial) {
      Array.prototype.push.apply(logs, getFirstTutorialLogs());
      tutorialState.hasSeenFirstTutorial = true;
    }
    if (tutorialState.tutorialLogEnabled !== false && !tutorialState.hasSeenRebirthTutorial && state.rebirthState && state.rebirthState.rebirthCount >= 1) {
      Array.prototype.push.apply(logs, getRebirthTutorialLogs());
      tutorialState.hasSeenRebirthTutorial = true;
    }
    if (tutorialState.tutorialLogEnabled !== false && !tutorialState.hasSeenSecondLoopTutorial && shouldShowSecondLoopTutorial(state)) {
      Array.prototype.push.apply(logs, getSecondLoopTutorialLogs());
      tutorialState.hasSeenSecondLoopTutorial = true;
    }

    return logs;
  }

  function replayTutorial(state) {
    ensureTutorialState(state);
    return getFirstTutorialLogs().slice();
  }

  window.InfinityGachaTutorial = {
    ensureTutorialState: ensureTutorialState,
    collectPendingTutorialLogs: collectPendingTutorialLogs,
    replayTutorial: replayTutorial,
    getFirstTutorialLogs: getFirstTutorialLogs,
    getRebirthTutorialLogs: getRebirthTutorialLogs,
    getSecondLoopTutorialLogs: getSecondLoopTutorialLogs
  };
})();

