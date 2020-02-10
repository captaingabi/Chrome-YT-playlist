let playlist = undefined;
const runtime = { tabId: undefined, currentVID: undefined, prevVID: undefined, rndVIDs: undefined };

chrome.storage.local.get('playlist', result => { playlist = result.playlist; });

const playRandom = () => {
  runtime.rndVIDs = runtime.rndVIDs.filter(video => video.id !== runtime.currentVID);
  if (runtime.rndVIDs.length === 0) runtime.rndVIDs = playlist.videos;
  const next = Math.floor(Math.random() * runtime.rndVIDs.length);
  runtime.prevVID = runtime.currentVID;
  runtime.currentVID = runtime.rndVIDs[next].id
  chrome.tabs.update(runtime.tabId, {
    url: `https://www.youtube.com/watch?v=${runtime.currentVID}&list=${playlist.id}`
  });
  chrome.runtime.sendMessage({ msg: 'refresh_playing', runtime });
  chrome.runtime.sendMessage({ msg: 'refresh_remaining_video', runtime });
};

const playOrder = (direction) => {
  let next =
    (Number(playlist.videos.findIndex(video => video.id === runtime.currentVID)) + direction) %
    playlist.videos.length;
  if(next < 0) next = playlist.videos.length - 1;
  runtime.prevVID = runtime.currentVID;
  runtime.currentVID = playlist.videos[next].id
  chrome.tabs.update(runtime.tabId, {
    url: `https://www.youtube.com/watch?v=${runtime.currentVID}&list=${playlist.id}`
  });
  chrome.runtime.sendMessage({ msg: 'refresh_playing', runtime });
};

const playExact = (videoId) => {
  runtime.prevVID = runtime.currentVID;
  runtime.currentVID = videoId;
  chrome.tabs.update(runtime.tabId, {
    url: `https://www.youtube.com/watch?v=${runtime.currentVID}&list=${playlist.id}`
  });
  chrome.runtime.sendMessage({ msg: 'refresh_playing', runtime });
};

chrome.runtime.onMessage.addListener(request => {
  if(request.msg === 'video_ended') {
    if(runtime.rndVIDs) playRandom(); else playOrder(1);
  }
  if (request.msg === 'play_next') {
    if(runtime.rndVIDs) playRandom(); else playOrder(1);
  }
  if (request.msg === 'play_prev') {
    playOrder(-1);
  }
  if (request.msg === 'play_exact') {
    playExact(request.videoId);
  }
  if (request.msg === 'randomize') {
    runtime.rndVIDs = request.randomize ? playlist.videos : undefined;
    chrome.runtime.sendMessage({ msg: 'refresh_remaining_video', runtime });
  }
  if (request.msg === 'refresh_request') {
    chrome.runtime.sendMessage({ msg: 'refresh_playlist', runtime, playlist });
    chrome.runtime.sendMessage({ msg: 'refresh_remaining_video', runtime });
  }
});

const importPlayist = (url) => {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onreadystatechange = () => {
    if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
      re = /window\["ytInitialData"\] = (.*);\n/;
      const json = xhr.response.match(re)[1];
      const response = JSON.parse(json);
      playlist = {
        id: response.contents.twoColumnWatchNextResults.playlist.playlist.playlistId,
        title: response.contents.twoColumnWatchNextResults.playlist.playlist.title,
        videos: response.contents.twoColumnWatchNextResults.playlist.playlist.contents.map(
          content => {
            return {
              id: content.playlistPanelVideoRenderer.videoId,
              title: content.playlistPanelVideoRenderer.title.simpleText
            };
          }
        )
      };
      chrome.storage.local.set({ playlist }, () => {});
    }
  };
  xhr.send(null);
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status == 'complete') {
    let re = /https?:\/\/www.youtube.com\/watch\?v=(.{11})&list=*/;
    const match = tab.url.match(re);
    if ( match ) {
      runtime.tabId = tabId;
      runtime.currentVID = match[1];
      importPlayist(tab.url);
    }
  }
});
