# Sellar Mobile App - Database Schema

This directory contains the complete SQL schema for the Sellar mobile app migration to a new Supabase project.

## File Structure

1. **01_schema.sql** - Core database schema with all tables, indexes, and constraints
2. **02_functions.sql** - Postgres functions and stored procedures
3. **03_row_level_security.sql** - Row Level Security (RLS) policies
4. **04_seed_data.sql** - Initial seed data for categories, packages, and settings
5. **05_category_mapping.sql** - Category ID mapping between frontend strings and database UUIDs
6. **00_README.md** - This documentation file

## Deployment Order

Execute the SQL files in the following order:

```bash
# 1. Create the schema and tables
psql -f 01_schema.sql

# 2. Create functions and procedures
psql -f 02_functions.sql

# 3. Set up Row Level Security
psql -f 03_row_level_security.sql

# 4. Insert seed data
psql -f 04_seed_data.sql

# 5. Set up category mapping
psql -f 05_category_mapping.sql
```

## Key Features

### Authentication & Users
- Supabase Auth integration with automatic profile creation
- User profiles with business account support
- Verification system (phone, email, identity, business, address)
- Trust score calculation based on verifications and activity

### Marketplace
- Hierarchical category system with comprehensive dynamic attributes
- **58+ subcategories** with contextual attributes (Electronics, Fashion, Vehicles, Home & Garden, etc.)
- Listings with images, location, and flexible attributes (JSONB)
- Real-time updates for listings and community posts
- Search functionality with analytics tracking

### Communication
- Conversations and messages system
- Real-time chat with typing indicators
- Offer system with state management
- Push notifications with preferences

### Monetization
- Credit-based system for premium features
- Subscription plans with entitlements
- Transaction tracking and financial records
- Paystack payment integration

### Community
- Community posts with likes, comments, shares
- Follow/unfollow system
- User achievements and rewards
- Content moderation and reporting

### Business Features
- Business profiles and verification
- Analytics and performance tracking
- Bulk operations for business users
- Premium branding and sponsored content

## Database Design Principles

1. **Compatibility**: Schema matches frontend TypeScript interfaces exactly
2. **Performance**: Proper indexing for common queries and real-time subscriptions
3. **Security**: Comprehensive RLS policies for data protection
4. **Scalability**: Efficient foreign key relationships and normalized structure
5. **Flexibility**: JSONB columns for dynamic attributes and metadata

## Frontend Integration

The schema is designed to work seamlessly with the existing frontend:

- **Category IDs**: Mapping functions convert between frontend string IDs and database UUIDs
- **Field Names**: Database column names match frontend property names exactly
- **Data Types**: SQL types correspond to TypeScript interfaces
- **Relationships**: Foreign keys support the existing join patterns in the frontend

## Security Considerations

- All tables have RLS enabled
- Policies enforce user ownership and appropriate access levels
- Sensitive operations require authentication
- Business features require verification
- Admin operations are properly restricted

## Performance Optimizations

- Indexes on frequently queried columns
- Composite indexes for complex queries
- Partial indexes for filtered queries
- Real-time subscription optimization
- Efficient pagination support

## Migration Notes

When migrating from the old database:

1. **Data Mapping**: Use the category mapping functions for category IDs
2. **User Profiles**: Profiles will be created automatically via triggers
3. **Images**: Update image URLs to point to new Supabase storage
4. **Notifications**: Existing notification preferences will need to be recreated
5. **Credits**: User credit balances should be migrated carefully with audit trail

## Maintenance

Regular maintenance tasks:

1. **Cleanup**: Archive old conversations and notifications
2. **Analytics**: Aggregate search analytics data
3. **Performance**: Monitor and optimize slow queries
4. **Security**: Review and update RLS policies as needed
5. **Backups**: Regular database backups and point-in-time recovery setup

## Support

For questions about the database schema:

1. Check the inline comments in each SQL file
2. Review the TypeScript interfaces in the frontend code
3. Test queries against the development database
4. Validate RLS policies with different user roles

## Version

Schema Version: 1.0.0
Compatible with: Sellar Mobile App v1.0.0
Last Updated: September 13, 2025
