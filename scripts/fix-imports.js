const fs = require('fs');
const path = require('path');

// List of files to fix
const filesToFix = [
  'components/EnhancedReviewCard/EnhancedReviewCard.tsx',
  'components/TrustMetricsDisplay/TrustMetricsDisplay.tsx',
  'components/ReviewModerationModal/ReviewModerationModal.tsx',
  'components/SimpleCallbackRequestButton/SimpleCallbackRequestButton.tsx',
  'components/CallbackMessage/CallbackMessage.tsx',
  'components/MarketplaceSidebar/MarketplaceSidebar.tsx',
  'components/EnhancedSearchHeader/EnhancedSearchHeader.tsx',
  'components/SupportTicketCard/SupportTicketCard.tsx',
  'components/CreateTicketModal/CreateTicketModal.tsx',
  'components/KnowledgeBaseCard/KnowledgeBaseCard.tsx',
  'components/VerificationBadge/VerificationBadge.tsx',
  'components/DocumentUpload/DocumentUpload.tsx',
  'components/VerificationStatusTracker/VerificationStatusTracker.tsx',
  'components/TransactionCard/TransactionCard.tsx',
  'components/TransactionFilters/TransactionFilters.tsx',
  'components/UserDisplayName/UserDisplayName.tsx',
  'components/AuthErrorBoundary/AuthErrorBoundary.tsx',
  'components/CategoryPicker/CategoryPicker.tsx',
  'components/UserProfile/UserProfile.tsx',
  'components/CommunitySidebar/CommunitySidebar.tsx',
  'components/PaymentModal/PaymentModal.tsx',
  'components/FeatureActivationModal/FeatureActivationModal.tsx',
  'components/PaystackDiagnostics/PaystackDiagnostics.tsx'
];

// Common import mappings
const importMappings = {
  'Text': '@/components/Typography/Text',
  'Button': '@/components/Button/Button',
  'Input': '@/components/Input/Input',
  'Avatar': '@/components/Avatar/Avatar',
  'Badge': '@/components/Badge/Badge',
  'Modal': '@/components/Modal/Modal',
  'AppModal': '@/components/Modal/Modal',
  'Toast': '@/components/Toast/Toast',
  'LoadingSkeleton': '@/components/LoadingSkeleton/LoadingSkeleton',
  'EmptyState': '@/components/EmptyState/EmptyState',
  'ErrorState': '@/components/ErrorState/ErrorState',
  'AppHeader': '@/components/AppHeader/AppHeader',
  'StepIndicator': '@/components/StepIndicator/StepIndicator',
  'Grid': '@/components/Grid/Grid',
  'Alert': '@/components/Alert/Alert',
  'LinkButton': '@/components/LinkButton/LinkButton',
  'SearchBar': '@/components/SearchBar/SearchBar',
  'FilterSheet': '@/components/FilterSheet/FilterSheet',
  'CategoryCard': '@/components/CategoryCard/CategoryCard',
  'LocationPicker': '@/components/LocationPicker/LocationPicker',
  'ProductList': '@/components/ProductList/ProductList',
  'OfferCard': '@/components/OfferCard/OfferCard',
  'UserProfile': '@/components/UserProfile/UserProfile',
  'MessageInput': '@/components/MessageInput/MessageInput',
  'CommunitySidebar': '@/components/CommunitySidebar/CommunitySidebar',
  'PaymentModal': '@/components/PaymentModal/PaymentModal',
  'UserBadges': '@/components/UserBadges/UserBadges',
  'FeatureActivationModal': '@/components/FeatureActivationModal/FeatureActivationModal',
  'PaystackDiagnostics': '@/components/PaystackDiagnostics/PaystackDiagnostics',
  'Rating': '@/components/Rating/Rating',
  'UserDisplayName': '@/components/UserDisplayName/UserDisplayName',
  'PriceDisplay': '@/components/PriceDisplay/PriceDisplay',
  'Chip': '@/components/Chip/Chip',
  'Stepper': '@/components/Stepper/Stepper',
  'ListItem': '@/components/ListItem/ListItem',
  'ReviewCard': '@/components/ReviewCard/ReviewCard',
  'ReviewForm': '@/components/ReviewForm/ReviewForm',
  'ReviewsList': '@/components/ReviewsList/ReviewsList',
  'ReviewSummary': '@/components/ReviewSummary/ReviewSummary',
  'ChatBubble': '@/components/ChatBubble/ChatBubble'
};

function fixFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Fix incorrect imports from @/components/Typography/Text
    const incorrectImportRegex = /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@\/components\/Typography\/Text['"];?/g;
    const incorrectMatches = content.match(incorrectImportRegex);
    
    if (incorrectMatches) {
      incorrectMatches.forEach(match => {
        const importContent = match.match(/{\s*([^}]+)\s*}/)[1];
        const components = importContent.split(',').map(c => c.trim());
        
        // Create individual imports for each component
        const newImports = components
          .map(comp => {
            const directPath = importMappings[comp];
            if (directPath) {
              return `import { ${comp} } from '${directPath}';`;
            }
            return null;
          })
          .filter(Boolean)
          .join('\n');

        if (newImports) {
          content = content.replace(match, newImports);
          modified = true;
        }
      });
    }

    // Fix imports from @/components to direct paths
    const barrelImportRegex = /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@\/components['"];?/g;
    const barrelMatches = content.match(barrelImportRegex);
    
    if (barrelMatches) {
      barrelMatches.forEach(match => {
        const importContent = match.match(/{\s*([^}]+)\s*}/)[1];
        const components = importContent.split(',').map(c => c.trim());
        
        // Group components by their direct paths
        const groupedImports = {};
        components.forEach(comp => {
          const directPath = importMappings[comp];
          if (directPath) {
            if (!groupedImports[directPath]) {
              groupedImports[directPath] = [];
            }
            groupedImports[directPath].push(comp);
          }
        });

        // Create new import statements
        const newImports = Object.entries(groupedImports)
          .map(([path, comps]) => `import { ${comps.join(', ')} } from '${path}';`)
          .join('\n');

        if (newImports) {
          content = content.replace(match, newImports);
          modified = true;
        }
      });
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed imports in ${filePath}`);
    } else {
      console.log(`ℹ️  No changes needed for ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
}

console.log('🔧 Fixing circular dependencies in components...\n');

filesToFix.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  fixFile(filePath);
});

console.log('\n✅ Circular dependency fixes completed!');
