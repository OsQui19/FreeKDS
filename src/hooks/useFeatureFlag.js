import { useEffect, useState } from 'react';
import { featureFlagClient } from '../featureFlags';

export default function useFeatureFlag(key, defaultValue, context = {}) {
  const [state, setState] = useState({ value: defaultValue, variant: 'default' });

  useEffect(() => {
    let active = true;

    async function evaluate() {
      let result;
      switch (typeof defaultValue) {
        case 'string':
          result = await featureFlagClient.getStringDetails(
            key,
            defaultValue,
            context
          );
          break;
        case 'number':
          result = await featureFlagClient.getNumberDetails(
            key,
            defaultValue,
            context
          );
          break;
        case 'boolean':
          result = await featureFlagClient.getBooleanDetails(
            key,
            defaultValue,
            context
          );
          break;
        default:
          result = await featureFlagClient.getObjectDetails(
            key,
            defaultValue,
            context
          );
      }
      if (active) {
        setState({ value: result.value, variant: result.variant || 'default' });
      }
    }

    evaluate();
    const interval = setInterval(evaluate, 1000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [key, defaultValue, context]);

  return state;
}
