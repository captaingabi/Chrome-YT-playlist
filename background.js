let runtime = {
  tabId: undefined,
  playlist: undefined,
  currentVID: undefined,
  prevVID: undefined,
  rndVIDs: undefined,
  loading: false,
  refreshing: false
};
const playlistRegExp = /(https?:\/\/www.youtube.com\/watch\?v=(.{11})&list=(.*))&?/;
const playlistHTMLRegExp = /window\["ytInitialData"\] = (.*);\n/;

chrome.storage.local.get('playlist', result => {
  if (result) runtime.playlist = result.playlist;
});

const setTabId = tabId => {
  runtime.tabId = tabId;
  if (runtime.tabId) {
    chrome.tabs.sendMessage(runtime.tabId, {
      msg: 'set_icon',
      href: chrome.runtime.getURL('SVG/player.svg')
    });
    chrome.browserAction.setBadgeText({ text: '' }, () => {});
  } else {
    chrome.browserAction.setBadgeText({ text: '!' }, () => {});
  }
};

const moveVideoInList = (srcVideoId, dstVideoId) => {
  if (srcVideoId === dstVideoId) return;
  const srcVideo = runtime.playlist.videos.find(video => video.id === srcVideoId);
  runtime.playlist.videos = runtime.playlist.videos.reduce((result, video) => {
    if (video.id === srcVideoId);
    else if (video.id === dstVideoId) {
      result.push(srcVideo);
      result.push(video);
    } else result.push(video);
    return result;
  }, []);
  chrome.storage.local.set({ playlist: runtime.playlist }, () => {});
};

const refreshURL = () => {
  runtime.refreshing = true;
  if (runtime.tabId) {
    chrome.tabs.update(
      runtime.tabId,
      {
        url: `https://www.youtube.com/watch?v=${runtime.currentVID}&list=${runtime.playlist.id}`
      },
      tab => {
        setTabId(tab.id);
        chrome.runtime.sendMessage({ msg: 'refresh_trigger', runtime });
      }
    );
  } else {
    chrome.tabs.create(
      {
        url: `https://www.youtube.com/watch?v=${runtime.currentVID}&list=${runtime.playlist.id}`
      },
      tab => {
        setTabId(tab.id);
        chrome.runtime.sendMessage({ msg: 'refresh_trigger', runtime });
      }
    );
  }
};

const playRandom = () => {
  runtime.rndVIDs = runtime.rndVIDs.filter(video => video.id !== runtime.currentVID);
  if (runtime.rndVIDs.length === 0) runtime.rndVIDs = runtime.playlist.videos;
  const next = Math.floor(Math.random() * runtime.rndVIDs.length);
  runtime.prevVID = runtime.currentVID;
  runtime.currentVID = runtime.rndVIDs[next].id;
  refreshURL();
};

const playOrder = direction => {
  let next =
    (Number(runtime.playlist.videos.findIndex(video => video.id === runtime.currentVID)) +
      direction) %
    runtime.playlist.videos.length;
  if (next < 0) next = runtime.playlist.videos.length - 1;
  runtime.prevVID = runtime.currentVID;
  runtime.currentVID = runtime.playlist.videos[next].id;
  refreshURL();
};

const playExact = videoId => {
  runtime.prevVID = runtime.currentVID;
  runtime.currentVID = videoId;
  refreshURL();
};

