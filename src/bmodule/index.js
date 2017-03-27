import BossmodeCG from 'bossmodecg';

import OBSWebSocketEE from './OBSWebSocketEE';

export default class OBSStudioModule extends BossmodeCG.BModule {
  constructor(config) {
    super("obsstudio", config, { shouldCacheState: false, internalStateUpdatesOnly: true });

    this._connect = this._connect.bind(this);
    this._pollScenesAndTransitions = this._pollScenesAndTransitions.bind(this);

    this._state = {
      sceneName: null,
      transitionName: null,
      streamState: 'UNKNOWN',
      recordingState: 'UNKNOWN'
    };

    this._obsSocket = new OBSWebSocketEE();
  }

  async _doRegister(server) {
    const config = this.config;
    const logger = this.logger;

    const obs = this._obsSocket;

    obs.on('connectionOpened', () => {
      logger.info("Connected to OBS.");

      this.setState({ connected: true });

      this._pollScenesAndTransitions();

      this.emit('connectionOpened');
    });

    obs.on('connectionClosed', () => {
      logger.error(`Connection closed; attempting to reconnect in ${config.reconnectInterval}ms.`);

      this.setState({ connected: false });

      setTimeout(() => {
        this._connect();
      }, config.reconnectInterval);

      this.emit('connectionClosed');
    });

    obs.on('connectionFailed', () => {
      logger.error(`Connection failed; attempting to reconnect in ${config.reconnectInterval}ms.`);

      this.setState({ connected: false });

      setTimeout(() => {
        this._connect();
      }, config.reconnectInterval);

      this.emit('connectionFailed');
    });

    obs.on('authenticationSuccess', () => {
      logger.info("Authentication succeeded.");

      this.emit('authenticationSuccess');
    });

    obs.on('authenticationFailure', () => {
      logger.error("Authentication failed.");

      this.emit('authenticationSuccess');
    });

    obs.on('sceneSwitch', (sceneName) => {
      logger.info(`Switched scene to '${sceneName}'.`);

      const oldSceneName = this._state.sceneName;

      this.setState({ sceneName: sceneName });

      this.emit('sceneSwitch', { oldScene: oldSceneName, newScene: sceneName });
    });

    obs.on('sceneListChanged', (sceneListEvent) => {
      logger.info("Scene list changed.");

      this._pollScenesAndTransitions();
      this.emit('sceneListChanged', sceneListEvent);
    });

    obs.on('streamStarting', () => {
      logger.info("Stream starting.");

      this.emit('streamStarting');
    });

    obs.on('streamStarted', () => {
      logger.info("Stream started.");

      this.emit('streamStarted');
    });

    obs.on('streamStopping', () => {
      logger.info("Stream stopping.");

      this.emit('streamStopping');
    });

    obs.on('streamStopped', () => {
      logger.info("Stream stopped.");

      this.emit('streamStopped');
    });

    obs.on('recordingStarting', () => {
      logger.info("Recording starting.");

      this.emit('recordingStarting');
    });

    obs.on('recordingStarted', () => {
      logger.info("Recording started.");

      this.emit('recordingStarted');
    });

    obs.on('recordingStopping', () => {
      logger.info("Recording stopping.");

      this.emit('recordingStopping');
    });

    obs.on('recordingStopped', () => {
      logger.info("Recording stopped.");

      this.emit('recordingStopped');
    });

    obs.on('streamStatus', (streamStatusEvent) => {
      logger.trace("Received stream status event.");

      this.setState({ streamStatus: streamStatusEvent });

      this.emit('streamStatus', streamStatusEvent);
    });

    obs.on('exit', () => {
      logger.warn("OBS exiting.");

      this.emit('exit');
    })

    this._connect();
  }

  _connect() {
    const config = this.config;
    const logger = this.logger;

    const obs = this._obsSocket;

    logger.info(`Connecting to ${config.url}${config.password ? ' with password.' : '.'}`);
    this._obsSocket.connect(config.url, config.password)
  }

  _pollScenesAndTransitions() {
    this._obsSocket.getTransitionList((err, response) => {
      this.logger.debug(`Current transition: ${JSON.stringify(response.currentTransition)}`);
      this.logger.debug(`All transitions: ${JSON.stringify(response.transitions)}`);


    });

    this._obsSocket.getSceneList((err, response) => {
      this.setState({
        currentSceneName: response.currentScene,
        scenes: response.scenes.map((obsScenes) => obsScenes.name);
      });
    });
  }
}
