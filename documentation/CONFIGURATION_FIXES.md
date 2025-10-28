# Configuration System - Required Fixes

## Priority Fixes

### 1. Fix Design Theme Default Value (CRITICAL - 2 minutes)

**Issue:** ChatbotForm uses invalid default theme "modern"

**Location:** `client/src/components/ChatbotForm.tsx` Line 162

**Current Code:**
```typescript
designTheme: "modern" as const,
```

**Fix:**
```typescript
designTheme: "soft" as const,
```

**Valid values:** sleek, soft, glass, minimal, elevated

---

### 2. Implement Business Hours Check in Widget (HIGH - 30 minutes)

**Issue:** Widget doesn't check business hours or show offline message

**Location:** `client/src/pages/widget-embed.tsx`

**Implementation:**

Add this function after line 258:

```typescript
// Check if chatbot is within business hours
const isWithinBusinessHours = (): boolean => {
  if (!config?.businessHours?.schedule) return true;
  
  const now = new Date();
  const timezone = config.businessHours.timezone || 'UTC';
  
  // Get current time in chatbot's timezone
  const timeInTz = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][timeInTz.getDay()];
  const currentTime = `${String(timeInTz.getHours()).padStart(2, '0')}:${String(timeInTz.getMinutes()).padStart(2, '0')}`;
  
  const schedule = config.businessHours.schedule[dayOfWeek as keyof typeof config.businessHours.schedule];
  
  if (!schedule || schedule.closed) return false;
  
  return currentTime >= schedule.open && currentTime <= schedule.close;
};

const getOfflineMessage = (): string => {
  return config?.businessHours?.offlineMessage || 
    "We're currently closed. Our business hours are Monday-Friday 9:00 AM - 5:00 PM.";
};
```

Add state for business hours:

```typescript
const [isOnline, setIsOnline] = useState(true);
```

Add effect to check business hours:

```typescript
useEffect(() => {
  if (config?.businessHours) {
    setIsOnline(isWithinBusinessHours());
    
    // Check every minute
    const interval = setInterval(() => {
      setIsOnline(isWithinBusinessHours());
    }, 60000);
    
    return () => clearInterval(interval);
  }
}, [config]);
```

Modify welcome message to show offline status:

```typescript
useEffect(() => {
  if (chatbot && messages.length === 0) {
    const welcomeMsg = isOnline 
      ? config?.behavior?.welcomeMessage || "Hello! How can I help you today?"
      : getOfflineMessage();
      
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: welcomeMsg,
      timestamp: new Date(),
      responseOptions: isOnline ? config?.behavior?.suggestedPrompts : undefined,
    }]);
  }
}, [chatbot, isOnline]);
```

Disable input when offline:

```typescript
// In the input field section
<Input
  value={inputMessage}
  onChange={(e) => setInputMessage(e.target.value)}
  onKeyDown={handleKeyDown}
  placeholder={isOnline ? "Type your message..." : "Currently offline"}
  disabled={isLoading || !isOnline}
  className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
  data-testid="input-chat-message"
/>
```

Add offline indicator in header:

```typescript
// In the header section, add after company name
{!isOnline && (
  <span className="text-xs opacity-75 ml-2">
    (Offline)
  </span>
)}
```

---

### 3. Add Business Hours to Widget Fullpage (MEDIUM - 15 minutes)

**Location:** `client/src/pages/widget-fullpage.tsx`

Apply the same business hours logic as widget-embed.tsx

---

### 4. Add Configuration Change Logging (MEDIUM - 20 minutes)

**Issue:** No audit trail for config changes

**Location:** `server/application/chatbotService.ts`

Add logging to `updateChatbotConfig`:

```typescript
async updateChatbotConfig(id: string, config: any) {
  try {
    // Get current config for comparison
    const currentChatbot = await storage.getChatbot(id);
    
    // Update config
    const result = await storage.updateChatbotConfig(id, config);
    
    // Log the change
    console.log(`[CONFIG CHANGE] Chatbot ${id}:`, {
      timestamp: new Date().toISOString(),
      previousConfig: currentChatbot?.config,
      newConfig: config,
      changedFields: this.getChangedFields(currentChatbot?.config, config)
    });
    
    return result;
  } catch (error) {
    throw error;
  }
}

private getChangedFields(oldConfig: any, newConfig: any): string[] {
  const changes: string[] = [];
  
  const compareObjects = (old: any, newObj: any, path: string = '') => {
    for (const key in newObj) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof newObj[key] === 'object' && newObj[key] !== null && !Array.isArray(newObj[key])) {
        compareObjects(old?.[key] || {}, newObj[key], currentPath);
      } else if (JSON.stringify(old?.[key]) !== JSON.stringify(newObj[key])) {
        changes.push(currentPath);
      }
    }
  };
  
  compareObjects(oldConfig, newConfig);
  return changes;
}
```

---

### 5. Add Config Validation Endpoint (LOW - 10 minutes)

**Issue:** No way to validate config before saving

**Location:** `server/routes/chatbots.ts`

Add new endpoint:

```typescript
// Validate chatbot configuration
router.post("/chatbots/validate-config", requireAdminAuth, async (req, res) => {
  try {
    const { config } = req.body;
    
    // Validate using Zod schema
    const { chatbotConfigSchema } = await import("@shared/schema");
    const result = chatbotConfigSchema.safeParse(config);
    
    if (result.success) {
      res.json({ 
        valid: true, 
        config: result.data,
        message: "Configuration is valid" 
      });
    } else {
      res.status(400).json({ 
        valid: false, 
        errors: result.error.errors,
        message: "Configuration validation failed" 
      });
    }
  } catch (error: any) {
    res.status(500).json({ 
      valid: false,
      message: error.message 
    });
  }
});
```

---

## Testing Checklist After Fixes

### Must Test:

- [ ] Design theme displays correctly with "soft" default
- [ ] Business hours check works in different timezones
- [ ] Offline message displays when outside business hours
- [ ] Input is disabled when offline
- [ ] Online status updates automatically
- [ ] Config changes are logged
- [ ] Config validation endpoint works

### Should Test:

- [ ] All 5 design themes render correctly
- [ ] Business hours work for all days of week
- [ ] Timezone conversion is accurate
- [ ] Config logging doesn't impact performance
- [ ] Validation endpoint catches all errors

---

## Deployment Steps

1. **Apply Fix #1 (Design Theme)**
   ```bash
   # Edit client/src/components/ChatbotForm.tsx line 162
   # Change "modern" to "soft"
   ```

2. **Apply Fix #2 (Business Hours)**
   ```bash
   # Add business hours logic to widget-embed.tsx
   # Test in development first
   ```

3. **Test Changes**
   ```bash
   # Run development server
   npm run dev
   
   # Test widget with different business hours configs
   # Test all design themes
   ```

4. **Deploy to Production**
   ```bash
   # Build frontend
   npm run build
   
   # Restart server
   # Monitor logs for any issues
   ```

---

## Future Enhancements (Not Critical)

### 1. Config Version Control
- Store config history in separate table
- Allow rollback to previous versions
- Show diff between versions

### 2. Config Templates
- Pre-built config templates for different industries
- One-click apply template
- Customize after applying

### 3. A/B Testing
- Test different configs with different users
- Track conversion rates
- Automatically apply best-performing config

### 4. Config Import/Export
- Export config as JSON
- Import config from file
- Share configs between chatbots

### 5. Config Validation UI
- Real-time validation in form
- Show which fields will be applied where
- Preview before saving

---

## Breaking Changes: NONE

All fixes are backward compatible and won't break existing chatbots.
