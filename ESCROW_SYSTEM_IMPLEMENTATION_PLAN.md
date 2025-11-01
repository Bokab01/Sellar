# Escrow System Implementation Plan
## ₵20 Flat Deposit for Pro Sellers

---

## 📋 Overview

**Goal**: Reduce no-shows and build trust through a simple commitment deposit system
**Target**: Pro Sellers only (exclusive feature)
**Deposit Amount**: ₵20 flat rate for all listings
**Payment Processor**: Paystack
**Cost Per Transaction**: ₵0.39 (1.95% of ₵20)
**Completion Window**: 3 days (72 hours) from deposit payment
**Dispute Policy**: No disputes - Buyer confirmation is final (Vinted model)

---

## 🗂️ Phase 1: Database Schema & Backend Setup

### 1.1 Database Tables

#### Create `listing_deposits` table:
```sql
CREATE TABLE listing_deposits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES profiles(id),
  seller_id UUID NOT NULL REFERENCES profiles(id),
  conversation_id UUID REFERENCES conversations(id),
  
  -- Deposit details
  amount DECIMAL(10,2) NOT NULL DEFAULT 20.00,
  currency VARCHAR(3) NOT NULL DEFAULT 'GHS',
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, paid, released, refunded, expired
  
  -- Payment tracking
  paystack_reference VARCHAR(255) UNIQUE,
  paystack_transaction_id VARCHAR(255),
  payment_method VARCHAR(50), -- card, mobile_money, bank_transfer
  
  -- Meetup tracking
  meetup_scheduled_at TIMESTAMP,
  meetup_confirmed_by_buyer_at TIMESTAMP,
  meetup_confirmed_by_seller_at TIMESTAMP,
  buyer_showed_up BOOLEAN DEFAULT NULL,
  seller_showed_up BOOLEAN DEFAULT NULL,
  
  -- Release tracking
  released_at TIMESTAMP,
  released_to UUID REFERENCES profiles(id),
  refunded_at TIMESTAMP,
  refund_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- Auto-refund after 3 days if no confirmation
  
  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('pending', 'paid', 'released', 'refunded', 'expired', 'claimed')),
  CONSTRAINT amount_check CHECK (amount > 0)
);

-- Indexes
CREATE INDEX idx_listing_deposits_listing ON listing_deposits(listing_id);
CREATE INDEX idx_listing_deposits_buyer ON listing_deposits(buyer_id);
CREATE INDEX idx_listing_deposits_seller ON listing_deposits(seller_id);
CREATE INDEX idx_listing_deposits_status ON listing_deposits(status);
CREATE INDEX idx_listing_deposits_expires ON listing_deposits(expires_at);
CREATE INDEX idx_listing_deposits_paystack_ref ON listing_deposits(paystack_reference);
```

#### Update `listings` table:
```sql
ALTER TABLE listings ADD COLUMN requires_deposit BOOLEAN DEFAULT FALSE;
ALTER TABLE listings ADD COLUMN deposit_enabled_at TIMESTAMP;

-- Only Pro sellers can enable deposits
CREATE OR REPLACE FUNCTION check_pro_seller_for_deposit()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.requires_deposit = TRUE THEN
    -- Check if seller has active Pro subscription
    IF NOT EXISTS (
      SELECT 1 FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.id
      WHERE us.user_id = NEW.user_id
        AND sp.name = 'Sellar Pro'
        AND us.status IN ('active', 'trialing')
        AND (us.current_period_end IS NULL OR us.current_period_end > NOW())
    ) THEN
      RAISE EXCEPTION 'Only Sellar Pro members can require deposits';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_pro_seller_deposit
BEFORE INSERT OR UPDATE ON listings
FOR EACH ROW
EXECUTE FUNCTION check_pro_seller_for_deposit();
```

#### Update `profiles` table (user stats):
```sql
ALTER TABLE profiles ADD COLUMN deposit_no_show_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN deposit_success_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN deposit_banned_until TIMESTAMP;
ALTER TABLE profiles ADD COLUMN deposit_show_up_rate DECIMAL(5,2);

-- Trigger to calculate show-up rate
CREATE OR REPLACE FUNCTION update_deposit_show_up_rate()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles
  SET deposit_show_up_rate = (
    CASE 
      WHEN (deposit_success_count + deposit_no_show_count) > 0
      THEN (deposit_success_count::DECIMAL / (deposit_success_count + deposit_no_show_count)) * 100
      ELSE NULL
    END
  )
  WHERE id = NEW.buyer_id OR id = NEW.seller_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_show_up_rate
AFTER UPDATE ON listing_deposits
FOR EACH ROW
WHEN (OLD.status != NEW.status AND NEW.status IN ('released', 'claimed', 'refunded'))
EXECUTE FUNCTION update_deposit_show_up_rate();
```

### 1.2 RPC Functions

