# Business Hours Made Optional

**Date:** October 26, 2025  
**Status:** ✅ Completed

---

## Overview

Made business hours optional for chatbots. Not all chatbots are for businesses - some are 24/7 support bots, personal assistants, or non-business applications that don't need business hours functionality.

---

## Changes Made

### 1. ✅ Updated Schema

**Location:** `shared/schema.ts`

Added `enabled` field to `businessHours` configuration:

```typescript
businessHours: z.object({
  enabled: z.boolean().default(false), // NEW: Toggle to enable/disable
  timezone: z.string().default("UTC"),
  schedule: z.object({
    // ... schedule configuration
  }).default({}),
  offlineMessage: z.string()
    .max(500, "Offline message too long")
    .default("We're currently closed..."),
}).optional().default({
  enabled: false, // Disabled by default
  timezone: "UTC",
  schedule: {},
  offlineMessage: "We're currently closed...",
})
```

**Key Changes:**
- Added `enabled: boolean` field (default: `false`)
- Made entire `businessHours` object optional
- Business hours are now **disabled by default** for new chatbots

### 2. ✅ Updated ChatbotForm UI

**Location:** `client/src/components/ChatbotForm.tsx`

Added toggle switch in the **Business Hours** tab:

```tsx
<FormField
  control={form.control}
  name="config.businessHours.enabled"
  render={({ field }) => (
    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 mb-4">
      <div className="space-y-0.5">
        <FormLabel className="text-base">
          Enable Business Hours
        </FormLabel>
        <FormDescription>
          Show online/offline status based on business hours 
          (optional - disable for 24/7 chatbots)
        </FormDescription>
      </div>
      <FormControl>
        <Switch
          checked={field.value}
          onCheckedChange={field.onChange}
        />
      </FormControl>
    </FormItem>
  )}
/>

{/* Only show BusinessHoursEditor when enabled */}
{form.watch('config.businessHours.enabled') && (
  <BusinessHoursEditor 
    control={form.control} 
    name="config.businessHours"
  />
)}
```

**Features:**
- Toggle switch to enable/disable business hours
- BusinessHoursEditor only shows when enabled
- Clear description explaining it's optional

### 3. ✅ Updated Widget Logic

**Locations:** 
- `client/src/pages/widget-fullpage.tsx`
- `client/src/pages/widget-embed.tsx`

Updated `isBusinessOpen()` function:

```typescript
const isBusinessOpen = () => {
  // If business hours are disabled, always return true (24/7 availability)
  if (!config?.businessHours?.enabled) return true;
  if (!config?.businessHours?.schedule) return true;
  
  // ... rest of business hours logic
};
```

Updated business hours notice display:

```tsx
{/* Only show notice if business hours are enabled */}
{config?.businessHours?.enabled && !isBusinessOpen() && (
  <div className="...">
    {config?.businessHours?.offlineMessage || "We're currently closed..."}
  </div>
)}
```

**Behavior:**
- When `enabled: false` → Always shows as "online", no offline notices
- When `enabled: true` → Shows online/offline status based on schedule
- Placeholder text changes based on status (when enabled)

### 4. ✅ Updated Default Values

**Location:** `client/src/components/ChatbotForm.tsx`

```typescript
businessHours: {
  enabled: false, // Disabled by default
  timezone: "UTC",
  schedule: {
    monday: { open: "09:00", close: "17:00", closed: false },
    // ... other days
  },
  offlineMessage: "We're currently closed...",
}
```

### 5. ✅ Created Migration

**Location:** `migrations/0007_make_business_hours_optional.sql`

Adds `enabled: false` to all existing chatbots:

```sql
UPDATE chatbots
SET config = jsonb_set(
  COALESCE(config::jsonb, '{}'::jsonb),
  '{businessHours,enabled}',
  'false'::jsonb,
  true
)::text
WHERE config IS NOT NULL
  AND (config::jsonb) #> '{businessHours}' IS NOT NULL
  AND (config::jsonb) #> '{businessHours,enabled}' IS NULL;
```

---

## Use Cases

### 24/7 Chatbots
- **Scenario:** Customer support bot that's always available
- **Configuration:** `enabled: false`
- **Behavior:** Always shows as online, no offline messages

### Personal Assistants
- **Scenario:** AI assistant for personal use
- **Configuration:** `enabled: false`
- **Behavior:** No business hours restrictions

### Non-Business Chatbots
- **Scenario:** Educational bot, hobby project, community bot
- **Configuration:** `enabled: false`
- **Behavior:** No business context needed

### Traditional Business Chatbots
- **Scenario:** Business with specific operating hours
- **Configuration:** `enabled: true` + schedule
- **Behavior:** Shows online/offline status, displays offline message

---

## How to Use

### For Administrators

#### Disable Business Hours (24/7 Bot)
1. Go to **Edit Chatbot** → **Business Hours** tab
2. Toggle **"Enable Business Hours"** to **OFF**
3. Save changes
4. Widget will always show as online

#### Enable Business Hours (Business Bot)
1. Go to **Edit Chatbot** → **Business Hours** tab
2. Toggle **"Enable Business Hours"** to **ON**
3. Configure schedule, timezone, and offline message
4. Save changes
5. Widget will show online/offline based on schedule

---

## UI Changes

### Business Hours Tab - Before
```
┌─────────────────────────────────────┐
│ Business Hours Editor               │
│ (Always visible)                    │
│                                     │
│ Timezone: [UTC ▼]                  │
│ Schedule:                           │
│ Monday: 09:00 - 17:00              │
│ ...                                 │
└─────────────────────────────────────┘
```

