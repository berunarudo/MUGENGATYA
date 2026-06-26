(function () {
  var data = window.InfinityGachaData;
  var effects = window.InfinityGachaEffects;

  function looksMojibake(text) {
    return /ç¸º|ç¹§|è›Ÿ|èž³|éšª|é|é©•|è°º|èœ€|èžŸ|è³|èŸ„|è´|è¬Œ|縺|繧|蛟|螳/.test(String(text || ""));
  }

  function displayAchievementName(achievement) {
    if (!achievement) {
      return "実績";
    }
    return looksMojibake(achievement.name) ? achievement.id : achievement.name;
  }

  function getAchievementList() {
    return data.ACHIEVEMENTS.slice();
  }

  function getProgressValue(achievement, state) {
    switch (achievement.targetType) {
      case "totalGachaCount":
        return state.totalGachaCount || 0;
      case "totalMissCount":
        return state.totalMissCount || 0;
      case "rankRelicTotal":
        return effects.getRankRelicTotal(achievement.targetRank, state);
      case "maxRelicLimitBreak":
        return effects.getMaxLimitBreak(state);
      case "rankMaxLimitBreak":
        return (state.rankMaxLimitBreak && state.rankMaxLimitBreak[achievement.targetRank]) || 0;
      case "highestRankMaxLimitBreak":
        return effects.getHighestRankMaxLimitBreak(achievement.targetRanks || [], state);
      case "totalBugDefeats":
        return state.totalBugDefeats || 0;
      case "bugRankDefeat":
        return (state.defeatedBugCounts && state.defeatedBugCounts[achievement.targetRank]) || 0;
      case "totalMiningCount":
        return (state.dungeonRecords && state.dungeonRecords.totalMiningCount) || 0;
      case "totalGemCount":
        return (state.dungeonRecords && state.dungeonRecords.totalGemCount) || 0;
      case "totalSlimeDefeats":
        return (state.dungeonRecords && state.dungeonRecords.totalSlimeDefeats) || 0;
      case "totalInfinitySlimeEncounters":
        return (state.dungeonRecords && state.dungeonRecords.totalInfinitySlimeEncounters) || 0;
      case "totalInfinitySlimeDefeats":
        return (state.dungeonRecords && state.dungeonRecords.totalInfinitySlimeDefeats) || 0;
      case "totalZeroSlimeEncounters":
        return (state.zeroSlimeRecords && state.zeroSlimeRecords.totalEncounters) || (state.dungeonRecords && state.dungeonRecords.totalZeroSlimeEncounters) || 0;
      case "totalZeroSlimeDefeats":
        return (state.zeroSlimeRecords && state.zeroSlimeRecords.totalDefeats) || (state.dungeonRecords && state.dungeonRecords.totalZeroSlimeDefeats) || 0;
      case "enteredGoldenDungeon":
        return (state.dungeonRecords && state.dungeonRecords.enteredGoldenDungeon) || 0;
      case "enteredDimensionalDungeon":
        return (state.dungeonRecords && state.dungeonRecords.enteredDimensionalDungeon) || 0;
      case "rebirthCount":
        return (state.rebirthState && state.rebirthState.rebirthCount) || 0;
      case "zeroRelicLimitBreak":
        return (state.zeroRelicState && state.zeroRelicState.limitBreak) || 0;
      case "totalDecomposeCount":
        return state.totalDecomposeCount || 0;
      case "totalDecomposeStone":
        return state.totalDecomposeStone || 0;
      case "highestRelicRankAtLeast":
        return state.highestRelicRank ? (data.isRankAtLeast(state.highestRelicRank, achievement.targetRank) ? 1 : 0) : 0;
      case "rankTotalLimitBreak":
        return effects.getRankTotalLimitBreak(achievement.targetRank, state);
      case "specialFlag":
        return state.specialFlags && state.specialFlags[achievement.targetFlag] ? 1 : 0;
      default:
        return 0;
    }
  }

  function getPhase8AchievementProgress(achievement, state) {
    var alreadyRecorded = Boolean(
      state.achievementState &&
      state.achievementState.announced &&
      state.achievementState.announced[achievement.id]
    );
    switch (achievement.id) {
      case "milestone_infinity":
      case "special_infinity_break":
        return alreadyRecorded ? 1 : (state.ifRelicObtained === true ? 1 : 0);
      case "milestone_infinity_button":
      case "milestone_infinity_lb1":
        return Math.max(alreadyRecorded ? 1 : 0, state.infinityCount || 0);
      case "milestone_infinity_lb5":
        return Math.max(alreadyRecorded ? 5 : 0, state.infinityCount || 0);
      case "milestone_infinity_lb10":
        return Math.max(alreadyRecorded ? 10 : 0, state.infinityCount || 0);
      default:
        return null;
    }
  }

  function isAchievementAchieved(achievement, state) {
    var phase8Progress = getPhase8AchievementProgress(achievement, state);
    if (phase8Progress !== null) {
      return phase8Progress >= (achievement.targetValue || (achievement.id === "milestone_infinity_lb5" ? 5 : achievement.id === "milestone_infinity_lb10" ? 10 : 1));
    }
    if (achievement.implemented === false || achievement.targetType === "future") {
      return false;
    }
    return getProgressValue(achievement, state) >= (achievement.targetValue || 1);
  }

  function getAchievementProgress(achievement, state) {
    var phase8Progress = getPhase8AchievementProgress(achievement, state);
    if (phase8Progress !== null) {
      var target = achievement.targetValue || (achievement.id === "milestone_infinity_lb5" ? 5 : achievement.id === "milestone_infinity_lb10" ? 10 : 1);
      var ratio = target > 0 ? Math.min(1, phase8Progress / target) : 0;
      return {
        current: phase8Progress,
        target: target,
        ratio: ratio,
        text: phase8Progress >= target ? "達成" : phase8Progress.toLocaleString("ja-JP") + " / " + target.toLocaleString("ja-JP")
      };
    }
    if (achievement.implemented === false || achievement.targetType === "future") {
      return {
        current: 0,
        target: achievement.targetValue || 1,
        ratio: 0,
        text: "後のフェーズで達成可能"
      };
    }

    var current = getProgressValue(achievement, state);
    var target = achievement.targetValue || 1;
    var ratio = target > 0 ? Math.min(1, current / target) : 0;

    return {
      current: current,
      target: target,
      ratio: ratio,
      text: achievement.targetType === "highestRelicRankAtLeast" || achievement.targetType === "specialFlag"
        ? (current >= target ? "達成" : "未達成")
        : current.toLocaleString("ja-JP") + " / " + target.toLocaleString("ja-JP")
    };
  }

  function getAchievementStatus(achievementId, state) {
    var achievement = data.ACHIEVEMENT_INDEX[achievementId];
    var achieved = achievement ? isAchievementAchieved(achievement, state) : false;
    var claimed = Boolean(state.achievementState && state.achievementState.claimed && state.achievementState.claimed[achievementId]);
    var phase8Progress = achievement ? getPhase8AchievementProgress(achievement, state) : null;
    return {
      achieved: achieved,
      claimed: claimed,
      canClaim: achieved && !claimed,
      future: achievement ? (phase8Progress === null && (achievement.implemented === false || achievement.targetType === "future")) : false
    };
  }

  function checkAchievements(state) {
    var logs = [];
    var announced = state.achievementState.announced;

    data.ACHIEVEMENTS.forEach(function (achievement) {
      if (!isAchievementAchieved(achievement, state)) {
        return;
      }
      if (announced[achievement.id]) {
        return;
      }
      announced[achievement.id] = true;
      if (achievement.id === "special_infinity_break") {
        state.specialLogUnlocked = true;
        logs.push("特殊ログが解放された。");
      }
      logs.push("実績「" + displayAchievementName(achievement) + "」を達成しました。");
    });

    return logs;
  }

  function getAchievementRewardAmount(state, achievement) {
    var baseReward = achievement.rewardStone || 0;
    var useMultiplier = Boolean(
      state.settings &&
      state.settings.achievementStoneMultiplierEnabled
    );

    if (!useMultiplier) {
      return baseReward;
    }

    return Math.max(0, Math.floor(baseReward * effects.calculateStoneGainMultiplier(state).multiplier));
  }

  function claimAchievementReward(state, achievementId) {
    var achievement = data.ACHIEVEMENT_INDEX[achievementId];
    if (!achievement) {
      return { ok: false, logs: ["存在しない実績です。"] };
    }

    var status = getAchievementStatus(achievementId, state);
    if (status.future) {
      return { ok: false, logs: ["この実績は後のフェーズで達成可能です。"] };
    }
    if (!status.achieved) {
      return { ok: false, logs: ["この実績はまだ達成していません。"] };
    }
    if (status.claimed) {
      return { ok: false, logs: ["この実績の報酬はすでに受け取り済みです。"] };
    }

    var rewardStone = getAchievementRewardAmount(state, achievement);
    state.achievementState.claimed[achievementId] = true;
    state.stones += rewardStone;

    return {
      ok: true,
      logs: ["実績「" + displayAchievementName(achievement) + "」の報酬として石を" + rewardStone.toLocaleString("ja-JP") + "個獲得。"]
    };
  }

  function buildAchievementEntries(state) {
    return data.ACHIEVEMENTS.map(function (achievement) {
      return {
        id: achievement.id,
        categoryKey: achievement.categoryKey,
        category: achievement.category,
        name: achievement.name,
        description: achievement.description,
        rewardStone: achievement.rewardStone,
        rewardStoneDisplay: getAchievementRewardAmount(state, achievement),
        status: getAchievementStatus(achievement.id, state),
        progress: getAchievementProgress(achievement, state),
        implemented: achievement.implemented !== false
      };
    });
  }

  window.InfinityGachaAchievements = {
    getAchievementList: getAchievementList,
    isAchievementAchieved: isAchievementAchieved,
    getAchievementProgress: getAchievementProgress,
    getAchievementStatus: getAchievementStatus,
    checkAchievements: checkAchievements,
    claimAchievementReward: claimAchievementReward,
    buildAchievementEntries: buildAchievementEntries
  };
})();
