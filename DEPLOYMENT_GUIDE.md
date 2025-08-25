# 🚀 Kanban Board Deployment Guide

## Quick Deployment (Recommended)

### Option 1: Automated Script
```bash
# Run from the project root directory
./deploy-kanban.sh
```

### Option 2: Manual SFDX Commands
```bash
# Deploy using the specific package
sfdx force:source:deploy -x manifest/kanban-package.xml

# Or deploy specific directories
sfdx force:source:deploy -p force-app/main/default/classes/RealtimeKanbanController*
sfdx force:source:deploy -p force-app/main/default/objects/Task_Update_Event__e
sfdx force:source:deploy -p force-app/main/default/lwc/realtimeKanban
```

## Manual Deployment (If SFDX Issues)

### Step 1: Deploy Platform Event
1. Go to **Setup > Platform Events**
2. Click **New Platform Event**
3. Name: `Task_Update_Event`
4. API Name: `Task_Update_Event__e`
5. Add these fields:
   - `Task_Id__c` (Text, 18, Required)
   - `Action_Type__c` (Text, 50, Required)  
   - `New_Column__c` (Text, 50)
   - `Updated_By__c` (Text, 18)
   - `Timestamp__c` (Date/Time)

### Step 2: Deploy Apex Classes
1. Go to **Setup > Apex Classes**
2. Click **New** and paste the contents of:
   - `RealtimeKanbanController.cls`
   - `RealtimeKanbanControllerTest.cls` (optional, for testing)

### Step 3: Deploy Lightning Web Component
1. **Using VS Code with Salesforce Extension:**
   - Right-click on `force-app/main/default/lwc/realtimeKanban`
   - Select "SFDX: Deploy Source to Org"

2. **Manual Creation:**
   - Go to **Setup > Lightning Components**
   - Create new LWC bundle named `realtimeKanban`
   - Copy contents of each file (.html, .js, .css, .js-meta.xml)

## Verification Steps

### 1. Check Deployment
```bash
# Verify components are deployed
sfdx force:org:open
```

Then navigate to:
- **Setup > Platform Events** → Should see `Task_Update_Event__e`
- **Setup > Apex Classes** → Should see `RealtimeKanbanController`
- **Setup > Lightning Components** → Should see `realtimeKanban`

### 2. Add to Lightning Page
1. Go to **Setup > Lightning App Builder**
2. Edit an existing App page or create new one
3. Drag **"Realtime Kanban Board"** component from Custom components
4. Save and activate the page

### 3. Create Test Data (If Needed)
If no projects exist, create a test project:

1. **Using Data Import Wizard:**
   - Go to **Setup > Data Import Wizard**
   - Create a `Project__c` record with:
     - `Project_Name__c`: "Test Project"
     - `Status__c`: "In Progress"
     - `Description__c`: "Test project for Kanban board"

2. **Using Developer Console:**
   ```apex
   Project__c testProject = new Project__c(
       Project_Name__c = 'Test Project',
       Status__c = 'In Progress',
       Description__c = 'Test project for Kanban board'
   );
   insert testProject;
   ```

## Troubleshooting

### Common Issues

1. **"Component not available"**
   - Check that LWC is properly deployed
   - Verify the component has `isExposed=true` in metadata

2. **"No projects found"**
   - Create Project__c records 
   - Check user permissions on Project__c object
   - Use the "Show Debug Info" button in the component

3. **"Platform Event errors"**
   - Verify Platform Event is created with correct API name
   - Check field names match exactly (case-sensitive)

4. **"Apex errors"**
   - Check that Task__c object exists
   - Verify user has access to required objects
   - Review debug logs in Developer Console

### Permission Requirements

Ensure users have access to:
- **Objects**: `Project__c`, `Task__c`, `User`
- **Platform Events**: `Task_Update_Event__e`
- **Apex Classes**: `RealtimeKanbanController`

### Debug Mode

The component includes debug information. If issues occur:
1. Open browser Developer Console (F12)
2. Look for console.log messages starting with "Kanban"
3. Check the Debug Info panel in the component
4. Click "Show Debug Info" button for project analysis

## File Structure

After deployment, you should have:

```
Salesforce Org:
├── Platform Events/
│   └── Task_Update_Event__e
├── Apex Classes/
│   ├── RealtimeKanbanController
│   └── RealtimeKanbanControllerTest
├── Lightning Web Components/
│   └── realtimeKanban/
│       ├── realtimeKanban.html
│       ├── realtimeKanban.js
│       ├── realtimeKanban.css
│       └── realtimeKanban.js-meta.xml
```

## Next Steps After Deployment

1. **Add to App Page** - Drag component to Lightning App page
2. **Test Functionality** - Create projects and tasks
3. **Configure Permissions** - Ensure users can access all objects  
4. **Remove Debug Info** - Once working, remove debug panel
5. **Customize Styling** - Adjust CSS if needed for your brand

## Support

If deployment issues persist:
1. Check Salesforce setup requirements
2. Review error messages in Developer Console  
3. Verify all metadata is properly formatted
4. Test in a sandbox environment first