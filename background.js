let playlist = undefined;
let runtime = {
  tabId: undefined,
  currentVID: undefined,
  prevVID: undefined,
  rndVIDs: undefined,
  loading: false
};
const playlistRegExp = /(https?:\/\/www.youtube.com\/watch\?v=(.{11})&list=(.*))&?/;
const playlistHTMLRegExp = /window\["ytInitialData"\] = (.*);\n/;

const refreshURL = () => {
  chrome.runtime.sendMessage(
    { msg: 'refresh_play_state', state: 'Pause', disabled: true },
    response => {
      chrome.tabs.update(
        runtime.tabId,
        {
          url: `https://www.youtube.com/watch?v=${runtime.currentVID}&list=${playlist.id}`
        },
        tab => {
          chrome.runtime.sendMessage({ msg: 'refresh_playing', runtime });
          chrome.runtime.sendMessage({ msg: 'refresh_remaining_video', runtime });
        }
      );
    }
  );
};

const playRandom = () => {
  runtime.rndVIDs = runtime.rndVIDs.filter(video => video.id !== runtime.currentVID);
  if (runtime.rndVIDs.length === 0) runtime.rndVIDs = playlist.videos;
  const next = Math.floor(Math.random() * runtime.rndVIDs.length);
  runtime.prevVID = runtime.currentVID;
  runtime.currentVID = runtime.rndVIDs[next].id;
  refreshURL();
};

const playOrder = direction => {
  let next =
    (Number(playlist.videos.findIndex(video => video.id === runtime.currentVID)) + direction) %
    playlist.videos.length;
  if (next < 0) next = playlist.videos.length - 1;
  runtime.prevVID = runtime.currentVID;
  runtime.currentVID = playlist.videos[next].id;
  refreshURL();
};

const playExact = videoId => {
  runtime.prevVID = runtime.currentVID;
  runtime.currentVID = videoId;
  refreshURL();
};

chrome.runtime.onMessage.addListener(request => {
  if (playlist) {
    if (request.msg === 'video_ended') {
      if (runtime.rndVIDs) playRandom();
      else playOrder(1);
    }
    if (request.msg === 'play_next') {
      if (runtime.rndVIDs) playRandom();
      else playOrder(1);
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
    if (request.msg === 'play_pause') {
      chrome.tabs.sendMessage(runtime.tabId, request, response => {
        chrome.runtime.sendMessage({ msg: 'refresh_play_state', state: response.state });
      });
    }
    if (request.msg === 'refresh_request') {
      chrome.tabs.get(runtime.tabId, tab => {
        if (tab) {
          chrome.runtime.sendMessage({ msg: 'refresh_playlist', runtime, playlist });
          chrome.runtime.sendMessage({ msg: 'refresh_remaining_video', runtime });
          if (tab.status === 'complete') {
            chrome.tabs.sendMessage(runtime.tabId, { msg: 'get_play_state' }, response => {
              chrome.runtime.sendMessage({ msg: 'refresh_play_state', state: response.state });
            });
          }
        }
      });
    }
  } else {
    if (runtime.loading) {
      chrome.runtime.sendMessage({ msg: 'playlist_loading' });
    } else {
      chrome.runtime.sendMessage({ msg: 'no_playlist_present' });
    }
  }
});

const importPlayist = url => {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.onreadystatechange = () => {
    if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
      const json = xhr.response.match(playlistHTMLRegExp)[1];
      const response = JSON.parse(json);
      playlist = {
        id: response.contents.twoColumnWatchNextResults.playlist.playlist.playlistId,
        title: response.contents.twoColumnWatchNextResults.playlist.playlist.title,
        videos: response.contents.twoColumnWatchNextResults.playlist.playlist.contents.reduce(
          (result, content) => {
            if (
              content.playlistPanelVideoRenderer.videoId &&
              content.playlistPanelVideoRenderer.title
            )
              result.push({
                id: content.playlistPanelVideoRenderer.videoId,
                title: content.playlistPanelVideoRenderer.title.simpleText
              });
            return result;
          },
          []
        )
      };
      chrome.runtime.sendMessage({ msg: 'refresh_play_state', state: 'Pause' });
      if (runtime.loading) {
        runtime.loading = false;
        chrome.runtime.sendMessage({ msg: 'refresh_playlist', runtime, playlist });
      }
    }
  };
  xhr.send(null);
};

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  const match = tab.url.match(playlistRegExp);
  if (match) {
    if (changeInfo.status === 'complete') {
      importPlayist(tab.url);
      runtime.currentVID = match[2];
      runtime.tabId = tabId;
    }
    if (changeInfo.status == 'loading' && !playlist) {
      runtime.loading = true;
      chrome.runtime.sendMessage({ msg: 'playlist_loading', runtime });
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (runtime.tabId === tabId) {
    playlist = undefined;
    runtime = { tabId: undefined, currentVID: undefined, prevVID: undefined, rndVIDs: undefined };
  }
});
