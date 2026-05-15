import { EventEmitter } from 'events';

class DefectEventManager extends EventEmitter {}
export const defectEvents = new DefectEventManager();
