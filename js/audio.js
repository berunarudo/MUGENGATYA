(function () {
  var currentBgmKey = "";
  var audioUnlocked = false;
  var bgmAudio = null;
  var seAudios = {};

  var BGM_SOURCES = {
    normal: "audio/bgm/normal.mp3",
  };

  var SE_SOURCES = {
    mainButton: "audio/se/gacha-button.mp3",
    brPlus: "audio/se/br-plus.mp3"
  };

  function getSettings(state) {
    return state && state.settings ? state.settings : {};
  }

  function ensureAudioUnlocked() {
    audioUnlocked = true;
  }

  function createAudio(src, loop) {
    var audio = new Audio(src);
    audio.preload = "auto";
    audio.loop = loop === true;
    return audio;
  }

  function stopBgm() {
    if (!bgmAudio) {
      currentBgmKey = "";
      return;
    }
    try {
      bgmAudio.pause();
    } catch (error) {
      // Ignore playback teardown errors.
    }
    currentBgmKey = "";
  }

  function playBgm(state, key) {
    var settings = getSettings(state);
    var volume = typeof settings.bgmVolume === "number" ? settings.bgmVolume : 0.5;
    var src = BGM_SOURCES[key];

    if (!audioUnlocked || !src) {
      return;
    }
    if (currentBgmKey === key && bgmAudio) {
      bgmAudio.volume = volume;
      return;
    }

    stopBgm();
    bgmAudio = createAudio(src, true);
    bgmAudio.volume = volume;
    currentBgmKey = key;
    bgmAudio.play().catch(function () {
      currentBgmKey = "";
    });
  }

  function syncBgm(state) {
    if (!audioUnlocked) {
      return;
    }
    if (state && state.isBattle) {
      playBgm(state, "battle");
      return;
    }
    playBgm(state, "normal");
  }

  function playSe(state, key) {
    var settings = getSettings(state);
    var volume = typeof settings.seVolume === "number" ? settings.seVolume : 0.7;
    var src = SE_SOURCES[key];
    var audio;

    if (!audioUnlocked || !src || volume <= 0) {
      return;
    }

    audio = seAudios[key];
    if (!audio) {
      audio = createAudio(src, false);
      seAudios[key] = audio;
    }

    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (error) {
      // Ignore rewind errors.
    }

    audio.volume = volume;
    audio.play().catch(function () {
      // Ignore autoplay errors until the next user gesture.
    });
  }

  function playRankSe(state, rank) {
    if (["BR", "QR", "IR", "ER", "IF"].indexOf(rank) !== -1) {
      playSe(state, "brPlus");
    }
  }

  function updateVolumes(state) {
    var settings = getSettings(state);
    if (bgmAudio) {
      bgmAudio.volume = typeof settings.bgmVolume === "number" ? settings.bgmVolume : 0.5;
    }
    Object.keys(seAudios).forEach(function (key) {
      seAudios[key].volume = typeof settings.seVolume === "number" ? settings.seVolume : 0.7;
    });
  }

  window.InfinityGachaAudio = {
    ensureAudioUnlocked: ensureAudioUnlocked,
    syncBgm: syncBgm,
    stopBgm: stopBgm,
    playSe: playSe,
    playRankSe: playRankSe,
    updateVolumes: updateVolumes
  };
})();
