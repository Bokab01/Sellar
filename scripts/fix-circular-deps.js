const fs = require('fs');
const path = require('path');

// Components that are causing circular dependencies
const problematicComponents = [
  'MultiStepForm/MultiStepForm.tsx',
  'Card/Card.tsx',
  'UserBadges/UserBadges.tsx',
  'ModerationErrorModal/ModerationErrorModal.tsx',
  'TransactionCompletionModal/TransactionCompletionModal.tsx',
  'TransactionCompletionButton/TransactionCompletionButton.tsx',
  'TransactionBasedReviewForm/TransactionBasedReviewForm.tsx',
  'EnhancedReviewCard/EnhancedReviewCard.tsx',
  'TrustMetricsDisplay/TrustMetricsDisplay.tsx',
  'ReviewModerationModal/ReviewModerationModal.tsx',
  'SimpleCallbackRequestButton/SimpleCallbackRequestButton.tsx',
  'CallbackMessage/CallbackMessage.tsx',
  'MarketplaceSidebar/MarketplaceSidebar.tsx',
  'EnhancedSearchHeader/EnhancedSearchHeader.tsx',
  'SupportTicketCard/SupportTicketCard.tsx',
  'CreateTicketModal/CreateTicketModal.tsx',
  'KnowledgeBaseCard/KnowledgeBaseCard.tsx',
  'VerificationBadge/VerificationBadge.tsx',
  'DocumentUpload/DocumentUpload.tsx',
  'VerificationStatusTracker/VerificationStatusTracker.tsx',
  'TransactionCard/TransactionCard.tsx',
  'TransactionFilters/TransactionFilters.tsx',
  'UserDisplayName/UserDisplayName.tsx',
  'AuthErrorBoundary/AuthErrorBoundary.tsx',
  'CategoryPicker/CategoryPicker.tsx',
  'UserProfile/UserProfile.tsx',
  'CommunitySidebar/CommunitySidebar.tsx',
  'PaymentModal/PaymentModal.tsx',
  'FeatureActivationModal/FeatureActivationModal.tsx',
  'PaystackDiagnostics/PaystackDiagnostics.tsx'
];

// Mapping of common imports that should be direct paths
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
  'PaystackDiagnostics': '@/components/PaystackDiagnostics/PaystackDiagnostics'
};

function fixImportsInFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // Fix imports from '@/components' to direct paths
    Object.entries(importMappings).forEach(([componentName, directPath]) => {
      const importRegex = new RegExp(`import\\s*{[^}]*\\b${componentName}\\b[^}]*}\\s*from\\s*['"]@/components['"];?`, 'g');
      const matches = content.match(importRegex);
      
      if (matches) {
        matches.forEach(match => {
          // Extract the import statement and replace with direct path
          const newImport = match.replace('@/components', directPath);
          content = content.replace(match, newImport);
          modified = true;
        });
      }
    });

    // Fix destructured imports from '@/components'
    const destructuredImportRegex = /import\s*{\s*([^}]+)\s*}\s*from\s*['"]@\/components['"];?/g;
    const destructuredMatches = content.match(destructuredImportRegex);
    
    if (destructuredMatches) {
      destructuredMatches.forEach(match => {
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

        content = content.replace(match, newImports);
        modified = true;
      });
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`✅ Fixed imports in ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
}

// Fix all problematic components
console.log('🔧 Fixing circular dependencies...\n');

problematicComponents.forEach(component => {
  const filePath = path.join(__dirname, '..', 'components', component);
  if (fs.existsSync(filePath)) {
    fixImportsInFile(filePath);
  } else {
    console.log(`⚠️  File not found: ${filePath}`);
  }
});

console.log('\n✅ Circular dependency fixes completed!');
