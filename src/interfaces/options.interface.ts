import { KafkaConfig } from 'kafkajs';

export type KafkaModuleOptions = KafkaConfig;

export const KAFKA_CLIENT_ID = Symbol('KAFKA_CLIENT_ID');

export type Topic = string | RegExp;
