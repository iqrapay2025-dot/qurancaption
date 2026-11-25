export interface PlannerFeatureFlags {
  canCreateMultiplePlans: boolean;
  canExportDetailedHistory: boolean;
  canUseAdvancedScheduling: boolean;
  canSyncCloudBackup: boolean;
  canShareWithTeacher: boolean;
}

export function getPlannerFeatureFlags(isPro: boolean = false): PlannerFeatureFlags {
  return {
    canCreateMultiplePlans: isPro,
    canExportDetailedHistory: isPro,
    canUseAdvancedScheduling: isPro,
    canSyncCloudBackup: isPro,
    canShareWithTeacher: isPro,
  };
}
