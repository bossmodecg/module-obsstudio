import Module from '@bossmodecg/module';

import { OBSWebSocket } from 'obs-websocket-js';

import ChangeCase from 'change-case';

function fixEventKeys(event) {
  const ret = {};

  Object.keys(event).forEach((key) => {
    ret[ChangeCase.camel(key)] = event[key];
  });

  return ret;
}

const DEFAULT_CONFIG = {
  password: null,
  scenePollInterval: 50,
  reconnectInterval: 5000
};

export default class OBSStudioModule extends Module {
  constructor(config) {
    super("obsstudio", config, { shouldCacheState: false, internalStateUpdatesOnly: true });
    this._connectToOBS = this._connectToOBS.bind(this);

    this._state = {
      latestStreamStatus: null
    };

    this.on('streamStatus', (event) => {
      this.logger.debug("OBS sent stream status update.");

      this.setState({ streamStatus: event });
    });

    this.on("internal.registerServer", (server) => {
      server.on("internal.beforeRun", () => {
        this._connectToOBS();
      });
    });
  }

  /* eslint-disable class-methods-use-this */
  get defaultConfig() { return DEFAULT_CONFIG; }
  /* eslint-enable class-methods-use-this */

  _connectToOBS() {
    const config = this.config;
    const logger = this.logger;

    try {
      logger.info(`Connecting to ${config.url}${config.password ? ' with password.' : '.'}`);
      this._obs = new OBSWebSocket(config.url, config.password);

      // hooking _emitEvent is kind of dangerous, but it's the best way we've got to
      // catch ALL events.
      this._obs._emitEvent = (eventType, event) => {
        this.logger.trace(() => `OBS event: ${eventType} -> ${JSON.stringify(event)}`);

        this.emit(ChangeCase.camel(eventType), fixEventKeys(event));

        this._obs.emit(`obs:event:${eventType}`, event);
        this._obs.emit(eventType, event);
      };
    } catch (err) {
      logger.warn("Failed to connect to OBS. Backing off for 5000ms and trying again.");
      logger.warn(`Error: ${err.message}`);

      setTimeout(this._connectToOBS, 5000);
    }
  }
}
