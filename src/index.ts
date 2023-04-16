import { DynamicModule, Global, Provider } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';
import { Kafka } from 'kafkajs';
import {
  KAFKA_CLIENT_ID,
  KafkaModuleOptions,
} from './interfaces/options.interface';
import { MessageService } from './message.service';
import { ConsumerLoader } from './consumer.loader';
export {
  KAFKA_CLIENT_ID,
  KafkaModuleOptions,
} from './interfaces/options.interface';
export * from './interfaces/message.interface';
export { MessageService } from './message.service';
export { Subscribe } from './decorators/kafka.decorator';

@Global()
export default class KafkaModule {
  static forRoot(options: KafkaModuleOptions): DynamicModule {
    const clientIdProvider: Provider = {
      provide: KAFKA_CLIENT_ID,
      useValue: options.clientId,
    };

    const { ...kafkaOptions } = options;
    const kafkaProvider: Provider = {
      provide: Kafka,
      useValue: new Kafka(kafkaOptions),
    };
    return {
      imports: [DiscoveryModule],
      module: KafkaModule,
      providers: [
        clientIdProvider,
        kafkaProvider,
        MessageService,
        ConsumerLoader,
      ],
      exports: [clientIdProvider, kafkaProvider, MessageService],
    };
  }
}