#### Initialize Deposit:
```sql
CREATE OR REPLACE FUNCTION initialize_deposit(
  p_listing_id UUID,
  p_buyer_id UUID,
  p_conversation_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_listing RECORD;
  v_buyer_active_deposits INTEGER;
  v_deposit_id UUID;
  v_paystack_reference VARCHAR(255);
BEGIN
  -- Get listing details
  SELECT l.*, p.id as seller_id
  INTO v_listing
  FROM listings l
  JOIN profiles p ON l.user_id = p.id
  WHERE l.id = p_listing_id;

  -- Validations
  IF v_listing IS NULL THEN
    RAISE EXCEPTION 'Listing not found';
  END IF;

  IF NOT v_listing.requires_deposit THEN
    RAISE EXCEPTION 'This listing does not require a deposit';
  END IF;

  IF v_listing.user_id = p_buyer_id THEN
    RAISE EXCEPTION 'You cannot commit to your own listing';
  END IF;

  IF v_listing.status != 'active' THEN
    RAISE EXCEPTION 'This listing is no longer available';
  END IF;

  -- Check buyer limits (max 3 active deposits)
  SELECT COUNT(*) INTO v_buyer_active_deposits
  FROM listing_deposits
  WHERE buyer_id = p_buyer_id
    AND status IN ('pending', 'paid')
    AND (expires_at IS NULL OR expires_at > NOW());

  IF v_buyer_active_deposits >= 3 THEN
    RAISE EXCEPTION 'You have reached the maximum of 3 active deposit commitments';
  END IF;

  -- Check if buyer is banned
  IF EXISTS (
    SELECT 1 FROM profiles
    WHERE id = p_buyer_id
      AND deposit_banned_until IS NOT NULL
      AND deposit_banned_until > NOW()
  ) THEN
    RAISE EXCEPTION 'Your deposit privileges are temporarily suspended';
  END IF;

  -- Generate Paystack reference
  v_paystack_reference := 'DEP-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 12));

  -- Create deposit record
  INSERT INTO listing_deposits (
    listing_id,
    buyer_id,
    seller_id,
    conversation_id,
    amount,
    status,
    paystack_reference,
    expires_at
  ) VALUES (
    p_listing_id,
    p_buyer_id,
    v_listing.seller_id,
    p_conversation_id,
    20.00,
    'pending',
    v_paystack_reference,
    NOW() + INTERVAL '24 hours' -- Initial payment window
  )
  RETURNING id INTO v_deposit_id;

  -- Return deposit details for payment initialization
  RETURN json_build_object(
    'deposit_id', v_deposit_id,
    'reference', v_paystack_reference,
    'amount', 2000, -- Amount in pesewas (₵20 = 2000 pesewas)
    'email', (SELECT email FROM auth.users WHERE id = p_buyer_id),
    'listing_title', v_listing.title,
    'seller_name', (SELECT full_name FROM profiles WHERE id = v_listing.seller_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Verify Deposit Payment:
```sql
CREATE OR REPLACE FUNCTION verify_deposit_payment(
  p_reference VARCHAR(255),
  p_transaction_id VARCHAR(255),
  p_payment_method VARCHAR(50)
)
RETURNS JSON AS $$
DECLARE
  v_deposit RECORD;
BEGIN
  -- Get deposit
  SELECT * INTO v_deposit
  FROM listing_deposits
  WHERE paystack_reference = p_reference
    AND status = 'pending';

  IF v_deposit IS NULL THEN
    RAISE EXCEPTION 'Deposit not found or already processed';
  END IF;

  -- Update deposit status
  UPDATE listing_deposits
  SET 
    status = 'paid',
    paystack_transaction_id = p_transaction_id,
    payment_method = p_payment_method,
    updated_at = NOW(),
    expires_at = NOW() + INTERVAL '3 days' -- 3 days to complete meetup
  WHERE id = v_deposit.id;

  -- Send notification to seller
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    v_deposit.seller_id,
    'deposit_received',
    'Buyer Committed with Deposit',
    'A buyer has paid a ₵20 deposit for your listing. They are serious!',
    json_build_object(
      'deposit_id', v_deposit.id,
      'listing_id', v_deposit.listing_id,
      'buyer_id', v_deposit.buyer_id
    )
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Deposit confirmed. Please meet with the seller to complete the transaction.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Confirm Meetup (Buyer):
```sql
CREATE OR REPLACE FUNCTION confirm_meetup_buyer(
  p_deposit_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_deposit RECORD;
BEGIN
  -- Get deposit
  SELECT * INTO v_deposit
  FROM listing_deposits
  WHERE id = p_deposit_id
    AND status = 'paid';

  IF v_deposit IS NULL THEN
    RAISE EXCEPTION 'Deposit not found or not in paid status';
  END IF;

  -- Check authorization
  IF v_deposit.buyer_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Update confirmation
  UPDATE listing_deposits
  SET 
    meetup_confirmed_by_buyer_at = NOW(),
    buyer_showed_up = TRUE,
    status = 'released',
    released_at = NOW(),
    released_to = seller_id,
    updated_at = NOW()
  WHERE id = p_deposit_id;

  -- Update buyer success stats
  UPDATE profiles
  SET deposit_success_count = deposit_success_count + 1
  WHERE id = v_deposit.buyer_id;

  -- Send notification to seller
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    v_deposit.seller_id,
    'deposit_released',
    'Deposit Released',
    'The buyer confirmed the meetup. ₵20 has been released to you!',
    json_build_object(
      'deposit_id', v_deposit.id,
      'listing_id', v_deposit.listing_id,
      'amount', v_deposit.amount
    )
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Thank you for confirming! The deposit has been released to the seller.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Claim No-Show Deposit (Seller):
```sql
CREATE OR REPLACE FUNCTION claim_no_show_deposit(
  p_deposit_id UUID
)
RETURNS JSON AS $$
DECLARE
  v_deposit RECORD;
