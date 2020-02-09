chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  chrome.storage.local.get(['remainingVideos', 'playlist'], result => {
    if (result.playlist) {
      const playlist = result.playlist;
      const videoId = sender.tab.url.match(/watch\?v=(.{11})/)[1];
      if (result.remainingVideos) {
        let remainingVideos = result.remainingVideos.filter(video => video.id !== videoId);
        if (remainingVideos.length === 0) remainingVideos = playlist.videos;
        const next = Math.floor(Math.random() * remainingVideos.length);
        chrome.tabs.update(playlist.tabId, {
          url: `https://www.youtube.com/watch?v=${remainingVideos[next].id}&list=${playlist.id}`
        });
        chrome.storage.local.set({ remainingVideos }, () => {
          chrome.runtime.sendMessage({
            msg: 'refresh_playlist',
            videoId: remainingVideos[next].id
          });
        });
      } else {
        const next =
          (Number(playlist.videos.findIndex(video => video.id === videoId)) + 1) %
          playlist.videos.length;
        chrome.tabs.update(playlist.tabId, {
          url: `https://www.youtube.com/watch?v=${playlist.videos[next].id}&list=${playlist.id}`
        });
        chrome.runtime.sendMessage({
          msg: 'refresh_playlist',
          videoId: playlist.videos[next].id
        });
      }
    }
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status == 'complete') {
    let re = /https?:\/\/www.youtube.com\/watch\?v=.{11}&list=*/;
    if (tab.url.match(re)) {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', tab.url, true);
      xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
          re = /window\["ytInitialData"\] = (.*);\n/;
          const json = xhr.response.match(re)[1];
          const response = JSON.parse(json);
          const playlist = {
            tabId: tabId,
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
  }
});
