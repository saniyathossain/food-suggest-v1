// App-facing names for the API's shapes. Every type here is GENERATED from the Rust enums and DTOs
// (codes/backend/src/app/{enums,dtos}) by ts-rs into src/generated — run `make types` after changing a DTO.
// Only client-only types (theme, saved profile) are written by hand.
export type { AgeGroup } from '../generated/AgeGroup';
export type { Gender } from '../generated/Gender';
export type { Locale as Lang } from '../generated/Locale';
export type { MediaStatus } from '../generated/MediaStatus';
export type { TimingKind } from '../generated/TimingKind';
export type { Verdict } from '../generated/Verdict';
export type { CookingFat } from '../generated/CookingFat';
export type { GlycemicBand } from '../generated/GlycemicBand';
export type { GlycemicDto as Glycemic } from '../generated/GlycemicDto';
export type { DietModeKind } from '../generated/DietModeKind';
export type { RecipeCardDto as RecipeCard } from '../generated/RecipeCardDto';
export type { RecipeDto as Recipe } from '../generated/RecipeDto';
export type { RecipeKind } from '../generated/RecipeKind';
export type { PostCardDto as PostCard } from '../generated/PostCardDto';
export type { PostDto as Post } from '../generated/PostDto';
export type { SubcategoryDto as Subcategory } from '../generated/SubcategoryDto';
export type { ContentAdminDto as ContentAdmin } from '../generated/ContentAdminDto';
export type { DietModeBriefDto as DietModeBrief } from '../generated/DietModeBriefDto';
export type { DietModeDto as DietMode } from '../generated/DietModeDto';
export type { DietModeAdminDto as DietModeAdmin } from '../generated/DietModeAdminDto';
export type { ModeStance } from '../generated/ModeStance';
export type { ModeTipKind } from '../generated/ModeTipKind';
export type { CookingMethod } from '../generated/CookingMethod';

export type { BootstrapDto as Bootstrap } from '../generated/BootstrapDto';
export type { ConditionDetailDto as ConditionDetail } from '../generated/ConditionDetailDto';
export type { ConditionSummaryDto as ConditionSummary } from '../generated/ConditionSummaryDto';
export type { ConditionTagDto as ConditionTag } from '../generated/ConditionTagDto';
export type { FoodItemDto as FoodItem } from '../generated/FoodItemDto';
export type { FoodSearchDto as FoodSearch } from '../generated/FoodSearchDto';
export type { MacrosDto as Macros } from '../generated/MacrosDto';
export type { FoodPhotoDto as FoodPhoto } from '../generated/FoodPhotoDto';
export type { HabitDto as Habit } from '../generated/HabitDto';
export type { MediaDto as MediaItem } from '../generated/MediaDto';
export type { PlanDto as Plan } from '../generated/PlanDto';
export type { PlanFoodDto as PlanFood } from '../generated/PlanFoodDto';
export type { PlanRequest as Profile } from '../generated/PlanRequest';
export type { SourceDto as Source } from '../generated/SourceDto';
export type { TimingDto as Timing } from '../generated/TimingDto';
export type { FoodDetailDto as FoodDetail } from '../generated/FoodDetailDto';
export type { FoodVariantDto as FoodVariant } from '../generated/FoodVariantDto';
export type { VariantVerdictDto as VariantVerdict } from '../generated/VariantVerdictDto';
export type { NutrientsDto as Nutrients } from '../generated/NutrientsDto';
export type { FoodOrigin } from '../generated/FoodOrigin';
export type { LocalizedText } from '../generated/LocalizedText';
export type { RuleUpsertDto as RuleUpsert } from '../generated/RuleUpsertDto';
export type { FoodCreateDto as FoodCreate } from '../generated/FoodCreateDto';
export type { ConditionPatchDto as ConditionPatch } from '../generated/ConditionPatchDto';

/** Client-only: the theme preference (never sent to the API). */
export type ThemeMode = 'auto' | 'light' | 'dark';

// accounts, profiles, medicines (codes/backend/src/app/dtos/account.rs)
export type { MeDto as Me } from '../generated/MeDto';
export type { TierDto as Tier } from '../generated/TierDto';
export type { FeatureKey } from '../generated/FeatureKey';
export type { Role } from '../generated/Role';
export type { PersonDto as Person } from '../generated/PersonDto';
export type { ProfileInputDto as PersonInput } from '../generated/ProfileInputDto';
export type { ProfileMedicineDto as PersonMedicine } from '../generated/ProfileMedicineDto';
export type { LabDto as Lab } from '../generated/LabDto';
export type { LabKind } from '../generated/LabKind';
export type { FoodTiming } from '../generated/FoodTiming';
export type { Kinship } from '../generated/Kinship';
export type { Pregnancy } from '../generated/Pregnancy';
export type { MedicineHitDto as MedicineHit } from '../generated/MedicineHitDto';
export type { MedicationReportDto as MedicationReport } from '../generated/MedicationReportDto';
export type { PersonalPlanDto as PersonalPlan } from '../generated/PersonalPlanDto';
export type { MealOptionsDto as MealOptions } from '../generated/MealOptionsDto';
export type { UserAdminDto as UserAdmin } from '../generated/UserAdminDto';
export type { GenericAdminDto as GenericAdmin } from '../generated/GenericAdminDto';
export type { MedicineAdminDto as MedicineAdmin } from '../generated/MedicineAdminDto';
export type { LabelSyncDto as LabelSync } from '../generated/LabelSyncDto';
export type { ImportResultDto as ImportResult } from '../generated/ImportResultDto';
export type { PageDto as Page } from '../generated/PageDto';

