let previousButton = document.getElementById('previousButton');
let nextButton = document.getElementById('nextButton');
let randomInput = document.getElementById('randomInput');
let randomLabel = document.getElementById('randomLabel');

const updateRandomDiv = (rndVIDs) => {
  if (rndVIDs) {
    randomLabel.innerHTML = `${rndVIDs.length} videos remaining`;
    randomInput.checked = true;
    previousButton.disabled = true;
  } else {
    randomLabel.innerHTML = '';
    randomInput.checked = false;
    previousButton.disabled = false;
  }
};

const updatePlayListDiv = (currentVID, playlist) => {
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
    a.id = video.id + 'A';
    if (currentVID === video.id) a.style = 'color:red';
    a.onclick = () => {
      chrome.runtime.sendMessage({ msg: 'play_exact', videoId: video.id });
    };
    li.appendChild(a);
    ul.appendChild(li);
  });
  playListDiv.appendChild(ul);
};

const updatePlayingInPlaylistDiv = (prevVID, currentVID) => {
  if(prevVID) {
    const prevA = document.getElementById(prevVID + 'A');
    prevA.style = 'color:blue';
  }
  if(currentVID) {
    const nowA = document.getElementById(currentVID + 'A');
    nowA.style = 'color:red';
  }
};

chrome.runtime.onMessage.addListener(request => {
  if (request.msg === 'refresh_playlist') {
    updatePlayListDiv(request.runtime.currentVID, request.playlist);
  }
  if (request.msg === 'refresh_playing') {
    updatePlayingInPlaylistDiv(request.runtime.prevVID, request.runtime.currentVID);
  }
  if (request.msg === 'refresh_remaining_video') {
    updateRandomDiv(request.runtime.rndVIDs);
  }
});

previousButton.onclick = element => {
  chrome.runtime.sendMessage({ msg: 'play_prev' });
};

nextButton.onclick = element => {
  chrome.runtime.sendMessage({ msg: 'play_next' });
};

randomInput.onclick = event => {
  if (event.target.checked) {
    chrome.runtime.sendMessage({ msg: 'randomize', randomize: true });
  } else {
    chrome.runtime.sendMessage({ msg: 'randomize', randomize: false });
  }
};

chrome.runtime.sendMessage({ msg: 'refresh_request' });
