import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { BcryptAbstract } from './bcrypt.abstract';

@Injectable()
export class BcryptHelper extends BcryptAbstract {
  async createHash(value: string): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(value, salt);
  }

  async compareHash(value: string, hash: string): Promise<boolean> {
    return bcrypt.compare(value, hash);
  }
}
