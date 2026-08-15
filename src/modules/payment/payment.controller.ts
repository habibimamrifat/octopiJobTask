import {
  BadRequestException,
  Controller,
  Headers,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';

import { PaymentService } from './payment.service';
import { RouteFor } from '../../decorators/route-for.decorator';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('checkout/:registrationId')
  @RouteFor(['all'])
  createCheckout(@Param('registrationId') registrationId: string) {
    console.log('registration is here ==>>', registrationId);
    return this.paymentService.createCheckout(registrationId);
  }

  @Post('webhook')
  handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!req.rawBody) {
      throw new BadRequestException('Raw request body is required');
    }

    return this.paymentService.handleWebhook(req.rawBody, signature);
  }
}
