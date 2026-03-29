import { createServiceClient } from '@/src/lib/supabase';
import { sendExpoPushIfAllowed } from '@/src/lib/notification-push-preferences';

/**
 * Notify creator on mobile when their paid content is purchased (Stripe / purchase flow).
 * Uses service role so creator token and preferences are readable.
 */
export async function notifyCreatorContentPurchasePush(params: {
  creatorId: string;
  buyerId: string;
  contentId: string;
  contentType: string;
  title: string;
  amount: number;
  currency: string;
}): Promise<void> {
  const { creatorId, buyerId, contentId, contentType, title, amount, currency } = params;
  if (creatorId === buyerId) return;

  const service = createServiceClient();
  const { data: buyer } = await service
    .from('profiles')
    .select('username, display_name')
    .eq('id', buyerId)
    .maybeSingle();

  const buyerName = buyer?.display_name || buyer?.username || 'Someone';
  const amountStr = `${currency} ${amount.toFixed(2)}`;

  try {
    await sendExpoPushIfAllowed(service, creatorId, 'content_sales', {
      title: 'Someone purchased your content',
      body: `${buyerName} bought "${title}" for ${amountStr}`,
      data: {
        type: 'content_purchase',
        entityId: contentId,
        entityType: contentType,
        creatorId: buyerId,
        username: buyer?.username ?? '',
        contentId,
        contentType,
        amount: amountStr,
      },
      channelId: 'tips',
      priority: 'high',
    });
  } catch (err) {
    console.error('content purchase push:', err);
  }
}
