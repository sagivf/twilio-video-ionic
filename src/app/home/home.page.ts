import {Component, ViewEncapsulation} from '@angular/core';
import {HttpClient} from '@angular/common/http';
// import { AndroidPermissions } from '@ionic-native/android-permissions';
import { Diagnostic } from '@ionic-native/diagnostic/ngx';

const domain = 'https://3ebc1a1d.ngrok.io';

declare var Twilio: any;

// Attach the Tracks to the DOM.
function attachTracks(tracks, container) {
  tracks.forEach(function(track) {
    container.appendChild(track.attach());
  });
}

// Attach the Participant's Tracks to the DOM.
function attachParticipantTracks(participant, container) {
  const tracks = getTracks(participant);
  attachTracks(tracks, container);
}

// Detach the Tracks from the DOM.
function detachTracks(tracks) {
  tracks.forEach(function(track) {
    track.detach().forEach(function(detachedElement) {
      detachedElement.remove();
    });
  });
}

// Detach the Participant's Tracks from the DOM.
function detachParticipantTracks(participant) {
  const tracks = getTracks(participant);
  detachTracks(tracks);
}

// Get the Participant's Tracks.
function getTracks(participant) {
  return Array.from(participant.tracks.values())
    .filter((publication: any) => publication.track)
    .map((publication: any) => publication.track);
}

// Activity log.
function log(message) {
  const logDiv = document.getElementById('log');
  logDiv.innerHTML += '<p>&gt;&nbsp;' + message + '</p>';
  logDiv.scrollTop = logDiv.scrollHeight;
}


@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  encapsulation: ViewEncapsulation.None
})
export class HomePage {

  activeRoom;
  previewTracks;
  identity;
  roomName;
  token;
  hideJoinRoom = false;
  hideLeaveRoom = true;

  constructor(private http: HttpClient,
              private diagnostic: Diagnostic) {
              // private androidPermissions: AndroidPermissions) {
    window.addEventListener('beforeunload', () => {
      if (this.activeRoom) {
        this.activeRoom.disconnect();
      }
    });
  }

  getPermissions() {
    return this.diagnostic.requestRuntimePermissions([
      this.diagnostic.permission.CAMERA,
      this.diagnostic.permission.RECORD_AUDIO
    ]);
  }

  fetch() {
    if (this.token) {
      return Promise.resolve();
    }
    return this.http.get<any>(`${domain}/token`).toPromise().then(data => {
      this.identity = data.identity;
      this.token = data.token;
    });
  }

  buttonPreview() {
    this.getPermissions().then(() => {
      const localTracksPromise = this.previewTracks
        ? Promise.resolve(this.previewTracks)
        : Twilio.Video.createLocalTracks();

      localTracksPromise.then(tracks => {
        this.previewTracks = tracks;
        (<any>window).previewTracks = this.previewTracks;
        const previewContainer = document.getElementById('local-media');
        if (!previewContainer.querySelector('video')) {
          attachTracks(tracks, previewContainer);
        }
      }, function (error) {
        console.error('Unable to access local media', error);
        log('Unable to access Camera and Microphone');
      });
    });
  }

  // Successfully connected!
  roomJoined = (room) => {
    this.activeRoom = room;
    (<any>window).room = this.activeRoom;

    log(`Joined as '${this.identity}'`);
    this.hideJoinRoom = true;
    this.hideLeaveRoom = false;

    // Attach LocalParticipant's Tracks, if not already attached.
    const previewContainer = document.getElementById('local-media');
    if (!previewContainer.querySelector('video')) {
      attachParticipantTracks(room.localParticipant, previewContainer);
    }

    // Attach the Tracks of the Room's Participants.
    room.participants.forEach(function(participant) {
      log(`Already in Room: '${participant.identity}'`);
      const _previewContainer = document.getElementById('remote-media');
      attachParticipantTracks(participant, _previewContainer);
    });

    // When a Participant joins the Room, log the event.
    room.on('participantConnected', function(participant) {
      log(`Joining: '${participant.identity}'`);
    });

    // When a Participant's Track is subscribed to, attach it to the DOM.
    room.on('trackSubscribed', function(track, publication, participant) {
      log(`Subscribed to ${participant.identity}'s track: ${track.kind}`);
      const _previewContainer = document.getElementById('remote-media');
      attachTracks([track], _previewContainer);
    });

    // When a Participant's Track is unsubscribed from, detach it from the DOM.
    room.on('trackUnsubscribed', function(track, publication, participant) {
      log(`Unsubscribed from ${participant.identity}'s track: ${track.kind}`);
      detachTracks([track]);
    });

    // When a Participant leaves the Room, detach its Tracks.
    room.on('participantDisconnected', function(participant) {
      log(`RemoteParticipant '${participant.identity}' left the room`);
      detachParticipantTracks(participant);
    });

    // Once the LocalParticipant leaves the room, detach the Tracks
    // of all Participants, including that of the LocalParticipant.
    room.on('disconnected', () => {
      log('Left');
      if (this.previewTracks) {
        this.previewTracks.forEach(track => track.stop());
      }
      detachParticipantTracks(room.localParticipant);
      room.participants.forEach(detachParticipantTracks);
      this.activeRoom = null;
      this.hideJoinRoom = false;
      this.hideLeaveRoom = true;
    });
  }

  joinRoom() {
    if (!this.roomName) {
      alert('Please enter a room name.');
      return;
    }

    log(`Joining room '${this.roomName}'...`);
    const connectOptions: any = {
      name: this.roomName,
      logLevel: 'debug'
    };

    if (this.previewTracks) {
      connectOptions.tracks = this.previewTracks;
    }

    Promise.all([
      this.getPermissions(),
      this.fetch()
    ]).then(() => {
      // Join the Room with the token from the server and the
      // LocalParticipant's Tracks.
      Twilio.Video.connect(this.token, connectOptions).then(this.roomJoined, function(error) {
        log('Could not connect to Twilio: ' + error.message);
      });
    });
  }

  leaveRoom() {
    log('Leaving room...');
    this.activeRoom.disconnect();
  }
}
