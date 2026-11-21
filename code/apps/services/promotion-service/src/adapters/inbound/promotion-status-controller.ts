import { Controller, Get, Headers, Param, Req, Res, UseGuards } from '@nestjs/common';
import { PromotionAuthContextGuard, type PromotionRequestWithAuth } from './auth-context.guard';
import { ReadPromotionStatus, PromotionStatusReadError, type PromotionStatusReadPort } from '../../application/read-promotion-status';

@Controller('v1/promotions')
@UseGuards(PromotionAuthContextGuard)
export class PromotionStatusController {
  public constructor(private readonly readPromotionStatus: ReadPromotionStatus) {}

  @Get(':promotion_id')
  public async read(
    @Param('promotion_id') promotionId: string,
    @Headers() headers: Readonly<Record<string, unknown>>,
    @Req() request: PromotionRequestWithAuth,
    @Res({ passthrough: true }) response: { setHeader(name: string, value: string): void },
  ) {
    try {
      const result = await this.readPromotionStatus.execute({ ...request, promotionId, headers } as PromotionRequestWithAuth & { readonly promotionId: string });
      response.setHeader('ETag', result.etag);
      return result.body;
    } catch (error) {
      if (error instanceof PromotionStatusReadError) {
        const status = error.code === 'NOT_FOUND' ? 404 : error.code === 'UNAUTHORIZED' ? 403 : error.code === 'REQUEST_INVALID' ? 400 : error.code === 'DEPENDENCY_UNAVAILABLE' ? 503 : 500;
        throw Object.assign(new Error(error.message), { status, code: error.code });
      }
      throw error;
    }
  }
}

export function createPromotionStatusController(readPort: PromotionStatusReadPort): PromotionStatusController {
  return new PromotionStatusController(new ReadPromotionStatus(readPort));
}

export { PromotionStatusController as GetPromotionStatusController };
