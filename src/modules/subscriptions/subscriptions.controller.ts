import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { SubscriptionsService } from './subscriptions.service';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RouteFor } from '../../decorators/route-for.decorator';
import { CreateSubscriptionDto } from './dto/create-subcription.dto';

@ApiTags('Subscription Plans')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @RouteFor(['PLATFORM_ADMIN'])
  @Post()
  @ApiOperation({
    summary: 'Create a subscription plan',
  })
  create(@Body() createSubscriptionDto: CreateSubscriptionDto) {
    return this.subscriptionsService.create(createSubscriptionDto);
  }

  @RouteFor(['PLATFORM_ADMIN'])
  @Get()
  @ApiOperation({
    summary: 'Get all subscription plans',
  })
  findAll() {
    return this.subscriptionsService.findAll();
  }

  @RouteFor(['PLATFORM_ADMIN'])
  @Get(':id')
  @ApiOperation({
    summary: 'Get a subscription plan',
  })
  findOne(@Param('id') id: string) {
    return this.subscriptionsService.findOne(id);
  }

  @RouteFor(['PLATFORM_ADMIN'])
  @Patch(':id')
  @ApiOperation({
    summary: 'Update a subscription plan',
  })
  update(
    @Param('id') id: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionsService.update(id, updateSubscriptionDto);
  }

  @RouteFor(['PLATFORM_ADMIN'])
  @Delete(':id')
  @ApiOperation({
    summary: 'Disable a subscription plan',
  })
  remove(@Param('id') id: string) {
    return this.subscriptionsService.remove(id);
  }
}