BEGIN
  -- Get deposit
  SELECT * INTO v_deposit
  FROM listing_deposits
  WHERE id = p_deposit_id
    AND status = 'paid';

  IF v_deposit IS NULL THEN
    RAISE EXCEPTION 'Deposit not found or not eligible for claim';
  END IF;

  -- Check authorization
  IF v_deposit.seller_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Check if 24 hours have passed since deposit payment
  IF v_deposit.updated_at + INTERVAL '24 hours' > NOW() THEN
    RAISE EXCEPTION 'You can claim the deposit 24 hours after the buyer paid';
  END IF;

  -- Update deposit
  UPDATE listing_deposits
  SET 
    status = 'claimed',
    buyer_showed_up = FALSE,
    released_at = NOW(),
    released_to = seller_id,
    updated_at = NOW()
  WHERE id = p_deposit_id;

  -- Update buyer no-show stats
  UPDATE profiles
  SET 
    deposit_no_show_count = deposit_no_show_count + 1,
    -- Ban buyer if they have 3+ no-shows
    deposit_banned_until = CASE
      WHEN deposit_no_show_count + 1 >= 3
      THEN NOW() + INTERVAL '30 days'
      ELSE deposit_banned_until
    END
  WHERE id = v_deposit.buyer_id;

  -- Send notification to buyer
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    v_deposit.buyer_id,
    'deposit_claimed',
    'Deposit Claimed by Seller',
    'The seller has claimed your ₵20 deposit due to no-show. Please honor your commitments.',
    json_build_object(
      'deposit_id', v_deposit.id,
      'listing_id', v_deposit.listing_id
    )
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Deposit claimed successfully. ₵20 has been released to you.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Auto-Refund Expired Deposits (Cron Job):
```sql
CREATE OR REPLACE FUNCTION auto_refund_expired_deposits()
RETURNS JSON AS $$
DECLARE
  v_expired_count INTEGER := 0;
  v_deposit RECORD;
BEGIN
  -- Process all expired deposits
  FOR v_deposit IN
    SELECT * FROM listing_deposits
    WHERE status = 'paid'
      AND expires_at IS NOT NULL
      AND expires_at < NOW()
  LOOP
    -- Update to refunded
    UPDATE listing_deposits
    SET 
      status = 'refunded',
      refunded_at = NOW(),
      refund_reason = 'Auto-refund: No meetup confirmation within 3 days',
      updated_at = NOW()
    WHERE id = v_deposit.id;

    -- Notify buyer
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data
    ) VALUES (
      v_deposit.buyer_id,
      'deposit_refunded',
      'Deposit Refunded',
      'Your ₵20 deposit has been refunded as the meetup was not confirmed within 3 days.',
      json_build_object('deposit_id', v_deposit.id)
    );

    v_expired_count := v_expired_count + 1;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'refunded_count', v_expired_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cron job (run every hour)
-- SELECT cron.schedule('auto-refund-deposits', '0 * * * *', 'SELECT auto_refund_expired_deposits()');
```

---

## 🎨 Phase 2: Mobile App UI/UX

### 2.1 Listing Creation/Edit (Pro Sellers)

**File**: `app/create/page.tsx` or `app/edit-listing/[id].tsx`

**Add Toggle**:
```typescript
<View style={{ marginTop: theme.spacing.md }}>
  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
    <View style={{ flex: 1 }}>
      <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.xs }}>
        Require ₵20 Commitment Deposit
      </Text>
      <Text variant="bodySmall" color="secondary">
        Only serious buyers who pay ₵20 can commit to buy. Reduces no-shows by 60%+
      </Text>
      <Badge 
        text="Pro Exclusive" 
        variant="success" 
        size="sm" 
        style={{ marginTop: theme.spacing.xs, alignSelf: 'flex-start' }}
      />
    </View>
    <Switch
      value={requiresDeposit}
      onValueChange={setRequiresDeposit}
      disabled={!isProSeller}
    />
  </View>
</View>
```