### Business Hours Tab - After
```
┌─────────────────────────────────────┐
│ ┌─────────────────────────────────┐ │
│ │ Enable Business Hours     [OFF]│ │
│ │ Show online/offline status...  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ (BusinessHoursEditor hidden)        │
└─────────────────────────────────────┘

When enabled:
┌─────────────────────────────────────┐
│ ┌─────────────────────────────────┐ │
│ │ Enable Business Hours     [ON] │ │
│ │ Show online/offline status...  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Business Hours Editor               │
│ Timezone: [UTC ▼]                  │
│ Schedule:                           │
│ Monday: 09:00 - 17:00              │
│ ...                                 │
└─────────────────────────────────────┘
```

---

## Widget Behavior

### When Business Hours Disabled (`enabled: false`)

**Header Status:**
- Always shows green dot + "We're online"
- No offline indicator

**Business Hours Notice:**
- Never displayed

**Input Placeholder:**
- Always: "Type your message..."

**Overall:**
- Widget behaves as if it's always available
- No time-based restrictions

### When Business Hours Enabled (`enabled: true`)

**Header Status:**
- Green dot + "We're online" (during business hours)
- Clock icon + "Currently offline" (outside business hours)

**Business Hours Notice:**
- Shows orange banner with offline message (when closed)

**Input Placeholder:**
- "Type your message..." (when open)
- "Leave us a message..." (when closed)

**Overall:**
- Widget shows time-based availability
- Users see clear online/offline status

---

## Configuration Examples

### Example 1: 24/7 Support Bot
```json
{
  "businessHours": {
    "enabled": false,
    "timezone": "UTC",
    "schedule": {},
    "offlineMessage": ""
  }
}
```
**Result:** Always online, no restrictions

### Example 2: Business with Hours
```json
{
  "businessHours": {
    "enabled": true,
    "timezone": "America/New_York",
    "schedule": {
      "monday": { "open": "09:00", "close": "17:00", "closed": false },
      "tuesday": { "open": "09:00", "close": "17:00", "closed": false },
      "wednesday": { "open": "09:00", "close": "17:00", "closed": false },
      "thursday": { "open": "09:00", "close": "17:00", "closed": false },
      "friday": { "open": "09:00", "close": "17:00", "closed": false },
      "saturday": { "open": "00:00", "close": "00:00", "closed": true },
      "sunday": { "open": "00:00", "close": "00:00", "closed": true }
    },
    "offlineMessage": "We're currently closed. Business hours: Mon-Fri 9AM-5PM EST"
  }
}
```
**Result:** Shows online Mon-Fri 9AM-5PM EST, offline on weekends

---

## Files Modified

1. **`shared/schema.ts`**
   - Added `enabled` field to businessHours
   - Made businessHours optional
   - Updated default values

2. **`client/src/components/ChatbotForm.tsx`**
   - Added toggle switch for business hours
   - Conditional rendering of BusinessHoursEditor
   - Updated default values

3. **`client/src/pages/widget-fullpage.tsx`**
   - Updated `isBusinessOpen()` to check `enabled` flag
   - Conditional display of business hours notice

4. **`client/src/pages/widget-embed.tsx`**
   - Updated `isBusinessOpen()` to check `enabled` flag
   - Conditional display of business hours notice

5. **`migrations/0007_make_business_hours_optional.sql`** (NEW)
   - Migration to add `enabled: false` to existing chatbots

---

## Migration Instructions

Run the migration to update existing chatbots:

```bash
psql -U your_user -d your_database -f migrations/0007_make_business_hours_optional.sql
```

This will:
- Add `enabled: false` to all existing chatbots
- Preserve existing business hours configuration
- Disable business hours by default (can be re-enabled in admin)

---

## Benefits

### For Administrators
✅ **Flexibility** - Not forced to configure business hours  
✅ **Cleaner UI** - Hide unnecessary fields when disabled  
✅ **Better Defaults** - New chatbots don't assume business context  
✅ **Easy Toggle** - Simple switch to enable/disable  

### For End Users
✅ **24/7 Availability** - Bots can be always available  
✅ **No Confusion** - No misleading "offline" status for 24/7 bots  
✅ **Better UX** - Appropriate behavior for bot's purpose  

### For Developers
✅ **Flexible Schema** - Supports various use cases  
✅ **Backward Compatible** - Existing configs still work  
✅ **Clean Logic** - Simple enabled/disabled check  

---

## Testing Checklist

### Configuration
- [x] Toggle switch works in Business Hours tab
- [x] BusinessHoursEditor shows/hides based on toggle
- [x] Default value is `enabled: false`
- [x] Form saves correctly with enabled/disabled

### Widget Behavior (Disabled)
- [x] Always shows as "online"
- [x] No offline notice displayed
- [x] Placeholder: "Type your message..."
- [x] No time-based restrictions

### Widget Behavior (Enabled)
- [x] Shows online/offline based on schedule
- [x] Offline notice displays when closed
- [x] Placeholder changes based on status
- [x] Time-based restrictions work

### Migration
- [x] Adds `enabled: false` to existing chatbots
- [x] Preserves existing business hours config
- [x] No data loss

---

## Summary

Successfully made business hours optional for chatbots:

✅ **Schema Updated** - Added `enabled` boolean field  
✅ **UI Toggle** - Easy enable/disable switch  
✅ **Widget Logic** - Checks enabled flag before showing status  
✅ **Default Disabled** - New chatbots don't assume business context  
✅ **Migration Created** - Updates existing chatbots  
✅ **Backward Compatible** - Existing configs still work  

Chatbots can now be configured as 24/7 bots or business-hours-based bots depending on their purpose!
