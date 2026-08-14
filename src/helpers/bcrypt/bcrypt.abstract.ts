export abstract class BcryptAbstract {
  abstract createHash(value: string): Promise<string>;
  abstract compareHash(value: string, hash: string): Promise<boolean>;
}