### 2.2 Listing Detail Screen

**File**: `app/(tabs)/home/[id].tsx`

**Add Deposit Badge**:
```typescript
{listing.requires_deposit && (
  <View style={{
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.success + '15',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
  }}>
    <Shield size={16} color={theme.colors.success} />
    <Text variant="bodySmall" style={{
      color: theme.colors.success,
      fontWeight: '600',
      marginLeft: theme.spacing.xs,
    }}    >
      Serious Buyers Only - ₵20 Commitment Required
    </Text>
  </View>
)}
```

**Update Contact Buttons**:
```typescript
{listing.requires_deposit ? (
  <Button
    variant="primary"
    onPress={() => setShowDepositModal(true)}
    leftIcon={<Handshake size={20} color="#FFF" />}
    style={{ flex: 1 }}
  >
    Commit with ₵20 Deposit
  </Button>
) : (
  <Button
    variant="primary"
    onPress={handleMessage}
    leftIcon={<MessageCircle size={20} color="#FFF" />}
    style={{ flex: 1 }}
  >
    Message Seller
  </Button>
)}
```

### 2.3 Deposit Commitment Modal

**Create**: `components/DepositCommitmentModal/DepositCommitmentModal.tsx`

```typescript
interface DepositCommitmentModalProps {
  visible: boolean;
  onClose: () => void;
  listing: any;
  onSuccess: () => void;
}

export function DepositCommitmentModal({
  visible,
  onClose,
  listing,
  onSuccess,
}: DepositCommitmentModalProps) {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showWarning, setShowWarning] = useState(true);

  const handleCommit = async () => {
    try {
      setLoading(true);

      // Initialize deposit via RPC
      const { data, error } = await supabase.rpc('initialize_deposit', {
        p_listing_id: listing.id,
        p_buyer_id: user!.id,
      });

      if (error) throw error;

      // Initialize Paystack payment
      await PaystackWebView.payWithPaystack(
        {
          reference: data.reference,
          amount: data.amount, // 2000 pesewas = ₵20
          email: data.email,
          metadata: {
            deposit_id: data.deposit_id,
            listing_id: listing.id,
          },
        },
        (response) => {
          // Payment successful - verify on backend
          verifyPayment(data.reference);
        },
        (error) => {
          Alert.alert('Payment Failed', error.message);
        }
      );
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async (reference: string) => {
    // Call edge function to verify with Paystack
    const { data, error } = await supabase.functions.invoke('verify-deposit-payment', {
      body: { reference },
    });

    if (error) {
      Alert.alert('Verification Failed', 'Please contact support');
      return;
    }

    Alert.alert(
      'Success!',
      'Your commitment deposit has been paid. The seller will contact you to arrange meetup.',
      [{ text: 'OK', onPress: () => { onSuccess(); onClose(); } }]
    );
  };

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      title="Commitment Deposit"
      size="lg"
    >
      <View style={{ gap: theme.spacing.md }}>
        {/* Listing Info */}
        <View style={{
          backgroundColor: theme.colors.surfaceVariant,
          padding: theme.spacing.md,
          borderRadius: theme.borderRadius.md,
        }}>
          <Text variant="bodySmall" color="secondary">Committing to:</Text>
          <Text variant="body" style={{ fontWeight: '600', marginTop: theme.spacing.xs }}>
            {listing.title}
          </Text>
          <PriceDisplay amount={listing.price} size="md" style={{ marginTop: theme.spacing.sm }} />
        </View>

        {/* Warning Box */}
        {showWarning && (
          <View style={{
            backgroundColor: theme.colors.warning + '15',
            padding: theme.spacing.md,
            borderRadius: theme.borderRadius.md,
            borderWidth: 1,
            borderColor: theme.colors.warning + '30',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm }}>
              <AlertCircle size={20} color={theme.colors.warning} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ fontWeight: '600', color: theme.colors.warning }}>
                  Important: Read Carefully
                </Text>
                <Text variant="bodySmall" style={{ marginTop: theme.spacing.xs, lineHeight: 20 }}>
                  • You will pay a <Text style={{ fontWeight: '600' }}>₵20 commitment deposit</Text>{'\n'}
                  • This shows the seller you are serious{'\n'}
                  • If you meet and complete the transaction, <Text style={{ fontWeight: '600' }}>₵20 goes to the seller</Text>{'\n'}
                  • If you don't show up, <Text style={{ fontWeight: '600' }}>you lose the ₵20</Text> (no refunds){'\n'}
                  • You have <Text style={{ fontWeight: '600' }}>3 days</Text> to complete the meetup
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Deposit Amount */}
        <View style={{
          alignItems: 'center',
          paddingVertical: theme.spacing.lg,
        }}        >
          <Text variant="caption" color="secondary">You will pay</Text>
          <Text variant="h1" style={{ fontSize: 48, fontWeight: 'bold', color: theme.colors.primary }}>
            ₵20
          </Text>
          <Text variant="bodySmall" color="secondary">+ processing fee</Text>
        </View>

        {/* Confirmation */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          padding: theme.spacing.md,
          backgroundColor: theme.colors.surface,
          borderRadius: theme.borderRadius.md,
        }}>
          <CheckCircle size={20} color={theme.colors.success} />
          <Text variant="bodySmall" style={{ flex: 1 }}>
            I understand this is non-refundable if I don't show up
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={{ gap: theme.spacing.sm }}>
          <Button
            variant="primary"
            onPress={handleCommit}
            loading={loading}
            disabled={loading}
          >
            Pay ₵20 Deposit
          </Button>
          <Button
            variant="outline"
            onPress={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
        </View>
      </View>
    </AppModal>
  );
}
```

