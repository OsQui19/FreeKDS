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
    if (!NAMESPACES.includes(namespace)) {
      return { value: defaultValue, variant: 'default' };
    }

    let value = this.data.global?.[namespace]?.[key];
    let variant = 'global';

    const tenant = context?.tenant;
    if (tenant && this.data.tenant?.[tenant]?.[namespace]?.[key] !== undefined) {
      value = this.data.tenant[tenant][namespace][key];
      variant = 'tenant';
    }

    const station = context?.station;
    if (station && this.data.station?.[station]?.[namespace]?.[key] !== undefined) {
      value = this.data.station[station][namespace][key];
      variant = 'station';
    }

    const screen = context?.screen;
    if (screen && this.data.screen?.[screen]?.[namespace]?.[key] !== undefined) {
      value = this.data.screen[screen][namespace][key];
      variant = 'screen';
    }

    if (value === undefined) {
      return { value: defaultValue, variant: 'default' };
    }
    return { value, variant };
  }

  resolveBooleanEvaluation(flagKey, defaultValue, context, logger) {
    const { value, variant } = this.resolveEvaluation(
      flagKey,
      defaultValue,
      context
    );
    return Promise.resolve({ value, variant });
  }

  resolveStringEvaluation(flagKey, defaultValue, context, logger) {
    const { value, variant } = this.resolveEvaluation(
      flagKey,
      defaultValue,
      context
    );
    return Promise.resolve({ value, variant });
  }

  resolveNumberEvaluation(flagKey, defaultValue, context, logger) {
    const { value, variant } = this.resolveEvaluation(
      flagKey,
      defaultValue,
      context
    );
    return Promise.resolve({ value, variant });
  }

  resolveObjectEvaluation(flagKey, defaultValue, context, logger) {
    const { value, variant } = this.resolveEvaluation(
      flagKey,
      defaultValue,
      context
    );
    return Promise.resolve({ value, variant });
  }
}

OpenFeature.setProvider(new JsonFileProvider(flags));

export const featureFlagClient = OpenFeature.getClient();
