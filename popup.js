const importButton = document.getElementById('importButton');
const playButton = document.getElementById('playButton');
const previousButton = document.getElementById('previousButton');
const nextButton = document.getElementById('nextButton');
const volumeInput = document.getElementById('volumeInput');
const randomInput = document.getElementById('randomInput');
const randomizeLabel = document.getElementById('randomizeLabel');

const noPlaylistDiv = message => {
  playListDiv.innerHTML = '';
  const h1 = document.createElement('H1');
  h1.appendChild(document.createTextNode(message));
  playListDiv.appendChild(h1);
};

const updatePlayListDiv = runtime => {
  const h1 = document.createElement('H1');
  h1.appendChild(
    document.createTextNode(
      runtime.playlist.title + ' (' + runtime.playlist.videos.length + ' videos)'
    )
  );
  const ul = document.createElement('ul');
  let currentLI = undefined;
  runtime.playlist.videos.forEach(video => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#';
    a.innerHTML = video.title;
    a.id = video.id + 'A';
    if (runtime.currentVID === video.id) {
      a.style = 'color:red';
      currentLI = li;
    }
    a.onclick = () => {
      chrome.runtime.sendMessage({ msg: 'play_exact', videoId: video.id });
    };
    li.appendChild(a);
    li.addEventListener(
      'dragstart',
      event => {
        event.target.style.opacity = '0.4';
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/html', event.target.id);
      },
      false
    );
    li.addEventListener(
      'dragend',
      event => {
        event.target.style.opacity = '1';
      },
      false
    );
    li.addEventListener(
      'dragover',
      event => {
        if (event.preventDefault) {
          event.preventDefault();
        }
        event.dataTransfer.dropEffect = 'move';
      },
      false
    );
    li.addEventListener(
      'dragenter',
      event => {
        event.target.style.textDecoration = 'overline';
      },
      false
    );
    li.addEventListener(
      'dragleave',
      event => {
        event.target.style.textDecoration = null;
      },
      false
    );
    li.addEventListener(
      'drop',
      event => {
        if (event.stopPropagation) {
          event.stopPropagation();
        }
        chrome.runtime.sendMessage({
          msg: 'move_video_in_playlist',
          src: event.dataTransfer.getData('text/html').slice(0, -1),
          dst: event.target.id.slice(0, -1)
        });
        return false;
      },
      false
    );
    ul.appendChild(li);
  });
  playListDiv.innerHTML = '';
  playListDiv.appendChild(h1);
  playListDiv.appendChild(ul);
  if (currentLI) currentLI.scrollIntoView({ behavior: 'auto', block: 'center' });
};

const updateRandomDiv = runtime => {
  if (runtime.rndVIDs) {
    randomizeLabel.innerHTML = `Randomize: ${runtime.rndVIDs.length} videos remaining`;
    randomInput.checked = true;
    previousButton.disabled = true;
  } else {
    randomizeLabel.innerHTML = 'Randomize';
    randomInput.checked = false;
    previousButton.disabled = false;
  }
};

const updateVolumeSliderShadow = (beginColor, endColor) => {
  volumeInput.style.background =
    'linear-gradient(to right, ' +
    `#${beginColor} 0%, #${beginColor} ${volumeInput.value * 100}%, ` +
    `#${endColor} ${volumeInput.value * 100}%, #${endColor} 100%)`;
};

const updatePlayer = runtime => {
  if (runtime.refreshing) {
    playButton.disabled = true;
    volumeInput.disabled = true;
    updateVolumeSliderShadow('888', 'ccc');
  } else {
    playButton.disabled = false;
    volumeInput.disabled = false;
    updateVolumeSliderShadow('ff8080', 'ccc');
  }
  chrome.runtime.sendMessage({ msg: 'get_tab_id' }, response => {
    if (response && response.tabId) {
      chrome.tabs.get(response.tabId, tab => {
        if (tab && tab.status === 'complete') {
          chrome.tabs.sendMessage(response.tabId, { msg: 'get_paused' }, response => {
            playButton.className = response.paused ? 'play-button' : 'pause-button';
          });
          chrome.tabs.sendMessage(response.tabId, { msg: 'get_volume' }, response => {
            volumeInput.value = response.volume;
            updateVolumeSliderShadow('ff8080', 'ccc');
          });
        }
      });
    }
  });
};

playButton.onclick = event => {
  chrome.runtime.sendMessage({ msg: 'get_tab_id' }, response => {
    if (response && response.tabId) {
      chrome.tabs.sendMessage(
        response.tabId,
        { msg: 'set_paused', paused: playButton.className === 'pause-button' ? true : false },
        response => {
          playButton.className = response.paused ? 'play-button' : 'pause-button';
        }
      );
    }
  });
};

volumeInput.oninput = () => {
  updateVolumeSliderShadow('ff8080', 'ccc');
  chrome.runtime.sendMessage({ msg: 'get_tab_id' }, response => {
    if (response && response.tabId) {
      chrome.tabs.sendMessage(
        response.tabId,
        { msg: 'set_volume', volume: volumeInput.value },
        response => {
          volumeInput.value = response.volume;
          updateVolumeSliderShadow('ff8080', 'ccc');
        }
      );
    }
  });
};

importButton.onclick = event => {
  chrome.runtime.sendMessage({ msg: 'import_playlist' });
};

previousButton.onclick = event => {
  chrome.runtime.sendMessage({ msg: 'play_prev' });
};

nextButton.onclick = event => {
  chrome.runtime.sendMessage({ msg: 'play_next' });
};

randomInput.onclick = event => {
  if (event.target.checked) {
    chrome.runtime.sendMessage({ msg: 'randomize', randomize: true });
  } else {
    chrome.runtime.sendMessage({ msg: 'randomize', randomize: false });
  }
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.msg === 'no_playlist_present') {
    noPlaylistDiv(request.message);
  }
  if (request.msg === 'refresh_trigger') {
    updatePlayListDiv(request.runtime);
    updateRandomDiv(request.runtime);
    updatePlayer(request.runtime);
  }
});

chrome.runtime.sendMessage({ msg: 'refresh_request' }, response => {
  if (response.msg === 'no_playlist_present') {
    noPlaylistDiv(response.message);
  }
  if (response.msg === 'refresh_response') {
    updatePlayListDiv(response.runtime);
    updateRandomDiv(response.runtime);
    updatePlayer(response.runtime);
  }
});