### 2.4 Meetup Confirmation Screen

**Create**: `app/deposit-confirmation/[id].tsx`

```typescript
export default function DepositConfirmationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const [deposit, setDeposit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    fetchDeposit();
  }, [id]);

  const fetchDeposit = async () => {
    const { data, error } = await supabase
      .from('listing_deposits')
      .select(`
        *,
        listing:listings(*),
        seller:seller_id(full_name, avatar_url, phone),
        buyer:buyer_id(full_name, avatar_url)
      `)
      .eq('id', id)
      .single();

    if (data) setDeposit(data);
    setLoading(false);
  };

  const handleConfirm = async () => {
    Alert.alert(
      'Confirm Meetup',
      'Did you meet the seller and complete the transaction? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Confirm',
          onPress: async () => {
            try {
              setConfirming(true);
              const { error } = await supabase.rpc('confirm_meetup_buyer', {
                p_deposit_id: id,
              });

              if (error) throw error;

              Alert.alert(
            'Success!',
            'Thank you for confirming. The ₵20 has been released to the seller.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
            } catch (err: any) {
              Alert.alert('Error', err.message);
            } finally {
              setConfirming(false);
            }
          },
        },
      ]
    );
  };

  if (loading) return <LoadingSkeleton />;

  const canConfirm = deposit?.status === 'paid' && !deposit?.meetup_confirmed_by_buyer_at;
  const isConfirmed = deposit?.status === 'released';
  const isClaimed = deposit?.status === 'claimed';

  return (
    <SafeAreaWrapper>
      <AppHeader title="Deposit Confirmation" showBackButton />

      <ScrollView style={{ flex: 1, padding: theme.spacing.md }}>
        {/* Status Banner */}
        <View style={{
          backgroundColor: isConfirmed 
            ? theme.colors.success + '15'
            : isClaimed
            ? theme.colors.error + '15'
            : theme.colors.primary + '15',
          padding: theme.spacing.md,
          borderRadius: theme.borderRadius.md,
          marginBottom: theme.spacing.lg,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            {isConfirmed && <CheckCircle size={24} color={theme.colors.success} />}
            {isClaimed && <XCircle size={24} color={theme.colors.error} />}
            {canConfirm && <Clock size={24} color={theme.colors.primary} />}
            <Text variant="body" style={{ fontWeight: '600', flex: 1 }}>
              {isConfirmed && 'Meetup Confirmed'}
              {isClaimed && 'Deposit Claimed by Seller'}
              {canConfirm && 'Waiting for Confirmation'}
            </Text>
          </View>
        </View>

        {/* Listing Info */}
        <Card>
          <Text variant="caption" color="secondary">Listing</Text>
          <Text variant="body" style={{ fontWeight: '600', marginTop: theme.spacing.xs }}>
            {deposit?.listing?.title}
          </Text>
          <PriceDisplay amount={deposit?.listing?.price} size="sm" style={{ marginTop: theme.spacing.sm }} />
        </Card>

        {/* Seller Info */}
        <Card style={{ marginTop: theme.spacing.md }}>
          <Text variant="caption" color="secondary">Seller</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
            <Avatar
              name={deposit?.seller?.full_name}
              source={deposit?.seller?.avatar_url}
              size="md"
            />
            <View style={{ flex: 1 }}>
              <Text variant="body" style={{ fontWeight: '600' }}>
                {deposit?.seller?.full_name}
              </Text>
              {deposit?.seller?.phone && (
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${deposit.seller.phone}`)}>
                  <Text variant="bodySmall" color="primary">
                    {deposit.seller.phone}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Card>

        {/* Deposit Info */}
        <Card style={{ marginTop: theme.spacing.md }}>
          <Text variant="caption" color="secondary">Deposit Amount</Text>
          <Text variant="h3" style={{ marginTop: theme.spacing.xs }}>₵20.00</Text>
          <Text variant="bodySmall" color="secondary" style={{ marginTop: theme.spacing.xs }}>
            Paid on {new Date(deposit?.created_at).toLocaleDateString()}
          </Text>
        </Card>

        {/* Instructions */}
        {canConfirm && (
          <View style={{
            backgroundColor: theme.colors.info + '15',
            padding: theme.spacing.md,
            borderRadius: theme.borderRadius.md,
            marginTop: theme.spacing.lg,
          }}>
            <Text variant="body" style={{ fontWeight: '600', marginBottom: theme.spacing.sm }}>
              Next Steps:
            </Text>
            <Text variant="bodySmall" style={{ lineHeight: 20 }}>
              1. Contact the seller to arrange meetup{'\n'}
              2. Meet and inspect the item{'\n'}
              3. Complete the transaction{'\n'}
              4. Come back here and confirm meetup{'\n'}
              5. The ₵20 will be released to the seller
            </Text>
          </View>
        )}

        {/* Confirm Button */}
        {canConfirm && (
          <Button
            variant="primary"
            onPress={handleConfirm}
            loading={confirming}
            disabled={confirming}
            style={{ marginTop: theme.spacing.lg }}
            leftIcon={<CheckCircle size={20} color="#FFF" />}
          >
            Confirm Meetup Complete
          </Button>
        )}

        {/* Already Confirmed */}
        {isConfirmed && (
          <View style={{
            backgroundColor: theme.colors.success + '15',
            padding: theme.spacing.md,
            borderRadius: theme.borderRadius.md,
            marginTop: theme.spacing.lg,
          }}>
            <Text variant="body" style={{ textAlign: 'center' }}            >
              ✅ You have confirmed the meetup. The ₵20 has been released to the seller. Thank you!
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaWrapper>
  );
}
```

### 2.5 My Orders Screen

**Create**: `app/my-orders.tsx`

This is the main orders tracking screen accessible from the More tab.

```typescript
export default function MyOrdersScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('sold' | 'bought');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all' | 'in_progress' | 'completed' | 'cancelled');
  
  // Features:
  // - Tab switcher: Sold (items you sold) vs Bought (items you purchased)
  // - Filter pills: All, In Progress, Completed, Cancelled
  // - Order cards showing listing image, title, buyer/seller name, price, deposit amount, status badge
  // - Click to view deposit confirmation details
  // - Real-time refresh
  
  // Query logic:
  // - Sold tab: Filter by seller_id = current user
  // - Bought tab: Filter by buyer_id = current user
  // - In Progress filter: status IN ('pending', 'paid')
  // - Completed filter: status IN ('released', 'claimed')
  // - Cancelled filter: status IN ('refunded', 'expired')
}
```

**Add to More Screen**: `app/(tabs)/more/index.tsx`

```typescript
{
  title: 'My Orders',
  subtitle: 'Track your buy and sell orders',
  icon: <ShoppingCart size={20} color={theme.colors.primary} />,
  onPress: () => router.push('/my-orders'),
}
```

### 2.6 My Deposits Screen (Legacy - Can be merged with My Orders)

**Create**: `app/(tabs)/more/my-deposits.tsx`

```typescript
export default function MyDepositsScreen() {
  const { theme } = useTheme();
  const { user } = useAuthStore();
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    fetchDeposits();
  }, [filter]);

  const fetchDeposits = async () => {
    let query = supabase
      .from('listing_deposits')
      .select(`
        *,
        listing:listings(title, price, images, status),
        seller:seller_id(full_name, avatar_url),
        buyer:buyer_id(full_name, avatar_url)
      `)
      .or(`buyer_id.eq.${user!.id},seller_id.eq.${user!.id}`)
      .order('created_at', { ascending: false });

    if (filter === 'active') {
      query = query.in('status', ['pending', 'paid']);
    } else if (filter === 'completed') {
      query = query.in('status', ['released', 'claimed', 'refunded']);
    }

    const { data, error } = await query;
    if (data) setDeposits(data);
    setLoading(false);
  };

  const isBuyer = (deposit: any) => deposit.buyer_id === user!.id;

  return (
    <SafeAreaWrapper>
      <AppHeader title="My Deposits" showBackButton />

      {/* Filter Tabs */}
      <View style={{ flexDirection: 'row', padding: theme.spacing.sm, gap: theme.spacing.xs }}>
        {['all', 'active', 'completed'].map((tab) => (
          <Button
            key={tab}
            variant={filter === tab ? 'primary' : 'outline'}
            onPress={() => setFilter(tab as any)}
            size="sm"
            style={{ flex: 1 }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Button>
        ))}
      </View>

      {loading ? (
        <LoadingSkeleton />
      ) : deposits.length === 0 ? (
        <EmptyState
          title="No Deposits"
          description="You don't have any deposit commitments yet"
        />
      ) : (
        <FlatList
          data={deposits}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => router.push(`/deposit-confirmation/${item.id}`)}
              style={{
                padding: theme.spacing.md,
                borderBottomWidth: 1,
                borderBottomColor: theme.colors.border,
              }}
            >
              <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                <Image
                  source={{ uri: item.listing.images?.[0] }}
                  style={{ width: 80, height: 80, borderRadius: theme.borderRadius.md }}
                />
                <View style={{ flex: 1 }}>
                  <Text variant="body" style={{ fontWeight: '600' }} numberOfLines={2}>
                    {item.listing.title}
                  </Text>
                  <Text variant="bodySmall" color="secondary" style={{ marginTop: theme.spacing.xs }}>
                    {isBuyer(item) ? 'Buying from' : 'Selling to'}: {isBuyer(item) ? item.seller.full_name : item.buyer.full_name}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.xs }}>
                    <Badge
                      text={item.status}
                      variant={
                        item.status === 'released' ? 'success' :
                        item.status === 'claimed' || item.status === 'refunded' ? 'neutral' :
                        'warning'
                      }
                      size="sm"
                    />
                    <Text variant="caption" style={{ fontWeight: '600' }}>₵20</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaWrapper>
  );
}
```

---

## 🌐 Phase 3: Web App Implementation

Similar structure to mobile, adapted for web:

### 3.1 Components to Create:

- `app/listings/[id]/page.tsx` - Add deposit commitment section
- `components/DepositCommitmentModal.tsx` - Web version
- `app/my-deposits/page.tsx` - Deposits management
- `app/deposit-confirmation/[id]/page.tsx` - Confirmation flow

### 3.2 Paystack Integration:

Use Paystack Popup for web:
```typescript
import PaystackPop from '@paystack/inline-js';

