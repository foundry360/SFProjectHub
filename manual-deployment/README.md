# Manual Deployment Files

If you need to manually create the components in Setup, use these files:

## Files for Manual Creation

1. **Platform Event**: Use `platform-event-fields.txt` to create the fields
2. **Apex Class**: Copy contents from `apex-controller.cls` 
3. **Apex Test**: Copy contents from `apex-test.cls`
4. **LWC Files**: Copy each file in the `lwc/` folder

## Manual Steps

### 1. Create Platform Event
- Setup > Platform Events > New Platform Event
- Name: `Task Update Event`
- API Name: `Task_Update_Event__e`
- Create fields from `platform-event-fields.txt`

### 2. Create Apex Classes  
- Setup > Apex Classes > New
- Paste content from `apex-controller.cls`
- Repeat for test class (optional)

### 3. Create LWC
- VS Code: Right-click lwc folder > Deploy
- Or manually create in Setup > Lightning Components

All files are provided in this folder for easy copy-paste.