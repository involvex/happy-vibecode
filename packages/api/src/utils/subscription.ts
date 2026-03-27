import type {SubscriptionStatus, UserSubscription} from '@happy-vibecode/shared'

type UserSubscriptionFields = {
	planTier: 'free' | 'pro'
	subscriptionStatus:
		| 'inactive'
		| 'trialing'
		| 'active'
		| 'past_due'
		| 'canceled'
		| 'unpaid'
	stripeCustomerId: string | null
	stripeSubscriptionId: string | null
	stripePriceId: string | null
	subscriptionCurrentPeriodEnd: Date | null
	subscriptionCancelAtPeriodEnd: boolean
	subscriptionUpdatedAt: Date | null
}

export function mapUserSubscription(
	user: UserSubscriptionFields,
): UserSubscription {
	return {
		planTier: user.planTier,
		status: user.subscriptionStatus,
		stripeCustomerId: user.stripeCustomerId,
		stripeSubscriptionId: user.stripeSubscriptionId,
		stripePriceId: user.stripePriceId,
		currentPeriodEnd: user.subscriptionCurrentPeriodEnd?.toISOString() ?? null,
		cancelAtPeriodEnd: user.subscriptionCancelAtPeriodEnd,
		updatedAt: user.subscriptionUpdatedAt?.toISOString() ?? null,
		isPro: isSubscriptionEntitled(
			user.planTier,
			user.subscriptionStatus,
			user.subscriptionCurrentPeriodEnd,
		),
	}
}

export function isSubscriptionEntitled(
	planTier: 'free' | 'pro',
	status: SubscriptionStatus,
	currentPeriodEnd: Date | null,
	now = new Date(),
) {
	if (planTier !== 'pro') return false
	if (status === 'canceled' && currentPeriodEnd && currentPeriodEnd <= now) {
		return false
	}
	return true
}