const paystack = new PaystackPop();
paystack.newTransaction({
  key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
  email: user.email,
  amount: 2000, // ₵20 in pesewas
  reference: depositReference,
  onSuccess: (transaction) => {
    verifyPayment(transaction.reference);
  },
  onCancel: () => {
    console.log('Payment cancelled');
  },
});
```

---

## ⚙️ Phase 4: Edge Functions

### 4.1 Verify Deposit Payment

**Create**: `supabase/functions/verify-deposit-payment/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const { reference } = await req.json();

    // Verify with Paystack
    const paystackResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
        },
      }
    );

    const paystackData = await paystackResponse.json();

    if (paystackData.status && paystackData.data.status === 'success') {
      // Update database via RPC
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );

      const { data, error } = await supabase.rpc('verify_deposit_payment', {
        p_reference: reference,
        p_transaction_id: paystackData.data.id,
        p_payment_method: paystackData.data.channel,
      });

      if (error) throw error;

      return new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      throw new Error('Payment verification failed');
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

### 4.2 Auto-Refund Cron

**Create**: `supabase/functions/auto-refund-deposits/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data, error } = await supabase.rpc('auto_refund_expired_deposits');

    if (error) throw error;

    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

---

## 📧 Phase 5: Notifications & Emails

### 5.1 Email Templates

**Deposit Paid (to Seller)**:
```
Subject: 🎉 A Buyer Committed with Deposit!

