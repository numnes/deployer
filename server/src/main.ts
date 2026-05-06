import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const corsOrigin =
    process.env.CORS_ORIGIN?.split(',')
      .map((s) => s.trim())
      .filter(Boolean) ?? [];

  app.enableCors({
    origin:
      corsOrigin.length > 0
        ? corsOrigin
        : [/^http:\/\/localhost:\d+$/, /^http:\/\/127\.0\.0\.1:\d+$/],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Deployer-Api-Key',
      'X-Requested-With',
    ],
    maxAge: 86400,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Deployer API')
    .setDescription('Documentação da API do Deployer')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'jwt',
    )
    .addApiKey(
      {
        type: 'apiKey',
        in: 'header',
        name: 'x-deployer-api-key',
        description: 'Chave usada para endpoints de deploy',
      },
      'deploy-api-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 3000, () => {
    console.log(`Listening in port ${process.env.PORT ?? 3000}`);
  });
}
bootstrap();
