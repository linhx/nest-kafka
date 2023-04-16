import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
  Type,
} from '@nestjs/common';
import { Injector } from '@nestjs/core/injector/injector';
import { Consumer, Kafka } from 'kafkajs';
import { KAFKA_CLIENT_ID, Topic } from './interfaces/options.interface';
import {
  ContextIdFactory,
  DiscoveryService,
  MetadataScanner,
  Reflector,
} from '@nestjs/core';
import { MSG_BODY_METADATA_KEY, SUBSCRIBER_METADATA_KEY } from './constants';
import { InstanceWrapper } from '@nestjs/core/injector/instance-wrapper';
import { Module } from '@nestjs/core/injector/module';

type Handler = {
  instance: any;
  methodName: string;
  msgBodyIndex: number;
  isRequestScoped: boolean;
  moduleRef: Module;
};

@Injectable()
export class ConsumerLoader implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(ConsumerLoader.name);
  private readonly injector = new Injector();
  private consumers: Array<Consumer>;

  constructor(
    private readonly kafka: Kafka,
    @Inject(KAFKA_CLIENT_ID) private readonly clientId: string,
    private readonly discoveryService: DiscoveryService,
    private readonly metadataScanner: MetadataScanner,
    private readonly reflector: Reflector
  ) {}

  getEventHandlerMetadata(target: Type<unknown>): Set<Topic> | undefined {
    return this.reflector.get(SUBSCRIBER_METADATA_KEY, target);
  }

  async onModuleInit() {
    const providers = this.discoveryService.getProviders();
    const controllers = this.discoveryService.getControllers();
    const handlersMap = new Map<Topic, Array<Handler>>();
    [...providers, ...controllers]
      .filter((wrapper) => wrapper.instance && !wrapper.isAlias)
      .forEach((wrapper: InstanceWrapper) => {
        const { instance } = wrapper;
        const prototype = Object.getPrototypeOf(instance) || {};
        const isRequestScoped = !wrapper.isDependencyTreeStatic();
        const methodNames = this.metadataScanner.getAllMethodNames(prototype);
        for (const methodName of methodNames) {
          const topics = this.getEventHandlerMetadata(instance[methodName]);
          if (topics) {
            const msgBodyIndex: number = Reflect.getOwnMetadata(
              MSG_BODY_METADATA_KEY,
              prototype,
              methodName
            );
            for (const topic of topics) {
              let handlers = handlersMap.get(topic);
              if (!handlers) {
                handlers = [];
                handlersMap.set(topic, handlers);
              }
              handlers.push({
                instance,
                methodName,
                msgBodyIndex,
                isRequestScoped,
                moduleRef: wrapper.host as Module,
              });
            }
          }
        }
      });
    const consumersProm = [];
    for (const [topic, handlers] of handlersMap) {
      consumersProm.push(this.consume(topic, handlers));
    }
    this.consumers = await Promise.all(consumersProm);
  }

  private async consume(topic: Topic, handlers: Array<Handler>) {
    const consumer = this.kafka.consumer({ groupId: this.clientId });
    await consumer.connect();
    await consumer.subscribe({ topics: [topic] });
    await consumer.run({
      eachMessage: async ({ message, heartbeat, pause }) => {
        handlers.forEach(async (handler) => {
          try {
            let instance;
            if (handler.isRequestScoped) {
              const contextId = ContextIdFactory.create();
              instance = await this.injector.loadPerContext(
                handler.instance,
                handler.moduleRef,
                handler.moduleRef.providers,
                contextId
              );
            } else {
              instance = handler.instance;
            }
            const args = [];
            if (handler.msgBodyIndex != null) {
              args[handler.msgBodyIndex] = JSON.parse(message.value.toString());
            }
            await instance[handler.methodName](args);
          } catch (e) {
            this.logger.error('handle kafka', e);
          }
        });
      },
    });
    return consumer;
  }

  async onApplicationShutdown(signal?: string) {
    await Promise.all(this.consumers.map((consumer) => consumer.disconnect()));
  }
}
