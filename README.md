# nestjs-kafka

## How to use

Config

```js
// app.module.ts
@Module({
  imports: [
    KafkaModule.forRoot({
      clientId: 'aclientid',
      brokers: ['127.0.0.1:9092'],
    }),
  ],
})
export class AppModule {}
```

Producer

```js
@Injectable()
export class FooService {
  constructor(
    private readonly messageService: MessageService,
  ) {}

  foo() {
    this.messageService.send({
      topic: 'foo',
      message: {
        property1: 'val'
      }
    });
  }
}
```

Consumer

```js
@Injectable()
export class BarService {
  constructor(
    private readonly messageService: MessageService,
  ) {}

  @Subscribe('foo')
  onFoo(@MsgBody payload) {
    // do something
  }
}
```
