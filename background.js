chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  chrome.storage.local.get('playlist', result => {
    let playlist = [];
    if (result.playlist) {
      playlist = result.playlist;
      const videoId = sender.tab.url.match(/watch\?v=(.{11})/)[1];
      const next =
        (Number(playlist.videos.findIndex(video => video.id === videoId)) + 1) %
        playlist.videos.length;
      chrome.tabs.update(playlist.tabId, {
        url: `https://www.youtube.com/watch?v=${playlist.videos[next].id}&list=${playlist.id}`
      });
      chrome.runtime.sendMessage({ msg: 'refresh_playlist', videoId: playlist.videos[next].id });
    }
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status == 'complete') {
    let re = /https?:\/\/www.youtube.com\/watch\?v=.{11}&list=*/;
    if (tab.url.match(re)) {
      let xhr = new XMLHttpRequest();
      xhr.open('GET', tab.url, true);
      xhr.onreadystatechange = () => {
        if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
          re = /window\["ytInitialData"\] = .*;\n/g;
          let json = xhr.response.match(re)[0].slice(26, -2);
          let response = JSON.parse(json);
          let playlist = {
            tabId: tabId,
            id: response.contents.twoColumnWatchNextResults.playlist.playlist.playlistId,
            title: response.contents.twoColumnWatchNextResults.playlist.playlist.title,
            videos: response.contents.twoColumnWatchNextResults.playlist.playlist.contents.map(
              content => {
                return {
                  id: content.playlistPanelVideoRenderer.videoId,
                  title: content.playlistPanelVideoRenderer.title.simpleText,
                  lengthText: content.playlistPanelVideoRenderer.lengthText.simpleText,
                  thumbnail: content.playlistPanelVideoRenderer.thumbnail.thumbnails[0].url
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
