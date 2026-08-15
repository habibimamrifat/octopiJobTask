import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { validationPipe } from './pipes/validation.pipe';
import { setupSwagger } from './swagger/swagger';
import { GlobalExceptionFilter } from './filter/exception.filter';
import { seedPlatformAdmin } from '../prisma/seed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
  app.enableCors({
    origin: process.env.FRONTEND_URL,
  });

  console.log(
    `Server is running on port ${process.env.PORT ?? 3000}, node_env: ${process.env.NODE_ENV}`,
  );

  console.log('PORT:', process.env.PORT);
  console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
  console.log('STRIPE_SECRET_KEY:', !!process.env.STRIPE_SECRET_KEY);

  app.useGlobalPipes(validationPipe);
  app.useGlobalFilters(new GlobalExceptionFilter());
  setupSwagger(app);

  // seeding
  await seedPlatformAdmin();

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
