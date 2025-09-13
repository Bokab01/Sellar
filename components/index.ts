// Typography
export { Text } from './Typography/Text';

// Layout
export { Container, SafeAreaWrapper, SafeAreaContainer } from './Layout';

// Form Components
export { Button } from './Button/Button';
export { Input } from './Input/Input';
export { MultiStepForm, useMultiStepForm } from './MultiStepForm/MultiStepForm';

// Marketplace Components
export { ProductCard } from './Card/Card';
export { PremiumProductCard } from './PremiumProductCard/PremiumProductCard';
export { Badge } from './Badge/Badge';
export { BusinessBadge, BusinessBadges } from './BusinessBadge/BusinessBadge';
export { SponsoredPost, SponsoredPostManager } from './SponsoredPost/SponsoredPost';
export { FeaturedListings, CompactFeaturedListings } from './FeaturedListings/FeaturedListings';
export { Avatar } from './Avatar/Avatar';
export { Chip } from './Chip/Chip';
export { PriceDisplay } from './PriceDisplay/PriceDisplay';
export { AppModal, Modal } from './Modal/Modal';
export { Toast } from './Toast/Toast';
export { Stepper } from './Stepper/Stepper';

// Moderation Components
export { ModerationErrorModal } from './ModerationErrorModal/ModerationErrorModal';
export { ReportModal } from './ReportModal/ReportModal';

// Community Components
export { ChatBubble } from './ChatBubble/ChatBubble';
export { ListItem } from './ListItem/ListItem';
export { Rating } from './Rating/Rating';
export { ReviewCard } from './ReviewCard/ReviewCard';
export { ReviewForm } from './ReviewForm/ReviewForm';
export { ReviewsList } from './ReviewsList/ReviewsList';
export { ReviewSummary, CompactReviewSummary } from './ReviewSummary/ReviewSummary';

// Transaction-Based Review System Components
export { TransactionCompletionModal } from './TransactionCompletionModal/TransactionCompletionModal';
export { TransactionCompletionButton } from './TransactionCompletionButton/TransactionCompletionButton';
export { EnhancedReviewCard, CompactEnhancedReviewCard } from './EnhancedReviewCard/EnhancedReviewCard';
export { TransactionBasedReviewForm } from './TransactionBasedReviewForm/TransactionBasedReviewForm';
export { TrustMetricsDisplay, TrustIndicator } from './TrustMetricsDisplay/TrustMetricsDisplay';
export { ReviewModerationModal, QuickReportButton } from './ReviewModerationModal/ReviewModerationModal';

// Callback Request System Components
export { SimpleCallbackRequestButton } from './SimpleCallbackRequestButton/SimpleCallbackRequestButton';
export { CallbackMessage } from './CallbackMessage/CallbackMessage';
export { MarketplaceSidebar } from './MarketplaceSidebar/MarketplaceSidebar';
export { EnhancedSearchHeader } from './EnhancedSearchHeader/EnhancedSearchHeader';

// Support System Components
export { SupportTicketCard } from './SupportTicketCard/SupportTicketCard';
export { CreateTicketModal } from './CreateTicketModal/CreateTicketModal';
export { KnowledgeBaseCard } from './KnowledgeBaseCard/KnowledgeBaseCard';

// Verification System Components
export { 
  VerificationBadge, 
  CompactVerificationBadge, 
  TrustScoreDisplay, 
  VerificationStatusIndicator 
} from './VerificationBadge/VerificationBadge';
export { DocumentUpload, MultiDocumentUpload } from './DocumentUpload/DocumentUpload';
export { 
  VerificationStatusTracker, 
  CompactVerificationStatus, 
  VerificationActivityFeed 
} from './VerificationStatusTracker/VerificationStatusTracker';

// Transaction System Components
export { 
  TransactionCard, 
  CompactTransactionCard, 
  TransactionListItem 
} from './TransactionCard/TransactionCard';
export { TransactionFilters, TransactionFiltersState } from './TransactionFilters/TransactionFilters';

