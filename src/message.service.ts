import { Injectable } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
import { Message } from './interfaces/message.interface';

@Injectable()
export class MessageService {
  private producer: Producer;

  constructor(private readonly kafka: Kafka) {}

  async getProducer() {
    if (!this.producer) {
      this.producer = await this.kafka.producer({
        allowAutoTopicCreation: false, // TODO config
        transactionTimeout: 30000, // TODO config
      });
      await this.producer.connect();
    }
    return this.producer;
  }

  async send(message: Message) {
    await (
      await this.getProducer()
    ).send({
      topic: message.topic,
      messages: [
        {
          value: JSON.stringify(message.message),
        },
      ],
    });
  }

  async sendSilent(message: Message) {
    return this.send(message).catch((e) => {
      console.error('can not send message', e);
    });
  }
}