Hi [Seller Name],

Great news! A buyer has paid a ₵20 commitment deposit for your listing "[Listing Title]".

This means they are serious about buying. Please contact them to arrange the meetup.

Buyer: [Buyer Name]
Phone: [Buyer Phone]

View Details: [Link]

Best regards,
Sellar Team
```

**Deposit Released (to Seller)**:
```
Subject: ✅ ₵20 Deposit Released

Hi [Seller Name],

The buyer has confirmed your meetup. Your ₵20 deposit has been released!

[View Balance]

Thank you for using Sellar Pro!
```

**Deposit Claimed (to Buyer)**:
```
Subject: ⚠️ Your Deposit Was Claimed

Hi [Buyer Name],

The seller has claimed your ₵20 deposit due to a no-show.

Please honor your commitments in the future to avoid losing deposits.

[View Deposit History]
```

**Auto-Refund (to Buyer)**:
```
Subject: 💰 Your Deposit Has Been Refunded

Hi [Buyer Name],

Your ₵20 deposit has been automatically refunded as the meetup was not confirmed within 3 days.

[View Deposit History]
```

---

## 📊 Phase 6: Analytics & Monitoring

### 6.1 Metrics to Track:

- **Deposit conversion rate**: How many people pay deposits vs just message
- **Show-up rate**: Deposits vs no deposits
- **Claim rate**: % of deposits claimed by sellers
- **Refund rate**: % auto-refunded
- **Revenue impact**: Pro subscriptions attributed to deposit feature
- **Abuse rate**: Banned users, pattern detection

### 6.2 Dashboard for Admin:

```sql
-- Daily deposit stats
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_deposits,
  COUNT(*) FILTER (WHERE status = 'paid') as paid,
  COUNT(*) FILTER (WHERE status = 'released') as released,
  COUNT(*) FILTER (WHERE status = 'claimed') as claimed,
  COUNT(*) FILTER (WHERE status = 'refunded') as refunded,
  SUM(amount) as total_value
