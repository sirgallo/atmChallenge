import { EventEmitter } from 'events';
import { randomBytes } from 'crypto';

import { LogProvider } from '@core/providers/LogProvider';
import { LinkedNode, HashString } from '@core/models/infrastructure/Mq';
import { LinkedNodeData, SimpleQueue, SimpleQueueMethods } from '@core/models/queue/SimpleQueue';


const NAME = 'Simple Queue Provider';
const HASHLENGTH = 48;
const HASHENCODING = 'hex';

export class SimpleQueueProvider implements SimpleQueueMethods {
  eventName: string;
  queueUpdate = new EventEmitter();
  length: number = 0;

  private elements: SimpleQueue = {};
  private headNode: LinkedNode;
  private tailNode: LinkedNode;

  private queueLog: LogProvider = new LogProvider(NAME);
  constructor(eventName: string) { this.eventName = eventName; }

  printQueue() {
    this.queueLog.debug(JSON.stringify(this.elements, null, 2));
  }

  enqueue(insertValue: any) {
    try {
      const timestamp = new Date();

      const hashRef: HashString = `${randomBytes(HASHLENGTH)
        .toString(HASHENCODING)}-${timestamp.toISOString()}`;
      
      if (! this.headNode) {
        this.headNode = this.tailNode = {
          id: hashRef,
          next: null,
          value: insertValue,
          timestamp
        }

        this.elements[hashRef] = this.headNode;
      } else {
        const prevHash: HashString = this.tailNode.id;
        
        this.tailNode = {
          id: hashRef,
          next: null,
          value: insertValue,
          timestamp: new Date()
        }

        this.elements[hashRef] = this.tailNode;
        this.elements[prevHash].next = hashRef;
      }

      ++this.length;
      this.emitEvent();
    } catch (err) {
      this.queueLog.error('Issue pushing element on to queue');
      throw err;
    }
  }

  dequeue() {
    try {
      if (! this.headNode) return null;
      else {
        const retVal = this.elements[this.headNode.id];
        delete this.elements[this.headNode.id];
        this.headNode = this.elements[retVal.next];

        --this.length;
        return retVal.value;
      }
    } catch (err) {
      this.queueLog.error('Unable to remove first element from queue.');
      throw err;
    }
  }

  peek(): LinkedNodeData {
    try {
      return { value: this.tailNode?.value, timestamp: this.tailNode?.timestamp } || null;
    } catch (err) {
      this.queueLog.error('Unable to peek first element in queue.');
      throw err;
    }
  }

  all(): SimpleQueue {
    try {
      return this.elements || null;
    } catch(err) {
      this.queueLog.error('Unable to peek first element in queue.');
      throw err;
    }
  }

  emitEvent(...args) {
    this.queueUpdate.emit(this.eventName, ...args);
  }
}