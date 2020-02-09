let previousButton = document.getElementById('previousButton');
let nextButton = document.getElementById('nextButton');
let playListLU = document.getElementById('playListLU');
let videoElement = document.querySelector('video');
let playlist = [];

function updatePlayListLU() {
  playListLU.innerHTML = '';
  h1 = document.createElement('H1');
  h1.appendChild(
    document.createTextNode(playlist.title + ' (' + playlist.videos.length + ' videos)')
  );
  playListLU.appendChild(h1);
  playlist.videos.forEach(video => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#';
    a.innerHTML = video.title;
    a.onclick = () => {
      chrome.tabs.update(playlist.tabId, {
        url: `https://www.youtube.com/watch?v=${video.id}&list=${playlist.id}`
      });
    };
    li.appendChild(a);
    playListLU.appendChild(li);
  });
}

chrome.storage.local.get('playlist', result => {
  if (result.playlist) playlist = result.playlist;
  updatePlayListLU();
});

previousButton.onclick = element => {
  chrome.tabs.get(playlist.tabId, tab => {
    const videoId = tab.url.match(/watch\?v=(.{11})/)[1];
    let prev =
      (Number(playlist.videos.findIndex(video => video.id === videoId)) - 1) %
      playlist.videos.length;
    if (prev < 0) prev = playlist.videos.length - 1;
    chrome.tabs.update(playlist.tabId, {
      url: `https://www.youtube.com/watch?v=${playlist.videos[prev].id}&list=${playlist.id}`
    });
  });
};

nextButton.onclick = element => {
  chrome.tabs.get(playlist.tabId, tab => {
    const videoId = tab.url.match(/watch\?v=(.{11})/)[1];
    const next =
      (Number(playlist.videos.findIndex(video => video.id === videoId)) + 1) %
      playlist.videos.length;
    chrome.tabs.update(playlist.tabId, {
      url: `https://www.youtube.com/watch?v=${playlist.videos[next].id}&list=${playlist.id}`
    });
  });
};
