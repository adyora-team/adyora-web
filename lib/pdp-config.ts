export interface ProductPdpConfig {
  showNewBadge: boolean;
  showSizeGuide: boolean;
  showPromoBanner: boolean;
  promoTitle: string;
  promoText: string;
  promoBadge: string;
  showTrustBadges: boolean;
  showCodBadge: boolean;
  showFreeShippingBadge: boolean;
  showEasyReturnsBadge: boolean;
  showPaymentComparison: boolean;
  onlineSavingsAmount: number;
  codFeeMin: number;
  codFeeMax: number;
  showPincodeChecker: boolean;
  showFabricAccordion: boolean;
  fabricSpecsText: string;
  showShippingAccordion: boolean;
  shippingSpecsText: string;
}

export const DEFAULT_PDP_CONFIG: ProductPdpConfig = {
  showNewBadge: true,
  showSizeGuide: false,
  showPromoBanner: false,
  promoTitle: 'BUY MORE. SAVE MORE.',
  promoText:
    'Extra prepaid discount and bundle offers active on selected orders.',
  promoBadge: '10% OFF',
  showTrustBadges: true,
  showCodBadge: true,
  showFreeShippingBadge: true,
  showEasyReturnsBadge: true,
  showPaymentComparison: false,
  onlineSavingsAmount: 70,
  codFeeMin: 60,
  codFeeMax: 70,
  showPincodeChecker: true,
  showFabricAccordion: true,
  fabricSpecsText: `• Silhouette: Contemporary relaxed boxy streetwear fit.\n• Fabrication: Heavyweight combed cotton blend crafted for all-day breathability.\n• Wash Care: Cold machine wash inside out; do not iron directly on print.`,
  showShippingAccordion: true,
  shippingSpecsText: `• Fast Dispatch: Dispatched within 24–48 hours with real-time WhatsApp & email tracking.\n• Easy 7-Day Exchanges: Hassle-free doorstep pickup for size exchanges or returns.`,
};

const CONFIG_MARKER_REGEX = /<!--ADYORA_PDP_CONFIG:([\s\S]*?)-->\s*$/;

/**
 * Extracts the clean product description and the per-product PDP display configuration.
 */
export function extractPdpConfig(rawDescription: string | undefined | null): {
  cleanDescription: string;
  pdpConfig: ProductPdpConfig;
} {
  if (!rawDescription) {
    return {
      cleanDescription: '',
      pdpConfig: { ...DEFAULT_PDP_CONFIG },
    };
  }

  const match = rawDescription.match(CONFIG_MARKER_REGEX);
  if (!match) {
    return {
      cleanDescription: rawDescription.trim(),
      pdpConfig: { ...DEFAULT_PDP_CONFIG },
    };
  }

  const cleanDescription = rawDescription
    .replace(CONFIG_MARKER_REGEX, '')
    .trim();

  try {
    const parsed = JSON.parse(match[1]) as Partial<ProductPdpConfig>;
    return {
      cleanDescription,
      pdpConfig: {
        ...DEFAULT_PDP_CONFIG,
        ...parsed,
      },
    };
  } catch {
    return {
      cleanDescription,
      pdpConfig: { ...DEFAULT_PDP_CONFIG },
    };
  }
}

/**
 * Combines the clean product description and the per-product PDP display configuration
 * so it persists in the database `description` column without requiring schema migrations.
 */
export function serializeDescriptionWithPdpConfig(
  cleanDescription: string,
  pdpConfig: ProductPdpConfig
): string {
  const stripped = (cleanDescription || '')
    .replace(CONFIG_MARKER_REGEX, '')
    .trim();
  return `${stripped}\n\n<!--ADYORA_PDP_CONFIG:${JSON.stringify(pdpConfig)}-->`;
}

