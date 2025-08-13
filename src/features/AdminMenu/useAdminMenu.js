import { useEffect } from 'react';
import initAdminMenu from './adminMenuLogic.js';

export default function useAdminMenu({ ingredients = [], units = [] }) {
  useEffect(() => {
    initAdminMenu({ ingredients, units });
  }, [ingredients, units]);
}
