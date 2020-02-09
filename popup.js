let previousButton = document.getElementById('previousButton');
let nextButton = document.getElementById('nextButton');
let playListDiv = document.getElementById('playListDiv');
let playlist = [];

function updatePlayListDiv(currentVideoId, playlist) {
  playListDiv.innerHTML = '';
  const h1 = document.createElement('H1');
  h1.appendChild(
    document.createTextNode(playlist.title + ' (' + playlist.videos.length + ' videos)')
  );
  playListDiv.appendChild(h1);
  const ul = document.createElement('ul');
  playlist.videos.forEach(video => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#';
    a.innerHTML = video.title;
    if (currentVideoId === video.id) a.style = 'color:red';
    a.onclick = () => {
      chrome.tabs.update(playlist.tabId, {
        url: `https://www.youtube.com/watch?v=${video.id}&list=${playlist.id}`
      });
      updatePlayListDiv(video.id, playlist);
    };
    li.appendChild(a);
    ul.appendChild(li);
  });
  playListDiv.appendChild(ul);
}

chrome.storage.local.get('playlist', result => {
  if (result.playlist) {
    playlist = result.playlist;
    chrome.tabs.get(playlist.tabId, tab => {
      const currentVideoId = tab.url.match(/watch\?v=(.{11})/)[1];
      updatePlayListDiv(currentVideoId, playlist);
    });
  }
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
    updatePlayListDiv(playlist.videos[prev].id, playlist);
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
    updatePlayListDiv(playlist.videos[next].id, playlist);
  });
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.msg === 'refresh_playlist') {
    updatePlayListDiv(request.videoId, playlist);
  }
});
