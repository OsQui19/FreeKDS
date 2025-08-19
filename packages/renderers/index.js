<<<<<<< ours
export { default as TicketGrid } from './TicketGrid.jsx';
export { default as TicketCard } from './TicketCard.jsx';
export { default as ModifierList } from './ModifierList.jsx';
export { default as ExpoHeader } from './ExpoHeader.jsx';
export { default as BumpAction } from './BumpAction.jsx';
export { default as LayoutRenderer } from './LayoutRenderer.jsx';

=======
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

export const TicketGrid = require('./TicketGrid.jsx').default;
export const TicketCard = require('./TicketCard.jsx').default;
export const ModifierList = require('./ModifierList.jsx').default;
export const ExpoHeader = require('./ExpoHeader.jsx').default;
export const BumpAction = require('./BumpAction.jsx').default;
export const LayoutRenderer = require('./LayoutRenderer.jsx').default;
>>>>>>> theirs
