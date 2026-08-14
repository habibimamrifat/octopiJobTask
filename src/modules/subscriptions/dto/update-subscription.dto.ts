import { PartialType } from '@nestjs/swagger';
import { CreateSubscriptionDto } from './create-subcription.dto';


export class UpdateSubscriptionDto extends PartialType(CreateSubscriptionDto) {}
