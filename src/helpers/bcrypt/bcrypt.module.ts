import { Global, Module } from '@nestjs/common';
import { BcryptAbstract } from './bcrypt.abstract';
import { BcryptHelper } from './bcrypt.helper';

@Global()
@Module({
  providers: [
    {
      provide: BcryptAbstract,
      useClass: BcryptHelper,
    },
  ],
  exports: [BcryptAbstract],
})
export class BcryptModule {}
