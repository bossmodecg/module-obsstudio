import BossmodeCG from 'bossmodecg';

import { OBSWebSocket } from 'obs-websocket-js';

import ChangeCase from 'change-case';

function fixEventKeys(event) {
  const ret = {};

  Object.keys(event).forEach((key) => {
    ret[ChangeCase.camel(key)] = event[key];
  });

  return ret;
}

export default class OBSStudioModule extends BossmodeCG.BModule {
  constructor(config) {
    super("obsstudio", config, { shouldCacheState: false, internalStateUpdatesOnly: true });

    this._state = {
      latestStreamStatus: null
    };
  }

  async _doRegister(server) {
    const config = this.config;
    const logger = this.logger;

    logger.info(`Connecting to ${config.url}${config.password ? ' with password.' : '.'}`);
    const obs = this._obs = new OBSWebSocket(config.url, config.password);

    // hooking _emitEvent is kind of dangerous, but it's the best way we've got to
    // catch ALL events.
    this._obs._emitEvent = (eventType, event) => {
      this.logger.trace(() => `OBS event: ${eventType} -> ${JSON.stringify(event)}`);

      this.emit(ChangeCase.camel(eventType), fixEventKeys(event));

      this._obs.emit('obs:event:' + eventType, event);
      this._obs.emit(eventType, event);
    };

    this.on('streamStatus', (event) => {
      this.logger.debug("OBS sent stream status update.");

      const oldStatus = this._state.streamStatus;
      this.setState({ streamStatus: event });
    });
  }
}
