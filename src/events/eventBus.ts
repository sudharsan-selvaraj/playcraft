import { EventEmitter } from "events";
import type TypedEmitter from "typed-emitter";
import type { SessionEventTypes } from "./eventTypes";

class EventBus extends (EventEmitter as new () => TypedEmitter<SessionEventTypes>) {}

export const eventBus = new EventBus();
