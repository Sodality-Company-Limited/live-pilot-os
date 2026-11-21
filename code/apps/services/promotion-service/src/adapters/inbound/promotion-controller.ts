import { Body, Controller, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { PromotionAuthContextGuard, type PromotionRequestWithAuth } from './auth-context.guard';
import { ProposePromotion, type PromotionProposalBody, type PromotionProposalRequest } from '../../application/propose-promotion';

@Controller('v1/live-sessions')
@UseGuards(PromotionAuthContextGuard)
export class PromotionController {
  public constructor(private readonly proposePromotion: ProposePromotion) {}

  @Post(':session_id/promotions')
  public propose(
    @Param('session_id') sessionId: string,
    @Headers() headers: Readonly<Record<string, unknown>>,
    @Body() body: PromotionProposalBody,
    @Req() request: PromotionRequestWithAuth,
  ) {
    const proposal: PromotionProposalRequest = { ...request, sessionId, headers, body };
    return this.proposePromotion.execute(proposal);
  }
}

export { PromotionController as ProposePromotionController };
