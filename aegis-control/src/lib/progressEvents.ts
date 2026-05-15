import { EventEmitter } from 'events';

class ProgressEventManager extends EventEmitter {}
export const progressEvents = new ProgressEventManager();
