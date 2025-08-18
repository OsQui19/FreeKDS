import { OpenFeature, Provider } from '@openfeature/js-sdk';
import flags from '../../config/flags.json';

const NAMESPACES = ['ui', 'transport', 'perf'];

class JsonFileProvider extends Provider {
  constructor(data) {
    super();
    this.data = data;
  }

  get metadata() {
    return { name: 'json-file-provider' };
  }

  resolveEvaluation(flagKey, defaultValue, context) {
    const [namespace, key] = flagKey.split('.');
    if (!NAMESPACES.includes(namespace)) return defaultValue;
    let value = this.data.global?.[namespace]?.[key];
    const tenant = context?.tenant;
    if (tenant && this.data.tenant?.[tenant]?.[namespace]?.[key] !== undefined) {
      value = this.data.tenant[tenant][namespace][key];
    }
    const station = context?.station;
    if (station && this.data.station?.[station]?.[namespace]?.[key] !== undefined) {
      value = this.data.station[station][namespace][key];
    }
    const screen = context?.screen;
    if (screen && this.data.screen?.[screen]?.[namespace]?.[key] !== undefined) {
      value = this.data.screen[screen][namespace][key];
    }
    return value !== undefined ? value : defaultValue;
  }

  resolveBooleanEvaluation(flagKey, defaultValue, context, logger) {
    return Promise.resolve({
      value: this.resolveEvaluation(flagKey, defaultValue, context),
    });
  }

  resolveStringEvaluation(flagKey, defaultValue, context, logger) {
    return Promise.resolve({
      value: this.resolveEvaluation(flagKey, defaultValue, context),
    });
  }

  resolveNumberEvaluation(flagKey, defaultValue, context, logger) {
    return Promise.resolve({
      value: this.resolveEvaluation(flagKey, defaultValue, context),
    });
  }

  resolveObjectEvaluation(flagKey, defaultValue, context, logger) {
    return Promise.resolve({
      value: this.resolveEvaluation(flagKey, defaultValue, context),
    });
  }
}

OpenFeature.setProvider(new JsonFileProvider(flags));

export const featureFlagClient = OpenFeature.getClient();
