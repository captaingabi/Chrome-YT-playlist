const videoElement = document.querySelector('video');

videoElement.addEventListener('ended', event => {
  chrome.runtime.sendMessage(event, response => {});
});