// Rewards System Components
export { RewardNotification, CompactRewardNotification } from './RewardNotification/RewardNotification';
export { RewardsTracker } from './RewardsTracker/RewardsTracker';
export { RewardsProvider, useRewardsContext } from './RewardsProvider/RewardsProvider';

// Profile Management Components
export { ProfileEditModal } from './ProfileEditModal/ProfileEditModal';
export { BusinessProfileSetupModal } from './BusinessProfileSetupModal/BusinessProfileSetupModal';
export { UserDisplayName, useUserDisplayText } from './UserDisplayName/UserDisplayName';

// Business Dashboard Components
export { AnalyticsDashboard } from './AnalyticsDashboard/AnalyticsDashboard';
export { AutoBoostDashboard } from './AutoBoostDashboard/AutoBoostDashboard';
export { PrioritySupportDashboard } from './PrioritySupportDashboard/PrioritySupportDashboard';
export { PremiumFeaturesDashboard } from './PremiumFeaturesDashboard/PremiumFeaturesDashboard';
export { PostCard } from './PostCard/PostCard';
export { CommentCard } from './CommentCard/CommentCard';

// Navigation
export { AppHeader } from './AppHeader/AppHeader';

// Feedback & Status
export { LoadingSkeleton, ProductCardSkeleton, ChatListSkeleton } from './LoadingSkeleton/LoadingSkeleton';
export { EmptyState } from './EmptyState/EmptyState';
export { ErrorState } from './ErrorState/ErrorState';
export { LinearProgress, CircularProgress } from './ProgressIndicator/ProgressIndicator';
export { StepIndicator } from './StepIndicator/StepIndicator';

// Image Picker
export { CustomImagePicker } from './ImagePicker';
export type { SelectedImage } from './ImagePicker';

// Splash Screen
export { SplashScreenManager, useSplashScreen } from './SplashScreen';

// Grid Layout
export { Grid } from './Grid/Grid';

// Alert
export { Alert } from './Alert/Alert';

// Auth Error Boundary
export { AuthErrorBoundary, useAuthErrorRecovery } from './AuthErrorBoundary/AuthErrorBoundary';

// Link Button
export { LinkButton } from './LinkButton/LinkButton';

// Search & Filters
export { SearchBar } from './SearchBar/SearchBar';
export { FilterSheet } from './FilterSheet/FilterSheet';
export { SmartSearchBar } from './SmartSearchBar/SmartSearchBar';
export { SmartSearchFilters } from './SearchFilters/SearchFilters';
export { SearchResults } from './SearchResults/SearchResults';
export { QuickSearch } from './QuickSearch/QuickSearch';

// Categories & Location
export { CategoryCard } from './CategoryCard/CategoryCard';
export { CategoryPicker } from './CategoryPicker/CategoryPicker';
export { CategoryAttributes } from './CategoryAttributes/CategoryAttributes';
export { LocationPicker } from './LocationPicker/LocationPicker';

// Product Management
export { ProductList } from './ProductList/ProductList';
export { OfferCard } from './OfferCard/OfferCard';

// User Components
export { UserProfile } from './UserProfile/UserProfile';



export { MessageInput } from './MessageInput/MessageInput';

// Monetization Components
// BusinessBadge already exported above

// Community Components
export { CommunitySidebar } from './CommunitySidebar/CommunitySidebar';
export { SidebarToggle } from './SidebarToggle/SidebarToggle';

// Keyboard Avoiding Components
export { 
  CustomKeyboardAvoidingView, 
  KeyboardAwareScrollView, 
  KeyboardAwareTextInput,
  HybridKeyboardAvoidingView,
  useKeyboardState,
  useInputFocus 
} from './KeyboardAvoiding';

// Payment Components
export { PaymentModal, formatAmount, validateMobileMoneyNumber } from './PaymentModal/PaymentModal';
export type { PaymentRequest } from './PaymentModal/PaymentModal';

// Feature & Subscription Components
export { UserBadges, CompactUserBadges, FullUserBadges, BadgeChecker } from './UserBadges/UserBadges';
export { FeatureActivationModal } from './FeatureActivationModal/FeatureActivationModal';