const importPlayistChunk = (playlistId, videoId) => {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', 'https://www.youtube.com/watch?v=' + videoId + '&list=' + playlistId, true);
  xhr.setRequestHeader('Set-Cookie', 'HttpOnly;Secure;SameSite=None');
  xhr.onreadystatechange = () => {
    if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
      const response = JSON.parse(xhr.response.match(playlistHTMLRegExp)[1]);
      const videos = response.contents.twoColumnWatchNextResults.playlist.playlist.contents.reduce(
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
      );
      if (runtime.playlist && runtime.playlist.videos) {
        const lastVideoId = runtime.playlist.videos[runtime.playlist.videos.length - 1].id;
        const newVideos = videos.slice(videos.findIndex(video => video.id === lastVideoId) + 1);
        if (newVideos.length > 0) {
          runtime.playlist.videos = runtime.playlist.videos.concat(newVideos);
          importPlayistChunk(playlistId, newVideos[newVideos.length - 1].id);
        } else {
          if (runtime.loading) {
            runtime.loading = false;
            chrome.runtime.sendMessage({ msg: 'refresh_trigger', runtime });
          }
          chrome.storage.local.set({ playlist: runtime.playlist }, () => {});
        }
      } else {
        runtime.playlist = {
          id: response.contents.twoColumnWatchNextResults.playlist.playlist.playlistId,
          title: response.contents.twoColumnWatchNextResults.playlist.playlist.title,
          videos: videos
        };
        importPlayistChunk(playlistId, videos[videos.length - 1].id);
      }
    }
  };
  xhr.send(null);
};

const findFirstVideo = playlistId => {
  const xhr = new XMLHttpRequest();
  xhr.open('GET', 'https://www.youtube.com/playlist?list=' + playlistId, true);
  xhr.setRequestHeader('Set-Cookie', 'HttpOnly;Secure;SameSite=None');
  xhr.onreadystatechange = () => {
    if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
      const response = JSON.parse(xhr.response.match(playlistHTMLRegExp)[1]);
      const firstVideoId =
        response.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content
          .sectionListRenderer.contents[0].itemSectionRenderer.contents[0].playlistVideoListRenderer
          .contents[0].playlistVideoRenderer.videoId;
      importPlayistChunk(playlistId, firstVideoId);
    }
  };
  xhr.send(null);
};

const importPlaylist = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0];
    const match = tab.url.match(playlistRegExp);
    if (match) {
      chrome.runtime.sendMessage({
        msg: 'no_playlist_present',
        message: 'Importing playlist. Please wait ...'
      });
      runtime.playlist = undefined;
      runtime.loading = true;
      runtime.currentVID = match[2];
      setTabId(tab.id);
      findFirstVideo(match[3]);
    }
  });
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.msg === 'get_tab_id') {
    sendResponse({ tabId: runtime.tabId });
  }
  if (request.msg === 'import_playlist') {
    importPlaylist(runtime);
  }
  if (request.msg === 'refresh_request') {
    if (runtime.loading) {
      sendResponse({
        msg: 'no_playlist_present',
        message: 'Importing playlist. Please wait ...'
      });
    } else if (!runtime.playlist) {
      sendResponse({
        msg: 'no_playlist_present',
        message: 'PLease open a tab with youtube playlist and click import'
      });
    } else {
      sendResponse({ msg: 'refresh_response', runtime });
    }
  }
  if (runtime && runtime.playlist) {
    if (request.msg === 'video_loaded') {
      if (runtime.tabId === sender.tab.id) {
        setTabId(sender.tab.id);
        runtime.refreshing = false;
        chrome.runtime.sendMessage({ msg: 'refresh_trigger', runtime });
      }
    }
    if (request.msg === 'video_ended') {
      if (runtime.tabId === sender.tab.id) {
        if (runtime.rndVIDs) playRandom();
        else playOrder(1);
      }
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
      runtime.rndVIDs = request.randomize ? runtime.playlist.videos : undefined;
      chrome.runtime.sendMessage({ msg: 'refresh_trigger', runtime });
    }
    if (request.msg === 'move_video_in_playlist') {
      moveVideoInList(request.src, request.dst);
      chrome.runtime.sendMessage({ msg: 'refresh_trigger', runtime });
    }
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId === runtime.tabId) {
    if (!tab.url.match(playlistRegExp)) {
      setTabId(undefined);
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (tabId === runtime.tabId) {
    setTabId(undefined);
  }
});

setTabId(undefined);
