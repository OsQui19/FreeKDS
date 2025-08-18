import { useEffect, useState } from 'react';
import { featureFlagClient } from '../featureFlags';

export default function useFeatureFlag(key, defaultValue, context = {}) {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    let result;
    switch (typeof defaultValue) {
      case 'string':
        result = featureFlagClient.getStringValue(key, defaultValue, context);
        break;
      case 'number':
        result = featureFlagClient.getNumberValue(key, defaultValue, context);
        break;
      case 'boolean':
        result = featureFlagClient.getBooleanValue(key, defaultValue, context);
        break;
      default:
        result = featureFlagClient.getObjectValue(key, defaultValue, context);
    }
    setValue(result);
  }, [key, defaultValue, context]);

  return value;
}
