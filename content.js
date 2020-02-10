const videoElement = document.querySelector('video');

videoElement.addEventListener('ended', event => {
  chrome.runtime.sendMessage({ msg: 'video_ended' });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.msg === 'play_pause') {
    if (request.state === 'Play') videoElement.play();
    else videoElement.pause();
    sendResponse({ msg: request.msg, state: videoElement.paused ? 'Play' : 'Pause' });
  }
  if (request.msg === 'get_play_state') {
    sendResponse({ msg: request.msg, state: videoElement.paused ? 'Play' : 'Pause' });
  }
});
