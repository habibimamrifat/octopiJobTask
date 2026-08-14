import { Module } from '@nestjs/common';
import { BcryptAbstract } from './bcrypt.abstract';
import { BcryptHelper } from './bcrypt.helper';

@Module({
  providers: [
    {
      provide: BcryptAbstract,
      useClass: BcryptHelper,
    },
  ],
  exports: [BcryptAbstract],
})
export class HelpersModule {}
