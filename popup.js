const importButton = document.getElementById('importButton');
const playButton = document.getElementById('playButton');
const previousButton = document.getElementById('previousButton');
const nextButton = document.getElementById('nextButton');
const volumeInput = document.getElementById('volumeInput');
const randomInput = document.getElementById('randomInput');
const randomizeLabel = document.getElementById('randomizeLabel');

const updateRandomDiv = rndVIDs => {
  if (rndVIDs) {
    randomizeLabel.innerHTML = `Randomize: ${rndVIDs.length} videos remaining`;
    randomInput.checked = true;
    previousButton.disabled = true;
  } else {
    randomizeLabel.innerHTML = 'Randomize';
    randomInput.checked = false;
    previousButton.disabled = false;
  }
};

const updatePlayListDiv = (currentVID, playlist) => {
  playListDiv.innerHTML = '';
  if (!playlist) return;
  const h1 = document.createElement('H1');
  h1.appendChild(
    document.createTextNode(playlist.title + ' (' + playlist.videos.length + ' videos)')
  );
  playListDiv.appendChild(h1);
  const ul = document.createElement('ul');
  let currentLI = undefined;
  playlist.videos.forEach(video => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#';
    a.innerHTML = video.title;
    a.id = video.id + 'A';
    if (currentVID === video.id) {
      a.style = 'color:red';
      currentLI = li;
    }
    a.onclick = () => {
      chrome.runtime.sendMessage({ msg: 'play_exact', videoId: video.id });
    };
    li.appendChild(a);
    ul.appendChild(li);
  });
  playListDiv.appendChild(ul);
  if (currentLI) currentLI.scrollIntoView({ behavior: 'auto', block: 'center' });
};

const updatePlayingInPlaylistDiv = (prevVID, currentVID) => {
  if (prevVID) {
    const prevA = document.getElementById(prevVID + 'A');
    prevA.style = 'color:blue';
  }
  if (currentVID) {
    const nowA = document.getElementById(currentVID + 'A');
    nowA.style = 'color:red';
  }
};

const noPlaylistDiv = message => {
  playListDiv.innerHTML = '';
  const h1 = document.createElement('H1');
  h1.appendChild(document.createTextNode(message));
  playListDiv.appendChild(h1);
};

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.msg === 'refresh_playlist') {
    updatePlayListDiv(request.runtime.currentVID, request.runtime.playlist);
  }
  if (request.msg === 'refresh_playing') {
    updatePlayingInPlaylistDiv(request.runtime.prevVID, request.runtime.currentVID);
  }
  if (request.msg === 'refresh_remaining_video') {
    updateRandomDiv(request.runtime.rndVIDs);
  }
  if (request.msg === 'refresh_play_state') {
    playButton.disabled = request.disabled ? true : false;
    playButton.state = request.state;
    playButton.className = playButton.state === 'Play' ? 'play-button' : 'pause-button';
    sendResponse();
  }
  if (request.msg === 'no_playlist_present') {
    noPlaylistDiv('PLease open a tab with youtube playlist and click import');
  }
  if (request.msg === 'playlist_loading') {
    noPlaylistDiv('Importing playlist. Please wait ...');
  }
});

importButton.onclick = event => {
  chrome.runtime.sendMessage({ msg: 'import_playlist' });
};

playButton.onclick = event => {
  chrome.runtime.sendMessage({ msg: 'play_pause', state: playButton.state });
};

previousButton.onclick = event => {
  chrome.runtime.sendMessage({ msg: 'play_prev' });
};

nextButton.onclick = event => {
  chrome.runtime.sendMessage({ msg: 'play_next' });
};
volumeInput.oninput = () => {
  volumeInput.style.background =
    'linear-gradient(to right, #ff8080 0%, #ff8080 ' +
    volumeInput.value +
    '%, #ccc ' +
    volumeInput.value +
    '%, #ccc 100%)';
};

randomInput.onclick = event => {
  if (event.target.checked) {
    chrome.runtime.sendMessage({ msg: 'randomize', randomize: true });
  } else {
    chrome.runtime.sendMessage({ msg: 'randomize', randomize: false });
  }
};

chrome.runtime.sendMessage({ msg: 'refresh_request' });
