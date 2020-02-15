let video = document.querySelector('video');
let shortcutIcon = document.querySelectorAll('[rel="shortcut icon"]')[0];

const waitForVideo = () => {
  video = document.querySelector('video');
  shortcutIcon = document.querySelectorAll('[rel="shortcut icon"]')[0];
  if (!video || !shortcutIcon) {
    timerId = window.setTimeout(waitForVideo, 10);
  } else {
    chrome.runtime.sendMessage({ msg: 'video_loaded' });

    video.addEventListener('ended', event => {
      chrome.runtime.sendMessage({ msg: 'video_ended' });
    });

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (request.msg === 'set_paused') {
        if (request.paused) video.pause();
        else video.play();
        sendResponse({ paused: video.paused });
      }
      if (request.msg === 'get_paused') {
        sendResponse({ paused: video.paused });
      }
      if (request.msg === 'set_volume') {
        video.volume = request.volume;
        sendResponse({ volume: video.volume });
      }
      if (request.msg === 'get_volume') {
        sendResponse({ volume: video.volume });
      }
      if (request.msg === 'set_icon') {
        shortcutIcon.href = request.href;
      }
    });
  }
};

waitForVideo();