// Diagnostic Components
export { PaystackDiagnostics } from './PaystackDiagnostics/PaystackDiagnostics';

// Feature Services
export * from '../lib/featureActivation';
export * from '../lib/featureExpiryService';
export * from '../lib/featureRecommendationEngine';
export * from '../lib/subscriptionManagement';
export * from '../lib/smartSearchService';

// Offer System Components
export { CounterOfferModal } from './CounterOfferModal/CounterOfferModal';
export { OfferExpiryTimer, useOfferTimer } from './OfferExpiryTimer/OfferExpiryTimer';

// Offer System Services
export * from '../lib/offerStateMachine';
export * from '../lib/listingReservationSystem';
export * from '../lib/offerAnalytics';
export * from '../lib/offerBackgroundJobs';

// Security & Privacy Components
export { SecurityDashboard } from './SecurityDashboard/SecurityDashboard';
export { MFASetup } from './MFASetup/MFASetup';
export { PrivacySettings } from './PrivacySettings/PrivacySettings';
export { GDPRCompliance } from './GDPRCompliance/GDPRCompliance';
export { ModerationDashboard } from './ModerationDashboard/ModerationDashboard';

// Security Services
export * from '../lib/securityService';
export * from '../lib/dataProtectionService';
export * from '../lib/contentModerationService';
export * from '../utils/security';
export * from '../hooks/useSecureAuth';

// Performance Components
export { OptimizedImage, ListingImage, ProfileImage, CommunityImage } from './OptimizedImage/OptimizedImage';
export { ImageViewer } from './ImageViewer';
export { CreditBalance } from './CreditBalance';
export { VirtualizedList, ProductVirtualizedList, ChatVirtualizedList, useVirtualizedList } from './VirtualizedList/VirtualizedList';
export { LazyComponent, withLazyLoading, createLazyComponent, IntersectionLazyComponent, InteractionLazyComponent } from './LazyComponent/LazyComponent';
export { OptimizedListingGrid, useOptimizedListingGrid } from './OptimizedListingGrid/OptimizedListingGrid';
export { 
  LazyCreateListingScreen, 
  LazyProfileScreen, 
  LazySettingsScreen, 
  LazyMyListingsScreen,
  MemoryAwareScreen,
  ProgressiveLoadingWrapper,
  LazyScreenSection,
  AdaptiveComponentLoader
} from './LazyScreens/LazyScreens';
export { PerformanceDashboard, usePerformanceDashboard } from './PerformanceDashboard/PerformanceDashboard';

// Chat Components
export { ReadReceipt } from './ReadReceipt/ReadReceipt';
export { DateSeparator } from './DateSeparator/DateSeparator';
export { ChatImagePicker } from './ChatImagePicker/ChatImagePicker';
export { ChatMenu } from './ChatMenu/ChatMenu';
export { ChatInlineMenu } from './ChatInlineMenu/ChatInlineMenu';
export { PostInlineMenu } from './PostInlineMenu/PostInlineMenu';
export { IntegrationStatus, useIntegrationStatus } from './IntegrationStatus/IntegrationStatus';

// Performance Services & Hooks
export * from '../hooks/usePerformanceMonitor';
export * from '../hooks/useOfflineSync';
export * from '../lib/offlineStorage';
export * from '../utils/memoryManager';

// Search Hooks
export * from '../hooks/useSmartSearch';

// Verification Hooks
export * from '../hooks/useVerification';

// Verification Services
export * from '../lib/verificationService';

// Data Table Components
export { DataTable, ItemDetailsTable, SellerInfoTable, ListingStatsTable } from './DataTable';
export type { DataTableProps, DataTableRow } from './DataTable';

// Professional Badge Components
export { 
  ProfessionalBadge, 
  ConditionBadge, 
  OffersBadge, 
  BoostBadge, 
  VerifiedBadge, 
  QuantityBadge 
} from './ProfessionalBadge';
export type { ProfessionalBadgeProps } from './ProfessionalBadge';