// payments (codes/backend/src/app/dtos/billing.rs)
export type { GatewayDto as Gateway } from '../generated/GatewayDto';
export type { CheckoutDto as Checkout } from '../generated/CheckoutDto';
export type { PaymentDto as Payment } from '../generated/PaymentDto';
export type { PaymentStatus } from '../generated/PaymentStatus';
export type { PaymentDriver } from '../generated/PaymentDriver';
export type { GatewayAdminDto as GatewayAdmin } from '../generated/GatewayAdminDto';
export type { GatewayInputDto as GatewayInput } from '../generated/GatewayInputDto';
export type { GatewaySetupDto as GatewaySetup } from '../generated/GatewaySetupDto';
export type { GatewayCheckDto as GatewayCheck } from '../generated/GatewayCheckDto';
export type { PaymentAdminDto as PaymentAdmin } from '../generated/PaymentAdminDto';

// external sync (codes/backend/src/app/dtos/sync.rs)
export type { SyncKind } from '../generated/SyncKind';
export type { SyncMethod } from '../generated/SyncMethod';
export type { SyncMode } from '../generated/SyncMode';
export type { SyncPlatformDto as SyncPlatform } from '../generated/SyncPlatformDto';
export type { SyncStatus } from '../generated/SyncStatus';
export type { SyncHeaderDto as SyncHeader } from '../generated/SyncHeaderDto';
export type { SyncHeaderInputDto as SyncHeaderInput } from '../generated/SyncHeaderInputDto';
export type { SyncSourceDto as SyncSource } from '../generated/SyncSourceDto';
export type { SyncSourceInputDto as SyncSourceInput } from '../generated/SyncSourceInputDto';
export type { SyncSetupDto as SyncSetup } from '../generated/SyncSetupDto';
export type { SyncTestDto as SyncTest } from '../generated/SyncTestDto';
export type { SyncRunDto as SyncRun } from '../generated/SyncRunDto';

// meal log, reports, sharing (codes/backend/src/app/dtos/{meal,share}.rs)
export type { MealTime } from '../generated/MealTime';
export type { MeterKey } from '../generated/MeterKey';
export type { MeterKind } from '../generated/MeterKind';
export type { MeterDto as Meter } from '../generated/MeterDto';
export type { MealInputDto as MealInput } from '../generated/MealInputDto';
export type { MealEntryDto as MealEntry } from '../generated/MealEntryDto';
export type { MealTotalDto as MealTotal } from '../generated/MealTotalDto';
export type { DayLogDto as DayLog } from '../generated/DayLogDto';
export type { DaySummaryDto as DaySummary } from '../generated/DaySummaryDto';
export type { MealRangeDto as MealRange } from '../generated/MealRangeDto';
export type { WeeklyReportDto as WeeklyReport } from '../generated/WeeklyReportDto';
export type { WeekFoodDto as WeekFood } from '../generated/WeekFoodDto';
export type { OverDaysDto as OverDays } from '../generated/OverDaysDto';
export type { ShareDto as Share } from '../generated/ShareDto';
export type { SharedProfileDto as SharedProfile } from '../generated/SharedProfileDto';
export type { ExportDto as DataExport } from '../generated/ExportDto';
export type { Activity } from '../generated/Activity';
export type { Allergen } from '../generated/Allergen';
export type { Budget } from '../generated/Budget';
export type { Criterion } from '../generated/Criterion';
export type { Band } from '../generated/Band';
export type { InsightDto as Insight } from '../generated/InsightDto';
export type { WhyDto as Why } from '../generated/WhyDto';
export type { WhyBasis } from '../generated/WhyBasis';
export type { CoverageDto as Coverage } from '../generated/CoverageDto';
export type { CoverageRowDto as CoverageRow } from '../generated/CoverageRowDto';
export type { AuditRowDto as AuditRow } from '../generated/AuditRowDto';
export type { RuleBulkDto as RuleBulk } from '../generated/RuleBulkDto';
export type { RuleBulkResultDto as RuleBulkResult } from '../generated/RuleBulkResultDto';
export type { RuleImportResultDto as RuleImportResult } from '../generated/RuleImportResultDto';
export type { ImportIssueDto as ImportIssue } from '../generated/ImportIssueDto';
export type { CalendarItemDto as CalendarItem } from '../generated/CalendarItemDto';
export type { CalendarState } from '../generated/CalendarState';
export type { TierPreviewDto as TierPreview } from '../generated/TierPreviewDto';
export type { MediaUsageDto as MediaUsage } from '../generated/MediaUsageDto';
export type { TrafficDto as Traffic } from '../generated/TrafficDto';
export type { PlanMixDto as PlanMix } from '../generated/PlanMixDto';
export type { ReviewDto as Review } from '../generated/ReviewDto';
export type { SearchIndexDto as SearchIndex } from '../generated/SearchIndexDto';

// the medicine library (codes/backend/src/app/dtos/library.rs)
export type { MedicineGroupDto as MedicineGroup } from '../generated/MedicineGroupDto';
export type { MedicineCardDto as MedicineCard } from '../generated/MedicineCardDto';
export type { MedicineWhenDto as MedicineWhen } from '../generated/MedicineWhenDto';
export type { MedicinePageDto as MedicinePage } from '../generated/MedicinePageDto';
export type { SectionCountsDto } from '../generated/SectionCountsDto';
export type { FoodPatchDto as FoodPatch } from '../generated/FoodPatchDto';
export type { OptionDto } from '../generated/OptionDto';
export type { OptionsPageDto } from '../generated/OptionsPageDto';
export type { BrandDto as Brand } from '../generated/BrandDto';
export type { MedicineDetailDto as MedicineDetail } from '../generated/MedicineDetailDto';
