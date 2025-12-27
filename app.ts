'use strict';

import Homey from 'homey';

module.exports = class OpenRouterApp extends Homey.App {
  async onInit() {
    this.log('OpenRouter app has been initialized');
  }
};
