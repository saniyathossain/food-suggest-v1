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
