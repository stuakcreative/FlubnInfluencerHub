/**
 * Influencer Verification — Admin Verified (Track A)
 * The <BadgeCheck> blue glow badge is shown when admin has marked an influencer
 * as verified via the isVerified boolean field on the influencer record.
 */

import { getInfluencers } from "./dataManager";

/**
 * Returns true if the influencer has been admin-verified (isVerified === true).
 */
export function isInfluencerVerified(influencerId: string): boolean {
  const influencers = getInfluencers();
  const inf = influencers.find((i) => i.id === influencerId);
  return inf?.isVerified === true;
}
