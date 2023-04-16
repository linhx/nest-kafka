import { Topic } from '../interfaces/options.interface';
import { MSG_BODY_METADATA_KEY, SUBSCRIBER_METADATA_KEY } from '../constants';

export function Subscribe(topic: string | Array<string>) {
  const decoratorFactory = (target: object, key?: any, descriptor?: any) => {
    const topicsSet =
      Reflect.getMetadata(SUBSCRIBER_METADATA_KEY, descriptor.value) ||
      new Set<Topic>();
    if (Array.isArray(topic)) {
      topic.forEach((t) => topicsSet.add(t));
    } else {
      topicsSet.add(topic);
    }

    Reflect.defineMetadata(
      SUBSCRIBER_METADATA_KEY,
      topicsSet,
      descriptor.value
    );
    return descriptor;
  };
  decoratorFactory.KEY = SUBSCRIBER_METADATA_KEY;
  return decoratorFactory;
}

export function MsgBody(
  target: any,
  propertyKey: string,
  parameterIndex: number
) {
  const existingTrxParameterIndex: number = Reflect.getOwnMetadata(
    MSG_BODY_METADATA_KEY,
    target,
    propertyKey
  );
  if (
    existingTrxParameterIndex !== undefined &&
    existingTrxParameterIndex !== null
  ) {
    throw new Error(
      `Must declare only one @${MsgBody.name} in method ${target.constructor.name}.${propertyKey}`
    );
  }
  Reflect.defineMetadata(
    MSG_BODY_METADATA_KEY,
    parameterIndex,
    target,
    propertyKey
  );
}