FROM listing_deposits
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Top sellers by deposit usage
SELECT 
  p.full_name,
  p.id,
  COUNT(*) as total_deposits,
  COUNT(*) FILTER (WHERE ld.status = 'released') as successful,
  COUNT(*) FILTER (WHERE ld.status = 'claimed') as no_shows
FROM listing_deposits ld
JOIN profiles p ON ld.seller_id = p.id
GROUP BY p.id, p.full_name
ORDER BY total_deposits DESC
LIMIT 20;
```

---

## 🚀 Phase 7: Testing & Launch

### 7.1 Testing Checklist:

**Happy Path**:
- [ ] Pro seller enables deposit on listing
- [ ] Buyer views listing, sees deposit requirement
- [ ] Buyer clicks "Commit with Deposit"
- [ ] Paystack payment succeeds
- [ ] Seller gets notification
- [ ] Both users arrange meetup
- [ ] Buyer confirms meetup
- [ ] Deposit released to seller
- [ ] Both can leave reviews

**Edge Cases**:
- [ ] Non-Pro seller tries to enable deposit (should fail)
- [ ] Buyer has 3 active deposits, tries 4th (should fail)
- [ ] Payment fails (should cleanup deposit record)
- [ ] Buyer doesn't show up, seller claims after 24h
- [ ] 7 days pass, auto-refund triggers
- [ ] Buyer banned after 3 no-shows
- [ ] Seller tries to claim too early (should fail)

**Security**:
- [ ] Only buyer can confirm meetup for their deposit
- [ ] Only seller can claim no-show deposit
- [ ] Payment verification uses server-side edge function
- [ ] RLS policies protect deposit data

### 7.2 Beta Launch:

1. **Week 1-2**: Enable for 10 hand-picked Pro sellers
2. **Monitor**: Track metrics daily
3. **Week 3-4**: Expand to 50 Pro sellers
4. **Iterate**: Fix issues, improve UX
5. **Month 2**: Full launch to all Pro sellers

---

## 💰 Phase 8: Revenue & Payout System

### 8.1 Wallet System:

```sql
CREATE TABLE user_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id),
  balance DECIMAL(10,2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'GHS',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES user_wallets(id),
  type VARCHAR(50) NOT NULL, -- deposit_released, withdrawal, refund
  amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  related_deposit_id UUID REFERENCES listing_deposits(id),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 8.2 Withdrawal Flow:

- Sellers can withdraw wallet balance
- Minimum withdrawal: ₵20
- Paystack transfer fee: ₵0.50 + 0.5%
- Processing time: 1-3 business days

---

## 📱 Phase 9: User Education

### 9.1 In-App Tutorials:

- Show modal explaining deposits for first-time users
- Highlight deposit badge on listings
- Success stories from sellers

### 9.2 Marketing Content:

- Blog post: "How Commitment Deposits Reduce No-Shows"
- Seller testimonials
- Social media campaign

---

## ✅ Implementation Timeline

| Phase | Duration | Priority |
|-------|----------|----------|
| Phase 1: Database | 2-3 days | Critical |
| Phase 2: Mobile UI | 3-4 days | Critical |
| Phase 3: Web UI | 2-3 days | High |
| Phase 4: Edge Functions | 1-2 days | Critical |
| Phase 5: Notifications | 1 day | Medium |
| Phase 6: Analytics | 1 day | Low |
| Phase 7: Testing | 1 week | Critical |
| Phase 8: Wallet/Payout | 3-4 days | Medium |
| Phase 9: Education | 1 week | Low |

**Total Estimated Time**: 3-4 weeks

---

## 🎯 Success Metrics (3 months post-launch)

- **Target**: 30% of Pro sellers enable deposits
- **Target**: 70%+ show-up rate for deposits (vs 50% without)
- **Target**: <10% abuse rate (banned users)
- **Target**: 10% increase in Pro subscriptions
- **Target**: ₵100-500/month in deposit processing costs (acceptable for trust building)

---

## 🔒 Risk Mitigation

1. **Paystack Fees**: Acceptable cost for platform trust - offset by Pro subscriptions
2. **User Resistance**: Clear messaging, testimonials, optional feature
3. **Disputes**: No dispute policy - buyer confirmation is final (like Vinted)
4. **Fraud**: Track patterns, ban abusers, limit active deposits per user
5. **Technical**: Test thoroughly, monitor errors, rollback plan ready

---

**Ready to implement?** Start with Phase 1 (Database) and work sequentially. Let me know when you're ready to begin! 🚀

