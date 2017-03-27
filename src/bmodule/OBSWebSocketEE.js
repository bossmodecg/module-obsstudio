import { EventEmitter2 } from 'eventemitter2';
import mixin from 'mixin';

import { OBSWebSocket } from 'obs-websocket-js';

const allEvents = [
  'onConnectionOpened',
  'onConnectionClosed',
  'onConnectionFailed',
  'onAuthenticationSuccess',
  'onAuthenticationFailure',
  'onSceneSwitch',
  'onSceneListChanged',
  'onStreamStarting',
  'onStreamStarted',
  'onStreamStopping',
  'onStreamStopped',
  'onRecordingStarting',
  'onRecordingStarted',
  'onRecordingStopping',
  'onRecordingStopped',
  'onStreamStatus',
  'onExit'
];

// from https://github.com/haganbmj/obs-websocket-js/issues/14
// thanks, AlcaDesign!

export default class OBSWebSocketEE extends mixin(OBSWebSocket, EventEmitter2) {
  constructor() {
    super();
    allEvents.forEach(n => {
      // Alias of the event name without the "on" and lowerCamelCased.
      let eventName = n.slice(2);
      eventName = eventName[0].toLowerCase() + eventName.slice(1);
      this[n] = (...args) => {
          this.emit(n, ...args);
          this.emit(eventName, ...args);
        };
    });
  }
}
