import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { validationPipe } from './pipes/validation.pipe';
import { setupSwagger } from './swagger/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
 
  console.log(
    `Server is running on port ${process.env.PORT ?? 3000}, node_env: ${process.env.NODE_ENV}`,
  );


  app.useGlobalPipes(validationPipe);
  setupSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
