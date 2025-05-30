// DOM Elements
const localVideo = document.getElementById('local-video');
const remoteVideos = document.getElementById('remote-videos');
const muteBtn = document.getElementById('mute-btn');
const videoBtn = document.getElementById('video-btn');
const endBtn = document.getElementById('end-btn');
const copyBtn = document.getElementById('copy-btn');
const roomIdInput = document.getElementById('room-id');

// Variables
let localStream;
let peers = {};
const roomId = roomIdInput.value;

// Initialize Peer
const myPeer = new Peer(undefined, {
  host: '/',
  port: 9000,
  path: '/peerjs'
});

// Socket.io connection
const socket = io();

// Get user media
async function initLocalStream() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
    localVideo.srcObject = localStream;
    
    // Initialize peer connection
    initPeerConnection();
  } catch (err) {
    console.error('Failed to get local stream', err);
    alert('Could not access camera/microphone. Please check permissions.');
  }
}

function initPeerConnection() {
  // Peer event handlers
  myPeer.on('open', id => {
    console.log('My peer ID:', id);
    socket.emit('join-room', roomId, id);
  });

  myPeer.on('call', call => {
    call.answer(localStream);
    call.on('stream', remoteStream => {
      addVideoStream(call.peer, remoteStream);
    });
    call.on('close', () => {
      removeVideoStream(call.peer);
    });
    peers[call.peer] = call;
  });

  // Socket.io event handlers
  socket.on('user-connected', userId => {
    connectToNewUser(userId);
  });

  socket.on('user-disconnected', userId => {
    if (peers[userId]) {
      peers[userId].close();
      removeVideoStream(userId);
    }
  });
}

function connectToNewUser(userId) {
  const call = myPeer.call(userId, localStream);
  call.on('stream', remoteStream => {
    addVideoStream(userId, remoteStream);
  });
  call.on('close', () => {
    removeVideoStream(userId);
  });
  peers[userId] = call;
}

function addVideoStream(userId, stream) {
  const videoContainer = document.createElement('div');
  videoContainer.className = 'remote-video-container';
  
  const video = document.createElement('video');
  video.className = 'remote-video';
  video.srcObject = stream;
  video.autoplay = true;
  video.playsInline = true;
  video.dataset.userId = userId;
  
  const userIdDisplay = document.createElement('div');
  userIdDisplay.className = 'user-id';
  userIdDisplay.textContent = `User: ${userId.substring(0, 8)}`;
  
  videoContainer.appendChild(video);
  videoContainer.appendChild(userIdDisplay);
  remoteVideos.appendChild(videoContainer);
}

function removeVideoStream(userId) {
  const videoContainer = document.querySelector(`.remote-video-container video[data-user-id="${userId}"]`)?.parentNode;
  if (videoContainer) {
    videoContainer.remove();
  }
  delete peers[userId];
}

// Event listeners
muteBtn.addEventListener('click', () => {
  const audioTracks = localStream.getAudioTracks();
  const isMuted = audioTracks[0].enabled;
  audioTracks.forEach(track => {
    track.enabled = !isMuted;
  });
  muteBtn.textContent = isMuted ? 'Unmute' : 'Mute';
  muteBtn.style.background = isMuted ? '#5f6368' : va(--primary-color);
});

videoBtn.addEventListener('click', () => {
  const videoTracks = localStream.getVideoTracks();
  const isVideoOn = videoTracks[0].enabled;
  videoTracks.forEach(track => {
    track.enabled = !isVideoOn;
  });
  videoBtn.textContent = isVideoOn ? 'Start Video' : 'Stop Video';
  videoBtn.style.background = isVideoOn ? '#5f6368' : va(--primary-color);
});

endBtn.addEventListener('click', () => {
  // Close all peer connections
  Object.values(peers).forEach(peer => peer.close());
  peers = {};
  
  // Stop local stream
  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }
  
  // Redirect to home
  window.location.href = '/';
});

copyBtn.addEventListener('click', () => {
  roomIdInput.select();
  document.execCommand('copy');
  copyBtn.textContent = 'Copied!';
  setTimeout(() => {
    copyBtn.textContent = 'Copy';
  }, 2000);
});

// Initialize the app
initLocalStream();